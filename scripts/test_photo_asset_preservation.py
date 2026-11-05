"""Photo optimization must preserve unrelated website assets and prune stale derivatives."""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, __version__

source = Path(__file__).resolve().with_name('optimize_photos.py')
with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    (root/'scripts').mkdir()
    shutil.copy2(source, root/'scripts/optimize_photos.py')
    (root/'requirements-images.txt').write_text('Pillow=='+__version__)
    assets = root/'dist/assets'
    photos = assets/'LC-000001'
    photos.mkdir(parents=True)
    (root/'dist/data').mkdir()
    Image.new('RGB', (30, 40), '#c5be9b').save(photos/'front-original.jpg')
    retained = [assets/'avatar.webp', assets/'cockatiel-corner.webp', photos/'decoration.webp']
    for path in retained:
        Image.new('RGBA', (12, 12), '#aebca0').save(path, 'WEBP')
    before = {path: path.read_bytes() for path in retained}
    stale = photos/'front-preview-012345abcdef.webp'
    stale.write_bytes(b'stale derivative')
    data = {'books': [{'photos': [{'side': 'front', 'original': 'assets/LC-000001/front-original.jpg'}]}]}
    (root/'dist/data/books.json').write_text(json.dumps(data))
    subprocess.run([sys.executable, str(root/'scripts/optimize_photos.py')], check=True)
    for path, content in before.items():
        assert path.read_bytes() == content, f'Website asset altered or removed: {path.name}'
    assert not stale.exists(), 'Stale photo derivative should be removed'
    result = json.loads((root/'dist/data/books.json').read_text())
    photo = result['books'][0]['photos'][0]
    assert (root/'dist'/photo['preview']).is_file()
    assert (photos/'front-preview-v1.webp').is_file()
print('PASS: Website WebP assets preserved; stale photo derivatives removed; previews and legacy URLs generated.')
