'use strict';
/* Shared UI pieces, the Today screen and the Lifts screen. */
const ui = { date: today(), sess: {} };
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
function viewToday(root) {
  const rec = cur(), p = rec.profile, d = today();
  const day = programDay(rec, d), tg = targetsFor(rec, d), tot = dayTotals(rec, d);
  const left = tg.kcal - tot.k;
  root.append(pageHead(p.name, prettyDate(d) + ', ' + day.name, syncBadge()));

  root.append(h('section', { class: 'energy' },
    h('div', { class: 'big' },
      h('span', { class: 'num' + (left < 0 ? ' bad' : '') }, fmt(Math.abs(left))),
      h('span', { class: 'unit' }, left >= 0 ? 'kcal left' : 'kcal over')),
    tally(tot.k, tg.kcal),
    h('p', { class: 'meta' }, 'Eaten ' + fmt(tot.k) + ' of ' + fmt(tg.kcal) + ' on a ' + (tg.kind === 'gym' ? 'training' : 'light') + ' day'),
    h('div', { class: 'stat-row' },
      h('div', { class: 'grow' }, h('b', null, fmt(tot.p) + ' g'), ' protein of ' + fmt(tg.protein), bar(tot.p, tg.protein)),
      h('div', null, h('b', null, fmt(tot.c) + ' g'), ' carbs'),
      h('div', null, h('b', null, fmt(tot.f) + ' g'), ' fat')),
    h('button', { class: 'btn primary wide', onclick: () => { ui.date = d; location.hash = '#/food'; } }, 'Log food')));

  // Session
  const logged = day.exercises.filter(ex => { const e = rec.lifts[liftId(d, ex.name)]; return e && !e.del && e.sets.some(s => s.r != null); }).length;
  root.append(h('section', { class: 'block' },
    h('h2', null, day.name),
    day.exercises.length
      ? h('p', { class: 'meta' }, logged + ' of ' + day.exercises.length + ' exercises logged')
      : h('p', { class: 'meta' }, 'No session planned. A walk still counts.'),
    day.exercises.length ? h('button', { class: 'btn wide', onclick: () => { ui.date = d; location.hash = '#/lifts'; } }, logged ? 'Continue session' : 'Start session') : null));

  // Weigh-in
  const be = rec.body[d] && !rec.body[d].del ? rec.body[d] : {};
  const wIn = h('input', { class: 'in', type: 'number', inputmode: 'decimal', step: 'any', value: be.w != null ? r1(be.w) : '', placeholder: 'kg', 'aria-label': 'Weight in kilograms' });
  const waIn = h('input', { class: 'in', type: 'number', inputmode: 'decimal', step: 'any', value: be.waist != null ? r1(be.waist) : '', placeholder: 'cm', 'aria-label': 'Waist in centimetres' });
  const stIn = h('input', { class: 'in', type: 'number', inputmode: 'numeric', value: be.steps ?? '', placeholder: 'steps', 'aria-label': 'Steps today' });
  root.append(h('section', { class: 'block' },
    h('h2', null, 'Body today'),
    h('div', { class: 'grid3' },
      h('label', null, h('span', null, 'Weight'), wIn),
      h('label', null, h('span', null, 'Waist'), waIn),
      h('label', null, h('span', null, 'Steps'), stIn)),
    h('p', { class: 'hint' }, 'Weigh after the toilet and before food. Measure the waist at the navel.'),
    h('button', { class: 'btn wide', onclick: () => {
      const w = num(wIn.value), waist = num(waIn.value), steps = num(stIn.value);
      if (w == null && waist == null && steps == null) { toast('Enter at least one value', 'bad'); return; }
      put('body', Object.assign({}, be, { id: d, date: d, w, waist, steps }));
      toast('Saved'); render();
    } }, 'Save')));

  // Goal
  const cw = currentWeight(rec);
  if (p.goalWeight && cw) {
    const start = p.startWeight || cw.avg, span = start - p.goalWeight;
    const prog = span ? (start - cw.avg) / span : 0;
    const rate = weeklyRate(rec);
    const daysLeft = p.goalDate ? diffDays(p.goalDate, d) : null;
    const need = daysLeft > 0 ? (cw.avg - p.goalWeight) / (daysLeft / 7) : null;
    root.append(h('section', { class: 'block' },
      h('h2', null, 'Goal ' + fmt(p.goalWeight, 1) + ' kg'),
      bar(prog, 1),
      h('div', { class: 'stat-row' },
        h('div', null, h('b', null, fmt(cw.avg, 1) + ' kg'), ' 7-day average'),
        h('div', null, h('b', null, fmt(Math.abs(cw.avg - p.goalWeight), 1) + ' kg'), cw.avg > p.goalWeight ? ' to go' : ' past goal'),
        daysLeft != null ? h('div', null, h('b', null, daysLeft > 0 ? daysLeft + ' days' : 'Due'), ' left') : null),
      h('p', { class: 'meta' },
        (rate != null ? 'Recent pace ' + (rate <= 0 ? fmt(-rate, 2) + ' kg/week down' : fmt(rate, 2) + ' kg/week up') : 'Log your weight for a few days to see your pace') +
        (need != null && need > 0 ? '. Needed: ' + fmt(need, 2) + ' kg/week.' : '.'))));
  }

  // Running this week
  if (day && p.program.days.some(x => x.exercises.some(e => e.type === 'run'))) {
    const km = weekRunKm(rec, d);
    root.append(h('section', { class: 'block' },
      h('h2', null, 'Running this week'),
      h('div', { class: 'stat-row' }, h('div', null, h('b', null, fmt(km, 1) + ' km'), p.runCap ? ' of ' + fmt(p.runCap, 1) : '')),
      p.runCap ? bar(km, p.runCap) : null));
  }
}

