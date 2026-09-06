<script>
/* ============================================================
   METRICS — every number the page shows is computed here, once,
   from the trade list. Views only format.
   ============================================================ */

function metrics(trades, account) {
  const n = trades.length;
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const gp = sum(wins.map(t => t.pnl));
  const gl = Math.abs(sum(losses.map(t => t.pnl)));
  const pnl = sum(trades.map(t => t.pnl));
  const rs = trades.map(R);
  const start = account ? Number(account.start) || 0 : 0;

  // Equity curve, in trade order
  let eq = start, peak = start, maxDD = 0, maxDDpct = 0;
  const curve = [{ i: 0, at: trades.length ? (trades[0].exitAt || trades[0].entryAt) : null, eq: start, dd: 0, t: null }];
  trades.forEach((t, i) => {
    eq += t.pnl;
    peak = Math.max(peak, eq);
    const dd = peak - eq;
    if (dd > maxDD) { maxDD = dd; maxDDpct = peak > 0 ? dd / peak * 100 : 0; }
    curve.push({ i: i + 1, at: t.exitAt || t.entryAt, eq: eq, dd: dd, t: t });
  });

  // Streaks
  let cw = 0, cl = 0, mw = 0, ml = 0;
  trades.forEach(t => {
    if (t.pnl > 0) { cw++; cl = 0; mw = Math.max(mw, cw); }
    else if (t.pnl < 0) { cl++; cw = 0; ml = Math.max(ml, cl); }
    else { cw = 0; cl = 0; }
  });
  let curStreak = 0, curKind = '';
  for (let i = trades.length - 1; i >= 0; i--) {
    const s = trades[i].pnl > 0 ? 'win' : trades[i].pnl < 0 ? 'loss' : 'be';
    if (s === 'be') break;
    if (!curKind) curKind = s;
    if (s !== curKind) break;
    curStreak++;
  }

  const avgWin = mean(wins.map(t => t.pnl));
  const avgLoss = mean(losses.map(t => t.pnl));
  const stdR = rs.length > 1 ? Math.sqrt(sum(rs.map(r => (r - mean(rs)) ** 2)) / (rs.length - 1)) : 0;

  return {
    n, wins: wins.length, losses: losses.length,
    winRate: n ? wins.length / n * 100 : 0,
    pnl, gp, gl,
    pf: gl > 0 ? gp / gl : (gp > 0 ? Infinity : 0),
    expectancyR: mean(rs),
    expectancyUSD: mean(trades.map(t => t.pnl)),
    avgWin, avgLoss,
    avgWinR: mean(wins.map(R)), avgLossR: mean(losses.map(R)),
    wlRatio: avgLoss ? Math.abs(avgWin / avgLoss) : 0,
    largestWin: wins.length ? Math.max(...wins.map(t => t.pnl)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map(t => t.pnl)) : 0,
    avgRR: mean(trades.filter(t => t.risk > 0 && t.target && t.entry).map(t => Math.abs(t.target - t.entry) / Math.abs(t.entry - t.stop || 1))),
    rs, stdR,
    // System quality: expectancy per unit of noise. Above ~0.5 is a system worth sizing up.
    sqn: stdR > 0 && n > 1 ? (mean(rs) / stdR) * Math.sqrt(n) : 0,
    stability: stdR > 0 ? mean(rs) / stdR : 0,
    curve, start, equity: eq, maxDD, maxDDpct,
    maxWinStreak: mw, maxLossStreak: ml, curStreak, curKind,
    returnPct: start > 0 ? pnl / start * 100 : 0
  };
}

/** Group trades by a key and rank the groups by total P&L. */
function group(trades, keyFn, labelFn) {
  const m = new Map();
  trades.forEach(t => {
    const k = keyFn(t);
    if (k === null || k === undefined || k === '') return;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(t);
  });
  return Array.from(m.entries()).map(([k, list]) => {
    const w = list.filter(t => t.pnl > 0).length;
    return {
      key: k, label: labelFn ? labelFn(k) : String(k), trades: list, n: list.length,
      pnl: sum(list.map(t => t.pnl)), wins: w,
      winRate: list.length ? w / list.length * 100 : 0,
      avgR: mean(list.map(R)),
      totalR: sum(list.map(R))
    };
  }).sort((a, b) => b.pnl - a.pnl);
}

function byDayMap(trades) {
  const m = new Map();
  trades.forEach(t => {
    const d = dt(t.exitAt || t.entryAt); if (!d) return;
    const k = dkey(d);
    if (!m.has(k)) m.set(k, { pnl: 0, n: 0, r: 0 });
    const c = m.get(k); c.pnl += t.pnl; c.n++; c.r += R(t);
  });
  return m;
}

