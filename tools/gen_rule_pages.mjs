#!/usr/bin/env node
/* 先查 · 静态规则词条生成器
 *
 *   node tools/gen_rule_pages.mjs
 *
 * 读 02_站点/js/traps.js（唯一真源）与 data/traps.json（案例），
 * 为每条规则生成一个独立的静态页面 02_站点/rules/R01.html …，
 * 每条自带 title / meta description / 法条 / 改法 / 关联案例 / 上一条下一条。
 *
 * 为什么要静态化：单页里用 JS 渲染的 63 条规则，搜索引擎抓不到任何正文，
 * 等于没有内容资产。一条一页才有独立 URL、独立标题、独立描述。
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');   // 先查项目/
const SITE = path.join(ROOT, '02_站点');
const OUT = path.join(SITE, 'rules');
const SITE_VER = '1.0';

/* 上线拿到域名后，把这里改成你的地址（例如 https://xiancha.pages.dev），
   再跑一次本脚本，就会同时生成 sitemap.xml。留空则不生成，避免写死一个假网址。 */
const SITE_ORIGIN = 'https://xiancha.pages.dev';

/* ---------- 读规则（在 vm 里跑 traps.js） ---------- */
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SITE, 'js', 'traps.js'), 'utf8'), ctx);
const RULES = ctx.window.QZQ_TRAPS || [];

const CASES = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'traps.json'), 'utf8'));

if (!RULES.length) { console.error('没有读到规则，检查 js/traps.js'); process.exit(1); }

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const byId = {};
RULES.forEach((r, i) => { byId[r.id] = { rule: r, index: i }; });

/* 案例与规则用坑型关联：同一坑型下的案例，就是这条规则的真实样本 */
const casesOf = (type) => CASES.filter((c) => c.type === type);

const NAV = [
  ['../index.html', '首页', 'index'],
  ['../scan.html', '合同扫描', 'scan'],
  ['../traps.html', '避坑库', 'traps'],
  ['../rules.html', '规则词条', 'rules'],
  ['../certs.html', '考证日历', 'certs'],
  ['../about.html', '关于我们', 'about'],
];

function shell(active, title, desc, body) {
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="stylesheet" href="../css/style.css">\n' +
    '</head>\n<body>\n' +
    '<header class="site-header">\n' +
    '  <div class="wrap header-inner">\n' +
    '    <a class="brand" href="../index.html">\n' +
    '      <span class="brand-mark">查</span>\n' +
    '      <span class="brand-text">先查<small>XIAN CHA</small></span>\n' +
    '    </a>\n' +
    '    <nav class="nav">\n' +
    NAV.map(([href, text, key]) =>
      '      <a href="' + href + '"' + (key === active ? ' class="active"' : '') + '>' + text + '</a>\n'
    ).join('') +
    '    </nav>\n' +
    '  </div>\n' +
    '</header>\n\n' +
    '<main>\n  <div class="wrap">\n' + body + '  </div>\n</main>\n\n' +
    '<footer class="site-footer">\n' +
    '  <div class="wrap">\n' +
    '    <div>「先查」· 大学生的查询站 · 全部内容在浏览器本地运行，不收集、不上传任何合同内容。</div>\n' +
    '    <div class="links">\n' +
    '      <a href="../scan.html">合同扫描</a>\n' +
    '      <a href="../traps.html">避坑库</a>\n' +
    '      <a href="../rules.html">规则词条</a>\n' +
    '      <a href="../certs.html">考证日历</a>\n' +
    '      <a href="../about.html">关于我们</a>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</footer>\n</body>\n</html>\n';
}

function caseBlock(type) {
  const list = casesOf(type);
  if (!list.length) return '';
  return '\n    <div class="card">\n' +
    '      <div class="card-title"><h2>这条规则在真实案例里的样子</h2>' +
    '<a class="badge badge-gray" href="../traps.html?type=' + encodeURIComponent(type) + '">同类共 ' + list.length + ' 条 →</a></div>\n' +
    '      <ul class="plain-list" style="margin-bottom:0;">\n' +
    list.map((c) =>
      '        <li><b>' + esc(c.title) + '</b><br>' +
      '<span style="color:var(--ink-3);">信号：' + esc((c.signals || []).slice(0, 2).join('；')) + '</span></li>\n'
    ).join('') +
    '      </ul>\n' +
    '    </div>\n';
}

