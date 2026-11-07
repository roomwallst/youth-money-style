/*
 * results.js — 결과 유형 설명과 개인화 문구
 * ------------------------------------------------------------
 * 유형 이름, 제목, 설명, 추천 행동, 색상, 아이콘을 바꾸려면 TYPES 를 수정하세요.
 *
 * 원칙
 *  - 모든 유형은 동등합니다. 순위·등급처럼 보이는 표현을 쓰지 않습니다.
 *  - 특정 주식·ETF·가상자산 등의 매수를 권하지 않습니다.
 *  - 추천 행동은 항상 정확히 3개입니다.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.YMS = root.YMS || {}; root.YMS.results = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /*
   * 아이콘: 24x24 기준 SVG 선(stroke) 경로. 화면과 저장 이미지에 똑같이 사용됩니다.
   * personalAction: Q15에서 고른 행동(A~D)을 추천 행동 3개 중 어디에 반영할지
   *   { index: 바꿀 위치(0~2), text: 새 문구 }  — text 가 null 이면 이미 같은 행동이 있으므로
   *   문구는 그대로 두고 '내가 고른 행동' 표시만 붙입니다.
   *   안전 관련 행동(사기 예방, 손실 감당 범위 등)은 지우지 않도록 설계되어 있습니다.
   */
  var TYPES = {
    prepare: {
      id: 'prepare',
      name: '준비우선형',
      english: 'Foundation Builder',
      title: '지금은 금융생활의 기초를 만드는 시기!',
      desc: [
        '지금 당장 투자할 필요는 없습니다.',
        '생활비와 현금흐름을 파악하고, 내 돈을 지키는 습관부터 시작해 보세요.'
      ],
      actions: [
        '한 달 필수생활비 파악하기',
        '가능한 범위에서 비상금 계획 세우기',
        '금융사기 예방 수칙 익히기'
      ],
      personalAction: {
        0: { index: 0, text: null },
        1: { index: 1, text: null },
        2: { index: 2, text: null },
        3: { index: 1, text: '비상금 계획을 세우며 예금·적금 기초 공부하기' }
      },
      color: '#1F7F74',
      soft: '#E3F2EF',
      icon: 'M12 21v-8 M12 13C12 9 9.5 6 4.5 6c0 4 2.5 7 7.5 7 M12 11c0-3.5 2.5-6.5 7.5-6.5 0 3.5-2.5 6.5-7.5 6.5'
    },
    stable: {
      id: 'stable',
      name: '안정중시형',
      english: 'Steady Planner',
      title: '꾸준하고 예측 가능한 돈관리를 선호해요.',
      desc: [
        '큰 수익보다 안정적인 경제생활을 중요하게 생각하는 스타일입니다.',
        '작은 저축 목표를 실천하며 자신에게 맞는 관리 방법을 찾아보세요.'
      ],
      actions: [
        '단기 저축 목표 정하기',
        '예적금 금리와 만기 조건 비교하기',
        '생활비와 장기자금 구분하기'
      ],
      personalAction: {
        0: { index: 2, text: '생활비 지출을 확인하고 장기자금과 구분하기' },
        1: { index: 0, text: null },
        2: { index: 1, text: '예적금 조건을 비교하고 금융사기 신호도 알아보기' },
        3: { index: 1, text: '예적금 금리·만기를 비교하며 저축 기초 공부하기' }
      },
      color: '#2D62A8',
      soft: '#E4ECF7',
      icon: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z M8.8 12l2.2 2.2 4.2-4.4'
    },
    balance: {
      id: 'balance',
      name: '분산안정형',
      english: 'Balance Seeker',
      title: '안정과 성장의 균형을 찾고 싶어요.',
      desc: [
        '현재의 경제생활 안정과 미래의 자산형성을 함께 생각합니다.',
        '금융상품마다 위험과 특징이 어떻게 다른지 비교해 보세요.'
      ],
      actions: [
        '단기 목표와 장기 목표 구분하기',
        '예금·채권·ETF의 구조와 위험 알아보기',
        '손실을 감당할 수 있는 범위 생각하기'
      ],
      personalAction: {
        0: { index: 0, text: '생활비를 확인하고 단기·장기 목표 구분하기' },
        1: { index: 0, text: '작은 저축 계획으로 단기 목표부터 정하기' },
        2: { index: 1, text: '금융상품별 위험 구조와 금융사기 신호 알아보기' },
        3: { index: 1, text: null }
      },
      // 위험 선호는 높은데 비상금이 1개월 미만인 경우: 첫 번째 행동을 비상금 준비로 바꿈
      gapAction: {
        index: 0,
        text: '투자 공부와 함께 비상금 목표 먼저 세우기',
        withQ15: {
          0: '생활비를 확인하고 비상금 목표 먼저 세우기',
          1: '작은 저축 계획으로 비상금 목표 먼저 세우기'
        }
      },
      color: '#5E4FA8',
      soft: '#ECE9F6',
      icon: 'M12 4v16 M8 20h8 M5 7h14 M5 7l-3 6.5h6L5 7 M19 7l-3 6.5h6L19 7'
    },
    growth: {
      id: 'growth',
      name: '성장탐색형',
      english: 'Growth Explorer',
      title: '장기적인 자산형성에 관심이 있어요.',
      desc: [
        '미래를 위해 금융지식을 배우고 자산형성 방법을 탐색하는 스타일입니다.',
        '투자는 수익뿐 아니라 손실 가능성도 함께 이해하는 것이 중요합니다.'
      ],
      actions: [
        '비상금과 여유자금 구분하기',
        '장기투자와 분산투자 원리 배우기',
        '가상 투자 사례로 변동성 경험하기'
      ],
      personalAction: {
        0: { index: 0, text: '생활비를 확인하고 비상금과 여유자금 구분하기' },
        1: { index: 2, text: '매달 일정 금액을 모으는 저축 계획 세우기' },
        2: { index: 2, text: '금융사기 예방 수칙 익히기' },
        3: { index: 1, text: null }
      },
      color: '#A8601F',
      soft: '#F6ECE1',
      icon: 'M12 3a9 9 0 1 0 0.01 0z M15.5 8.5l-2 5-5 2 2-5z'
    },
    active: {
      id: 'active',
      name: '적극탐색형',
      english: 'Opportunity Explorer',
      title: '새로운 금융 기회를 탐색하는 편이에요.',
      desc: [
        '상대적으로 큰 가격 변동도 고려할 의향이 있는 스타일입니다.',
        '하지만 위험을 감수하려는 마음과 실제로 손실을 감당할 능력은 다릅니다.'
      ],
      actions: [
        '큰 손실이 발생하는 상황 가정하기',
        '레버리지와 집중투자의 위험 이해하기',
        '투자 전 원칙과 손실관리 기준 세우기'
      ],
      personalAction: {
        0: { index: 0, text: '생활비·비상금을 확인하고 큰 손실 상황 가정하기' },
        1: { index: 0, text: '저축 계획을 먼저 세우고 큰 손실 상황 가정하기' },
        2: { index: 1, text: '레버리지·집중투자 위험과 금융사기 신호 알아보기' },
        3: { index: 2, text: null }
      },
      color: '#A63E5C',
      soft: '#F6E5EA',
      icon: 'M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z M9 4v13.5 M15 6.5V20'
    }
  };

  // 화면에 나열할 때 쓰는 순서 (순위가 아님)
  var TYPE_ORDER = ['prepare', 'stable', 'balance', 'growth', 'active'];

  // Q10 고민 / Q14 목표 → 개인화 문장 조각
  var CONCERN = [
    '당장의 생활비 관리가',
    '불규칙한 소득과 지출이',
    '목돈이나 비상금 마련이',
    '저축과 투자에 관한 정보가'
  ];
  var GOAL = [
    '생활비를 안정적으로 관리하는 것',
    '비상금과 저축 습관을 만드는 것',
    '일정 기간 안에 목돈을 마련하는 것',
    '장기적으로 자산을 형성하는 것'
  ];

  // '나의 금융생활 특징'에 쓰는 짧은 표현 (평가가 아닌 상황 설명)
  var TRAIT_INCOME = ['지금은 정기 소득이 없는 시기', '가끔 수입이 생기는 편', '비교적 일정한 소득이 있는 편', '매달 안정적인 소득이 있는 편'];
  var TRAIT_TIMING = ['1년 이내 (단기)', '1년 초과~5년 (중기)', '5년 이후 (장기)', '아직 정하지 않음'];
  function traitRisk(T) {
    if (T <= 2) return '가격 변동보다 안정을 중시';
    if (T <= 4) return '안정과 성장 사이의 균형';
    return '가격 변동을 어느 정도 감수';
  }

  // Q6 자금 사용 시기별 보충 문장 (단기·미정만)
  var HORIZON_NOTE = [
    '1년 안에 쓸 돈은 가격 변동이 작은 현금성 자금으로 관리하는 것이 일반적인 출발점이에요.',
    null,
    null,
    '아직 사용 시기를 정하지 않았다면 \'언제, 무엇에 쓸 돈인지\'부터 정해 보세요. 시기가 정해지면 모으는 방법을 고르기 쉬워져요.'
  ];

  // 위험 선호는 높지만 비상금이 부족한 경우
  var GAP_NOTE = '투자에 대한 관심은 좋은 출발점이에요. 비상금을 먼저 마련해 두면 가격이 흔들려도 급하게 팔지 않고 계획을 이어가기 쉬워요.';

  var FRAUD_NOTICE =
    '수익 보장이나 원금 보장을 약속하는 낯선 투자 권유는 금융사기 위험 신호일 수 있어요. ' +
    '링크를 누르거나 입금하기 전에 공식 기관을 통해 확인하세요.';
  var FRAUD_TIP = '확인 방법: 금융감독원 「파인」(fine.fss.or.kr)에서 제도권 금융회사인지 조회 · 상담 국번 없이 1332';

  var PARTIAL_NOTICE = '일부 정보가 없어 참고용으로 분류했습니다.';
  var PARTIAL_DETAIL = '부채 문항에 답하지 않아 재정 준비 상태를 생활비·비상금 정보만으로 짐작했어요. 그래서 성장탐색형·적극탐색형은 배정하지 않았어요.';

  var DISCLAIMER =
    '본 결과는 검증된 투자성향·적합성 검사가 아닌 금융교육용 자기이해 활동입니다. 자산군은 학습 참고 예시이며, 특정 상품 가입을 권하거나 원금을 보장하지 않습니다.';

  /*
   * ② 내 유형에서 더 알아볼 자산군 (학습용)
   * 유형의 성향에 맞춰 '공부해 볼' 자산군입니다. 매수·가입 추천이 아닙니다.
   * 유형 간 우열이 없도록, 모든 유형의 첫 항목은 돈을 지키는 자산에서 시작합니다.
   */
  var ASSET_GUIDES = {
    prepare: {
      intro: '돈을 지키는 구조를 제대로 아는 것은 모든 자산 공부의 출발점이에요.',
      items: [
        { name: '입출금예금', why: '언제든 꺼내 쓰는 돈의 자리와 이자 구조 이해', risk: '금리가 낮을 수 있어요 · 보호 대상 여부 확인' },
        { name: '예금·적금', why: '정해진 기간에 목돈을 모으는 방법 비교', risk: '중도해지하면 이자가 줄어요 · 물가 상승 영향' }
      ]
    },
    stable: {
      intro: '예측 가능한 자산끼리도 구조가 어떻게 다른지 비교해 보세요.',
      items: [
        { name: '예금·적금', why: '금리·만기·보호 조건 비교 연습', risk: '중도해지 조건 · 보호 한도 확인' },
        { name: '단기 우량채권', why: '예금과 채권이 어떻게 다른지 알아보기', risk: '원금 보장이 아니에요 · 만기 전 매도 시 가격 변동 · 발행자 신용위험' }
      ]
    },
    balance: {
      intro: '성격이 다른 자산을 나누어 두는 분산의 원리를 공부해 보세요.',
      items: [
        { name: '예금·적금', why: '생활비·단기 목표 자금과 투자 공부 자금 구분', risk: '보호 조건과 만기 확인' },
        { name: '국채·채권형 ETF', why: '이자·금리와 채권 가격의 관계 이해', risk: '금리 변동에 따라 가격이 오르내려요 · ETF 운용 구조 확인' },
        { name: '분산 주식형 ETF', why: '여러 기업에 나누어 투자하는 구조 이해', risk: '시장이 하락하면 원금 손실 · ETF라고 안전한 것은 아니에요' }
      ]
    },
    growth: {
      intro: '오랜 기간 자산이 자라는 원리와, 그 과정의 손실 위험을 함께 공부해 보세요.',
      items: [
        { name: '비상금용 예적금', why: '투자 자금과 생활 안전망을 나누는 기준 세우기', risk: '보호 대상·인출 조건 확인' },
        { name: '분산 주식형 ETF', why: '장기·분산 투자의 기본 구조 이해', risk: '오래 보유해도 손실이 날 수 있어요' },
        { name: '우량채권', why: '주식과 다르게 움직이는 자산의 역할 이해', risk: '원금 보장이 아니에요 · 금리 변동 · 발행자 신용위험' }
      ]
    },
    active: {
      intro: '위험을 감수하려는 마음과 실제로 손실을 감당할 여건은 다르다는 점을 함께 공부해 보세요.',
      items: [
        { name: '비상금용 예적금', why: '가격이 흔들려도 생활이 흔들리지 않게 하는 자리', risk: '보호 대상·기간 조건 확인' },
        { name: '분산 주식형 ETF', why: '시장 전체의 상승·하락을 이해하기', risk: '시장 하락 시 원금 손실 · 담고 있는 자산 확인' },
        { name: '개별주식의 구조와 위험', why: '기업 실적과 주가가 움직이는 원리 배우기', risk: '한 기업에 집중되는 위험 · 큰 폭의 손실 가능 · 레버리지 주의' }
      ]
    }
  };

  // 공부용 안내 라벨 (항상 표시)
  var LEARN_LABEL = '학습용 안내 · 매수 추천이 아닙니다';
  var LEARN_FOOTNOTE = '이 목록은 금융교육용 자산군 예시입니다. 본인에게 적합하다는 판정이 아니며, 특정 종목이나 상품의 매수·가입을 권하지 않습니다.';
  var LEARN_CAUTION = '지금은 ① 준비가 먼저예요. 아래 자산군은 개념과 위험을 익히는 공부용 자료로 봐 주세요.';

  var ASSET_COMPARISON = [
    { name: '예금·적금', use: '생활비·비상금·목돈', risk: '물가 상승·중도해지 조건', fact: '보호 대상 상품은 금융회사별 1인당 원금과 소정 이자 합계 1억 원까지. 우체국예금은 국가가 지급 책임. 새마을금고·신협 등은 각 중앙회의 별도 보호제도를 적용해요.' },
    { name: '채권', use: '이자·자금 운용·분산', risk: '금리·발행자 신용·유동성', fact: '우량채권도 만기 전 팔면 가격 손실이 생길 수 있어요.' },
    { name: '금', use: '가치 보전 기대·분산', risk: '금값 변동·보관·비용', fact: '골드바 실물 구매 시 일반적으로 부가세 10%. KRX 금시장 장내매매는 면제, 실물 인출 시 부과.' },
    { name: '달러', use: '해외 지출·통화 분산', risk: '환율 변동·환전 수수료', fact: '달러를 보유해도 원화 기준 손실은 발생할 수 있어요.' },
    { name: '부동산', use: '주거·장기 자산', risk: '가격·큰 자금·낮은 유동성', fact: '전세 계약은 투자와 별개로 등기부·보증금 안전성을 확인하세요.' },
    { name: '주식', use: '기업 성장에 참여', risk: '기업 실적·주가 급락', fact: '회사 가치가 하락할 수 있으며 증권사 파산과 주식 손실은 다른 위험이에요.' },
    { name: 'ETF', use: '다양한 기초자산에 투자', risk: '기초자산·운용구조·가격 변동', fact: 'ETF는 상품을 담는 그릇입니다. 채권형·주식형·레버리지형 위험이 달라요.' },
    { name: '가상자산', use: '디지털 자산에 대한 이해', risk: '큰 가격 변동·보관·사기', fact: '법정 예금자보호를 받는 예금과 같은 상품이 아니에요.' }
  ];

  /*
   * ① 지금 먼저 준비할 자산 — 실제 재정 준비 상태 반영
   * 생활비·비상금·부채·사용 시기를 보고, 돈을 지키는 자산(입출금예금, 보호 대상 예적금)만 안내합니다.
   * 주식·ETF·채권은 이 영역에 절대 나오지 않습니다.
   */
  var NOW_ITEMS = {
    cash: { name: '입출금예금', why: '생활비와 비상금을 바로 꺼내 쓸 수 있는 자리', risk: '금리가 낮을 수 있어요 · 보호 대상 여부 확인' },
    deposit: { name: '보호 대상 예금·적금', why: '쓸 시기가 정해진 돈을 계획대로 모으기', risk: '중도해지 시 이자 감소 · 보호 한도 확인' },
    keepFund: { name: '비상금용 입출금예금·예적금', why: '다른 자산을 공부하더라도 생활 안전망은 따로 유지', risk: '투자 자금과 같은 통장에 섞지 않기' }
  };

  // 준비 상태별 점검 항목 (해당하는 것만 표시)
  var ASSET_REASON = {
    partial: '부채 문항에 답하지 않았어요. 상환 중인 대출이 있는지 스스로 한 번 확인해 보세요.',
    noRoom: '생활비 여유가 거의 없다면 고정지출부터 점검해 보세요.',
    lowFund: '비상금은 먼저 한 달 생활비, 그다음 3개월 생활비를 목표로 모아 보세요.',
    debt: '대출이 있다면 금리와 상환 일정을 확인하고, 연체가 생기지 않게 하는 것이 먼저예요.',
    short: '1년 안에 쓸 돈은 따로 떼어, 가격이 변하지 않는 예금·적금에 두세요.',
    mid: '1~5년 안에 쓸 돈은 만기를 사용 시점에 맞춘 예금·적금을 먼저 생각해 보세요.',
    undecided: '돈을 쓸 시기와 목적부터 정해 보세요. 시기가 정해지면 모으는 방법을 고르기 쉬워져요.',
    keep: '비상금은 투자 공부용 자금과 다른 통장에 따로 두세요.'
  };

  var NOW_INTRO = {
    build: '지금은 생활비와 비상금을 지키는 자산부터 준비하는 것을 권해요.',
    time: '돈을 쓸 시기에 맞춰, 가격이 변하지 않는 자산부터 준비해 보세요.',
    keep: '기본 안전망이 갖춰져 있어요. 다른 자산을 공부하더라도 비상금은 그대로 유지하세요.'
  };

  function copyItems(list) { return list.map(function (x) { return { name: x.name, why: x.why, risk: x.risk }; }); }

  /**
   * 자산 안내 두 영역을 만듭니다.
   * @returns {{now: {status, intro, items, checks}, learn: {label, intro, items, caution, footnote}}}
   *   now.status : 'build' 생활비·비상금·부채 우선 / 'time' 사용 시기가 장기가 아님 / 'keep' 안전망 유지
   */
  function assetPlanFor(answers, classification) {
    var q3 = answers[2], q4 = answers[3], q5 = answers[4];
    var D = classification.scores.D;

    var checks = [];
    if (classification.partial) checks.push(ASSET_REASON.partial);
    if (q5 !== null && q5 <= 1) checks.push(ASSET_REASON.debt);
    if (q3 <= 1) checks.push(ASSET_REASON.noRoom);
    if (q4 < 2) checks.push(ASSET_REASON.lowFund);
    var cashFirst = classification.stage !== 'ready' || checks.length > 0;
    if (D !== 'long') checks.push(ASSET_REASON[D]);

    var status = cashFirst ? 'build' : (D !== 'long' ? 'time' : 'keep');
    var items;
    if (status === 'keep') { items = [NOW_ITEMS.keepFund]; checks.push(ASSET_REASON.keep); }
    else items = [NOW_ITEMS.cash, NOW_ITEMS.deposit];

    var guide = ASSET_GUIDES[classification.type];
    // ②에 가격이 변하는 자산(채권·ETF·주식)이 있고 ①이 우선인 경우에만 '공부용' 안내를 덧붙임
    var hasPriceRisk = guide.items.some(function (x) { return /채권|ETF|주식/.test(x.name); });
    return {
      now: { status: status, intro: NOW_INTRO[status], items: copyItems(items), checks: checks.slice(0, 3) },
      learn: {
        label: LEARN_LABEL,
        intro: guide.intro,
        items: copyItems(guide.items),
        caution: (status !== 'keep' && hasPriceRisk) ? LEARN_CAUTION : null,
        footnote: LEARN_FOOTNOTE
      }
    };
  }

  /**
   * 분류 결과 + 응답 → 화면에 표시할 결과 객체
   */
  function buildResult(answers, classification) {
    var t = TYPES[classification.type];
    if (!t) throw new Error('알 수 없는 유형: ' + classification.type);

    var q10 = answers[9], q14 = answers[13], q15 = answers[14];

    var personalLine = '요즘은 ' + CONCERN[q10] + ' 가장 고민이고, ' + GOAL[q14] + '을 목표로 하고 있네요.';

    var actions = t.actions.map(function (text) { return { text: text, chosen: false }; });
    var pa = t.personalAction[q15];
    if (pa) {
      if (pa.text) actions[pa.index].text = pa.text;
      actions[pa.index].chosen = true;
    }

    // 비상금 보완: 위험 선호는 높지만 비상금이 부족하면 준비 행동을 우선 (안전 행동은 유지)
    var gap = !!classification.readinessGap;
    if (gap && t.gapAction) {
      var ga = t.gapAction;
      var merged = pa && pa.index === ga.index && ga.withQ15 && ga.withQ15[q15];
      actions[ga.index].text = merged || ga.text;
      actions[ga.index].chosen = !!merged;
    }

    var personalLines = [personalLine];
    // Q7은 합리적인 소비·중고거래 등 참가자의 실제 경험을 긍정적으로 연결합니다.
    var spendingFeedback = [
      '물건을 구매할 때 필요한지 한 번 더 생각해 보는 연습부터 시작해 보세요.',
      '가격과 할인 조건을 비교해 보는 것도 좋은 소비관리 습관이에요.',
      '중고거래로 사용하지 않는 물건을 현금화하거나 필요한 물건을 저렴하게 구할 수 있어요. 다만 거래 안전과 상태도 확인하세요.',
      '구매 필요성과 예산, 물건의 재사용 가능성까지 확인하는 소비습관이 있어요.'
    ];
    personalLines.push(spendingFeedback[answers[6]]);
    var hNote = HORIZON_NOTE[answers[5]];
    if (hNote) personalLines.push(hNote);
    if (gap) personalLines.push(GAP_NOTE);

    var traits = [
      { label: '소득 흐름', value: TRAIT_INCOME[answers[0]] },
      { label: '돈을 쓸 예상 시기', value: TRAIT_TIMING[answers[5]] },
      { label: '가격 변동에 대한 생각', value: traitRisk(classification.scores.T) },
      { label: '지금의 목표', value: GOAL[q14] }
    ];

    return {
      type: t,
      name: t.name,
      english: t.english,
      title: t.title,
      desc: t.desc.slice(),
      personalLine: personalLine,
      personalLines: personalLines,
      actions: actions,
      traits: traits,
      partial: classification.partial,
      partialNotice: classification.partial ? PARTIAL_NOTICE : null,
      partialDetail: classification.partial ? PARTIAL_DETAIL : null,
      fraudNotice: classification.fraudNotice ? FRAUD_NOTICE : null,
      fraudTip: classification.fraudNotice ? FRAUD_TIP : null,
      disclaimer: DISCLAIMER,
      assetPlan: assetPlanFor(answers, classification)
    };
  }

  /** 교사용 미리보기·샘플 이미지용 기본 결과 (개인화 없음) */
  function sampleResult(typeId) {
    var t = TYPES[typeId];
    return {
      type: t, name: t.name, english: t.english, title: t.title, desc: t.desc.slice(),
      personalLine: null, personalLines: [],
      actions: t.actions.map(function (text) { return { text: text, chosen: false }; }),
      traits: [], partial: false, partialNotice: null, partialDetail: null, fraudNotice: null, fraudTip: null,
      disclaimer: DISCLAIMER,
      assetPlan: {
        now: { status: 'sample', intro: '참가자의 생활비·비상금·부채·사용 시기 응답에 따라 달라져요. 이 영역에는 입출금예금과 보호 대상 예금·적금만 나옵니다.', items: copyItems([NOW_ITEMS.cash, NOW_ITEMS.deposit]), checks: [] },
        learn: { label: LEARN_LABEL, intro: ASSET_GUIDES[typeId].intro, items: copyItems(ASSET_GUIDES[typeId].items), caution: null, footnote: LEARN_FOOTNOTE }
      }
    };
  }

  return {
    TYPES: TYPES,
    TYPE_ORDER: TYPE_ORDER,
    CONCERN: CONCERN,
    GOAL: GOAL,
    FRAUD_NOTICE: FRAUD_NOTICE,
    HORIZON_NOTE: HORIZON_NOTE,
    GAP_NOTE: GAP_NOTE,
    PARTIAL_NOTICE: PARTIAL_NOTICE,
    DISCLAIMER: DISCLAIMER,
    ASSET_GUIDES: ASSET_GUIDES,
    ASSET_COMPARISON: ASSET_COMPARISON,
    ASSET_REASON: ASSET_REASON,
    NOW_ITEMS: NOW_ITEMS,
    LEARN_LABEL: LEARN_LABEL,
    assetPlanFor: assetPlanFor,
    buildResult: buildResult,
    sampleResult: sampleResult
  };
});
