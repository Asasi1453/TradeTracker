<script>
/* ============================================================
   WIRING
   ============================================================ */
function renderAccounts() {
  const sel = $('#accSel');
  sel.innerHTML = Store.settings.accounts.map(a =>
    '<option value="' + esc(a.id) + '"' + (a.id === Store.settings.active ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('');
}

let scrollTop = false;
function render() {
  if (!App.cal) {
    const list = Store.scoped();
    const n = list.length ? (dt(list[list.length - 1].exitAt || list[list.length - 1].entryAt) || new Date()) : new Date();
    App.cal = { y: n.getFullYear(), m: n.getMonth() };
  }
  const keepY = window.scrollY;
  $$('#tabs .tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === App.view)));
  $('#demoBanner').hidden = !Store.demo;
  const host = $('#view');
  CHART_Q.length = 0;
  try { host.innerHTML = (VIEWS[App.view] || viewDashboard)(); }
  catch (e) {
    host.innerHTML = '<div class="panel panel-pad"><div class="empty"><h3>' + tx('Something went wrong drawing this view') + '</h3><p>' + esc(e.message) + '</p></div></div>';
    console.error(e);
  }
  paintCharts(host);
  wireCharts(host);
  wireView();
  if (scrollTop) { window.scrollTo(0, 0); scrollTop = false; } else { window.scrollTo(0, keepY); }
}

function go(view) { App.view = view; scrollTop = true; render(); }

/* ---------- one delegated listener, bound once ---------- */
$('#view').addEventListener('click', e => {
  const goBtn = e.target.closest('[data-go]');
  if (goBtn) { go(goBtn.dataset.go); return; }
  const dashTab = e.target.closest('[data-dashtab]');
  if (dashTab) { App.dashTab = dashTab.dataset.dashtab; scrollTop = true; render(); return; }
  const cal = e.target.closest('[data-cal]');
  if (cal) {
    const d = new Date(App.cal.y, App.cal.m + Number(cal.dataset.cal), 1);
    App.cal = { y: d.getFullYear(), m: d.getMonth() }; render(); return;
  }
  const act = e.target.closest('[data-act]');
  if (act) { handleAct(act.dataset.act, act.dataset.id); return; }
});

function wireView() {
  if (App.view === 'new') wireForm();
  if (App.view === 'history') wireHistory();
  if (App.view === 'edge') wireEdge();
  if (App.view === 'risk') wireRisk();
  if (App.view === 'review') wireReview();
  if (App.view === 'settings') wireSettings();
}

async function handleAct(act, id) {
  if (act === 'edit') { App.editingId = id; go('new'); return; }
  if (act === 'review') { App.reviewId = id; go('review'); return; }
  if (act === 'del') {
    const t = Store.trades.find(x => x.id === id);
    const ok = await confirmBox(tx('Delete this trade?'),
      (t ? tx('{sym} on {d}, {pnl}.', { sym: esc(t.symbol), d: dshort(t.entryAt), pnl: signed(t.pnl) }) + ' ' : '') + tx('This cannot be undone.'), tx('Delete'));
    if (!ok) return;
    await Store.deleteTrade(id); toast(tx('Trade deleted')); render();
  }
}

/* ---------- trade form ---------- */
function wireForm() {
  const f = $('#tradeForm'); if (!f) return;
  const g = n => f.querySelector('[name="' + n + '"]');
  const spec = () => SYMBOL_TYPES.find(s => s.id === g('symbolType').value) || SYMBOL_TYPES[0];

  const live = () => {
    const risk = Number(g('risk').value) || 0, pnl = Number(g('pnl').value) || 0;
    const r = risk > 0 ? pnl / risk : 0;
    $('#formLive').innerHTML = risk > 0
      ? tx('This trade is {r} — {pnl} on {risk} risked.', {
          r: '<strong class="' + cls(r) + '">' + rfmt(r) + '</strong>', pnl: money(pnl), risk: money(risk, 0) })
      : tx('Enter what you risked to see the R-multiple.');
    $('#sizeHint').textContent = tx('In {unit} · 1 {one} = {mult} units', {
      unit: tx(spec().unit), one: tx(spec().unit).replace(/s$/, ''), mult: spec().mult.toLocaleString() });
  };
  f.addEventListener('input', live); live();

  $('#autoRisk').onclick = () => {
    const d = Math.abs(Number(g('entry').value) - Number(g('stop').value));
    const size = Number(g('size').value) || 0;
    if (!d || !size) { toast(tx('Needs entry, stop and size first')); return; }
    g('risk').value = +(d * size * spec().mult).toFixed(2); live();
  };
  $('#autoPnl').onclick = () => {
    const entry = Number(g('entry').value), exit = Number(g('exit').value), size = Number(g('size').value) || 0;
    if (!entry || !exit || !size) { toast(tx('Needs entry, exit and size first')); return; }
    const dir = g('direction').value === 'long' ? 1 : -1;
    g('pnl').value = +((exit - entry) * dir * size * spec().mult).toFixed(2); live();
  };
  const cancel = $('#cancelEdit');
  if (cancel) cancel.onclick = () => { App.editingId = null; render(); };

  f.addEventListener('submit', async e => {
    e.preventDefault();
    const base = App.editingId ? Store.trades.find(x => x.id === App.editingId) : null;
    const pnl = Number(g('pnl').value) || 0;
    const rec = normalizeTrade(Object.assign({}, base, {
      id: base ? base.id : uid(),
      symbol: g('symbol').value.trim().toUpperCase(),
      symbolType: g('symbolType').value,
      direction: g('direction').value,
      account: g('account').value,
      entryAt: g('entryAt').value,
      exitAt: g('exitAt').value || g('entryAt').value,
      entry: g('entry').value, stop: g('stop').value, target: g('target').value, exit: g('exit').value,
      size: g('size').value, risk: g('risk').value, pnl: pnl,
      outcome: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be',
      setup: g('setup').value.trim(),
      tags: g('tags').value.split(',').map(s => s.trim()).filter(Boolean),
      maeR: g('maeR').value === '' ? null : Number(g('maeR').value),
      mfeR: g('mfeR').value === '' ? null : Number(g('mfeR').value),
      quality: Number(g('quality').value),
      planned: g('planned').checked,
      context: g('context').value, emotion: g('emotion').value,
      adherence: ADHERENCE_KEYS.reduce((o, [k]) => { o[k] = f.querySelector('[name="adh_' + k + '"]').checked; return o; }, {})
    }));
    await Store.saveTrade(rec);
    const edited = !!App.editingId;
    App.editingId = null;
    // Learn new setups as they are used
    if (rec.setup && Store.settings.setups.indexOf(rec.setup) < 0) {
      Store.settings.setups.push(rec.setup); Store.saveSettings();
    }
    if (rec.account !== Store.settings.active) { Store.settings.active = rec.account; Store.saveSettings(); renderAccounts(); }
    toast(edited ? tx('Trade updated') : tx('Trade logged — {r}', { r: rfmt(R(rec)) }));
    App.reviewId = rec.id;
    go(edited ? 'history' : 'dashboard');
  });
}

/* ---------- history ---------- */
function wireHistory() {
  $$('[data-filter]').forEach(el => {
    const ev = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      App.filters[el.dataset.filter] = el.value;
      const keep = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.filter : null;
      render();
      if (keep) { const n = $('[data-filter="' + keep + '"]'); if (n) { n.focus(); if (n.setSelectionRange && n.type === 'text') n.setSelectionRange(n.value.length, n.value.length); } }
    });
  });
  const c = $('#clearFilters');
  if (c) c.onclick = () => { App.filters = { symbolType: '', direction: '', setup: '', perf: '', from: '', to: '', q: '' }; render(); };
}

/* ---------- edge lab ---------- */
function wireEdge() {
  const run = $('#mcRun'); if (!run) return;
  run.onclick = () => {
    App.mc.riskPct = clamp(Number($('#mcRisk').value) || 1, 0.1, 10);
    App.mc.horizon = clamp(Math.round(Number($('#mcHorizon').value) || 100), 20, 500);
    App.mc.ruin = clamp(Math.round(Number($('#mcRuin').value) || 30), 5, 90);
    const trades = Store.scoped(), acc = Store.account();
    const m = metrics(trades, acc);
    run.disabled = true; run.textContent = tx('Running…');
    setTimeout(() => {
      App.mc.result = monteCarlo(m.rs, {
        paths: App.mc.paths, horizon: App.mc.horizon, riskPct: App.mc.riskPct,
        start: m.equity || acc.start, ruinPct: App.mc.ruin
      });
      render();
    }, 30);
  };
}

/* ---------- risk sizer: recompute in place so typing is never interrupted ---------- */
function wireRisk() {
  const out = $('#szOut'); if (!out) return;
  const refresh = () => {
    const d = App.sizer;
    const spec = SYMBOL_TYPES.find(x => x.id === d.type) || SYMBOL_TYPES[0];
    const res = sizePosition(d);
    out.innerHTML = sizerOut(d, res, spec);
    const hint = $('#szMult');
    if (hint) hint.textContent = 'Sets the contract size (' + res.mult.toLocaleString() + ' per ' + spec.unit.replace(/s$/, '') + ')';
  };
  $$('[data-sz]').forEach(el => {
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      App.sizer[el.dataset.sz] = el.value;
      refresh();
    });
  });
}

