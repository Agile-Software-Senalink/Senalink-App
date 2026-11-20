// Punto de entrada: muestra la pantalla según la ruta y aplica las preferencias.

import { store } from './store.js';
import { session } from './session.js';
import { camera } from './camera.js';
import { currentRoute } from './router.js';
import * as inicio from './views/inicio.js';
import * as atencion from './views/atencion.js';
import * as respuesta from './views/respuesta.js';
import * as noReconocida from './views/noReconocida.js';
import * as fin from './views/fin.js';

const VIEWS = { inicio, atencion, respuesta, 'no-reconocida': noReconocida, fin };
const TITLES = {
  inicio: 'Inicio',
  atencion: 'Atención',
  respuesta: 'Respuesta',
  'no-reconocida': 'Seña no reconocida',
  fin: 'Atención finalizada',
};

const view = document.getElementById('view');
let unmount = () => {};

// HU04: texto grande y alto contraste se aplican a toda la app.
function applySettings() {
  const s = store.get().settings;
  document.documentElement.classList.toggle('large-text', !!s.largeText);
  document.documentElement.classList.toggle('high-contrast', !!s.highContrast);
}

function render() {
  let route = currentRoute();
  const s = session.get();
  if (['atencion', 'respuesta', 'no-reconocida'].includes(route) && !s.startedAt) route = 'inicio';
  if (route === 'fin' && !s.finished) route = 'inicio';
  if (route !== currentRoute()) history.replaceState(null, '', `#${route}`);

  unmount();
  view.innerHTML = '';
  unmount = VIEWS[route].mount(view) || (() => {});
  document.title = `SeñaLink · ${TITLES[route]}`;
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}

store.subscribe(applySettings);
applySettings();
window.addEventListener('hashchange', render);
render();

window.addEventListener('pagehide', () => camera.stop(false));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
