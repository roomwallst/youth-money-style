/*
 * 로컬 실행용 아주 작은 웹서버 (설치할 패키지 없음)
 * 실행: npm start   → 브라우저에서 http://localhost:8080
 * 포트 변경: PORT=3000 npm start  (Windows PowerShell: $env:PORT=3000; npm start)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.ico': 'image/x-icon'
};

function start(port) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.normalize(path.join(ROOT, urlPath));
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (require.main === module) {
  start(PORT).then(() => {
    console.log('');
    console.log('  내 상황에 맞는 돈관리 스타일 찾기 — 로컬 실행 중');
    console.log('  수강생 화면 : http://localhost:' + PORT + '/');
    console.log('  강사용 화면 : http://localhost:' + PORT + '/?mode=teacher');
    console.log('  종료하려면 이 창에서 Ctrl + C');
    console.log('');
  });
}
module.exports = { start };