/* ---------- review ---------- */
function wireReview() {
  const pick = $('#reviewPick');
  if (pick) pick.onchange = () => { App.reviewId = pick.value; render(); };

  // Images live in IndexedDB, so the view renders a frame and fills it here.
  $$('[data-shot-load]').forEach(async box => {
    const key = box.dataset.shotLoad;
    const data = await Shots.get(key);
    if (!data) { box.innerHTML = '<div class="shot-missing">' + tx('Screenshot could not be read back') + '</div>'; return; }
    const img = new Image();
    img.alt = box.dataset.shotAlt || 'Chart';
    img.className = 'shot-img';
    img.src = data;
    box.innerHTML = '';
    box.appendChild(img);
  });

  $$('[data-shot]').forEach(inp => {
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      try {
        const data = await compressImage(file, 1100, 110000);
        const t = Store.trades.find(x => x.id === App.reviewId);
        const ok = await Shots.put(t.id + ':' + inp.dataset.shot, data);
        if (!ok) { toast(tx('This browser would not store the image')); return; }
        t.shots = Object.assign({}, t.shots);
        t.shots[inp.dataset.shot] = true;
        await Store.saveTrade(t);
        toast(tx('Screenshot added'));
        render();
      } catch (e) { toast(tx('Could not read that image')); }
    });
  });

  $$('[data-shot-del]').forEach(b => b.onclick = async () => {
    const t = Store.trades.find(x => x.id === App.reviewId);
    await Shots.del(t.id + ':' + b.dataset.shotDel);
    t.shots = Object.assign({}, t.shots);
    t.shots[b.dataset.shotDel] = false;
    await Store.saveTrade(t);
    render();
  });

  const f = $('#reviewForm');
  if (f) f.addEventListener('submit', async e => {
    e.preventDefault();
    const t = Object.assign({}, Store.trades.find(x => x.id === App.reviewId));
    $$('[data-rv]').forEach(el => { t[el.dataset.rv] = el.value; });
    await Store.saveTrade(t);
    $('#revSaved').textContent = tx('Saved just now');
    toast(tx('Review saved'));
  });
}

