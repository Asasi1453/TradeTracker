<script>
/* ============================================================
   TradeTracker — a trading journal that scores the process,
   not just the P&L.
   ============================================================ */
"use strict";

/* ---------- small utilities ---------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = a => a.reduce((x, y) => x + y, 0);
const mean = a => (a.length ? sum(a) / a.length : 0);
const uid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(v, dp) {
  const n = Number(v) || 0;
  const d = dp == null ? (Math.abs(n) >= 1000 ? 0 : 2) : dp;
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function signed(v, dp) { const n = Number(v) || 0; return (n > 0 ? '+' : '') + money(n, dp); }
function rfmt(v) { const n = Number(v) || 0; return (n > 0 ? '+' : '') + n.toFixed(2) + 'R'; }
function pct(v, dp) { return (Number(v) || 0).toFixed(dp == null ? 1 : dp) + '%'; }
function cls(v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : 'mut'; }
function num(v, dp) { return (Number(v) || 0).toFixed(dp == null ? 2 : dp); }

function dt(s) { const d = new Date(s); return isNaN(d) ? null : d; }
function dkey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dshort(s) { const d = dt(s); return d ? monShort(d.getMonth()) + ' ' + d.getDate() : '—'; }
function dlong(s) { const d = dt(s); return d ? monShort(d.getMonth()) + ' ' + d.getDate() + ', ' + d.getFullYear() : '—'; }
function isoLocal(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2400);
}
/** One modal, any number of choices. Resolves the chosen key, or null on escape. */
function chooseBox(title, body, buttons) {
  return new Promise(res => {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = body;
    const host = $('#modalActions');
    host.innerHTML = buttons.map(b =>
      '<button class="btn' + (b.primary ? ' btn-primary' : b.danger ? ' btn-danger' : '') +
      '" data-key="' + esc(b.key) + '">' + esc(b.label) + '</button>').join('');
    $('#modalBg').hidden = false;
    const done = k => { $('#modalBg').hidden = true; host.onclick = null; chooseBox._close = null; res(k); };
    chooseBox._close = () => done(null);
    host.onclick = e => { const b = e.target.closest('[data-key]'); if (b) done(b.dataset.key); };
    const first = host.querySelector('.btn-primary') || host.querySelector('.btn');
    if (first) first.focus();
  });
}
function confirmBox(title, body, okLabel) {
  return chooseBox(title, body, [
    { key: 'cancel', label: 'Cancel' },
    { key: 'ok', label: okLabel || 'Confirm', primary: true }
  ]).then(k => k === 'ok');
}

