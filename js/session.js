// Atención en curso (solo en memoria: se borra al finalizar).

import { joinPhrases } from './signs.js';

const listeners = new Set();

export const PAUSE_MS = 5000; // sin señas este tiempo → la siguiente empieza una frase nueva
export const REPEAT_MS = 3000; // la misma seña dos veces en este tiempo se cuenta una vez

// Lo que dice la persona sorda. `prev` es la frase anterior (se muestra en
// pequeño como «Antes»). `sentence` cambia cada vez que empieza una frase nueva.
const emptyPerson = (sentence = 0) => ({ text: '', signs: [], phrases: [], via: 'signs', prev: '', lastAt: 0, sentence });

function fresh() {
  return {
    startedAt: null,
    finished: false,
    person: emptyPerson(), // lo que dice la persona sorda en este turno
    reply: { text: '', icon: '', via: 'typed' }, // última respuesta del agente
    draft: '',
    turns: 0,
  };
}

let s = fresh();
const emit = () => listeners.forEach((fn) => fn(s));

export const session = {
  get: () => s,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  start() {
    if (!s.startedAt) s.startedAt = Date.now();
    emit();
  },

  // Seña reconocida por el modelo (HU01). Devuelve qué pasó:
  // 'repeat' (misma seña seguida, se ignora), 'new' (empezó frase nueva) o 'add'.
  addSign(label, phrase, now = Date.now()) {
    const p = s.person;
    const last = p.signs[p.signs.length - 1];
    if (last === label && now - p.lastAt < REPEAT_MS) {
      p.lastAt = now;
      return 'repeat';
    }
    let kind = 'add';
    if (p.signs.length && now - p.lastAt > PAUSE_MS) {
      s.person = { ...emptyPerson(p.sentence + 1), prev: p.text };
      kind = 'new';
    }
    const q = s.person;
    q.text = joinPhrases(q.text, phrase);
    q.signs.push(label);
    q.phrases.push(phrase);
    q.via = 'signs';
    q.lastAt = now;
    emit();
    return kind;
  },

  // Frase elegida por la persona sorda con un botón.
  setPersonPhrase(text) {
    s.person = { ...emptyPerson(s.person.sentence + 1), text, phrases: [text], via: 'phrase' };
    emit();
  },

  // El agente borra lo que dice la persona (botón «Limpiar»).
  clearPerson() {
    s.person = emptyPerson(s.person.sentence + 1);
    emit();
  },

  setDraft(text) {
    s.draft = text;
  },

  // El agente muestra su respuesta (HU02 o HU03). Lo que dijo la persona ya se
  // atendió: se limpia para el siguiente turno.
  setReply(text, { icon = '', via = 'typed' } = {}) {
    s.reply = { text, icon, via };
    s.draft = '';
    s.person = emptyPerson(s.person.sentence + 1);
    emit();
  },

  // La persona va a responder: empieza un turno nuevo.
  newTurn() {
    s.person = emptyPerson(s.person.sentence + 1);
    s.turns += 1;
    emit();
  },

  finish() {
    s.finished = true;
    emit();
  },

  reset() {
    s = fresh();
    emit();
  },
};
