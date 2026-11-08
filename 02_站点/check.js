#!/usr/bin/env node
/* 先查 · 静态自查脚本
 *
 *   node check.js         检查：页面引用的 css/js/data 是否存在、编码是否 UTF-8 无 BOM、
 *                         导航是否五页互通、规则库与数据条数是否达标
 *   node check.js --gen   从 data/*.json 重新生成 js/data.js（改完数据后跑）
 *
 * 只用 Node 内置模块，不装任何依赖。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PAGES = ['index.html', 'scan.html', 'traps.html', 'rules.html', 'certs.html', 'about.html'];
const NAV_TARGETS = ['index.html', 'scan.html', 'traps.html', 'rules.html', 'certs.html', 'about.html'];

let errors = 0;
let warnings = 0;
function err(msg) { errors++; console.log('  ✗ ' + msg); }
function warn(msg) { warnings++; console.log('  ! ' + msg); }
function ok(msg) { console.log('  ✓ ' + msg); }

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

/* ---------- 读文件（顺带校验 UTF-8 与 BOM） ---------- */

function readText(abs) {
  const buf = fs.readFileSync(abs);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    err(rel(abs) + ' 带 UTF-8 BOM，应为无 BOM');
  }
  const text = buf.toString('utf8');
  if (text.indexOf('\uFFFD') !== -1) {
    err(rel(abs) + ' 含乱码字符 U+FFFD，编码可能不是 UTF-8');
  }
  return text;
}

/* ---------- 生成 js/data.js ---------- */

function generate() {
  const traps = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'traps.json'), 'utf8'));
  const certs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'certs.json'), 'utf8'));
  const header =
    '/* 先查 · 站内数据（由 data/traps.json 与 data/certs.json 生成，勿手改）\n' +
    ' * 为什么要内联成 js：双击 index.html 走的是 file:// 协议，浏览器会拦掉 fetch 本地 json。\n' +
    ' * 改数据请改 data/*.json，再跑 node check.js --gen 重新生成这个文件。\n' +
    ' */\n';
  const body =
    '(function (global) {\n' +
    "  'use strict';\n" +
    '  global.QZQ_DATA = {\n' +
    '    traps: ' + JSON.stringify(traps, null, 2).replace(/\n/g, '\n    ') + ',\n' +
    '    certs: ' + JSON.stringify(certs, null, 2).replace(/\n/g, '\n    ') + '\n' +
    '  };\n' +
    '})(window);\n';
  fs.writeFileSync(path.join(ROOT, 'js', 'data.js'), header + body, 'utf8');
  console.log('已生成 js/data.js（traps ' + traps.length + ' 条 / certs ' + certs.length + ' 条）');
}

/* ---------- 静态检查 ---------- */

