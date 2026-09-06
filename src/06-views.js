<script>
/* ============================================================
   VIEWS
   ============================================================ */
const App = {
  view: 'dashboard',
  dashTab: 'overview',
  editingId: null,
  reviewId: null,
  cal: null,
  filters: { symbolType: '', direction: '', setup: '', perf: '', from: '', to: '', q: '' },
  mc: { horizon: 100, riskPct: null, ruin: 30, paths: 1500, result: null },
  sizer: null
};

const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];

function tile(k, v, s, klass) {
  return '<div class="tile' + (klass && klass.indexOf('lift') >= 0 ? ' lift' : '') + '">' +
    '<div class="k">' + esc(tx(k)) + '</div>' +
    '<div class="v ' + (klass || '').replace('lift', '').trim() + '">' + v + '</div>' +
    (s ? '<div class="s">' + tx(s) + '</div>' : '') + '</div>';
}
function panel(title, body, sub, actions) {
  return '<section class="panel panel-pad">' +
    '<div class="panel-head"><div><div class="panel-title">' + esc(tx(title)) + '</div>' +
    (sub ? '<div class="panel-sub">' + tx(sub) + '</div>' : '') + '</div>' + (actions || '') + '</div>' + body + '</section>';
}
function pfText(pf) { return pf === Infinity ? '∞' : num(pf, 2); }
function noTrades(msg) {
  return '<div class="panel panel-pad"><div class="empty"><h3>' + esc(tx(msg || 'No trades in this account yet')) + '</h3>' +
    '<p>' + tx('Log one on the {tab} tab and every chart here fills in.', { tab: '<strong>' + tx('New Trade') + '</strong>' }) + '</p>' +
    '<button class="btn btn-primary" data-go="new" style="margin-top:10px">' + tx('Log your first trade') + '</button></div></div>';
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function viewDashboard() {
  const trades = Store.scoped(), acc = Store.account();
  if (!trades.length) return dashSwitcher() + noTrades();
  const m = metrics(trades, acc);
  return dashSwitcher() + (App.dashTab === 'overview' ? dashOverview(trades, m, acc) : dashStats(trades, m, acc));
}
function dashSwitcher() {
  const b = (id, lab) => '<button class="chip" data-dashtab="' + id + '" aria-pressed="' + (App.dashTab === id) + '">' + tx(lab) + '</button>';
  return '<div class="rowflex" style="margin-bottom:16px">' + b('overview', 'Overview') + b('stats', 'Detailed statistics') + '</div>';
}

function dashOverview(trades, m, acc) {
  const goal = Number(acc.goal) || 0;
  const capital = m.equity, savings = Number(acc.savings) || 0;
  const progress = goal > 0 ? clamp((capital + savings) / goal * 100, 0, 100) : 0;
  const rep = disciplineReport(trades);

  const kpis = '<div class="grid g5" style="margin-bottom:14px">' +
    tile('Account equity', money(m.equity, 0), tx('Started at {v}', { v: money(m.start, 0) }), 'lift') +
    tile('Net P&L', signed(m.pnl, 0), tx('{v} return', { v: pct(m.returnPct) }), cls(m.pnl)) +
    tile('Win rate', pct(m.winRate), tx('{w}W · {l}L of {n}', { w: m.wins, l: m.losses, n: m.n })) +
    tile('Expectancy', rfmt(m.expectancyR), tx('{v} per trade', { v: money(m.expectancyUSD) }), cls(m.expectancyR)) +
    tile('Profit factor', pfText(m.pf), m.pf >= 1.5 ? 'Healthy' : m.pf >= 1 ? 'Thin but positive' : 'Losing money',
      m.pf >= 1.5 ? 'pos' : m.pf >= 1 ? 'warn' : 'neg') +
    '</div>';

  const curvePts = m.curve.map((p, i) => ({
    v: p.eq, label: p.at ? dshort(p.at) : 'Start',
    tip: (p.t ? p.t.symbol + ' ' + tx(p.t.direction === 'long' ? 'Long' : 'Short') : tx('starting equity')) + ' · ' + money(p.eq, 0) +
      (p.t ? ' · ' + signed(p.t.pnl) + ' (' + rfmt(R(p.t)) + ')' : '') + (p.at ? ' · ' + dlong(p.at) : '')
  }));
  const ddPts = m.curve.map(p => ({ v: p.dd, tip: (p.at ? dlong(p.at) : tx('starting equity')) + ' · ' + money(-p.dd, 0) }));

  const weeks = bucketByPeriod(trades, 'week').slice(-10);
  const months = bucketByPeriod(trades, 'month').slice(-8);

  const goalArc = (() => {
    const r = 66, c = 2 * Math.PI * r, off = c * (1 - progress / 100);
    return '<svg viewBox="0 0 180 180" style="width:180px;height:180px;display:block;margin:0 auto" role="img" aria-label="Goal progress ' + pct(progress) + '">' +
      '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="11"/>' +
      '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="var(--gold)" stroke-width="11" stroke-linecap="round" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 90 90)"/>' +
      '<text x="90" y="86" text-anchor="middle" style="font-family:var(--font-mono);font-size:26px;font-weight:600;fill:var(--ink)">' + pct(progress) + '</text>' +
      '<text x="90" y="106" text-anchor="middle" style="font-size:11px;fill:var(--ink-3)">' + tx('of goal') + '</text></svg>';
  })();

  const left = '<div class="stack">' +
    panel('Equity curve', slot('chartEquity', [curvePts]), tx('{acc} account, trade by trade', { acc: acc.name })) +
    panel('Underwater', slot('chartDrawdown', [ddPts]),
      tx('How far below the high-water mark the account sat after each trade — the deepest was {v} ({p})',
        { v: money(m.maxDD, 0), p: pct(m.maxDDpct) })) +
    '<div class="split-even">' +
    panel('By week', slot('chartBars', [weeks.map(w => ({ v: w.pnl, label: w.label, tip: tx('Week of {d}', { d: w.label }) + ' · ' + signed(w.pnl) + ' · ' + tx('{n} trades', { n: w.n }) }))], { h: 210 })) +
    panel('By month', slot('chartBars', [months.map(w => ({ v: w.pnl, label: w.label.split(' ')[0], tip: w.label + ' · ' + signed(w.pnl) + ' · ' + tx('{n} trades', { n: w.n }) }))], { h: 210 })) +
    '</div></div>';

  const right = '<div class="stack">' +
    panel(tx('Road to {goal}', { goal: money(goal, 0) }), goalArc +
      '<div style="margin-top:14px">' +
      '<div class="kv"><span class="k">' + tx('Trading capital') + '</span><span class="v">' + money(capital, 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Set aside') + '</span><span class="v">' + money(savings, 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Still to go') + '</span><span class="v">' + money(Math.max(0, goal - capital - savings), 0) + '</span></div>' +
      '</div>') +
    panel('Process scorecard', '<div class="stack" style="gap:10px">' +
      '<div class="kv"><span class="k">' + tx('Trades that broke no rule') + '</span><span class="v ' + (rep.score >= 80 ? 'pos' : rep.score >= 60 ? 'warn' : 'neg') + '">' + pct(rep.score) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('P&L from those trades') + '</span><span class="v ' + cls(rep.cleanPnl) + '">' + signed(rep.cleanPnl, 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('P&L from the rest') + '</span><span class="v ' + cls(rep.dirtyPnl) + '">' + signed(rep.dirtyPnl, 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Average execution grade') + '</span><span class="v">' + num(mean(trades.filter(t => t.quality).map(t => t.quality)), 1) + ' / 5</span></div>' +
      '</div><button class="btn btn-sm" data-go="discipline" style="margin-top:12px">' + tx('Open discipline report') + '</button>',
      'What the account looks like when you follow your own rules') +
    panel('Account', '<div class="stack" style="gap:0">' +
      '<div class="kv"><span class="k">' + tx('Total return') + '</span><span class="v ' + cls(m.returnPct) + '">' + pct(m.returnPct) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Max drawdown') + '</span><span class="v neg">' + money(m.maxDD, 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Best trade') + '</span><span class="v pos">' + money(m.largestWin, 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Worst trade') + '</span><span class="v neg">' + money(m.largestLoss, 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Active since') + '</span><span class="v">' + dlong(trades[0].entryAt) + '</span></div>' +
      '</div>') +
    '</div>';

  return kpis + '<div class="split">' + left + right + '</div>';
}

function dashStats(trades, m, acc) {
  const rep = disciplineReport(trades);
  const dayMap = byDayMap(trades);

  // last 14 calendar days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const c = dayMap.get(dkey(d));
    days.push({
      v: c ? c.pnl : 0,
      label: dayInitial(d.getDay()) + d.getDate(),
      tip: dayShort(d.getDay()) + ' ' + dshort(d) + ' · ' + (c ? signed(c.pnl) + ' · ' + tx('{n} trades', { n: c.n }) : tx('no trades'))
    });
  }

  const setups = group(trades, t => t.setup).slice(0, 6);
  const slices = setups.map((g, i) => ({ label: g.label, v: g.n, color: SERIES[i % SERIES.length] }));
  const legend = '<div class="legend">' + setups.map((g, i) =>
    '<span><i style="background:' + SERIES[i % SERIES.length] + '"></i>' + esc(g.label) + ' (' + g.n + ')</span>').join('') + '</div>';

  const ins = insights(trades, m);

  const kpis = '<div class="grid g4" style="margin-bottom:14px">' +
    tile('Win rate', pct(m.winRate), tx('{n} trades', { n: m.n })) +
    tile('Profit factor', pfText(m.pf), tx('{won} won vs {lost} lost', { won: money(m.gp, 0), lost: money(m.gl, 0) })) +
    tile('Average R', rfmt(m.expectancyR), tx('Winners {w} · losers {l}', { w: rfmt(m.avgWinR), l: rfmt(m.avgLossR) })) +
    tile('Net P&L', signed(m.pnl, 0), tx('Max drawdown {v}', { v: money(m.maxDD, 0) }), cls(m.pnl)) +
    '</div>';

  return kpis +
    '<div class="split">' +
    '<div class="stack">' +
    panel('Daily P&L', slot('chartBars', [days], { h: 230 }), 'Last 14 days') +
    panel('Trading calendar', calendarHTML(trades), 'Green days made money, red days lost it. The right column totals each week.',
      '<div class="rowflex"><button class="btn btn-sm" data-cal="-1">‹</button><span class="num" id="calLabel" style="min-width:126px;text-align:center">' +
      monLong(App.cal.m) + ' ' + App.cal.y + '</span><button class="btn btn-sm" data-cal="1">›</button></div>') +
    panel('What the record says', ins.length
      ? '<div class="stack" style="gap:9px">' + ins.map(i =>
        '<div class="insight ' + i.tone + '"><div class="body"><div class="h">' + esc(i.h) + '</div><div class="d">' + esc(i.d) + '</div></div>' +
        '<span class="badge">' + esc(i.badge) + '</span></div>').join('') + '</div>'
      : '<div class="empty">' + tx('A few more trades and patterns start showing up here.') + '</div>',
      'Only groups with at least 3 trades — anything smaller is noise') +
    '</div>' +
    '<div class="stack">' +
    panel('Setup mix', slot('chartDonut', [slices], { h: 210 }) + legend) +
    panel('Wins and losses', '<div class="stack" style="gap:0">' +
      '<div class="kv"><span class="k">' + tx('Largest win') + '</span><span class="v pos">' + money(m.largestWin) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Average win') + '</span><span class="v pos">' + money(m.avgWin) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Largest loss') + '</span><span class="v neg">' + money(m.largestLoss) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Average loss') + '</span><span class="v neg">' + money(m.avgLoss) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Win / loss size') + '</span><span class="v">' + num(m.wlRatio, 2) + '×</span></div>' +
      '</div>') +
    panel('Streaks', '<div class="stack" style="gap:0">' +
      '<div class="kv"><span class="k">' + tx('Longest winning run') + '</span><span class="v pos">' + m.maxWinStreak + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Longest losing run') + '</span><span class="v neg">' + m.maxLossStreak + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Right now') + '</span><span class="v ' + (m.curKind === 'win' ? 'pos' : m.curKind === 'loss' ? 'neg' : '') + '">' +
      (m.curStreak ? tx(m.curKind === 'win' ? '{n} wins in a row' : '{n} losses in a row', { n: m.curStreak }) : '—') + '</span></div>' +
      '</div>') +
    panel('Plan adherence', barList(rep.adherence.map(a => ({ label: tx(a.label), v: a.rate, text: pct(a.rate, 0) })), { signed: false }),
      'How often each rule survived contact with the market') +
    '</div></div>';
}