/* ---------- domain constants ---------- */
const SYMBOL_TYPES = [
  { id: 'FX',  label: 'Forex',   mult: 100000, unit: 'lots',   step: 0.01 },
  { id: 'XAU', label: 'Gold / metals', mult: 100, unit: 'lots', step: 0.01 },
  { id: 'IDX', label: 'Index',   mult: 1,      unit: 'contracts', step: 0.1 },
  { id: 'STK', label: 'Stocks',  mult: 1,      unit: 'shares', step: 1 },
  { id: 'CRP', label: 'Crypto',  mult: 1,      unit: 'coins',  step: 0.0001 },
  { id: 'COM', label: 'Commodity', mult: 1,    unit: 'contracts', step: 0.1 }
];
const SESSIONS = [
  { id: 'asia',    label: 'Asia',     from: 0,  to: 7 },
  { id: 'london',  label: 'London',   from: 7,  to: 13 },
  { id: 'overlap', label: 'LDN/NY overlap', from: 13, to: 17 },
  { id: 'ny',      label: 'New York', from: 17, to: 21 },
  { id: 'late',    label: 'Late / thin', from: 21, to: 24 }
];
function sessionOf(hour) {
  for (const s of SESSIONS) if (hour >= s.from && hour < s.to) return s;
  return SESSIONS[0];
}
const EMOTIONS = ['calm', 'confident', 'excited', 'fearful', 'uncertain'];
/** Stored values stay English; only the display label is translated. */
const CONTEXT_LABEL = { bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral' };
const ADHERENCE_KEYS = [
  ['entry',  'Entry as planned'],
  ['stop',   'Stop where it belonged'],
  ['target', 'Target as planned'],
  ['sizing', 'Size within the rules'],
  ['rules',  'No rule broken']
];

/* ---------- defaults ---------- */
function defaultSettings() {
  return {
    accounts: [
      { id: 'fx',  name: 'FX',     start: 5000,  savings: 0, goal: 1000000 },
      { id: 'stk', name: 'Stocks', start: 10000, savings: 0, goal: 100000 }
    ],
    active: 'fx',
    setups: ['FVG', 'Market Structure', 'Order Block', 'Liquidity Sweep', 'Breakout', 'Range reversal'],
    riskPct: 1,
    dailyLossLimitR: 2,
    maxTradesPerDay: 3,
    revengeMinutes: 60,
    lang: 'en'
  };
}

function normalizeTrade(t) {
  const o = Object.assign({
    id: uid(), account: 'fx', symbol: '', symbolType: 'FX', direction: 'long',
    entryAt: '', exitAt: '', entry: 0, stop: 0, target: 0, exit: 0, size: 0,
    risk: 0, pnl: 0, outcome: 'win', setup: '', tags: [],
    maeR: null, mfeR: null, planned: true,
    context: 'neutral', emotion: 'calm', quality: 3,
    adherence: { entry: true, stop: true, target: true, sizing: true, rules: true },
    analysis: '', plan: '', setupNotes: '', execReview: '', reflection: '', lesson: '',
    shots: { pre: false, post: false }, createdAt: Date.now(), updatedAt: Date.now()
  }, t || {});
  const adh = Object.assign({ entry: true, stop: true, target: true, sizing: true, rules: true }, o.adherence || {});
  Object.keys(adh).forEach(k => { adh[k] = !!adh[k]; });
  o.adherence = adh;
  o.planned = !!o.planned;
  const sh = o.shots || {};
  o.shots = { pre: !!sh.pre, post: !!sh.post };
  o.tags = Array.isArray(o.tags) ? o.tags : [];
  ['entry', 'stop', 'target', 'exit', 'size', 'risk', 'pnl', 'quality'].forEach(k => { o[k] = Number(o[k]) || 0; });
  o.maeR = (o.maeR === null || o.maeR === '' || o.maeR === undefined) ? null : Number(o.maeR);
  o.mfeR = (o.mfeR === null || o.mfeR === '' || o.mfeR === undefined) ? null : Number(o.mfeR);
  return o;
}
/** R-multiple: what the trade returned as a multiple of what it risked. */
function R(t) { return t.risk > 0 ? t.pnl / t.risk : 0; }
/* ============================================================
   STORAGE

   localStorage is the single source of truth for trades and
   settings. Screenshots go to IndexedDB instead: two JPEGs a
   trade would exhaust the ~5 MB localStorage quota inside about
   twenty trades, and losing the whole journal to a full quota is
   not a trade worth making.

   A backup file carries both, so importing one on another machine
   restores the journal exactly — screenshots included.
   ============================================================ */
const LS_T = 'tradetracker.trades.v1';
const LS_S = 'tradetracker.settings.v1';
const LS_M = 'tradetracker.meta.v1';
const IDB_NAME = 'tradetracker', IDB_STORE = 'shots';

/** 32-bit FNV-1a. Not security — it catches a truncated or edited backup. */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
/** The exact shape a checksum is taken over, so export and import agree. */
function backupBody(settings, trades, screenshots) {
  return { settings: settings, trades: trades, screenshots: screenshots };
}

/** Screenshots, keyed `<tradeId>:pre` and `<tradeId>:post`. */
const Shots = {
  _db: null, _dead: false, cache: new Map(),

  async open() {
    if (this._db || this._dead) return this._db;
    try {
      this._db = await new Promise((res, rej) => {
        const rq = indexedDB.open(IDB_NAME, 1);
        rq.onupgradeneeded = () => {
          if (!rq.result.objectStoreNames.contains(IDB_STORE)) rq.result.createObjectStore(IDB_STORE);
        };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
        rq.onblocked = () => rej(new Error('blocked'));
      });
    } catch (e) { this._dead = true; this._db = null; }
    return this._db;
  },
  async _run(mode, fn) {
    const db = await this.open();
    if (!db) throw new Error('no indexeddb');
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, mode);
      const rq = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => res(rq ? rq.result : null);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  },
  async get(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    try {
      const v = await this._run('readonly', s => s.get(key));
      if (v) this.cache.set(key, v);
      return v || '';
    } catch (e) { return ''; }
  },
  async put(key, val) {
    this.cache.set(key, val);
    try { await this._run('readwrite', s => s.put(val, key)); return true; }
    catch (e) { return false; }
  },
  async del(key) {
    this.cache.delete(key);
    try { await this._run('readwrite', s => s.delete(key)); } catch (e) {}
  },
  /** Every screenshot in one object — what a backup carries. */
  async dump() {
    const db = await this.open();
    if (!db) return {};
    return new Promise(res => {
      const out = {};
      let tx;
      try { tx = db.transaction(IDB_STORE, 'readonly'); } catch (e) { return res(out); }
      const rq = tx.objectStore(IDB_STORE).openCursor();
      rq.onsuccess = () => { const c = rq.result; if (c) { out[c.key] = c.value; c.continue(); } };
      tx.oncomplete = () => res(out);
      tx.onerror = () => res(out);
    });
  },
  async clear() {
    this.cache.clear();
    try { await this._run('readwrite', s => s.clear()); } catch (e) {}
  },
  async restore(map, wipeFirst) {
    if (wipeFirst) await this.clear();
    const entries = Object.entries(map || {});
    for (const [k, v] of entries) if (typeof v === 'string' && v.slice(0, 5) === 'data:') await this.put(k, v);
    return entries.length;
  }
};

