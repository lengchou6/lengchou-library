"""Verify photo transfer round trips and rejection of corrupted data."""
import json
import shutil
import tempfile
from pathlib import Path
from restore_originals import restore

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'docs/original_parts.json').read_text())
with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    (root / 'docs').mkdir()
    (root / 'docs/original_parts.json').write_text(json.dumps(manifest))
    for image in manifest:
        for part in image['parts']:
            destination = root / part['path']
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / part['path'], destination)
    restore(root)
    for image in manifest:
        assert (root / image['original']).read_bytes() == (ROOT / image['original']).read_bytes()
    broken = root / manifest[0]['parts'][0]['path']
    content = bytearray(broken.read_bytes())
    content[-1] ^= 1
    broken.write_bytes(content)
    try:
        restore(root)
    except ValueError:
        pass
    else:
        raise AssertionError('Corrupted photo transfer part was accepted')
print('PASS: byte-identical original restored; corrupted data rejected')
