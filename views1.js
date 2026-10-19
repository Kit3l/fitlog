'use strict';
/* Shared UI pieces, the Today screen and the Lifts screen. */
const ui = { date: today() };
const MEALS = ['Pre-workout', 'Post-workout', 'Breakfast', 'Lunch', 'Dinner', 'Evening', 'Snack'];

function defaultMeal() {
  const n = new Date(), hr = n.getHours() + n.getMinutes() / 60;
  if (hr < 5.5) return 'Pre-workout';
  if (hr < 7) return 'Post-workout';
  if (hr < 10.5) return 'Breakfast';
  if (hr < 15.5) return 'Lunch';
  if (hr < 20) return 'Dinner';
  return 'Evening';
}
function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const hr = Math.round(m / 60);
  return hr < 24 ? hr + ' h ago' : Math.round(hr / 24) + ' d ago';
}

/* ---------- page pieces ---------- */
function pageHead(title, sub, right) {
  return h('header', { class: 'page-head' }, h('div', null, h('h1', null, title), sub ? h('p', { class: 'sub' }, sub) : null), right || null);
}
function paintBadge(b) {
  let t, cls;
  if (!syncConfigured()) { t = 'Sync off'; cls = 'off'; }
  else if (sync.status === 'syncing') { t = 'Syncing'; cls = 'busy'; }
  else if (sync.status === 'error') { t = 'Sync problem'; cls = 'err'; }
  else if (sync.status === 'offline') { t = 'Offline'; cls = 'off'; }
  else if (cur() && cur().dirty) { t = 'Saved on this phone'; cls = 'off'; }
  else if (S.lastSync) { t = 'Synced ' + ago(S.lastSync); cls = 'ok'; }
  else { t = 'Ready'; cls = 'off'; }
  b.className = 'sync-badge ' + cls;
  b.replaceChildren(h('i', { class: 'dot' }), t);
}
function syncBadge() {
  const b = h('button', {
    class: 'sync-badge', type: 'button',
    onclick: () => {
      if (!syncConfigured()) location.hash = '#/settings';
      else if (sync.status === 'error') toast(sync.error, 'bad');
      else syncAll();
    }
  });
  paintBadge(b);
  return b;
}
window.addEventListener('fitlog:status', () => document.querySelectorAll('.sync-badge').forEach(paintBadge));

function dateNav(onChange) {
  const set = d => { ui.date = d; onChange(); };
  return h('div', { class: 'date-nav' },
    h('button', { class: 'icon-btn', 'aria-label': 'Previous day', onclick: () => set(addDays(ui.date, -1)) }, icon('left')),
    h('label', { class: 'date-pick' },
      h('span', null, prettyDate(ui.date)),
      h('input', { type: 'date', value: ui.date, 'aria-label': 'Choose date', onchange: e => e.target.value && set(e.target.value) })),
    h('button', { class: 'icon-btn', 'aria-label': 'Next day', onclick: () => set(addDays(ui.date, 1)) }, icon('right')),
    ui.date !== today() ? h('button', { class: 'chip', onclick: () => set(today()) }, 'Today') : null);
}

function bar(value, max, cls) {
  const pct = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
  return h('div', { class: 'meter ' + (cls || '') }, h('i', { style: { width: pct + '%' } }));
}

/* Tally bar: one segment per 100 kcal. */
function tally(eaten, target) {
  const total = Math.max(1, Math.ceil(Math.max(target, eaten) / 100));
  const wrap = h('div', { class: 'tally', role: 'img', 'aria-label': fmt(eaten) + ' of ' + fmt(target) + ' kilocalories' });
  for (let i = 0; i < total; i++) {
    const fill = Math.max(0, Math.min(1, (eaten - i * 100) / 100));
    const overSeg = (i + 1) * 100 > target && fill > 0 && eaten > target;
    wrap.append(h('span', { class: overSeg ? 'over' : '' }, h('i', { style: { height: fill * 100 + '%' } })));
  }
  return wrap;
}

