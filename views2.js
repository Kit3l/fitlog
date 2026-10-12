'use strict';
/* Food and Progress screens. */

/* ---------- Food ---------- */
function macroPreview(per, grams) {
  const k = per.k * grams / 100;
  return { k: Math.round(k), p: r1(per.p * grams / 100), c: r1(per.c * grams / 100), f: r1(per.f * grams / 100) };
}
function entryLabel(e) {
  if (e.g == null) return 'Quick add';
  const g = fmt(e.g, e.g % 1 ? 1 : 0) + ' g';
  if (!e.unit || e.unit === 'grams') return g;
  return g + ', ' + (e.qty === 1 ? e.unit : fmt(e.qty, e.qty % 1 ? 1 : 0) + ' × ' + e.unit);
}

function viewFood(root) {
  const rec = cur(), date = ui.date;
  const tg = targetsFor(rec, date), tot = dayTotals(rec, date);
  root.append(pageHead('Food', null, syncBadge()), dateNav(render));

  const left = tg.kcal - tot.k;
  root.append(h('section', { class: 'energy compact' },
    h('div', { class: 'big' },
      h('span', { class: 'num' + (left < 0 ? ' bad' : '') }, fmt(tot.k)),
      h('span', { class: 'unit' }, 'of ' + fmt(tg.kcal) + ' kcal')),
    tally(tot.k, tg.kcal),
    h('div', { class: 'stat-row' },
      h('div', { class: 'grow' }, h('b', null, fmt(tot.p) + ' g'), ' protein of ' + fmt(tg.protein), bar(tot.p, tg.protein)),
      h('div', null, h('b', null, fmt(tot.c) + ' g'), ' carbs'),
      h('div', null, h('b', null, fmt(tot.f) + ' g'), ' fat'))));

  root.append(h('div', { class: 'btn-row' },
    h('button', { class: 'btn primary', onclick: () => foodSheet(date, null) }, icon('plus', 18), ' Add food'),
    h('button', { class: 'btn', onclick: () => {
      const prev = addDays(date, -1);
      const src = live('food', rec).filter(e => e.date === prev);
      if (!src.length) { toast('Nothing logged on ' + prettyDate(prev).toLowerCase(), 'bad'); return; }
      for (const e of src) put('food', Object.assign({}, e, { id: uid(), date }), rec);
      toast('Copied ' + src.length + ' items'); render();
    } }, 'Copy ' + prettyDate(addDays(date, -1)).toLowerCase())));

  const entries = live('food', rec).filter(e => e.date === date);
  if (!entries.length) root.append(h('p', { class: 'empty' }, 'Nothing logged for ' + prettyDate(date).toLowerCase() + '. Tap Add food to start with your first meal.'));
  for (const meal of MEALS) {
    const rows = entries.filter(e => (MEALS.includes(e.meal) ? e.meal : 'Snack') === meal).sort((a, b) => a.u - b.u);
    if (!rows.length) continue;
    const sub = rows.reduce((s, e) => s + e.k, 0);
    root.append(h('section', { class: 'meal' },
      h('div', { class: 'meal-head' }, h('h2', null, meal), h('span', null, fmt(sub) + ' kcal'), h('button', { class: 'link', onclick: () => foodSheet(date, meal) }, 'Add')),
      rows.map(e => h('button', { class: 'entry', onclick: () => editEntry(e) },
        h('span', { class: 'e-main' }, h('b', null, e.name), h('small', null, entryLabel(e))),
        h('span', { class: 'e-num' }, h('b', null, fmt(e.k)), h('small', null, fmt(e.p, e.p % 1 ? 1 : 0) + ' g protein'))))));
  }
}

