'use strict';
/* Profiles, welcome, lock screen, settings, program editor. */
const unlocked = new Set();

/* ---------- profile form (used for creating and editing) ---------- */
function profileForm(init, create) {
  const v = init || {};
  const t = v.targets || {};
  const mk = (type, val, ph, label, extra) => h('input', Object.assign({ class: 'in', type, value: val ?? '', placeholder: ph || '', 'aria-label': label }, type === 'number' ? { inputmode: 'decimal', step: 'any' } : {}, extra || {}));
  const f = {
    name: mk('text', v.name, 'Name', 'Name', { autocomplete: 'off' }),
    sex: h('select', { class: 'in', 'aria-label': 'Sex', value: v.sex || 'm' }, h('option', { value: 'm' }, 'Male'), h('option', { value: 'f' }, 'Female')),
    age: mk('number', v.age, 'years', 'Age'),
    height: mk('number', v.heightCm, 'cm', 'Height in centimetres'),
    weight: mk('number', create ? '' : v.startWeight, 'kg', 'Current weight in kilograms'),
    goalWeight: mk('number', v.goalWeight, 'kg', 'Goal weight in kilograms'),
    goalDate: mk('date', v.goalDate, '', 'Goal date'),
    gym: mk('number', t.gym, 'kcal', 'Calories on training days'),
    light: mk('number', t.light, 'kcal', 'Calories on light days'),
    protein: mk('number', t.protein, 'g', 'Protein in grams'),
    runCap: mk('number', v.runCap, 'km, optional', 'Weekly run limit in kilometres'),
    pin: mk('password', '', '4 to 8 digits, optional', 'PIN', { inputmode: 'numeric', autocomplete: 'off' })
  };
  const goal = h('select', { class: 'in', 'aria-label': 'Goal' },
    h('option', { value: 'steady' }, 'Lose fat, steady (about 20% below maintenance)'),
    h('option', { value: 'fast' }, 'Lose fat, faster (about 30% below maintenance)'),
    h('option', { value: 'maintain' }, 'Maintain weight'),
    h('option', { value: 'gain' }, 'Build muscle (about 10% above maintenance)'));
  const act = h('select', { class: 'in', 'aria-label': 'Activity', value: '1.5' },
    h('option', { value: '1.375' }, 'Mostly sitting, 1 to 3 workouts a week'),
    h('option', { value: '1.5' }, 'Mostly sitting, 4 to 5 workouts a week'),
    h('option', { value: '1.65' }, 'On your feet most of the day, 4 to 5 workouts'));
  act.value = '1.5';
  const note = h('p', { class: 'hint' }, 'Targets are estimates. Adjust them after two weeks based on how your weight trend moves.');
  const suggest = h('button', { type: 'button', class: 'btn', onclick: () => {
    const age = num(f.age.value), ht = num(f.height.value), w = num(f.weight.value) || v.startWeight || (cur() && currentWeight(cur()) && currentWeight(cur()).avg);
    if (!age || !ht || !w) { toast('Fill in age, height and weight first', 'bad'); return; }
    const s = suggestTargets(f.sex.value, age, ht, w, Number(act.value), goal.value);
    f.gym.value = s.gym; f.light.value = s.light; f.protein.value = s.protein;
    note.textContent = 'Estimated maintenance is about ' + fmt(s.tdee) + ' kcal a day. Training days get 100 above the target, light days 100 below.';
  } }, 'Suggest targets');
  const node = h('div', { class: 'form' },
    h('label', { class: 'field' }, h('span', null, 'Name'), f.name),
    h('div', { class: 'grid3' }, h('label', null, h('span', null, 'Sex'), f.sex), h('label', null, h('span', null, 'Age'), f.age), h('label', null, h('span', null, 'Height (cm)'), f.height)),
    create ? h('label', { class: 'field' }, h('span', null, 'Current weight (kg)'), f.weight) : null,
    h('div', { class: 'grid2' }, h('label', null, h('span', null, 'Goal weight (kg)'), f.goalWeight), h('label', null, h('span', null, 'Goal date'), f.goalDate)),
    h('h3', { class: 'list-h' }, 'Daily targets'),
    h('label', { class: 'field' }, h('span', null, 'Goal'), goal),
    h('label', { class: 'field' }, h('span', null, 'Activity'), act),
    suggest,
    h('div', { class: 'grid3' }, h('label', null, h('span', null, 'Training day kcal'), f.gym), h('label', null, h('span', null, 'Light day kcal'), f.light), h('label', null, h('span', null, 'Protein (g)'), f.protein)),
    note,
    h('label', { class: 'field' }, h('span', null, 'Weekly run limit (km)'), f.runCap),
    create ? h('label', { class: 'field' }, h('span', null, 'PIN (optional)'), f.pin, h('small', { class: 'hint' }, 'A PIN hides your profile from other people using this phone. It is not strong security.')) : null);
  const read = () => {
    const name = f.name.value.trim();
    const o = { name, sex: f.sex.value, age: num(f.age.value), heightCm: num(f.height.value), goalWeight: num(f.goalWeight.value), goalDate: f.goalDate.value, gym: num(f.gym.value), light: num(f.light.value), protein: num(f.protein.value), runCap: num(f.runCap.value), weight: num(f.weight.value), pin: f.pin.value.trim() };
    if (!name) { toast('Enter a name', 'bad'); return null; }
    if (!o.age || !o.heightCm) { toast('Enter your age and height', 'bad'); return null; }
    if (create && !o.weight) { toast('Enter your current weight', 'bad'); return null; }
    if (!o.gym || !o.light || !o.protein) { toast('Set your calorie and protein targets, or tap Suggest targets', 'bad'); return null; }
    if (o.pin && !/^\d{4,8}$/.test(o.pin)) { toast('A PIN is 4 to 8 digits', 'bad'); return null; }
    return o;
  };
  return { node, read };
}