/* ---------- Today ---------- */
/* Weight, waist and steps moved off the home screen into a sheet, so the page stays readable. */
function bodySheet(date, after) {
  const rec = cur(), be = rec.body[date] && !rec.body[date].del ? rec.body[date] : {};
  sheet('Body today', (body, close) => {
    const field = (label, val, ph, mode, hint) => {
      const inp = h('input', { class: 'in', type: 'number', inputmode: mode, step: 'any', value: val ?? '', placeholder: ph, 'aria-label': label });
      body.append(h('label', { class: 'field' }, h('span', null, label), inp, hint ? h('small', { class: 'hint' }, hint) : null));
      return inp;
    };
    const wIn = field('Weight', be.w != null ? r1(be.w) : '', 'kg', 'decimal', 'After the toilet, before food.');
    const waIn = field('Waist', be.waist != null ? r1(be.waist) : '', 'cm', 'decimal', 'At the navel, relaxed.');
    const stIn = field('Steps', be.steps ?? '', 'steps', 'numeric');
    body.append(h('button', { class: 'btn primary wide', onclick: () => {
      const w = num(wIn.value), waist = num(waIn.value), steps = num(stIn.value);
      if (w == null && waist == null && steps == null) { toast('Enter at least one value', 'bad'); return; }
      put('body', Object.assign({}, be, { id: date, date, w, waist, steps }));
      toast('Saved'); close(); after();
    } }, 'Save'));
    setTimeout(() => wIn.focus(), 50);
  });
}

/* One square on the home grid. onTap makes the whole square a button. */
function tile(ic, label, value, unit, note, noteCls, onTap) {
  const inner = [
    h('span', { class: 'tile-ic ' + ic }, icon(ic, 18)),
    h('b', { class: 'tile-val' }, value, unit ? h('span', { class: 'tile-unit' }, unit) : null),
    h('span', { class: 'tile-label' }, label),
    note ? h('span', { class: 'tile-note ' + (noteCls || '') }, note) : null
  ];
  return onTap ? h('button', { class: 'tile', type: 'button', onclick: onTap }, ...inner) : h('div', { class: 'tile' }, ...inner);
}

