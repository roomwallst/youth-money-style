/*
 * 브라우저 자동 점검 (선택 사항)
 * Playwright 가 설치된 환경에서만 실행됩니다:  npm run test:e2e
 * 설치가 필요하면: npm install --no-save playwright && npx playwright install chromium
 *
 * 점검 항목: 360/390/430/1920px 화면, 15문항 진행, 이전/수정, 미응답 시 다음 버튼,
 *           Q5 건너뛰기, 결과 출력, PNG 저장(1080x1350), 다시 시작 초기화,
 *           강사용 미리보기, 외부 네트워크 요청 없음, 가로 스크롤 없음
 * 스크린샷: E2E_SHOTS 환경변수 폴더(기본: ./e2e-shots)
 */
'use strict';
const path = require('path');
const fs = require('fs');
const assert = require('assert/strict');
const { start } = require('./serve.js');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.log('Playwright 가 없어 브라우저 점검을 건너뜁니다. (npm install --no-save playwright)');
  process.exit(0);
}

const PORT = 8123;
const BASE = 'http://localhost:' + PORT + '/';
const SHOTS = process.env.E2E_SHOTS || path.join(__dirname, '..', 'e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

function pngSize(buf) {
  assert.equal(buf.slice(1, 4).toString(), 'PNG', 'PNG 파일이 아님');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const VIEWPORTS = [
  { name: '360', width: 360, height: 740, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '430', width: 430, height: 932, mobile: true },
  { name: '1920', width: 1920, height: 1080, mobile: false }
];

// 적극탐색형이 나오는 응답 (Q5는 C로 다시 선택, Q6=C 장기)
const PATH_ANSWERS = [3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 1];

let failures = 0;
async function check(name, fn) {
  try { await fn(); console.log('  ✔ ' + name); }
  catch (e) { failures++; console.log('  ✘ ' + name + '\n    ' + (e && e.message)); }
}

async function noHorizontalScroll(page) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(o.sw <= o.cw, '가로 스크롤 발생: ' + o.sw + ' > ' + o.cw);
}

(async () => {
  const server = await start(PORT);
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      console.log('\n[' + vp.name + 'px]');
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile, acceptDownloads: true
      });
      const page = await ctx.newPage();
      const external = [];
      const errors = [];
      page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) external.push(r.url()); });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      await page.goto(BASE);
      await page.evaluate(() => document.fonts.ready);

      await check('시작 화면 표시', async () => {
        assert.equal(await page.locator('a[href*="mode=teacher"]').count(), 0, '시작 화면에 강사용 링크가 없어야 함');
        assert.equal(await page.textContent('#start-title'), '내 상황에 맞는돈관리 스타일 찾기');
        assert.ok(await page.isVisible('#btn-start'));
        await noHorizontalScroll(page);
        await page.screenshot({ path: path.join(SHOTS, vp.name + '-1-start.png'), fullPage: true });
      });

      await page.click('#btn-start');

      await check('Q1 표시, 4개 선택지, 미응답 시 다음 버튼 비활성', async () => {
        assert.equal(await page.textContent('#q-progress-text'), '1 / 15');
        assert.equal(await page.locator('.option').count(), 4);
        assert.ok(await page.isDisabled('#btn-next'));
      });

      await check('15문항 진행 (진행률, 선택 강조, 이전/수정, Q5 건너뛰기)', async () => {
        for (let i = 0; i < 15; i++) {
          assert.equal(await page.textContent('#q-progress-text'), (i + 1) + ' / 15');
          assert.equal(await page.locator('.option').count(), 4, 'Q' + (i + 1) + ' 선택지 수');
          const w = await page.$eval('#q-progress-fill', (el) => el.style.width);
          assert.equal(parseFloat(w).toFixed(2), ((i + 1) / 15 * 100).toFixed(2));
          if (i === 4) {
            assert.ok(await page.isVisible('#btn-skip'), 'Q5 건너뛰기 버튼');
            await page.click('#btn-skip');
            assert.equal(await page.textContent('#q-progress-text'), '6 / 15');
            assert.equal((await page.evaluate(() => window.__YMS_TEST__.getAnswers()))[4], null, '건너뛴 Q5는 null');
            // 이전으로 돌아가 Q5 다시 선택
            await page.click('#btn-prev');
            assert.equal(await page.textContent('#q-progress-text'), '5 / 15');
            assert.ok(await page.isVisible('#q-skipped'));
            assert.ok(await page.isEnabled('#btn-next'), '건너뛴 문항은 다음 가능');
          } else {
            assert.ok(!(await page.isVisible('#btn-skip')), 'Q' + (i + 1) + '에는 건너뛰기 없음');
          }
          if (i === 2) {
            // 응답 수정 확인: 먼저 A 선택 후 D로 변경
            await page.click('.option[data-value="0"]');
            await page.click('.option[data-value="3"]');
            assert.equal(await page.locator('.option[aria-checked="true"]').count(), 1);
          }
          await page.click('.option[data-value="' + PATH_ANSWERS[i] + '"]');
          assert.equal(await page.getAttribute('.option[data-value="' + PATH_ANSWERS[i] + '"]', 'aria-checked'), 'true');
          if (i === 0 && vp.name === '360') await page.screenshot({ path: path.join(SHOTS, vp.name + '-2-question.png') });
          if (i === 6) { await noHorizontalScroll(page); await page.screenshot({ path: path.join(SHOTS, vp.name + '-3-q7.png') }); }
          if (i === 10) { await noHorizontalScroll(page); await page.screenshot({ path: path.join(SHOTS, vp.name + '-3-q11.png') }); }
          if (i === 14) assert.equal((await page.textContent('#btn-next')).trim(), '결과 보기');
          if (i === 6) {
            // 이전으로 갔다가 이전 응답이 유지되는지
            await page.click('#btn-next');
            await page.click('#btn-prev');
            assert.equal(await page.getAttribute('.option[data-value="' + PATH_ANSWERS[6] + '"]', 'aria-checked'), 'true');
          }
          await page.click('#btn-next');
        }
      });

      await check('결과 화면: 유형, 추천 행동 3개, 안내문', async () => {
        assert.ok(await page.isVisible('#screen-result'));
        assert.equal(await page.evaluate(() => window.__YMS_TEST__.getResultType()), 'active');
        assert.equal(await page.textContent('#r-name'), '적극탐색형');
        assert.equal(await page.locator('.action').count(), 3);
        assert.equal(await page.locator('.action-badge').count(), 1);
        assert.ok((await page.textContent('.disclaimer')).includes('적합성 검사가 아닌'));
        assert.equal(await page.locator('.notice-safety').count(), 0);
        assert.ok(await page.isVisible('.asset-now'), '① 지금 먼저 준비할 자산');
        assert.ok(await page.isVisible('.asset-learn'), '② 내 유형에서 더 알아볼 자산군');
        assert.equal(await page.locator('.asset-now .asset-item').count(), 1);
        assert.equal(await page.locator('.asset-learn .asset-item').count(), 3);
        assert.ok((await page.textContent('.learn-label')).includes('매수 추천이 아닙니다'));
        assert.equal(await page.locator('.asset-now').filter({ hasText: /주식|ETF|채권/ }).count(), 0);
        assert.equal(await page.locator('details.type-compare').count(), 2);
        const fontOk = await page.evaluate(() => document.fonts.check('700 16px "Pretendard Variable"', '분산'));
        assert.ok(fontOk, 'Pretendard 로딩');
        await noHorizontalScroll(page);
        await page.screenshot({ path: path.join(SHOTS, vp.name + '-4-result.png'), fullPage: true });
      });

      await check('결과 이미지 저장 (1080x1350 PNG)', async () => {
        if (vp.mobile) {
          await page.click('#btn-save');
          await page.waitForSelector('#save-modal:not([hidden])');
          const card = await page.evaluate(() => window.__lastCard);
          assert.equal(card.width, 1080); assert.equal(card.height, 1350);
          assert.ok(card.info.fontLoaded, 'Pretendard 로딩');
          assert.ok(!card.info.overflow, '글자가 넘침');
          const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
          const buf = fs.readFileSync(await dl.path());
          assert.deepEqual(pngSize(buf), { w: 1080, h: 1350 });
          fs.writeFileSync(path.join(SHOTS, vp.name + '-5-card.png'), buf);
          await page.screenshot({ path: path.join(SHOTS, vp.name + '-5-modal.png') });
          await page.click('#btn-modal-close');
        } else {
          const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-save')]);
          const buf = fs.readFileSync(await dl.path());
          assert.deepEqual(pngSize(buf), { w: 1080, h: 1350 });
          assert.equal(dl.suggestedFilename(), 'my-money-style-active.png');
        }
      });

      await check('다시 진단하기 → 응답 초기화', async () => {
        await page.click('#btn-restart');
        assert.ok(await page.isVisible('#screen-start'));
        const a = await page.evaluate(() => window.__YMS_TEST__.getAnswers());
        assert.ok(a.every((v) => v === undefined || v === null) && a.filter((v) => v !== undefined && v !== null).length === 0);
        await page.click('#btn-start');
        assert.equal(await page.locator('.option[aria-checked="true"]').count(), 0);
        assert.ok(await page.isDisabled('#btn-next'));
      });

      await check('외부 네트워크 요청 없음 / 콘솔 오류 없음', async () => {
        assert.deepEqual(external, []);
        assert.deepEqual(errors, []);
      });
      await ctx.close();
    }

    // Q5 건너뛰기 + 사기 안내 결과
    console.log('\n[Q5 건너뛰기 + 사기 예방 안내]');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(BASE);
      await page.click('#btn-start');
      const A = [1, 2, 2, 2, null, 3, 2, 0, 2, 1, 3, 3, 2, 2, 2];
      for (let i = 0; i < 15; i++) {
        if (A[i] === null) { await page.click('#btn-skip'); continue; }
        await page.click('.option[data-value="' + A[i] + '"]');
        await page.click('#btn-next');
      }
      await check('참고용 안내 + 사기 예방 안내 표시', async () => {
        assert.ok((await page.textContent('.notice-partial')).includes('일부 정보가 없어 참고용으로 분류했습니다'));
        assert.ok(await page.isVisible('.notice-safety'));
        assert.ok((await page.textContent('.asset-checks')).includes('부채 문항에 답하지 않았어요'), '① 점검 항목');
        assert.ok((await page.textContent('.asset-learn .asset-note')).includes('① 준비가 먼저'), '② 공부용 안내');
        await page.click('details.type-compare >> nth=1');
        await page.screenshot({ path: path.join(SHOTS, 'skip-result-open.png'), fullPage: true });
        assert.equal(await page.textContent('#r-name'), '분산안정형');
        await page.screenshot({ path: path.join(SHOTS, 'skip-result.png'), fullPage: true });
      });
      await ctx.close();
    }

    // 비상금 보완 (위험 선호 높음 + 비상금 1개월 미만) + Q6 미정
    console.log('\n[비상금 보완 · 시기 미정]');
    {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(BASE);
      await page.click('#btn-start');
      const A = [2, 2, 2, 1, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3];
      for (let i = 0; i < 15; i++) { await page.click('.option[data-value="' + A[i] + '"]'); await page.click('#btn-next'); }
      await check('분산안정형 + 비상금 행동 + 시기 미정 안내', async () => {
        assert.equal(await page.textContent('#r-name'), '분산안정형');
        assert.ok((await page.textContent('.action')).includes('비상금'));
        assert.equal(await page.locator('.personal p').count(), 4); // 고민·목표 / Q7 소비 / 시기 미정 / 비상금
        await noHorizontalScroll(page);
        await page.screenshot({ path: path.join(SHOTS, 'gap-result.png'), fullPage: true });
      });
      await ctx.close();
    }

    // 강사용 미리보기 + 유형별 샘플 이미지
    console.log('\n[강사용 미리보기]');
    {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
      const page = await ctx.newPage();
      const { hashPassword } = require('../teacher-lock.js');
      await page.route('**/teacher-config.js', (route) => route.fulfill({
        contentType: 'text/javascript',
        body: "window.YMS_TEACHER_CONFIG = { passHash: '" + hashPassword('test-pass-1234') + "' };"
      }));
      await page.goto(BASE + '?mode=teacher');
      await check('강사용 잠금: 비밀번호 없이는 열리지 않음', async () => {
        assert.ok(await page.isVisible('#screen-lock'));
        assert.ok(!(await page.isVisible('#screen-teacher')));
        assert.equal(await page.locator('#tab-questions .t-q').count(), 0, '잠금 상태에서 내용이 그려지면 안 됨');
        await page.fill('#lock-input', 'wrong');
        await page.click('#lock-submit');
        assert.ok((await page.textContent('#lock-error')).includes('맞지 않아요'));
        assert.ok(!(await page.isVisible('#screen-teacher')));
        await page.screenshot({ path: path.join(SHOTS, 'teacher-lock.png') });
        await page.fill('#lock-input', 'test-pass-1234');
        await page.click('#lock-submit');
        assert.ok(await page.isVisible('#screen-teacher'));
      });
      await check('질문 15개 / 유형 5개 / 분류 기준', async () => {
        assert.equal(await page.locator('#tab-questions .t-q').count(), 15);
        assert.equal(await page.locator('#tab-questions .t-q li').count(), 60);
        await page.screenshot({ path: path.join(SHOTS, 'teacher-questions.png') });
        await page.click('.tab[data-tab="types"]');
        assert.equal(await page.locator('#tab-types .result-card').count(), 5);
        await page.screenshot({ path: path.join(SHOTS, 'teacher-types.png'), fullPage: true });
        await page.click('.tab[data-tab="rules"]');
        assert.ok((await page.textContent('#tab-rules')).includes('교육용 잠정 규칙'));
        await page.screenshot({ path: path.join(SHOTS, 'teacher-rules.png'), fullPage: true });
        await page.click('.tab[data-tab="types"]');
      });
      for (const id of ['prepare', 'stable', 'balance', 'growth', 'active']) {
        await check('샘플 이미지: ' + id, async () => {
          const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-sample="' + id + '"]')]);
          const buf = fs.readFileSync(await dl.path());
          assert.deepEqual(pngSize(buf), { w: 1080, h: 1350 });
          const card = await page.evaluate(() => window.__lastCard);
          assert.ok(card.info.fontLoaded, '폰트 로딩');
          assert.ok(!card.info.overflow, '넘침');
          fs.writeFileSync(path.join(SHOTS, 'card-' + id + '.png'), buf);
        });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures ? '\n실패 ' + failures + '건' : '\n모든 브라우저 점검 통과');
  process.exit(failures ? 1 : 0);
})();
