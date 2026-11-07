// Node.js 내장 테스트 도구로 실행: npm test
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { QUESTIONS } = require('../questions.js');
const scoring = require('../scoring.js');
const results = require('../results.js');
const CASES = require('./cases.js');
const sim = require('../scripts/simulate.js');
const { classify, computeScores, TYPE, HORIZON } = scoring;

// 문자 A~D 로 응답을 적는 도우미. '-' = 건너뜀(null). 순서: Q1 ~ Q15
function ans(str) {
  const arr = str.replace(/\s/g, '').split('').map((c) => (c === '-' ? null : 'ABCD'.indexOf(c)));
  assert.equal(arr.length, 15, '응답 길이 오류: ' + str);
  return arr;
}
const typeOf = (str) => classify(ans(str)).type;
const build = (a) => results.buildResult(a, classify(a));

/* ───── 데이터 구조 ───── */
test('질문은 정확히 15개, 모두 4지선다', () => {
  assert.equal(QUESTIONS.length, 15);
  QUESTIONS.forEach((q, i) => {
    assert.equal(q.id, 'Q' + (i + 1));
    assert.equal(q.options.length, 4, q.id);
    q.options.forEach((o) => assert.ok(o.trim().length > 0));
  });
});

test('수정된 Q3·Q6·Q7 문구', () => {
  assert.equal(QUESTIONS[2].text, '현재 생활비를 마련하고 관리하는 상황은 어떤가요?');
  assert.equal(QUESTIONS[5].text, '앞으로 마련할 돈을 언제 사용할 계획인가요?');
  assert.equal(QUESTIONS[5].options[3], '아직 구체적인 목표나 시기를 정하지 않았다');
  assert.equal(QUESTIONS[5].options[2], '5년 이후');
  assert.match(QUESTIONS[6].text, /쓰지 않는 물건/);
  assert.match(QUESTIONS[6].options[2], /중고/);
  // Q3 선택지에 '소득·수입' 표현이 없어야 함 (근로소득 없는 참여자 배려)
  QUESTIONS[2].options.forEach((o) => assert.ok(!/소득|수입|월급/.test(o), o));
});

test('건너뛰기는 Q5에만 있다', () => {
  assert.deepEqual(QUESTIONS.filter((q) => q.skippable).map((q) => q.id), ['Q5']);
});

test('잘못된 응답은 거부한다', () => {
  assert.throws(() => classify(ans('-BCCCDCCCCCCCCC')));
  assert.throws(() => classify([0, 1, 2]));
  const bad = ans('BCCCCDCCCCCCCCC'); bad[3] = 4;
  assert.throws(() => classify(bad));
});

/* ───── 점수 영역 ───── */
test('영역 점수 계산 (P, H, T, D, E)', () => {
  //                     Q1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
  const s = computeScores(ans('A D C B D C B A C A  D  C  B  A  A'));
  assert.equal(s.P, 2 + 1 + 3);
  assert.equal(s.H, 3 + 2 + 2);   // Q7=B → 2점
  assert.equal(s.T, 3 + 2);
  assert.equal(s.D, HORIZON.LONG);
  assert.equal(s.E, 1);
});

test('Q7 점수: A0 · B2 · C2 · D3 (가격 비교와 중고거래는 같은 점수)', () => {
  const h = (q7) => { const a = ans('B A C C C C A C A B C C C B B'); a[6] = q7; return computeScores(a).H; };
  assert.deepEqual([0, 1, 2, 3].map(h), [0, 2, 2, 3]);
});

test('Q6은 점수가 아닌 구분값: 단기·중기·장기·미정', () => {
  const d = (q6) => { const a = ans('B C C C C A C C C B C C C B B'); a[5] = q6; return computeScores(a).D; };
  assert.deepEqual([0, 1, 2, 3].map(d), ['short', 'mid', 'long', 'undecided']);
});

