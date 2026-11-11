// 只看状态码与关键响应头（含多次跳转跟随），用来判断 Pages 的重定向口径
//   node tools/_head.mjs [host] [path1,path2,...]
import https from 'node:https';

const host = process.argv[2] || 'xiancha.pages.dev';
const paths = (process.argv[3] || '/,/scan,/rules,/rules/R01').split(',').filter(Boolean);

function req(path) {
  return new Promise((resolve) => {
    const r = https.get({ host, path, timeout: 15000 }, (res) => {
      const keys = ['location', 'content-type', 'content-length', 'cache-control', 'cf-cache-status', 'x-frame-options', 'x-content-type-options'];
      const h = {};
      for (const k of keys) if (res.headers[k]) h[k] = res.headers[k];
      res.resume();
      res.on('end', () => resolve({ path, status: res.statusCode, h }));
    });
    r.on('error', (e) => resolve({ path, status: 'ERR', h: { error: e.message } }));
    r.on('timeout', () => { r.destroy(); resolve({ path, status: 'TIMEOUT', h: {} }); });
  });
}

for (const p of paths) {
  const r = await req(p);
  console.log(`${r.path.padEnd(18)} ${String(r.status).padEnd(6)} ${JSON.stringify(r.h)}`);
  // 跟随一次，看最终落点
  if (r.status >= 300 && r.status < 400 && r.h.location) {
    const loc = r.h.location.startsWith('http') ? r.h.location : r.h.location;
    const target = loc.startsWith('http') ? loc : loc;
    console.log(`${'  ↳ ' + target}`.padEnd(20));
  }
}