function editEntry(e) {
  const rec = cur();
  sheet(e.name, (body, close) => {
    if (e.per && e.g != null) {
      const g = h('input', { class: 'in', type: 'number', inputmode: 'decimal', step: 'any', value: e.g, 'aria-label': 'Grams' });
      const prev = h('p', { class: 'preview' });
      const upd = () => { const v = num(g.value); if (!v) { prev.textContent = ''; return; } const m = macroPreview(e.per, v); prev.textContent = m.k + ' kcal, ' + m.p + ' g protein, ' + m.c + ' g carbs, ' + m.f + ' g fat'; };
      g.addEventListener('input', upd); upd();
      body.append(h('label', { class: 'field' }, h('span', null, 'Amount in grams'), g), prev,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn danger', onclick: () => { del('food', e.id); close(); render(); } }, 'Remove'),
          h('button', { class: 'btn primary', onclick: () => {
            const v = num(g.value); if (!v) return;
            put('food', Object.assign({}, e, { g: v, qty: v, unit: 'grams' }, macroPreview(e.per, v)));
            close(); render();
          } }, 'Save')));
    } else {
      const k = h('input', { class: 'in', type: 'number', inputmode: 'decimal', value: e.k, 'aria-label': 'Calories' });
      const p = h('input', { class: 'in', type: 'number', inputmode: 'decimal', value: e.p, 'aria-label': 'Protein' });
      body.append(h('div', { class: 'grid2' }, h('label', null, h('span', null, 'Calories'), k), h('label', null, h('span', null, 'Protein (g)'), p)),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn danger', onclick: () => { del('food', e.id); close(); render(); } }, 'Remove'),
          h('button', { class: 'btn primary', onclick: () => { put('food', Object.assign({}, e, { k: Math.round(num(k.value) || 0), p: num(p.value) || 0 })); close(); render(); } }, 'Save')));
    }
  });
}