test('Q5 건너뛰면 0점이 아니라 Q3·Q4 평균으로 채운다', () => {
  const s = computeScores(ans('B C D D - D C C C A C C C A A'));
  assert.equal(s.P, 3 + 3 + 3);
  assert.equal(s.pEstimated, true);
});

/* ───── 가상 참가자 7명 (+보조 사례) ───── */
for (const c of CASES) {
  test('사례 ' + c.id + '. ' + c.title + ' → ' + results.TYPES[c.expect].name, () => {
    const a = ans(c.answers);
    const r = classify(a);
    assert.equal(r.type, c.expect, r.reason);
    if (c.expectGap) {
      assert.equal(r.readinessGap, true);
      const res = results.buildResult(a, r);
      assert.match(res.actions[0].text, /비상금/);
      assert.ok(res.personalLines.includes(results.GAP_NOTE));
    }
  });
}

test('사례 D·E: 중고거래를 하든 안 하든 소비 판단이 같으면 H 점수가 같다', () => {
  const withUsed = ans('C C C C D B C C C B B C C B B');
  const withoutUsed = withUsed.slice(); withoutUsed[6] = 1;
  assert.equal(computeScores(withUsed).H, computeScores(withoutUsed).H);
  assert.equal(classify(withUsed).type, classify(withoutUsed).type);
});

/* ───── 핵심 원칙 ───── */
test('Q1 소득만 바꿔서는 유형이 바뀌지 않는다 (Q8, Q10, Q14, Q15도 동일)', () => {
  const r = sim.rng(1);
  for (let n = 0; n < 3000; n++) {
    const base = sim.uniformAnswers(r);
    const t0 = classify(base).type;
    for (const idx of [0, 7, 9, 13, 14]) {
      for (let v = 0; v < 4; v++) {
        const a = base.slice(); a[idx] = v;
        assert.equal(classify(a).type, t0, 'Q' + (idx + 1) + '=' + v);
      }
    }
  }
});

test('Q6 미정(D)은 그 자체로 준비우선형을 만들지 않고, 장기로도 보지 않는다', () => {
  const r = sim.rng(2);
  for (let n = 0; n < 20000; n++) {
    const a = sim.uniformAnswers(r);
    a[5] = 3; // 미정
    const t = classify(a).type;
    assert.ok(t !== TYPE.ACTIVE && t !== TYPE.GROWTH, '미정인데 탐색형');
    // 미정 대신 다른 시기를 골랐을 때 준비우선형이 아니라면, 미정이어도 준비우선형이 아니어야 함
    for (let v = 0; v < 3; v++) {
      const b = a.slice(); b[5] = v;
      if (classify(b).type !== TYPE.PREPARE) assert.notEqual(t, TYPE.PREPARE);
    }
  }
});

test('탐색형은 장기(Q6=C)에서만 나온다', () => {
  for (const q6 of [0, 1, 3]) {
    const a = ans('D D D D D C D D D D D D D D D'); a[5] = q6;
    assert.ok(![TYPE.ACTIVE, TYPE.GROWTH].includes(classify(a).type), 'Q6=' + 'ABCD'[q6]);
  }
});

test('위험 선호가 높아도 비상금이 없거나(Q4=A), 비상금 부족+여유 적으면 준비우선형', () => {
  assert.equal(typeOf('C C C A D C C C C D D D D D D'), TYPE.PREPARE); // Q4=A, Q3=C
  assert.equal(typeOf('C C B B D C C C C D D D D D D'), TYPE.PREPARE); // Q4=B, Q3=B
  // 위험 선호가 낮으면 같은 재정 상태라도 이 규칙은 적용되지 않음
  assert.notEqual(typeOf('C C C A D C C C C D A A D D D'), TYPE.PREPARE);
});

