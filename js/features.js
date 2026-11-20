// Convierte los puntos de las manos en los números que espera el modelo.
// IMPORTANTE: debe ser idéntico a la extracción con la que se entrenó el modelo.
// Si cambia algo aquí, hay que volver a entrenarlo.
//
// Cada muestra es 1 segundo de movimiento remuestreado a T cuadros, con
// ambas manos (izquierda en la ranura 0, derecha en la 1).

export const T = 20; // cuadros por muestra
export const WINDOW_MS = 1000; // duración de una seña
export const PER_HAND = 44; // 21 puntos (x, y) + posición de la muñeca (x, y)
export const FRAME_DIM = PER_HAND * 2; // dos manos
export const INPUT_DIM = T * FRAME_DIM;

// Puntos de una mano relativos a la muñeca y escalados por el tamaño de la mano.
export function frameFeatures(result) {
  const f = new Float32Array(FRAME_DIM);
  const n = result.landmarks?.length || 0;
  const used = [false, false];
  for (let h = 0; h < n; h++) {
    const side = result.handedness?.[h]?.[0]?.categoryName;
    let slot = side === 'Left' ? 0 : 1;
    if (used[slot]) slot = 1 - slot;
    if (used[slot]) continue;
    used[slot] = true;

    const lm = result.landmarks[h];
    const w = lm[0];
    let size = 0;
    for (const p of lm) size = Math.max(size, Math.hypot(p.x - w.x, p.y - w.y));
    size = size || 1;

    const o = slot * PER_HAND;
    for (let i = 0; i < 21; i++) {
      f[o + 2 * i] = (lm[i].x - w.x) / size;
      f[o + 2 * i + 1] = (lm[i].y - w.y) / size;
    }
    f[o + 42] = w.x;
    f[o + 43] = w.y;
  }
  return { f, hands: n };
}

// Reduce los cuadros entre t0 y t1 a exactamente T cuadros.
export function resample(frames, t0, t1) {
  const out = new Float32Array(INPUT_DIM);
  if (!frames.length) return out;
  let j = 0;
  for (let i = 0; i < T; i++) {
    const tt = t0 + ((t1 - t0) * i) / (T - 1);
    while (j < frames.length - 1 && Math.abs(frames[j + 1].t - tt) <= Math.abs(frames[j].t - tt)) j++;
    out.set(frames[j].f, i * FRAME_DIM);
  }
  return out;
}

// Último segundo del búfer de cuadros ({ t, f, hands }), listo para el modelo.
export function lastWindow(buffer, now, ms = WINDOW_MS) {
  const t0 = now - ms;
  const frames = buffer.filter((fr) => fr.t >= t0);
  const withHands = frames.filter((fr) => fr.hands > 0).length;
  return {
    x: resample(frames, t0, now),
    frames: frames.length,
    handsRatio: frames.length ? withHands / frames.length : 0,
  };
}
