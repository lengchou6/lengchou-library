"""Ensure retries preserve original bytes and cannot reuse corrupt uploads."""
import hashlib,json,tempfile
from pathlib import Path
from prepare_uploads import prepare,record_uploaded

with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);(root/'dist/assets/test').mkdir(parents=True);(root/'dist/data').mkdir();(root/'docs').mkdir()
    raw=bytes(range(256))*4000;photo=root/'dist/assets/test/front-original.jpg';photo.write_bytes(raw)
    data={'books':[{'id':'LC-test','photos':[{'original':'assets/test/front-original.jpg','sha256':hashlib.sha256(raw).hexdigest()}]}]}
    (root/'dist/data/books.json').write_text(json.dumps(data));(root/'docs/original_parts.json').write_text('[]')
    plan=prepare(root,['LC-test'],'test','owner/repo');assert len(plan['blobs'])==2
    assert b''.join((root/b['path']).read_bytes() for b in plan['blobs'])==raw
    first=plan['blobs'][0];record_uploaded(root,'test','owner/repo',first['path'],first['sha'])
    again=prepare(root,['LC-test'],'test','owner/repo');assert [b['uploaded'] for b in again['blobs']]==[True,False]
    assert len(json.loads((root/'docs/original_parts.json').read_text()))==1
    def rejects(fn):
        try:fn()
        except ValueError:return
        raise AssertionError('Unsafe plan accepted')
    rejects(lambda:record_uploaded(root,'test','owner/repo',first['path'],'bad'))
    rejects(lambda:prepare(root,['LC-test'],'test','other/repo'))
    photo.write_bytes(b'changed');rejects(lambda:prepare(root,['LC-test'],'test','owner/repo'))
print('PASS: byte-identical chunks, stable resume, SHA/repository/original guards')
