// Ajustes (engranaje de Inicio): voz, velocidad, cámara y sensibilidad.

import { store } from './store.js';
import { camera } from './camera.js';
import { tts } from './speech.js';
import { recognizer } from './recognizer.js';
import { esc, dialog, $ } from './ui.js';

export async function openSettings() {
  const s = store.get().settings;
  const voices = tts.options();
  const currentVoice = s.voiceURI ? `voice:${s.voiceURI}` : `lang:${s.voiceLang}`;
  const cams = await camera.devices();
  const signs = recognizer.labels.filter((l) => l.toLowerCase() !== 'nada');

  const body = `
    <div class="form">
      <label class="field">
        <span>Voz para leer las señas</span>
        <select id="set-voice">
          ${voices.map((o) => `<option value="${esc(o.value)}" ${o.value === currentVoice ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span>Velocidad de la voz</span>
        <select id="set-rate">
          ${[['lenta', 'Lenta'], ['normal', 'Normal'], ['rapida', 'Rápida']].map(([v, l]) => `<option value="${v}" ${s.rate === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span>Cámara</span>
        <select id="set-camera">
          <option value="">Cámara frontal (predeterminada)</option>
          ${cams.map((c, i) => `<option value="${esc(c.deviceId)}" ${c.deviceId === s.cameraId ? 'selected' : ''}>${esc(c.label || `Cámara ${i + 1}`)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span>Confianza mínima para aceptar una seña: <b id="set-th-val">${Math.round(s.threshold * 100)}%</b></span>
        <input id="set-th" type="range" min="0.6" max="0.98" step="0.01" value="${s.threshold}">
      </label>
      <button type="button" class="btn btn-outline" id="set-test">Probar voz</button>
      <p class="note small">Modelo de señas: ${
        recognizer.status === 'ready' ? `${signs.length} señas (${esc(signs.join(', '))})` : recognizer.status === 'nomodel' ? 'falta copiarlo en models/senalink/' : esc(recognizer.status)
      }.</p>
    </div>`;

  const done = dialog({ title: 'Ajustes', body, actions: [{ label: 'Listo', value: true, primary: true }] });
  const root = document.getElementById('dialog');
  $('#set-th', root).addEventListener('input', (e) => {
    $('#set-th-val', root).textContent = `${Math.round(e.target.value * 100)}%`;
  });
  $('#set-test', root).addEventListener('click', () => {
    save(root);
    tts.speak('Hola, quiero pagar mi cita.');
  });
  await done;
  save(root);
}

function save(root) {
  const voice = $('#set-voice', root).value;
  const cameraId = $('#set-camera', root).value;
  const changedCam = cameraId !== store.get().settings.cameraId;
  store.update((d) => {
    if (voice.startsWith('voice:')) {
      d.settings.voiceURI = voice.slice(6);
      const v = tts.voices().find((x) => x.voiceURI === d.settings.voiceURI);
      if (v) d.settings.voiceLang = v.lang;
    } else {
      d.settings.voiceURI = '';
      d.settings.voiceLang = voice.slice(5);
    }
    d.settings.rate = $('#set-rate', root).value;
    d.settings.cameraId = cameraId;
    d.settings.threshold = Number($('#set-th', root).value);
  });
  if (changedCam && camera.active) camera.start(cameraId).catch(() => {});
}
