// Utilidades de interfaz compartidas por las pantallas.

import { icon } from './icons.js';
import { camera, cameraErrorMessage } from './camera.js';
import { store } from './store.js';

export { icon };

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer = 0;
export function toast(message, kind = 'info') {
  const el = document.getElementById('toast');
  el.className = `toast show ${kind}`;
  el.innerHTML = `${icon(kind === 'error' ? 'alert' : 'checkCircle')}<span>${esc(message)}</span>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

// Diálogo modal accesible. Devuelve una promesa con el valor del botón pulsado.
export function dialog({ title, body, actions = [{ label: 'Cerrar', value: null, primary: true }] }) {
  const dlg = document.getElementById('dialog');
  dlg.innerHTML = `
    <form method="dialog" class="dialog-inner">
      <div class="dialog-head">
        <h2>${esc(title)}</h2>
        <button class="icon-btn" value="__close" aria-label="Cerrar">${icon('x')}</button>
      </div>
      <div class="dialog-body">${body}</div>
      <div class="dialog-actions">
        ${actions.map((a, i) => `<button class="btn ${a.primary ? 'btn-primary' : 'btn-outline'}" value="${i}">${esc(a.label)}</button>`).join('')}
      </div>
    </form>`;
  return new Promise((resolve) => {
    dlg.onclose = () => {
      const v = dlg.returnValue;
      resolve(v === '__close' || v === '' ? null : actions[Number(v)]?.value ?? null);
    };
    dlg.showModal();
  });
}

export async function ensureCamera() {
  if (camera.active) return true;
  try {
    await camera.start(store.get().settings.cameraId);
    return true;
  } catch (err) {
    toast(cameraErrorMessage(err), 'error');
    return false;
  }
}

// Logo y encabezado comunes. `left` va junto al logo; `right`, a la derecha.
export function header(right = '', left = '') {
  return `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">${icon('hand')}</span>
        <span class="brand-name">SeñaLink</span>
        ${left}
      </div>
      <div class="topbar-right">${right}</div>
    </header>`;
}

// Vista de la cámara (video + capa donde se dibujan las manos).
// guide: 'person' (recuadro de encuadre), 'warn' (recuadro de alerta) o ''.
export function cameraView({ guide = '', chip = '' } = {}) {
  return `
    <div class="cam">
      <video class="cam-video" muted playsinline autoplay></video>
      <canvas class="cam-overlay" aria-hidden="true"></canvas>
      ${guide ? `<div class="cam-guide ${guide === 'warn' ? 'warn' : ''}" aria-hidden="true">${guide === 'person' ? `${icon('user')}<span>Rostro y manos<br>dentro del recuadro</span>` : icon('hand')}</div>` : ''}
      ${chip ? `<span class="chip chip-sand cam-chip"><span class="dot"></span>${esc(chip)}</span>` : ''}
      <div class="cam-off">
        ${icon('cameraOff')}
        <p>La cámara está desactivada</p>
        <button type="button" class="btn btn-light" data-action="cam-on">${icon('camera')} Activar cámara</button>
      </div>
    </div>`;
}

// Conecta una cameraView al stream de la cámara. Devuelve { video, canvas, unmount }.
export function wireCamera(root) {
  const box = root.querySelector('.cam');
  const video = box.querySelector('video');
  const canvas = box.querySelector('canvas');
  const unbind = camera.bind(video);
  const sync = () => box.classList.toggle('on', camera.active);
  sync();
  const offCam = camera.onChange(sync);
  const onClick = (e) => {
    if (e.target.closest('[data-action="cam-on"]')) ensureCamera();
  };
  box.addEventListener('click', onClick);
  return {
    video,
    canvas,
    unmount() {
      unbind();
      offCam();
      box.removeEventListener('click', onClick);
    },
  };
}