async function submitNewProfile(o) {
  const id = createProfile({ name: o.name, sex: o.sex, age: o.age, heightCm: o.heightCm, weight: o.weight, goalWeight: o.goalWeight, goalDate: o.goalDate, gym: o.gym, light: o.light, protein: o.protein });
  if (o.runCap) saveProfile({ runCap: o.runCap }); else saveProfile({ runCap: null });
  if (o.pin) { saveProfile({ pinHash: await hashPin(id, o.pin) }); }
  unlocked.add(id);
  location.hash = '#/today';
  render();
}

/* ---------- welcome / picker / lock ---------- */
function connectSheet(after) {
  sheet('Connect sync', (body, close) => {
    const code = h('textarea', { class: 'in', rows: '3', placeholder: 'fitlog1:…', 'aria-label': 'Setup code' });
    const owner = h('input', { class: 'in', placeholder: 'GitHub username', 'aria-label': 'GitHub username', value: S.sync.owner });
    const repo = h('input', { class: 'in', placeholder: 'fitlog-data', 'aria-label': 'Data repo name', value: S.sync.repo });
    const token = h('input', { class: 'in', type: 'password', placeholder: 'github_pat_…', 'aria-label': 'Access token', value: S.sync.token, autocomplete: 'off' });
    const msg = h('p', { class: 'hint' });
    const run = async cfg => {
      msg.textContent = 'Checking…';
      try {
        const r = await testConnection(cfg);
        if (!r.ok) { msg.textContent = r.warn; return; }
        S.sync = Object.assign({}, cfg, { branch: r.branch || '' }); save();
        toast(r.warn ? 'Connected. ' + r.warn : 'Connected', r.warn ? 'bad' : '');
        close(); await syncAll(); if (after) after(); else render();
      } catch (e) { msg.textContent = friendlyError(e); }
    };
    body.append(
      h('p', null, 'Paste the setup code from another family phone, or enter the details of your private data repo.'),
      h('label', { class: 'field' }, h('span', null, 'Setup code'), code),
      h('button', { class: 'btn wide', onclick: () => { try { run(parseSetupCode(code.value)); } catch (e) { msg.textContent = e.message; } } }, 'Connect with code'),
      h('h3', { class: 'list-h' }, 'Or enter the details'),
      h('label', { class: 'field' }, h('span', null, 'GitHub username'), owner),
      h('label', { class: 'field' }, h('span', null, 'Data repo name'), repo),
      h('label', { class: 'field' }, h('span', null, 'Access token'), token),
      msg,
      h('button', { class: 'btn primary wide', onclick: () => {
        if (!owner.value.trim() || !repo.value.trim() || !token.value.trim()) { msg.textContent = 'Fill in all three fields.'; return; }
        run({ owner: owner.value.trim(), repo: repo.value.trim(), token: token.value.trim(), branch: '' });
      } }, 'Save and test'));
  });
}