test('준비우선형 기본 규칙: Q3=A / Q5=A / Q4=A&Q3≤B / P≤3', () => {
  assert.equal(typeOf('D D A D D C D D D D D D D D D'), TYPE.PREPARE);
  assert.equal(typeOf('D D D D A C D D D D D D D D D'), TYPE.PREPARE);
  assert.equal(typeOf('D D B A D C D D D D B B D D D'), TYPE.PREPARE);
  assert.equal(typeOf('D D B B B C D D D D B B D D D'), TYPE.PREPARE);    // P=3
  assert.notEqual(typeOf('D D B B C C D D D D B B D D D'), TYPE.PREPARE); // P=4
});

test('부채 문항을 건너뛰면 참고용 안내, 탐색형 배정 없음, 0점 처리 없음', () => {
  const a = ans('D D D D - C D D D D D D D D D');
  const r = classify(a);
  assert.equal(r.partial, true);
  assert.equal(r.type, TYPE.BALANCE);
  const res = results.buildResult(a, r);
  assert.equal(res.partialNotice, '일부 정보가 없어 참고용으로 분류했습니다.');
  assert.ok(res.partialDetail.length > 0);
  // Q5=A(0점)이면 준비우선형이지만 건너뛰면 아님
  assert.equal(typeOf('C C C C A C C C C C C C C C C'), TYPE.PREPARE);
  assert.notEqual(typeOf('C C C C - C C C C C C C C C C'), TYPE.PREPARE);
  // 건너뛰어도 Q5가 '부채 없음(D)'인 것처럼 유리해지지 않음
  const r2 = sim.rng(3);
  for (let n = 0; n < 20000; n++) {
    const b = sim.uniformAnswers(r2); b[4] = null;
    const t = classify(b).type;
    assert.ok(t !== TYPE.ACTIVE && t !== TYPE.GROWTH);
  }
});

/* ───── 전수 검사 ───── */
test('전수 검사: 다섯 유형 모두 도달 가능 + 안전 규칙 위반 없음', () => {
  // 유형에 영향을 주는 문항: Q2,Q3,Q4,Q5(+건너뜀),Q6,Q7,Q9,Q11,Q12,Q13
  const idx = [1, 2, 3, 5, 6, 8, 10, 11, 12];
  const counts = {};
  const a = new Array(15).fill(1);
  const total = Math.pow(4, idx.length);
  for (let n = 0; n < total; n++) {
    let m = n;
    for (const i of idx) { a[i] = m % 4; m = Math.floor(m / 4); }
    for (const q5 of [null, 0, 1, 2, 3]) {
      a[4] = q5;
      const r = classify(a);
      counts[r.type] = (counts[r.type] || 0) + 1;
      if (r.type === TYPE.ACTIVE || r.type === TYPE.GROWTH) {
        assert.ok(q5 !== null && q5 >= 2, '부채 정보 없음/부담 큰데 탐색형');
        assert.ok(a[3] >= 2, '비상금 1개월 미만인데 탐색형');
        assert.equal(a[5], 2, '장기가 아닌데 탐색형');
      }
      if (a[2] === 0 || q5 === 0) assert.equal(r.type, TYPE.PREPARE);
      if (r.readinessGap && r.type !== TYPE.PREPARE) assert.equal(r.type, TYPE.BALANCE);
    }
  }
  for (const t of Object.values(TYPE)) assert.ok(counts[t] > 0, t + ' 유형에 도달할 수 없음');
});

test('무작위 10만 건: 모든 유형이 나오고 어느 유형도 0.1% 미만이 아님', () => {
  const count = sim.run('test', sim.uniformAnswers, 20261107, { quiet: true });
  for (const t of Object.values(TYPE)) assert.ok(count[t] / 100000 >= 0.001, t + ' ' + count[t]);
});

