# tools/_seo/make-icons.py —— 从 favicon.svg 的思路（深蓝圆角底 + 白「查」）重画三档 PNG 图标。
# 为什么要重画而不是放大 SVG：Windows 下没有可靠的 svg->png 命令行；Pillow 直接按字体渲染更锐。
# 用法：<dsh python> tools/_seo/make-icons.py
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUB = os.path.join(ROOT, 'web', 'public')
BRAND = (31, 78, 121)        # #1F4E79
BRAND_2 = (46, 109, 164)     # #2E6DA4
WHITE = (255, 255, 255)

FONT_CANDIDATES = [
    r'C:\Windows\Fonts\msyhbd.ttc',   # 微软雅黑 Bold
    r'C:\Windows\Fonts\msyh.ttc',
    r'C:\Windows\Fonts\simhei.ttf',
]


def pick_font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def render(size, radius_ratio, pad_ratio, out, with_bg=True):
    """画一张 size×size 的图标：圆角蓝底 + 居中的白色「查」。"""
    S = size
    # 4× 超采样再缩，边缘更干净
    ss = 4
    canvas = Image.new('RGBA', (S * ss, S * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)

    if with_bg:
        inset = int(S * ss * pad_ratio)
        box = (inset, inset, S * ss - inset, S * ss - inset)
        r = int((S * ss - 2 * inset) * radius_ratio)
        # 用竖直两段色做渐变（上亮下深），模拟 favicon 的立体感
        grad = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grad)
        h = box[3] - box[1]
        for y in range(h):
            t = y / max(1, h - 1)
            col = tuple(int(BRAND_2[i] + (BRAND[i] - BRAND_2[i]) * t) for i in range(3))
            gd.line([(0, y), (box[2] - box[0], y)], fill=col + (255,))
        mask = Image.new('L', grad.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, grad.size[0] - 1, grad.size[1] - 1], radius=r, fill=255)
        canvas.paste(grad, (box[0], box[1]), mask)
    else:
        d.rounded_rectangle(
            [0, 0, S * ss - 1, S * ss - 1],
            radius=int(S * ss * radius_ratio),
            fill=BRAND + (255,),
        )

    # 逐字符居中：中文「查」用字体自身的 bbox 校准，避免基线偏移
    glyph = '查'
    target_h = S * ss * (0.62 if with_bg else 0.66)
    best = None
    for fs in range(8, S * ss):
        f = pick_font(fs)
        bb = d.textbbox((0, 0), glyph, font=f)
        gh = bb[3] - bb[1]
        if gh >= target_h:
            best = (f, bb)
            break
    if best is None:
        best = (pick_font(int(target_h)), d.textbbox((0, 0), glyph, font=pick_font(int(target_h))))
    f, bb = best
    gw = bb[2] - bb[0]
    gh = bb[3] - bb[1]
    x = (S * ss - gw) / 2 - bb[0]
    y = (S * ss - gh) / 2 - bb[1]
    # 轻微下移 2%：中文字形的视觉重心偏上
    y += S * ss * 0.012
    d.text((x, y), glyph, font=f, fill=WHITE + (255,))

    img = canvas.resize((S, S), Image.LANCZOS)
    img.save(out, 'PNG', optimize=True)
    return out, os.path.getsize(out), img.size


targets = [
    ('apple-touch-icon.png', 180, 0.0, 0.0),   # iOS 会自己加圆角，所以铺满不留边
    ('icon-192.png', 192, 0.22, 0.0),
    ('icon-512.png', 512, 0.22, 0.0),
]

for name, size, radius_ratio, pad in targets:
    # apple-touch-icon 要求不透明满幅；其余也做成不透明，避免浏览器里透出灰底
    with_bg = True
    out = os.path.join(PUB, name)
    p, b, dim = render(size, radius_ratio if radius_ratio else 0.22, pad, out, with_bg)
    print(f'{name}: {dim[0]}x{dim[1]}  {b} bytes  -> {p}')

# 另存一张 1024 的 maskable 备用（不写进 manifest，只是留档）
out = os.path.join(ROOT, 'tools', '_seo', 'icon-master-1024.png')
p, b, dim = render(1024, 0.22, 0.0, out, True)
print(f'icon-master-1024.png: {dim[0]}x{dim[1]}  {b} bytes')
