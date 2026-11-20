// Reconocimiento de señas de LSP en el navegador (HU01).
// 1) MediaPipe HandLandmarker detecta los 21 puntos de cada mano (hasta 2).
// 2) Un modelo de TensorFlow.js analiza el último segundo de movimiento y decide la seña.
// La imagen nunca sale del dispositivo.

import { FilesetResolver, HandLandmarker } from '../vendor/mediapipe/vision_bundle.mjs';
import { frameFeatures, lastWindow, INPUT_DIM } from './features.js';
import { isIdle, phraseFor } from './signs.js';
import { store } from './store.js';

const WASM_PATH = new URL('../vendor/mediapipe/wasm', import.meta.url).href;
const HAND_MODEL = new URL('../models/hand_landmarker.task', import.meta.url).href;
const SIGN_MODEL = new URL('../models/senalink/senalink-modelo.json', import.meta.url).href;
const SIGN_LABELS = new URL('../models/senalink/senalink-modelo-etiquetas.json', import.meta.url).href;

const BUFFER_MS = 2500;
const STEP_MS = 120; // cada cuánto se revisa el último segundo
const STABLE = 2; // predicciones seguidas iguales para aceptar la seña
const LOW_LIMIT = 12; // ~1.4 s con manos y sin confianza → seña no reconocida
const LOCK_MAX_MS = 3000; // tope del bloqueo si la persona nunca vuelve al reposo

let hands = null;
let signModel = null;
let labels = [];
let loading = null;
let video = null;
let rafId = 0;
let timer = 0;
let running = false;
let lastVideoTime = -1;
let lastTs = 0;
let buffer = [];
let lastResult = null;

let stable = { label: null, n: 0 };
let lastEmitted = null;
let lowCount = 0;
let handSince = null;
let lockedAt = 0; // una seña por gesto: tras aceptar una, se espera al reposo

const handlers = { sign: new Set(), unknown: new Set(), frame: new Set(), state: new Set() };
const emit = (type, ...args) => handlers[type].forEach((fn) => fn(...args));

export const recognizer = {
  status: 'idle', // idle | loading | ready | nomodel | error
  error: '',
  delegate: '',
  get labels() {
    return labels;
  },
  get running() {
    return running;
  },

  // Carga MediaPipe y el modelo de señas. Si falta el modelo, status = 'nomodel'
  // (la app sigue funcionando con voz y respuestas rápidas).
  load() {
    if (loading) return loading;
    this.status = 'loading';
    emit('state', this.status);
    loading = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: HAND_MODEL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      try {
        hands = await HandLandmarker.createFromOptions(fileset, opts('GPU'));
        this.delegate = 'GPU';
      } catch {
        hands = await HandLandmarker.createFromOptions(fileset, opts('CPU'));
        this.delegate = 'CPU';
      }

      try {
        const tf = window.tf;
        if (!tf) throw new Error('No se cargó TensorFlow.js.');
        const res = await fetch(SIGN_LABELS, { cache: 'no-store' });
        if (!res.ok) throw new Error('nomodel');
        const body = await res.text();
        if (body.trimStart().startsWith('<')) {
          throw new Error('Llegó una página en vez del modelo. Recarga con Ctrl+Shift+R y abre la app desde la carpeta senalink-app (npm start).');
        }
        labels = JSON.parse(body);
        signModel = await tf.loadLayersModel(SIGN_MODEL);
        const inDim = signModel.inputs[0].shape[1];
        if (inDim !== INPUT_DIM) throw new Error(`El modelo espera ${inDim} valores y la app genera ${INPUT_DIM}. Vuelve a entrenarlo con el spike.`);
        // Primera predicción en vacío: la GPU compila aquí y no durante la atención.
        tf.tidy(() => signModel.predict(tf.zeros([1, INPUT_DIM])));
        this.status = 'ready';
      } catch (err) {
        signModel = null;
        labels = [];
        this.status = err.message === 'nomodel' || /404|Failed to fetch/.test(err.message) ? 'nomodel' : 'error';
        this.error = this.status === 'error' ? err.message : '';
      }
      emit('state', this.status);
      return this.status;
    })().catch((err) => {
      this.status = 'error';
      this.error = err?.message || String(err);
      loading = null;
      emit('state', this.status);
      throw err;
    });
    return loading;
  },

  async start(videoEl) {
    video = videoEl;
    resetRecognition();
    buffer = [];
    await this.load();
    if (running) return;
    running = true;
    lastVideoTime = -1;
    detectLoop();
    if (signModel) timer = setInterval(predictStep, STEP_MS);
  },

  stop() {
    running = false;
    cancelAnimationFrame(rafId);
    clearInterval(timer);
    buffer = [];
    lastResult = null;
    emit('frame', null);
  },

  // Tras mostrar «No entendí la seña», vuelve a escuchar desde cero.
  resetRecognition,

  on(type, fn) {
    handlers[type].add(fn);
    return () => handlers[type].delete(fn);
  },
};

