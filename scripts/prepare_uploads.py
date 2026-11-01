"""Build a lossless, resumable upload plan for selected catalogue owners."""
import argparse, hashlib, json, re
from pathlib import Path

def prepare(root, owner_ids, batch, repository, limit=600000):
    if not re.fullmatch(r'[A-Za-z0-9_-]+',batch): raise ValueError('Invalid batch')
    if not 1<=limit<=700000: raise ValueError('Invalid chunk size')
    data=json.loads((root/'dist/data/books.json').read_text())
    owners={o['id']:o for o in data['books']+data.get('seriesGroups',[])}
    if set(owner_ids)-owners.keys(): raise ValueError('Unknown catalogue owner')
    photos={}
    for id in owner_ids:
        o=owners[id];o=owners[o['photoGroupId']] if o.get('photoGroupId') else o
        for p in o.get('photos',[]): photos[p['original']]=p
    folder=root/'.cache/imports'/batch;folder.mkdir(parents=True,exist_ok=True)
    cp=folder/'uploaded.json'
    saved=json.loads(cp.read_text()) if cp.exists() else {'repository':repository,'blobs':{}}
    if saved['repository']!=repository: raise ValueError('Checkpoint repository mismatch')
    manifest_path=root/'docs/original_parts.json';manifest=json.loads(manifest_path.read_text())
    entries=[];originals=[]
    for relative,p in photos.items():
        path=root/'dist'/relative
        if not path.resolve().is_relative_to((root/'dist/assets').resolve()): raise ValueError('Invalid original path')
        raw=path.read_bytes();digest=hashlib.sha256(raw).hexdigest()
        if p.get('sha256') and p['sha256']!=digest: raise ValueError('Original changed')
        original='dist/'+relative;originals.append({'path':original,'sha256':digest,'size':len(raw)})
        prior=next((m for m in manifest if m['original']==original),None)
        if prior:
            if prior['sha256']!=digest or prior['size']!=len(raw): raise ValueError('Original manifest mismatch')
            payload=[]
            for part in prior['parts']:
                dest=root/part['path']
                if not dest.resolve().is_relative_to((root/'source-assets').resolve()): raise ValueError('Invalid part path')
                chunk=dest.read_bytes()
                if len(chunk)!=part['size'] or hashlib.sha256(chunk).hexdigest()!=part['sha256']: raise ValueError('Corrupt part')
                payload.append((part['path'],chunk))
            if b''.join(c for _,c in payload)!=raw: raise ValueError('Round trip mismatch')
        elif len(raw)>900000:
            payload=[];parts=[]
            for index,start in enumerate(range(0,len(raw),limit),1):
                rel=f'source-assets/{path.parent.name}/{path.stem}.part{index:02}'
                chunk=raw[start:start+limit];dest=root/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(chunk)
                payload.append((rel,chunk));parts.append({'path':rel,'size':len(chunk),'sha256':hashlib.sha256(chunk).hexdigest()})
            manifest.append({'original':original,'size':len(raw),'sha256':digest,'parts':parts})
        else: payload=[(original,raw)]
        for rel,chunk in payload:
            sha=hashlib.sha1(f'blob {len(chunk)}\0'.encode()+chunk).hexdigest()
            entries.append({'path':rel,'size':len(chunk),'sha':sha,'sha256':hashlib.sha256(chunk).hexdigest(),'uploaded':saved['blobs'].get(rel)==sha})
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    plan={'repository':repository,'owners':owner_ids,'originals':originals,'blobs':entries}
    (folder/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
    return plan

def record_uploaded(root,batch,repository,path,sha):
    if not re.fullmatch(r'[A-Za-z0-9_-]+',batch):raise ValueError('Invalid batch')
    folder=root/'.cache/imports'/batch;plan=json.loads((folder/'plan.json').read_text())
    if plan['repository']!=repository:raise ValueError('Repository mismatch')
    entry=next((b for b in plan['blobs'] if b['path']==path),None)
    if not entry or entry['sha']!=sha:raise ValueError('Returned SHA mismatch')
    cp=folder/'uploaded.json';saved=json.loads(cp.read_text()) if cp.exists() else {'repository':repository,'blobs':{}}
    if saved['repository']!=repository:raise ValueError('Checkpoint repository mismatch')
    saved['blobs'][path]=sha;tmp=cp.with_suffix('.tmp');tmp.write_text(json.dumps(saved,indent=2)+'\n');tmp.replace(cp)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--batch',required=True);p.add_argument('--ids',nargs='+');p.add_argument('--record-path');p.add_argument('--sha');p.add_argument('--repository',default='lengchou6/lengchou-library');p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=p.parse_args()
    if a.record_path:record_uploaded(a.root,a.batch,a.repository,a.record_path,a.sha)
    elif a.ids:
        plan=prepare(a.root,a.ids,a.batch,a.repository);print(json.dumps({'photos':len(plan['originals']),'blobs':len(plan['blobs']),'remaining':sum(not b['uploaded'] for b in plan['blobs'])}))
    else:p.error('--ids required')
