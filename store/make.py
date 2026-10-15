# Store images. Captures come from a release build on the iPhone 17 Pro Max simulator (Charcoal, real play),
# saved to ../shots next to this script when it was run; re-capture before re-running.
# Builds Keep's store images from the release-build captures:
# App Store 6.9" screenshots (1320x2868), Google Play phone screenshots (1080x1920),
# the Play feature graphic (1024x500), and icons (1024 App Store, 512 Play).
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, '..', 'shots')
OUT = os.path.join(HERE, 'kit2')
NM = os.path.expanduser('~/my_apps/twain/node_modules/@expo-google-fonts')
BODONI = f'{NM}/bodoni-moda/400Regular/BodoniModa_400Regular.ttf'
RALEWAY = f'{NM}/raleway/600SemiBold/Raleway_600SemiBold.ttf'
JOST = f'{NM}/jost/500Medium/Jost_500Medium.ttf'
SKY0, SKY1, INK, DIM, BLUE, TAN = (31, 33, 37), (43, 46, 51), (242, 241, 238), (180, 176, 168), (123, 175, 212), (200, 169, 126)
os.makedirs(f'{OUT}/ios', exist_ok=True); os.makedirs(f'{OUT}/android', exist_ok=True)

# caption: (first line, accent words) — accent is drawn in Raleway blue, like the app's emphasis.
SET = [
    ('home2', 'A 45-second game', 'about what you reach for.'),
    ('play1-6', 'Moments fall like stars.', 'Keep five.'),
    ('results2', 'Every drop draws', 'a constellation.'),
    ('sky2', 'Play five drops.', 'Find your sign.'),
    ('gets-3', 'Then make one real.', 'Keep checks in after.'),
    ('kept2', 'Watch what you reach for', 'change over time.'),
    ('match-card', 'Play the same sky', 'as a friend.'),
]

def sky(w, h, seed=7, n=None):
    im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(SKY1[i] * (1 - t) + SKY0[i] * t) for i in range(3)))
    r = random.Random(seed)
    for _ in range(n or int(w * h / 9000)):
        x, y, s = r.random() * w, r.random() * h, r.random() * 2.2 + 0.6
        a = int(60 + r.random() * 120)
        d.ellipse([x - s, y - s, x + s, y + s], fill=(min(255, SKY0[0] + a), min(255, SKY0[1] + a), min(255, SKY0[2] + a)))
    return im

def rounded(img, r):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], r, fill=255)
    out = img.convert('RGBA'); out.putalpha(m)
    return out

def screen(name, crop_top):
    im = Image.open(f'{SHOTS}/{name}.png').convert('RGB')
    return im.crop((0, crop_top, im.width, im.height))

def caption(d, W, y, a, b, size, font_w):
    f1, f2 = ImageFont.truetype(BODONI, size), ImageFont.truetype(RALEWAY, int(size * 0.86))
    for text, f, col in ((a, f1, INK), (b, f2, BLUE)):
        tw = d.textlength(text, font=f)
        while tw > font_w:  # never overflow the width
            f = ImageFont.truetype(f.path, f.size - 4); tw = d.textlength(text, font=f)
        d.text(((W - tw) / 2, y), text, font=f, fill=col)
        y += int(f.size * 1.22)
    return y

def poster(name, a, b, W, H, cap_size, shot_w, crop_top, radius, seed):
    bg = sky(W, H, seed)
    d = ImageDraw.Draw(bg)
    y = caption(d, W, int(H * 0.055), a, b, cap_size, W * 0.88)
    shot = screen(name, crop_top)
    sh = int(shot.height * shot_w / shot.width)
    room = H - y - int(H * 0.05)
    if sh > room:  # keep the phone screen fully on the canvas
        shot_w = int(shot_w * room / sh); sh = room
    shot = rounded(shot.resize((shot_w, sh), Image.LANCZOS), radius)
    x, top = (W - shot_w) // 2, y + int(H * 0.035)
    glow = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle([x - 6, top - 6, x + shot_w + 6, top + sh + 6], radius + 6, fill=(123, 175, 212, 70))
    bg = Image.alpha_composite(bg.convert('RGBA'), glow.filter(ImageFilter.GaussianBlur(28)))
    bg.alpha_composite(shot, (x, top))
    ImageDraw.Draw(bg).rounded_rectangle([x, top, x + shot_w - 1, top + sh - 1], radius, outline=(242, 241, 238, 40), width=3)
    return bg.convert('RGB')

for i, (name, a, b) in enumerate(SET, 1):
    poster(name, a, b, 1320, 2868, 104, 1080, 170, 64, i).save(f'{OUT}/ios/{i:02d}-{name}.png')
    poster(name, a, b, 1080, 1920, 70, 900, 170, 40, i).save(f'{OUT}/android/{i:02d}-{name}.png')

# Feature graphic: the night sky, a falling star, "Keep." and the line.
W, H = 1024, 500
fg = sky(W, H, 3, 260).convert('RGBA')
d = ImageDraw.Draw(fg)
pts = [(640, 330), (720, 270), (790, 300), (870, 200), (940, 240)]
d.line(pts, fill=(123, 175, 212, 200), width=3)
for (px, py), col in zip(pts, [(243, 185, 138), (217, 178, 106), (183, 155, 224), (111, 208, 216), (127, 178, 240)]):
    halo = Image.new('RGBA', fg.size, (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([px - 26, py - 26, px + 26, py + 26], fill=col + (110,))
    fg = Image.alpha_composite(fg, halo.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(fg); d.ellipse([px - 7, py - 7, px + 7, py + 7], fill=(251, 248, 242))
for k in range(28):  # a comet, falling down and to the left
    t = k / 28
    d.line([(600 + k * 9, 120 - k * 4), (600 + (k + 1) * 9, 120 - (k + 1) * 4)], fill=(200, 169, 126, int(200 * (1 - t))), width=max(1, int(5 * (1 - t))))
d.ellipse([593, 113, 607, 127], fill=(251, 248, 242))
fk = ImageFont.truetype(BODONI, 150)
d.text((70, 90), 'Keep', font=fk, fill=INK)
kw = d.textlength('Keep', font=fk)
d.ellipse([70 + kw + 8, 206, 70 + kw + 32, 230], fill=BLUE)
d.text((76, 340), 'Catch what you’d keep.', font=ImageFont.truetype(RALEWAY, 38), fill=DIM)
fg.convert('RGB').save(f'{OUT}/feature-graphic-1024x500.png')

# Icons
icon = Image.open(os.path.expanduser('~/my_apps/twain/assets/icon.png')).convert('RGB')
icon.save(f'{OUT}/icon-app-store-1024.png')
icon.resize((512, 512), Image.LANCZOS).save(f'{OUT}/icon-google-play-512.png')
print('done')
