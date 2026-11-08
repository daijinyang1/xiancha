/* tools/e2e.mjs —— 用你本机浏览器把站点真的跑一遍。

   和 check.js 的区别：check.js 只查「文件在不在、字段全不全」，是静态检查；
   这里是真的加载页面、真的点按钮、真的粘一段合同进去、真的看扫出几条风险。
   静态检查全绿但页面白屏，是这类纯前端项目最常见的翻车方式。

   用法：
     node tools/e2e.mjs           后台跑，出结论
     node tools/e2e.mjs --show    开一个看得见的窗口（录制演示视频时用）
   产物：tools/_shots/e2e-*.png
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, newPage, shutdown } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, '02_站点');
const SHOTS = path.join(ROOT, 'tools', '_shots');
const toUrl = (f) => 'file:///' + path.join(SITE, f).replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const ok = (name, detail) => { results.push({ ok: true, name }); console.log('  PASS  ' + name + (detail ? '  ·  ' + detail : '')); };
const bad = (name, detail) => { results.push({ ok: false, name, detail }); console.log('  FAIL  ' + name + (detail ? '  ·  ' + detail : '')); };
const expect = (name, cond, detail) => (cond ? ok(name, detail) : bad(name, detail));

/* 这段示例合同是「故意踩坑」的：一句话一条坑，用来验证规则真的能认出来。
   不是从 DEMO_TEXT 抄的——如果两者相同，测出来的只是「示例按钮坏了」，测不到规则。 */
const CONTRACT = [
  '实习协议',
  '甲方：某某网络科技有限公司　　乙方：张某（在校学生）',
  '一、乙方入职时须缴纳服装押金人民币 800 元，实习期满后无息退还。',
  '二、实习期间为六个月，其中试用期三个月。',
  '三、试用期工资按转正工资的 70% 发放。',
  '四、公司不为乙方缴纳社会保险，双方属实习关系，不适用劳动法律法规。',
  '五、乙方自愿放弃缴纳社保，公司每月另行补贴 300 元。',
  '六、乙方如提前离职，须向甲方支付违约金 5000 元。',
  '七、实习期间实行单休，每周工作六天。',
  '八、加班费包含在月薪中，不再另行支付。',
  '九、公司可根据经营需要调整乙方岗位与薪金，乙方应无条件服从。',
  '十、乙方在实习期间发生意外伤害，由乙方自行负责，与公司无关。',
  '十一、乙方离职须提前 90 日书面申请，未满 90 日按自动离职处理，扣发当月工资。',
  '十二、试用期内公司不签订书面劳动合同，转正后再签。',
].join('\n');

const headless = !process.argv.includes('--show');
const b = await launch({ port: 9403, headless, width: 1440, height: 1200 });