function viewWelcome(root) {
  root.append(h('header', { class: 'page-head hero' }, h('div', null, h('h1', null, 'FitLog'), h('p', { class: 'sub' }, 'Track lifts, food and body measurements. Each person keeps their own profile and goals.'))));
  const form = profileForm(null, true);
  root.append(
    h('section', { class: 'block' },
      h('h2', null, 'Already set up on another phone?'),
      h('p', { class: 'meta' }, syncConfigured() ? 'Sync is connected. Your family profiles will appear on the profile screen.' : 'Connect sync to load your profile and your family\'s.'),
      h('button', { class: 'btn wide', onclick: () => connectSheet(() => { location.hash = '#/profiles'; render(); }) }, syncConfigured() ? 'Change sync connection' : 'Connect sync'),
      syncConfigured() ? h('button', { class: 'btn wide', onclick: () => { location.hash = '#/profiles'; } }, 'See profiles') : null),
    h('section', { class: 'block' }, h('h2', null, 'Create a profile'), form.node,
      h('button', { class: 'btn primary wide', onclick: () => { const o = form.read(); if (o) submitNewProfile(o); } }, 'Create profile')));
}

function activeProfiles() { return Object.values(S.profiles).filter(r => !r.profile.deleted).sort((a, b) => (a.profile.created || 0) - (b.profile.created || 0)); }

function selectProfile(id) {
  const rec = S.profiles[id];
  const go = () => { S.currentId = id; save(); location.hash = '#/today'; render(); };
  if (rec.profile.pinHash && !unlocked.has(id)) {
    sheet('Enter PIN for ' + rec.profile.name, (body, close) => {
      const pin = h('input', { class: 'in', type: 'password', inputmode: 'numeric', 'aria-label': 'PIN', autocomplete: 'off' });
      const msg = h('p', { class: 'hint' });
      const ok = async () => { if (await hashPin(id, pin.value.trim()) === rec.profile.pinHash) { unlocked.add(id); close(); go(); } else { msg.textContent = 'Wrong PIN.'; pin.value = ''; } };
      pin.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
      body.append(h('label', { class: 'field' }, h('span', null, 'PIN'), pin), msg, h('button', { class: 'btn primary wide', onclick: ok }, 'Unlock'));
      setTimeout(() => pin.focus(), 50);
    });
  } else go();
}

function viewProfiles(root) {
  root.append(pageHead('Who is training?', null, syncBadge()));
  const list = activeProfiles();
  if (!list.length) root.append(h('p', { class: 'empty' }, syncConfigured() ? 'No profiles found yet. If you just connected, pull down a moment and tap the sync badge.' : 'No profiles yet.'));
  root.append(h('div', { class: 'people' }, list.map(r => h('button', { class: 'person', onclick: () => selectProfile(r.profile.id) },
    h('span', { class: 'avatar' }, r.profile.name.slice(0, 1).toUpperCase()),
    h('span', null, h('b', null, r.profile.name), h('small', null, r.profile.pinHash ? 'PIN protected' : 'No PIN')),
    r.profile.pinHash ? h('small', { class: 'lock' }, 'Locked') : null))));
  root.append(h('button', { class: 'btn wide', onclick: () => { location.hash = '#/welcome'; } }, 'New profile'),
    h('button', { class: 'btn wide', onclick: () => connectSheet(() => render()) }, syncConfigured() ? 'Change sync connection' : 'Connect sync'));
}

