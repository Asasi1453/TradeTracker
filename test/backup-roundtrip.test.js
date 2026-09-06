/* TradeTracker — proves a backup restores a journal exactly on a second machine.
 *
 *   npm i -D playwright && npx playwright install chromium
 *   node test/backup-roundtrip.test.js
 *
 * It drives dist/tradetracker.html in two separate browser profiles: logs a trade
 * and a screenshot in the first, exports it, then imports into the second and
 * compares ids, numbers and image bytes.
 */
const { chromium } = require('playwright');
const path = require('path');
const P = 'file://' + path.join(__dirname, '..', 'dist', 'tradetracker.html');
const say = (ok, m) => { console.log((ok?'PASS  ':'FAIL  ')+m); if(!ok) process.exitCode = 1; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:1440,height:1000} });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('ERR ' + e.message));
  await p.goto(P); await p.waitForTimeout(900);

  say(await p.textContent('#syncBadge') === 'Saved locally', 'badge reads "Saved locally" on a local file');

  // --- log a real trade through the form ---
  await p.click('.tab[data-view="new"]'); await p.waitForTimeout(300);
  await p.fill('#f_symbol','XAUUSD'); await p.selectOption('#f_type','XAU');
  await p.fill('#f_entry','3800'); await p.fill('#f_stop','3780'); await p.fill('#f_target','3860');
  await p.fill('#f_exit','3855'); await p.fill('#f_size','0.25');
  await p.click('#autoRisk'); await p.click('#autoPnl');
  await p.fill('#f_setup','FVG'); await p.fill('#f_mae','0.4'); await p.fill('#f_mfe','3.1');
  await p.click('#tradeForm button[type=submit]'); await p.waitForTimeout(600);

  const st1 = await p.evaluate(() => ({ n: Store.trades.length, demo: Store.demo, risk: Store.trades[0].risk, pnl: Store.trades[0].pnl, id: Store.trades[0].id }));
  say(st1.n === 1 && !st1.demo, 'first real trade clears the 26 samples (n=' + st1.n + ')');
  say(st1.risk === 500 && st1.pnl === 1375, 'auto risk/pnl from gold contract size: risk=' + st1.risk + ' pnl=' + st1.pnl);

  // --- attach a screenshot straight into IndexedDB, as the UI would ---
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 40; c.height = 20;
    const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0,0,40,20);
    const data = c.toDataURL('image/jpeg', 0.8);
    const t = Store.trades[0];
    await Shots.put(t.id + ':pre', data);
    t.shots = { pre: true, post: false };
    await Store.saveTrade(t);
    window.__shot = data;
  });

  // --- what localStorage actually holds ---
  const raw = await p.evaluate(() => ({
    keys: Object.keys(localStorage).filter(k => k.startsWith('tradetracker')).sort(),
    bytes: (localStorage.getItem('tradetracker.trades.v1')||'').length,
    hasDataUrl: (localStorage.getItem('tradetracker.trades.v1')||'').indexOf('data:image') >= 0
  }));
  say(raw.keys.join(',') === 'tradetracker.meta.v1,tradetracker.settings.v1,tradetracker.trades.v1', 'localStorage keys: ' + raw.keys.join(', '));
  say(!raw.hasDataUrl, 'the image is NOT in localStorage (' + raw.bytes + ' bytes for 1 trade)');

  // --- survives a reload ---
  await p.reload(); await p.waitForTimeout(900);
  const after = await p.evaluate(() => ({ n: Store.trades.length, demo: Store.demo, shot: Store.trades[0].shots.pre }));
  say(after.n === 1 && !after.demo && after.shot === true, 'reload restores the trade and its screenshot flag');

  // --- export ---
  const backup = await p.evaluate(async () => JSON.stringify(await buildBackup()));
  const parsed = JSON.parse(backup);
  say(parsed.app === 'tradetracker' && parsed.format === 2, 'backup is app=tradetracker format=2');
  say(parsed.counts.trades === 1 && parsed.counts.screenshots === 1, 'backup counts: ' + JSON.stringify(parsed.counts));
  say(Object.values(parsed.screenshots)[0].startsWith('data:image/jpeg'), 'backup carries the screenshot inline');
  say(typeof parsed.checksum === 'string' && parsed.checksum.length === 8, 'backup has a checksum: ' + parsed.checksum);

  // ================= SECOND MACHINE =================
  const ctx2 = await b.newContext({ viewport:{width:1440,height:1000} });   // fresh profile = clean localStorage + IndexedDB
  const q = ctx2.pages()[0] || await ctx2.newPage();
  const errs2 = []; q.on('pageerror', e => errs2.push('ERR2 ' + e.message));
  await q.goto(P); await q.waitForTimeout(900);
  const fresh = await q.evaluate(() => ({ n: Store.trades.length, demo: Store.demo }));
  say(fresh.demo === true, 'second machine starts on sample data (n=' + fresh.n + ')');

  await q.click('.tab[data-view="settings"]'); await q.waitForTimeout(300);
  await q.evaluate(text => {
    const f = new File([text], 'tradetracker.json', { type: 'application/json' });
    importJson(f);
  }, backup);
  await q.waitForTimeout(500);
  const dialog = (await q.textContent('#modalBody')).replace(/\s+/g,' ');
  say(/1 trades and 1 screenshots/.test(dialog) && /Replace/.test(dialog),
      'import dialog states what is in the file: "' + dialog.slice(0,58) + '…"');
  await q.click('#modalActions [data-key="replace"]');
  await q.waitForTimeout(800);

  const imported = await q.evaluate(async () => {
    const t = Store.trades[0];
    const img = await Shots.get(t.id + ':pre');
    return { n: Store.trades.length, demo: Store.demo, id: t.id, symbol: t.symbol, risk: t.risk,
             pnl: t.pnl, mfe: t.mfeR, setup: t.setup, shotFlag: t.shots.pre, shot: img,
             accounts: Store.settings.accounts.length, riskPct: Store.settings.riskPct };
  });
  say(imported.n === 1 && !imported.demo, 'replace wiped the samples and installed the file');
  say(imported.id === st1.id, 'trade id survives the trip: ' + imported.id);
  say(imported.symbol === 'XAUUSD' && imported.risk === 500 && imported.pnl === 1375 && imported.mfe === 3.1,
      'numbers are identical: ' + imported.symbol + ' risk=' + imported.risk + ' pnl=' + imported.pnl + ' mfe=' + imported.mfe);
  const orig = JSON.parse(backup).screenshots[st1.id + ':pre'];
  say(imported.shotFlag === true && imported.shot === orig, 'screenshot bytes match the original exactly');

  // survives a reload on machine two
  await q.reload(); await q.waitForTimeout(900);
  const after2 = await q.evaluate(() => ({ n: Store.trades.length, demo: Store.demo, sym: Store.trades[0].symbol }));
  say(after2.n === 1 && !after2.demo && after2.sym === 'XAUUSD', 'machine two keeps it across a reload');

  // --- merge mode adds without destroying ---
  await q.evaluate(() => { App.view='settings'; render(); });
  await q.evaluate(text => {
    const d = JSON.parse(text);
    d.trades[0].id = 'other1'; d.trades[0].symbol = 'EURUSD'; d.screenshots = {};
    d.counts = { trades:1, screenshots:0 };
    importJson(new File([JSON.stringify(d)], 'b.json', { type:'application/json' }));
  }, backup);
  await q.waitForTimeout(400);
  await q.click('#modalActions [data-key="merge"]');
  await q.waitForTimeout(600);
  const merged = await q.evaluate(() => ({ n: Store.trades.length, syms: Store.trades.map(t=>t.symbol).sort().join(',') }));
  say(merged.n === 2 && merged.syms === 'EURUSD,XAUUSD', 'merge keeps both: ' + merged.syms);

  // --- a damaged file is called out, not silently accepted ---
  await q.evaluate(text => {
    const d = JSON.parse(text); d.trades[0].pnl = 99999;
    importJson(new File([JSON.stringify(d)], 'c.json', { type:'application/json' }));
  }, backup);
  await q.waitForTimeout(400);
  const warned = /checksum does not match/.test(await q.textContent('#modalBody'));
  say(warned, 'an edited backup triggers the checksum warning');
  await q.click('#modalActions [data-key="cancel"]');

  // --- a foreign file is rejected ---
  await q.evaluate(() => importJson(new File(['{"app":"something-else","trades":[]}'], 'x.json', {type:'application/json'})));
  await q.waitForTimeout(400);
  say(await q.evaluate(() => $('#modalBg').hidden), 'a non-Edge-Ledger file never reaches the dialog');

  console.log(errs.concat(errs2).join('\n') || 'no page errors');
  await b.close();
})();
