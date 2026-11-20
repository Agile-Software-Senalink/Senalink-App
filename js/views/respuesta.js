// Pantalla 3 - Respuesta (vista de la persona sorda).
// La respuesta del agente en letra muy grande, con ícono grande si es una
// respuesta rápida (HU03), y botones de texto grande y contraste (HU04).

import { store } from '../store.js';
import { session } from '../session.js';
import { tts } from '../speech.js';
import { PERSON_REPLIES } from '../signs.js';
import { esc, icon, header, $ } from '../ui.js';
import { navigate } from '../router.js';

export function mount(root) {
  const reply = session.get().reply;
  root.innerHTML = `
    ${header(`
      <button type="button" class="toggle" id="big" aria-pressed="false"><span class="aa">Aa</span> Texto grande</button>
      <button type="button" class="toggle" id="contrast" aria-pressed="false">${icon('contrast')} Contraste</button>`)}
    <main class="screen respuesta">
      <section class="panel panel-dark answer" aria-label="Respuesta del agente">
        <span class="answer-ic">${icon(reply.icon || 'chat')}</span>
        <div class="stack-16">
          <p class="eyebrow on-dark">EL AGENTE DICE</p>
          <p class="answer-text" aria-live="polite">${reply.text ? esc(reply.text) : 'El agente todavía no ha respondido.'}</p>
        </div>
      </section>

      <section class="respond" aria-label="Responder">
        <button type="button" class="btn btn-primary btn-xl respond-main" id="sign">${icon('hand')} Responder con señas</button>
        <div class="respond-phrases">
          ${PERSON_REPLIES.map((p, i) => `
            <button type="button" class="phrase" data-i="${i}">${icon(p.icon)}<span>${esc(p.short)}</span></button>`).join('')}
        </div>
      </section>
    </main>`;

  const sync = () => {
    const s = store.get().settings;
    $('#big', root).setAttribute('aria-pressed', String(!!s.largeText));
    $('#contrast', root).setAttribute('aria-pressed', String(!!s.highContrast));
  };
  sync();
  const off = store.subscribe(sync);
  $('#big', root).addEventListener('click', () => store.update((d) => (d.settings.largeText = !d.settings.largeText)));
  $('#contrast', root).addEventListener('click', () => store.update((d) => (d.settings.highContrast = !d.settings.highContrast)));

  $('#sign', root).addEventListener('click', () => {
    session.newTurn();
    navigate('atencion');
  });
  root.querySelectorAll('.phrase').forEach((b) =>
    b.addEventListener('click', () => {
      const p = PERSON_REPLIES[Number(b.dataset.i)];
      session.newTurn();
      session.setPersonPhrase(p.text);
      tts.speak(p.text);
      navigate('atencion');
    }),
  );

  return () => off();
}