function viewToday(root) {
  const rec = cur(), p = rec.profile, d = today();
  const day = selectedDay(rec, d), tg = targetsFor(rec, d), tot = dayTotals(rec, d);
  const left = tg.kcal - tot.k, over = left < 0;
  const goFood = () => { ui.date = d; location.hash = '#/food'; };
  const goLifts = () => { ui.date = d; location.hash = '#/lifts'; };

  root.append(h('header', { class: 'home-head' },
    h('div', null,
      h('p', { class: 'eyebrow' }, p.name + ' · ' + prettyDate(d)),
      h('h1', null, day.name)),
    syncBadge()));

  // Calorie ring
  root.append(h('section', { class: 'hero' },
    h('div', { class: 'hero-ring' },
      ring(tot.k / (tg.kcal || 1), { size: 224, over, label: fmt(tot.k) + ' of ' + fmt(tg.kcal) + ' kilocalories eaten' }),
      h('div', { class: 'hero-mid' },
        h('span', { class: 'hero-cap' }, over ? 'OVER TODAY' : 'LEFT TODAY'),
        h('span', { class: 'hero-num' + (over ? ' bad' : '') }, fmt(Math.abs(left))),
        h('span', { class: 'hero-sub' }, fmt(tot.k) + ' of ' + fmt(tg.kcal) + ' kcal'))),
    h('div', { class: 'pro' },
      h('div', { class: 'pro-top' }, h('b', null, 'Protein'), h('span', null, fmt(tot.p) + ' of ' + fmt(tg.protein) + ' g')),
      bar(tot.p, tg.protein, 'protein'),
      h('p', { class: 'meta' }, fmt(tot.c) + ' g carbs · ' + fmt(tot.f) + ' g fat · ' + (tg.kind === 'gym' ? 'training' : 'light') + ' day'))));

  // Four tiles
  const logged = day.exercises.filter(ex => { const e = liftOn(rec, d, ex.name); return e && e.sets.some(s => s.r != null); }).length;
  const cw = currentWeight(rec);
  const be = rec.body[d] && !rec.body[d].del ? rec.body[d] : {};
  const openBody = () => bodySheet(d, render);
  const tiles = [];

  tiles.push(day.exercises.length
    ? tile('lifts', 'Exercises logged', logged, ' of ' + day.exercises.length, logged >= day.exercises.length ? 'Session done' : null, 'good', goLifts)
    : tile('lifts', 'No session planned', '—', '', 'A walk still counts', '', goLifts));

  const drop = cw && p.startWeight ? p.startWeight - cw.avg : null;
  tiles.push(tile('scale', cw ? '7-day average' : 'Weight', cw ? fmt(cw.avg, 1) : '—', cw ? ' kg' : '',
    drop != null && Math.abs(drop) >= 0.05 ? (drop > 0 ? '↓ ' : '↑ ') + fmt(Math.abs(drop), 1) + ' kg' : 'Tap to add',
    drop > 0 ? 'good' : '', openBody));

  tiles.push(tile('steps', 'Steps today', be.steps != null ? fmt(be.steps) : '—', '', be.steps == null ? 'Tap to add' : null, '', openBody));

  const hasRun = p.program.days.some(x => x.exercises.some(e => e.type === 'run'));
  if (hasRun) {
    const km = weekRunKm(rec, d);
    tiles.push(tile('run', 'Run this week', fmt(km, 1), p.runCap ? ' / ' + fmt(p.runCap, 1) + ' km' : ' km',
      p.runCap && km >= p.runCap ? 'Cap reached' : null, '', goLifts));
  } else {
    tiles.push(tile('tape', 'Waist', be.waist != null ? fmt(be.waist, 1) : '—', be.waist != null ? ' cm' : '',
      be.waist == null ? 'Tap to add' : null, '', openBody));
  }
  root.append(h('div', { class: 'tiles' }, ...tiles));

  // Goal
  if (p.goalWeight && cw) {
    const start = p.startWeight || cw.avg, span = start - p.goalWeight;
    const prog = span ? (start - cw.avg) / span : 0;
    const rate = weeklyRate(rec);
    const daysLeft = p.goalDate ? diffDays(p.goalDate, d) : null;
    const need = daysLeft > 0 ? (cw.avg - p.goalWeight) / (daysLeft / 7) : null;
    root.append(h('section', { class: 'goal' },
      h('div', { class: 'goal-top' },
        h('b', null, fmt(cw.avg, 1) + ' → ' + fmt(p.goalWeight, 1) + ' kg'),
        daysLeft != null ? h('span', null, daysLeft > 0 ? daysLeft + ' days left' : 'Due') : null),
      bar(prog, 1),
      h('p', { class: 'meta' },
        fmt(Math.abs(cw.avg - p.goalWeight), 1) + ' kg ' + (cw.avg > p.goalWeight ? 'to go' : 'past goal') +
        (rate != null ? ' · ' + (rate <= 0 ? fmt(-rate, 2) + ' kg a week down' : fmt(rate, 2) + ' kg a week up') : '') +
        (need != null && need > 0 ? ' · ' + fmt(need, 2) + ' a week needed' : ''))));
  }

  root.append(h('div', { class: 'home-acts' },
    h('button', { class: 'btn primary', onclick: goFood }, 'Log food'),
    h('button', { class: 'btn', onclick: day.exercises.length ? goLifts : openBody }, day.exercises.length ? (logged ? 'Continue session' : 'Start session') : 'Log body')));
}

/* ---------- Lifts ---------- */
function persistLift(rec, date, day, ex, sets) {
  const found = liftOn(rec, date, ex.name);           // same exercise, any spelling
  const id = found ? found.id : liftId(date, ex.name);
  const empty = sets.every(s => s.w == null && s.r == null);
  if (empty) { if (found) del('lifts', id, rec); return; }
  put('lifts', { id, date, ex: found ? found.ex : ex.name, type: ex.type, session: day.name, sets: sets.map(s => ({ w: s.w, r: s.r, d: !!s.d })) }, rec);
}

function sessionSummary(rec, date, day) {
  const names = new Set(day.exercises.map(e => exKey(e.name)));
  let sets = 0, vol = 0;
  for (const e of live('lifts', rec)) {
    if (e.date !== date || (e.session !== day.name && !names.has(exKey(e.ex)))) continue;
    if (e.type !== 'weight') { if (e.sets.some(s => s.r != null)) sets++; continue; }
    for (const s of e.sets) if (s.r != null) { sets++; vol += (s.w || 0) * s.r; }
  }
  return { sets, vol };
}

