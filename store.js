'use strict';
/*
  Local data store. Everything lives in localStorage under one key and is mirrored to the private
  GitHub data repo by sync.js. Each profile record:
    { profile, lifts:{}, food:{}, body:{}, customFoods:{}, dirty, sha }
  Entries are kept in maps keyed by id. Every entry has u (last-changed time). A delete leaves a
  tombstone { id, del:true, u } so deletions sync too. The newest u wins when two devices disagree.
*/
const LS_KEY = 'fitlog.v1';
const APP_VERSION = '1.4.0';
const KINDS = ['lifts', 'food', 'body', 'customFoods'];

function freshState() {
  return { v: 1, sync: { owner: '', repo: '', token: '', branch: '' }, currentId: null, profiles: {}, lastSync: null, qty: {}, sess: {} };
}
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) return Object.assign(freshState(), s); }
  } catch (e) { console.warn('load failed', e); }
  return freshState();
}
let S = loadState();
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); } }
const saveSoon = debounce(save, 300);

const cur = () => S.profiles[S.currentId] || null;
const prof = () => cur().profile;

/* ---------- mutation helpers (these mark the profile dirty and schedule a sync) ---------- */
function touch(rec) {
  rec = rec || cur();
  rec.dirty = true;
  saveSoon();
  if (typeof scheduleSync === 'function') scheduleSync();
}
function put(kind, entry, rec) {
  rec = rec || cur();
  entry.u = Date.now();
  rec[kind][entry.id] = entry;
  touch(rec);
  return entry;
}
function del(kind, id, rec) {
  rec = rec || cur();
  if (!rec[kind][id]) return;
  rec[kind][id] = { id, del: true, u: Date.now() };
  touch(rec);
}
const live = (kind, rec) => Object.values((rec || cur())[kind]).filter(e => !e.del);

function saveProfile(patch) {
  const rec = cur();
  Object.assign(rec.profile, patch);
  rec.profile.u = Date.now();
  touch(rec);
}

/* ---------- profiles ---------- */
async function hashPin(id, pin) {
  const data = new TextEncoder().encode(id + ':' + pin);
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let x = 5381; for (const b of data) x = ((x << 5) + x + b) | 0; // fallback, not secure
  return 'weak' + (x >>> 0).toString(16);
}

function createProfile(f) {
  const id = slug(f.name) + '-' + Math.random().toString(36).slice(2, 6);
  const t = today();
  const profile = {
    id, name: f.name.trim(), sex: f.sex, age: f.age, heightCm: f.heightCm,
    startDate: t, startWeight: f.weight, goalWeight: f.goalWeight, goalDate: f.goalDate || '',
    targets: { gym: f.gym, light: f.light, protein: f.protein },
    program: clone(DEFAULT_PROGRAM), pinHash: '', created: Date.now(), u: Date.now()
  };
  const rec = { profile, lifts: {}, food: {}, body: {}, customFoods: {}, dirty: true, sha: null };
  S.profiles[id] = rec;
  S.currentId = id;
  if (f.weight) put('body', { id: t, date: t, w: f.weight }, rec);
  touch(rec); save();
  return id;
}

/* ---------- program / targets ---------- */
function programDay(rec, date) {
  const days = rec.profile.program.days;
  return days.find(d => d.dow === dowOf(date)) || { dow: dowOf(date), name: 'Free day', kind: 'light', exercises: [] };
}
/* The session showing on the Lifts screen: a hand-picked one if there is one, else the weekday's.
   Picks are kept per date on this device only, so calories follow the session actually trained. */
function pickedDow(date) { const v = S.sess && S.sess[date]; return v == null ? null : v; }
function pickSession(date, dow) {
  S.sess = S.sess || {};
  if (dow == null) delete S.sess[date]; else S.sess[date] = dow;
  const keys = Object.keys(S.sess);
  if (keys.length > 120) keys.sort().slice(0, keys.length - 120).forEach(k => delete S.sess[k]);
  saveSoon();
}
function selectedDay(rec, date) {
  const dow = pickedDow(date);
  if (dow != null) { const d = rec.profile.program.days.find(x => x.dow === dow); if (d) return d; }
  return programDay(rec, date);
}
function targetsFor(rec, date) {
  const day = selectedDay(rec, date), t = rec.profile.targets;
  return { kcal: day.kind === 'gym' ? t.gym : t.light, protein: t.protein, kind: day.kind };
}
/* Adds the field sessions to a profile made before they existed. Returns how many were added. */
function addFieldSessions() {
  const prog = clone(cur().profile.program);
  const have = new Set(prog.days.map(d => d.dow));
  const add = clone(window.FIELD_SESSIONS).filter(d => !have.has(d.dow));
  if (add.length) { prog.days = prog.days.concat(add); saveProfile({ program: prog }); }
  return add.length;
}
function dayTotals(rec, date) {
  const tot = { k: 0, p: 0, c: 0, f: 0, n: 0 };
  for (const e of live('food', rec)) {
    if (e.date !== date) continue;
    tot.k += e.k || 0; tot.p += e.p || 0; tot.c += e.c || 0; tot.f += e.f || 0; tot.n++;
  }
  return tot;
}

