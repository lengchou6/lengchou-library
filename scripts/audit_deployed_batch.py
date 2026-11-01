"""Check the live catalogue and image URLs for a selected batch."""
import argparse,concurrent.futures,json,time,urllib.request
from pathlib import Path,PurePosixPath

def audit(base,ids,version,expected):
    base=base.rstrip('/')+'/'
    with urllib.request.urlopen(base+'data/books.json?v='+version,timeout=30) as r:data=json.load(r)
    if len(data['books'])!=expected:raise ValueError('Expected catalogue not deployed')
    owners={o['id']:o for o in data['books']+data.get('seriesGroups',[])}
    if set(ids)-owners.keys():raise ValueError('Missing owners')
    paths=set()
    for id in ids:
        o=owners[id];o=owners[o['photoGroupId']] if o.get('photoGroupId') else o
        for p in o.get('photos',[]):
            paths.add(p['original'])
            for kind in ['preview','thumbnail']:
                if p.get(kind):
                    paths.add(p[kind]);paths.add(str(PurePosixPath(p['original']).with_name(p['side']+'-'+kind+'-v1.webp')))
            paths.update(s['path'] for s in p.get('sources',[]))
    def check(path):
        for attempt in range(3):
            try:
                with urllib.request.urlopen(urllib.request.Request(base+path,method='HEAD'),timeout=20) as r:
                    if r.status==200:return None
                    raise ValueError(str(r.status))
            except Exception as e:
                if attempt==2:return {'path':path,'error':str(e)}
                time.sleep(attempt+1)
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:failed=[v for v in pool.map(check,sorted(paths)) if v]
    return {'books':len(data['books']),'physicalVolumes':sum(b.get('volumeCount',1) for b in data['books']),'uniquePhotos':len({p['original'] for o in owners.values() for p in o.get('photos',[])}),'checkedURLs':len(paths),'failed':failed}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--ids',nargs='+',required=True);p.add_argument('--version',required=True);p.add_argument('--expected-records',type=int,required=True);p.add_argument('--base',default='https://lengchou6.github.io/lengchou-library/');p.add_argument('--output',type=Path);a=p.parse_args();result=audit(a.base,a.ids,a.version,a.expected_records)
    if a.output:a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False));raise SystemExit(bool(result['failed']))
