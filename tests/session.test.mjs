// Frases por pausa, repeticiones y limpieza de lo que dice la persona.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { session, PAUSE_MS, REPEAT_MS } from '../js/session.js';

test('las señas seguidas forman una frase', () => {
  session.reset();
  session.start();
  assert.equal(session.addSign('Hola', 'Hola.', 1000), 'add');
  assert.equal(session.addSign('Pagar', 'Quiero pagar.', 2000), 'add');
  assert.equal(session.get().person.text, 'Hola. Quiero pagar.');
});

test('la misma seña seguida se cuenta una vez', () => {
  session.reset();
  session.addSign('Si', 'Sí.', 1000);
  assert.equal(session.addSign('Si', 'Sí.', 1000 + REPEAT_MS - 1), 'repeat');
  assert.equal(session.get().person.signs.length, 1);
  assert.equal(session.addSign('Si', 'Sí.', 1000 + REPEAT_MS * 2), 'add');
});

test('tras una pausa empieza una frase nueva y la anterior pasa a «Antes»', () => {
  session.reset();
  session.addSign('Hola', 'Hola.', 1000);
  const before = session.get().person.sentence;
  assert.equal(session.addSign('Cita', 'Tengo una cita.', 1000 + PAUSE_MS + 1), 'new');
  const p = session.get().person;
  assert.equal(p.text, 'Tengo una cita.');
  assert.equal(p.prev, 'Hola.');
  assert.ok(p.sentence > before);
});

test('responder y limpiar dejan la frase vacía', () => {
  session.reset();
  session.addSign('Hola', 'Hola.', 1000);
  session.setReply('Pase a caja.');
  assert.equal(session.get().person.text, '');
  session.addSign('Hola', 'Hola.', 2000);
  session.clearPerson();
  assert.deepEqual([session.get().person.text, session.get().person.prev], ['', '']);
});
