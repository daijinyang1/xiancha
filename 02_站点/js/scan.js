/* 先查 · 扫描逻辑
 * 本地模式：规则库正则逐条匹配，纯前端，不联网。
 * AI 模式：可选，用户自己填 Key，调用 OpenAI 兼容接口；失败一律降级回本地。
 */
(function (global) {
  'use strict';

  var App = global.QZQApp;
  var Store = global.QZQStore;
  var RULES = global.QZQ_TRAPS || [];

  var state = {
    raw: '',            // 原始文本
    clean: '',          // 脱敏后文本
    masked: 0,          // 隐藏的敏感信息处数
    hits: [],           // 风险点
    mode: 'local',      // local | ai
    lastAIError: ''
  };

  /* ================= 脱敏 ================= */

  /* 顺序有讲究：先长后短、先具体后宽泛，否则长号码会被短规则从中间切走一截，
     出现「6●●●●」这种只糊掉一部分的情况。 */
  var MASK_RULES = [
    { key: '身份证（18 位）', re: /(?<!\d)[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/g },
    { key: '身份证（15 位）', re: /(?<!\d)[1-9]\d{5}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}(?!\d)/g },
    { key: '银行卡号', re: /(?<!\d)\d{16,19}(?!\d)/g },
    { key: '手机号', re: /(?<!\d)1[3-9]\d{9}(?!\d)/g },
    /* 统一社会信用代码：18 位字母数字，且必须含至少一个大写字母，避免把纯数字号码误判 */
    { key: '统一社会信用代码', re: /(?<![0-9A-Z])(?=[0-9A-HJ-NPQRTUWXY]*[A-HJ-NPQRTUWXY])[0-9A-HJ-NPQRTUWXY]{18}(?![0-9A-Z])/g }
  ];

  function mask(text) {
    var out = text;
    var count = 0;
    for (var i = 0; i < MASK_RULES.length; i++) {
      var r = MASK_RULES[i];
      out = out.replace(r.re, function () { count++; return '●●●●'; });
    }
    return { text: out, count: count };
  }

  /* ================= 本地扫描 ================= */

  function splitSentence(text, index) {
    var start = index;
    while (start > 0 && '。；;！？!?\n'.indexOf(text.charAt(start - 1)) === -1) start--;
    var end = index;
    while (end < text.length && '。；;！？!?\n'.indexOf(text.charAt(end)) === -1) end++;
    if (end < text.length) end++;
    var s = text.slice(start, end).replace(/^\s+|\s+$/g, '');
    return { start: start, end: end, text: s };
  }

  function scanLocal(text) {
    var found = [];        // { rule, start, end, quote }
    var seen = {};
    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      var re;
      try { re = new RegExp(rule.regex.source, 'g'); } catch (e) { continue; }
      var m;
      var guard = 0;
      while ((m = re.exec(text)) !== null && guard < 200) {
        guard++;
        if (m[0] === '') { re.lastIndex++; continue; }
        var s = splitSentence(text, m.index);
        var key = rule.id + '#' + s.start;
        if (seen[key]) continue;
        seen[key] = true;
        found.push({ rule: rule, start: s.start, end: s.end, quote: s.text, match: m[0] });
      }
    }

    /* 按句子合并：同一句命中多条规则时，合成为一张卡片 */
    var bySentence = {};
    var order = [];
    for (var j = 0; j < found.length; j++) {
      var f = found[j];
      var k = f.start + '-' + f.end;
      if (!bySentence[k]) {
        bySentence[k] = { start: f.start, end: f.end, quote: f.quote, rules: [], matches: [] };
        order.push(k);
      }
      if (!bySentence[k].rules.some(function (x) { return x.id === f.rule.id; })) {
        bySentence[k].rules.push(f.rule);
      }
      if (bySentence[k].matches.indexOf(f.match) === -1) bySentence[k].matches.push(f.match);
    }

    var out = order.map(function (k) {
      var g = bySentence[k];
      g.rules.sort(function (a, b) { return levelWeight(b.level) - levelWeight(a.level); });
      g.level = g.rules[0].level;
      g.name = g.rules.map(function (r) { return r.name; }).join(' + ');
      return g;
    });

    out.sort(function (a, b) {
      var d = levelWeight(b.level) - levelWeight(a.level);
      return d !== 0 ? d : a.start - b.start;
    });
    return out;
  }

  function levelWeight(l) { return l === '高' ? 3 : l === '中' ? 2 : 1; }

  function scoreOf(hits) {
    var s = 0;
    for (var i = 0; i < hits.length; i++) s += levelWeight(hits[i].level) * 10;
    var high = hits.filter(function (h) { return h.level === '高'; }).length;
    var mid = hits.filter(function (h) { return h.level === '中'; }).length;
    return { score: Math.min(100, s), high: high, mid: mid, low: hits.length - high - mid };
  }

  /* ================= 渲染：左侧原文（命中标红） ================= */

  function renderDoc(text, hits) {
    var view = App.$('#doc-view');
    if (!view) return;
    if (!text) {
      view.innerHTML = '<div class="doc-empty">扫描结果会显示在这里。<br>左侧粘贴合同原文后点「开始扫描」。</div>';
      return;
    }
    var marks = [];
    for (var i = 0; i < hits.length; i++) marks.push({ start: hits[i].start, end: hits[i].end, level: hits[i].level });
    marks.sort(function (a, b) { return a.start - b.start; });

    var merged = [];
    for (var j = 0; j < marks.length; j++) {
      var m = marks[j];
      var last = merged[merged.length - 1];
      if (last && m.start <= last.end) {
        last.end = Math.max(last.end, m.end);
        if (levelWeight(m.level) > levelWeight(last.level)) last.level = m.level;
      } else {
        merged.push({ start: m.start, end: m.end, level: m.level });
      }
    }

    var html = '';
    var pos = 0;
    for (var k = 0; k < merged.length; k++) {
      var g = merged[k];
      html += App.esc(text.slice(pos, g.start));
      html += '<mark class="hit level-' + g.level + '">' + App.esc(text.slice(g.start, g.end)) + '</mark>';
      pos = g.end;
    }
    html += App.esc(text.slice(pos));
    view.innerHTML = html;
    view.scrollTop = 0;
  }

  /* ================= 渲染：右侧风险清单 ================= */

  function renderResults(hits) {
    var box = App.$('#result-list');
    if (!box) return;
    if (!hits || !hits.length) {
      box.innerHTML = '<div class="doc-empty">没有命中已知的风险表述。<br>这不代表合同一定安全，请仍逐条核对金额、期限与解除条件。</div>';
      return;
    }
    var html = hits.map(function (h) {
      var rulesHtml = h.rules.map(function (r) {
        return '<div class="risk">' +
          '<div class="risk-top"><span class="badge badge-' + r.level + '">' + r.level + '风险</span>' +
          '<span class="risk-name"><a href="rules/' + App.esc(r.id) + '.html" target="_blank" rel="noopener" style="color:inherit;">' +
          App.esc(r.ask || r.name) + '</a></span>' +
          '<span class="badge badge-gray">' + App.esc(r.type) + '</span>' +
          '<span class="badge badge-gray">' + App.esc(r.id) + '</span></div>' +
          '<div class="quote">' + App.esc(h.quote) + '</div>' +
          '<dl><dt>为什么有风险</dt><dd>' + App.esc(r.why) + '</dd>' +
          '<dt>法律依据</dt><dd class="law">' + App.esc(r.law) + '</dd>' +
          '<dt>怎么改</dt><dd>' + App.esc(r.fix) + '</dd></dl>' +
          '</div>';
      }).join('');
      if (h.rules.length === 1) return rulesHtml;
      return '<div class="risk-group" style="border:1px solid #E1E7EF;border-radius:10px;padding:10px;background:#FAFCFE;">' +
        '<div style="font-size:12px;color:#788491;margin-bottom:8px;">同一句命中 ' + h.rules.length + ' 条风险，已合并显示</div>' +
        rulesHtml + '</div>';
    }).join('');
    box.innerHTML = html;
  }

  function renderSummary(hits) {
    var s = scoreOf(hits);
    var scoreEl = App.$('#risk-score');
    var labelEl = App.$('#risk-level-text');
    var countsEl = App.$('#risk-counts');
    if (scoreEl) {
      scoreEl.textContent = hits.length ? s.score : '--';
      scoreEl.className = 'score ' + (s.score >= 60 ? 'lv-high' : s.score >= 30 ? 'lv-mid' : hits.length ? 'lv-low' : '');
    }
    if (labelEl) {
      labelEl.textContent = !hits.length ? '未发现明显风险表述' : s.score >= 60 ? '风险较高，建议重新谈判' : s.score >= 30 ? '存在风险，逐条核对' : '有少量风险点';
    }
    if (countsEl) {
      countsEl.innerHTML = '<span class="badge badge-高" title="按最严重的一条算，该句为高风险">高 ' + s.high + '</span>' +
        '<span class="badge badge-中" title="按最严重的一条算，该句为中风险">中 ' + s.mid + '</span>' +
        '<span class="badge badge-低" title="按最严重的一条算，该句为低风险">低 ' + s.low + '</span>';
    }
    /* 把计数口径写清楚：上面三个徽章数的是「句子」，一条句子里可能同时踩中好几条规则 */
    var noteEl = App.$('#risk-counts-note');
    if (noteEl) {
      if (!hits.length) {
        noteEl.textContent = '';
      } else {
        var ruleCount = 0;
        for (var i = 0; i < hits.length; i++) ruleCount += hits[i].rules.length;
        noteEl.innerHTML = '上面三个数字数的是<b>句子</b>：命中的 ' + hits.length + ' 句话，共触犯 <b>' + ruleCount +
          ' 条</b>规则（同一句踩中多条只算一张卡片）。下面按句逐条列出。';
      }
    }
  }

  /* ================= 复制 / 导出 ================= */

  function buildPlainText(hits, meta) {
    var lines = [];
    lines.push('先查 · 合同风险扫描清单');
    lines.push('========================================');
    lines.push('扫描方式：' + (meta && meta.mode === 'ai' ? 'AI 增强（失败时自动降级本地）' : '本地规则扫描'));
    lines.push('命中句子：' + hits.length + ' 句（共触犯 ' + hits.reduce(function (n, h) { return n + h.rules.length; }, 0) + ' 条规则）');
    lines.push('已自动隐藏敏感信息：' + (meta ? meta.masked : 0) + ' 处');
    lines.push('');
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      lines.push('【风险 ' + (i + 1) + ' · ' + h.level + '】' + h.name);
      lines.push('原句：' + h.quote);
      for (var j = 0; j < h.rules.length; j++) {
        var r = h.rules[j];
        lines.push('  · 坑型：' + r.type + ' ／ 风险名称：' + r.name);
        lines.push('  · 为什么有风险：' + r.why);
        lines.push('  · 法律依据：' + r.law);
        lines.push('  · 建议怎么改：' + r.fix);
      }
      lines.push('');
    }
    lines.push('----------------------------------------');
    lines.push('本清单由「先查」规则引擎生成，仅作提示，不构成法律意见。');
    lines.push('规则库共 ' + RULES.length + ' 条，覆盖押金、培训贷、试用期、社保、加班、违约金、离职等常见坑型。');
    return lines.join('\n');
  }

  /* ================= AI 模式（可选） ================= */

  function getAIConfig() {
    return {
      baseUrl: Store.get('ai.baseUrl', '') || '',
      key: Store.get('ai.key', '') || '',
      model: Store.get('ai.model', '') || ''
    };
  }

  function saveAIConfig(cfg) {
    Store.set('ai.baseUrl', cfg.baseUrl);
    Store.set('ai.key', cfg.key);
    Store.set('ai.model', cfg.model);
  }

  function buildAIPrompt(text, hits) {
    var brief = hits.slice(0, 20).map(function (h) {
      return '- [' + h.level + '] ' + h.name + '｜原句：' + h.quote;
    }).join('\n');
    return '你是一名熟悉中国劳动法的合同审阅助手。下面是已经过脱敏处理的学生实习／劳动合同片段，' +
      '以及本工具用规则库初步命中的风险点。请用简体中文，逐条给出更细的解释与修改建议。\n' +
      '要求：1) 不要编造法条，不确定就写"建议咨询专业律师"；2) 每条不超过 3 行；3) 语气平实、面向大学生；' +
      '4) 结尾用一句话总结最该改哪一条。\n\n' +
      '【规则库已命中】\n' + (brief || '（无）') + '\n\n' +
      '【脱敏后的合同片段】\n' + text.slice(0, 4000);
  }

  function callAI(cfg, prompt) {
    var url = (cfg.baseUrl || '').replace(/\/+$/, '');
    if (!url) url = 'https://api.openai.com/v1';
    if (url.indexOf('/chat/completions') === -1) url += '/chat/completions';
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    return fetch(url, {
      method: 'POST',
      signal: ctrl ? ctrl.signal : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.key
      },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你是合同风险审阅助手，只做解释与建议，不提供正式法律意见，不编造法条。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) return res.text().then(function (t) { throw new Error('HTTP ' + res.status + ' ' + (t || '').slice(0, 120)); });
      return res.json();
    }).then(function (data) {
      var txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!txt) throw new Error('返回内容为空');
      return String(txt);
    });
  }

  /* ================= 主流程 ================= */

  function doScan() {
    var input = App.$('#contract-input');
    var raw = input ? input.value : '';
    if (!raw || !raw.replace(/\s/g, '')) {
      App.toast('请先粘贴合同文本');
      if (input) input.focus();
      return;
    }

    var m = mask(raw);
    state.raw = raw;
    state.clean = m.text;
    state.masked = m.count;

    var sensEl = App.$('#sens-stat');
    if (sensEl) {
      sensEl.textContent = m.count
        ? '已自动隐藏 ' + m.count + ' 处敏感信息（身份证／手机号／统一社会信用代码／银行卡号）'
        : '这段文本里没有检测到身份证号、手机号、统一社会信用代码或银行卡号';
      sensEl.style.display = 'inline-block';
      sensEl.style.color = m.count ? '' : '#788491';
    }

    var hits = scanLocal(m.text);
    state.hits = hits;
    renderDoc(m.text, hits);
    renderResults(hits);
    renderSummary(hits);

    var actionBar = App.$('#result-actions');
    if (actionBar) actionBar.classList.remove('hidden');

    /* 记录最近一次扫描（只存本地，只存脱敏后的前 3000 字） */
    Store.set('scan.last', {
      at: App.fmtTime(new Date()),
      masked: m.count,
      count: hits.length,
      names: hits.map(function (h) { return h.name; }),
      text: m.text.slice(0, 3000)
    });

    if (state.mode === 'ai') runAI();
    else {
      var rc = 0;
      for (var q = 0; q < hits.length; q++) rc += hits[q].rules.length;
      App.toast('本地扫描完成：' + hits.length + ' 句话命中，共 ' + rc + ' 条规则');
    }
  }

  function runAI() {
    var cfg = getAIConfig();
    var box = App.$('#ai-output');
    if (!cfg.key) {
      degrade('还没有填写 API Key，已切回本地模式');
      return;
    }
    if (box) {
      box.style.display = 'block';
      box.innerHTML = '<div class="hint">正在调用你配置的模型服务商，请稍候……</div>';
    }
    var btn = App.$('#btn-ai-run');
    if (btn) { btn.disabled = true; btn.textContent = 'AI 分析中…'; }

    callAI(cfg, buildAIPrompt(state.clean, state.hits)).then(function (txt) {
      if (box) {
        box.innerHTML = '<div style="font-size:13px;color:#788491;margin-bottom:6px;">以下内容由你配置的模型生成，仅供参考：</div>' +
          '<div style="white-space:pre-wrap;font-size:13.5px;line-height:1.9;">' + App.esc(txt) + '</div>';
      }
      Store.set('scan.lastAI', { at: App.fmtTime(new Date()), text: txt });
      App.toast('AI 解释已生成');
    }).catch(function (err) {
      degrade('AI 调用失败（' + (err && err.message ? err.message : '网络异常') + '），已切回本地模式');
    }).then(function () {
      var b = App.$('#btn-ai-run');
      if (b) { b.disabled = false; b.textContent = '用 AI 再解释一遍'; }
    });
  }

  function degrade(msg) {
    state.lastAIError = msg;
    state.mode = 'local';
    var box = App.$('#ai-output');
    if (box) {
      box.style.display = 'block';
      box.innerHTML = '<div class="notice notice-warn" style="margin:0;">' + App.esc(msg) + '。上面的风险清单来自本地规则库，结果不受影响。</div>';
    }
    var tab = App.$('.tab-btn[data-mode="local"]');
    if (tab) switchMode('local');
    App.toast(msg);
  }

  /* ================= 标签页 ================= */

  function switchMode(mode) {
    state.mode = mode;
    App.$$('.tab-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-mode') === mode); });
    App.$$('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-panel') === mode); });
    var tip = App.$('#privacy-tip');
    if (tip) {
      if (mode === 'ai') {
        tip.className = 'notice';
        tip.innerHTML = '<strong>隐私提示：</strong>本地模式下，合同只在你的浏览器里处理，不会上传到我们的服务器。' +
          '开启 AI 模式后，<b>脱敏后</b>的文本会发送到你选择的模型服务商（你填的地址与 Key），请自行确认对方的隐私政策。';
      } else {
        tip.className = 'notice';
        tip.innerHTML = '<strong>隐私提示：</strong>合同只在你的浏览器里处理，不会上传到我们的服务器。' +
          '所有解析、脱敏、匹配都在本机完成，断网也能用。';
      }
    }
    Store.set('scan.mode', mode);
  }

  /* ================= 初始化 ================= */

  function init() {
    App.$$('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        switchMode(mode);
        if (mode === 'ai') {
          var cfg = getAIConfig();
          var keyEl = App.$('#ai-key');
          var urlEl = App.$('#ai-base');
          var modelEl = App.$('#ai-model');
          if (keyEl && !keyEl.value) keyEl.value = cfg.key;
          if (urlEl && !urlEl.value) urlEl.value = cfg.baseUrl;
          if (modelEl && !modelEl.value) modelEl.value = cfg.model;
        }
      });
    });
    if (Store.get('scan.mode', 'local') === 'ai') switchMode('ai'); else switchMode('local');

    var runBtn = App.$('#btn-scan');
    if (runBtn) runBtn.addEventListener('click', doScan);

    var aiRun = App.$('#btn-ai-run');
    if (aiRun) aiRun.addEventListener('click', function () {
      if (!state.clean) { App.toast('请先扫描一次合同文本'); return; }
      runAI();
    });

    var saveBtn = App.$('#btn-save-ai');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var cfg = {
        baseUrl: (App.$('#ai-base') || {}).value || '',
        key: (App.$('#ai-key') || {}).value || '',
        model: (App.$('#ai-model') || {}).value || ''
      };
      saveAIConfig(cfg);
      App.toast('已保存到本机，仅此浏览器可见');
    });

    var clearKey = App.$('#btn-clear-key');
    if (clearKey) clearKey.addEventListener('click', function () {
      Store.remove('ai.key');
      var k = App.$('#ai-key'); if (k) k.value = '';
      App.toast('已删除本机保存的 Key');
    });

    var demo = App.$('#btn-demo');
    if (demo) demo.addEventListener('click', function () {
      var ta = App.$('#contract-input');
      if (ta) {
        ta.value = DEMO_TEXT;
        var cc = App.$('#char-count');
        if (cc) cc.textContent = ta.value.length + ' 字';
        App.toast('已填入示例文本，点「开始扫描」试试');
      }
    });

    var copyBtn = App.$('#btn-copy');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      if (!state.hits.length) { App.toast('还没有可复制的风险清单'); return; }
      App.copyText(buildPlainText(state.hits, { mode: state.mode, masked: state.masked }))
        .then(function () { App.toast('风险清单已复制到剪贴板'); })
        .catch(function () { App.toast('复制失败，请手动选择文本复制'); });
    });

    var txtBtn = App.$('#btn-txt');
    if (txtBtn) txtBtn.addEventListener('click', function () {
      if (!state.hits.length) { App.toast('还没有可导出的风险清单'); return; }
      var name = '先查-风险清单-' + App.fmtTime(new Date()).replace(/[: ]/g, '-') + '.txt';
      App.download(name, buildPlainText(state.hits, { mode: state.mode, masked: state.masked }));
    });

    var clearBtn = App.$('#btn-clear-scan');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      var ta = App.$('#contract-input');
      if (ta) ta.value = '';
      state.raw = ''; state.clean = ''; state.hits = []; state.masked = 0;
      renderDoc('', []);
      renderResults([]);
      renderSummary([]);
      var sens = App.$('#sens-stat'); if (sens) sens.style.display = 'none';
      var out = App.$('#ai-output'); if (out) { out.style.display = 'none'; out.innerHTML = ''; }
      var bar = App.$('#result-actions'); if (bar) bar.classList.add('hidden');
      Store.remove('scan.last');
      App.toast('已清空');
    });

    var chg = App.$('#contract-input');
    if (chg) {
      chg.addEventListener('input', function () {
        var c = App.$('#char-count');
        if (c) c.textContent = chg.value.length + ' 字';
      });
    }

    /* 恢复上一次扫描（脱敏后文本），方便接着看 */
    var last = Store.get('scan.last', null);
    var ta2 = App.$('#contract-input');
    if (last && last.text && ta2 && !ta2.value) {
      var restore = App.$('#restore-tip');
      if (restore) {
        restore.style.display = 'block';
        restore.innerHTML = '<span>检测到上次扫描记录（' + App.esc(last.at || '') + '，' + (last.count || 0) + ' 个风险点，文本已脱敏）。' +
          ' <a href="javascript:void(0)" id="restore-link">填入上次文本</a></span>';
        var link = App.$('#restore-link');
        if (link) link.addEventListener('click', function () { ta2.value = last.text; restore.style.display = 'none'; App.toast('已填入上次脱敏文本'); });
      }
    }
  }

  var DEMO_TEXT = '实习协议（示例）\n' +
      '甲方：某某科技有限公司　乙方：张某\n' +
      '一、乙方入职时须缴纳服装押金 500 元，工牌费 50 元，离职时无息退还。\n' +
      '二、试用期为六个月，试用期内乙方提出离职的，需向甲方支付培训违约金 5000 元。\n' +
      '三、乙方须先参加甲方组织的岗前培训，培训费用 3980 元，由甲方协助乙方办理分期贷款支付。\n' +
      '四、实习前七天为试岗期，试岗期间不发放任何报酬。\n' +
      '五、乙方在实习期间不缴纳社会保险，由甲方发放每月 300 元社保补贴。\n' +
      '六、甲方可根据经营需要，随时调整乙方岗位、工作地点及薪资，乙方应予服从。\n' +
      '七、因工作需要安排的加班，不另行支付加班费，可在淡季安排调休。\n' +
      '八、乙方须将身份证原件交由甲方统一保管，离职时归还。\n' +
      '九、实习期间发生意外伤害，由乙方自行负责，与甲方无关。\n' +
      '十、乙方未提前 90 天书面申请擅自离岗的，视为违约，需支付违约金 3000 元。\n' +
      '十一、乙方同意甲方从其工资中直接扣除服装费、体检费、培训费共计 680 元。\n' +
      '十二、实习证明于实习结束后统一开具，具体时间另行通知。';

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.QZQScan = { mask: mask, scanLocal: scanLocal, buildPlainText: buildPlainText, state: state };
})(window);
