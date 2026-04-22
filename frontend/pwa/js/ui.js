export const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  if (!Array.isArray(children)) children = [children];
  for (const c of children) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};

export function mount(node) {
  const view = document.getElementById('view');
  view.innerHTML = '';
  view.appendChild(node);
}

let toastTimer = null;
export function toast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function formatARS(n) {
  if (n == null) return '';
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${n}`;
  }
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function ratingStars(r) {
  if (!r || !r.count) return 'Sin reseñas';
  return `★ ${r.average.toFixed(1)} (${r.count})`;
}

export function initials(name) {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0][0] : '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '·';
}

export function priceEl(n, unit) {
  const div = document.createElement('div');
  div.className = 'price';
  div.innerHTML = `<span class="sign">$</span>${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n || 0)}${unit ? `<span class="unit">${unit}</span>` : ''}`;
  return div;
}
