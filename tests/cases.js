// 가상 참가자 사례 (테스트와 scripts/cases.js 보고서에서 함께 사용)
// answers: Q1~Q15 순서의 A~D 문자, '-' = 건너뜀
'use strict';

module.exports = [
  {
    id: 'A',
    title: '정기 소득은 없지만 생활비를 관리하고 비상금도 어느 정도 있는 청년',
    //        Q1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
    answers: 'A C C C D C D D B C  C  B  C  D  D',
    expect: 'growth',
    point: '소득이 없다는 이유만으로 준비우선형이 되지 않음'
  },
  {
    id: 'B',
    title: '정기 소득은 있지만 생활비 부족과 비상금 문제로 어려움을 겪는 청년',
    answers: 'D B A A C B B C B A  C  C  B  A  A',
    expect: 'prepare',
    point: '소득이 있어도 생활비·비상금이 부족하면 생활 기반이 먼저'
  },
  {
    id: 'C',
    title: '주식투자에 관심은 많지만 비상금이 없는 청년',
    answers: 'C C C A D C C C C D  D  D  D  D  D',
    expect: 'prepare',
    point: '위험 선호가 최고(T=6)여도 비상금이 없으면 준비우선형'
  },
  {
    id: 'C-2',
    title: '(보조) 주식투자 관심이 많고, 생활비 여유는 있지만 비상금이 1개월 미만인 청년',
    answers: 'C C C B D C C C C D  D  D  D  D  D',
    expect: 'balance',
    expectGap: true,
    point: '분산안정형이지만 추천 행동 1번이 비상금 목표로 바뀌고 안내 문장 추가'
  },
  {
    id: 'D',
    title: '중고거래를 자주 하지만 소득이 불규칙한 청년',
    answers: 'B B B B C B C C B B  B  C  C  B  B',
    expect: 'balance',
    point: '소득이 불규칙해도 생활비를 충당하면 준비우선형이 아님. 중고거래(Q7=C)는 H 2점'
  },
  {
    id: 'E',
    title: '중고거래는 하지 않지만 필요한 소비를 신중하게 결정하고 지출을 잘 관리하는 청년',
    answers: 'C D D C D A B C C A  A  B  B  B  A',
    expect: 'stable',
    point: '중고거래 대신 가격 비교(Q7=B)를 해도 H 점수가 같음'
  },
  {
    id: 'F',
    title: '아직 저축이나 자산형성 목표가 정해지지 않은 청년',
    answers: 'B C C C D D C C C D  C  C  C  B  D',
    expect: 'balance',
    point: '시기 미정(Q6=D)은 장기로 보지 않아 탐색형이 아니고, 준비우선형도 아님'
  },
  {
    id: 'G',
    title: '장기 목표와 비상금이 있고 투자 위험도 이해하는 청년',
    answers: 'D D C D D C D D D D  C  D  D  D  D',
    expect: 'active',
    point: '준비 상태·장기 목표·위험 선호·학습 의향이 모두 갖춰질 때만 적극탐색형'
  }
];