function compressImage(file, maxW, maxBytes) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        let q = 0.78, out = c.toDataURL('image/jpeg', q);
        while (out.length > maxBytes && q > 0.32) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
        res(out);
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ---------- settings ---------- */
function wireSettings() {
  $$('[data-af]').forEach(el => el.addEventListener('change', () => {
    const id = el.closest('tr').dataset.acc;
    const a = Store.settings.accounts.find(x => x.id === id); if (!a) return;
    a[el.dataset.af] = el.dataset.af === 'name' ? el.value : Number(el.value) || 0;
    Store.saveSettings(); renderAccounts(); toast(tx('Account updated'));
  }));
  $$('[data-accdel]').forEach(b => b.onclick = async () => {
    const id = b.dataset.accdel;
    const n = Store.trades.filter(t => t.account === id).length;
    const ok = await confirmBox(tx('Remove this account?'),
      n ? tx('{n} trades belong to it and will be removed too.', { n: n }) : tx('It holds no trades.'), tx('Remove'));
    if (!ok) return;
    Store.settings.accounts = Store.settings.accounts.filter(a => a.id !== id);
    if (Store.settings.active === id) Store.settings.active = Store.settings.accounts[0].id;
    await Promise.all(Store.trades.filter(t => t.account === id).map(t => Store.deleteTrade(t.id)));
    await Store.saveSettings(); renderAccounts(); render();
  });
  const add = $('#addAcc');
  if (add) add.onclick = () => {
    const id = 'a' + Date.now().toString(36);
    Store.settings.accounts.push({ id, name: tx('New account'), start: 10000, savings: 0, goal: 100000 });
    Store.saveSettings(); renderAccounts(); render();
  };
  $$('[data-st]').forEach(el => el.addEventListener('change', () => {
    const k = el.dataset.st;
    Store.settings[k] = k === 'setups' ? el.value.split(',').map(s => s.trim()).filter(Boolean) : Number(el.value) || 0;
    Store.saveSettings(); toast(tx('Rules updated'));
  }));
  const bind = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
  bind('btnExport2', exportJson);
  bind('btnImport2', () => $('#fileIn').click());
  bind('btnExportCsv', exportCsv);
  bind('btnWipe', async () => {
    const ok = await confirmBox(tx('Delete every trade?'),
      tx('All {n} trades and their screenshots will be removed from this browser. Nothing else has a copy — export a backup first if you might want them.',
        { n: Store.trades.length }), tx('Delete everything'));
    if (!ok) return;
    await Store.clearAll();
    toast(tx('All trades deleted')); render();
  });
}

