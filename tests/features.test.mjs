// Pruebas de la lógica sin navegador: node --test tests/*.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameFeatures, resample, lastWindow, FRAME_DIM, INPUT_DIM, PER_HAND, T } from '../js/features.js';
import { phraseFor, displayLabel, isIdle, joinPhrases, normalizeLabel } from '../js/signs.js';

const hand = (x0, y0) => Array.from({ length: 21 }, (_, i) => ({ x: x0 + i * 0.01, y: y0 - i * 0.005, z: 0 }));

test('el tamaño de la entrada coincide con el modelo del spike (20 × 88)', () => {
  assert.equal(T, 20);
  assert.equal(FRAME_DIM, 88);
  assert.equal(INPUT_DIM, 1760);
});

test('cada mano va a su ranura: izquierda 0, derecha 1', () => {
  const { f, hands } = frameFeatures({
    landmarks: [hand(0.6, 0.5), hand(0.3, 0.5)],
    handedness: [[{ categoryName: 'Right' }], [{ categoryName: 'Left' }]],
  });
  assert.equal(hands, 2);
  assert.ok(Math.abs(f[PER_HAND + 42] - 0.6) < 1e-6, 'muñeca derecha en la ranura 1');
  assert.ok(Math.abs(f[42] - 0.3) < 1e-6, 'muñeca izquierda en la ranura 0');
});

test('sin manos todo queda en cero', () => {
  const { f, hands } = frameFeatures({ landmarks: [], handedness: [] });
  assert.equal(hands, 0);
  assert.ok(f.every((v) => v === 0));
});

test('los puntos se escalan por el tamaño de la mano (máximo 1)', () => {
  const { f } = frameFeatures({ landmarks: [hand(0.5, 0.5)], handedness: [[{ categoryName: 'Right' }]] });
  const xs = Array.from(f.slice(PER_HAND, PER_HAND + 42));
  const max = Math.max(...xs.map(Math.abs));
  assert.ok(max <= 1 + 1e-6);
});

test('remuestrear siempre da T cuadros', () => {
  const { f } = frameFeatures({ landmarks: [hand(0.5, 0.5)], handedness: [[{ categoryName: 'Right' }]] });
  const frames = Array.from({ length: 33 }, (_, i) => ({ t: i * 30, f, hands: 1 }));
  assert.equal(resample(frames, 0, 990).length, INPUT_DIM);
  const w = lastWindow(frames, 990);
  assert.equal(w.x.length, INPUT_DIM);
  assert.equal(w.handsRatio, 1);
});

test('frases y etiquetas', () => {
  assert.equal(phraseFor('Si'), 'Sí.');
  assert.equal(phraseFor('No entiendo'), 'No entiendo.');
  assert.equal(phraseFor('Pagar'), 'Quiero pagar.');
  assert.equal(phraseFor('Ventanilla'), 'Ventanilla.');
  assert.equal(displayLabel('Si'), 'SÍ');
  assert.equal(normalizeLabel('  Sí '), 'si');
  assert.ok(isIdle('Nada'));
  assert.ok(!isIdle('Hola'));
  assert.equal(joinPhrases('Hola.', 'Quiero pagar.'), 'Hola. Quiero pagar.');
});