function viewLock(root) {
  const rec = cur();
  const pin = h('input', { class: 'in', type: 'password', inputmode: 'numeric', 'aria-label': 'PIN', autocomplete: 'off' });
  const msg = h('p', { class: 'hint' });
  const ok = async () => { if (await hashPin(rec.profile.id, pin.value.trim()) === rec.profile.pinHash) { unlocked.add(rec.profile.id); render(); } else { msg.textContent = 'Wrong PIN.'; pin.value = ''; } };
  pin.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
  root.append(pageHead(rec.profile.name, 'Enter your PIN to continue'),
    h('label', { class: 'field' }, h('span', null, 'PIN'), pin), msg,
    h('button', { class: 'btn primary wide', onclick: ok }, 'Unlock'),
    h('button', { class: 'btn wide', onclick: () => { location.hash = '#/profiles'; } }, 'Switch profile'));
  setTimeout(() => pin.focus(), 50);
}

/* ---------- settings ---------- */
function exportPayload(rec) { return JSON.stringify(payload(rec), null, 1); }
function importFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result);
      if (!j || !j.profile || !j.lifts) throw new Error('This is not a FitLog backup file.');
      const rec = cur();
      let n = 0;
      for (const k of KINDS) { const before = Object.keys(rec[k]).length; rec[k] = mergeMaps(rec[k], j[k] || {}); n += Object.keys(rec[k]).length - before; }
      touch(rec); save();
      toast('Imported ' + n + ' new entries'); render();
    } catch (e) { toast(e.message || 'Could not read that file', 'bad'); }
  };
  rd.readAsText(file);
}