function bucketByPeriod(trades, kind) {
  const m = new Map();
  trades.forEach(t => {
    const d = dt(t.exitAt || t.entryAt); if (!d) return;
    let k, lab;
    if (kind === 'week') {
      const s = new Date(d); s.setDate(s.getDate() - s.getDay()); s.setHours(0, 0, 0, 0);
      k = dkey(s); lab = monShort(s.getMonth()) + ' ' + s.getDate();
    } else {
      k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      lab = monShort(d.getMonth()) + ' ' + d.getFullYear();
    }
    if (!m.has(k)) m.set(k, { key: k, label: lab, pnl: 0, n: 0 });
    const c = m.get(k); c.pnl += t.pnl; c.n++;
  });
  return Array.from(m.values()).sort((a, b) => a.key < b.key ? -1 : 1);
}

/* ---------- R-multiple distribution ---------- */
function rHistogram(trades) {
  const bins = [
    { lo: -Infinity, hi: -2, label: '< -2R' },
    { lo: -2, hi: -1, label: '-2 to -1R' },
    { lo: -1, hi: 0, label: '-1 to 0R' },
    { lo: 0, hi: 1, label: '0 to 1R' },
    { lo: 1, hi: 2, label: '1 to 2R' },
    { lo: 2, hi: 3, label: '2 to 3R' },
    { lo: 3, hi: Infinity, label: '3R +' }
  ].map(b => Object.assign({ n: 0 }, b));
  trades.forEach(t => {
    const r = R(t);
    const b = bins.find(b => r >= b.lo && r < b.hi) || bins[bins.length - 1];
    b.n++;
  });
  return bins;
}

/* ---------- MAE / MFE — heat taken vs. profit left behind ---------- */
function excursion(trades) {
  const withData = trades.filter(t => t.maeR !== null || t.mfeR !== null);
  const wins = withData.filter(t => t.pnl > 0);
  const losses = withData.filter(t => t.pnl < 0);
  const wMae = wins.filter(t => t.maeR !== null).map(t => Math.abs(t.maeR));
  const lMfe = losses.filter(t => t.mfeR !== null).map(t => Math.abs(t.mfeR));
  const capture = wins.filter(t => t.mfeR).map(t => clamp(R(t) / Math.abs(t.mfeR), 0, 1.2));
  const giveback = withData.filter(t => t.pnl <= 0 && t.mfeR !== null && Math.abs(t.mfeR) >= 1);
  return {
    covered: withData.length, total: trades.length,
    avgWinHeat: mean(wMae),
    maxWinHeat: wMae.length ? Math.max(...wMae) : 0,
    avgLossPotential: mean(lMfe),
    captureRate: mean(capture) * 100,
    giveback: giveback.length,
    givebackR: sum(giveback.map(t => Math.abs(t.mfeR) - R(t))),
    points: withData.filter(t => t.mfeR !== null).map(t => ({ x: Math.abs(t.mfeR), y: R(t), t }))
  };
}

/* ---------- Discipline — the flags that cost money ---------- */
function disciplineFlags(trades, cfg) {
  const s = cfg || Store.settings;
  const sorted = trades.slice().sort((a, b) => new Date(a.entryAt) - new Date(b.entryAt));
  const dayCount = new Map(), dayR = new Map();
  const out = new Map();

  sorted.forEach((t, i) => {
    const flags = [];
    const en = dt(t.entryAt), ex = dt(t.exitAt);
    const k = en ? dkey(en) : '—';

    if (!t.planned) flags.push({ id: 'unplanned', label: 'Not in the plan' });
    if (t.adherence && !t.adherence.rules) flags.push({ id: 'rules', label: 'Rule broken' });
    if (t.adherence && !t.adherence.sizing) flags.push({ id: 'sizing', label: 'Size off' });

    // Revenge: opened inside the cooldown window after a loss closed
    for (let j = i - 1; j >= 0; j--) {
      const p = sorted[j], pex = dt(p.exitAt || p.entryAt);
      if (!pex || !en) break;
      const mins = (en - pex) / 60000;
      if (mins < 0) continue;
      if (mins > s.revengeMinutes) break;
      if (p.pnl < 0) { flags.push({ id: 'revenge', label: 'Straight after a loss' }); break; }
    }

    // Overtrading and trading past the daily loss limit
    const c = (dayCount.get(k) || 0);
    if (c >= s.maxTradesPerDay) flags.push({ id: 'overtrade', label: 'Past the daily trade cap' });
    const rSoFar = dayR.get(k) || 0;
    if (rSoFar <= -Math.abs(s.dailyLossLimitR)) flags.push({ id: 'pastlimit', label: 'Past the daily loss limit' });

    dayCount.set(k, c + 1);
    dayR.set(k, rSoFar + R(t));
    out.set(t.id, flags);
  });
  return out;
}

