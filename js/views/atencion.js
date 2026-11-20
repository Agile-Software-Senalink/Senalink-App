// Pantalla 2 - Atención (vista del agente).
// Izquierda: lo que dice la persona sorda con señas, en texto y voz (HU01).
// Derecha: la respuesta del agente, dictada (HU02) o con respuestas rápidas (HU03).

import { session } from '../session.js';
import { recognizer, drawHands } from '../recognizer.js';
import { tts, stt, tidySentence } from '../speech.js';
import { AGENT_QUICK, displayLabel } from '../signs.js';
import { esc, icon, header, cameraView, wireCamera, ensureCamera, toast, dialog, $ } from '../ui.js';
import { navigate } from '../router.js';

const STATE_TEXT = {
  'sin-manos': 'Esperando señas',
  reposo: 'Esperando señas',
  analizando: 'Reconociendo señas…',
  reconociendo: 'Reconociendo señas…',
};

export function mount(root) {
  root.innerHTML = `
    ${header(
      `<button type="button" class="btn btn-outline" id="finish">${icon('flag')} Finalizar atención</button>`,
      `<span class="chip chip-sand"><span class="dot"></span>ATENCIÓN EN CURSO</span>`,
    )}
    <main class="screen atencion">
      <section class="panel panel-dark person" aria-label="Lo que dice la persona">
        <div class="row-between">
          <h2 class="eyebrow on-dark">LA PERSONA DICE</h2>
          <span class="status on-dark" id="rec-state"><span class="dot"></span>Esperando señas</span>
        </div>
        ${cameraView()}
        <div class="banner banner-warn" id="model-banner" hidden></div>
        <p class="person-prev" id="person-prev" aria-live="off"></p>
        <div class="person-text-row">
          <p class="person-text" id="person-text" aria-live="polite"></p>
          <div class="person-actions">
            <button type="button" class="icon-btn icon-btn-dark" id="replay" aria-label="Escuchar de nuevo" title="Escuchar de nuevo">${icon('volume')}</button>
            <button type="button" class="icon-btn icon-btn-dark" id="clear" aria-label="Limpiar lo que dijo la persona" title="Limpiar">${icon('trash')}</button>
          </div>
        </div>
        <div class="chips" id="person-chips"></div>
      </section>

      <section class="panel reply" aria-label="Tu respuesta">
        <h2 class="eyebrow">TU RESPUESTA</h2>
        <div class="reply-box">
          <label for="reply" class="sr-only">Respuesta para la persona</label>
          <textarea id="reply" rows="3" placeholder="Habla o escribe tu respuesta…"></textarea>
          <button type="button" class="mic" id="mic" aria-pressed="false" aria-label="Dictar la respuesta con voz">
            ${icon('mic')}<span id="mic-text">Hablar</span>
          </button>
        </div>
        <p class="listening" id="listening" role="status" hidden><span class="dot"></span>Escuchando… habla con normalidad y pulsa «Listo» al terminar.</p>
        <div class="stack-12">
          <p class="eyebrow">RESPUESTAS RÁPIDAS</p>
          <div class="quick-grid">
            ${AGENT_QUICK.map((q, i) => `
              <button type="button" class="quick" data-i="${i}">
                <span class="quick-ic">${icon(q.icon)}</span>${esc(q.short)}
              </button>`).join('')}
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-lg send" id="send">Mostrar respuesta a la persona ${icon('arrowRight')}</button>
      </section>
    </main>`;

  const cam = wireCamera(root);
  const reply = $('#reply', root);
  const mic = $('#mic', root);
  let quickIcon = '';
  let quickText = '';
  reply.value = session.get().draft;

  // --- Lo que dice la persona (HU01) ---
  // Solo se anima lo que cambia: cada seña nueva entra sola; al empezar una
  // frase nueva, la anterior pasa a la línea «Antes».
  const textEl = $('#person-text', root);
  const chipsEl = $('#person-chips', root);
  const prevEl = $('#person-prev', root);
  const placeholder = '<span class="placeholder">Haz tus señas frente a la cámara…</span>';
  const phraseHtml = (t, anim) => `<span class="ph${anim ? ' in' : ''}">${esc(t)}</span>`;
  const chipHtml = (l, anim) => `<span class="chip chip-sand chip-strong${anim ? ' in' : ''}">${esc(displayLabel(l))}</span>`;
  let shown = { sentence: -1, count: 0 };

  function renderPerson() {
    const p = session.get().person;
    const sameSentence = p.sentence === shown.sentence;
    if (sameSentence && p.phrases.length > shown.count) {
      // Señas nuevas en la misma frase: se agregan al final.
      if (!shown.count) textEl.innerHTML = '';
      for (const ph of p.phrases.slice(shown.count)) textEl.insertAdjacentHTML('beforeend', phraseHtml(ph, true));
      for (const l of p.signs.slice(chipsEl.children.length)) chipsEl.insertAdjacentHTML('beforeend', chipHtml(l, true));
    } else if (!sameSentence) {
      const animate = shown.sentence !== -1;
      textEl.innerHTML = p.phrases.length ? p.phrases.map((ph) => phraseHtml(ph, animate)).join('') : placeholder;
      chipsEl.innerHTML = p.signs.map((l) => chipHtml(l, animate)).join('');
      prevEl.innerHTML = p.prev ? `<span class="prev-tag">ANTES</span> ${esc(p.prev)}` : '';
      prevEl.classList.toggle('on', !!p.prev);
      if (animate && p.prev) {
        prevEl.classList.remove('in');
        void prevEl.offsetWidth;
        prevEl.classList.add('in');
      }
      if (animate && !p.phrases.length) {
        textEl.classList.remove('fade-in');
        void textEl.offsetWidth;
        textEl.classList.add('fade-in');
      }
    }
    shown = { sentence: p.sentence, count: p.phrases.length };
    textEl.scrollTo({ top: textEl.scrollHeight, behavior: shown.count > 1 ? 'smooth' : 'auto' });
    fadeTop();
    $('#replay', root).disabled = !p.text;
    $('#clear', root).disabled = !p.text && !p.prev;
  }
  // El borde superior se desvanece solo si hay texto oculto arriba.
  function fadeTop() {
    textEl.classList.toggle('overflow', textEl.scrollTop > 8);
  }
  textEl.addEventListener('scroll', fadeTop, { passive: true });

  renderPerson();
  const offSession = session.subscribe(renderPerson);

  // La misma seña repetida no se vuelve a escribir: el último chip late para
  // confirmar que se vio.
  function pulseLast() {
    const chip = chipsEl.lastElementChild;
    if (!chip) return;
    chip.classList.remove('in', 'pulse');
    void chip.offsetWidth;
    chip.classList.add('pulse');
  }

  // Limpiar: sale con un desvanecido corto y luego se borra.
  $('#clear', root).addEventListener('click', () => {
    tts.cancel();
    const els = [textEl, chipsEl, prevEl];
    els.forEach((el) => el.classList.add('out'));
    setTimeout(() => {
      els.forEach((el) => el.classList.remove('out'));
      session.clearPerson();
    }, 160);
  });

  const banner = $('#model-banner', root);
  function renderModel() {
    if (recognizer.status === 'nomodel') {
      banner.hidden = false;
      banner.innerHTML = `${icon('alert')}<span>Aún no hay modelo de señas. Copia los archivos exportados del spike en <code>models/senalink/</code>. Mientras tanto puedes responder por voz o con respuestas rápidas.</span>`;
    } else if (recognizer.status === 'error') {
      banner.hidden = false;
      banner.innerHTML = `${icon('alert')}<span>${esc(recognizer.error)}</span>`;
    } else {
      banner.hidden = true;
    }
  }

  const offState = recognizer.on('state', (st) => {
    renderModel();
    if (STATE_TEXT[st]) $('#rec-state', root).innerHTML = `<span class="dot ${st === 'reconociendo' || st === 'analizando' ? 'live' : ''}"></span>${STATE_TEXT[st]}`;
  });
  const offSign = recognizer.on('sign', ({ label, phrase }) => {
    if (session.addSign(label, phrase) === 'repeat') {
      pulseLast();
      return;
    }
    tts.speak(phrase);
    if (navigator.vibrate) navigator.vibrate(30);
  });
  const offUnknown = recognizer.on('unknown', () => navigate('no-reconocida'));
  const offFrame = recognizer.on('frame', (frame) => drawHands(cam.canvas, frame));

  (async () => {
    if (await ensureCamera()) {
      try {
        await recognizer.start(cam.video);
      } catch (err) {
        toast(`No se pudo iniciar el reconocimiento: ${err?.message || err}`, 'error');
      }
    }
    renderModel();
  })();

  $('#replay', root).addEventListener('click', () => tts.speak(session.get().person.text));

  // --- Respuesta del agente ---
  reply.addEventListener('input', () => session.setDraft(reply.value));

  root.querySelectorAll('.quick').forEach((b) =>
    b.addEventListener('click', () => {
      const q = AGENT_QUICK[Number(b.dataset.i)];
      stt.stop();
      reply.value = q.text;
      quickIcon = q.icon;
      quickText = q.text;
      session.setDraft(q.text);
      reply.focus();
    }),
  );

  // Dictado (HU02)
  if (!stt.supported) {
    mic.disabled = true;
    mic.title = 'El dictado por voz no está disponible en este navegador';
  }
  let base = '';
  const setMic = (on) => {
    mic.classList.toggle('on', on);
    mic.setAttribute('aria-pressed', String(on));
    mic.setAttribute('aria-label', on ? 'Terminar de dictar' : 'Dictar la respuesta con voz');
    $('#mic-text', root).textContent = on ? 'Listo' : 'Hablar';
    $('#listening', root).hidden = !on;
  };
  mic.addEventListener('click', () => {
    if (stt.active) {
      stt.stop();
      return;
    }
    base = reply.value.trim();
    setMic(true);
    stt.start({
      onText(final, interim) {
        reply.value = [base, final, interim].filter(Boolean).join(' ');
      },
      onEnd(final) {
        setMic(false);
        if (final) reply.value = [base, tidySentence(final)].filter(Boolean).join(' ');
        session.setDraft(reply.value);
      },
      onError(msg) {
        toast(msg, 'error');
      },
    });
  });

  $('#send', root).addEventListener('click', () => {
    const text = reply.value.trim();
    if (!text) {
      toast('Escribe, dicta o elige una respuesta primero.', 'error');
      reply.focus();
      return;
    }
    stt.stop();
    const isQuick = quickText && text === quickText;
    session.setReply(text, { icon: isQuick ? quickIcon : '', via: isQuick ? 'quick' : 'typed' });
    navigate('respuesta');
  });

  // Fin de la atención (HU05)
  $('#finish', root).addEventListener('click', async () => {
    const ok = await dialog({
      title: 'Finalizar atención',
      body: '<p>Se mostrará el mensaje de cierre a la persona y se borrará esta conversación de la pantalla.</p>',
      actions: [
        { label: 'Seguir atendiendo', value: false },
        { label: 'Finalizar atención', value: true, primary: true },
      ],
    });
    if (ok) {
      session.finish();
      navigate('fin');
    }
  });

  return () => {
    recognizer.stop();
    stt.stop();
    cam.unmount();
    offSession();
    offState();
    offSign();
    offUnknown();
    offFrame();
  };
}
