/*
 * card.js — 결과 이미지(1080x1350 PNG) 그리기
 * ------------------------------------------------------------
 * Canvas API 로 결과 카드를 직접 그립니다. 개인정보는 포함하지 않습니다.
 * 디자인(색, 글자 크기, 여백)을 바꾸려면 아래 CARD 값을 수정하세요.
 */
(function (root) {
  'use strict';

  var W = 1080, H = 1350;
  var FONT_STACK = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

  var CARD = {
    navy: '#14213D',
    gold: '#C9AE74',
    text: '#141A26',
    text2: '#4A5468',
    text3: '#6B7488',
    line: '#DCE1EA',
    padX: 80,
    headerH: 128
  };

  function font(weight, size) { return weight + ' ' + size + 'px ' + FONT_STACK; }

  /** 한국어 줄바꿈: 띄어쓰기 단위로 나누고, 너무 긴 단어는 글자 단위로 자름 */
  function wrapText(ctx, text, maxWidth) {
    var words = String(text).split(/\s+/).filter(Boolean);
    var lines = [], line = '';
    words.forEach(function (word) {
      var test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxWidth) { line = test; return; }
      if (line) lines.push(line);
      if (ctx.measureText(word).width <= maxWidth) { line = word; return; }
      // 단어 하나가 너무 긴 경우 글자 단위
      line = '';
      Array.from(word).forEach(function (ch) {
        if (ctx.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ch; }
        else line += ch;
      });
    });
    if (line) lines.push(line);
    return lines;
  }

  /** 이미지에 쓸 Pretendard 글꼴을 미리 불러오기 (최대 4초 대기, 실패해도 기기 기본 글꼴로 진행) */
  function ensureFonts(sampleText) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve(false);
    var loads = ['500', '700', '800'].map(function (w) {
      return document.fonts.load(w + ' 40px "Pretendard Variable"', sampleText);
    });
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve('timeout'); }, 4000); });
    return Promise.race([Promise.all(loads), timeout])
      .then(function (r) { return r !== 'timeout'; })
      .catch(function () { return false; });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawIcon(ctx, d, cx, cy, size, color) {
    var s = size / 24;
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(d));
    ctx.restore();
  }

  /**
   * 본문 영역 배치 계산. scale 을 줄여가며 1350px 안에 들어가게 맞춥니다.
   */
  function layoutBody(ctx, result, scale) {
    var maxW = W - CARD.padX * 2;
    var f = {
      section: Math.round(30 * scale),
      desc: Math.round(34 * scale),
      action: Math.round(34 * scale),
      disclaimer: 23
    };
    ctx.font = font(500, f.desc);
    var descLines = [];
    result.desc.forEach(function (p) { descLines = descLines.concat(wrapText(ctx, p, maxW)); });

    ctx.font = font(600, f.action);
    var actionLines = result.actions.map(function (a) { return wrapText(ctx, a.text, maxW - 100); });

    ctx.font = font(500, f.disclaimer);
    var discLines = wrapText(ctx, result.disclaimer, maxW);

    var descLH = Math.round(f.desc * 1.55);
    var actLH = Math.round(f.action * 1.45);
    var actionBoxes = actionLines.map(function (ls) { return Math.max(96 * scale, ls.length * actLH + 44 * scale); });
    var bodyH =
      f.section + 26 + descLines.length * descLH + 44 +
      f.section + 26 + actionBoxes.reduce(function (a, b) { return a + b; }, 0) + 16 * 2;
    return { f: f, descLines: descLines, actionLines: actionLines, discLines: discLines, descLH: descLH, actLH: actLH, actionBoxes: actionBoxes, bodyH: bodyH };
  }

  function draw(canvas, result) {
    var ctx = canvas.getContext('2d');
    var t = result.type;
    var x0 = CARD.padX, maxW = W - CARD.padX * 2;

    // 배경
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // 상단 바
    ctx.fillStyle = CARD.navy;
    ctx.fillRect(0, 0, W, CARD.headerH);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(800, 40);
    ctx.textAlign = 'left';
    ctx.fillText('방구석월가', x0, CARD.headerH / 2);
    ctx.fillStyle = CARD.gold;
    ctx.font = font(700, 26);
    ctx.textAlign = 'right';
    ctx.fillText('MY MONEY STYLE', W - x0, CARD.headerH / 2);

    // 유형 영역
    var heroTop = CARD.headerH;
    ctx.font = font(700, 40);
    var titleLines = wrapText(ctx, result.title, maxW);
    var heroH = 430 + (titleLines.length - 1) * 56;
    ctx.fillStyle = t.soft;
    ctx.fillRect(0, heroTop, W, heroH);

    var cy = heroTop + 120;
    ctx.beginPath();
    ctx.arc(W / 2, cy, 70, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = t.color;
    ctx.stroke();
    drawIcon(ctx, t.icon, W / 2, cy, 76, t.color);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = t.color;
    ctx.font = font(700, 26);
    ctx.fillText(result.english.toUpperCase(), W / 2, heroTop + 248);
    ctx.fillStyle = CARD.text;
    ctx.font = font(800, 92);
    ctx.fillText(result.name, W / 2, heroTop + 340);
    ctx.fillStyle = t.color;
    ctx.font = font(700, 40);
    titleLines.forEach(function (l, i) { ctx.fillText(l, W / 2, heroTop + 400 + i * 56); });

    // 본문: 화면 높이에 맞게 크기 조정
    var bodyTop = heroTop + heroH + 56;
    // 하단 안내문 줄 수에 맞춰 공간 확보
    ctx.font = font(500, 23);
    var discCount = wrapText(ctx, result.disclaimer, maxW).length;
    var footerReserve = 56 + discCount * 34 + 60;
    var scale = 1, L;
    for (; scale >= 0.7; scale -= 0.05) {
      L = layoutBody(ctx, result, scale);
      if (bodyTop + L.bodyH <= H - footerReserve) break;
    }

    var y = bodyTop;
    ctx.textAlign = 'left';
    ctx.fillStyle = CARD.navy;
    ctx.font = font(800, L.f.section);
    ctx.fillText('나의 돈관리 스타일', x0, y + L.f.section * 0.8);
    y += L.f.section + 26;
    ctx.fillStyle = CARD.text;
    ctx.font = font(500, L.f.desc);
    L.descLines.forEach(function (l) { ctx.fillText(l, x0, y + L.f.desc * 0.95); y += L.descLH; });
    y += 44;

    ctx.fillStyle = CARD.navy;
    ctx.font = font(800, L.f.section);
    ctx.fillText('추천 행동 3가지', x0, y + L.f.section * 0.8);
    y += L.f.section + 26;

    result.actions.forEach(function (a, i) {
      var h = L.actionBoxes[i];
      roundRect(ctx, x0, y, maxW, h, 18);
      ctx.fillStyle = '#F6F7FA';
      ctx.fill();
      // 번호 원
      var r = 24;
      ctx.beginPath();
      ctx.arc(x0 + 26 + r, y + h / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = t.color;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = font(800, 26);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x0 + 26 + r, y + h / 2 + 1);
      // 문구
      ctx.textAlign = 'left';
      ctx.fillStyle = CARD.text;
      ctx.font = font(600, L.f.action);
      var lines = L.actionLines[i];
      var textTop = y + h / 2 - (lines.length * L.actLH) / 2 + L.actLH / 2;
      lines.forEach(function (l, j) { ctx.fillText(l, x0 + 100, textTop + j * L.actLH + 1); });
      ctx.textBaseline = 'alphabetic';
      y += h + 16;
    });

    // 하단 안내문
    var discLH = 34;
    var discTop = H - 56 - L.discLines.length * discLH;
    ctx.strokeStyle = CARD.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, discTop - 30);
    ctx.lineTo(W - x0, discTop - 30);
    ctx.stroke();
    ctx.fillStyle = CARD.text3;
    ctx.font = font(500, L.f.disclaimer);
    ctx.textAlign = 'center';
    L.discLines.forEach(function (l, i) { ctx.fillText(l, W / 2, discTop + i * discLH + 20); });

    return { overflow: y > discTop - 40, scale: Math.round(scale * 100) / 100 };
  }

  /**
   * 결과 객체 → { canvas, blob, info }
   */
  function renderCard(result) {
    var sample = [result.name, result.title, result.english, result.disclaimer, '방구석월가 MY MONEY STYLE 나의 돈관리 스타일 추천 행동 3가지 0123456789']
      .concat(result.desc).concat(result.actions.map(function (a) { return a.text; })).join(' ');
    return ensureFonts(sample).then(function (fontLoaded) {
      var canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      var info = draw(canvas, result);
      info.fontLoaded = fontLoaded;
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (blob) resolve({ canvas: canvas, blob: blob, info: info });
          else reject(new Error('이미지를 만들지 못했어요.'));
        }, 'image/png');
      });
    });
  }

  root.YMS = root.YMS || {};
  root.YMS.card = { renderCard: renderCard, wrapText: wrapText, WIDTH: W, HEIGHT: H };
})(typeof self !== 'undefined' ? self : this);
