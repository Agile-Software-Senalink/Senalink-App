// Navegación por hash: #inicio, #atencion, #respuesta, #no-reconocida, #fin.
export const ROUTES = ['inicio', 'atencion', 'respuesta', 'no-reconocida', 'fin'];

export function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '');
  return ROUTES.includes(r) ? r : 'inicio';
}

export function navigate(route) {
  if (currentRoute() === route) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = `#${route}`;
}