function calendarHTML(trades) {
  const map = byDayMap(trades);
  const y = App.cal.y, mo = App.cal.m;
  const first = new Date(y, mo, 1), start = new Date(first);
  start.setDate(1 - first.getDay());
  let html = '<div class="tw"><table class="cal"><thead><tr>' +
    [0, 1, 2, 3, 4, 5, 6].map(i => '<th class="eyebrow">' + dayInitial(i) + '</th>').join('') +
    '<th class="eyebrow">' + tx('Week') + '</th></tr></thead><tbody>';
  let monthTotal = 0;
  for (let w = 0; w < 6; w++) {
    let row = '', wk = 0, any = false;
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start); cur.setDate(start.getDate() + w * 7 + d);
      const inMonth = cur.getMonth() === mo;
      const c = map.get(dkey(cur));
      if (c && inMonth) { wk += c.pnl; any = true; }
      const bg = c && inMonth
        ? (c.pnl > 0 ? 'background:var(--profit-wash);border-color:color-mix(in srgb,var(--profit) 32%,transparent)'
          : c.pnl < 0 ? 'background:var(--loss-wash);border-color:color-mix(in srgb,var(--loss) 32%,transparent)' : '')
        : '';
      row += '<td><div class="cell' + (inMonth ? '' : ' out') + '" style="' + bg + '">' +
        '<span class="d">' + cur.getDate() + '</span>' +
        (c && inMonth ? '<span class="p ' + cls(c.pnl) + '">' + signed(c.pnl, 0) + '</span><span class="c">' + c.n + ' ' + tx(c.n > 1 ? 'trades' : 'trade') + '</span>' :
          '<span class="c">' + (inMonth ? '—' : '') + '</span>') +
        '</div></td>';
    }
    monthTotal += wk;
    html += '<tr>' + row + '<td class="tot ' + (any ? cls(wk) : 'mut') + '">' + (any ? signed(wk, 0) : '—') + '</td></tr>';
    const probe = new Date(start); probe.setDate(start.getDate() + (w + 1) * 7);
    if (probe.getMonth() !== mo && w >= 4) break;
  }
  html += '</tbody></table></div>' +
    '<div class="rowflex" style="justify-content:flex-end;margin-top:10px"><span class="eyebrow">' + tx('Month total') + '</span>' +
    '<span class="num ' + cls(monthTotal) + '" style="font-size:16px;font-weight:600">' + signed(monthTotal, 0) + '</span></div>';
  return html;
}

/* ============================================================
   NEW / EDIT TRADE
   ============================================================ */
