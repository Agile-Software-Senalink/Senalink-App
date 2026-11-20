// Vocabulario y frases de SeñaLink.

// Texto que se muestra y se lee en voz para cada etiqueta del modelo.
// La clave es la etiqueta del modelo normalizada (sin tildes ni mayúsculas).
// Una etiqueta que no esté aquí se muestra tal cual.
const PHRASES = {
  hola: 'Hola.',
  ayuda: 'Necesito ayuda.',
  si: 'Sí.',
  no: 'No.',
  pagar: 'Quiero pagar.',
  cita: 'Tengo una cita.',
  documento: 'Traigo mi documento.',
  dni: 'Traigo mi DNI.',
  'documento (dni)': 'Traigo mi DNI.',
  'no entiendo': 'No entiendo.',
  repetir: '¿Puede repetirlo, por favor?',
  gracias: 'Gracias.',
};

// Etiqueta que representa "no hay seña" (manos quietas o sin seña).
export const IDLE_LABEL = 'nada';

export function normalizeLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function isIdle(label) {
  return normalizeLabel(label) === IDLE_LABEL;
}

// Nombre corto para la etiqueta (chip): "Si" → "SÍ".
export function displayLabel(label) {
  const key = normalizeLabel(label);
  if (key === 'si') return 'SÍ';
  return String(label || '').trim().toUpperCase();
}

export function phraseFor(label) {
  const key = normalizeLabel(label);
  if (PHRASES[key]) return PHRASES[key];
  const t = String(label || '').trim();
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : '';
}

// Une frases cortas en un mensaje: "Hola." + "Quiero pagar." → "Hola. Quiero pagar."
export function joinPhrases(current, phrase) {
  const a = (current || '').trim();
  const b = (phrase || '').trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} ${b}`;
}

// Respuestas rápidas del agente (HU03): texto + ícono grande para la persona.
export const AGENT_QUICK = [
  { text: 'Pase a caja, por favor.', short: 'Pase a caja, por favor', icon: 'cash' },
  { text: 'Firme aquí, por favor.', short: 'Firme aquí, por favor', icon: 'pen' },
  { text: 'Muéstreme su DNI, por favor.', short: 'Muéstreme su DNI', icon: 'id' },
  { text: 'Espere un momento, por favor.', short: 'Espere un momento', icon: 'clock' },
];

// Frases de la persona sorda después de leer la respuesta.
export const PERSON_REPLIES = [
  { text: 'Sí, entiendo.', short: 'Sí, entiendo', icon: 'check' },
  { text: 'No entiendo.', short: 'No entiendo', icon: 'help' },
  { text: '¿Puede repetirlo, por favor?', short: 'Repita, por favor', icon: 'repeat' },
];

// Frases sugeridas cuando la seña no se reconoce (HU01, escenario alternativo).
export const PERSON_FALLBACK = [
  { text: 'Necesito ayuda.', short: 'Necesito ayuda', icon: 'hand' },
  { text: 'Quiero pagar.', short: 'Quiero pagar', icon: 'cash' },
  { text: 'Tengo una cita.', short: 'Tengo una cita', icon: 'calendar' },
  { text: 'Traigo mi DNI.', short: 'Traigo mi DNI', icon: 'id' },
];
