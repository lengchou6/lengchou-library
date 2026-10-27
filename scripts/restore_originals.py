"""Restore byte-identical original photographs stored as reviewed transfer parts."""
import hashlib
import json
from pathlib import Path


def checked_path(root, value, prefix):
    path = (root / value).resolve()
    if not path.is_relative_to((root / prefix).resolve()):
        raise ValueError(f'Unexpected image path: {value}')
    return path


def restore(root):
    root = Path(root).resolve()
    manifest = root / 'docs/original_parts.json'
    if not manifest.exists():
        return
    for image in json.loads(manifest.read_text()):
        target = checked_path(root, image['original'], 'dist/assets')
        pieces = []
        for part in image['parts']:
            content = checked_path(root, part['path'], 'source-assets').read_bytes()
            if len(content) != part['size'] or hashlib.sha256(content).hexdigest() != part['sha256']:
                raise ValueError(f'Original photo part failed verification: {part["path"]}')
            pieces.append(content)
        original = b''.join(pieces)
        if len(original) != image['size'] or hashlib.sha256(original).hexdigest() != image['sha256']:
            raise ValueError(f'Restored original failed verification: {target.name}')
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(target.suffix + '.restoring')
        temporary.write_bytes(original)
        temporary.replace(target)
        print(f'Restored and SHA256 verified: {image["original"]}')


if __name__ == '__main__':
    restore(Path(__file__).resolve().parents[1])