function viewNew() {
  const t = App.editingId ? Store.trades.find(x => x.id === App.editingId) : null;
  const v = t || normalizeTrade({ account: Store.settings.active, entryAt: isoLocal(new Date()), exitAt: isoLocal(new Date()) });
  const setups = Store.settings.setups;
  const o = (val, cur, lab) => '<option value="' + esc(val) + '"' + (String(cur) === String(val) ? ' selected' : '') + '>' + esc(lab) + '</option>';

  return '<form id="tradeForm" class="panel panel-pad" style="max-width:980px">' +
    '<div class="panel-head"><div><div class="panel-title">' + tx(t ? 'Edit trade' : 'Log a trade') + '</div>' +
    '<div class="panel-sub">' + tx('Price and risk first; the notes live on the Trade Review tab.') + '</div></div>' +
    (t ? '<button type="button" class="btn btn-sm" id="cancelEdit">' + tx('Cancel edit') + '</button>' : '') + '</div>' +

    '<fieldset class="fieldset"><legend>' + tx('The trade') + '</legend><div class="formgrid">' +
    '<div class="field"><label for="f_symbol">' + tx('Symbol') + '<span class="req">*</span></label>' +
    '<input id="f_symbol" name="symbol" type="text" required placeholder="XAUUSD" value="' + esc(v.symbol) + '" autocomplete="off"></div>' +
    '<div class="field"><label for="f_type">' + tx('Market') + '</label><select id="f_type" name="symbolType">' +
    SYMBOL_TYPES.map(s => o(s.id, v.symbolType, tx(s.label))).join('') + '</select></div>' +
    '<div class="field"><label for="f_dir">' + tx('Direction') + '</label><select id="f_dir" name="direction">' +
    o('long', v.direction, tx('Long')) + o('short', v.direction, tx('Short')) + '</select></div>' +
    '<div class="field"><label for="f_account">' + tx('Account') + '</label><select id="f_account" name="account">' +
    Store.settings.accounts.map(a => o(a.id, v.account, a.name)).join('') + '</select></div>' +
    '<div class="field"><label for="f_entryAt">' + tx('Entered') + '<span class="req">*</span></label>' +
    '<input id="f_entryAt" name="entryAt" type="datetime-local" required value="' + esc(v.entryAt) + '"></div>' +
    '<div class="field"><label for="f_exitAt">' + tx('Closed') + '</label>' +
    '<input id="f_exitAt" name="exitAt" type="datetime-local" value="' + esc(v.exitAt) + '"></div>' +
    '</div></fieldset>' +

    '<fieldset class="fieldset"><legend>' + tx('Prices and size') + '</legend><div class="formgrid">' +
    '<div class="field"><label for="f_entry">' + tx('Entry price') + '<span class="req">*</span></label><input id="f_entry" name="entry" type="number" step="any" required value="' + (v.entry || '') + '"></div>' +
    '<div class="field"><label for="f_stop">' + tx('Stop loss') + '<span class="req">*</span></label><input id="f_stop" name="stop" type="number" step="any" required value="' + (v.stop || '') + '"></div>' +
    '<div class="field"><label for="f_target">' + tx('Take profit') + '</label><input id="f_target" name="target" type="number" step="any" value="' + (v.target || '') + '"></div>' +
    '<div class="field"><label for="f_exit">' + tx('Exit price') + '</label><input id="f_exit" name="exit" type="number" step="any" value="' + (v.exit || '') + '"></div>' +
    '<div class="field"><label for="f_size">' + tx('Size') + '</label><input id="f_size" name="size" type="number" step="any" value="' + (v.size || '') + '">' +
    '<span class="hint" id="sizeHint">' + tx('lots / shares / coins') + '</span></div>' +
    '<div class="field"><label for="f_risk">' + tx('Risked') + '<span class="req">*</span></label><input id="f_risk" name="risk" type="number" step="any" required value="' + (v.risk || '') + '">' +
    '<span class="hint">' + tx('The cash you accepted losing.') + ' <button type="button" class="btn btn-sm btn-ghost" id="autoRisk" style="padding:0 4px">' + tx('fill from stop') + '</button></span></div>' +
    '<div class="field"><label for="f_pnl">' + tx('Result') + '<span class="req">*</span></label><input id="f_pnl" name="pnl" type="number" step="any" required value="' + (v.pnl || v.pnl === 0 ? v.pnl : '') + '">' +
    '<span class="hint" id="rHint">' + tx('Net cash.') + ' <button type="button" class="btn btn-sm btn-ghost" id="autoPnl" style="padding:0 4px">' + tx('fill from exit') + '</button></span></div>' +
    '<div class="field"><label for="f_setup">' + tx('Setup') + '</label><input id="f_setup" name="setup" type="text" list="setupList" value="' + esc(v.setup) + '" placeholder="FVG">' +
    '<datalist id="setupList">' + setups.map(s => '<option value="' + esc(s) + '"></option>').join('') + '</datalist></div>' +
    '<div class="field"><label for="f_tags">' + tx('Tags') + '</label><input id="f_tags" name="tags" type="text" value="' + esc(v.tags.join(', ')) + '" placeholder="news, retest, A+">' +
    '<span class="hint">' + tx('Comma separated') + '</span></div>' +
    '</div></fieldset>' +

    '<fieldset class="fieldset"><legend>' + tx('How far it ran') + '</legend><div class="formgrid">' +
    '<div class="field"><label for="f_mae">' + tx('Worst point against you (R)') + '</label><input id="f_mae" name="maeR" type="number" step="0.05" min="0" value="' + (v.maeR == null ? '' : v.maeR) + '">' +
    '<span class="hint">' + tx('1.0 means it reached your stop') + '</span></div>' +
    '<div class="field"><label for="f_mfe">' + tx('Best point in your favour (R)') + '</label><input id="f_mfe" name="mfeR" type="number" step="0.05" min="0" value="' + (v.mfeR == null ? '' : v.mfeR) + '">' +
    '<span class="hint">' + tx('3.0 means it offered 3× your risk') + '</span></div>' +
    '<div class="field"><label for="f_quality">' + tx('Execution grade') + '</label><select id="f_quality" name="quality">' +
    [1, 2, 3, 4, 5].map(n => o(n, v.quality, n + ' — ' + tx(['scrappy', 'sloppy', 'acceptable', 'clean', 'textbook'][n - 1]))).join('') + '</select></div>' +
    '</div></fieldset>' +

    '<fieldset class="fieldset"><legend>' + tx('Was it your trade to take?') + '</legend>' +
    '<div class="checks" style="margin-bottom:12px">' +
    '<label><input type="checkbox" name="planned" ' + (v.planned ? 'checked' : '') + '> ' + tx('It was in the plan before the session') + '</label>' +
    ADHERENCE_KEYS.map(([k, lab]) => '<label><input type="checkbox" name="adh_' + k + '" ' + (v.adherence[k] !== false ? 'checked' : '') + '> ' + esc(tx(lab)) + '</label>').join('') +
    '</div>' +
    '<div class="formgrid">' +
    '<div class="field"><label for="f_context">' + tx('Market read') + '</label><select id="f_context" name="context">' +
    o('bullish', v.context, tx('Bullish')) + o('bearish', v.context, tx('Bearish')) + o('neutral', v.context, tx('Neutral')) + '</select></div>' +
    '<div class="field"><label for="f_emotion">' + tx('How you felt') + '</label><select id="f_emotion" name="emotion">' +
    EMOTIONS.map(e => o(e, v.emotion, tx(e))).join('') + '</select></div>' +
    '</div></fieldset>' +

    '<div class="rowflex" style="justify-content:flex-end">' +
    '<span class="mut" id="formLive" style="margin-right:auto"></span>' +
    '<button type="submit" class="btn btn-primary">' + tx(t ? 'Save changes' : 'Log trade') + '</button></div>' +
    '</form>';
}

/* ============================================================
   TRADE HISTORY
   ============================================================ */
