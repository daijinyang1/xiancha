/* tools/cdp_web.mjs —— 用 tools/cdp.mjs 逐页验收 Nuxt 站点（dev 端口 3000）
   每条路由：先挂控制台监听 → 再导航 → 等水合 → 读 title/h1/正文字数 → 截图到 web/_shots/。
   用法：node tools/cdp_web.mjs [baseUrl]
*/
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, shutdown } from './cdp.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const SHOT_DIR = path.resolve(process.cwd(), 'web/_shots');

const ROUTES = [
  { path: '/', name: 'index', title: /首页/, h1: /先查一遍/ },
  { path: '/scan', name: 'scan', title: /合同风险扫描/, h1: /合同风险扫描/ },
  { path: '/rules', name: 'rules', title: /规则词条/, h1: /63 条风险规则/ },
  { path: '/rules/R01', name: 'rule-detail', title: /押金/, h1: /押金/ },
  { path: '/traps', name: 'traps', title: /避坑案例库/, h1: /避坑案例库/ },
  { path: '/certs', name: 'certs', title: /考证日历/, h1: /考证日历/ },
  { path: '/about', name: 'about', title: /关于我们/, h1: /关于「先查」/ },
];

// 后端 8080 没起时的连接失败属预期降级路径，不算页面错误
const IGNORE = [
  /Download the Vue Devtools/i,
  /favicon/i,
  /ERR_CONNECTION_REFUSED/i,
  /127\.0\.0\.1:8080/i,
  /Failed to load resource/i,
];

function isNoise(text) {
  return IGNORE.some((re) => re.test(text));
}

fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await launch({ headless: true, width: 1440, height: 1200 });
const results = [];

for (const route of ROUTES) {
  // 先开 about:blank，挂上监听，再导航——这样加载期的报错也能抓到
  const page = await newPage(browser, 'about:blank');
  const errors = [];

  const onMsg = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.sessionId !== page.sessionId) return;
    if (m.method === 'Runtime.consoleAPICalled') {
      const pp = m.params || {};
      if (pp.type === 'error' || pp.type === 'assert') {
        const text = (pp.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
        if (!isNoise(text)) errors.push('[console] ' + text);
      }
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = (m.params || {}).exceptionDetails || {};
      const text = (d.exception && (d.exception.description || d.exception.value)) || d.text || '未知异常';
      if (!isNoise(String(text))) errors.push('[exception] ' + text);
    }
  };
  browser.ws.addEventListener('message', onMsg);

  await page.send('Page.navigate', { url: BASE + route.path });

  let hydrated = true;
  try {
    await page.waitFor('document.readyState === "complete"', 15000);
    await page.waitFor('document.querySelector("main") && document.querySelector("main").innerText.trim().length > 40', 15000);
    await page.waitFor('!!document.querySelector("h1")', 8000);
  } catch (e) {
    hydrated = false;
    errors.push('水合超时：' + e.message);
  }
  // 等异步数据落定（fetchRules / fetchTraps 等）
  await new Promise((r) => setTimeout(r, 1200));

  const info = await page.eval(
    '(function(){var m=document.querySelector("main");var t=m?m.innerText.trim():"";' +
    'var h1=document.querySelector("h1");' +
    'var cards=document.querySelectorAll("article").length;' +
    'return {title:document.title, text:t, chars:t.replace(/\\s/g,"").length, h1:h1?h1.innerText.trim():"", links:document.querySelectorAll("a[href]").length, cards:cards, route:location.pathname};})()'
  );

  const shot = await page.shot(path.join(SHOT_DIR, route.name + '.png'));
  browser.ws.removeEventListener('message', onMsg);
  await page.close();

  const ok =
    hydrated &&
    info.chars > 150 &&
    info.route === route.path &&
    route.title.test(info.title) &&
    route.h1.test(info.h1) &&
    errors.length === 0;

  results.push({
    route: route.path,
    name: route.name,
    title: info.title,
    h1: info.h1,
    chars: info.chars,
    links: info.links,
    cards: info.cards,
    shot: path.relative(process.cwd(), shot.file).replace(/\\/g, '/'),
    shotKB: Math.round(shot.bytes / 1024),
    size: shot.width + 'x' + shot.height,
    errors,
    ok,
  });
  console.log(
    (ok ? 'PASS ' : 'FAIL ') + route.path.padEnd(12) +
    ' | h1=' + info.h1.slice(0, 24) +
    ' | 正文 ' + info.chars + ' 字' +
    ' | 卡片 ' + info.cards +
    ' | 截图 ' + Math.round(shot.bytes / 1024) + 'KB' +
    (errors.length ? ' | ' + errors.join(' || ') : '')
  );
}

await shutdown(browser);

const fail = results.filter((r) => !r.ok);
console.log('');
console.log('=== 汇总 ===');
console.log('通过 ' + (results.length - fail.length) + '/' + results.length);
if (fail.length) console.log('失败：' + fail.map((f) => f.route + '(' + (f.errors.join(';') || '断言不符') + ')').join(', '));
fs.writeFileSync(path.join(SHOT_DIR, 'report.json'), JSON.stringify(results, null, 2), 'utf8');
process.exit(fail.length ? 1 : 0);