/** Backups written before screenshots moved to IndexedDB kept the image
 *  inline on the trade. Lift those out so an old file still imports whole. */
function liftLegacyShots(raw) {
  const out = {};
  (raw || []).forEach(t => {
    const s = t && t.shots;
    if (!s) return;
    ['pre', 'post'].forEach(k => {
      if (typeof s[k] === 'string' && s[k].slice(0, 5) === 'data:') out[t.id + ':' + k] = s[k];
    });
  });
  return out;
}

const Store = {
  trades: [], settings: defaultSettings(), demo: false,
  lsOk: true, meta: { lastExport: 0, changes: 0 },

  /** Opened straight off disk, some browsers refuse local storage outright.
   *  Find out at boot so the page can say so instead of losing work. */
  probe() {
    try {
      localStorage.setItem('tradetracker.probe', '1');
      localStorage.removeItem('tradetracker.probe');
      this.lsOk = true;
    } catch (e) { this.lsOk = false; }
    return this.lsOk;
  },

  load() {
    try {
      const t = JSON.parse(localStorage.getItem(LS_T) || 'null');
      const s = JSON.parse(localStorage.getItem(LS_S) || 'null');
      const m = JSON.parse(localStorage.getItem(LS_M) || 'null');
      if (Array.isArray(t)) {
        const legacy = liftLegacyShots(t);
        this.trades = t.map(normalizeTrade);
        if (Object.keys(legacy).length) Shots.restore(legacy, false).then(() => this.persist());
      }
      if (s) this.settings = Object.assign(defaultSettings(), s);
      if (m) this.meta = Object.assign({ lastExport: 0, changes: 0 }, m);
    } catch (e) { /* cleared or unreadable — start fresh */ }
  },

  /** Returns false when the browser refused the write, so callers can say so.
   *  Settings persist even in demo mode — the language switch is a setting, and
   *  it has to survive a reload before the first real trade is logged. Only the
   *  sample trades are held back. */
  persist() {
    try {
      if (!this.demo) localStorage.setItem(LS_T, JSON.stringify(this.trades));
      localStorage.setItem(LS_S, JSON.stringify(this.settings));
      localStorage.setItem(LS_M, JSON.stringify(this.meta));
      return true;
    } catch (e) {
      this.lsOk = false;
      badge(tx('Not saved'), tx('The last change could not be written to this browser'));
      toast(String(e && e.name) === 'QuotaExceededError'
        ? tx('Browser storage is full — export a backup, then delete some old trades.')
        : tx('This browser refused to save. Export a backup before you close the page.'));
      return false;
    }
  },

  async saveTrade(t) {
    const rec = normalizeTrade(t);
    rec.updatedAt = Date.now();
    if (this.demo) { this.trades = []; this.demo = false; $('#demoBanner').hidden = true; }
    const i = this.trades.findIndex(x => x.id === rec.id);
    if (i >= 0) this.trades[i] = rec; else this.trades.push(rec);
    this.meta.changes++;
    this.persist();
    return rec;
  },

  async deleteTrade(id) {
    this.trades = this.trades.filter(t => t.id !== id);
    this.meta.changes++;
    this.persist();
    await Shots.del(id + ':pre');
    await Shots.del(id + ':post');
  },

  saveSettings() { this.meta.changes++; this.persist(); },

  async clearAll() {
    this.trades = []; this.demo = false; this.meta.changes++;
    this.persist();
    await Shots.clear();
  },

  clearDemo() { this.demo = false; this.trades = []; $('#demoBanner').hidden = true; this.persist(); render(); },

  unsaved() { return Math.max(0, this.meta.changes); },

  account() { return this.settings.accounts.find(a => a.id === this.settings.active) || this.settings.accounts[0]; },
  scoped() {
    const a = this.account();
    if (!a) return [];
    return this.trades.filter(t => t.account === a.id).sort(byExit);
  }
};