/* ───── 결과 문구 ───── */
test('모든 유형 × 모든 Q15 × 비상금 보완 여부에서 추천 행동은 정확히 3개', () => {
  for (const id of results.TYPE_ORDER) {
    for (let q15 = 0; q15 < 4; q15++) {
      for (const gap of [false, true]) {
        const a = ans('B C C C C D C C C B C C C B A'); a[14] = q15;
        const r = results.buildResult(a, { type: id, scores: { T: 3 }, partial: false, readinessGap: gap, fraudNotice: false });
        assert.equal(r.actions.length, 3, id + ' Q15=' + q15);
        assert.ok(r.actions.filter((x) => x.chosen).length <= 1);
        r.actions.forEach((x) => assert.ok(x.text.length > 0 && x.text.length <= 30, '행동 문구 길이: ' + x.text));
      }
    }
  }
});

test('분산안정형 비상금 보완: Q15 선택과 합쳐도 손실 범위 행동은 유지', () => {
  for (let q15 = 0; q15 < 4; q15++) {
    const a = ans('C C C B D C C C C D D D D D A'); a[14] = q15;
    const r = build(a);
    assert.equal(r.type.id, 'balance');
    assert.match(r.actions[0].text, /비상금/);
    assert.ok(r.actions.some((x) => /손실/.test(x.text)));
    assert.equal(r.actions.filter((x) => x.chosen).length, 1, 'Q15=' + q15);
  }
});

test('준비우선형은 어떤 선택에서도 사기 예방 행동을 유지한다', () => {
  for (let q15 = 0; q15 < 4; q15++) {
    const a = ans('B C A A C C C C C A C C C A A'); a[14] = q15;
    assert.ok(build(a).actions.some((x) => x.text.includes('금융사기')), 'Q15=' + q15);
  }
});

test('적극탐색형은 손실관리 관련 행동을 항상 유지한다', () => {
  for (let q15 = 0; q15 < 4; q15++) {
    const a = ans('D D D D D C D D D D D D D D D'); a[14] = q15;
    const r = build(a);
    assert.equal(r.type.id, 'active');
    assert.ok(r.actions.some((x) => /손실/.test(x.text)), 'Q15=' + q15);
  }
});

test('Q6 단기·미정이면 보충 안내 문장이 붙는다', () => {
  const line = (q6) => { const a = ans('B C C C C A C C C B C C C B B'); a[5] = q6; return build(a).personalLines; };
  assert.ok(line(0).includes(results.HORIZON_NOTE[0]));
  assert.equal(line(1).length, 2);
  assert.equal(line(2).length, 2);
  assert.ok(line(3).includes(results.HORIZON_NOTE[3]));
});

test('결과 문구에 특정 투자상품 매수 권유가 없다', () => {
  const banned = /매수|사세요|구매하세요|가입하세요|추천 종목|비트코인|코인|테슬라|엔비디아|애플|S&P|나스닥|QQQ|SPY|TQQQ|레버리지 ETF/;
  const texts = [];
  for (const id of results.TYPE_ORDER) {
    const t = results.TYPES[id];
    texts.push(t.title, ...t.desc, ...t.actions);
    Object.values(t.personalAction).forEach((p) => p.text && texts.push(p.text));
    if (t.gapAction) texts.push(t.gapAction.text, ...Object.values(t.gapAction.withQ15));
  }
  texts.push(...results.CONCERN, ...results.GOAL, ...results.HORIZON_NOTE.filter(Boolean), results.GAP_NOTE, results.FRAUD_NOTICE, results.DISCLAIMER);
  texts.forEach((s) => assert.ok(!banned.test(s), '금지 표현: ' + s));
});

test('Q8 위험 대응(A, B, C)은 사기 예방 안내를 표시', () => {
  const pick = (q8) => { const a = ans('B C C C C D C C C B C C C B B'); a[7] = q8; return build(a); };
  assert.ok(pick(0).fraudNotice);
  assert.ok(pick(1).fraudNotice);
  assert.ok(pick(2).fraudNotice);
  assert.equal(pick(3).fraudNotice, null);
});

