// Pantalla 5 - Fin de la atención (HU05): mensaje de cierre claro y visual.

import { session } from '../session.js';
import { camera } from '../camera.js';
import { icon, $ } from '../ui.js';
import { navigate } from '../router.js';

export function mount(root) {
  camera.stop();
  root.innerHTML = `
    <main class="screen fin">
      <section class="panel fin-card">
        <span class="fin-ic">${icon('check')}</span>
        <p class="eyebrow">ATENCIÓN FINALIZADA</p>
        <h1 class="display">Trámite terminado</h1>
        <p class="fin-text">Gracias por tu visita.<br>Que tengas un buen día.</p>
        <div class="fin-icons" aria-hidden="true">${icon('hand')}${icon('heart')}</div>
        <p class="note">La conversación se borró de esta pantalla.</p>
        <button type="button" class="btn btn-primary btn-xl btn-block" id="again">Nueva atención ${icon('arrowRight')}</button>
      </section>
    </main>`;

  $('#again', root).addEventListener('click', () => {
    session.reset();
    navigate('inicio');
  });
  return () => {};
}
