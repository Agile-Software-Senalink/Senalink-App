// Pantalla 1 - Inicio: encuadre de la cámara y comienzo de la atención.

import { store } from '../store.js';
import { session } from '../session.js';
import { recognizer } from '../recognizer.js';
import { esc, icon, header, cameraView, wireCamera, ensureCamera, $ } from '../ui.js';
import { navigate } from '../router.js';
import { openSettings } from '../settings.js';

export function mount(root) {
  root.innerHTML = `
    ${header(`
      <span class="chip chip-sand">${esc(store.get().counter.toUpperCase())}</span>
      <button type="button" class="icon-btn icon-btn-lg" id="settings" aria-label="Ajustes">${icon('settings')}</button>`)}
    <main class="screen inicio">
      <section class="panel panel-dark cam-panel" aria-label="Vista de la cámara">
        ${cameraView({ guide: 'person', chip: 'CÁMARA LISTA' })}
      </section>

      <section class="inicio-text">
        <div class="stack-16">
          <h1 class="display">¡Hola!<br>Te damos la <span class="mark">bienvenida</span>.</h1>
          <p class="lead">Habla con señas. Te entendemos.</p>
        </div>
        <button type="button" class="btn btn-primary btn-xl" id="start">Empezar atención ${icon('arrowRight')}</button>
        <p class="note small" id="model-status" role="status" hidden></p>
      </section>
    </main>`;

  const cam = wireCamera(root);
  ensureCamera();

  const status = $('#model-status', root);
  // Solo se muestra un aviso si el modelo falta o falla.
  const showStatus = () => {
    const st = recognizer.status;
    status.hidden = st !== 'nomodel' && st !== 'error';
    if (st === 'nomodel') status.innerHTML = `${icon('alert')} Falta el modelo de señas: copia los archivos del spike en <code>models/senalink/</code>.`;
    else if (st === 'error') status.innerHTML = `${icon('alert')} ${esc(recognizer.error)}`;
  };
  showStatus();
  const offState = recognizer.on('state', showStatus);
  recognizer.load().then(showStatus).catch(showStatus);

  $('#settings', root).addEventListener('click', openSettings);
  $('#start', root).addEventListener('click', async () => {
    await ensureCamera();
    session.start();
    navigate('atencion');
  });

  return () => {
    cam.unmount();
    offState();
  };
}