/* ---------- body stats ---------- */
function bodyList(rec) {
  return live('body', rec).filter(e => e.w != null).sort((a, b) => a.date.localeCompare(b.date));
}
function movingAvg(list, days = 7) {
  return list.map(e => {
    const from = addDays(e.date, -(days - 1));
    const win = list.filter(x => x.date >= from && x.date <= e.date);
    return { date: e.date, w: e.w, avg: win.reduce((s, x) => s + x.w, 0) / win.length };
  });
}
function currentWeight(rec) {
  const ma = movingAvg(bodyList(rec));
  return ma.length ? { avg: ma[ma.length - 1].avg, last: ma[ma.length - 1].w, date: ma[ma.length - 1].date } : null;
}
function weeklyRate(rec) { // kg per week, regression over the last 14 days
  const list = bodyList(rec);
  if (!list.length) return null;
  const end = list[list.length - 1].date, from = addDays(end, -13);
  const pts = list.filter(e => e.date >= from).map(e => [diffDays(e.date, from), e.w]);
  if (pts.length < 3 || pts[pts.length - 1][0] - pts[0][0] < 5) return null;
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0), sxx = pts.reduce((s, p) => s + p[0] * p[0], 0);
  const den = n * sxx - sx * sx;
  return den ? ((n * sxy - sx * sy) / den) * 7 : null;
}

/* ---------- lifts ---------- */
const liftId = (date, ex) => date + '|' + ex;
/* Exercise history is matched on this key, so "Leg Extension", "Leg extension" and
   "leg  extension" are one exercise. The spelling you typed is still what you see. */
