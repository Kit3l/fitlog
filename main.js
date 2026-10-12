'use strict';
/* Router and start-up. */
const TABS = [['today', 'Today', 'today'], ['lifts', 'Lifts', 'lifts'], ['food', 'Food', 'food'], ['progress', 'Progress', 'progress'], ['settings', 'More', 'more']];
let lastRoute = null;

function currentRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  return { name: parts[0] || '', rest: parts.slice(1) };
}

function render() {
  const root = $('#app'), nav = $('#tabs');
  const { name, rest } = currentRoute();
  const key = name + '/' + rest.join('/');
  const hasProfile = cur() && !cur().profile.deleted;
  let view = name, showNav = true;

  if (!hasProfile) {
    S.currentId = null;
    showNav = false;
    if (name !== 'welcome' && name !== 'profiles') view = activeProfiles().length ? 'profiles' : 'welcome';
  } else if (cur().profile.pinHash && !unlocked.has(S.currentId) && name !== 'profiles' && name !== 'welcome') {
    view = 'lock'; showNav = false;
  } else if (!TABS.some(t => t[0] === name) && !['program', 'profiles', 'welcome'].includes(name)) view = 'today';
  if (view === 'profiles' || view === 'welcome') showNav = false;

  const keepScroll = lastRoute === key;
  const y = window.scrollY;
  root.replaceChildren();
  document.title = 'FitLog';
  switch (view) {
    case 'today': viewToday(root); break;
    case 'lifts': viewLifts(root); break;
    case 'food': viewFood(root); break;
    case 'progress': viewProgress(root); break;
    case 'settings': viewSettings(root); break;
    case 'program': rest[0] != null && rest[0] !== '' ? viewProgramDay(root, Number(rest[0])) : viewProgramList(root); break;
    case 'profiles': viewProfiles(root); break;
    case 'lock': viewLock(root); break;
    default: viewWelcome(root);
  }
  nav.hidden = !showNav;
  nav.replaceChildren(...TABS.map(([id, label, ic]) => h('a', { href: '#/' + id, class: (view === id || (view === 'program' && id === 'settings')) ? 'on' : '', 'aria-current': view === id ? 'page' : null }, icon(ic), h('span', null, label))));
  document.body.classList.toggle('has-nav', showNav);
  window.scrollTo(0, keepScroll ? y : 0);
  lastRoute = key;
}

function idleForRerender() {
  const a = document.activeElement;
  return !document.querySelector('.sheet-bg') && !(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName));
}

window.addEventListener('hashchange', render);
window.addEventListener('fitlog:data', () => { if (idleForRerender()) render(); });
window.addEventListener('online', () => scheduleSync(300));
window.addEventListener('offline', () => setStatus('offline'));
let loadedDay = today();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); return; }
  if (today() !== loadedDay) { if (ui.date === loadedDay) ui.date = today(); loadedDay = today(); render(); }
  scheduleSync(300);
});
window.addEventListener('pagehide', save);
setInterval(() => { if (!document.hidden && syncConfigured()) scheduleSync(0); }, 5 * 60 * 1000);

render();
if (syncConfigured()) scheduleSync(400);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('sw', e));
}
