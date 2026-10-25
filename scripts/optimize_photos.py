"""Generate full-frame responsive images; reuse content-addressed cached outputs."""
import json,hashlib,shutil
from pathlib import Path
from PIL import Image,ImageOps,__version__
ROOT=Path(__file__).resolve().parents[1]/'dist';CACHE=ROOT.parent/'.cache/photos';CACHE.mkdir(parents=True,exist_ok=True)
data=json.loads((ROOT/'data/books.json').read_text());generated=reused=0;outputs=[];originals=set()
for owner in data['books']+data.get('seriesGroups',[]):
 for photo in owner.get('photos',[]):
  source=ROOT/photo['original'];originals.add(source.resolve());photo['file']=photo['original'];digest=hashlib.sha256(source.read_bytes()).hexdigest()
  with Image.open(source) as raw:
   photo['width'],photo['height']=ImageOps.exif_transpose(raw).size
  cover=photo['side']=='front' or photo['side'].startswith('box-')
  targets=[('preview',960,82)]+([('small',320,78),('thumbnail',480,78),('large',720,80)] if cover else [])
  photo.pop('sources',None);sources=[];image=None
  for kind,width,quality in targets:
   key=hashlib.sha256(f'{digest}:{width}:{quality}:{__version__}:full-frame-v2'.encode()).hexdigest()
   cache=CACHE/(key+'.webp');path=source.with_name(photo['side']+'-'+kind+'-'+key[:12]+'.webp')
   if cache.exists():reused+=1
   else:
    if image is None:
     with Image.open(source) as raw:image=ImageOps.exif_transpose(raw).convert('RGB')
    derived=image.copy();derived.thumbnail((width,width*3),Image.Resampling.LANCZOS);derived.save(cache,'WEBP',quality=quality,method=6);generated+=1
   shutil.copy2(cache,path);rel=path.relative_to(ROOT).as_posix();outputs.append(path)
   if kind in ['preview','thumbnail']:
    photo[kind]=rel
    # Existing tabs may still hold the v1 catalogue. Keep its public URLs valid.
    legacy=source.with_name(photo['side']+'-'+kind+'-v1.webp')
    shutil.copy2(cache,legacy);outputs.append(legacy)
   if kind!='preview':sources.append({'width':min(width,photo['width']),'path':rel})
  if sources:photo['sources']=sources
# Remove previous derived versions from the deploy directory, never originals.
keep={p.resolve() for p in outputs}|originals
for path in (ROOT/'assets').rglob('*.webp'):
 if path.resolve() not in keep:path.unlink()
(ROOT/'data/books.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(outputs),'generated':generated,'reused':reused,'MiB':round(sum(p.stat().st_size for p in outputs)/1048576,2)}))
