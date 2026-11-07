/*
 * 가상 참가자 사례별 분류 결과 보고
 * 실행: npm run cases
 */
'use strict';
const { classify, HORIZON_LABEL } = require('../scoring.js');
const results = require('../results.js');
const CASES = require('../tests/cases.js');

const toArr = (s) => s.replace(/\s/g, '').split('').map((c) => (c === '-' ? null : 'ABCD'.indexOf(c)));
console.log('※ 가상 사례입니다. 교육용 잠정 규칙의 동작을 확인하기 위한 것입니다.\n');
for (const c of CASES) {
  const a = toArr(c.answers);
  const r = classify(a);
  const res = results.buildResult(a, r);
  const s = r.scores;
  console.log('[' + c.id + '] ' + c.title);
  console.log('  응답      : ' + c.answers.replace(/\s/g, '').split('').map((x, i) => 'Q' + (i + 1) + x).join(' '));
  console.log('  점수      : P=' + s.P + ' H=' + s.H + ' T=' + s.T + ' D=' + HORIZON_LABEL[s.D] + ' E=' + s.E + ' · 준비 단계=' + r.stage);
  console.log('  결과      : ' + res.name + (r.type === c.expect ? '' : '  ✘ 기대: ' + c.expect));
  console.log('  분류 이유 : ' + r.reason);
  console.log('  추천 행동 : ' + res.actions.map((x, i) => (i + 1) + ') ' + x.text + (x.chosen ? '★' : '')).join('  '));
  const ap = res.assetPlan;
  const ST = { build: '생활비·비상금 우선', time: '사용 시기 고려', keep: '안전망 유지' };
  console.log('  ① 지금 준비 : [' + ST[ap.now.status] + '] ' + ap.now.items.map((x) => x.name).join(', '));
  console.log('     점검     : ' + ap.now.checks.join(' / '));
  console.log('  ② 더 알아볼 : ' + ap.learn.items.map((x) => x.name).join(', ') + (ap.learn.caution ? '  (공부용 안내 표시)' : ''));
  if (res.personalLines.length > 1) console.log('  추가 안내 : ' + res.personalLines.slice(1).join(' / '));
  console.log('  확인 포인트: ' + c.point + '\n');
}