/* ---------- Lifts ---------- */
function persistLift(rec, date, day, ex, sets) {
  const id = liftId(date, ex.name);
  const empty = sets.every(s => s.w == null && s.r == null);
  if (empty) { if (rec.lifts[id] && !rec.lifts[id].del) del('lifts', id, rec); return; }
  put('lifts', { id, date, ex: ex.name, type: ex.type, session: day.name, sets: sets.map(s => ({ w: s.w, r: s.r, d: !!s.d })) }, rec);
}

function sessionSummary(rec, date, day) {
  const names = new Set(day.exercises.map(e => e.name));
  let sets = 0, vol = 0;
  for (const e of live('lifts', rec)) {
    if (e.date !== date || (e.session !== day.name && !names.has(e.ex))) continue;
    if (e.type !== 'weight') { if (e.sets.some(s => s.r != null)) sets++; continue; }
    for (const s of e.sets) if (s.r != null) { sets++; vol += (s.w || 0) * s.r; }
  }
  return { sets, vol };
}

function exerciseCard(rec, date, day, ex, onSummary) {
  const id = liftId(date, ex.name);
  const saved = rec.lifts[id] && !rec.lifts[id].del ? rec.lifts[id] : null;
  const last = lastLift(rec, ex.name, date);
  const count = ex.type === 'weight' || ex.type === 'time' ? (ex.sets || 3) : 1;
  let sets = saved ? clone(saved.sets) : Array.from({ length: count }, () => ({ w: null, r: null, d: false }));
  while (!saved && sets.length < count) sets.push({ w: null, r: null, d: false });
  const card = h('article', { class: 'ex' });
  const changed = () => { persistLift(rec, date, day, ex, sets); onSummary(); flag(); };
  const flagEl = h('span', { class: 'tag', hidden: true }, 'New best');
  function flag() {
    let best = 0;
    for (const e of live('lifts', rec)) if (e.ex === ex.name && e.date < date) for (const s of e.sets) if (s.w && s.r) best = Math.max(best, est1RM(s.w, s.r));
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

function viewLifts(root) {
  const rec = cur(), date = ui.date, days = rec.profile.program.days;
  const dow = ui.sess[date] != null ? ui.sess[date] : dowOf(date);
  const day = days.find(d => d.dow === dow) || programDay(rec, date);
  root.append(pageHead('Lifts', null, syncBadge()), dateNav(render));
  const sel = h('select', { class: 'in', 'aria-label': 'Session', onchange: e => { ui.sess[date] = Number(e.target.value); render(); } },
    days.map(d => h('option', { value: String(d.dow), selected: d.dow === dow }, DAYS[d.dow] + ': ' + d.name)));
  root.append(h('label', { class: 'field' }, h('span', null, 'Session'), sel));

  const summary = h('p', { class: 'summary' });
  const updateSummary = () => {
    const s = sessionSummary(rec, date, day);
    summary.textContent = s.sets ? s.sets + ' sets logged' + (s.vol ? ', ' + fmt(s.vol) + ' kg lifted in total' : '') : 'Nothing logged yet';
  };
  root.append(summary);
  if (!day.exercises.length) root.append(h('p', { class: 'empty' }, 'No exercises planned for this day. You can add one below, or pick another session above.'));
  for (const ex of day.exercises) root.append(exerciseCard(rec, date, day, ex, updateSummary));

  // extras logged on this session that are not in the program
  const names = new Set(day.exercises.map(e => e.name));
  for (const e of live('lifts', rec)) {
    if (e.date === date && e.session === day.name && !names.has(e.ex)) {
      names.add(e.ex);
      root.append(exerciseCard(rec, date, day, { name: e.ex, type: e.type || 'weight', group: 'upper', sets: e.sets.length, reps: '8-12' }, updateSummary));
    }
  }
  root.append(h('button', { class: 'btn wide', onclick: () => {
    sheet('Add an exercise', (body, close) => {
      const name = h('input', { class: 'in', placeholder: 'Exercise name', 'aria-label': 'Exercise name' });
      body.append(h('label', { class: 'field' }, h('span', null, 'Name'), name),
        h('button', { class: 'btn primary wide', onclick: () => {
          const n = name.value.trim(); if (!n) return;
          persistLift(rec, date, day, { name: n, type: 'weight' }, [{ w: null, r: 0, d: false }]);
          close(); render();
        } }, 'Add'));
      setTimeout(() => name.focus(), 50);
    });
  } }, 'Add an exercise'));
  updateSummary();
}