const exKey = n => String(n == null ? '' : n).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/* The entry for one exercise on one day, whatever spelling it was saved under. */
function liftOn(rec, date, name) {
  const direct = rec.lifts[liftId(date, name)];
  if (direct && !direct.del) return direct;
  const k = exKey(name);
  if (!k) return null;
  for (const e of live('lifts', rec)) if (e.date === date && exKey(e.ex) === k) return e;
  return null;
}
/* Every exercise name in the history, newest use first, with how often it appears. */
function exerciseNames(rec) {
  const map = new Map();
  for (const e of live('lifts', rec)) {
    const k = exKey(e.ex);
    if (!k) continue;
    const cur = map.get(k);
    if (!cur) map.set(k, { key: k, name: e.ex, last: e.date, count: 1, spellings: new Set([e.ex]) });
    else {
      cur.count++;
      cur.spellings.add(e.ex);
      if (e.date > cur.last) { cur.last = e.date; cur.name = e.ex; }
    }
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
}
/* Renames every entry of one exercise. Entries that then share a day are folded into one. */
function renameExercise(rec, fromKey, toName) {
  rec = rec || cur();
  const to = String(toName).trim();
  if (!to) return 0;
  const toK = exKey(to), byDate = new Map();
  let n = 0;
  for (const e of live('lifts', rec)) if (exKey(e.ex) === toK && exKey(e.ex) !== fromKey) byDate.set(e.date, e);
  for (const e of live('lifts', rec).filter(x => exKey(x.ex) === fromKey)) {
    const twin = byDate.get(e.date);
    if (twin && twin.id !== e.id) {
      put('lifts', Object.assign({}, twin, { ex: to, sets: twin.sets.concat(e.sets) }), rec);
      del('lifts', e.id, rec);
    } else {
      put('lifts', Object.assign({}, e, { ex: to }), rec);
      byDate.set(e.date, e);
    }
    n++;
  }
  return n;
}
function repTop(reps) { const m = String(reps).match(/(\d+(?:\.\d+)?)\s*$/); return m ? parseFloat(m[1]) : null; }
function repLow(reps) { const m = String(reps).match(/^\s*(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; }
function lastLift(rec, ex, beforeDate) {
  const k = exKey(ex);
  let best = null;
  for (const e of live('lifts', rec)) {
    if (exKey(e.ex) !== k || e.date >= beforeDate) continue;
    if (!best || e.date > best.date) best = e;
  }
  return best;
}
function est1RM(w, r) { return w * (1 + r / 30); }
function setText(type, s) {
  if (type === 'time') return fmt(s.r) + ' s';
  if (type === 'cardio') return fmt(s.r) + ' min' + (s.w ? ' @ ' + s.w : '');
  if (type === 'run') return fmt(s.w, 1) + ' km in ' + fmt(s.r) + ' min';
  return (s.w != null ? fmt(s.w, s.w % 1 ? 1 : 0) : 'BW') + '×' + fmt(s.r);
}
function progressionHint(ex, last) {
  if (!last || ex.type !== 'weight') return null;
  const sets = last.sets.filter(s => s.r != null);
  if (!sets.length) return null;
  const top = repTop(ex.reps), low = repLow(ex.reps);
  const inc = ex.inc != null ? ex.inc : (ex.group === 'lower' ? 5 : 2.5);
  const w = Math.max(...sets.map(s => s.w || 0));
  if (top == null) return null;
  if (sets.length >= ex.sets && sets.every(s => s.r >= top)) {
    if (!inc || !w) return { kind: 'up', text: 'You hit ' + top + ' reps on every set. Add reps or slow the tempo.' };
    return { kind: 'up', text: 'Hit ' + top + ' reps on every set. Try ' + fmt(w + inc, (w + inc) % 1 ? 1 : 0) + ' kg today.' };
  }
  if (low != null && sets.some(s => s.r < low) && w) return { kind: 'hold', text: 'Below ' + low + ' reps last time. Stay at ' + fmt(w, w % 1 ? 1 : 0) + ' kg and build reps.' };
  if (w) return { kind: 'hold', text: 'Stay at ' + fmt(w, w % 1 ? 1 : 0) + ' kg and work toward ' + top + ' reps on every set.' };
  return null;
}
function weekRunKm(rec, date) {
  const from = weekStart(date), to = addDays(from, 6);
  let km = 0;
  for (const e of live('lifts', rec)) if (e.type === 'run' && e.date >= from && e.date <= to) for (const s of e.sets) km += s.w || 0;
  return km;
}

/* ---------- target suggestion for new profiles ---------- */
function suggestTargets(sex, age, heightCm, weightKg, activity, goal) {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'f' ? -161 : 5);
  const tdee = bmr * activity;
  const factor = { steady: 0.8, fast: 0.7, maintain: 1, gain: 1.1 }[goal] || 1;
  const floor = sex === 'f' ? 1300 : 1600;
  const base = Math.max(floor, tdee * factor);
  const round50 = x => Math.round(x / 50) * 50;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), gym: round50(base + 100), light: round50(base - 100), protein: Math.round((goal === 'maintain' ? 1.6 : 1.8) * weightKg / 5) * 5 };
}

/* ---------- food lookup ---------- */
function allFoods(rec) {
  const custom = live('customFoods', rec).map(f => Object.assign({ custom: true }, f));
  return custom.concat(window.FOODS);
}
function searchFoods(rec, q) {
  q = q.trim().toLowerCase();
  const list = allFoods(rec);
  if (!q) return list;
  const words = q.split(/\s+/);
  return list.map(f => {
    const hay = (f.n + ' ' + (f.alt || '')).toLowerCase();
    if (!words.every(w => hay.includes(w))) return null;
    const starts = f.n.toLowerCase().startsWith(words[0]) ? 0 : 1;
    return { f, s: starts };
  }).filter(Boolean).sort((a, b) => a.s - b.s).map(x => x.f);
}
function recentFoods(rec, max = 12) {
  const seen = new Set(), out = [];
  const entries = live('food', rec).filter(e => e.fid).sort((a, b) => b.u - a.u);
  const all = allFoods(rec);
  for (const e of entries) {
    if (seen.has(e.fid)) continue;
    seen.add(e.fid);
    const f = all.find(x => x.id === e.fid);
    if (f) out.push(f);
    if (out.length >= max) break;
  }
  return out;
}
