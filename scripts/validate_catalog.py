"""Check catalogue identifiers, ISBNs, capture times and all photo references."""
import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1] / 'dist'
data = json.loads((ROOT/'data/books.json').read_text())
seen = set()
for book in data['books']:
    assert book['id'] not in seen, f"Duplicate accession: {book['id']}"
    seen.add(book['id'])
    digits = book['isbn'].replace('-','')
    assert len(digits)==13 and digits.isdigit(), f"Invalid ISBN: {book['isbn']}"
    assert sum(int(c)*(1 if i%2==0 else 3) for i,c in enumerate(digits))%10==0, f"ISBN checksum: {book['id']}"
    assert book['category'] and book['title'] and book['authors']
    for key in ['listPrice','paidPrice']:
        assert book[key] is None or isinstance(book[key],(int,float)) and book[key]>=0
    assert datetime.fromisoformat(book['accessionedAt']).utcoffset().total_seconds()==28800
    assert {p['side'] for p in book['photos']}=={'front','back'}
    front=next(p for p in book['photos'] if p['side']=='front')
    assert book['accessionedAt']==front['capturedAt']
    for photo in book['photos']:
        datetime.fromisoformat(photo['capturedAt'])
        for key in ['file','original']:
            assert (ROOT/photo[key]).is_file(), f"Missing {photo[key]}"
    assert (ROOT/'assets'/book['id']/'thumbnail.webp').is_file()
print(f"Catalogue validated: {len(seen)} unique books, ISBN checksums and all photos OK.")
