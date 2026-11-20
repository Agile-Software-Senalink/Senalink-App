// Preferencias de SeñaLink. Viven en el navegador (localStorage): no hay backend.

const KEY = 'senalink:v2';

function defaults() {
  return {
    settings: {
      voiceURI: '',
      voiceLang: 'es-PE',
      rate: 'normal', // lenta | normal | rapida
      cameraId: '',
      largeText: true, // HU04
      highContrast: false, // HU04
      threshold: 0.85, // confianza mínima para aceptar una seña
    },
    counter: 'Ventanilla 1',
  };
}

function load() {
  const base = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved) return base;
    // El mostrador no es configurable: siempre se usa el valor por defecto.
    return { ...base, ...saved, counter: base.counter, settings: { ...base.settings, ...(saved.settings || {}) } };
  } catch {
    return base;
  }
}

let data = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* almacenamiento bloqueado: la app sigue funcionando en memoria */
  }
}

export const store = {
  get: () => data,
  update(fn) {
    fn(data);
    persist();
    listeners.forEach((l) => l(data));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