/* ============================================================
   BACKUP — the only way trades move between machines, so the
   file carries everything and says so if it arrives damaged.
   ============================================================ */
async function buildBackup() {
  const screenshots = await Shots.dump();
  const body = backupBody(Store.settings, Store.trades, screenshots);
  return Object.assign({
    app: 'tradetracker',
    format: 2,
    exportedAt: new Date().toISOString(),
    counts: { trades: Store.trades.length, screenshots: Object.keys(screenshots).length },
    checksum: hash32(JSON.stringify(body))
  }, body);
}

/** Hand the file to the viewer. Three routes: some embedding hosts expose a
 *  save API and block anchor downloads, so try that first and fall back. */
async function deliver(filename, text) {
  let dl = null;
  try { dl = await window.claude?.use('downloads'); } catch (e) { dl = null; }  // host save API, when present
  if (dl) {
    try { await dl.save({ filename, data: text }); toast(tx('Saved {f}', { f: filename })); return true; }
    catch (e) { if (e && e.code === 'cancelled') return false; }
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(tx('Saved {f}', { f: filename }));
    return true;
  } catch (e) { /* fall through */ }
  try { await navigator.clipboard.writeText(text); toast(tx('Download blocked here — copied to your clipboard instead')); return true; }
  catch (e) { toast(tx('Could not export from this view')); return false; }
}

async function exportJson() {
  const payload = await buildBackup();
  const ok = await deliver('tradetracker-' + dkey(new Date()) + '.json', JSON.stringify(payload, null, 2));
  if (ok) {
    Store.meta.lastExport = Date.now();
    Store.meta.changes = 0;
    Store.persist();
    if (App.view === 'settings') render();
  }
}

async function exportCsv() {
  const cols = ['entryAt', 'exitAt', 'account', 'symbol', 'symbolType', 'direction', 'entry', 'stop',
    'target', 'exit', 'size', 'risk', 'pnl', 'setup', 'maeR', 'mfeR', 'quality', 'emotion', 'planned', 'lesson'];
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [cols.concat(['R']).join(',')].concat(
    Store.trades.map(t => cols.map(c => q(t[c])).concat([R(t).toFixed(3)]).join(','))
  );
  await deliver('tradetracker-' + dkey(new Date()) + '.csv', rows.join('\n'));
}