function disciplineReport(trades, cfg) {
  const flagMap = disciplineFlags(trades, cfg);
  const clean = trades.filter(t => (flagMap.get(t.id) || []).length === 0);
  const dirty = trades.filter(t => (flagMap.get(t.id) || []).length > 0);
  const counts = new Map();
  flagMap.forEach(fl => fl.forEach(f => {
    if (!counts.has(f.id)) counts.set(f.id, { id: f.id, label: f.label, n: 0, pnl: 0 });
    counts.get(f.id).n++;
  }));
  trades.forEach(t => (flagMap.get(t.id) || []).forEach(f => { counts.get(f.id).pnl += t.pnl; }));

  const adhKeys = ADHERENCE_KEYS.map(([k, lab]) => {
    const kept = trades.filter(t => t.adherence && !!t.adherence[k]);
    return { key: k, label: lab, kept: kept.length, n: trades.length, rate: trades.length ? kept.length / trades.length * 100 : 0 };
  });

  return {
    flagMap, clean, dirty,
    counts: Array.from(counts.values()).sort((a, b) => a.pnl - b.pnl),
    cleanPnl: sum(clean.map(t => t.pnl)),
    dirtyPnl: sum(dirty.map(t => t.pnl)),
    cleanR: sum(clean.map(R)),
    dirtyR: sum(dirty.map(R)),
    score: trades.length ? clean.length / trades.length * 100 : 100,
    cleanWinRate: clean.length ? clean.filter(t => t.pnl > 0).length / clean.length * 100 : 0,
    dirtyWinRate: dirty.length ? dirty.filter(t => t.pnl > 0).length / dirty.length * 100 : 0,
    adherence: adhKeys,
    byQuality: group(trades.filter(t => t.quality), t => t.quality, k => tx('Grade {n}', { n: k })).sort((a, b) => a.key - b.key),
    byEmotion: group(trades.filter(t => t.emotion), t => t.emotion, k => tx(k))
  };
}

/* ---------- Monte Carlo — the same edge, reshuffled ---------- */
function monteCarlo(rs, opt) {
  const o = Object.assign({ paths: 1500, horizon: 100, riskPct: 1, start: 10000, ruinPct: 30 }, opt);
  if (!rs.length) return null;
  const steps = o.horizon;
  const bands = [];
  const finals = [], maxDDs = [];
  let ruin = 0, below = 0;
  // Column-major store so percentile bands are cheap
  const grid = Array.from({ length: steps + 1 }, () => new Float64Array(o.paths));
  for (let p = 0; p < o.paths; p++) {
    let eq = o.start, peak = o.start, mdd = 0, ruined = false;
    grid[0][p] = eq;
    for (let s = 1; s <= steps; s++) {
      const r = rs[(Math.random() * rs.length) | 0];
      eq += eq * (o.riskPct / 100) * r;
      if (eq < 0) eq = 0;
      peak = Math.max(peak, eq);
      const dd = peak > 0 ? (peak - eq) / peak * 100 : 0;
      if (dd > mdd) mdd = dd;
      if (dd >= o.ruinPct) ruined = true;
      grid[s][p] = eq;
    }
    finals.push(eq); maxDDs.push(mdd);
    if (ruined) ruin++;
    if (eq < o.start) below++;
  }
  const pct_ = (arr, q) => { const a = Float64Array.from(arr).sort(); return a[clamp(Math.floor(q * (a.length - 1)), 0, a.length - 1)]; };
  for (let s = 0; s <= steps; s++) {
    const col = grid[s];
    const a = Float64Array.from(col).sort();
    const at = q => a[clamp(Math.floor(q * (a.length - 1)), 0, a.length - 1)];
    bands.push({ s, p05: at(0.05), p25: at(0.25), p50: at(0.5), p75: at(0.75), p95: at(0.95) });
  }
  return {
    bands, finals, opt: o,
    median: pct_(finals, 0.5), p05: pct_(finals, 0.05), p95: pct_(finals, 0.95),
    ruinProb: ruin / o.paths * 100,
    belowProb: below / o.paths * 100,
    medianMaxDD: pct_(maxDDs, 0.5), p95MaxDD: pct_(maxDDs, 0.95)
  };
}

