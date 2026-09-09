/* Smoke test: render dist/index.html in jsdom, assert key content exists, no NaN/undefined leaks */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
const html = fs.readFileSync(file, 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.test/',
  beforeParse(window) {
    window.matchMedia =
      window.matchMedia ||
      function () {
        return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} };
      };
    window.scrollTo = () => {};
    window.addEventListener('error', (e) => errors.push('window.error: ' + e.message));
  },
});

const { window } = dom;
const doc = window.document;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const fail = (m) => { console.error('FAIL: ' + m); failed = true; };
const ok = (m) => console.log('ok  : ' + m);
const click = async (el) => {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(320);
};
const tabByName = (name) => [...doc.querySelectorAll('.tab')].find((t) => t.textContent.includes(name));

(async () => {
  await wait(500);
  const root = doc.getElementById('root');
  if (!root || root.textContent.length < 500) return fail('root not rendered');

  ok(`tabs: ${[...doc.querySelectorAll('.tab')].map((t) => t.textContent.trim()).join(' | ')}`);

  // text leak check — only rendered #root content (inline <script> sits in body, skip it)
  const rt = doc.querySelector('#root').textContent || '';
  const leaked = rt.match(/(undefined|NaN|\bInfinity\b)/);
  if (leaked) fail('leak in rendered content: ' + leaked[0]);
  else ok('no undefined/NaN/Infinity leaked into rendered content');

  // ---- upcoming (default) ----
  const upRows = doc.querySelectorAll('.row').length;
  const upLinks = [...doc.querySelectorAll('#root a[href]')].filter((a) => /^https?:/.test(a.getAttribute('href') || '')).length;
  ok(`upcoming rows=${upRows}, https links=${upLinks}`);
  const noBroken = [...doc.querySelectorAll('#root a[href]')].filter((a) => !a.getAttribute('href')?.startsWith('https://')).length;
  if (noBroken) fail(`${noBroken} non-https links`);
  else ok('all links are https');

  // ---- archive + expand ----
  await click(tabByName('全年档案'));
  const aRows = doc.querySelectorAll('.row').length;
  ok(`archive rows=${aRows} (expect 78)`);
  const firstBtn = doc.querySelector('.row .row__btn');
  await click(firstBtn);
  const panels = doc.querySelectorAll('.detail__pad').length;
  const wins = doc.querySelectorAll('.win').length;
  if (panels === 0) fail('row did not expand (detail panels=0)');
  else ok(`expanded: panels=${panels}, winner rows=${wins}`);
  await click(firstBtn); // collapse

  // ---- winners: per-project rows with expandable detail ----
  await click(tabByName('获奖档案'));
  const wRows = doc.querySelectorAll('.wxp').length;
  ok(`winners rows=${wRows} (expect >=190)`);
  if (wRows < 190) fail('expected >=190 winner rows');
  const w0 = doc.querySelector('.wxp__btn');
  await click(w0);
  if (w0.getAttribute('aria-expanded') === 'true' && doc.querySelector('.wxp .wxp__cols')) {
    ok('winner detail expands on click');
  } else fail('winner detail did not expand');
  // regression guard: collapse animation must not depend only on a .row[data-open] ancestor
  const cssText = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('');
  if (cssText.includes('.wxp.is-open .detail') && cssText.includes('.wxp:not(.is-open) .detail')) {
    ok('css has .wxp open/close rules');
  } else fail('css missing .wxp open/close rules (detail would stay hidden)');
  const wLinks = [...doc.querySelectorAll('.wxp a[href]')].filter((a) => /^https?:/.test(a.getAttribute('href') || '')).length;
  ok(`winner links in view: ${wLinks}`);
  await click(w0); // collapse

  // ---- calendar: turn on estimates ----
  await click(tabByName('日历视图'));
  const cells = doc.querySelectorAll('.cal__cell').length;
  const ev0 = doc.querySelectorAll('.cal__ev').length;
  const dl0 = [...doc.querySelectorAll('.cal__ev')].filter((e) => e.dataset.k === 'deadline').length;
  const cb = doc.querySelector('.cal__toggle input');
  await click(cb);
  const ev1 = doc.querySelectorAll('.cal__ev').length;
  const est1 = [...doc.querySelectorAll('.cal__ev')].filter((e) => e.dataset.k === 'est').length;
  ok(`calendar: cells=${cells}, events(off)=${ev0} (deadline ${dl0}), events(on)=${ev1} (est ${est1})`);
  if (cells !== 42) fail('calendar should render 42 cells');
  if (dl0 < 5) fail('expected >=5 confirmed deadlines in range');

  // calendar est chip -> opens that hackathon's archive detail
  const estChip = [...doc.querySelectorAll('.cal__ev')].find((e) => e.dataset.k === 'est');
  if (estChip) {
    await click(estChip);
    for (let i = 0; i < 15 && !doc.querySelector('.row[data-open="true"]'); i++) await wait(100);
    const activeNow = (doc.querySelector('.tab[aria-selected="true"]') || {}).textContent || '';
    if (activeNow.includes('全年档案') && doc.querySelectorAll('.row[data-open="true"]').length === 1) {
      ok('calendar est chip navigates to archive detail');
    } else fail('calendar est chip did not open archive detail');
    await click(tabByName('日历视图')); // back
  } else fail('no est calendar chip to test');

  // ---- world map: type filter chips + city winners ----
  await click(tabByName('世界地图'));
  // poll until the world view actually renders (jsdom scheduling can lag on busy DOM)
  for (let i = 0; i < 15 && !doc.querySelector('.mchip'); i++) await wait(100);
  const dots = doc.querySelectorAll('.wmdot').length;
  const land = doc.querySelectorAll('.wmap__land').length;
  ok(`world map: dots=${dots}, landpaths=${land}`);
  if (dots < 15) fail('expected >=15 map dots');
  const mapChips = doc.querySelectorAll('.mchip').length;
  ok(`map type chips=${mapChips} (expect 8)`);
  const web3Chip = [...doc.querySelectorAll('.mchip')].find((c) => c.textContent.includes('Web3'));
  await click(web3Chip);
  const dotsAfter = doc.querySelectorAll('.wmdot').length;
  if (dotsAfter >= dots) fail('filtering to Web3 should reduce dots');
  else ok(`map filtered dots ${dots} -> ${dotsAfter}`);
  const selDot = doc.querySelector('.wmdot');
  await click(selDot);
  const cityWins = doc.querySelectorAll('.wm-panel .wxp').length;
  if (cityWins >= 1) ok(`city panel winners rows=${cityWins}`);
  else fail('city panel should list winners');
  await click([...doc.querySelectorAll('.mchip')].find((c) => c.textContent.trim().startsWith('全部')));

  // ---- year map chip -> archive detail ----
  await click(tabByName('参与地图'));
  const ym = doc.querySelectorAll('.ym').length;
  const chips = doc.querySelectorAll('.ymi').length;
  const ymTitles = doc.querySelectorAll('.ymi[title]').length;
  ok(`yearmap months=${ym}, chips=${chips}, hover titles=${ymTitles}`);
  const c0 = doc.querySelector('.ymi');
  await click(c0);
  for (let i = 0; i < 15 && !doc.querySelector('.row[data-open="true"]'); i++) await wait(100);
  const activeNow2 = (doc.querySelector('.tab[aria-selected="true"]') || {}).textContent || '';
  const openRows = doc.querySelectorAll('.row[data-open="true"]').length;
  const extLinks = [...doc.querySelectorAll('.row__ext')].filter((a) => /^https?:/.test(a.getAttribute('href') || '')).length;
  if (activeNow2.includes('全年档案') && openRows === 1 && extLinks >= 60) {
    ok(`yearmap chip opens archive detail (open rows=${openRows}, official links=${extLinks})`);
  } else fail('yearmap chip did not open archive detail');

  if (errors.length) console.log('js errors:', errors.slice(0, 4));
  console.log(failed || errors.length ? '\nSMOKE: FAILED' : '\nSMOKE: PASSED');
  process.exit(failed || errors.length ? 1 : 0);
})().catch((e) => { console.error('smoke crashed:', e); process.exit(1); });