function viewSettings(root) {
  const rec = cur(), p = rec.profile;
  root.append(pageHead('More', p.name, syncBadge()));

  root.append(h('section', { class: 'block' },
    h('h2', null, 'Profile'),
    h('div', { class: 'btn-row wrap' },
      h('button', { class: 'btn', onclick: () => editProfile() }, 'Edit profile and targets'),
      h('button', { class: 'btn', onclick: () => { location.hash = '#/profiles'; } }, 'Switch profile'),
      h('button', { class: 'btn', onclick: () => pinSheet() }, p.pinHash ? 'Change or remove PIN' : 'Set a PIN')),
    h('p', { class: 'meta' }, 'Targets: ' + fmt(p.targets.gym) + ' kcal on training days, ' + fmt(p.targets.light) + ' on light days, ' + fmt(p.targets.protein) + ' g protein.')));

  root.append(h('section', { class: 'block' },
    h('h2', null, 'Training program'),
    h('p', { class: 'meta' }, 'Change exercises, sets and rep ranges for any day.'),
    h('button', { class: 'btn', onclick: () => { location.hash = '#/program'; } }, 'Edit program')));

  // sync
  const c = S.sync;
  root.append(h('section', { class: 'block' },
    h('h2', null, 'Sync'),
    h('p', { class: 'meta' }, syncConfigured()
      ? 'Connected to ' + c.owner + '/' + c.repo + (S.lastSync ? '. Last synced ' + ago(S.lastSync) + '.' : '.') + (sync.status === 'error' ? ' ' + sync.error : '')
      : 'Not connected. Your data is saved only on this phone until you connect a private GitHub repo.'),
    h('div', { class: 'btn-row wrap' },
      h('button', { class: 'btn primary', onclick: () => syncConfigured() ? syncAll().then(() => { toast(sync.status === 'ok' ? 'Synced' : sync.error || 'Sync failed', sync.status === 'ok' ? '' : 'bad'); render(); }) : connectSheet() }, syncConfigured() ? 'Sync now' : 'Connect sync'),
      syncConfigured() ? h('button', { class: 'btn', onclick: () => connectSheet() }, 'Change connection') : null,
      syncConfigured() ? h('button', { class: 'btn', onclick: async () => { const code = makeSetupCode(); try { await navigator.clipboard.writeText(code); toast('Setup code copied'); } catch (e) { sheet('Setup code', b => b.append(h('textarea', { class: 'in', rows: '5', readonly: true }, code))); } } }, 'Copy family setup code') : null,
      syncConfigured() ? h('button', { class: 'btn danger', onclick: () => confirmSheet('This phone will stop syncing and forget the access token. Entries stay on the phone.', 'Disconnect', () => { S.sync = { owner: '', repo: '', token: '', branch: '' }; save(); setStatus('idle'); render(); }, true) }, 'Disconnect') : null),
    syncConfigured() ? h('p', { class: 'hint' }, 'The setup code contains the access token. Share it only with family, in a private message.') : null));

  // backup
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: e => e.target.files[0] && importFile(e.target.files[0]) });
  root.append(h('section', { class: 'block' },
    h('h2', null, 'Backup and export'),
    h('p', { class: 'meta' }, 'A backup is one file with everything for this profile. Save it to Files or iCloud Drive from the share sheet.'),
    h('div', { class: 'btn-row wrap' },
      h('button', { class: 'btn', onclick: () => shareOrDownload('fitlog-' + slug(p.name) + '-' + today() + '.json', exportPayload(rec), 'application/json') }, 'Save backup'),
      h('button', { class: 'btn', onclick: () => fileIn.click() }, 'Restore from backup'), fileIn),
    h('div', { class: 'btn-row wrap' },
      h('button', { class: 'btn', onclick: () => shareOrDownload('lifts-' + today() + '.csv', toCSV([['date', 'session', 'exercise', 'set', 'kg or km', 'reps, seconds or minutes', 'done']].concat(live('lifts', rec).sort((a, b) => a.date.localeCompare(b.date)).flatMap(e => e.sets.map((s, i) => [e.date, e.session, e.ex, i + 1, s.w, s.r, s.d ? 'yes' : ''])))), 'text/csv') }, 'Export lifts (CSV)'),
      h('button', { class: 'btn', onclick: () => shareOrDownload('food-' + today() + '.csv', toCSV([['date', 'meal', 'food', 'grams', 'kcal', 'protein g', 'carbs g', 'fat g']].concat(live('food', rec).sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.date, e.meal, e.name, e.g, e.k, e.p, e.c, e.f]))), 'text/csv') }, 'Export food (CSV)'),
      h('button', { class: 'btn', onclick: () => shareOrDownload('body-' + today() + '.csv', toCSV([['date', 'weight kg', 'waist cm', 'steps']].concat(bodyList(rec).concat(live('body', rec).filter(e => e.w == null)).sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.date, e.w, e.waist, e.steps]))), 'text/csv') }, 'Export body (CSV)'))));

  root.append(h('section', { class: 'block' },
    h('h2', null, 'Danger zone'),
    h('button', { class: 'btn danger', onclick: () => confirmSheet('This erases every lift, meal and measurement for ' + p.name + ' on all synced phones. Make a backup first if you might want them back.', 'Delete profile', () => {
      const id = p.id;
      for (const k of KINDS) rec[k] = {};
      saveProfile({ deleted: true, pinHash: '' });
      S.currentId = null; save(); syncAll(); location.hash = '#/profiles'; render();
    }, true) }, 'Delete this profile')),
    h('p', { class: 'hint' }, 'FitLog ' + APP_VERSION));
}

