'use strict';

/* ---------- DOM helper (text is always set with textContent, never innerHTML) ---------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let late = null;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') late = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  if (late !== null) el.value = late; // after options exist, for <select>
  return el;
}
const $ = (s, r) => (r || document).querySelector(s);

/* ---------- dates (all local-time YYYY-MM-DD strings) ---------- */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* Sessions with a negative dow are extras: they never belong to a weekday and are picked by hand. */
const isExtra = dow => dow < 0;
const dayShort = dow => dow < 0 ? 'Extra' : DAYS[dow];
const dayLong = dow => dow < 0 ? 'Extra session' : DAYS_LONG[dow];
const pad = n => String(n).padStart(2, '0');
const dstr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dstr(new Date());
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); };
const dowOf = s => parseD(s).getDay();
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
const weekStart = s => addDays(s, -((dowOf(s) + 6) % 7)); // Monday
function prettyDate(s) {
  const t = today();
  if (s === t) return 'Today';
  if (s === addDays(t, -1)) return 'Yesterday';
  if (s === addDays(t, 1)) return 'Tomorrow';
  const d = parseD(s);
  return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
}
function shortDate(s) { const d = parseD(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }

/* ---------- numbers ---------- */
function num(v) { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; }
const r1 = x => Math.round(x * 10) / 10;
function fmt(n, d = 0) {
  if (n == null || isNaN(n)) return '–';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'user';
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const clone = o => JSON.parse(JSON.stringify(o));
/* replaceChildren turns null into the text "null", so always go through this */
function setKids(el, ...kids) { el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false)); }

/* ---------- icons (static strings only) ---------- */
const ICONS = {
  today: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  lifts: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M17 21V3c-2 1-3.5 4-3.5 8h3.5"/>',
  progress: '<path d="M4 20V4M4 20h16M8 15l4-4 3 3 5-6"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 .5 9z"/>'
};
function icon(name, size) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size || 22);
  s.setAttribute('height', size || 22);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
  return s;
}

/* ---------- toast and sheet ---------- */
let toastTimer;
function toast(msg, kind) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 2600);
}

function sheet(title, build) {
  const bg = h('div', { class: 'sheet-bg' });
  const body = h('div', { class: 'sheet-body' });
  const close = () => { bg.remove(); document.body.classList.remove('noscroll'); };
  const box = h('div', { class: 'sheet', role: 'dialog', 'aria-label': title },
    h('div', { class: 'sheet-head' },
      h('h2', null, title),
      h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('close'))),
    body);
  bg.append(box);
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.body.append(bg);
  document.body.classList.add('noscroll');
  build(body, close);
  return { close, body };
}

function confirmSheet(message, okLabel, onOk, danger) {
  sheet('Are you sure?', (body, close) => {
    body.append(
      h('p', null, message),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: close }, 'Cancel'),
        h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => { close(); onOk(); } }, okLabel)));
  });
}

/* ---------- file helpers ---------- */
async function shareOrDownload(filename, text, mime) {
  const file = new File([text], filename, { type: mime });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return true;
    }
  } catch (e) { if (e && e.name === 'AbortError') return false; }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function toCSV(rows) { return rows.map(r => r.map(csvCell).join(',')).join('\n'); }
