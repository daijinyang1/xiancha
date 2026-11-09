#!/usr/bin/env node
/* 先查 v2 · 全栈冒烟测试
 * 用法: node tools/smoke.mjs
 * 前提: 后端 8080 + 前端 3000 都在跑
 */
import fs from 'node:fs';
import path from 'node:path';

const API = process.env.SMOKE_API || 'http://127.0.0.1:8080/api';
const WEB = process.env.SMOKE_WEB || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS  ' + name + (extra ? '  ·  ' + extra : '')); }
  else { fail++; fails.push(name + (extra ? ' :: ' + extra : '')); console.log('  FAIL  ' + name + (extra ? '  ·  ' + extra : '')); }
}

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
  return r.json();
}

async function main() {
  console.log('== [1] 后端接口 ==');
  const stats = await getJson(API + '/stats');
  ok('GET /api/stats 规则数 63', stats.rules === 63, 'rules=' + stats.rules);
  ok('GET /api/stats 案例数 12', stats.traps === 12, 'traps=' + stats.traps);
  ok('GET /api/stats 证书数 6', stats.certs === 6, 'certs=' + stats.certs);

  const rules = await getJson(API + '/rules');
  ok('GET /api/rules 返回 63 条', rules.length === 63, 'len=' + rules.length);
  const r01 = await getJson(API + '/rules/R01');
  ok('GET /api/rules/R01 有 ask', !!r01.ask, String(r01.ask || '').slice(0, 30));
  ok('GET /api/rules/R01 有 law', !!r01.law);
  ok('GET /api/rules/R01 有同坑型兄弟', Array.isArray(r01.siblings) && r01.siblings.length > 0, 'siblings=' + (r01.siblings || []).length);

  const filtered = await getJson(API + '/rules?type=' + encodeURIComponent('押金类'));
  ok('GET /api/rules?type=押金类 返回 7 条', filtered.length === 7, 'len=' + filtered.length);

  const traps = await getJson(API + '/traps');
  ok('GET /api/traps 返回 12 条', traps.length === 12, 'len=' + traps.length);
  const certs = await getJson(API + '/certs');
  ok('GET /api/certs 返回 6 条', certs.length === 6, 'len=' + certs.length);

  console.log('== [2] 扫描接口 ==');
  const sample = '第一条 入职需缴纳押金 800 元，离职时不予退还。\n第二条 试用期工资为正式工资的 60%。\n第三条 逾期未报到视为单方违约，须支付违约金 5000 元。\n第四条 公司不为乙方缴纳社会保险。';
  const res = await fetch(API + '/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sample })
  });
  const scan = await res.json();
  ok('POST /api/scan 返回 200', res.ok);
  ok('扫描命中句子数 > 0', scan.sentenceCount > 0, 'sentences=' + scan.sentenceCount);
  ok('扫描命中规则数 > 0', scan.ruleCount > 0, 'rules=' + scan.ruleCount);
  ok('扫描分数 0-100', typeof scan.score === 'number' && scan.score >= 0 && scan.score <= 100, 'score=' + scan.score);
  ok('扫描 hits 是数组且非空', Array.isArray(scan.hits) && scan.hits.length > 0);
  ok('每个 hit 有 sentence 与 rules[]', scan.hits.every(h => h.sentence && Array.isArray(h.rules) && h.rules.length > 0));

  console.log('== [3] 前端页面（HTTP 层） ==');
  const pages = ['/', '/scan', '/rules', '/rules/R01', '/traps', '/certs', '/about'];
  for (const p of pages) {
    const r = await fetch(WEB + p);
    const html = await r.text();
    ok('页面 ' + p + ' 200', r.status === 200, 'status=' + r.status);
    ok('页面 ' + p + ' 有挂载点', html.includes('id="__nuxt"'), html.length + ' B');
  }

  console.log('== [4] 前端页面（真浏览器渲染） ==');
  const { launch, newPage, shutdown } = await import('./cdp.mjs');
  const browser = await launch({ port: 9521, headless: true, width: 1400, height: 1000, extraArgs: ['--no-proxy-server'] });
  const expect = {
    '/': '该知道的事',
    '/scan': '合同风险扫描',
    '/rules': '63 条风险规则',
    '/rules/R01': '押金',
    '/traps': '避坑案例库',
    '/certs': '考证日历',
    '/about': '关于',
  };
  try {
    for (const p of pages) {
      const pg = await newPage(browser, WEB + p);
      await new Promise((r) => setTimeout(r, 2200));
      const info = await pg.eval(`(() => ({
        h1: (document.querySelector('h1') || {}).innerText || '',
        len: (document.body.innerText || '').length
      }))()`);
      await pg.close();
      const want = expect[p] || '';
      ok('渲染 ' + p + ' 有 h1', info.h1.length > 0, info.h1.slice(0, 26));
      ok('渲染 ' + p + ' 文案对得上', want ? info.h1.includes(want) : true, info.len + ' 字');
    }
  } finally {
    await shutdown(browser);
  }

  console.log('\n' + '='.repeat(60));
  console.log('共 ' + (pass + fail) + ' 项，通过 ' + pass + '，失败 ' + fail);
  if (fail) { console.log('失败项:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
  console.log('结果：全部通过');
}

main().catch(e => { console.error('SMOKE ERROR:', e.message); process.exit(2); });