function filteredTrades() {
  const f = App.filters;
  return Store.scoped().filter(t => {
    if (f.symbolType && t.symbolType !== f.symbolType) return false;
    if (f.direction && t.direction !== f.direction) return false;
    if (f.setup && t.setup !== f.setup) return false;
    if (f.perf === 'win' && t.pnl <= 0) return false;
    if (f.perf === 'loss' && t.pnl >= 0) return false;
    if (f.from && new Date(t.entryAt) < new Date(f.from)) return false;
    if (f.to && new Date(t.entryAt) > new Date(f.to + 'T23:59')) return false;
    if (f.q && (t.symbol + ' ' + t.setup + ' ' + t.tags.join(' ')).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
    return true;
  }).sort((a, b) => new Date(b.entryAt) - new Date(a.entryAt));
}
function viewHistory() {
  const all = Store.scoped();
  if (!all.length) return noTrades();
  const list = filteredTrades();
  const flags = disciplineFlags(all);
  const setups = Array.from(new Set(all.map(t => t.setup).filter(Boolean)));
  const f = App.filters;
  const sel = (id, cur, opts, ph) => '<select data-filter="' + id + '"><option value="">' + ph + '</option>' +
    opts.map(o => '<option value="' + esc(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';

  const bar = '<div class="filters">' +
    '<input type="text" data-filter="q" placeholder="' + esc(tx('Search symbol, setup, tag')) + '" value="' + esc(f.q) + '" style="min-width:190px">' +
    sel('symbolType', f.symbolType, SYMBOL_TYPES.map(s => [s.id, tx(s.label)]), tx('Any market')) +
    sel('direction', f.direction, [['long', tx('Long')], ['short', tx('Short')]], tx('Any direction')) +
    sel('setup', f.setup, setups.map(s => [s, s]), tx('Any setup')) +
    sel('perf', f.perf, [['win', tx('Winners')], ['loss', tx('Losers')]], tx('Any result')) +
    '<input type="date" data-filter="from" value="' + esc(f.from) + '" title="' + esc(tx('From')) + '">' +
    '<input type="date" data-filter="to" value="' + esc(f.to) + '" title="' + esc(tx('To')) + '">' +
    '<button class="btn btn-sm" id="clearFilters">' + tx('Clear') + '</button>' +
    '<span class="mut" style="margin-left:auto">' + tx('{shown} of {total}', { shown: list.length, total: all.length }) + ' · ' +
    '<strong class="' + cls(sum(list.map(t => t.pnl))) + '">' + signed(sum(list.map(t => t.pnl)), 0) + '</strong></span>' +
    '</div>';

  if (!list.length) return bar + '<div class="panel panel-pad"><div class="empty"><h3>' + tx('Nothing matches those filters') + '</h3><p>Loosen one and try again.</p></div></div>';

  const rows = list.map(t => {
    const fl = flags.get(t.id) || [];
    return '<tr data-tid="' + t.id + '">' +
      '<td class="n mut">' + dshort(t.entryAt) + '</td>' +
      '<td><span class="pill pill-sym">' + esc(t.symbol) + '</span></td>' +
      '<td><span class="pill ' + (t.direction === 'long' ? 'pill-long' : 'pill-short') + '">' + tx(t.direction === 'long' ? 'Long' : 'Short') + '</span></td>' +
      '<td class="n r">' + num(t.entry, t.entry < 10 ? 4 : 2) + '</td>' +
      '<td class="n r">' + (t.exit ? num(t.exit, t.exit < 10 ? 4 : 2) : '—') + '</td>' +
      '<td class="n r">' + (t.size || '—') + '</td>' +
      '<td class="n r ' + cls(t.pnl) + '" style="font-weight:600">' + signed(t.pnl) + '</td>' +
      '<td class="n r ' + cls(R(t)) + '">' + rfmt(R(t)) + '</td>' +
      '<td><span class="pill ' + (t.pnl > 0 ? 'pill-win' : t.pnl < 0 ? 'pill-loss' : 'pill-be') + '">' + tx(t.pnl > 0 ? 'Win' : t.pnl < 0 ? 'Loss' : 'Flat') + '</span></td>' +
      '<td>' + (t.setup ? '<span class="pill pill-tag">' + esc(t.setup) + '</span>' : '<span class="mut">—</span>') + '</td>' +
      '<td>' + (fl.length ? '<span class="pill pill-warn" title="' + esc(fl.map(x => tx(x.label)).join(', ')) + '">⚑ ' + fl.length + '</span>' : '<span class="mut">' + tx('clean record') + '</span>') + '</td>' +
      '<td class="r" style="white-space:nowrap">' +
      '<button class="btn btn-sm" data-act="review" data-id="' + t.id + '">' + tx('Review') + '</button> ' +
      '<button class="btn btn-sm" data-act="edit" data-id="' + t.id + '">' + tx('Edit') + '</button> ' +
      '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + t.id + '">' + tx('Delete') + '</button></td></tr>';
  }).join('');

  return bar + '<div class="panel"><div class="tw"><table><thead><tr>' +
    ['Date', 'Symbol', 'Direction', 'Entry', 'Exit', 'Size', 'P&L', 'R', 'Result', 'Setup', 'Rules', ''].map((h, i) =>
      '<th' + ([3, 4, 5, 6, 7, 11].indexOf(i) >= 0 ? ' class="r"' : '') + '>' + (h ? tx(h) : '') + '</th>').join('') +
    '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

/* ============================================================
   ANALYSIS
   ============================================================ */
function viewAnalysis() {
  const trades = Store.scoped();
  if (!trades.length) return noTrades();
  const m = metrics(trades, Store.account());

  const setups = group(trades, t => t.setup);
  const dirs = group(trades, t => t.direction, k => tx(k === 'long' ? 'Long' : 'Short'));
  const types = group(trades, t => t.symbolType, k => tx((SYMBOL_TYPES.find(s => s.id === k) || {}).label || k));
  const syms = group(trades, t => t.symbol).slice(0, 10);
  const wdays = group(trades, t => { const d = dt(t.exitAt || t.entryAt); return d ? d.getDay() : null; }, k => dayShort(k))
    .sort((a, b) => a.key - b.key);

  const setupCards = setups.map(g =>
    '<div class="panel panel-pad"><div class="panel-head" style="margin-bottom:10px">' +
    '<div class="panel-title">' + esc(g.label) + '</div><span class="num ' + cls(g.pnl) + '" style="font-weight:600">' + signed(g.pnl, 0) + '</span></div>' +
    '<div class="grid g3" style="gap:8px;margin-bottom:10px">' +
    '<div><div class="eyebrow">' + tx('Win rate') + '</div><div class="num" style="font-size:17px">' + pct(g.winRate) + '</div></div>' +
    '<div><div class="eyebrow">' + tx('Trades') + '</div><div class="num" style="font-size:17px">' + g.n + '</div></div>' +
    '<div><div class="eyebrow">' + tx('Avg R') + '</div><div class="num ' + cls(g.avgR) + '" style="font-size:17px">' + rfmt(g.avgR) + '</div></div>' +
    '</div>' +
    '<div class="brow" style="grid-template-columns:1fr"><div class="track"><div class="fill" style="left:0;width:' +
    clamp(g.winRate, 0, 100).toFixed(0) + '%;background:' + (g.avgR >= 0 ? 'var(--profit)' : 'var(--loss)') + '"></div></div></div>' +
    '</div>').join('');

  const dirRows = dirs.map(g => ({ label: g.label + ' (' + g.n + ')', v: g.pnl, text: signed(g.pnl, 0) }));

  return '<div class="section" style="margin-top:0"><h2>' + tx('What is actually working') + '</h2>' +
    '<p class="lede">' + tx('Ranked by money, not by feel. Groups under three trades are still noise — read them lightly.') + '</p>' +
    '<div class="grid g3">' + setupCards + '</div></div>' +

    '<div class="section"><div class="split-even">' +
    panel('Long vs short', barList(dirRows) +
      '<div class="grid g2" style="margin-top:14px">' +
      dirs.map(g => '<div class="tile"><div class="k">' + esc(g.label) + '</div><div class="v ' + cls(g.pnl) + '">' + signed(g.pnl, 0) + '</div>' +
        '<div class="s">' + tx('{w} win rate · {r} avg', { w: pct(g.winRate), r: rfmt(g.avgR) }) + '</div></div>').join('') + '</div>',
      'Two numbers side by side beat a two-slice pie') +
    panel('By weekday', slot('chartBars', [wdays.map(g => ({ v: g.pnl, label: g.label, tip: g.label + ' · ' + signed(g.pnl) + ' · ' + tx('{n} trades', { n: g.n }) + ' · ' + tx('{w} win rate', { w: pct(g.winRate) }) }))], { h: 230 })) +
    '</div></div>' +

    '<div class="section"><div class="split-even">' +
    panel('By market', barList(types.map(g => ({ label: g.label + ' (' + g.n + ')', v: g.pnl }))) ) +
    panel('By symbol', barList(syms.map(g => ({ label: g.label + ' (' + g.n + ')', v: g.pnl }))), 'Top 10 by result') +
    '</div></div>' +

    '<div class="section"><h2>' + tx('Risk metrics') + '</h2><p class="lede">' + tx('The shape of the account, independent of how many trades you took.') + '</p>' +
    '<div class="grid g4">' +
    tile('Average win', money(m.avgWin, 0), tx('vs {v} average loss', { v: money(Math.abs(m.avgLoss), 0) }), 'pos') +
    tile('Win / loss size', num(m.wlRatio, 2) + '×', 'Higher means winners outweigh losers') +
    tile('Profit factor', pfText(m.pf), 'Gross won ÷ gross lost') +
    tile('Max drawdown', money(m.maxDD, 0), tx('{p} from the high', { p: pct(m.maxDDpct) }), 'neg') +
    tile('Expectancy', rfmt(m.expectancyR), 'Average return per trade, in units of risk', cls(m.expectancyR)) +
    tile('Consistency', num(m.stability, 2), 'Average R ÷ spread of R. Above 0.3 is steady') +
    tile('System quality', num(m.sqn, 2), m.sqn > 2.5 ? 'Strong for this sample' : m.sqn > 1.6 ? 'Decent' : 'Too early to tell') +
    tile('Longest losing run', m.maxLossStreak, 'Size so this stays survivable') +
    '</div></div>';
}

/* ============================================================
   EDGE LAB — distribution, simulation, timing, excursion
   ============================================================ */
function viewEdge() {
  const trades = Store.scoped(); const acc = Store.account();
  if (trades.length < 3) return noTrades('Edge Lab needs a handful of trades');
  const m = metrics(trades, acc);
  const bins = rHistogram(trades);
  const ex = excursion(trades);

  const sess = group(trades, t => { const d = dt(t.entryAt); return d ? sessionOf(d.getHours()).id : null; },
    k => tx((SESSIONS.find(s => s.id === k) || {}).label || k));
  const hours = group(trades, t => { const d = dt(t.entryAt); return d ? d.getHours() : null; }, k => String(k).padStart(2, '0') + ':00')
    .sort((a, b) => a.key - b.key);

  if (App.mc.riskPct == null) App.mc.riskPct = Store.settings.riskPct;
  const mc = App.mc.result;

  const histo = slot('chartBars', [bins.map(b => ({
    v: b.n, label: b.label.replace(' to ', '–').replace('R', ''), color: b.hi <= 0 ? 'var(--loss)' : 'var(--profit)',
    tip: b.label + ' · ' + tx('{n} trades', { n: b.n }) + ' · ' + pct(trades.length ? b.n / trades.length * 100 : 0)
  }))], { h: 230, colorBySign: false, fmt: v => tx('{n} trades', { n: v }) });

  const mcPanel = mc
    ? slot('chartFan', [mc.bands, mc.opt.start]) +
      '<div class="grid g4" style="margin-top:14px">' +
      tile('Median outcome', money(mc.median, 0), tx('after {n} trades', { n: mc.opt.horizon }), cls(mc.median - mc.opt.start)) +
      tile('Bad run (5th pct)', money(mc.p05, 0), '1 run in 20 ends here or worse', 'neg') +
      tile('Good run (95th pct)', money(mc.p95, 0), '1 run in 20 ends here or better', 'pos') +
      tile(tx('Chance of a {p} drawdown', { p: mc.opt.ruinPct + '%' }), pct(mc.ruinProb), 'Somewhere along the way',
        mc.ruinProb > 25 ? 'neg' : mc.ruinProb > 10 ? 'warn' : 'pos') +
      '</div>' +
      '<div class="grid g2" style="margin-top:12px">' +
      tile('Chance of finishing down', pct(mc.belowProb), 'Below where you started', mc.belowProb > 40 ? 'warn' : '') +
      tile('Typical worst drawdown', pct(mc.medianMaxDD), tx('1 run in 20 sees {p} or deeper', { p: pct(mc.p95MaxDD) })) +
      '</div>'
    : '<div class="empty"><h3>' + tx('Run the simulation') + '</h3><p>' + tx('It reshuffles your own {n} results thousands of times to show the range of accounts the same edge can produce.', { n: trades.length }) + '</p></div>';

  const mcControls = '<div class="filters" style="margin-bottom:0">' +
    '<label class="eyebrow">' + tx('Risk per trade') + '</label><input type="number" step="0.1" min="0.1" max="10" id="mcRisk" value="' + App.mc.riskPct + '" style="min-width:80px">' +
    '<label class="eyebrow">' + tx('Trades ahead') + '</label><input type="number" step="10" min="20" max="500" id="mcHorizon" value="' + App.mc.horizon + '" style="min-width:80px">' +
    '<label class="eyebrow">' + tx('Call it ruin at') + '</label><input type="number" step="5" min="5" max="90" id="mcRuin" value="' + App.mc.ruin + '" style="min-width:70px"><span class="mut">%</span>' +
    '<button class="btn btn-primary btn-sm" id="mcRun">' + tx('Run 1,500 paths') + '</button></div>';

  const exPanel = ex.covered < 3
    ? '<div class="empty"><h3>' + tx('Fill in MAE and MFE to unlock this') + '</h3><p>' + tx('On each trade, note how far price went against you and how far it went your way, both measured in R. {covered} of {total} trades have it so far.',
        { covered: ex.covered, total: ex.total }) + '</p></div>'
    : slot('chartScatter', [ex.points.map(p => ({
        x: p.x, y: p.y,
        label: p.t.symbol + ' ' + dshort(p.t.entryAt) + ' · offered ' + num(p.x, 1) + 'R · kept ' + rfmt(p.y)
      }))], { h: 290 }) +
      '<div class="grid g4" style="margin-top:14px">' +
      tile('Heat on winners', num(ex.avgWinHeat, 2) + 'R', 'Your winners went this far against you first') +
      tile('Left on the table', num(ex.avgLossPotential, 2) + 'R', 'Average best point of the trades that lost', 'warn') +
      tile('Capture rate', pct(ex.captureRate, 0), 'Share of the favourable move you actually kept') +
      tile('Winners turned losers', ex.giveback, ex.giveback ? tx('Gave back {r}R in total', { r: num(ex.givebackR, 1) }) : 'None — good discipline', ex.giveback ? 'neg' : 'pos') +
      '</div>' +
      (ex.avgWinHeat > 0 ? '<div class="insight info" style="margin-top:12px"><div class="body"><div class="h">' + tx('Where your stop could sit') + '</div>' +
        '<div class="d">' + tx('Your winners never needed more than {max}R of room, and typically used {avg}R. A stop much wider than that is paying for space the winners never use — but check the sample is big enough before moving it.',
          { max: num(ex.maxWinHeat, 2), avg: num(ex.avgWinHeat, 2) }) + '</div></div>' +
        '<span class="badge">' + tx('{max}R max', { max: num(ex.maxWinHeat, 2) }) + '</span></div>' : '');

  return '<div class="section" style="margin-top:0"><h2>' + tx('Edge Lab') + '</h2>' +
    '<p class="lede">' + tx('Four questions the trade list can answer: what does a typical trade look like, where does this edge lead, when do you trade well, and how much of each move do you keep?') + '</p></div>' +

    '<div class="split-even" style="margin-bottom:14px">' +
    panel('R-multiple distribution', histo, 'Every trade sorted by what it returned relative to what it risked') +
    panel('The average trade', '<div class="grid g2">' +
      tile('Expectancy', rfmt(m.expectancyR), tx('{v} per trade', { v: money(m.expectancyUSD) }), cls(m.expectancyR)) +
      tile('Over 100 trades', signed(m.expectancyUSD * 100, 0), 'at your current average risk') +
      tile('Winners', rfmt(m.avgWinR), tx('{n} trades, {p} of the book', { n: m.wins, p: pct(m.winRate) }), 'pos') +
      tile('Losers', rfmt(m.avgLossR), tx('{n} trades', { n: m.losses }), 'neg') +
      '</div>' +
      '<div class="insight ' + (m.expectancyR > 0 ? 'good' : 'bad') + '" style="margin-top:12px"><div class="body">' +
      '<div class="h">' + tx(m.expectancyR > 0 ? 'Positive expectancy' : 'Negative expectancy') + '</div>' +
      '<div class="d">' + (m.expectancyR > 0
        ? tx('Each trade is worth {r} on average. The job now is repeating it enough times and not blowing up in the meantime.', { r: rfmt(m.expectancyR) })
        : tx('On this sample each trade costs you {r}. Either the setup needs a filter or the exits need work — size down until it turns.', { r: rfmt(m.expectancyR) })) +
      '</div></div></div>') +
    '</div>' +

    panel('Where this edge leads', mcControls + '<div class="divider"></div>' + mcPanel,
      tx('Your {n} results, drawn at random {p} times over. Past results, reshuffled — not a forecast.',
        { n: trades.length, p: App.mc.paths.toLocaleString() })) +

    '<div class="split-even" style="margin-top:14px">' +
    panel('By session', barList(sess.map(g => ({ label: g.label + ' (' + g.n + ')', v: g.pnl })), {}) +
      '<div class="divider"></div>' + barList(sess.map(g => ({ label: g.label, v: g.winRate, text: pct(g.winRate, 0) })), { signed: false }),
      'Top: money. Bottom: win rate. Sessions use your own clock.') +
    panel('By entry hour', slot('chartBars', [hours.map(g => ({ v: g.pnl, label: g.label.slice(0, 2), tip: g.label + ' · ' + signed(g.pnl) + ' · ' + tx('{n} trades', { n: g.n }) + ' · ' + tx('{w} win rate', { w: pct(g.winRate) }) }))], { h: 250 })) +
    '</div>' +

    '<div style="margin-top:14px">' +
    panel('How much of the move you keep', exPanel, 'Each dot is a trade: how far it ran in your favour, against what you took home') +
    '</div>';
}

/* ============================================================
   DISCIPLINE
   ============================================================ */
function viewDiscipline() {
  const trades = Store.scoped(); const acc = Store.account();
  if (!trades.length) return noTrades();
  const rep = disciplineReport(trades);
  const s = Store.settings;

  // Two equity curves: everything, and only the trades that broke no rule
  const cleanSorted = rep.clean.slice().sort(byExit);
  const mAll = metrics(trades, acc), mClean = metrics(cleanSorted, acc);
  const allPts = mAll.curve.map(p => ({ v: p.eq, label: p.at ? dshort(p.at) : 'Start', tip: 'Every trade · ' + money(p.eq, 0) }));
  const cleanPts = mClean.curve.map(p => ({ v: p.eq, label: p.at ? dshort(p.at) : 'Start', tip: 'Rule-following trades only · ' + money(p.eq, 0) }));

  const diff = mClean.equity - mAll.equity;

  const flagRows = rep.counts.map(c => ({ label: tx(c.label) + ' (' + c.n + ')', v: c.pnl }));

  const qual = rep.byQuality.map(g => ({ label: tx('Grade {n}', { n: g.key }) + ' (' + g.n + ')', v: g.avgR, text: rfmt(g.avgR) }));
  const emo = rep.byEmotion.map(g => ({ label: tx(g.key) + ' (' + g.n + ')', v: g.avgR, text: rfmt(g.avgR) }));

  const today = dkey(new Date());
  const todays = trades.filter(t => { const d = dt(t.entryAt); return d && dkey(d) === today; });
  const todayR = sum(todays.map(R));

  return '<div class="section" style="margin-top:0"><h2>' + tx('Discipline') + '</h2>' +
    '<p class="lede">' + tx('A trade is flagged when it broke one of your own rules: unplanned, taken straight after a loss, past the daily cap, past the loss limit, or wrong size.') + '</p></div>' +

    '<div class="grid g4" style="margin-bottom:14px">' +
    tile('Clean trades', pct(rep.score), tx('{clean} of {total} broke no rule', { clean: rep.clean.length, total: trades.length }),
      rep.score >= 80 ? 'pos lift' : rep.score >= 60 ? 'warn' : 'neg') +
    tile('Clean P&L', signed(rep.cleanPnl, 0), tx('{w} win rate', { w: pct(rep.cleanWinRate) }), cls(rep.cleanPnl)) +
    tile('Flagged P&L', signed(rep.dirtyPnl, 0), rep.dirty.length ? tx('{w} win rate', { w: pct(rep.dirtyWinRate) }) : 'nothing flagged', cls(rep.dirtyPnl)) +
    tile('Removing them would', signed(-rep.dirtyPnl, 0), 'change the account by this much', cls(-rep.dirtyPnl)) +
    '</div>' +

    panel('The same account without the flagged trades',
      (cleanSorted.length > 1
        ? slot('chartEquity', [cleanPts], { h: 250 }) +
          '<div class="grid g2" style="margin-top:12px">' +
          tile('Rules kept only', money(mClean.equity, 0), tx('{n} trades, {w} win rate', { n: rep.clean.length, w: pct(rep.cleanWinRate) })) +
          tile('What actually happened', money(mAll.equity, 0), tx('{n} trades, {w} win rate', { n: trades.length, w: pct(metrics(trades, acc).winRate) })) +
          '</div>'
        : '<div class="empty">' + tx('Not enough clean trades to draw a second curve yet.') + '</div>') +
      '<div class="insight ' + (diff > 0 ? 'bad' : 'good') + '" style="margin-top:14px"><div class="body">' +
      '<div class="h">' + (diff > 0 ? tx('Breaking the rules cost you {v}', { v: money(Math.abs(diff), 0) }) : tx('The flagged trades were not the problem')) + '</div>' +
      '<div class="d">' + (diff > 0
        ? tx('Following your own rules on every trade would have left the account at {clean} instead of {all}. That gap is free money, and it needs no new edge.',
            { clean: money(mClean.equity, 0), all: money(mAll.equity, 0) })
        : tx('On this sample the flagged trades did not drag the account down. Keep watching — this usually flips as the sample grows.')) +
      '</div></div><span class="badge ' + (diff > 0 ? 'neg' : 'pos') + '">' + signed(diff, 0) + '</span></div>',
      'Same trades, same order — the flagged ones simply removed') +

    '<div class="split-even" style="margin-top:14px">' +
    panel('What the flags cost', rep.counts.length ? barList(flagRows) : '<div class="empty">' + tx('No flags on record. That is the goal.') + '</div>',
      'Total P&L of the trades carrying each flag') +
    panel('Today', '<div class="grid g2">' +
      tile('Trades today', todays.length + ' / ' + s.maxTradesPerDay, todays.length >= s.maxTradesPerDay ? 'At the cap — stop here' : tx('Room for {n} more', { n: s.maxTradesPerDay - todays.length }),
        todays.length >= s.maxTradesPerDay ? 'neg' : '') +
      tile('R today', rfmt(todayR), todayR <= -Math.abs(s.dailyLossLimitR) ? 'Loss limit hit — done for the day' : tx('Limit is {r}', { r: rfmt(-Math.abs(s.dailyLossLimitR)) }),
        todayR <= -Math.abs(s.dailyLossLimitR) ? 'neg' : cls(todayR)) +
      '</div>' +
      '<div class="banner banner-info" style="margin-top:12px">' + tx('Change these limits on the Settings tab. They are the rules everything on this page is scored against.') + '</div>') +
    '</div>' +

    '<div class="split-even" style="margin-top:14px">' +
    panel('Execution grade vs result', qual.length ? barList(qual, { fmt: v => rfmt(v) }) : '<div class="empty">' + tx('Grade a few trades first.') + '</div>',
      'Average R by the grade you gave yourself') +
    panel('How you felt vs result', emo.length ? barList(emo, { fmt: v => rfmt(v) }) : '<div class="empty">' + tx('No emotional state logged yet.') + '</div>',
      'Average R by mood at entry') +
    '</div>' +

    '<div style="margin-top:14px">' +
    panel('Rule-by-rule', barList(rep.adherence.map(a => ({ label: tx(a.label), v: a.rate, text: pct(a.rate, 0) + ' (' + a.kept + '/' + a.n + ')' })), { signed: false }),
      'How often each rule held') + '</div>';
}

/* ============================================================
   RISK & SIZING
   ============================================================ */
function sizerOut(d, res, spec) {
  if (!res.valid) return '<div class="empty"><h3>' + tx('Fill in entry and stop') + '</h3><p>They have to differ — the gap between them is what sets the size.</p></div>';
  return '<div class="grid g3" style="margin-top:6px">' +
    tile('Position size', num(res.size, res.size < 10 ? 2 : 0) + ' ' + tx(res.unit), 'Rounded to what your broker accepts', 'lift') +
    tile('Cash at risk', money(res.risk, 0), tx('{p} of {v}', { p: pct(d.riskPct), v: money(d.balance, 0) })) +
    tile('Stop distance', num(res.dist, res.dist < 1 ? 5 : 2), 'points of price') +
    '</div>' +
    (res.rr ? '<div class="grid g2" style="margin-top:12px">' +
      tile('Reward : risk', num(res.rr, 2) + ' : 1', res.rr >= 2 ? 'Worth taking' : 'Thin — needs a high win rate', res.rr >= 2 ? 'pos' : 'warn') +
      tile('If target hits', signed(res.reward, 0), tx('against {v} risked', { v: money(res.risk, 0) }), 'pos') +
      '</div>' : '') +
    '<div class="banner banner-info" style="margin-top:14px">' +
    tx('Notional exposure ≈ {v}. One {one} of {market} moves {mult} per full point.',
      { v: money(res.notional, 0), one: tx(spec.unit).replace(/s$/, ''), market: tx(spec.label).toLowerCase(), mult: money(res.mult, 0) }) + '</div>';
}

function viewRisk() {
  const trades = Store.scoped(); const acc = Store.account();
  const m = metrics(trades, acc);
  const s = Store.settings;
  const last = trades.length ? trades[trades.length - 1] : null;
  const d = App.sizer || {
    balance: Math.round(m.equity || acc.start), riskPct: s.riskPct,
    type: last ? last.symbolType : 'XAU',
    entry: last ? last.entry : 3800, stop: last ? last.stop : 3780, target: last ? (last.target || '') : 3860
  };
  App.sizer = d;
  const res = sizePosition(d);
  const spec = SYMBOL_TYPES.find(x => x.id === d.type) || SYMBOL_TYPES[0];

  // Kelly on the observed win rate and payoff, then the fraction traders can actually live with
  const b = m.avgLoss ? Math.abs(m.avgWin / m.avgLoss) : 0;
  const p = m.winRate / 100;
  const kelly = b > 0 ? clamp((p * (b + 1) - 1) / b, 0, 1) * 100 : 0;
  const halfK = kelly / 2, quarterK = kelly / 4;

  const out = sizerOut(d, res, spec);
  const nf = (k, lab, val, step, hint) => '<div class="field"><label for="sz_' + k + '">' + tx(lab) + '</label>' +
    '<input id="sz_' + k + '" data-sz="' + k + '" type="number" step="' + step + '" value="' + val + '">' + (hint ? '<span class="hint">' + tx(hint) + '</span>' : '') + '</div>';


  return '<div class="section" style="margin-top:0"><h2>' + tx('Risk &amp; sizing') + '</h2>' +
    '<p class="lede">' + tx('Size the trade before you take it. Enter where you get in and where you are wrong; the rest follows.') + '</p></div>' +

    '<div class="split">' +
    panel('Position size calculator',
      '<div class="formgrid">' +
      nf('balance', 'Account balance', d.balance, '1') +
      nf('riskPct', 'Risk per trade (%)', d.riskPct, '0.1', 'Most traders stay at or below 1%') +
      '<div class="field"><label for="sz_type">' + tx('Market') + '</label><select id="sz_type" data-sz="type">' +
      SYMBOL_TYPES.map(x => '<option value="' + x.id + '"' + (x.id === d.type ? ' selected' : '') + '>' + tx(x.label) + '</option>').join('') + '</select>' +
      '<span class="hint" id="szMult">' + tx('Sets the contract size ({mult} per {one})', { mult: res.mult.toLocaleString(), one: tx(spec.unit).replace(/s$/, '') }) + '</span></div>' +
      nf('entry', 'Entry price', d.entry, 'any') +
      nf('stop', 'Stop loss', d.stop, 'any') +
      nf('target', 'Take profit', d.target, 'any', 'Optional — adds the reward:risk') +
      '</div><div id="szOut">' + out + '</div>') +

    '<div class="stack">' +
    panel('What your own record suggests',
      trades.length >= 20
        ? '<div class="stack" style="gap:0">' +
          '<div class="kv"><span class="k">' + tx('Full Kelly (never use this)') + '</span><span class="v">' + pct(kelly) + '</span></div>' +
          '<div class="kv"><span class="k">' + tx('Half Kelly') + '</span><span class="v">' + pct(halfK) + '</span></div>' +
          '<div class="kv"><span class="k">' + tx('Quarter Kelly') + '</span><span class="v pos">' + pct(quarterK) + '</span></div>' +
          '<div class="kv"><span class="k">' + tx('You are risking') + '</span><span class="v">' + pct(s.riskPct) + '</span></div>' +
          '</div>' +
          '<div class="insight ' + (s.riskPct > halfK ? 'warn' : 'good') + '" style="margin-top:12px"><div class="body">' +
          '<div class="h">' + tx(s.riskPct > halfK ? 'You are sized above half Kelly' : 'Your sizing is conservative') + '</div>' +
          '<div class="d">' + tx('Kelly is the bet size that grows an account fastest given a win rate of {w} and winners {b}× the size of losers. It is also violently swingy, so traders use a quarter of it. On {n} trades this is an estimate, not a target.',
            { w: pct(m.winRate), b: num(b, 2), n: trades.length }) + '</div></div></div>'
        : '<div class="empty"><h3>' + tx('Needs about 20 trades') + '</h3><p>' + tx('Sizing maths built on {n} trades would be guessing. Keep logging.', { n: trades.length }) + '</p></div>',
      'Kelly sizing, from your win rate and payoff') +
    panel('Your rules', '<div class="stack" style="gap:0">' +
      '<div class="kv"><span class="k">' + tx('Risk per trade') + '</span><span class="v">' + pct(s.riskPct) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Daily loss limit') + '</span><span class="v">' + rfmt(-Math.abs(s.dailyLossLimitR)) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Max trades a day') + '</span><span class="v">' + s.maxTradesPerDay + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Cooldown after a loss') + '</span><span class="v">' + s.revengeMinutes + ' min</span></div>' +
      '</div><button class="btn btn-sm" data-go="settings" style="margin-top:12px">' + tx('Edit rules') + '</button>') +
    (trades.length ? panel('Worst case, at this size',
      '<div class="stack" style="gap:0">' +
      '<div class="kv"><span class="k">' + tx('Longest losing run so far') + '</span><span class="v neg">' + tx('{n} trades', { n: m.maxLossStreak }) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('That run at {p}', { p: pct(s.riskPct) }) + '</span><span class="v neg">' + pct(-(1 - Math.pow(1 - s.riskPct / 100, m.maxLossStreak)) * 100) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Deepest drawdown so far') + '</span><span class="v neg">' + money(m.maxDD, 0) + ' (' + pct(m.maxDDpct) + ')</span></div>' +
      '</div>') : '') +
    '</div></div>';
}

/* ============================================================
   TRADE REVIEW
   ============================================================ */
function viewReview() {
  const trades = Store.scoped().slice().reverse();
  if (!trades.length) return noTrades();
  if (!App.reviewId || !trades.find(t => t.id === App.reviewId)) App.reviewId = trades[0].id;
  const t = Store.trades.find(x => x.id === App.reviewId);
  const r = R(t);

  const picker = '<div class="filters"><label class="eyebrow">Reviewing</label>' +
    '<select id="reviewPick" style="min-width:280px">' + trades.map(x =>
      '<option value="' + x.id + '"' + (x.id === App.reviewId ? ' selected' : '') + '>' +
      dshort(x.entryAt) + ' · ' + esc(x.symbol) + ' ' + tx(x.direction === 'long' ? 'Long' : 'Short') + ' · ' + signed(x.pnl, 0) + ' (' + rfmt(R(x)) + ')</option>').join('') +
    '</select>' +
    '<button class="btn btn-sm" data-act="edit" data-id="' + t.id + '">' + tx('Edit the numbers') + '</button></div>';

  const head = '<div class="panel panel-pad" style="margin-bottom:14px">' +
    '<div class="panel-head"><div class="rowflex">' +
    '<span class="pill pill-sym" style="font-size:13px">' + esc(t.symbol) + '</span>' +
    '<span class="pill ' + (t.direction === 'long' ? 'pill-long' : 'pill-short') + '">' + tx(t.direction === 'long' ? 'Long' : 'Short') + '</span>' +
    '<span class="pill ' + (t.pnl > 0 ? 'pill-win' : t.pnl < 0 ? 'pill-loss' : 'pill-be') + '">' + tx(t.pnl > 0 ? 'Win' : t.pnl < 0 ? 'Loss' : 'Flat') + '</span>' +
    (t.setup ? '<span class="pill pill-tag">' + esc(t.setup) + '</span>' : '') +
    (t.planned ? '' : '<span class="pill pill-warn">Not in the plan</span>') +
    '</div><span class="mut">' + dlong(t.entryAt) + '</span></div>' +
    '<div class="grid g5">' +
    tile('Entry', num(t.entry, t.entry < 10 ? 4 : 2), t.entryAt ? t.entryAt.slice(11) : '') +
    tile('Exit', t.exit ? num(t.exit, t.exit < 10 ? 4 : 2) : '—', t.exitAt ? t.exitAt.slice(11) : '') +
    tile('Stop', num(t.stop, t.stop < 10 ? 4 : 2), tx('Risked {v}', { v: money(t.risk, 0) })) +
    tile('P&L', signed(t.pnl), tx('on {v} size', { v: t.size || '—' }), cls(t.pnl)) +
    tile('R-multiple', rfmt(r), t.mfeR ? tx('offered {v}R', { v: num(t.mfeR, 1) }) : '', cls(r)) +
    '</div></div>';

  const shot = (key, label, tone) =>
    '<div><div class="eyebrow" style="color:' + tone + ';margin-bottom:8px">' + tx(label) + '</div>' +
    (t.shots[key]
      ? '<div class="shot-frame" data-shot-load="' + esc(t.id + ':' + key) + '" data-shot-alt="' + esc(label) + ' chart">' +
        '<div class="shot-missing">Loading…</div></div>' +
        '<button class="btn btn-sm btn-danger" data-shot-del="' + key + '" style="margin-top:8px">' + tx('Remove') + '</button>'
      : '<label class="btn btn-sm" style="width:100%;justify-content:center">' + tx('Add screenshot') +
        '<input type="file" accept="image/*" data-shot="' + key + '" hidden></label>') + '</div>';

  const ta = (name, label, ph) => '<div class="field span3"><label for="rv_' + name + '">' + tx(label) + '</label>' +
    '<textarea id="rv_' + name + '" data-rv="' + name + '" placeholder="' + esc(tx(ph)) + '">' + esc(t[name]) + '</textarea></div>';

  return picker + head +
    '<div class="split-even" style="margin-bottom:14px">' +
    panel('Charts', '<div class="split-even">' + shot('pre', 'Before the entry', 'var(--s1)') + shot('post', 'After the exit', 'var(--s4)') + '</div>',
      'Mark them up in your charting tool, then drop them in') +
    panel('Read and result', '<div class="stack" style="gap:0">' +
      '<div class="kv"><span class="k">' + tx('Market read') + '</span><span class="v">' + esc(tx(CONTEXT_LABEL[t.context] || t.context)) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Mood at entry') + '</span><span class="v">' + esc(tx(t.emotion)) + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Execution grade') + '</span><span class="v">' + t.quality + ' / 5</span></div>' +
      '<div class="kv"><span class="k">' + tx('Worst point against') + '</span><span class="v">' + (t.maeR == null ? '—' : num(t.maeR, 2) + 'R') + '</span></div>' +
      '<div class="kv"><span class="k">' + tx('Best point in favour') + '</span><span class="v">' + (t.mfeR == null ? '—' : num(t.mfeR, 2) + 'R') + '</span></div>' +
      '</div>' +
      '<div class="divider"></div><div class="eyebrow" style="margin-bottom:8px">Rules kept</div>' +
      '<div class="rowflex">' + ADHERENCE_KEYS.map(([k, lab]) =>
        '<span class="pill ' + (t.adherence[k] !== false ? 'pill-win' : 'pill-loss') + '">' + (t.adherence[k] !== false ? '✓' : '✕') + ' ' + esc(tx(lab)) + '</span>').join('') + '</div>') +
    '</div>' +

    '<form id="reviewForm" class="panel panel-pad">' +
    '<fieldset class="fieldset"><legend>' + tx('Before the trade') + '</legend><div class="formgrid">' +
    ta('analysis', 'What you saw in the market', 'Higher timeframe was in a clean uptrend, price swept the London low and left an imbalance behind…') +
    ta('plan', 'The plan you wrote', 'One entry at the 50% of the gap, stop under the sweep, target the previous high. No re-entry.') +
    ta('setupNotes', 'Levels and setup detail', 'Gap 3712–3720, sweep low 3696, target 3760.') +
    '</div></fieldset>' +
    '<fieldset class="fieldset"><legend>' + tx('After the trade') + '</legend><div class="formgrid">' +
    ta('execReview', 'How closely you followed it', 'Entered on the first touch instead of waiting for the close — got a better price but it was luck, not process.') +
    ta('reflection', 'What was going through your head', 'Comfortable the whole way. Nearly moved the stop up early out of impatience.') +
    ta('lesson', 'The one thing to carry forward', 'Let the first target run when the trend is this clean.') +
    '</div></fieldset>' +
    '<div class="rowflex" style="justify-content:flex-end"><span class="mut" style="margin-right:auto" id="revSaved"></span>' +
    '<button type="submit" class="btn btn-primary">' + tx('Save review') + '</button></div></form>';
}

/* ============================================================
   SETTINGS
   ============================================================ */
function viewSettings() {
  const s = Store.settings;
  const accRows = s.accounts.map(a =>
    '<tr data-acc="' + a.id + '">' +
    '<td><input type="text" data-af="name" value="' + esc(a.name) + '"></td>' +
    '<td><input type="number" step="any" data-af="start" value="' + a.start + '"></td>' +
    '<td><input type="number" step="any" data-af="savings" value="' + (a.savings || 0) + '"></td>' +
    '<td><input type="number" step="any" data-af="goal" value="' + (a.goal || 0) + '"></td>' +
    '<td class="r">' + (s.accounts.length > 1 ? '<button class="btn btn-sm btn-danger" data-accdel="' + a.id + '">' + tx('Remove') + '</button>' : '<span class="mut">—</span>') + '</td>' +
    '</tr>').join('');

  return '<div class="section" style="margin-top:0"><h2>' + tx('Settings') + '</h2>' +
    '<p class="lede">' + tx('Accounts, the rules your trades are scored against, and your data.') + '</p></div>' +

    panel('Accounts', '<div class="tw"><table><thead><tr><th>' + tx('Name') + '</th><th>' + tx('Starting balance') + '</th><th>' + tx('Set aside') + '</th><th>' + tx('Goal') + '</th><th></th></tr></thead>' +
      '<tbody>' + accRows + '</tbody></table></div>' +
      '<div class="rowflex" style="margin-top:12px"><button class="btn btn-sm" id="addAcc">' + tx('Add account') + '</button>' +
      '<span class="mut">' + tx('Every trade belongs to one account; the dashboard shows one at a time.') + '</span></div>') +

    '<div style="height:14px"></div>' +
    panel('Trading rules', '<div class="formgrid">' +
      '<div class="field"><label for="st_risk">' + tx('Risk per trade (%)') + '</label><input id="st_risk" data-st="riskPct" type="number" step="0.1" min="0.1" value="' + s.riskPct + '"></div>' +
      '<div class="field"><label for="st_limit">' + tx('Daily loss limit (R)') + '</label><input id="st_limit" data-st="dailyLossLimitR" type="number" step="0.5" min="0.5" value="' + s.dailyLossLimitR + '">' +
      '<span class="hint">' + tx('Trades taken after this is hit get flagged') + '</span></div>' +
      '<div class="field"><label for="st_max">' + tx('Max trades a day') + '</label><input id="st_max" data-st="maxTradesPerDay" type="number" step="1" min="1" value="' + s.maxTradesPerDay + '"></div>' +
      '<div class="field"><label for="st_rev">' + tx('Cooldown after a loss (minutes)') + '</label><input id="st_rev" data-st="revengeMinutes" type="number" step="5" min="0" value="' + s.revengeMinutes + '">' +
      '<span class="hint">' + tx('Entering inside this window flags the trade') + '</span></div>' +
      '<div class="field span2"><label for="st_setups">' + tx('Your setups') + '</label><input id="st_setups" data-st="setups" type="text" value="' + esc(s.setups.join(', ')) + '">' +
      '<span class="hint">' + tx('Comma separated — these fill the dropdown on the trade form') + '</span></div>' +
      '</div>', 'Changing these re-scores every trade on the Discipline tab') +

    '<div style="height:14px"></div>' +
    panel('Language', '<div class="formgrid">' +
      '<div class="field"><label for="st_lang">' + tx('Interface language') + '</label>' +
      '<select id="st_lang" data-lang-select>' +
      '<option value="en"' + (LANG === 'en' ? ' selected' : '') + '>English</option>' +
      '<option value="tr"' + (LANG === 'tr' ? ' selected' : '') + '>Türkçe</option>' +
      '</select></div></div>' +
      '<div class="banner banner-info" style="margin-top:12px">' +
      tx('Trading terms stay in English either way — R-multiple, profit factor, drawdown — because that is what the material you read next will use.') +
      '</div>', 'EN / TR') +

    '<div style="height:14px"></div>' +
    panel('Backups', '<div class="stack">' +
      '<div class="banner ' + (Store.lsOk ? 'banner-info' : 'banner-demo') + '"><span class="grow">' +
      (Store.lsOk
        ? tx('{n} trades and their screenshots are stored in this browser only — nothing is sent anywhere. Clearing site data, switching browser or reinstalling loses them, so export regularly.',
            { n: '<strong>' + tx('{n} trades', { n: Store.trades.length }) + '</strong>' })
        : '<strong>' + tx('This browser will not store anything.') + '</strong> ' +
          tx('A page opened straight from disk is blocked from saving in some browsers, so nothing here survives a reload. Serve the folder over http instead: open Terminal, cd into the folder, run {cmd}, then visit localhost:8000.',
            { cmd: '<code>python3 -m http.server 8000</code>' })) +
      '</span></div>' +
      (Store.lsOk ? '<div class="stack" style="gap:0">' +
        '<div class="kv"><span class="k">' + tx('Last backup') + '</span><span class="v">' +
        (Store.meta.lastExport ? dlong(new Date(Store.meta.lastExport).toISOString()) : tx('never')) + '</span></div>' +
        '<div class="kv"><span class="k">' + tx('Changes since then') + '</span><span class="v ' +
        (Store.unsaved() > 20 ? 'warn' : '') + '">' + Store.unsaved() + '</span></div>' +
        '</div>' : '') +
      '<div class="rowflex">' +
      '<button class="btn btn-primary" id="btnExport2">' + tx('Export backup') + '</button>' +
      '<button class="btn" id="btnImport2">' + tx('Import backup') + '</button>' +
      '<button class="btn" id="btnExportCsv">' + tx('Export CSV') + '</button>' +
      '<button class="btn btn-danger" id="btnWipe" style="margin-left:auto">' + tx('Delete every trade') + '</button>' +
      '</div></div>',
      'The backup file is the only way trades reach another machine') +

    '<div style="height:14px"></div>' +
    panel('Moving to another computer', '<ol class="steps">' +
      '<li>' + tx('Here: press {btn}. You get one {ext} file holding every trade, your accounts and rules, and every screenshot.',
        { btn: '<em>' + tx('Export backup') + '</em>', ext: '<code>.json</code>' }) + '</li>' +
      '<li>' + tx('There: open the same page — the hosted link, or {file} from the folder — go to Settings and press {btn}.',
        { file: '<code>tradetracker.html</code>', btn: '<em>' + tx('Import backup') + '</em>' }) + '</li>' +
      '<li>' + tx('Choose Replace everything. The second machine becomes an exact copy: same trades, same ids, same screenshots, same rules.') + '</li>' +
      '</ol>' +
      '<div class="divider"></div>' +
      '<p class="mut" style="margin:0;font-size:12.5px">' +
      tx('There is no automatic sync. Both machines keep editing their own copy after an import, so treat one as the machine you log on and the other as the one you read on — or re-export after every session. Merge exists for the case where both have trades the other lacks; it matches on trade id, so a trade edited in two places keeps whichever version was imported last.') +
      '</p>',
      'Export here, import there, pick Replace');
}

/* ============================================================
   ROUTER
   ============================================================ */
const VIEWS = {
  dashboard: viewDashboard, new: viewNew, history: viewHistory, analysis: viewAnalysis,
  edge: viewEdge, discipline: viewDiscipline, risk: viewRisk, review: viewReview, settings: viewSettings
};
</script>