function exerciseCard(rec, date, day, ex, onSummary) {
  const saved = liftOn(rec, date, ex.name);
  const last = lastLift(rec, ex.name, date);
  const count = ex.type === 'weight' || ex.type === 'time' ? (ex.sets || 3) : 1;
  let sets = saved ? clone(saved.sets) : Array.from({ length: count }, () => ({ w: null, r: null, d: false }));
  while (!saved && sets.length < count) sets.push({ w: null, r: null, d: false });
  const card = h('article', { class: 'ex' });
  const changed = () => { persistLift(rec, date, day, ex, sets); onSummary(); flag(); };
  const flagEl = h('span', { class: 'tag', hidden: true }, 'New best');
  function flag() {
    let best = 0;
    const k = exKey(ex.name);
    for (const e of live('lifts', rec)) if (exKey(e.ex) === k && e.date < date) for (const s of e.sets) if (s.w && s.r) best = Math.max(best, est1RM(s.w, s.r));
    const now = Math.max(0, ...sets.filter(s => s.w && s.r).map(s => est1RM(s.w, s.r)));
    flagEl.hidden = !(ex.type === 'weight' && best > 0 && now > best * 1.001);
  }
  const numIn = (val, ph, label, cb, mode) => h('input', { class: 'in', type: 'number', inputmode: mode || 'decimal', step: 'any', value: val ?? '', placeholder: ph == null ? '' : String(ph), 'aria-label': label, oninput: e => cb(num(e.target.value)) });

  function draw() {
    const hint = progressionHint(ex, last);
    const target = ex.type === 'weight' ? ex.sets + ' × ' + ex.reps : ex.type === 'time' ? ex.sets + ' × ' + ex.reps + ' s' : ex.type === 'cardio' ? ex.reps + ' min' : ex.reps + ' km';
    setKids(card,
      h('div', { class: 'ex-head' }, h('h3', null, ex.name, ' ', flagEl), h('span', { class: 'target' }, target)),
      last ? h('p', { class: 'last' }, 'Last time, ' + prettyDate(last.date) + ': ' + last.sets.filter(s => s.r != null).map(s => setText(ex.type, s)).join(', ')) : h('p', { class: 'last' }, 'First time logging this one.'),
      hint ? h('p', { class: 'prog ' + hint.kind }, hint.text) : null,
      ...sets.map((s, i) => {
        const ls = last && last.sets[Math.min(i, last.sets.length - 1)];
        const tick = h('button', { class: 'tick', type: 'button', 'aria-pressed': String(!!s.d), 'aria-label': 'Mark set ' + (i + 1) + ' done',
          onclick: () => {
            if (!s.d && ls) { if (s.w == null && ls.w != null) s.w = ls.w; if (s.r == null && ls.r != null) s.r = ls.r; }
            s.d = !s.d; changed(); draw();
          } }, icon('check', 20));
        let cells;
        if (ex.type === 'weight') cells = [numIn(s.w, ls && ls.w, 'Set ' + (i + 1) + ' kilograms', v => { s.w = v; changed(); }), h('span', { class: 'x' }, 'kg ×'), numIn(s.r, ls && ls.r, 'Set ' + (i + 1) + ' reps', v => { s.r = v; changed(); }, 'numeric')];
        else if (ex.type === 'time') cells = [numIn(s.r, ls && ls.r, 'Set ' + (i + 1) + ' seconds', v => { s.r = v; changed(); }, 'numeric'), h('span', { class: 'x' }, 'seconds')];
        else if (ex.type === 'cardio') cells = [numIn(s.r, ls && ls.r || ex.reps, 'Minutes', v => { s.r = v; changed(); }, 'numeric'), h('span', { class: 'x' }, 'min, level'), numIn(s.w, ls && ls.w, 'Level or speed', v => { s.w = v; changed(); })];
        else cells = [numIn(s.w, ls && ls.w, 'Distance in kilometres', v => { s.w = v; changed(); }), h('span', { class: 'x' }, 'km in'), numIn(s.r, ls && ls.r, 'Minutes', v => { s.r = v; changed(); }, 'numeric'), h('span', { class: 'x' }, 'min')];
        return h('div', { class: 'set' + (s.d ? ' done' : '') }, h('span', { class: 'set-n' }, i + 1), ...cells, tick);
      }),
      (ex.type === 'weight' || ex.type === 'time') ? h('div', { class: 'ex-foot' },
        h('button', { class: 'link', type: 'button', onclick: () => { sets.push({ w: null, r: null, d: false }); draw(); } }, 'Add a set'),
        sets.length > 1 ? h('button', { class: 'link', type: 'button', onclick: () => { sets.pop(); changed(); draw(); } }, 'Remove last set') : null) : null);
    flag();
  }
  draw();
  return card;
}