function byExit(a, b) { return new Date(a.exitAt || a.entryAt) - new Date(b.exitAt || b.entryAt); }
function badge(text, title) { const el = $('#syncBadge'); el.textContent = text; el.title = title; }

/* ============================================================
   SAMPLE DATA — invented, never written to storage. It exists so
   the page opens showing what it does instead of an empty shell.
   ============================================================ */
function demoTrades() {
  const seed = [
    // [daysAgo, hour, symbol, type, dir, entry, stop, target, exit, size, risk, pnl, setup, mae, mfe, quality, emotion, planned, broke]
    [88, 9,  'XAUUSD', 'XAU', 'long',  3712, 3696, 3760, 3760, 3.1, 500,  1488, 'FVG', 0.55, 3.4, 5, 'calm', 1, 0],
    [86, 14, 'EURUSD', 'FX', 'short', 1.1642, 1.1672, 1.1572, 1.1672, 1.6, 480, -480, 'Market Structure', 1.0, 0.4, 3, 'confident', 1, 0],
    [83, 8,  'GBPUSD', 'FX', 'long',  1.3120, 1.3085, 1.3225, 1.3208, 1.4, 490, 1232, 'Liquidity Sweep', 0.42, 3.1, 4, 'calm', 1, 0],
    [80, 16, 'XAUUSD', 'XAU', 'short', 3806, 3822, 3752, 3822, 3.0, 480, -480, 'FVG', 1.0, 0.8, 2, 'excited', 0, 1],
    [79, 17, 'XAUUSD', 'XAU', 'short', 3798, 3814, 3746, 3814, 3.0, 480, -480, 'FVG', 1.0, 0.2, 1, 'fearful', 0, 1],
    [76, 10, 'EURUSD', 'FX', 'long',  1.1588, 1.1558, 1.1678, 1.1671, 1.6, 480, 1328, 'Order Block', 0.35, 3.4, 5, 'calm', 1, 0],
    [74, 13, 'AAPL',   'STK', 'long',  228.4, 223.8, 241.0, 239.6, 105, 483, 1176, 'Breakout', 0.5, 2.7, 4, 'confident', 1, 0],
    [71, 15, 'XAUUSD', 'XAU', 'long',  3744, 3728, 3792, 3728, 3.1, 496, -496, 'Market Structure', 1.0, 0.9, 3, 'uncertain', 1, 0],
    [68, 9,  'GBPUSD', 'FX', 'short', 1.3288, 1.3320, 1.3192, 1.3208, 1.5, 480, 1200, 'Market Structure', 0.6, 3.0, 4, 'calm', 1, 0],
    [66, 20, 'BTCUSD', 'CRP', 'long',  61250, 60100, 63900, 60100, 0.42, 483, -483, 'Range reversal', 1.0, 0.3, 2, 'excited', 0, 1],
    [63, 11, 'XAUUSD', 'XAU', 'long',  3688, 3672, 3736, 3742, 3.1, 496, 1674, 'FVG', 0.3, 3.5, 5, 'calm', 1, 0],
    [61, 14, 'EURUSD', 'FX', 'short', 1.1712, 1.1742, 1.1622, 1.1742, 1.6, 480, -480, 'FVG', 1.0, 0.6, 3, 'confident', 1, 0],
    [58, 8,  'USDJPY', 'FX', 'long',  151.20, 150.70, 152.70, 152.44, 0.9, 450, 1116, 'Order Block', 0.44, 3.0, 4, 'calm', 1, 0],
    [55, 16, 'XAUUSD', 'XAU', 'short', 3852, 3868, 3804, 3868, 3.0, 480, -480, 'Liquidity Sweep', 1.0, 1.1, 3, 'uncertain', 1, 0],
    [52, 10, 'GBPUSD', 'FX', 'long',  1.3042, 1.3010, 1.3138, 1.3121, 1.5, 480, 1185, 'FVG', 0.31, 3.2, 5, 'calm', 1, 0],
    [49, 19, 'NVDA',   'STK', 'short', 176.5, 181.0, 163.0, 181.0, 107, 481, -481, 'Breakout', 1.0, 0.5, 2, 'excited', 0, 1],
    [47, 12, 'XAUUSD', 'XAU', 'long',  3796, 3780, 3844, 3851, 3.1, 496, 1705, 'Market Structure', 0.25, 3.6, 5, 'confident', 1, 0],
    [44, 9,  'EURUSD', 'FX', 'long',  1.1502, 1.1472, 1.1592, 1.1561, 1.6, 480, 944, 'Order Block', 0.5, 2.4, 4, 'calm', 1, 0],
    [40, 15, 'XAUUSD', 'XAU', 'short', 3910, 3926, 3862, 3926, 3.0, 480, -480, 'FVG', 1.0, 0.7, 3, 'uncertain', 1, 0],
    [37, 11, 'GBPUSD', 'FX', 'short', 1.3186, 1.3218, 1.3090, 1.3105, 1.5, 480, 1215, 'Liquidity Sweep', 0.38, 3.1, 5, 'calm', 1, 0],
    [33, 14, 'XAUUSD', 'XAU', 'long',  3864, 3848, 3912, 3848, 3.1, 496, -496, 'FVG', 1.0, 0.85, 3, 'confident', 1, 0],
    [30, 22, 'BTCUSD', 'CRP', 'short', 67400, 68900, 63400, 68900, 0.32, 480, -480, 'Range reversal', 1.0, 0.4, 1, 'fearful', 0, 1],
    [26, 10, 'EURUSD', 'FX', 'long',  1.1618, 1.1588, 1.1708, 1.1699, 1.6, 480, 1296, 'Market Structure', 0.4, 3.2, 5, 'calm', 1, 0],
    [21, 16, 'XAUUSD', 'XAU', 'long',  3928, 3912, 3976, 3982, 3.1, 496, 1674, 'FVG', 0.2, 3.6, 5, 'calm', 1, 0],
    [14, 9,  'MSFT',   'STK', 'long',  418.2, 409.4, 440.0, 436.5, 55, 484, 1006, 'Breakout', 0.55, 2.5, 4, 'confident', 1, 0],
    [6,  13, 'GBPUSD', 'FX', 'long',  1.3216, 1.3184, 1.3312, 1.3184, 1.5, 480, -480, 'Order Block', 1.0, 0.6, 3, 'calm', 1, 0]
  ];
  const now = new Date();
  return seed.map((s, i) => {
    const e = new Date(now); e.setDate(e.getDate() - s[0]); e.setHours(s[1], (i * 7) % 60, 0, 0);
    const x = new Date(e); x.setHours(x.getHours() + 1 + (i % 5), (i * 13) % 60);
    const pnl = s[11];
    return normalizeTrade({
      id: 'demo' + i,
      account: s[3] === 'STK' || s[3] === 'CRP' ? 'stk' : 'fx',
      symbol: s[2], symbolType: s[3], direction: s[4],
      entryAt: isoLocal(e), exitAt: isoLocal(x),
      entry: s[5], stop: s[6], target: s[7], exit: s[8], size: s[9],
      risk: s[10], pnl: pnl, outcome: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be',
      setup: s[12], maeR: s[13], mfeR: s[14], quality: s[15], emotion: s[16],
      planned: !!s[17], context: s[4] === 'long' ? 'bullish' : 'bearish',
      adherence: { entry: !s[18], stop: true, target: !s[18], sizing: !s[18], rules: !s[18] },
      analysis: tx('Sample entry — replace with your own notes.'),
      plan: tx(s[17] ? 'Wait for the level, take the retest, one entry only.' : 'No plan — this was a reaction.'),
      reflection: tx(s[18] ? 'Took this straight after a loss without waiting for the setup.' : 'Followed the plan and let the target work.')
    });
  });
}
</script>