function foodSheet(date, meal0) {
  const rec = cur();
  sheet('Add food', (body, close) => {
    let meal = meal0 || defaultMeal(), tab = 'search';
    const mealSel = h('select', { class: 'in', 'aria-label': 'Meal', onchange: e => { meal = e.target.value; } },
      MEALS.map(m => h('option', { value: m, selected: m === meal }, m)));
    const pane = h('div');
    const tabs = h('div', { class: 'tabs2', role: 'tablist' });
    const show = t => { tab = t; drawTabs(); ({ search: showSearch, quick: showQuick, custom: showCustom })[t](); };
    const drawTabs = () => tabs.replaceChildren(...[['search', 'Search'], ['quick', 'Quick add'], ['custom', 'New food']].map(([k, l]) =>
      h('button', { role: 'tab', 'aria-selected': String(tab === k), class: tab === k ? 'on' : '', onclick: () => show(k) }, l)));
    body.append(h('label', { class: 'field' }, h('span', null, 'Meal'), mealSel), tabs, pane);

    function showSearch() {
      const q = h('input', { class: 'in', type: 'search', placeholder: 'Search: ugali, tilapia, mala', 'aria-label': 'Search foods', autocomplete: 'off' });
      const list = h('div', { class: 'list' });
      const row = f => h('button', { class: 'pick', onclick: () => showQty(f, null) },
        h('b', null, f.n, f.custom ? h('em', null, ' mine') : null),
        h('small', null, fmt(f.k) + ' kcal and ' + fmt(f.p, f.p % 1 ? 1 : 0) + ' g protein per 100 g'));
      const draw = () => {
        const query = q.value.trim();
        if (query) {
          const res = searchFoods(rec, query).slice(0, 50);
          list.replaceChildren(...(res.length ? res.map(row) : [h('p', { class: 'empty' }, 'No match. Use New food to add it with its label values, or Quick add for a rough calorie count.')]));
        } else {
          const rf = recentFoods(rec);
          const rest = allFoods(rec).slice().sort((a, b) => a.n.localeCompare(b.n));
          list.replaceChildren(...(rf.length ? [h('h3', { class: 'list-h' }, 'Recent'), ...rf.map(row)] : []), h('h3', { class: 'list-h' }, 'All foods'), ...rest.map(row));
        }
      };
      q.addEventListener('input', debounce(draw, 80));
      pane.replaceChildren(q, list); draw();
    }

    function showQty(food, existing) {
      const units = [['grams', 1]].concat(food.u || []);
      const mem = S.qty[food.id];
      let idx = mem && units[mem[0]] ? mem[0] : (units.length > 1 ? 1 : 0);
      const unitSel = h('select', { class: 'in', 'aria-label': 'Unit', onchange: e => { idx = Number(e.target.value); amt.value = idx === 0 ? 100 : 1; upd(); } },
        units.map((u, i) => h('option', { value: String(i), selected: i === idx }, u[0] === 'grams' ? 'grams' : u[0] + ' (' + fmt(u[1], u[1] % 1 ? 1 : 0) + ' g)')));
      const amt = h('input', { class: 'in', type: 'number', inputmode: 'decimal', step: 'any', value: mem && mem[0] === idx ? mem[1] : (idx === 0 ? 100 : 1), 'aria-label': 'Amount' });
      const prev = h('p', { class: 'preview' });
      const per = { k: food.k, p: food.p, c: food.c, f: food.f };
      const upd = () => { const a = num(amt.value); if (!a) { prev.textContent = ''; return; } const g = a * units[idx][1], m = macroPreview(per, g); prev.textContent = fmt(g, g % 1 ? 1 : 0) + ' g: ' + m.k + ' kcal, ' + m.p + ' g protein, ' + m.c + ' g carbs, ' + m.f + ' g fat'; };
      amt.addEventListener('input', upd); upd();
      pane.replaceChildren(
        h('h3', { class: 'list-h' }, food.n),
        h('div', { class: 'grid2 qty' }, h('label', null, h('span', null, 'How much'), amt), h('label', null, h('span', null, 'Unit'), unitSel)),
        prev,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', onclick: showSearch }, 'Back'),
          h('button', { class: 'btn primary', onclick: () => {
            const a = num(amt.value); if (!a) return;
            const g = a * units[idx][1];
            put('food', Object.assign({ id: uid(), date, meal, fid: food.id, name: food.n, g, qty: a, unit: units[idx][0], per }, macroPreview(per, g)));
            S.qty[food.id] = [idx, a]; save();
            close(); render(); toast('Added ' + food.n);
          } }, 'Add')));
      setTimeout(() => amt.select(), 50);
    }

    function showQuick() {
      const n = h('input', { class: 'in', placeholder: 'What was it?', 'aria-label': 'Name' });
      const k = h('input', { class: 'in', type: 'number', inputmode: 'decimal', placeholder: 'kcal', 'aria-label': 'Calories' });
      const p = h('input', { class: 'in', type: 'number', inputmode: 'decimal', placeholder: 'g', 'aria-label': 'Protein' });
      pane.replaceChildren(
        h('p', { class: 'hint' }, 'For meals out or anything not in the list. Enter your best estimate.'),
        h('label', { class: 'field' }, h('span', null, 'Name'), n),
        h('div', { class: 'grid2' }, h('label', null, h('span', null, 'Calories'), k), h('label', null, h('span', null, 'Protein (g)'), p)),
        h('button', { class: 'btn primary wide', onclick: () => {
          const kk = num(k.value); if (kk == null) { toast('Enter the calories', 'bad'); return; }
          put('food', { id: uid(), date, meal, fid: null, name: n.value.trim() || 'Quick add', g: null, k: Math.round(kk), p: num(p.value) || 0, c: 0, f: 0 });
          close(); render();
        } }, 'Add'));
    }

    function showCustom() {
      const f = {
        n: h('input', { class: 'in', placeholder: 'Food name', 'aria-label': 'Food name' }),
        k: h('input', { class: 'in', type: 'number', inputmode: 'decimal', placeholder: 'kcal', 'aria-label': 'Calories per 100 g' }),
        p: h('input', { class: 'in', type: 'number', inputmode: 'decimal', placeholder: 'g', 'aria-label': 'Protein per 100 g' }),
        c: h('input', { class: 'in', type: 'number', inputmode: 'decimal', placeholder: 'g', 'aria-label': 'Carbs per 100 g' }),
        f: h('input', { class: 'in', type: 'number', inputmode: 'decimal', placeholder: 'g', 'aria-label': 'Fat per 100 g' }),
        ul: h('input', { class: 'in', placeholder: 'e.g. 1 slice', 'aria-label': 'Portion name' }),
        ug: h('input', { class: 'in', type: 'number', inputmode: 'decimal', placeholder: 'grams', 'aria-label': 'Portion grams' })
      };
      pane.replaceChildren(
        h('p', { class: 'hint' }, 'Copy the numbers per 100 g from the label. The food is saved for everyone on this profile.'),
        h('label', { class: 'field' }, h('span', null, 'Name'), f.n),
        h('div', { class: 'grid2' }, h('label', null, h('span', null, 'Calories per 100 g'), f.k), h('label', null, h('span', null, 'Protein per 100 g'), f.p)),
        h('div', { class: 'grid2' }, h('label', null, h('span', null, 'Carbs per 100 g'), f.c), h('label', null, h('span', null, 'Fat per 100 g'), f.f)),
        h('div', { class: 'grid2' }, h('label', null, h('span', null, 'Portion (optional)'), f.ul), h('label', null, h('span', null, 'Portion grams'), f.ug)),
        h('button', { class: 'btn primary wide', onclick: () => {
          const name = f.n.value.trim(), k = num(f.k.value);
          if (!name || k == null) { toast('Add a name and the calories per 100 g', 'bad'); return; }
          const food = { id: 'c-' + uid(), n: name, alt: '', k, p: num(f.p.value) || 0, c: num(f.c.value) || 0, f: num(f.f.value) || 0, u: [] };
          if (f.ul.value.trim() && num(f.ug.value)) food.u.push([f.ul.value.trim(), num(f.ug.value)]);
          put('customFoods', food);
          showQty(Object.assign({ custom: true }, food), null);
        } }, 'Save and add'));
    }
    show('search');
  });
}