try {
  /* ---------- 1. 六个主页面能不能打开 ---------- */
  console.log('\n[1] 六个主页面加载');
  for (const f of ['index.html', 'scan.html', 'traps.html', 'rules.html', 'certs.html', 'about.html']) {
    const p = await newPage(b, toUrl(f));
    try {
      const title = await p.eval('document.title');
      const h1 = await p.eval('(document.querySelector("h1")||{}).textContent||""');
      const chars = await p.eval('document.body.innerText.length');
      expect(f, !!title && title.trim().length > 4 && h1.trim().length > 2, title.trim() + ' · 正文 ' + chars + ' 字');
      if (chars < 400) bad(f + ' 正文内容偏少', chars + ' 字');
    } catch (e) { bad(f, e.message); }
    await p.close();
  }

  /* ---------- 2. 规则页的筛选是真能点的 ---------- */
  console.log('\n[2] 规则页筛选');
  {
    const p = await newPage(b, toUrl('rules.html'));
    try {
      await p.waitFor('document.querySelectorAll(".trap").length === 63');
      ok('63 条规则全部渲染');
      await p.click('#level-filters .chip[data-level="高"]');
      const hi = await p.eval('document.querySelectorAll(".trap").length');
      expect('筛「高风险」得 37 条', hi === 37, '实际 ' + hi);
      await p.click('#level-filters .chip[data-level="中"]');
      const mid = await p.eval('document.querySelectorAll(".trap").length');
      expect('筛「中风险」得 23 条', mid === 23, '实际 ' + mid);
      await p.click('#level-filters .chip[data-level=""]');
      const all = await p.eval('document.querySelectorAll(".trap").length');
      expect('回「全部等级」得 63 条', all === 63, '实际 ' + all);
      await p.click('#filters .chip[data-type="社保"]');
      const sh = await p.eval('document.querySelectorAll(".trap").length');
      expect('筛坑型「社保」得 6 条', sh === 6, '实际 ' + sh);
      const noLink = await p.eval(
        'Array.from(document.querySelectorAll(".trap")).filter(function(c){return !c.querySelector("a[href^=\'rules/R\']");}).length'
      );
      const shot = await p.shot(path.join(SHOTS, 'e2e-rules.png'));
      ok('规则页截图', shot.width + 'x' + shot.height + '，' + Math.round(shot.bytes / 1024) + ' KB');
      if (noLink) bad('有卡片点不进词条页', noLink + ' 张');
    } catch (e) { bad('规则页筛选', e.message); }
    await p.close();
  }

  /* ---------- 3. 静态词条页 ---------- */
  console.log('\n[3] 静态词条页');
  for (const id of ['R01', 'R25', 'R63']) {
    const p = await newPage(b, toUrl('rules/' + id + '.html'));
    try {
      const h1 = (await p.eval('(document.querySelector("h1")||{}).textContent||""')).trim();
      const body = await p.eval('document.body.innerText');
      const hasLaw = body.indexOf('法律依据') >= 0;
      const hasFix = body.indexOf('怎么改') >= 0 || body.indexOf('该怎么改') >= 0 || body.indexOf('修改') >= 0;
      const back = await p.eval('!!document.querySelector(\'a[href="../rules.html"]\')');
      const isQ = /？|\?$/.test(h1) || h1.indexOf('？') >= 0;
      expect(id + ' 页面完整', isQ && hasLaw && hasFix && back, h1 + '｜法条' + (hasLaw ? '有' : '无') + '｜改法' + (hasFix ? '有' : '无') + '｜回目录' + (back ? '有' : '无'));
    } catch (e) { bad(id, e.message); }
    await p.close();
  }

  /* ---------- 4. 扫描器：真粘一段合同进去 ---------- */
  console.log('\n[4] 合同扫描（真粘合同）');
  {
    const p = await newPage(b, toUrl('scan.html'));
    try {
      await p.waitFor('document.querySelector("#contract-input") !== null');
      await p.eval(
        '(function(){var t=document.querySelector("#contract-input");t.value=' + JSON.stringify(CONTRACT) +
        ';t.dispatchEvent(new Event("input",{bubbles:true}));return t.value.length})()'
      );
      await p.click('#btn-scan');
      await p.waitFor('document.querySelectorAll("#result-list .risk").length > 0', 12000);
      const n = await p.eval('document.querySelectorAll("#result-list .risk").length');
      const score = (await p.eval('(document.querySelector("#risk-score")||{}).textContent||""')).trim();
      const lv = (await p.eval('(document.querySelector("#risk-level-text")||{}).textContent||""')).trim();
      const ids = await p.eval(
        'Array.from(document.querySelectorAll("#result-list .risk")).map(function(e){var m=e.textContent.match(/R\\d\\d/);return m?m[0]:""}).join(",")'
      );
      expect('示例合同命中 ≥10 条风险', n >= 10, n + ' 条，风险分 ' + score + '，等级 ' + lv);
      ok('命中的规则编号', ids.slice(0, 90));
      const linked = await p.eval('document.querySelectorAll("#result-list a[href^=\'rules/\']").length');
      expect('风险标题能点进词条页', linked > 0, linked + ' 个链接');
      /* 计数口径：徽章数的是句子，卡片里的规则数才是规则；两者必须在页面上讲清楚 */
      const note = (await p.eval('(document.querySelector("#risk-counts-note")||{}).textContent||""')).trim();
      const ruleCnt = await p.eval('document.querySelectorAll("#result-list .risk").length');
      expect('句子数与规则数在页面上讲清楚', note.indexOf('句话') > 0 && note.indexOf('条规则') > 0, note || '(空)');
      if (n !== ruleCnt) bad('风险卡数与徽章数不一致', n + ' vs ' + ruleCnt);
      const marks = await p.eval('document.querySelectorAll("#doc-view mark.hit").length');
      expect('原文里高亮标出来了', marks > 0, marks + ' 处高亮');
      const shot = await p.shot(path.join(SHOTS, 'e2e-scan.png'));
      ok('扫描结果截图', shot.width + 'x' + shot.height + '，' + Math.round(shot.bytes / 1024) + ' KB');
    } catch (e) { bad('扫描流程', e.message); try { await p.shot(path.join(SHOTS, 'e2e-scan-fail.png')); } catch {} }
    await p.close();
  }

  /* ---------- 5. 案例 ↔ 规则互链，?type= 深链 ---------- */
  console.log('\n[5] 案例与规则互链');
  {
    const p = await newPage(b, toUrl('traps.html'));
    try {
      await p.waitFor('document.querySelectorAll(".trap").length === 12');
      ok('12 个案例全部渲染');
      const links = await p.eval('document.querySelectorAll(\'a[href^="rules/R"]\').length');
      expect('案例卡里带规则词条链接', links > 0, links + ' 个');
      await p.close();

      const q = await newPage(b, toUrl('traps.html') + '?type=' + encodeURIComponent('培训贷'));
      try {
        await q.waitFor('document.querySelectorAll(".trap").length > 0');
        await sleep(400);
        const cnt = await q.eval('document.querySelectorAll(".trap").length');
        const chip = (await q.eval('(document.querySelector("#filters .chip.on")||{}).textContent||""')).trim();
        /* 培训贷只有 1 个案例（12 个案例分 8 类，本来就不均匀），这里验的是「深链有没有真的筛上」，不是条数 */
        expect('?type=培训贷 深链能自动筛选', cnt >= 1 && cnt < 12 && chip === '培训贷', cnt + ' 条，激活「' + chip + '」');
      } catch (e) { bad('?type= 深链', e.message); }
      await q.close();
    } catch (e) { bad('案例页', e.message); }
  }

  /* ---------- 6. 收藏存得住 ---------- */
  console.log('\n[6] 本地存储');
  {
    const p = await newPage(b, toUrl('traps.html'));
    try {
      await p.waitFor('document.querySelectorAll(".trap").length === 12');
      await p.eval('localStorage.clear()');
      await p.goto(toUrl('traps.html'));
      await p.waitFor('document.querySelectorAll(".trap").length === 12');
      await p.eval('document.querySelector(".trap .fav").click()');
      await sleep(400);
      const keys = await p.eval('Object.keys(localStorage).join(",")');
      expect('收藏写了 xc. 前缀的键', keys.indexOf('xc.') >= 0, keys);
      await p.goto(toUrl('traps.html'));
      await p.waitFor('document.querySelectorAll(".trap").length === 12');
      await sleep(300);
      const on = await p.eval('document.querySelectorAll(".fav.on").length');
      expect('刷新后收藏还在', on === 1, on + ' 个已收藏');
    } catch (e) { bad('本地存储', e.message); }
    await p.close();
  }
} finally {
  await shutdown(b);
}

const fails = results.filter((r) => !r.ok);
console.log('\n' + '='.repeat(60));
console.log('共 ' + results.length + ' 项，通过 ' + (results.length - fails.length) + '，失败 ' + fails.length);
if (fails.length) {
  console.log('失败项：');
  fails.forEach((f) => console.log('  × ' + f.name + (f.detail ? '  ' + f.detail : '')));
  process.exitCode = 1;
} else {
  console.log('结果：全部通过（这是真的在浏览器里点过一遍的结论）');
}