function pager(index) {
  const prev = RULES[index - 1];
  const next = RULES[index + 1];
  const a = prev
    ? '<a href="' + prev.id + '.html"><span style="color:var(--ink-3);font-size:12px;display:block;">上一条</span>' + esc(prev.ask) + '</a>'
    : '<span style="color:var(--ink-3);font-size:13px;">已经是第一条</span>';
  const b = next
    ? '<a href="' + next.id + '.html" style="text-align:right;"><span style="color:var(--ink-3);font-size:12px;display:block;">下一条</span>' + esc(next.ask) + '</a>'
    : '<span style="color:var(--ink-3);font-size:13px;">已经是最后一条</span>';
  return '\n    <div class="card" style="display:flex;justify-content:space-between;gap:20px;">\n' +
    '      <div style="flex:1;">' + a + '</div>\n' +
    '      <div style="flex:1;">' + b + '</div>\n' +
    '    </div>\n';
}

fs.mkdirSync(OUT, { recursive: true });

let written = 0;
RULES.forEach((r, i) => {
  const body =
    '    <div class="page-head">\n' +
    '      <div class="crumb" style="font-size:12px;color:var(--ink-3);margin-bottom:8px;">' +
    '<a href="../rules.html">规则词条</a> / ' + esc(r.type) + ' / ' + esc(r.id) + '</div>\n' +
    '      <h1 style="font-size:26px;">' + esc(r.ask) + '</h1>\n' +
    '      <p style="font-size:15px;color:var(--ink);">' + esc(r.verdict) + '</p>\n' +
    '    </div>\n' +
    '\n    <div class="card">\n' +
    '      <div class="card-title"><h2>这条规则认的是什么</h2>' +
    '<span style="display:flex;gap:6px;align-items:center;">' +
    '<span class="badge badge-' + esc(r.level) + '">' + esc(r.level) + '风险</span>' +
    '<span class="badge badge-gray">' + esc(r.type) + '</span>' +
    '<span class="badge badge-gray">' + esc(r.id) + '</span></span></div>\n' +
    '      <p><b>' + esc(r.name) + '</b></p>\n' +
    '      <p>' + esc(r.why) + '</p>\n' +
    '      <div class="notice notice-warn" style="margin-bottom:0;">命中的表述不等于一定违法。同一条款放在不同上下文里结论可能不同，最终要以原句、上下文和实际情况核对。</div>\n' +
    '    </div>\n' +
    '\n    <div class="card">\n' +
    '      <div class="card-title"><h2>法律依据</h2></div>\n' +
    '      <p>' + esc(r.law) + '</p>\n' +
    '    </div>\n' +
    '\n    <div class="card">\n' +
    '      <div class="card-title"><h2>该怎么改</h2></div>\n' +
    '      <p>' + esc(r.fix) + '</p>\n' +
    '    </div>\n' +
    caseBlock(r.type) +
    '\n    <div class="card">\n' +
    '      <div class="card-title"><h2>拿你自己的合同试一遍</h2></div>\n' +
    '      <p>把合同原文粘进「合同扫描」，这条规则会自动参与匹配：命中处标红，并给出完整说明。全文不离开你的浏览器，断网也能用。</p>\n' +
    '      <div class="btn-row" style="margin-bottom:0;">\n' +
    '        <a class="btn btn-primary" href="../scan.html">去扫描我的合同</a>\n' +
    '        <a class="btn" href="../rules.html">回到 63 条总目录</a>\n' +
    '      </div>\n' +
    '    </div>\n' +
    pager(i);

  const title = r.ask + ' · ' + r.name + ' · 先查';
  const desc = r.verdict + '（' + r.id + '·' + r.type + '·' + r.level + '风险）';
  fs.writeFileSync(path.join(OUT, r.id + '.html'), shell('rules', title, desc, body), 'utf8');
  written++;
});

console.log('已生成 ' + written + ' 个静态词条页 -> ' + path.relative(ROOT, OUT));
console.log('样例：R01 ' + RULES[0].ask);

/* ---------- sitemap.xml（只在填了 SITE_ORIGIN 时生成） ---------- */
if (SITE_ORIGIN) {
  const base = SITE_ORIGIN.replace(/\/$/, '');
  /* Cloudflare Pages 会把 /xxx.html 308 跳到 /xxx，所以 sitemap 里直接写干净地址，
     少一跳，也避免搜索引擎把两条地址当成两份内容。本地 file:// 打开仍然用 .html。 */
  const clean = (f) => base + '/' + f.replace(/\.html$/, '');
  const urls = ['index.html', 'scan.html', 'traps.html', 'rules.html', 'certs.html', 'about.html']
    .map((f) => (f === 'index.html' ? base + '/' : clean(f)))
    .concat(RULES.map((r) => base + '/rules/' + r.id));
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + u + '</loc></url>\n').join('') +
    '</urlset>\n';
  fs.writeFileSync(path.join(SITE, 'sitemap.xml'), xml, 'utf8');
  console.log('已生成 sitemap.xml，共 ' + urls.length + ' 条 URL（' + base + '）');
} else {
  console.log('提示：SITE_ORIGIN 为空，跳过 sitemap.xml。上线拿到域名后改这一行再跑一次。');
}
