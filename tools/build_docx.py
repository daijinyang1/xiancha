# -*- coding: utf-8 -*-
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docx'))
from docx_base import Doc

def render(cfg):
    d = Doc()
    ti = cfg['title']
    d.title(ti[0], ti[1], ti[2] if len(ti) > 2 else '')
    for b in cfg['blocks']:
        k = b['k']
        if k == 'h1':
            d.h1(b['t'])
        elif k == 'h2':
            d.h2(b['t'])
        elif k == 'p':
            d.p(b['t'], b.get('bp'), b.get('i', 0), b.get('s', 10.5), b.get('c'), b.get('bb', False))
        elif k == 'b':
            d.bullet(b['t'], b.get('bp'))
        elif k == 'q':
            d.quote(b['t'])
        elif k == 't':
            d.table(b['h'], b['r'], b['w'], b.get('fs', 9), b.get('hf', '1F4E79'), b.get('hl'), b.get('al'), b.get('cc'))
        elif k == 'pb':
            d.d.add_page_break()
        else:
            raise SystemExit('unknown block ' + k)
    d.save(cfg['out'])

if __name__ == '__main__':
    for p in sys.argv[1:]:
        with open(p, encoding='utf-8') as f:
            render(json.load(f))