// Pantalla 4 - Seña no reconocida (HU01, escenario alternativo): aviso para
// repetir la seña y frases sugeridas para no quedarse sin comunicar.

import { session } from '../session.js';
import { tts } from '../speech.js';
import { PERSON_FALLBACK } from '../signs.js';
import { esc, icon, header, cameraView, wireCamera, $ } from '../ui.js';
import { navigate } from '../router.js';

export function mount(root) {
  root.innerHTML = `
    ${header()}
    <main class="screen no-reconocida">
      <section class="panel panel-dark cam-panel" aria-label="Vista de la cámara">
        ${cameraView({ guide: 'warn' })}
      </section>

      <section class="nr-body">
        <div class="alert-card" role="alert">
          <span class="alert-ic">${icon('alert')}</span>
          <div class="stack-10">
            <h1 class="title-xl">No entendí la seña</h1>
            <p class="alert-text">Hazla de nuevo más despacio, con la mano dentro del recuadro.</p>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-xl" id="retry">${icon('repeat')} Repetir la seña</button>
        <div class="stack-12">
          <p class="eyebrow">O ELIGE LO QUE QUIERES DECIR</p>
          <div class="fallback-grid">
            ${PERSON_FALLBACK.map((p, i) => `
              <button type="button" class="phrase phrase-row" data-i="${i}">${icon(p.icon)}<span>${esc(p.short)}</span></button>`).join('')}
          </div>
        </div>
      </section>
    </main>`;

  const cam = wireCamera(root);

  $('#retry', root).addEventListener('click', () => navigate('atencion'));
  root.querySelectorAll('.phrase').forEach((b) =>
    b.addEventListener('click', () => {
      const p = PERSON_FALLBACK[Number(b.dataset.i)];
      session.setPersonPhrase(p.text);
      tts.speak(p.text);
      navigate('atencion');
    }),
  );

  return () => cam.unmount();
}