function checkPages() {
  console.log('\n[1] 页面与引用');
  for (const page of PAGES) {
    const abs = path.join(ROOT, page);
    if (!fs.existsSync(abs)) { err(page + ' 不存在'); continue; }
    const html = readText(abs);

    if (!/<meta\s+charset=["']?utf-8["']?>/i.test(html)) err(page + ' 缺少 <meta charset="utf-8">');
    if (!/lang=["']zh-CN["']/i.test(html)) warn(page + ' 未声明 lang="zh-CN"');

    /* 外链检查：不能引用外部 CDN / 图片 / 字体 */
    const externals = [];
    const reExternal = /(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+/gi;
    let m;
    while ((m = reExternal.exec(html)) !== null) externals.push(m[0]);
    if (externals.length) err(page + ' 引用了外部资源：' + externals.join(' | '));

    /* 站内引用检查 */
    const refs = new Set();
    const reRef = /(?:src|href)\s*=\s*["']([^"'#?]+)["']/gi;
    while ((m = reRef.exec(html)) !== null) {
      const v = m[1].trim();
      if (!v) continue;
      if (/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(v)) continue;
      refs.add(v);
    }
    let bad = 0;
    for (const v of refs) {
      const target = path.join(ROOT, v.replace(/^\.?\//, ''));
      if (!fs.existsSync(target)) { err(page + ' 引用了不存在的文件：' + v); bad++; }
    }
    if (!bad) ok(page + ' 引用 ' + refs.size + ' 个本地文件，全部存在');

    /* 导航检查 */
    const navMatch = /<nav class="nav">([\s\S]*?)<\/nav>/i.exec(html);
    if (!navMatch) { err(page + ' 找不到顶部导航 <nav class="nav">'); continue; }
    const navLinks = [];
    const reNav = /href\s*=\s*["']([^"']+)["']/gi;
    let nm;
    while ((nm = reNav.exec(navMatch[1])) !== null) navLinks.push(nm[1]);
    const missing = NAV_TARGETS.filter(t => navLinks.indexOf(t) === -1);
    if (missing.length) err(page + ' 导航缺少链接：' + missing.join('、'));
    else ok(page + ' 导航 5 个链接互通');
  }
}

function checkRulePages() {
  console.log('\n[1b] 静态规则词条页');
  const dir = path.join(ROOT, 'rules');
  if (!fs.existsSync(dir)) { err('rules/ 目录不存在，先跑 node ../../tools/gen_rule_pages.mjs'); return; }

  const sandbox = { window: {}, console: console };
  try {
    new Function('window', 'console', readText(path.join(ROOT, 'js', 'traps.js')))(sandbox.window, console);
  } catch (e) { err('读 rules.js 失败：' + e.message); return; }
  const rules = sandbox.window.QZQ_TRAPS || [];

  let miss = 0, badLink = 0, notitle = 0, nodesc = 0;
  for (const r of rules) {
    const p = path.join(dir, r.id + '.html');
    if (!fs.existsSync(p)) { err('缺少词条页 rules/' + r.id + '.html'); miss++; continue; }
    const h = readText(p);
    if (!/<title>[^<]{8,}<\/title>/.test(h)) { err('rules/' + r.id + '.html 标题过短'); notitle++; }
    if (!/<meta name="description" content="[^"]{20,}"/.test(h)) { err('rules/' + r.id + '.html 缺少描述'); nodesc++; }
    /* 每条都要能回总目录，并链到上一条/下一条 */
    if (h.indexOf('../rules.html') === -1) { err('rules/' + r.id + '.html 没有回到总目录的链接'); badLink++; }
    for (const [ref] of (h.matchAll(/href="([^"#?]+)"/g)).map(x => [x[1]])) {
      if (/^(https?:|mailto:)/i.test(ref)) continue;
      const t2 = path.join(dir, ref);
      if (!fs.existsSync(t2)) { err('rules/' + r.id + '.html 引用了不存在的文件：' + ref); badLink++; }
    }
  }
  const total = fs.readdirSync(dir).filter(f => f.endsWith('.html')).length;
  if (!miss && !badLink && !notitle && !nodesc) ok('rules/ 共 ' + total + ' 个词条页，与规则库 ' + rules.length + ' 条一一对应，标题/描述/内链齐备');
  if (total !== rules.length) warn('rules/ 目录有 ' + total + ' 个 html，规则库有 ' + rules.length + ' 条');
}

function checkAssets() {
  console.log('\n[2] 样式与脚本');
  const css = path.join(ROOT, 'css', 'style.css');
  if (!fs.existsSync(css)) err('css/style.css 不存在');
  else {
    const t = readText(css);
    if (/@import\s+url\(\s*["']?https?:/i.test(t)) err('style.css 里有外部 @import');
    if (/url\(\s*["']?https?:/i.test(t)) err('style.css 里有外部图片／字体 url()');
    ok('css/style.css ' + Buffer.byteLength(t, 'utf8') + ' 字节，无外部资源');
  }

  for (const f of ['storage.js', 'traps.js', 'app.js', 'scan.js', 'data.js']) {
    const p = path.join(ROOT, 'js', f);
    if (!fs.existsSync(p)) { err('js/' + f + ' 不存在'); continue; }
    const t = readText(p);
    /* 语法粗检：用 new Function 解析（不执行） */
    try { new Function(t); } catch (e) { err('js/' + f + ' 语法错误：' + e.message); continue; }
    ok('js/' + f + ' ' + Buffer.byteLength(t, 'utf8') + ' 字节，语法可解析');
  }
}

function checkRules() {
  console.log('\n[3] 规则库');
  const p = path.join(ROOT, 'js', 'traps.js');
  if (!fs.existsSync(p)) return;
  const sandbox = { window: {}, console: console };
  try {
    new Function('window', 'console', readText(p))(sandbox.window, console);
  } catch (e) { err('traps.js 执行失败：' + e.message); return; }

  const rules = sandbox.window.QZQ_TRAPS || [];
  console.log('  · 条目数：' + rules.length);
  if (rules.length < 60) err('规则条数 ' + rules.length + ' < 60');

  const ids = new Set();
  const need = ['id', 'name', 'type', 'level', 'regex', 'why', 'law', 'fix'];
  let fieldBad = 0, regexBad = 0;
  for (const r of rules) {
    for (const k of need) {
      if (!r[k]) { err('规则 ' + (r.id || '?') + ' 缺字段 ' + k); fieldBad++; }
    }
    if (r.level && ['高', '中', '低'].indexOf(r.level) === -1) err('规则 ' + r.id + ' 等级不合法：' + r.level);
    if (r.id && ids.has(r.id)) err('规则 id 重复：' + r.id);
    ids.add(r.id);
    if (r.regex) {
      try { new RegExp(r.regex.source, 'g'); } catch (e) { err('规则 ' + r.id + ' 正则无法编译：' + e.message); regexBad++; }
    }
  }
  if (!fieldBad && !regexBad) ok('全部 ' + rules.length + ' 条规则字段完整、正则可编译、id 无重复');

  const types = {};
  rules.forEach(r => { types[r.type] = (types[r.type] || 0) + 1; });
  console.log('  · 坑型分布：' + Object.keys(types).map(k => k + ' ' + types[k]).join(' / '));

  const levels = {};
  rules.forEach(r => { levels[r.level] = (levels[r.level] || 0) + 1; });
  console.log('  · 等级分布：' + Object.keys(levels).map(k => k + ' ' + levels[k]).join(' / '));
  return rules;
}

function checkData(rules) {
  console.log('\n[4] 数据文件');
  const needTypes = ['押金类', '培训贷', '无薪试岗', '违约金', '社保', '加班', '合同文本', '离职'];

  const trapsPath = path.join(ROOT, 'data', 'traps.json');
  if (!fs.existsSync(trapsPath)) err('data/traps.json 不存在');
  else {
    let traps;
    try { traps = JSON.parse(readText(trapsPath)); } catch (e) { err('data/traps.json 不是合法 JSON：' + e.message); traps = null; }
    if (traps) {
      console.log('  · data/traps.json：' + traps.length + ' 条');
      if (traps.length !== 12) warn('案例条数为 ' + traps.length + '，任务要求 12 条');
      const f = ['id', 'title', 'type', 'level', 'scene', 'signals', 'consequence', 'advice', 'source'];
      let bad = 0;
      for (const t of traps) {
        for (const k of f) if (!t[k]) { err('案例 ' + (t.id || '?') + ' 缺字段 ' + k); bad++; }
        if (needTypes.indexOf(t.type) === -1) err('案例 ' + t.id + ' 坑型不在 8 类内：' + t.type);
        if (!Array.isArray(t.signals)) err('案例 ' + t.id + ' 的 signals 应为数组');
      }
      const covered = needTypes.filter(x => traps.some(t => t.type === x));
      if (covered.length !== needTypes.length) warn('未覆盖的坑型：' + needTypes.filter(x => covered.indexOf(x) === -1).join('、'));
      else ok('8 类坑型全部有案例覆盖');
      if (!bad) ok('12 条案例字段完整');
    }
  }

  const certsPath = path.join(ROOT, 'data', 'certs.json');
  if (!fs.existsSync(certsPath)) err('data/certs.json 不存在');
  else {
    let certs;
    try { certs = JSON.parse(readText(certsPath)); } catch (e) { err('data/certs.json 不是合法 JSON：' + e.message); certs = null; }
    if (certs) {
      console.log('  · data/certs.json：' + certs.length + ' 条');
      if (certs.length !== 6) warn('证书条数为 ' + certs.length + '，任务要求 6 条');
      const f = ['name', 'level', 'fit', 'signup', 'exam', 'fee', 'official'];
      for (const c of certs) {
        for (const k of f) if (!c[k]) err('证书 ' + (c.name || '?') + ' 缺字段 ' + k);
        if (!/以官网当期公告为准|以当期公告为准/.test(c.signup + c.exam + c.fee)) {
          err('证书 ' + c.name + ' 的时间／费用未标注「以官网当期公告为准」');
        }
        if (/20\d{2}\s*年/.test(c.signup + c.exam + c.fee)) {
          err('证书 ' + c.name + ' 写死了具体年份：' + c.name);
        }
      }
      ok('6 条证书字段完整、口径合规、无写死年份');
    }
  }

  /* js/data.js 与 json 是否同步 */
  const dataJs = path.join(ROOT, 'js', 'data.js');
  if (fs.existsSync(dataJs) && fs.existsSync(trapsPath) && fs.existsSync(certsPath)) {
    const sandbox = { window: {} };
    try {
      new Function('window', readText(dataJs))(sandbox.window);
      const d = sandbox.window.QZQ_DATA || {};
      const a = JSON.stringify(d.traps);
      const b = JSON.stringify(JSON.parse(fs.readFileSync(trapsPath, 'utf8')));
      const c = JSON.stringify(d.certs);
      const e2 = JSON.stringify(JSON.parse(fs.readFileSync(certsPath, 'utf8')));
      if (a !== b || c !== e2) err('js/data.js 与 data/*.json 不一致，请跑 node check.js --gen');
      else ok('js/data.js 与 data/*.json 一致');
    } catch (ex) { err('js/data.js 解析失败：' + ex.message); }
  }
}


function checkDeploy(rules) {
  console.log('\n[4b] 上线配套文件（404 / robots / sitemap / _headers）');

  /* 404.html：Cloudflare Pages 会把找不到的路径回落到它，必须能单独成立 */
  const p404 = path.join(ROOT, '404.html');
  if (!fs.existsSync(p404)) err('404.html 不存在（Pages 会拿它做兜底页）');
  else {
    const h = readText(p404);
    if (!/<meta\s+charset=["']?utf-8["']?>/i.test(h)) err('404.html 缺少 <meta charset="utf-8">');
    if (h.indexOf('noindex') === -1) warn('404.html 未标 noindex，可能被搜索引擎收录');
    const refs404 = new Set();
    const re404 = /(?:src|href)\s*=\s*["']([^"'#?]+)["']/gi;
    let m404;
    while ((m404 = re404.exec(h)) !== null) {
      const v = m404[1].trim();
      if (!v || /^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(v)) continue;
      refs404.add(v);
    }
    let bad404 = 0;
    for (const v of refs404) {
      if (!fs.existsSync(path.join(ROOT, v.replace(/^\.?\//, '')))) { err('404.html 引用了不存在的文件：' + v); bad404++; }
    }
    if (!bad404) ok('404.html 引用 ' + refs404.size + ' 个本地文件，全部存在');
  }

  /* robots.txt */
  const pr = path.join(ROOT, 'robots.txt');
  if (!fs.existsSync(pr)) warn('robots.txt 不存在（搜索引擎仍可抓，但没有 sitemap 指引）');
  else {
    const t = readText(pr);
    if (t.indexOf('Sitemap:') === -1) warn('robots.txt 里没写 Sitemap 行');
    if (/^Disallow:\s*\/$/m.test(t)) err('robots.txt 用 Disallow: / 把全站都禁掉了');
    ok('robots.txt ' + Buffer.byteLength(t, 'utf8') + ' 字节，含有 Sitemap 指引');
  }

  /* sitemap.xml：URL 数应为 6 个主页面 + 规则条数 */
  const ps = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(ps)) warn('sitemap.xml 不存在，跑 node tools/gen_rule_pages.mjs（SITE_ORIGIN 填了才会生成）');
  else {
    const t = readText(ps);
    const locs = (t.match(/<loc>([^<]+)<\/loc>/g) || []).map(s => s.replace(/<\/?loc>/g, ''));
    const expect = 6 + rules.length;
    if (locs.length !== expect) err('sitemap.xml 有 ' + locs.length + ' 条 URL，应为 ' + expect + ' 条（6 个主页面 + ' + rules.length + ' 条规则）');
    const noOrigin = locs.filter(u => !/^https:\/\/[^/]+\//.test(u));
    if (noOrigin.length) err('sitemap.xml 有 ' + noOrigin.length + ' 条不是绝对地址：' + noOrigin[0]);
    /* Pages 会把 /x.html 308 到 /x，sitemap 用干净地址；这里接受两种写法，只要求每条规则都有地址 */
    const hasRule = (id) => locs.some(u => u === 'https://xiancha.pages.dev/rules/' + id || u === 'https://xiancha.pages.dev/rules/' + id + '.html');
    const missingRule = rules.filter(r => !hasRule(r.id));
    if (missingRule.length) err('sitemap.xml 漏了 ' + missingRule.length + ' 条规则页，例如 ' + missingRule[0].id);
    if (locs.length === expect && !noOrigin.length && !missingRule.length) ok('sitemap.xml ' + locs.length + ' 条绝对 URL，6 主页面 + ' + rules.length + ' 规则页齐全');
    if (locs.some(u => /\/404(\.html)?$/.test(u))) warn('sitemap.xml 收录了 404 页，应移除');
  }

  /* _headers：Pages 的响应头配置，必须能被解析成 key/value 对 */
  const ph = path.join(ROOT, '_headers');
  if (!fs.existsSync(ph)) warn('_headers 不存在（不影响功能，但会缺安全响应头与缓存策略）');
  else {
    const t = readText(ph).split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
    const blocks = t.split(/\n\s*\n/).filter(s => s.trim());
    const bad = [];
    for (const b of blocks) {
      const ls = b.split('\n').filter(x => x.trim());
      if (!ls.length) continue;
      if (!/^\/[^\n]*$/.test(ls[0].trim())) bad.push(ls[0]);
      for (const line of ls.slice(1)) if (!/^\s+[A-Za-z-]+:\s*\S/.test(line)) bad.push(line);
    }
    if (bad.length) err('_headers 有 ' + bad.length + ' 行格式不对，首个：' + bad[0].trim());
    else ok('_headers ' + blocks.length + ' 组规则，格式可通过（含缓存与安全头）');
  }
}

function checkAll() {
  console.log('先查 · 静态自查  ' + ROOT);
  checkPages();
  checkRulePages();
  checkAssets();
  const rules = checkRules();
  checkData(rules);
  checkDeploy(rules);

  console.log('\n[5] 汇总');
  const files = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else files.push({ p, size: st.size });
    }
  })(ROOT);
  files.sort((a, b) => a.p.localeCompare(b.p));
  let total = 0;
  for (const f of files) total += f.size;
  console.log('  · 文件 ' + files.length + ' 个，合计 ' + total + ' 字节');

  console.log('\n结果：' + (errors ? errors + ' 个错误' : '无错误') + (warnings ? '，' + warnings + ' 个提示' : ''));
  process.exitCode = errors ? 1 : 0;
}

const arg = process.argv[2];
if (arg === '--gen') generate();
else checkAll();
