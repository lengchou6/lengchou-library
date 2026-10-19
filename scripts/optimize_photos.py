"""Build small, full-frame display images without modifying original photographs."""
import json
from pathlib import Path
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[1]/'dist'
data=json.loads((ROOT/'data/books.json').read_text())
outputs=[]
for book in data['books']:
    for photo in book['photos']:
        source=ROOT/photo['original']
        with Image.open(source) as raw:
            image=ImageOps.exif_transpose(raw).convert('RGB')
            photo['width'],photo['height']=image.size
            for kind,max_width,quality in [('preview',960,82),('thumbnail',480,78)]:
                if kind=='thumbnail' and photo['side']!='front':
                    continue
                derived=image.copy()
                # Resize the complete frame; do not crop, straighten or repaint it.
                derived.thumbnail((max_width,max_width*3),Image.Resampling.LANCZOS)
                path=source.with_name(photo['side']+'-'+kind+'-v1.webp')
                derived.save(path,'WEBP',quality=quality,method=6)
                photo[kind]=path.relative_to(ROOT).as_posix()
                outputs.append(path.relative_to(ROOT.parent).as_posix())
(ROOT/'data/books.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(outputs),'derivativeMiB':sum((ROOT.parent/p).stat().st_size for p in outputs)/1024**2,'thumbnailMiB':sum((ROOT/p['thumbnail']).stat().st_size for b in data['books'] for p in b['photos'] if 'thumbnail' in p)/1024**2,'maxBytes':max((ROOT.parent/p).stat().st_size for p in outputs)},ensure_ascii=False))