function importJson(file) {
  const fr = new FileReader();
  fr.onerror = () => toast(tx('That file could not be read'));
  fr.onload = async () => {
    let d;
    try { d = JSON.parse(fr.result); } catch (e) { toast(tx('That is not a valid backup — the JSON is malformed')); return; }
    if (!d || d.app !== 'tradetracker' || !Array.isArray(d.trades)) {
      toast(tx('That file is not a TradeTracker backup')); return;
    }

    // Format 1 kept screenshots inline on each trade; format 2 keeps them apart.
    const screenshots = Object.assign({}, liftLegacyShots(d.trades), d.screenshots || {});
    const rawTrades = d.trades;
    const incoming = rawTrades.map(normalizeTrade);
    Object.keys(screenshots).forEach(k => {
      const id = k.slice(0, k.lastIndexOf(':')), slot = k.slice(k.lastIndexOf(':') + 1);
      const t = incoming.find(x => x.id === id);
      if (t && (slot === 'pre' || slot === 'post')) t.shots[slot] = true;
    });

    let warn = '';
    if (d.checksum) {
      const check = hash32(JSON.stringify(backupBody(d.settings, rawTrades, d.screenshots || {})));
      if (check !== d.checksum) warn = '<br><br>' + tx('Heads up: the checksum does not match, so this file was edited or truncated after it was written. It will still import — check the trade count afterwards.');
    }

    const known = new Set(Store.trades.map(t => t.id));
    const overlap = incoming.filter(t => known.has(t.id)).length;
    const body = tx('{n} trades and {s} screenshots, exported {d}.', {
        n: '<strong>' + incoming.length + '</strong>', s: Object.keys(screenshots).length,
        d: d.exportedAt ? dlong(d.exportedAt) : tx('at an unknown date') }) + '<br><br>' +
      '<strong>' + tx('Replace') + '</strong> ' +
      tx('Replace makes this browser identical to the file — your current {n} trades are removed first. That is what you want on a second machine.',
        { n: Store.trades.length }).replace(/^Replace /, '') + '<br>' +
      '<strong>' + tx('Merge') + '</strong> ' +
      tx('Merge keeps what is here and adds the file on top').replace(/^Merge /, '') +
      (overlap ? tx(', overwriting the {n} trades that appear in both', { n: overlap }) : '') + '.' + warn;

    const choice = await chooseBox(tx('Import this backup?'), body, [
      { key: 'cancel', label: tx('Cancel') },
      { key: 'merge', label: tx('Merge') },
      { key: 'replace', label: tx('Replace everything'), primary: true }
    ]);
    if (!choice || choice === 'cancel') return;

    if (choice === 'replace') {
      Store.trades = incoming;
      if (d.settings) Store.settings = Object.assign(defaultSettings(), d.settings);
      await Shots.restore(screenshots, true);
    } else {
      const map = new Map(Store.trades.map(t => [t.id, t]));
      incoming.forEach(t => map.set(t.id, t));
      Store.trades = Array.from(map.values());
      if (d.settings) {
        const setups = new Set((Store.settings.setups || []).concat(d.settings.setups || []));
        const accounts = Store.settings.accounts.slice();
        (d.settings.accounts || []).forEach(a => { if (!accounts.some(x => x.id === a.id)) accounts.push(a); });
        Store.settings = Object.assign(defaultSettings(), d.settings, { setups: Array.from(setups), accounts: accounts });
      }
      await Shots.restore(screenshots, false);
    }

    Store.demo = false;
    if (!Store.settings.accounts.some(a => a.id === Store.settings.active)) {
      Store.settings.active = Store.settings.accounts[0].id;
    }
    Store.meta.changes++;
    const ok = Store.persist();
    App.cal = null; App.sizer = null; App.reviewId = null; App.mc.result = null;
    renderAccounts();
    render();
    toast(ok ? tx('Imported {n} trades', { n: incoming.length }) : tx('Imported, but this browser refused to save them'));
  };
  fr.readAsText(file);
}

/* ============================================================
   BOOT
   ============================================================ */
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b) return;
  if (b.dataset.view !== 'new') App.editingId = null;
  go(b.dataset.view);
});
$('#accSel').addEventListener('change', e => {
  Store.settings.active = e.target.value; Store.saveSettings();
  App.mc.result = null; App.sizer = null; App.cal = null; App.reviewId = null; render();
});
$('#btnQuickAdd').onclick = () => { App.editingId = null; go('new'); };
$('#btnExport').onclick = exportJson;
$('#btnImport').onclick = () => $('#fileIn').click();
$('#fileIn').addEventListener('change', e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });
$('#btnClearDemo').onclick = () => Store.clearDemo();
$('#modalBg').addEventListener('click', e => { if (e.target === $('#modalBg') && chooseBox._close) chooseBox._close(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modalBg').hidden && chooseBox._close) chooseBox._close();
});

/** Switch language: persist it, retranslate the static chrome, re-render. */
function setLang(code) {
  LANG = (code === 'tr') ? 'tr' : 'en';
  Store.settings.lang = LANG;
  Store.saveSettings();
  $$('.langbtn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
  applyStaticLang();
  if (Store.demo) Store.trades = demoTrades();   // sample notes follow the language
  badge(
    Store.lsOk ? tx('Saved locally') : tx('Not saved'),
    Store.lsOk ? tx('Trades live in this browser. Export a backup to move them to another machine.')
               : tx('This browser will not let a page opened straight from disk store anything. Serve the folder over http, or nothing survives a reload.')
  );
  render();
}
$$('.langbtn').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
$('#view').addEventListener('change', e => {
  const sel = e.target.closest('[data-lang-select]');
  if (sel) setLang(sel.value);
});

Store.probe();
Store.load();
LANG = (Store.settings.lang === 'tr') ? 'tr' : 'en';
$$('.langbtn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
applyStaticLang();
if (!Store.trades.length) { Store.trades = demoTrades(); Store.demo = true; }
badge(
  Store.lsOk ? tx('Saved locally') : tx('Not saved'),
  Store.lsOk
    ? tx('Trades live in this browser. Export a backup to move them to another machine.')
    : tx('This browser will not let a page opened straight from disk store anything. Serve the folder over http, or nothing survives a reload.')
);
renderAccounts();
render();
Shots.open();
</script>