test('개인화 문장은 Q10 고민과 Q14 목표를 반영한다', () => {
  const r = build(ans('B C C C C B C C C B C C C C B'));
  assert.equal(r.personalLine, '요즘은 불규칙한 소득과 지출이 가장 고민이고, 일정 기간 안에 목돈을 마련하는 것을 목표로 하고 있네요.');
});


test('v3 Q8 추가 위험응답 C도 사기예방 안내 대상', () => {
  const a = ans('D D D D D C D C D D C C D D D');
  assert.equal(classify(a).fraudNotice,true);
});

/* ───── 자산 안내 두 영역 ───── */
const plan = (a) => results.buildResult(a, classify(a)).assetPlan;
const RISKY_ASSET = /주식|ETF|채권|^금$|달러|부동산|가상자산/;

test('② 내 유형에서 더 알아볼 자산군: 유형별 목록이 요청대로 구성된다', () => {
  const expected = {
    prepare: ['입출금예금', '예금·적금'],
    stable: ['예금·적금', '단기 우량채권'],
    balance: ['예금·적금', '국채·채권형 ETF', '분산 주식형 ETF'],
    growth: ['비상금용 예적금', '분산 주식형 ETF', '우량채권'],
    active: ['비상금용 예적금', '분산 주식형 ETF', '개별주식의 구조와 위험']
  };
  for (const id of results.TYPE_ORDER) {
    assert.deepEqual(results.ASSET_GUIDES[id].items.map((x) => x.name), expected[id], id);
    const sample = results.sampleResult(id).assetPlan;
    assert.equal(sample.learn.label, results.LEARN_LABEL);
    assert.match(sample.learn.footnote, /매수·가입을 권하지 않습니다/);
  }
});

test('① 지금 먼저 준비할 자산에는 어떤 응답에서도 주식·ETF·채권 등이 나오지 않는다', () => {
  const r = sim.rng(11);
  for (let n = 0; n < 50000; n++) {
    const a = sim.uniformAnswers(r);
    const p = plan(a);
    p.now.items.forEach((x) => assert.ok(!RISKY_ASSET.test(x.name), x.name));
    assert.ok(p.now.items.length >= 1 && p.now.checks.length >= 1);
    // ②는 항상 학습용 라벨과 함께, 유형 목록 그대로
    assert.equal(p.learn.label, results.LEARN_LABEL);
    assert.deepEqual(p.learn.items.map((x) => x.name), results.ASSET_GUIDES[classify(a).type].items.map((x) => x.name));
  }
});

test('① 준비 상태 반영: 생활비·비상금·부채·부채 미응답이면 build, 사용 시기가 장기가 아니면 time, 그 외 keep', () => {
  const r = sim.rng(12);
  for (let n = 0; n < 50000; n++) {
    const a = sim.uniformAnswers(r);
    const c = classify(a);
    const p = plan(a);
    const weak = c.partial || a[2] <= 1 || a[3] < 2 || (a[4] !== null && a[4] <= 1) || c.stage !== 'ready';
    const expect = weak ? 'build' : (c.scores.D !== 'long' ? 'time' : 'keep');
    assert.equal(p.now.status, expect);
    const priceRisk = p.learn.items.some((x) => /채권|ETF|주식/.test(x.name));
    if (expect !== 'keep' && priceRisk) assert.ok(p.learn.caution, '①이 우선이면 ②에 공부용 안내');
    else assert.equal(p.learn.caution, null);
    if (expect !== 'keep') assert.deepEqual(p.now.items.map((x) => x.name), ['입출금예금', '보호 대상 예금·적금']);
  }
});