function editProfile() {
  const rec = cur();
  sheet('Edit profile', (body, close) => {
    const form = profileForm(Object.assign({}, rec.profile), false);
    body.append(form.node, h('button', { class: 'btn primary wide', onclick: () => {
      const o = form.read(); if (!o) return;
      saveProfile({ name: o.name, sex: o.sex, age: o.age, heightCm: o.heightCm, goalWeight: o.goalWeight, goalDate: o.goalDate, runCap: o.runCap, targets: { gym: o.gym, light: o.light, protein: o.protein } });
      close(); render(); toast('Saved');
    } }, 'Save'));
  });
}

function pinSheet() {
  const rec = cur(), p = rec.profile;
  sheet(p.pinHash ? 'Change or remove PIN' : 'Set a PIN', (body, close) => {
    const pin = h('input', { class: 'in', type: 'password', inputmode: 'numeric', placeholder: '4 to 8 digits', 'aria-label': 'New PIN', autocomplete: 'off' });
    body.append(h('p', { class: 'meta' }, 'A PIN stops other people on this phone from opening your profile. It is not strong security: anyone with the family sync code could still read the data.'),
      h('label', { class: 'field' }, h('span', null, 'New PIN'), pin),
      h('div', { class: 'btn-row' },
        p.pinHash ? h('button', { class: 'btn danger', onclick: () => { saveProfile({ pinHash: '' }); close(); render(); toast('PIN removed'); } }, 'Remove PIN') : null,
        h('button', { class: 'btn primary', onclick: async () => {
          if (!/^\d{4,8}$/.test(pin.value.trim())) { toast('A PIN is 4 to 8 digits', 'bad'); return; }
          saveProfile({ pinHash: await hashPin(p.id, pin.value.trim()) }); unlocked.add(p.id); close(); render(); toast('PIN saved');
        } }, 'Save PIN')));
  });
}

/* ---------- program editor ---------- */
function viewProgramList(root) {
  const rec = cur(), prog = rec.profile.program;
  root.append(pageHead('Program', prog.name), h('button', { class: 'link back', onclick: () => { location.hash = '#/settings'; } }, 'Back to More'));
  const row = d => h('button', { class: 'pick', onclick: () => { location.hash = '#/program/' + d.dow; } },
    h('b', null, (isExtra(d.dow) ? '' : DAYS_LONG[d.dow] + ': ') + d.name),
    h('small', null, d.exercises.length ? d.exercises.length + ' exercises, ' + (d.kind === 'gym' ? 'training day calories' : 'light day calories') : 'Rest day, light day calories'));
  const week = prog.days.filter(d => !isExtra(d.dow)), extra = prog.days.filter(d => isExtra(d.dow));
  root.append(h('div', { class: 'list' }, week.map(row)));
  if (extra.length) root.append(h('h2', null, 'Extra sessions'),
    h('p', { class: 'hint' }, 'These belong to no weekday. Pick one from the Session list on the Lifts screen, for trips with no gym.'),
    h('div', { class: 'list' }, extra.map(row)));
  else root.append(h('button', { class: 'btn wide', onclick: () => { const n = addFieldSessions(); toast(n ? 'Added ' + n + ' field sessions' : 'Already there'); render(); } }, 'Add the field sessions (bands and bodyweight)'));
  root.append(h('button', { class: 'btn danger wide', onclick: () => confirmSheet('This replaces your whole program with the original 5-day split. Your logged history is kept.', 'Reset program', () => { saveProfile({ program: clone(DEFAULT_PROGRAM) }); render(); }, true) }, 'Reset to the original program'));
}

