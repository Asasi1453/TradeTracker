/* TradeTracker — checks the metrics engine against hand-computed values.
 *
 *   node test/metrics.test.js
 *
 * It loads src/03-core.js and src/04-metrics.js (stripping their <script>
 * wrapper) and stubs the three browser globals they touch at load time.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const root = path.join(__dirname, '..');
const strip = f => fs.readFileSync(path.join(root, 'src', f), 'utf8')
  .split('\n').slice(1, -2).join('\n').replace('"use strict";', '');

const ctx = {
  console,
  window: {},
  localStorage: { getItem: () => null, setItem: () => {} },
  document: {
    querySelector: () => ({ textContent: '', title: '', classList: { add() {}, remove() {} } }),
    querySelectorAll: () => []
  },
  setTimeout, clearTimeout, Date, Math, JSON, Map, Set, Float64Array, Number, String, Object, Array, isNaN, process
};
ctx.global = ctx;
vm.createContext(ctx);
// `function` declarations land on the context; `const` arrows do not, so the
// last line hands the ones this test uses back through a var.
vm.runInContext(
  strip('02b-lang.js') + '\n' + strip('03-core.js') + '\n' + strip('04-metrics.js') +
  '\nvar __api = { sum, mean, clamp, R, normalizeTrade, metrics, group, rHistogram,' +
  ' excursion, disciplineReport, monteCarlo, sizePosition, insights, demoTrades, byExit };',
  ctx);
const { sum, mean, clamp, R, normalizeTrade, metrics, group, rHistogram, excursion,
        disciplineReport, monteCarlo, sizePosition, insights, demoTrades, byExit } = ctx.__api;

// --- hand-checkable fixture: 5 trades, risk 100 each
const T = [
  {risk:100, pnl: 200, entryAt:'2026-01-05T09:00', exitAt:'2026-01-05T10:00', setup:'A', direction:'long', symbolType:'FX', symbol:'X', quality:4, planned:true, adherence:{entry:1,stop:1,target:1,sizing:1,rules:1}, mfeR:2.5, maeR:0.3},
  {risk:100, pnl:-100, entryAt:'2026-01-06T09:00', exitAt:'2026-01-06T10:00', setup:'A', direction:'long', symbolType:'FX', symbol:'X', quality:3, planned:true, adherence:{entry:1,stop:1,target:1,sizing:1,rules:1}, mfeR:0.8, maeR:1},
  {risk:100, pnl:-100, entryAt:'2026-01-06T10:30', exitAt:'2026-01-06T11:00', setup:'B', direction:'short', symbolType:'FX', symbol:'Y', quality:2, planned:false, adherence:{entry:0,stop:1,target:1,sizing:1,rules:0}, mfeR:0.2, maeR:1},
  {risk:100, pnl: 300, entryAt:'2026-01-07T09:00', exitAt:'2026-01-07T12:00', setup:'B', direction:'short', symbolType:'FX', symbol:'Y', quality:5, planned:true, adherence:{entry:1,stop:1,target:1,sizing:1,rules:1}, mfeR:3.6, maeR:0.2},
  {risk:100, pnl:-100, entryAt:'2026-01-08T09:00', exitAt:'2026-01-08T10:00', setup:'A', direction:'long', symbolType:'FX', symbol:'X', quality:3, planned:true, adherence:{entry:1,stop:1,target:1,sizing:1,rules:1}, mfeR:0.5, maeR:1}
].map(normalizeTrade);

const acc = {start:10000};
const m = metrics(T, acc);
const eq = (label, got, want, tol=1e-6) => {
  const ok = Math.abs(got-want) <= tol;
  console.log((ok?'PASS':'FAIL')+'  '+label+'  got='+got+' want='+want);
  if(!ok) process.exitCode = 1;
};
eq('n', m.n, 5);
eq('winRate', m.winRate, 40);
eq('gross profit', m.gp, 500);
eq('gross loss', m.gl, 300);
eq('net pnl', m.pnl, 200);
eq('profit factor', m.pf, 500/300, 1e-9);
eq('expectancy R', m.expectancyR, (2-1-1+3-1)/5);   // = 0.4
eq('avg win R', m.avgWinR, 2.5);
eq('avg loss R', m.avgLossR, -1);
eq('wl ratio', m.wlRatio, 250/100);
eq('equity', m.equity, 10200);
eq('return %', m.returnPct, 2);
// equity path: 10000,10200,10100,10000,10300,10200 -> peak 10200 then 10000 => dd 200; later peak 10300 -> 10200 dd 100
eq('max drawdown', m.maxDD, 200);
eq('max losing streak', m.maxLossStreak, 2);
eq('max winning streak', m.maxWinStreak, 1);
eq('current streak', m.curStreak, 1);
console.log('   current kind:', m.curKind, '(expect loss)');
eq('largest win', m.largestWin, 300);
eq('largest loss', m.largestLoss, -100);

// R histogram
const h = rHistogram(T);
const bin = l => h.find(b=>b.label===l).n;
eq('bin -1..0', bin('-1 to 0R'), 3);
eq('bin 2..3', bin('2 to 3R'), 1);
eq('bin 3R+', bin('3R +'), 1);
eq('hist total', h.reduce((a,b)=>a+b.n,0), 5);

// grouping
const g = group(T, t=>t.setup);
eq('groups', g.length, 2);
const A = g.find(x=>x.key==='A'), B = g.find(x=>x.key==='B');
eq('setup A pnl', A.pnl, 0);
eq('setup A winRate', A.winRate, 100/3, 1e-9);
eq('setup B pnl', B.pnl, 200);

// discipline: trade 3 is unplanned + rules broken + revenge (entry 10:30 is 30min after trade 2 exit 10:00, loss)
const rep = disciplineReport(T, {revengeMinutes:60, maxTradesPerDay:3, dailyLossLimitR:2});
eq('clean trades', rep.clean.length, 4);
eq('dirty trades', rep.dirty.length, 1);
eq('dirty pnl', rep.dirtyPnl, -100);
eq('clean pnl', rep.cleanPnl, 300);
eq('score', rep.score, 80);
const f3 = rep.flagMap.get(T[2].id).map(f=>f.id).sort();
console.log('   flags on trade 3:', f3.join(','), '(expect revenge,rules,unplanned)');
if (f3.join(',') !== 'revenge,rules,unplanned') { console.log('FAIL flags'); process.exitCode=1; }

// daily loss limit: 2 losses on Jan 6 => -2R reached after trade 3; a 3rd that day would be flagged
const T2 = T.concat([normalizeTrade({risk:100,pnl:-100,entryAt:'2026-01-06T14:00',exitAt:'2026-01-06T15:00',setup:'A',planned:true,adherence:{entry:1,stop:1,target:1,sizing:1,rules:1}})]);
const rep2 = disciplineReport(T2, {revengeMinutes:60, maxTradesPerDay:3, dailyLossLimitR:2});
const f6 = rep2.flagMap.get(T2[5].id).map(f=>f.id);
console.log('   flags on the 4th Jan-6 trade:', f6.join(',') || '(none)', '(expect pastlimit)');
if (f6.indexOf('pastlimit') < 0) { console.log('FAIL pastlimit'); process.exitCode=1; }

// excursion
const ex = excursion(T);
eq('excursion covered', ex.covered, 5);
eq('avg win heat', ex.avgWinHeat, (0.3+0.2)/2, 1e-9);
eq('avg loss potential', ex.avgLossPotential, (0.8+0.2+0.5)/3, 1e-9);
eq('giveback count', ex.giveback, 0);

// position sizing: gold, 10000 balance, 1% risk, 20-point stop => 500/(20*100)=0.25 lots
const sz = sizePosition({balance:10000, riskPct:1, type:'XAU', entry:3800, stop:3780, target:3860});
eq('size gold', sz.size, 0.05, 1e-12);
eq('risk cash', sz.risk, 100);
eq('rr', sz.rr, 3);
const sz2 = sizePosition({balance:10000, riskPct:1, type:'STK', entry:100, stop:95});
eq('size stock', sz2.size, 20);
const sz3 = sizePosition({balance:10000, riskPct:2, type:'FX', entry:1.1000, stop:1.0950});
eq('size fx lots', sz3.size, 200/(0.005*100000), 1e-9);

// monte carlo sanity
const mc = monteCarlo(m.rs, {paths:400, horizon:50, riskPct:1, start:10000, ruinPct:20});
console.log('   MC median', Math.round(mc.median), 'p05', Math.round(mc.p05), 'p95', Math.round(mc.p95), 'ruin%', mc.ruinProb.toFixed(1));
if (!(mc.p05 < mc.median && mc.median < mc.p95)) { console.log('FAIL mc ordering'); process.exitCode=1; }
if (mc.bands.length !== 51) { console.log('FAIL mc bands'); process.exitCode=1; }

// demo data integrity
const d = demoTrades();
console.log('   demo trades:', d.length, 'net', Math.round(sum(d.map(t=>t.pnl))), 'accounts', [...new Set(d.map(t=>t.account))].join('/'));
const dm = metrics(d.filter(t=>t.account==='fx').sort(byExit), {start:5000});
console.log('   demo FX: n='+dm.n, 'win%='+dm.winRate.toFixed(1), 'PF='+dm.pf.toFixed(2), 'expR='+dm.expectancyR.toFixed(2), 'maxDD='+Math.round(dm.maxDD), 'equity='+Math.round(dm.equity));
const drep = disciplineReport(d.filter(t=>t.account==='fx'));
console.log('   demo discipline score', drep.score.toFixed(0)+'%', 'flagged pnl', Math.round(drep.dirtyPnl));
console.log('   insights:', insights(d.filter(t=>t.account==='fx').sort(byExit), dm).length);
