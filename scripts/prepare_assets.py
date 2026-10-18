"""Prepare reversible display derivatives; source photographs stay unchanged."""
from pathlib import Path
from PIL import Image
import argparse, json, shutil

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True, help='Folder containing the six original IMG_20261018_*.jpg photos')
SOURCE = parser.parse_args().source
OUT = ROOT / 'dist' / 'assets'
# Clockwise from upper left. PIL QUAD expects UL, LL, LR, UR.
specs = [
 ('LC-000001','front','172952',[(.104,.030),(.846,.029),(.908,.881),(.054,.900)]),
 ('LC-000001','back','173014',[(.128,.067),(.841,.075),(.911,.873),(.034,.878)]),
 ('LC-000002','front','173055',[(.120,.044),(.905,.058),(.907,.861),(.094,.860)]),
 ('LC-000002','back','173108',[(.089,.014),(.905,.029),(.922,.870),(.072,.882)]),
 ('LC-000003','front','173851',[(.073,.040),(.911,.034),(.958,.870),(.052,.878)]),
 ('LC-000003','back','173902',[(.088,.049),(.886,.030),(.977,.901),(.016,.905)]),
]
for book, side, suffix, corners in specs:
    dest = OUT / book
    dest.mkdir(parents=True, exist_ok=True)
    src = SOURCE / f'IMG_20261018_{suffix}.jpg'
    shutil.copy2(src, dest / f'{side}-original.jpg')
    im = Image.open(src).convert('RGB')
    w,h = im.size
    pts = [(x*w,y*h) for x,y in corners]
    quad = tuple(v for i in (0,3,2,1) for v in pts[i])
    # Bilinear perspective-like correction, without repainting any book content.
    corrected = im.transform((800,1160),Image.Transform.QUAD,quad,Image.Resampling.BICUBIC)
    corrected.save(dest / f'{side}.webp','WEBP',quality=88)
    if side == 'front':
        corrected.resize((400,580),Image.Resampling.LANCZOS).save(dest/'thumbnail.webp','WEBP',quality=84)
print(json.dumps({'prepared':len(specs),'originals_preserved':True}))