/* ---------- Progress ---------- */
function viewProgress(root) {
  const rec = cur(), p = rec.profile;
  root.append(pageHead('Progress', null, syncBadge()));
  const bl = bodyList(rec);

  // Weight
  const wsec = h('section', { class: 'block' }, h('h2', null, 'Weight'));
  if (bl.length) {
    const first = bl[0].date, ma = movingAvg(bl);
    const x = d => diffDays(d, first);
    const end = bl[bl.length - 1].date;
    const xt = [first, end].map(d => ({ x: x(d), label: shortDate(d) }));
    wsec.append(lineChart({
      label: 'Weight over time',
      series: [{ pts: bl.map(e => [x(e.date), e.w]), cls: 'faint', dots: true, line: false, r: 2.2 }, { pts: ma.map(e => [x(e.date), e.avg]), cls: 'main' }],
      hlines: p.goalWeight ? [{ y: p.goalWeight, label: 'goal ' + fmt(p.goalWeight, 1) }] : [], xTicks: xt
    }));
    const cw = currentWeight(rec), rate = weeklyRate(rec);
    wsec.append(h('div', { class: 'stat-row' },
      h('div', null, h('b', null, fmt(bl[0].w, 1) + ' kg'), ' first entry'),
      h('div', null, h('b', null, fmt(cw.avg, 1) + ' kg'), ' 7-day average'),
      h('div', null, h('b', null, fmt(cw.avg - bl[0].w, 1) + ' kg'), ' change')));
    wsec.append(h('p', { class: 'meta' }, 'Dots are daily weigh-ins and the line is the 7-day average. Judge progress by the line, not by single days.' + (rate != null ? ' Pace over the last two weeks: ' + (rate <= 0 ? fmt(-rate, 2) + ' kg/week down.' : fmt(rate, 2) + ' kg/week up.') : '')));
  } else wsec.append(h('p', { class: 'empty' }, 'Log your weight on the Today screen to see the trend.'));
  root.append(wsec);

  // Waist
  const wl = live('body', rec).filter(e => e.waist != null).sort((a, b) => a.date.localeCompare(b.date));
  const asec = h('section', { class: 'block' }, h('h2', null, 'Waist'));
  if (wl.length > 1) {
    const f0 = wl[0].date;
    asec.append(lineChart({ label: 'Waist over time', series: [{ pts: wl.map(e => [diffDays(e.date, f0), e.waist]), cls: 'main', dots: true }], xTicks: [f0, wl[wl.length - 1].date].map(d => ({ x: diffDays(d, f0), label: shortDate(d) })) }));
    asec.append(h('p', { class: 'meta' }, fmt(wl[wl.length - 1].waist - wl[0].waist, 1) + ' cm since ' + shortDate(f0) + '.'));
  } else asec.append(h('p', { class: 'empty' }, wl.length ? 'One measurement so far. Measure again in two weeks.' : 'Add your waist on the Today screen. It shows fat loss better than the scale.'));
  root.append(asec);

  // Lifts
  const lsec = h('section', { class: 'block' }, h('h2', null, 'Lift progress'));
  const exs = [...new Set(live('lifts', rec).filter(e => e.type === 'weight' && e.sets.some(s => s.w && s.r)).map(e => e.ex))].sort();
  if (exs.length) {
    if (!ui.progEx || !exs.includes(ui.progEx)) ui.progEx = exs[0];
    const chartBox = h('div');
    const draw = () => {
      const es = live('lifts', rec).filter(e => e.ex === ui.progEx).sort((a, b) => a.date.localeCompare(b.date));
      const pts = es.map(e => [e, Math.max(0, ...e.sets.filter(s => s.r).map(s => s.w || 0))]).filter(x => x[1] > 0);
      const f0 = pts.length ? pts[0][0].date : today();
      let bestE = null; for (const e of es) for (const s of e.sets) if (s.w && s.r && (!bestE || est1RM(s.w, s.r) > est1RM(bestE.s.w, bestE.s.r))) bestE = { s, e };
      setKids(chartBox,
        pts.length ? lineChart({ label: ui.progEx + ' top weight', series: [{ pts: pts.map(x => [diffDays(x[0].date, f0), x[1]]), cls: 'main', dots: true }], xTicks: [{ x: 0, label: shortDate(f0) }, { x: diffDays(pts[pts.length - 1][0].date, f0), label: shortDate(pts[pts.length - 1][0].date) }] }) : null,
        bestE ? h('p', { class: 'meta' }, 'Best set: ' + fmt(bestE.s.w, bestE.s.w % 1 ? 1 : 0) + ' kg × ' + bestE.s.r + ' on ' + shortDate(bestE.e.date) + '. Chart shows your heaviest set each session.') : null);
    };
    lsec.append(h('label', { class: 'field' }, h('span', null, 'Exercise'), h('select', { class: 'in', onchange: e => { ui.progEx = e.target.value; draw(); } }, exs.map(n => h('option', { value: n, selected: n === ui.progEx }, n)))), chartBox);
    draw();
  } else lsec.append(h('p', { class: 'empty' }, 'Log a few sessions with weights and your strength trend will show here.'));
  root.append(lsec);

  // Calories
  const csec = h('section', { class: 'block' }, h('h2', null, 'Calories, last 14 days'));
  const t0 = today(), bars = [], vals = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(t0, -i), tot = dayTotals(rec, d), tg = targetsFor(rec, d);
    bars.push({ label: i % 3 === 0 ? String(parseD(d).getDate()) : '', v: tot.k, over: tot.k > tg.kcal });
    if (tot.n) vals.push({ k: tot.k, t: tg.kcal });
  }
  if (vals.length) {
    csec.append(barChart({ label: 'Calories per day', bars, target: p.targets.gym }));
    const avg = vals.reduce((s, v) => s + v.k, 0) / vals.length, avgT = vals.reduce((s, v) => s + v.t, 0) / vals.length;
    csec.append(h('p', { class: 'meta' }, 'Average on the ' + vals.length + ' days you logged: ' + fmt(avg) + ' kcal against a target average of ' + fmt(avgT) + '. The line marks your training-day target. Red bars went over that day\'s target.'));
  } else csec.append(h('p', { class: 'empty' }, 'Log food to see how your days compare with your targets.'));
  root.append(csec);

  // Weeks
  const wk = h('section', { class: 'block' }, h('h2', null, 'Weekly consistency'));
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const from = addDays(weekStart(today()), -7 * i), to = addDays(from, 6);
    const days = new Set(live('lifts', rec).filter(e => e.date >= from && e.date <= to && e.type !== 'run' && e.sets.some(s => s.r != null)).map(e => e.date));
    const foodDays = new Set(live('food', rec).filter(e => e.date >= from && e.date <= to).map(e => e.date));
    rows.push(h('tr', null, h('td', null, i === 0 ? 'This week' : 'Week of ' + shortDate(from)), h('td', null, String(days.size)), h('td', null, fmt(weekRunKm(rec, from), 1)), h('td', null, String(foodDays.size))));
  }
  wk.append(h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Week'), h('th', null, 'Training days'), h('th', null, 'Run km'), h('th', null, 'Days with food logged'))), h('tbody', null, rows)));
  root.append(wk);
}