/* Add an exercise, suggesting names already in use so history is not split by a
   different spelling. Suggestions ignore case and a trailing "s". */
function addExerciseSheet(rec, date, day) {
  const known = new Map();
  for (const d of rec.profile.program.days) for (const ex of d.exercises) if (!known.has(exKey(ex.name))) known.set(exKey(ex.name), { name: ex.name, note: d.name });
  for (const e of exerciseNames(rec)) {
    const prev = known.get(e.key);
    const note = 'last ' + prettyDate(e.last);
    if (prev) prev.note = note; else known.set(e.key, { name: e.name, note });
  }
  const loose = s => exKey(s).replace(/s\b/g, '').replace(/\s+/g, ' ').trim();
  sheet('Add an exercise', (body, close) => {
    const list = h('div', { class: 'list' });
    const name = h('input', { class: 'in', placeholder: 'Exercise name', 'aria-label': 'Exercise name', autocapitalize: 'none', autocomplete: 'off' });
    const add = n => {
      const t = String(n).trim(); if (!t) return;
      persistLift(rec, date, day, { name: t, type: 'weight' }, [{ w: null, r: 0, d: false }]);
      close(); render();
    };
    const draw = () => {
      const q = loose(name.value);
      const hits = [...known.values()]
        .filter(k => !q || loose(k.name).includes(q))
        .slice(0, 8);
      setKids(list, ...hits.map(k => h('button', { class: 'pick', type: 'button', onclick: () => add(k.name) },
        h('b', null, k.name), h('small', null, k.note))));
    };
    name.addEventListener('input', draw);
    body.append(h('label', { class: 'field' }, h('span', null, 'Name'), name),
      h('p', { class: 'hint' }, 'Pick an existing name to keep its history. A new spelling starts a fresh history.'),
      list,
      h('button', { class: 'btn primary wide', onclick: () => add(name.value) }, 'Add'));
    draw();
    setTimeout(() => name.focus(), 50);
  });
}

function viewLifts(root) {
  const rec = cur(), date = ui.date, days = rec.profile.program.days;
  const day = selectedDay(rec, date), dow = day.dow;
  root.append(pageHead('Lifts', null, syncBadge()), dateNav(render));
  const opt = d => h('option', { value: String(d.dow), selected: d.dow === dow }, dayShort(d.dow) + ': ' + d.name);
  const week = days.filter(d => !isExtra(d.dow)), extra = days.filter(d => isExtra(d.dow));
  const sel = h('select', { class: 'in', 'aria-label': 'Session', onchange: e => { pickSession(date, Number(e.target.value)); render(); } },
    week.map(opt),
    extra.length ? h('optgroup', { label: 'Extra sessions (no gym)' }, extra.map(opt)) : null);
  root.append(h('label', { class: 'field' }, h('span', null, 'Session'), sel));
  if (isExtra(dow)) root.append(h('p', { class: 'hint' }, 'Extra session. Today counts as a training day for calories. Rotate A, B, C, D in order.'));

  const summary = h('p', { class: 'summary' });
  const updateSummary = () => {
    const s = sessionSummary(rec, date, day);
    summary.textContent = s.sets ? s.sets + ' sets logged' + (s.vol ? ', ' + fmt(s.vol) + ' kg lifted in total' : '') : 'Nothing logged yet';
  };
  root.append(summary);
  if (!day.exercises.length) root.append(h('p', { class: 'empty' }, 'No exercises planned for this day. You can add one below, or pick another session above.'));
  for (const ex of day.exercises) root.append(exerciseCard(rec, date, day, ex, updateSummary));

  // extras logged on this session that are not in the program
  const names = new Set(day.exercises.map(e => exKey(e.name)));
  for (const e of live('lifts', rec)) {
    if (e.date === date && e.session === day.name && !names.has(exKey(e.ex))) {
      names.add(exKey(e.ex));
      root.append(exerciseCard(rec, date, day, { name: e.ex, type: e.type || 'weight', group: 'upper', sets: e.sets.length, reps: '8-12' }, updateSummary));
    }
  }
  root.append(h('button', { class: 'btn wide', onclick: () => addExerciseSheet(rec, date, day) }, 'Add an exercise'));
  updateSummary();
}