function resetRecognition() {
  stable = { label: null, n: 0 };
  lastEmitted = null;
  lowCount = 0;
  handSince = null;
  lockedAt = 0;
}

function detectLoop() {
  if (!running) return;
  rafId = requestAnimationFrame(detectLoop);
  if (!hands || !video || video.readyState < 2 || !video.videoWidth) return;
  if (video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;

  let ts = performance.now();
  if (ts <= lastTs) ts = lastTs + 1;
  lastTs = ts;

  let result;
  try {
    result = hands.detectForVideo(video, ts);
  } catch {
    return;
  }
  const { f, hands: n } = frameFeatures(result);
  buffer.push({ t: ts, f, hands: n });
  while (buffer.length && buffer[0].t < ts - BUFFER_MS) buffer.shift();
  lastResult = result;
  emit('frame', { landmarks: result.landmarks || [], width: video.videoWidth, height: video.videoHeight });
}

function predict(x) {
  const tf = window.tf;
  return tf.tidy(() => Array.from(signModel.predict(tf.tensor2d(x, [1, INPUT_DIM])).dataSync()));
}

function predictStep() {
  if (!running || !signModel) return;
  const now = performance.now();
  const w = lastWindow(buffer, now);
  const recentHands = buffer.slice(-3).some((fr) => fr.hands > 0);

  if (!recentHands && w.handsRatio < 0.2) {
    resetRecognition();
    emit('state', 'sin-manos');
    return;
  }
  if (handSince === null) handSince = now;

  const probs = predict(w.x);
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  const label = labels[best];
  const conf = probs[best];
  const threshold = store.get().settings.threshold || 0.85;

  // Una seña por gesto: evita que el final de una seña se interprete como otra parecida.
  if (lockedAt && !isIdle(label) && now - lockedAt < LOCK_MAX_MS) {
    emit('state', 'reconociendo');
    return;
  }

  if (isIdle(label)) {
    resetRecognition();
    emit('state', 'reposo');
    return;
  }
  if (conf < threshold) {
    stable = { label: null, n: 0 };
    lowCount++;
    emit('state', 'analizando');
    if (lowCount === LOW_LIMIT) emit('unknown');
    return;
  }
  lowCount = 0;
  stable = stable.label === label ? { label, n: stable.n + 1 } : { label, n: 1 };
  emit('state', 'reconociendo');

  if (stable.n >= STABLE && lastEmitted !== label) {
    lastEmitted = label;
    lockedAt = now;
    const latency = now - handSince;
    handSince = now;
    emit('sign', { label, phrase: phraseFor(label), confidence: conf, latency });
  }
}

// Dibuja las manos sobre un <canvas> que tiene el mismo tamaño en píxeles
// que el video (el CSS lo ajusta con object-fit y efecto espejo).
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export function drawHands(canvas, frame) {
  const ctx = canvas.getContext('2d');
  if (!frame) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (canvas.width !== frame.width) canvas.width = frame.width;
  if (canvas.height !== frame.height) canvas.height = frame.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const lw = Math.max(3, frame.width / 240);
  for (const lm of frame.landmarks) {
    ctx.strokeStyle = '#e9e2d3';
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * frame.width, lm[a].y * frame.height);
      ctx.lineTo(lm[b].x * frame.width, lm[b].y * frame.height);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * frame.width, p.y * frame.height, lw * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
