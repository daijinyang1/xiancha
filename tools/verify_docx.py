# -*- coding: utf-8 -*-
"""重新渲染方案 docx 之后跑一次：核对段数/表数/字数，并扫一遍不该出现的旧口径。

用法：python tools/verify_docx.py [docx路径]
默认核对 01_方案/先查_主方案.docx。
基线（2026-11-08）：179 段 / 28 表 / 19968 字符 / 12 个一级章节。
"""
import json
import os
import sys

import docx

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '01_方案', '先查_主方案.docx')

d = docx.Document(path)
txt = '\n'.join(p.text for p in d.paragraphs)
for t in d.tables:
    for row in t.rows:
        txt += '\n' + ' | '.join(c.text for c in row.cells)

# 标题用的是直接格式（不是 Word 内建 Heading 样式），所以章节数从 cfg 数
cfg_path = os.path.join(ROOT, 'tools', '_cfg_all.json')
h1 = 0
blocks = 0
if os.path.exists(cfg_path):
    with open(cfg_path, encoding='utf-8') as f:
        blocks = len(json.load(f)['blocks'])
    with open(cfg_path, encoding='utf-8') as f:
        h1 = sum(1 for b in json.load(f)['blocks'] if b['k'] == 'h1')

print('file   ', os.path.basename(path), os.path.getsize(path), 'B')
print('paras  ', len(d.paragraphs), '(基线 179)')
print('tables ', len(d.tables), '(基线 28)')
print('chars  ', len(txt), '(基线 19968)')
print('blocks ', blocks, '/ 一级章节', h1, '(基线 176 / 12)')

BAD = [
    '原生 JS 正则 + 上下文窗口',
    '能用原生写的，绝不引入框架',
    '双击 index.html',
    'wrangler',
    'js/traps.js',
    '30 条案例',
    '九类',
    '9 类坑型',
    '62 条规则',
]
hits = [b for b in BAD if b in txt]
for b in BAD:
    print(('HIT  ' if b in txt else 'ok   ') + b)
print('\n结果：' + ('发现 %d 处旧口径，需修正' % len(hits) if hits else '无旧口径残留'))
