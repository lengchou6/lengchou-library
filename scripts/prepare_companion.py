"""Prepare compact companion sprite artwork for the website."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / 'dist/assets'
with Image.open(root / 'cockatiel-companion.png') as source:
    image = source.convert('RGBA')
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    image.save(root / 'cockatiel-companion.webp', 'WEBP', quality=90, method=6)
assert (root / 'cockatiel-companion.webp').stat().st_size > 0
print('Companion artwork prepared.')
