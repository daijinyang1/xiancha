// 线上探测小工具（可复用，参数化，避免每次写新脚本）
// 用法：node tools/_probe.mjs [host] [path1,path2,...] [--repeat=N] [--wait=MS]
import https from 'node:https';

const host = process.argv[2] || 'xiancha.pages.dev';
const paths = (process.argv[3] || '/').split(',').filter(Boolean);
const repeatArg = process.argv.find((a) => a.startsWith('--repeat='));
const waitArg = process.argv.find((a) => a.startsWith('--wait='));
const repeat = repeatArg ? Number(repeatArg.split('=')[1]) : 1;
const wait = waitArg ? Number(waitArg.split('=')[1]) : 3000;

function get(host, path) {
  return new Promise((resolve) => {
    const req = https.get({ host, path, timeout: 15000 }, (res) => {
      let n = 0;
      let head = '';
      res.on('data', (c) => {
        n += c.length;
        if (head.length < 80) head += c.toString('utf8', 0, Math.min(c.length, 80));
      });
      res.on('end', () => resolve([path, res.statusCode, n, res.headers['cf-cache-status'] || '-', head.replace(/\s+/g, ' ').slice(0, 60)]));
    });
    req.on('error', (e) => resolve([path, 'ERR', 0, '-', e.message]));
    req.on('timeout', () => { req.destroy(); resolve([path, 'TIMEOUT', 0, '-', '']); });
  });
}

(async () => {
  for (let i = 1; i <= repeat; i += 1) {
    for (const p of paths) {
      const [path, status, bytes, cache, head] = await get(host, p);
      console.log(`[${i}] ${path.padEnd(44)} ${String(status).padEnd(8)} ${String(bytes).padEnd(7)} cache=${cache}  ${head}`);
    }
    if (i < repeat) await new Promise((r) => setTimeout(r, wait));
  }
})();