/* ---------- Position sizing ---------- */
function sizePosition(o) {
  const risk = (Number(o.balance) || 0) * (Number(o.riskPct) || 0) / 100;
  const dist = Math.abs((Number(o.entry) || 0) - (Number(o.stop) || 0));
  const spec = SYMBOL_TYPES.find(s => s.id === o.type) || SYMBOL_TYPES[0];
  const mult = o.mult ? Number(o.mult) : spec.mult;
  const perUnit = dist * mult;
  const size = perUnit > 0 ? risk / perUnit : 0;
  const rr = dist > 0 && o.target ? Math.abs(Number(o.target) - Number(o.entry)) / dist : 0;
  return {
    risk, dist, size, unit: spec.unit, mult,
    notional: size * mult * (Number(o.entry) || 0),
    reward: rr * risk, rr,
    valid: perUnit > 0 && risk > 0
  };
}

/* ---------- Insights ---------- */
function insights(trades, m) {
  const out = [];
  if (trades.length < 4) return out;

  const byDay = group(trades, t => { const d = dt(t.exitAt || t.entryAt); return d ? d.getDay() : null; }, k => dayShort(k));
  const solid = byDay.filter(g => g.n >= 3);
  if (solid.length >= 2) {
    const best = solid[0], worst = solid[solid.length - 1];
    out.push({ tone: 'good', h: tx('Best weekday: {d}', { d: best.label }), badge: signed(best.pnl, 0),
      d: tx('{n} trades, {w} win rate, {r} average.', { n: best.n, w: pct(best.winRate), r: rfmt(best.avgR) }) });
    if (worst.pnl < 0) out.push({ tone: 'bad', h: tx('Worst weekday: {d}', { d: worst.label }), badge: signed(worst.pnl, 0),
      d: tx('{n} trades at {w}. Worth sizing down here, or sitting out.', { n: worst.n, w: pct(worst.winRate) }) });
  }

  const bySetup = group(trades, t => t.setup).filter(g => g.n >= 3);
  if (bySetup.length >= 2) {
    const b = bySetup[0], w = bySetup[bySetup.length - 1];
    out.push({ tone: 'info', h: tx('Strongest setup: {s}', { s: b.label }), badge: rfmt(b.avgR),
      d: tx('{n} trades, {w} win rate, {p} total.', { n: b.n, w: pct(b.winRate), p: signed(b.pnl, 0) }) });
    if (w.avgR < 0) out.push({ tone: 'warn', h: b.label !== w.label ? tx('{s} is bleeding', { s: w.label }) : tx('Setup drag'), badge: rfmt(w.avgR),
      d: tx('{n} trades at {w}. Either it needs a filter or it needs dropping.', { n: w.n, w: pct(w.winRate) }) });
  }

  const byDir = group(trades, t => t.direction, k => tx(k === 'long' ? 'Long' : 'Short')).filter(g => g.n >= 3);
  if (byDir.length === 2 && Math.abs(byDir[0].avgR - byDir[1].avgR) > 0.5) {
    out.push({ tone: 'info', h: tx('{d}s carry the account', { d: byDir[0].label }), badge: rfmt(byDir[0].avgR),
      d: tx('{a}: {ar} over {an}. {b}: {br} over {bn}.', {
        a: byDir[0].label, ar: rfmt(byDir[0].avgR), an: byDir[0].n,
        b: byDir[1].label, br: rfmt(byDir[1].avgR), bn: byDir[1].n }) });
  }

  const bySess = group(trades, t => { const d = dt(t.entryAt); return d ? sessionOf(d.getHours()).id : null; },
    k => tx((SESSIONS.find(s => s.id === k) || {}).label || k)).filter(g => g.n >= 3);
  if (bySess.length >= 2) {
    out.push({ tone: 'good', h: tx('Best session: {s}', { s: bySess[0].label }), badge: rfmt(bySess[0].avgR),
      d: tx('{n} trades, {w} win rate.', { n: bySess[0].n, w: pct(bySess[0].winRate) }) });
  }

  if (m.expectancyR !== 0) {
    const tone = m.expectancyR > 0 ? 'good' : 'bad';
    out.push({ tone, h: tx('Expectancy per trade'), badge: rfmt(m.expectancyR),
      d: tx('Risking {risk} a trade, the average trade returns {v}. Over 100 trades that is {total}.',
        { risk: money(mean(trades.map(t => t.risk)), 0), v: money(m.expectancyUSD), total: signed(m.expectancyUSD * 100, 0) }) });
  }

  if (m.maxLossStreak >= 3) {
    out.push({ tone: 'warn', h: tx('Longest losing run: {n}', { n: m.maxLossStreak }), badge: tx('{n} in a row', { n: m.maxLossStreak }),
      d: tx('At {w} loss rate a run this long is normal. Size so it stays survivable.', { w: pct(100 - m.winRate) }) });
  }
  return out;
}
</script>