function viewProgramDay(root, dow) {
  const rec = cur();
  const day = clone(rec.profile.program.days.find(d => d.dow === dow));
  if (!day) { root.append(h('p', { class: 'empty' }, 'That session is not in your program.'), h('button', { class: 'link back', onclick: () => { location.hash = '#/program'; } }, 'Back to program')); return; }
  root.append(pageHead(isExtra(dow) ? day.name : DAYS_LONG[dow], 'Edit this session'), h('button', { class: 'link back', onclick: () => { location.hash = '#/program'; } }, 'Back to program'));
  const name = h('input', { class: 'in', value: day.name, 'aria-label': 'Session name', oninput: e => { day.name = e.target.value; } });
  const kind = h('select', { class: 'in', 'aria-label': 'Day type', onchange: e => { day.kind = e.target.value; }, value: day.kind },
    h('option', { value: 'gym' }, 'Training day (higher calories)'), h('option', { value: 'light' }, 'Light or rest day'));
  root.append(h('label', { class: 'field' }, h('span', null, 'Session name'), name), h('label', { class: 'field' }, h('span', null, 'Day type'), kind),
    h('p', { class: 'hint' }, 'Renaming an exercise starts a new history for it, because history is matched by name.'));
  const box = h('div');
  const draw = () => box.replaceChildren(...day.exercises.map((ex, i) => {
    const typ = h('select', { class: 'in', 'aria-label': 'Type', onchange: e => { ex.type = e.target.value; if (ex.type !== 'weight' && ex.type !== 'time') ex.sets = 1; draw(); }, value: ex.type },
      h('option', { value: 'weight' }, 'Weights (kg × reps)'), h('option', { value: 'time' }, 'Timed (seconds)'), h('option', { value: 'cardio' }, 'Cardio machine (minutes)'), h('option', { value: 'run' }, 'Run (km and minutes)'));
    return h('div', { class: 'ex-edit' },
      h('input', { class: 'in', value: ex.name, 'aria-label': 'Exercise name', oninput: e => { ex.name = e.target.value; } }),
      h('div', { class: 'grid3' }, h('label', null, h('span', null, 'Type'), typ),
        (ex.type === 'weight' || ex.type === 'time') ? h('label', null, h('span', null, 'Sets'), h('input', { class: 'in', type: 'number', inputmode: 'numeric', value: ex.sets, oninput: e => { ex.sets = num(e.target.value) || 1; } })) : h('span'),
        h('label', null, h('span', null, ex.type === 'weight' ? 'Reps' : ex.type === 'run' ? 'Distance km' : ex.type === 'cardio' ? 'Minutes' : 'Seconds'), h('input', { class: 'in', value: ex.reps, oninput: e => { ex.reps = e.target.value; } }))),
      ex.type === 'weight' ? h('div', { class: 'grid2' },
        h('label', null, h('span', null, 'Muscle group'), h('select', { class: 'in', onchange: e => { ex.group = e.target.value; }, value: ex.group || 'upper' }, h('option', { value: 'upper' }, 'Upper body'), h('option', { value: 'lower' }, 'Lower body'), h('option', { value: 'core' }, 'Core'))),
        h('label', null, h('span', null, 'Step up by (kg)'), h('input', { class: 'in', type: 'number', inputmode: 'decimal', step: 'any', value: ex.inc ?? '', placeholder: 'auto', oninput: e => { ex.inc = num(e.target.value); } }))) : null,
      h('div', { class: 'btn-row' },
        i > 0 ? h('button', { class: 'link', onclick: () => { [day.exercises[i - 1], day.exercises[i]] = [day.exercises[i], day.exercises[i - 1]]; draw(); } }, 'Move up') : null,
        h('button', { class: 'link bad', onclick: () => { day.exercises.splice(i, 1); draw(); } }, 'Remove')));
  }));
  draw();
  root.append(box,
    h('button', { class: 'btn wide', onclick: () => { day.exercises.push({ name: 'New exercise', type: 'weight', group: 'upper', sets: 3, reps: '8-12' }); draw(); } }, 'Add an exercise'),
    h('button', { class: 'btn primary wide', onclick: () => {
      day.name = day.name.trim() || dayLong(dow);
      day.exercises = day.exercises.filter(e => e.name.trim());
      const prog = clone(rec.profile.program);
      prog.days = prog.days.map(d => d.dow === dow ? day : d);
      saveProfile({ program: prog }); toast('Saved'); location.hash = '#/program';
    } }, 'Save day'));
}
