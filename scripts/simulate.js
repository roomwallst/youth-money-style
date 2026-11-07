/*
 * 분류 알고리즘 점검용 무작위 시뮬레이션
 * 실행: npm run simulate   (건수 변경: node scripts/simulate.js 200000)
 *
 * ※ 실제 참가자 분포가 아닙니다. 분류 조건이 지나치게 좁거나 넓은지 점검하는 용도입니다.
 *
 *  [1] 균등 무작위 : 모든 문항에서 A~D를 같은 확률(25%)로 고름. Q5는 10% 확률로 건너뜀.
 *  [2] 상관 반영   : 한 사람의 '생활 여건'과 '위험 선호'를 먼저 정하고, 관련 문항 응답이
 *                   서로 비슷한 방향으로 나오도록 만든 가상 응답. (참고용 가정)
 */
'use strict';
const { classify, TYPE } = require('../scoring.js');

const N = (require.main === module && Number(process.argv[2])) || 100000;
const NAMES = { prepare: '준비우선형', stable: '안정중시형', balance: '분산안정형', growth: '성장탐색형', active: '적극탐색형' };
const ORDER = ['prepare', 'stable', 'balance', 'growth', 'active'];

// 재현 가능한 난수 (mulberry32)
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniformAnswers(r) {
  const a = [];
  for (let i = 0; i < 15; i++) a.push(Math.floor(r() * 4));
  if (r() < 0.1) a[4] = null;
  return a;
}

// 잠재 성향 x(0~1) 주변으로 응답을 뽑음
function near(r, x) {
  const v = Math.round(x * 3 + (r() + r() + r() - 1.5) * 1.4);
  return Math.max(0, Math.min(3, v));
}
function correlatedAnswers(r) {
  const life = r(), risk = r(), habit = r();
  const a = uniformAnswers(r);           // 개인화 문항 등은 균등
  a[2] = near(r, life); a[3] = near(r, life); a[4] = r() < 0.1 ? null : near(r, life);
  a[1] = near(r, habit); a[6] = near(r, habit); a[8] = near(r, habit); a[12] = near(r, habit);
  a[10] = near(r, risk); a[11] = near(r, risk);
  return a;
}

function run(label, gen, seed, opts) {
  opts = opts || {};
  const r = rng(seed);
  const count = {}; let partial = 0, gap = 0;
  ORDER.forEach((k) => { count[k] = 0; });
  for (let i = 0; i < N; i++) {
    const c = classify(gen(r));
    count[c.type]++;
    if (c.partial) partial++;
    if (c.readinessGap && c.type !== TYPE.PREPARE) gap++;
  }
  if (opts.quiet) return count;
  console.log('\n' + label + ' (' + N.toLocaleString() + '건)');
  ORDER.forEach((k) => {
    const pct = (count[k] / N * 100);
    console.log('  ' + NAMES[k] + '  ' + String(count[k]).padStart(7) + '건  ' + pct.toFixed(1).padStart(5) + '%  ' + '█'.repeat(Math.round(pct / 2)));
  });
  console.log('  (Q5 건너뜀 ' + (partial / N * 100).toFixed(1) + '% · 비상금 보완 행동이 추가된 분산안정형 ' + (gap / N * 100).toFixed(1) + '%)');
  return count;
}

if (require.main === module) {
  console.log('※ 알고리즘 점검용 가상 시뮬레이션이며 실제 참가자 분포가 아닙니다.');
  run('[1] 균등 무작위 응답', uniformAnswers, 20261107);
  run('[2] 상관 반영 가상 응답', correlatedAnswers, 7);
}
module.exports = { run, uniformAnswers, correlatedAnswers, rng };
