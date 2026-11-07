/*
 * scoring.js — 점수 계산과 유형 분류 (화면과 무관한 순수 함수)
 * ------------------------------------------------------------
 * answers: 길이 15 배열. answers[0] = Q1, answers[14] = Q15
 *   0~3  : 선택지 A~D
 *   null : 건너뜀 (Q5만 허용)
 *
 * 분류는 두 축을 따로 판단한 뒤 합칩니다.
 *   ① 재정 준비 단계 (P: Q3 생활비 상황 · Q4 비상금 · Q5 부채 부담)
 *   ② 위험 선호 (T: Q11 · Q12)
 * 여기에 자금 사용 시기(D: Q6), 금융생활 습관(H), 학습 의향(E)을
 * 탐색형 두 가지의 추가 조건으로만 사용합니다.
 *
 * ※ 교육용으로 설계한 잠정적 규칙입니다.
 *   금융기관의 검증된 투자성향·적합성 검사가 아니며,
 *   자산 추천이나 투자 실행의 근거로 사용할 수 없습니다.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.YMS = root.YMS || {}; root.YMS.scoring = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOTAL_QUESTIONS = 15;
  var SKIPPABLE = [4]; // 0부터 센 번호: 4 = Q5

  var TYPE = {
    PREPARE: 'prepare',   // 준비우선형
    STABLE: 'stable',     // 안정중시형
    BALANCE: 'balance',   // 분산안정형
    GROWTH: 'growth',     // 성장탐색형
    ACTIVE: 'active'      // 적극탐색형
  };

  /* ───── 문항별 점수표 ───── */
  // Q7 합리적 소비: B(가격 비교)와 C(중고거래)는 서로 다른 절약 방법이므로 같은 점수
  var Q7_SCORES = [0, 2, 2, 3];

  // Q6 자금 사용 시기: 점수가 아니라 '구분'. D(미정)는 장기가 아님
  var HORIZON = { SHORT: 'short', MID: 'mid', LONG: 'long', UNDECIDED: 'undecided' };
  var Q6_HORIZON = [HORIZON.SHORT, HORIZON.MID, HORIZON.LONG, HORIZON.UNDECIDED];
  var HORIZON_LABEL = { short: '단기', mid: '중기', long: '장기', undecided: '미정' };

  /* ───── 분류 기준값 (숫자를 바꾸면 기준이 바뀝니다) ───── */
  var RULES = {
    // 준비우선형: Q5 응답 시 P가 이 값 이하
    prepareMaxP: 3,
    // 위험 선호는 높지만 비상금·생활비 여유가 부족하면 준비우선형
    gapMinT: 4,
    // 적극탐색형 최소 기준
    active: { T: 5, P: 6, H: 4, Q3: 2, Q4: 2, Q5: 2, E: 2 },
    // 성장탐색형 최소 기준
    growth: { T: 3, P: 6, H: 3, Q3: 1, Q4: 2, Q5: 2, E: 1 },
    // 안정중시형: T가 이 값 이하
    stableMaxT: 2
  };

  // Q8에서 이 선택지를 고르면 사기 예방 안내 표시 (0=A, 1=B)
  var RISKY_FRAUD_ANSWERS = [0, 1, 2];

  function q(answers, n) { return answers[n - 1]; }

  function validate(answers) {
    if (!Array.isArray(answers) || answers.length !== TOTAL_QUESTIONS) {
      throw new Error('응답은 15개여야 합니다.');
    }
    for (var i = 0; i < TOTAL_QUESTIONS; i++) {
      var v = answers[i];
      if (v === null && SKIPPABLE.indexOf(i) !== -1) continue;
      if (v !== 0 && v !== 1 && v !== 2 && v !== 3) {
        throw new Error('Q' + (i + 1) + ' 응답이 올바르지 않습니다: ' + v);
      }
    }
  }

  /** 영역별 점수 계산 */
  function computeScores(answers) {
    validate(answers);
    var q3 = q(answers, 3), q4 = q(answers, 4), q5 = q(answers, 5);
    var q5Answered = q5 !== null;
    // Q5 미응답: 0점(부채 부담 큼)도 3점(부채 없음)도 아닌, Q3·Q4 평균으로 자리를 채운 추정치
    var q5ForP = q5Answered ? q5 : (q3 + q4) / 2;

    return {
      P: q3 + q4 + q5ForP,                                       // 재정 준비 상태 0~9
      H: q(answers, 2) + Q7_SCORES[q(answers, 7)] + q(answers, 9), // 금융생활 습관과 이해 0~9
      T: q(answers, 11) + q(answers, 12),                        // 위험 선호 성향 0~6
      D: Q6_HORIZON[q(answers, 6)],                              // 자금 사용 시기 (구분값)
      E: q(answers, 13),                                         // 금융지식 학습 의향 0~3
      q5Answered: q5Answered,
      pEstimated: !q5Answered
    };
  }

  /**
   * 재정 준비 단계
   *  foundation : 생활 기반을 먼저 다질 때 (생활비 어려움, 상환 매우 부담, 비상금 없음+여유 적음, P≤3)
   *  building   : 기반을 쌓는 중
   *  ready      : 생활비·비상금·부채 상황이 투자 학습을 시작하기에 비교적 안정적 (Q5 응답 필요)
   */
  function readinessStage(answers, s) {
    var q3 = q(answers, 3), q4 = q(answers, 4), q5 = q(answers, 5);
    if (q3 === 0) return { stage: 'foundation', reason: '생활비 마련에 어려움이 있음 (Q3=A)' };
    if (q5 === 0) return { stage: 'foundation', reason: '부채 상환 부담이 매우 큼 (Q5=A)' };
    if (q4 === 0 && q3 <= 1) return { stage: 'foundation', reason: '비상금이 없고 생활비 여유도 거의 없음 (Q4=A, Q3≤B)' };
    if (s.q5Answered && s.P <= RULES.prepareMaxP) return { stage: 'foundation', reason: '재정 준비 점수가 낮음 (P≤' + RULES.prepareMaxP + ')' };
    if (s.q5Answered && q4 >= 2 && q5 >= 2 && s.P >= RULES.growth.P) return { stage: 'ready', reason: '비상금 1개월 이상 · 상환 부담 관리 가능' };
    return { stage: 'building', reason: s.q5Answered ? '기반을 쌓는 중' : '부채 정보가 없어 준비 단계를 확정하지 않음' };
  }

  /** 비상금이 부족한데 위험 선호가 높은 상태 (위험 감수 의향 > 현재 감당 여건) */
  function hasReadinessGap(answers, s) {
    return s.T >= RULES.gapMinT && q(answers, 4) <= 1;
  }

  function meets(answers, s, r) {
    return s.q5Answered && s.D === HORIZON.LONG &&
      s.T >= r.T && s.P >= r.P && s.H >= r.H && s.E >= r.E &&
      q(answers, 3) >= r.Q3 && q(answers, 4) >= r.Q4 && q(answers, 5) >= r.Q5;
  }

  /**
   * 유형 분류
   * @returns {{type, scores, stage, partial, readinessGap, reason, fraudNotice}}
   */
  function classify(answers) {
    var s = computeScores(answers);
    var st = readinessStage(answers, s);
    var gap = hasReadinessGap(answers, s);
    var q3 = q(answers, 3), q4 = q(answers, 4);
    var type, reason;

    // 1. 준비우선형 ─ 생활 기반 우선 (소득 유무 Q1은 사용하지 않음)
    if (st.stage === 'foundation') {
      type = TYPE.PREPARE; reason = st.reason;
    }
    // 1-2. 준비우선형 ─ 위험 선호는 높지만 비상금이 부족하고 여유도 적음
    else if (gap && (q4 === 0 || q3 <= 1)) {
      type = TYPE.PREPARE;
      reason = q4 === 0 ? '위험 선호가 높지만 비상금이 아직 마련되지 않음' : '위험 선호가 높고 비상금과 생활비 여유가 모두 부족함';
    }
    // 2. 적극탐색형
    else if (meets(answers, s, RULES.active)) { type = TYPE.ACTIVE; reason = '적극탐색형 조건 모두 충족'; }
    // 3. 성장탐색형
    else if (meets(answers, s, RULES.growth)) { type = TYPE.GROWTH; reason = '성장탐색형 조건 모두 충족'; }
    // 4. 안정중시형
    else if (s.T <= RULES.stableMaxT) { type = TYPE.STABLE; reason = '위험 선호가 낮음 (T≤' + RULES.stableMaxT + ')'; }
    // 5. 분산안정형
    else {
      type = TYPE.BALANCE;
      reason = '위험 선호 중간 이상, 탐색형 조건 일부 미충족';
      if (s.D !== HORIZON.LONG && st.stage === 'ready') reason += ' (자금 사용 시기가 장기가 아님)';
    }

    return {
      type: type,
      scores: s,
      stage: st.stage,
      partial: !s.q5Answered,
      readinessGap: gap,
      reason: reason,
      fraudNotice: RISKY_FRAUD_ANSWERS.indexOf(q(answers, 8)) !== -1
    };
  }

  return {
    TOTAL_QUESTIONS: TOTAL_QUESTIONS,
    SKIPPABLE: SKIPPABLE,
    TYPE: TYPE,
    HORIZON: HORIZON,
    HORIZON_LABEL: HORIZON_LABEL,
    Q6_HORIZON: Q6_HORIZON,
    Q7_SCORES: Q7_SCORES,
    RULES: RULES,
    RISKY_FRAUD_ANSWERS: RISKY_FRAUD_ANSWERS,
    validate: validate,
    computeScores: computeScores,
    readinessStage: readinessStage,
    classify: classify
  };
});
