/*
 * main.js — 화면 전환과 사용자 조작
 * ------------------------------------------------------------
 * 응답은 브라우저 메모리(answers 변수)에만 저장됩니다.
 * 서버 전송, 쿠키, localStorage 저장, 외부 추적 스크립트 없음.
 */
(function () {
  'use strict';

  var YMS = window.YMS;
  var QUESTIONS = YMS.questions.QUESTIONS;
  var LETTERS = YMS.questions.OPTION_LETTERS;
  var scoring = YMS.scoring;
  var results = YMS.results;
  var N = QUESTIONS.length;

  // undefined = 아직 응답 안 함, null = 건너뜀, 0~3 = A~D
  var answers = new Array(N);
  var current = 0;
  var currentResult = null;

  var $ = function (id) { return document.getElementById(id); };
  var screens = {
    start: $('screen-start'),
    question: $('screen-question'),
    result: $('screen-result'),
    teacher: $('screen-teacher'),
    lock: $('screen-lock')
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function iconSvg(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
    window.scrollTo(0, 0);
  }

  /* ───────── 브라우저 뒤로가기 지원 ───────── */
  function go(state, replace) {
    if (replace) history.replaceState(state, '');
    else history.pushState(state, '');
    render(state);
  }
  window.addEventListener('popstate', function (e) {
    render(e.state || { screen: 'start' });
  });

  function render(state) {
    if (state.screen === 'question') {
      current = Math.max(0, Math.min(N - 1, state.index | 0));
      renderQuestion();
      show('question');
      $('q-text').focus({ preventScroll: true });
    } else if (state.screen === 'result') {
      if (!isComplete()) { render({ screen: 'start' }); return; }
      renderResult();
      show('result');
    } else {
      show('start');
    }
  }

  function isAnswered(i) { return answers[i] !== undefined; }
  function isComplete() {
    for (var i = 0; i < N; i++) if (!isAnswered(i)) return false;
    return true;
  }

  /* ───────── 질문 화면 ───────── */
  var CHECK = '<svg class="option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function renderQuestion() {
    var q = QUESTIONS[current];
    var num = current + 1;
    $('q-progress-text').textContent = num + ' / ' + N;
    $('q-progress-fill').style.width = (num / N * 100) + '%';
    $('q-progressbar').setAttribute('aria-valuenow', String(num));
    $('q-number').textContent = 'Q' + num;
    $('q-text').textContent = q.text;
    $('q-hint').hidden = !q.hint;
    $('q-hint').textContent = q.hint || '';

    var html = q.options.map(function (opt, i) {
      var checked = answers[current] === i;
      return '<button type="button" class="option" role="radio" aria-checked="' + checked + '" data-value="' + i + '">' +
        '<span class="option-letter" aria-hidden="true">' + LETTERS[i] + '</span>' +
        '<span class="option-text">' + esc(opt) + '</span>' + CHECK + '</button>';
    }).join('');
    $('q-options').innerHTML = html;

    var skipBtn = $('btn-skip');
    skipBtn.hidden = !q.skippable;
    skipBtn.setAttribute('aria-pressed', String(answers[current] === null));
    $('q-skipped').hidden = !(q.skippable && answers[current] === null);

    $('btn-prev').textContent = current === 0 ? '‹ 처음으로' : '‹ 이전';
    var next = $('btn-next');
    next.disabled = !isAnswered(current);
    next.textContent = current === N - 1 ? '결과 보기' : '다음';
  }

  function selectAnswer(value) {
    answers[current] = value;
    renderQuestion();
  }

  $('q-options').addEventListener('click', function (e) {
    var btn = e.target.closest('.option');
    if (!btn) return;
    selectAnswer(Number(btn.getAttribute('data-value')));
  });

  // 키보드: 1~4 또는 A~D로 선택, Enter로 다음
  document.addEventListener('keydown', function (e) {
    if (screens.question.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key.toUpperCase();
    var idx = '1234'.indexOf(k) !== -1 ? Number(k) - 1 : LETTERS.indexOf(k);
    if (idx >= 0 && k.length === 1) { selectAnswer(idx); return; }
    if (e.key === 'Enter' && !$('btn-next').disabled && e.target.tagName !== 'BUTTON') goNext();
  });

  $('btn-skip').addEventListener('click', function () {
    answers[current] = null;
    renderQuestion();
    goNext();
  });

  function goNext() {
    if (!isAnswered(current)) return;
    if (current < N - 1) go({ screen: 'question', index: current + 1 });
    else go({ screen: 'result' });
  }
  $('btn-next').addEventListener('click', goNext);

  $('btn-prev').addEventListener('click', function () {
    if (current === 0) go({ screen: 'start' });
    else go({ screen: 'question', index: current - 1 });
  });

  $('btn-start').addEventListener('click', function () {
    answers = new Array(N);
    currentResult = null;
    go({ screen: 'question', index: 0 });
  });

  /* ───────── 결과 화면 ───────── */
  function resultCardHtml(r, opts) {
    opts = opts || {};
    var t = r.type;
    var h = '';
    h += '<article class="result-card" style="--type-color:' + t.color + ';--type-soft:' + t.soft + '">';
    h += '<header class="result-head"><span class="brand">방구석월가</span><span class="label">MY MONEY STYLE</span></header>';
    h += '<div class="result-hero">';
    h += '<div class="type-icon">' + iconSvg(t.icon) + '</div>';
    h += '<p class="type-english">' + esc(r.english) + '</p>';
    h += '<h2 class="type-name"' + (opts.main ? ' id="r-name"' : '') + '>' + esc(r.name) + '</h2>';
    h += '<p class="type-title">' + esc(r.title) + '</p>';
    h += '</div>';

    h += '<div class="result-section result-desc"><h3>나의 돈관리 스타일</h3>';
    r.desc.forEach(function (p) { h += '<p>' + esc(p) + '</p>'; });
    if (r.personalLines && r.personalLines.length) {
      h += '<div class="personal">' + r.personalLines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>';
    }
    h += '</div>';

    if (r.partialNotice || r.fraudNotice) {
      h += '<div class="result-section">';
      if (r.partialNotice) h += '<p class="notice notice-partial"><strong>' + esc(r.partialNotice) + '</strong> ' + esc(r.partialDetail || '') + '</p>';
      if (r.fraudNotice) {
        h += '<p class="notice notice-safety"><strong>잠깐, 함께 알아두면 좋아요</strong>' + esc(r.fraudNotice) +
          '<span class="tip">' + esc(r.fraudTip) + '</span></p>';
      }
      h += '</div>';
    }

    if (r.traits.length) {
      h += '<div class="result-section"><h3>나의 금융생활 특징</h3><dl class="traits">';
      r.traits.forEach(function (tr) {
        h += '<div class="trait"><dt>' + esc(tr.label) + '</dt><dd>' + esc(tr.value) + '</dd></div>';
      });
      h += '</dl></div>';
    }

    // 자산 안내: ① 실제 준비 상태 반영  ② 유형별 학습용 (매수 추천 아님)
    function assetItems(items, whyLabel) {
      return '<div class="asset-list">' + items.map(function (item) {
        return '<div class="asset-item"><strong>' + esc(item.name) + '</strong>' +
          '<p><b>' + whyLabel + '</b> ' + esc(item.why) + '</p>' +
          '<p><b>확인할 점</b> ' + esc(item.risk) + '</p></div>';
      }).join('') + '</div>';
    }
    if (r.assetPlan) {
      var now = r.assetPlan.now, learn = r.assetPlan.learn;
      h += '<section class="result-section asset-section asset-now" aria-labelledby="asset-now-title">';
      h += '<h3 id="asset-now-title' + (opts.main ? '' : '-' + t.id) + '"><span class="step-num" aria-hidden="true">1</span>지금 먼저 준비할 자산</h3>';
      h += '<p class="asset-intro">' + esc(now.intro) + '</p>';
      h += assetItems(now.items, '역할');
      if (now.checks.length) {
        h += '<ul class="asset-checks">' + now.checks.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>';
      }
      h += '</section>';

      h += '<section class="result-section asset-section asset-learn" aria-labelledby="asset-learn-title">';
      h += '<h3 id="asset-learn-title' + (opts.main ? '' : '-' + t.id) + '"><span class="step-num" aria-hidden="true">2</span>내 유형에서 더 알아볼 자산군</h3>';
      h += '<p class="learn-label">' + esc(learn.label) + '</p>';
      if (learn.caution) h += '<p class="asset-note">' + esc(learn.caution) + '</p>';
      h += '<p class="asset-intro">' + esc(learn.intro) + '</p>';
      h += assetItems(learn.items, '배울 점');
      h += '<p class="asset-caution">' + esc(learn.footnote) + '</p></section>';
    }

    h += '<div class="result-section"><h3>추천 행동 3가지</h3><ol class="actions">';
    r.actions.forEach(function (a, i) {
      h += '<li class="action"><span class="action-num" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="action-text">' + esc(a.text) + (a.chosen ? '<span class="action-badge">내가 고른 행동</span>' : '') + '</span></li>';
    });
    h += '</ol></div>';
    h += '<div class="result-section learn-more">';
    h += '<details class="type-compare"><summary>다섯 가지 유형과 학습 자산군 비교하기</summary><div class="compare-grid">';
    results.TYPE_ORDER.forEach(function (typeId) {
      var tt = results.TYPES[typeId];
      var gg = results.ASSET_GUIDES[typeId];
      h += '<div class="compare-item"' + (typeId === r.type.id ? ' aria-current="true"' : '') + '>' +
        '<strong>' + esc(tt.name) + '</strong><p>' + esc(tt.title) + '</p>' +
        '<span>학습용 자산군: ' + esc(gg.items.map(function (item) {return item.name;}).join(' · ')) + '</span></div>';
    });
    h += '</div></details>';
    h += '<details class="type-compare"><summary>모든 유형 공통: 금융자산 8가지 비교하기</summary><p class="compare-lead">금·달러·부동산·가상자산을 포함해, 유형과 관계없이 누구나 함께 볼 수 있는 비교 자료예요.</p><div class="compare-grid">';
    results.ASSET_COMPARISON.forEach(function (item) {
      h += '<div class="compare-item"><strong>' + esc(item.name) + '</strong>' +
        '<p><b>주로 배우는 목적</b> ' + esc(item.use) + '</p>' +
        '<p><b>주요 위험</b> ' + esc(item.risk) + '</p>' +
        '<span>' + esc(item.fact) + '</span></div>';
    });
    h += '</div><p class="asset-note">자산 이름만으로 안전·위험을 단정하지 마세요. 거래 방식, 만기, 비용, 예금보호 여부에 따라 달라집니다.</p>';
    h += '<div class="source-note">교육 참고: <a href="https://www.fsc.go.kr/po020201/84975" target="_blank" rel="noopener noreferrer">금융위원회 예금보호 Q&amp;A</a> · <a href="https://open.krx.co.kr/contents/OPN/01/01050206/OPN01050206.jsp" target="_blank" rel="noopener noreferrer">한국거래소 KRX 금시장</a></div>';
    h += '</details></div>';
    h += '<p class="disclaimer">' + esc(r.disclaimer) + '</p>';
    h += '</article>';
    return h;
  }

  function renderResult() {
    var a = answers.slice();
    var c = scoring.classify(a);
    currentResult = results.buildResult(a, c);
    $('result-root').innerHTML = resultCardHtml(currentResult, { main: true });
  }

  $('btn-restart').addEventListener('click', function () {
    answers = new Array(N);
    currentResult = null;
    closeModal();
    go({ screen: 'start' });
  });

  /* ───────── 결과 이미지 저장 ───────── */
  var objectUrl = null;
  var lastFile = null;
  var isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function fileName(r) { return 'my-money-style-' + r.type.id + '.png'; }

  function saveImage(r, btn) {
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '이미지 만드는 중…';
    return YMS.card.renderCard(r).then(function (out) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(out.blob);
      var name = fileName(r);
      try { lastFile = new File([out.blob], name, { type: 'image/png' }); } catch (e) { lastFile = null; }
      window.__lastCard = { size: out.blob.size, width: out.canvas.width, height: out.canvas.height, info: out.info };

      var dl = $('btn-download');
      dl.href = objectUrl;
      dl.setAttribute('download', name);

      if (isTouch) {
        $('save-preview').src = objectUrl;
        $('btn-share').hidden = !(lastFile && navigator.canShare && navigator.canShare({ files: [lastFile] }));
        $('save-modal').hidden = false;
        $('btn-modal-close').focus();
      } else {
        dl.click();
        toast('이미지를 저장했어요 (' + name + ')');
      }
    }).catch(function () {
      toast('이미지를 만들지 못했어요. 화면을 캡처해서 저장해 주세요.');
    }).then(function () {
      btn.disabled = false;
      btn.textContent = label;
    });
  }

  function closeModal() { $('save-modal').hidden = true; }

  $('btn-save').addEventListener('click', function () {
    if (currentResult) saveImage(currentResult, this);
  });
  $('btn-modal-close').addEventListener('click', closeModal);
  $('save-modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  $('btn-share').addEventListener('click', function () {
    if (!lastFile) return;
    navigator.share({ files: [lastFile], title: '나의 돈관리 스타일' }).catch(function () { /* 사용자가 취소 */ });
  });

  /* ───────── 강사용 미리보기 ───────── */
  function renderTeacher() {
    // 질문
    $('tab-questions').innerHTML = QUESTIONS.map(function (q, i) {
      return '<div class="t-q"><h3><span>Q' + (i + 1) + '</span>' + esc(q.text) + '</h3>' +
        (q.hint ? '<p class="t-hint">안내: ' + esc(q.hint) + '</p>' : '') +
        '<ol>' + q.options.map(function (o, j) { return '<li><b>' + LETTERS[j] + '</b>' + esc(o) + '</li>'; }).join('') + '</ol>' +
        '<span class="t-role">' + esc(q.role) + (q.skippable ? ' · [답변하고 싶지 않아요] 버튼' : '') + '</span></div>';
    }).join('');

    // 유형
    $('tab-types').innerHTML = results.TYPE_ORDER.map(function (id) {
      return '<div class="t-type">' + resultCardHtml(results.sampleResult(id)) +
        '<button type="button" class="btn btn-outline btn-block" data-sample="' + id + '">이 유형 샘플 이미지 저장</button></div>';
    }).join('');

    // 분류 기준
    var R = scoring.RULES;
    var L = function (n) { return 'ABCD'.charAt(n); };
    $('tab-rules').innerHTML =
      '<div class="t-rules t-warn"><p><strong>교육용 잠정 규칙입니다.</strong> 금융기관의 검증된 투자성향·적합성 검사가 아니며, 결과를 자산 추천이나 투자 실행의 근거로 사용하지 않습니다.</p></div>' +
      '<div class="t-rules"><h3>영역별 점수</h3><p>전체를 합산하지 않고, <b>재정 준비 상태</b>와 <b>위험 선호</b>를 따로 계산한 뒤 결합합니다.</p>' +
      '<table><thead><tr><th>영역</th><th>문항</th><th>계산</th></tr></thead><tbody>' +
      '<tr><td>P 재정 준비 상태</td><td>Q3 생활비 상황 + Q4 비상금 + Q5 부채 부담</td><td>각 A0~D3, 0~9</td></tr>' +
      '<tr><td>H 금융생활 습관과 이해</td><td>Q2 생활비 파악 + Q7 합리적 소비 + Q9 금리 비교</td><td>Q7은 A0·B2·C2·D3, 0~9</td></tr>' +
      '<tr><td>T 위험 선호 성향</td><td>Q11 + Q12</td><td>0~6</td></tr>' +
      '<tr><td>D 자금 사용 시기</td><td>Q6</td><td>점수 아님: A 단기 · B 중기 · C 장기 · D 미정</td></tr>' +
      '<tr><td>E 금융지식 학습 의향</td><td>Q13</td><td>0~3</td></tr>' +
      '</tbody></table>' +
      '<p style="margin-top:10px">유형에 쓰지 않음: Q1 소득(참고), Q8 사기 예방(별도 안내), Q10·Q14(설명 개인화), Q15(실천 행동 개인화)</p></div>' +
      '<div class="t-rules"><h3>분류 순서 (위에서부터 먼저 해당하는 유형)</h3><ol>' +
      '<li><b>준비우선형</b> — 다음 중 하나<ul>' +
        '<li>Q3=A 생활비 마련이 어려움 · Q5=A 연체 또는 상환이 매우 부담</li>' +
        '<li>Q4=A 비상금 없음 이고 Q3≤B 생활비 여유 거의 없음</li>' +
        '<li>Q5 응답 시 P≤' + R.prepareMaxP + '</li>' +
        '<li>위험 선호 T≥' + R.gapMinT + ' 인데 비상금이 부족(Q4=A, 또는 Q4=B 이고 Q3≤B)</li></ul>' +
        '<i>이유: 생활비·연체·비상금 문제가 있으면 투자보다 현금흐름과 안전망이 먼저입니다. 위험 감수 의향이 높아도 감당할 여건이 부족하면 손실 시 생활이 흔들립니다.</i></li>' +
      '<li><b>적극탐색형</b> — Q5 응답, Q6=C(장기), T≥' + R.active.T + ', Q3≥' + L(R.active.Q3) + ', Q4≥' + L(R.active.Q4) + ', Q5≥' + L(R.active.Q5) + ', H≥' + R.active.H + ', E≥' + R.active.E + ' 모두 충족' +
        '<br><i>이유: 생활비·비상금·부채가 안정되고, 장기 목표가 있으며, 변동을 감수할 의향과 학습 의지가 함께 있을 때만 배정합니다. 추천 행동은 모두 손실 관리 중심입니다.</i></li>' +
      '<li><b>성장탐색형</b> — Q5 응답, Q6=C(장기), T≥' + R.growth.T + ', P≥' + R.growth.P + ', Q4≥' + L(R.growth.Q4) + ', Q5≥' + L(R.growth.Q5) + ', H≥' + R.growth.H + ', E≥' + R.growth.E + ' 모두 충족' +
        '<br><i>이유: 기본 안전망과 장기 목표가 있으면 장기·분산투자의 원리를 배우기 좋은 시기입니다.</i></li>' +
      '<li><b>안정중시형</b> — T≤' + R.stableMaxT + '<br><i>이유: 원금 보전·예측 가능성을 중시하는 성향 자체를 존중합니다. 준비 상태와 무관하게 나올 수 있습니다.</i></li>' +
      '<li><b>분산안정형</b> — 나머지 (위험 선호 중간 이상이지만 장기 목표·준비 조건 중 일부가 아직 없음)</li></ol></div>' +
      '<div class="t-rules"><h3>특별 처리</h3><ul>' +
      '<li><b>Q5 건너뛰기</b>: 0점(부채 부담 큼)도, 부채 없음도 아닙니다. Q3·Q4 평균값으로 자리를 채운 추정치를 쓰며, 성장·적극탐색형은 배정하지 않고 결과에 한계를 안내합니다.</li>' +
      '<li><b>Q6 미정(D)</b>: 그 자체로 준비우선형이나 낮은 점수가 되지 않으며, 장기로도 보지 않습니다. 결과에 "언제, 무엇에 쓸 돈인지부터 정해 보기" 안내가 붙습니다. 단기(A)는 가격 변동이 없는 곳에 모으라는 안내가 붙습니다.</li>' +
      '<li><b>비상금 보완</b>: 위험 선호 T≥' + R.gapMinT + ' 이고 비상금이 1개월 미만이지만 생활비 여유가 있어 분산안정형이 된 경우, 추천 행동 1번이 "비상금 목표 먼저 세우기"로 바뀝니다.</li>' +
      '<li><b>Q1 소득</b>만으로 유형이 정해지지 않습니다. Q3은 소득 출처(근로·가족 지원·모아둔 돈)와 무관하게 생활비 충당 여부만 묻습니다.</li>' +
      '<li><b>Q7 합리적 소비</b>: 중고거래 여부가 아니라 필요성·예산·가격 비교 등 소비 판단을 봅니다. 가격 비교(B)와 중고거래(C)는 같은 점수입니다.</li>' +
      '<li>Q8에서 A, B 또는 C를 고르면 유형과 별도로 금융사기 예방 안내가 표시됩니다.</li>' +
      '<li><b>자산 안내 ①</b> 지금 먼저 준비할 자산: 생활비·비상금·부채·사용 시기를 반영하며 입출금예금과 보호 대상 예금·적금만 나옵니다. <b>②</b> 내 유형에서 더 알아볼 자산군: 유형별 학습용 목록이며 매수 추천이 아닙니다. ①이 우선인 참가자에게는 "지금은 ① 준비가 먼저" 안내가 함께 표시됩니다. 금·달러·부동산·가상자산은 모든 유형 공통 비교 자료로 제공합니다.</li>' +
      '<li>Q15에서 고른 행동은 추천 행동 3개 중 하나에 반영되며 "내가 고른 행동"으로 표시됩니다. 사기 예방·손실 관리 같은 안전 행동은 지워지지 않습니다.</li>' +
      '</ul></div>' +
      '<div class="t-rules"><h3>운영상 제한</h3><ul>' +
      '<li>서버가 없어 수강생 응답을 수집·조회할 수 없습니다.</li>' +
      '<li>실시간 참가자 수, 유형별 통계는 제공되지 않습니다. 필요하면 손들기 등으로 현장에서 집계하세요.</li>' +
      '<li>새로고침하면 응답이 사라집니다(기기에 저장하지 않음).</li></ul></div>';

    var tabs = document.querySelectorAll('.tab');
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          $('tab-' + t.getAttribute('data-tab')).hidden = !on;
        });
      });
    });

    $('tab-types').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sample]');
      if (b) saveImage(results.sampleResult(b.getAttribute('data-sample')), b);
    });
  }

  /* ───────── 강사용 잠금 (간단 잠금 · 해제 상태는 저장하지 않음) ───────── */
  function setupTeacherLock() {
    var cfg = window.YMS_TEACHER_CONFIG || {};
    var fails = 0, lockedUntil = 0;
    var input = $('lock-input'), err = $('lock-error'), btn = $('lock-submit');
    show('lock');
    input.focus();

    function showError(msg) { err.textContent = msg; err.hidden = false; }

    $('lock-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now < lockedUntil) {
        showError(Math.ceil((lockedUntil - now) / 1000) + '초 뒤에 다시 시도해 주세요.');
        return;
      }
      if (!cfg.passHash) { showError('강사 비밀번호가 설정되지 않았어요. README의 비밀번호 설정 방법을 확인해 주세요.'); return; }
      if (YMS.teacherLock.check(input.value, cfg.passHash)) {
        input.value = '';
        renderTeacher();
        show('teacher');
        return;
      }
      fails++;
      input.value = '';
      if (fails >= 5) {
        fails = 0;
        lockedUntil = now + 30000;
        btn.disabled = true;
        setTimeout(function () { btn.disabled = false; err.hidden = true; }, 30000);
        showError('비밀번호가 5번 틀렸어요. 30초 뒤에 다시 시도해 주세요.');
      } else {
        showError('비밀번호가 맞지 않아요.');
      }
      input.focus();
    });
  }

  /* ───────── 시작 ───────── */
  var params = new URLSearchParams(location.search);
  if (params.get('mode') === 'teacher') {
    document.title = '강사용 미리보기 | 내 상황에 맞는 돈관리 스타일 찾기';
    setupTeacherLock();
  } else {
    go({ screen: 'start' }, true);
  }

  // 자동 테스트용 도우미 (이 기기 안에서만 읽을 수 있고, 외부로 전송하지 않음)
  window.__YMS_TEST__ = {
    getAnswers: function () { return answers.slice(); },
    getResultType: function () { return currentResult && currentResult.type.id; }
  };
})();
