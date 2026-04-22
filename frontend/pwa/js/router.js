// Router muy simple basado en hash. Uso: #/ruta o #/ruta/:param
const routes = [];

export function route(pattern, handler) {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ regex, keys, handler, pattern });
}

export function navigate(path) {
  location.hash = '#' + path;
}

export async function dispatch() {
  const path = (location.hash || '#/').slice(1).split('?')[0];
  const search = Object.fromEntries(new URLSearchParams((location.hash.split('?')[1] || '')).entries());
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      await r.handler({ params, search, path });
      return;
    }
  }
  document.getElementById('view').innerHTML = '<div class="empty">Página no encontrada.</div>';
}

window.addEventListener('hashchange', dispatch);
