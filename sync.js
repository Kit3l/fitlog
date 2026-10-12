'use strict';
/*
  GitHub sync. Each profile is one file in the private data repo: data/<profile id>.json.
  A sync pulls the remote file, merges it with the local copy entry by entry (newest change wins),
  and pushes the result if it differs. Using one file per person means two people never overwrite
  each other; the same person on two phones is merged, not replaced.
*/
const sync = { busy: false, again: false, status: 'idle', error: '', timer: null };

const syncConfigured = () => !!(S.sync.owner && S.sync.repo && S.sync.token);

function b64enc(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64dec(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

async function ghc(cfg, path, opts = {}) {
  const res = await fetch('https://api.github.com' + path, {
    method: opts.method || 'GET',
    cache: 'no-store',
    headers: Object.assign({
      'Authorization': 'Bearer ' + cfg.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }, opts.body ? { 'Content-Type': 'application/json' } : {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    const err = new Error((data && data.message) || ('HTTP ' + res.status));
    err.status = res.status;
    throw err;
  }
  return data;
}
const gh = (path, opts) => ghc(S.sync, path, opts);
const repoPath = () => '/repos/' + encodeURIComponent(S.sync.owner) + '/' + encodeURIComponent(S.sync.repo);
const refQuery = () => (S.sync.branch ? '?ref=' + encodeURIComponent(S.sync.branch) : '');

function friendlyError(e) {
  if (!e) return 'Unknown error';
  if (e.status === 401) return 'GitHub rejected the token. It may have expired or been revoked.';
  if (e.status === 403) return 'The token does not have write access to the data repo, or GitHub is rate limiting.';
  if (e.status === 404) return 'Data repo not found. Check the owner and repo name, and that the token covers this repo.';
  if (e instanceof TypeError) return 'No connection. Your entries are saved on this phone and will sync later.';
  return e.message || 'Sync failed';
}

/* ---------- merge ---------- */
function mergeMaps(a, b) {
  const out = {};
  const ids = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const id of ids) {
    const x = a && a[id], y = b && b[id];
    out[id] = !x ? y : !y ? x : ((x.u || 0) >= (y.u || 0) ? x : y);
  }
  return out;
}
function pruneTombs(map) {
  const cut = Date.now() - 120 * 864e5;
  for (const [id, e] of Object.entries(map)) if (e.del && (e.u || 0) < cut) delete map[id];
  return map;
}
function payload(rec) {
  return { v: 1, profile: rec.profile, lifts: rec.lifts, food: rec.food, body: rec.body, customFoods: rec.customFoods };
}
function mergePayload(local, remote) {
  const out = { v: 1, profile: (!remote.profile || (local.profile.u || 0) >= (remote.profile.u || 0)) ? local.profile : remote.profile };
  for (const k of KINDS) out[k] = pruneTombs(mergeMaps(local[k], remote[k]));
  return out;
}
function canon(o) {
  if (Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
  if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}';
  return JSON.stringify(o);
}

/* ---------- remote files ---------- */
async function listRemote() {
  try {
    const d = await gh(repoPath() + '/contents/data' + refQuery());
    return d.filter(x => x.type === 'file' && x.name.endsWith('.json')).map(x => ({ id: x.name.slice(0, -5), sha: x.sha }));
  } catch (e) { if (e.status === 404) return []; throw e; }
}
async function pullFile(id) {
  try {
    const d = await gh(repoPath() + '/contents/data/' + encodeURIComponent(id) + '.json' + refQuery());
    let text;
    if (d.content && d.encoding === 'base64') text = b64dec(d.content);
    else text = b64dec((await gh(repoPath() + '/git/blobs/' + d.sha)).content);
    return { sha: d.sha, data: JSON.parse(text) };
  } catch (e) { if (e.status === 404) return null; throw e; }
}

function applyMerged(rec, merged, sha) {
  // Re-merge with the live local copy in case something changed while the request was in flight.
  const now = mergePayload(payload(rec), merged);
  const changed = canon(now) !== canon(merged);
  rec.profile = now.profile;
  for (const k of KINDS) rec[k] = now[k];
  rec.sha = sha;
  rec.dirty = changed;
}

async function syncProfile(id) {
  const rec = S.profiles[id];
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = await pullFile(id);
    const merged = remote ? mergePayload(payload(rec), remote.data) : payload(rec);
    if (remote && canon(merged) === canon(remote.data)) { applyMerged(rec, merged, remote.sha); return 'pulled'; }
    try {
      const body = { message: 'sync ' + (rec.profile.name || id), content: b64enc(JSON.stringify(merged)) };
      if (remote) body.sha = remote.sha;
      if (S.sync.branch) body.branch = S.sync.branch;
      const res = await gh(repoPath() + '/contents/data/' + encodeURIComponent(id) + '.json', { method: 'PUT', body });
      applyMerged(rec, merged, res.content.sha);
      return 'pushed';
    } catch (e) {
      lastErr = e;
      if ((e.status === 409 || e.status === 422) && attempt < 2) continue; // someone else wrote first: pull and merge again
      throw e;
    }
  }
  throw lastErr;
}

function setStatus(status, error) {
  sync.status = status; sync.error = error || '';
  window.dispatchEvent(new CustomEvent('fitlog:status'));
}

async function syncAll() {
  if (!syncConfigured()) return;
  if (!navigator.onLine) { setStatus('offline'); return; }
  if (sync.busy) { sync.again = true; return; }
  sync.busy = true;
  setStatus('syncing');
  let changed = false;
  try {
    if (!S.sync.branch) { S.sync.branch = (await gh(repoPath())).default_branch || ''; save(); }
    const remote = await listRemote();
    const remoteSha = Object.fromEntries(remote.map(r => [r.id, r.sha]));
    const ids = new Set([...remote.map(r => r.id), ...Object.keys(S.profiles)]);
    for (const id of ids) {
      const rec = S.profiles[id];
      if (!rec) {
        const r = await pullFile(id);
        if (r && r.data && r.data.profile) {
          S.profiles[id] = { profile: r.data.profile, lifts: r.data.lifts || {}, food: r.data.food || {}, body: r.data.body || {}, customFoods: r.data.customFoods || {}, dirty: false, sha: r.sha };
          changed = true;
        }
        continue;
      }
      if (!rec.dirty && remoteSha[id] && remoteSha[id] === rec.sha) continue; // nothing new either way
      const before = canon(payload(rec));
      await syncProfile(id);
      if (canon(payload(rec)) !== before) changed = true;
    }
    S.lastSync = Date.now();
    save();
    setStatus('ok');
  } catch (e) {
    console.warn('sync failed', e);
    setStatus(e instanceof TypeError ? 'offline' : 'error', friendlyError(e));
  } finally {
    sync.busy = false;
    if (changed) window.dispatchEvent(new CustomEvent('fitlog:data'));
    if (sync.again) { sync.again = false; scheduleSync(800); }
  }
}

function scheduleSync(ms) {
  if (!syncConfigured()) return;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(syncAll, ms == null ? 4000 : ms);
}

async function testConnection(cfg) {
  const r = await ghc(cfg, '/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo));
  if (r.private === false) return { ok: true, warn: 'This repo is public. Anyone could read your family\'s health data. Use a private repo.', branch: r.default_branch };
  if (r.permissions && r.permissions.push === false) return { ok: false, warn: 'The token can read this repo but not write to it. Give it Contents: Read and write.' };
  return { ok: true, branch: r.default_branch };
}

/* ---------- setup code: lets other family phones connect in one paste ---------- */
function makeSetupCode() {
  const c = S.sync;
  return 'fitlog1:' + b64enc(JSON.stringify({ o: c.owner, r: c.repo, t: c.token }));
}
function parseSetupCode(code) {
  code = (code || '').trim();
  if (!code.startsWith('fitlog1:')) throw new Error('That does not look like a FitLog setup code.');
  const j = JSON.parse(b64dec(code.slice(8)));
  if (!j.o || !j.r || !j.t) throw new Error('The setup code is incomplete.');
  return { owner: j.o, repo: j.r, token: j.t, branch: '' };
}