test('① 점검 항목은 해당하는 상황만 표시한다', () => {
  const R = results.ASSET_REASON;
  // 부채 상환 부담(Q5=B) + 비상금 부족
  let p = plan(ans('C C C B B C C C C C B B C C C'));
  assert.ok(p.now.checks.includes(R.debt) && p.now.checks.includes(R.lowFund));
  // 부채 없음·여유 있음·비상금 충분·1년 이내 → 시기 안내만
  p = plan(ans('C C C D D A C C C C B B C C C'));
  assert.equal(p.now.status, 'time');
  assert.deepEqual(p.now.checks, [R.short]);
  // 부채 미응답
  p = plan(ans('C C C D - C C C C C B B C C C'));
  assert.ok(p.now.checks.includes(R.partial));
  assert.ok(!p.now.checks.includes(R.debt));
  // 모두 갖춤 + 장기 → 안전망 유지
  p = plan(ans('D D D D D C D D D D D D D D D'));
  assert.equal(p.now.status, 'keep');
  assert.deepEqual(p.now.checks, [R.keep]);
});

test('사례 C(주식 관심·비상금 없음): ①은 예적금 준비, ②는 준비우선형 학습 목록', () => {
  const c = CASES.find((x) => x.id === 'C');
  const p = plan(ans(c.answers));
  assert.equal(p.now.status, 'build');
  assert.deepEqual(p.learn.items.map((x) => x.name), ['입출금예금', '예금·적금']);
});

test('성장탐색형이라도 생활비 여유가 B면 ①은 준비 우선, ②는 공부용 안내와 함께 표시', () => {
  const a = ans('D D B D D C D D D D C B C D D');
  assert.equal(classify(a).type, TYPE.GROWTH);
  const p = plan(a);
  assert.equal(p.now.status, 'build');
  assert.ok(p.now.checks.includes(results.ASSET_REASON.noRoom));
  assert.ok(!p.now.checks.includes(results.ASSET_REASON.debt));
  assert.ok(p.learn.caution);
});

test('금·달러·부동산·가상자산은 모든 유형 공통 비교 자료로 유지', () => {
  const names = results.ASSET_COMPARISON.map((x) => x.name);
  assert.equal(names.length, 8);
  for (const n of ['금', '달러', '부동산', '가상자산']) assert.ok(names.includes(n), n);
  // 유형별 학습 목록에는 넣지 않음 (특정 유형만의 자산처럼 보이지 않도록)
  for (const id of results.TYPE_ORDER) {
    results.ASSET_GUIDES[id].items.forEach((x) => assert.ok(!/^(금|달러|부동산|가상자산)$/.test(x.name)));
  }
});

test('유형 간 우열 표현이 없다', () => {
  const ranking = /최고|우수|상위|하위|고급|초급|초보|등급|레벨|능력이 낮|부족한 유형|뛰어난|수준이 높/;
  const texts = [];
  for (const id of results.TYPE_ORDER) {
    const t = results.TYPES[id], g = results.ASSET_GUIDES[id];
    texts.push(t.name, t.title, ...t.desc, ...t.actions, g.intro, ...g.items.flatMap((x) => [x.name, x.why, x.risk]));
  }
  texts.push(...Object.values(results.ASSET_REASON));
  texts.forEach((s) => assert.ok(!ranking.test(s), '우열 표현: ' + s));
});

/* ───── 강사용 잠금 ───── */
test('강사용 잠금: SHA-256 구현이 표준과 같고, 맞는/틀린 비밀번호를 구분한다', () => {
  const lock = require('../teacher-lock.js');
  const crypto = require('node:crypto');
  for (const s of ['', 'abc', '한글 비밀번호', 'x'.repeat(300)]) {
    assert.equal(lock.sha256(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex'));
  }
  const h = lock.hashPassword('bangu2026');
  assert.equal(lock.check('bangu2026', h), true);
  assert.equal(lock.check(' bangu2026 ', h), true);
  assert.equal(lock.check('bangu2027', h), false);
  assert.equal(lock.check('bangu2026', ''), false);
});

test('teacher-config.js 에는 비밀번호 원문이 아닌 64자리 해시만 있다', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'teacher-config.js'), 'utf8');
  const m = src.match(/passHash:\s*'([0-9a-f]+)'/);
  assert.ok(m && m[1].length === 64);
});
