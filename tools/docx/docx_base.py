# -*- coding: utf-8 -*-
"""生成《落地执行手册》与《商户服务合同+报价单模板》"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

CN = '微软雅黑'
BODY = '等线'
NAVY = (0x1F, 0x4E, 0x79)
RED = (0xC0, 0x39, 0x2B)
GRAY = (0x66, 0x66, 0x66)


def set_font(run, name=BODY, size=10.5, bold=False, color=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    for attr in ('w:eastAsia', 'w:ascii', 'w:hAnsi'):
        rFonts.set(qn(attr), name)


class Doc:
    def __init__(self):
        self.d = Document()
        s = self.d.sections[0]
        s.page_width, s.page_height = Cm(21.0), Cm(29.7)
        s.left_margin = s.right_margin = Cm(2.3)
        s.top_margin = s.bottom_margin = Cm(2.1)
        n = self.d.styles['Normal']
        n.font.name = BODY
        n.font.size = Pt(10.5)
        n._element.rPr.rFonts.set(qn('w:eastAsia'), BODY)
        n.paragraph_format.line_spacing = 1.45
        n.paragraph_format.space_after = Pt(4)

    def title(self, main, sub, note=None):
        for txt, sz in ((main, 19), (sub, 19)):
            p = self.d.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(2)
            set_font(p.add_run(txt), CN, sz, True, NAVY)
        if sub:
            pass
        p = self.d.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(4)
        set_font(p.add_run(note or ''), CN, 10.5, False, GRAY)

    def h1(self, t):
        p = self.d.add_paragraph()
        p.paragraph_format.space_before = Pt(15)
        p.paragraph_format.space_after = Pt(6)
        set_font(p.add_run(t), CN, 14.5, True, NAVY)
        return p

    def h2(self, t):
        p = self.d.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        set_font(p.add_run(t), CN, 12, True, (0x11, 0x3A, 0x6B))
        return p

    def _rich(self, par, text, size, bold=False, color=None):
        """支持 **粗体** 行内标记"""
        import re as _re
        parts = _re.split(r'(\*\*.+?\*\*)', text)
        for seg in parts:
            if not seg:
                continue
            if seg.startswith('**') and seg.endswith('**') and len(seg) > 4:
                set_font(par.add_run(seg[2:-2]), BODY, size, True, color)
            else:
                set_font(par.add_run(seg), BODY, size, bold, color)

    def p(self, t, bold_prefix=None, indent=0, size=10.5, color=None, bold_body=False):
        par = self.d.add_paragraph()
        par.paragraph_format.space_after = Pt(4)
        if indent:
            par.paragraph_format.left_indent = Cm(indent)
        if bold_prefix:
            set_font(par.add_run(bold_prefix), BODY, size, True)
        self._rich(par, t, size, bold_body, color)
        return par

    def bullet(self, t, bold_prefix=None, size=10.5):
        par = self.d.add_paragraph(style='List Bullet')
        par.paragraph_format.space_after = Pt(2)
        par.paragraph_format.left_indent = Cm(0.95)
        par.paragraph_format.first_line_indent = Cm(-0.45)
        if bold_prefix:
            set_font(par.add_run(bold_prefix), BODY, size, True)
        self._rich(par, t, size)
        return par

    def quote(self, t, size=10.5, color=(0x33, 0x33, 0x33)):
        """话术框"""
        t2 = self.d.add_table(rows=1, cols=1)
        t2.style = 'Table Grid'
        cell = t2.rows[0].cells[0]
        cell.text = ''
        par = cell.paragraphs[0]
        par.paragraph_format.space_after = Pt(0)
        par.paragraph_format.line_spacing = 1.4
        self._rich(par, t, size, False, color)
        shade(cell, 'F4F7FA')
        set_col(self, t2, [15.9])
        self.d.add_paragraph().paragraph_format.space_after = Pt(2)
        return t2

    def table(self, headers, rows, widths, font_size=9, header_fill='1F4E79',
              highlight_rows=None, aligns=None, col_colors=None):
        t = self.d.add_table(rows=1, cols=len(headers))
        t.style = 'Table Grid'
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        hdr = t.rows[0].cells
        for i, h in enumerate(headers):
            hdr[i].text = ''
            p = hdr[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(1)
            set_font(p.add_run(h), CN, font_size, True, (0xFF, 0xFF, 0xFF))
            shade(hdr[i], header_fill)
        for ri, row in enumerate(rows):
            cells = t.add_row().cells
            for i, v in enumerate(row):
                cells[i].text = ''
                p = cells[i].paragraphs[0]
                p.paragraph_format.space_after = Pt(1)
                p.paragraph_format.line_spacing = 1.15
                if aligns and aligns[i] == 'c':
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                color = None
                if col_colors and i in col_colors:
                    color = col_colors[i]
                self._rich(p, str(v), font_size, ri in (highlight_rows or ()), color)
                if highlight_rows and ri in highlight_rows:
                    shade(cells[i], 'EAF1F8')
        set_col(self, t, widths)
        self.d.add_paragraph().paragraph_format.space_after = Pt(2)
        return t

    def save(self, path):
        self.d.save(path)
        print('saved:', path)


def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:fill'), hexcolor)
    tcPr.append(shd)


def set_col(doc, table, widths_cm):
    table.autofit = False
    tbl = table._tbl
    tblPr = tbl.tblPr
    for el in tblPr.findall(qn('w:tblLayout')):
        tblPr.remove(el)
    layout = OxmlElement('w:tblLayout')
    layout.set(qn('w:type'), 'fixed')
    tblPr.append(layout)
    for el in tblPr.findall(qn('w:tblW')):
        tblPr.remove(el)
    tblW = OxmlElement('w:tblW')
    tblW.set(qn('w:w'), str(int(sum(widths_cm) * 567)))
    tblW.set(qn('w:type'), 'dxa')
    tblPr.append(tblW)
    grid = tbl.find(qn('w:tblGrid'))
    if grid is not None:
        tbl.remove(grid)
    grid = OxmlElement('w:tblGrid')
    for w in widths_cm:
        gc = OxmlElement('w:gridCol')
        gc.set(qn('w:w'), str(int(w * 567)))
        grid.append(gc)
    tbl.insert(list(tbl).index(tblPr) + 1, grid)
    for row in table.rows:
        for i, w in enumerate(widths_cm):
            if i < len(row.cells):
                row.cells[i].width = Cm(w)
