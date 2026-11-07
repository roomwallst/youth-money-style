/* 강사용 미리보기 비밀번호 변경. 실행: npm run set-password -- 새비밀번호 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { hashPassword } = require('../teacher-lock.js');
const pw = (process.argv[2] || '').trim();
if (pw.length < 4) { console.error('새 비밀번호는 4자 이상이어야 합니다.'); process.exit(1); }
const file = path.join(__dirname,'..','teacher-config.js');
const content = [
  '/* 강사용 미리보기 비밀번호 해시값 — 자동 생성 */',
  'window.YMS_TEACHER_CONFIG = {',
  "  passHash: '" + hashPassword(pw) + "'",
  '};',
  ''
].join('\n');
fs.writeFileSync(file, content, 'utf8');
console.log('비밀번호 해시를 갱신했습니다. teacher-config.js를 다시 배포해야 적용됩니다.');
