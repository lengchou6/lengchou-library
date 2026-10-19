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
        for key in ['file','original','thumbnail','preview']:
            if key not in photo:
                continue
            assert (ROOT/photo[key]).is_file(), f"Missing {photo[key]}"
    assert book.get('currency','CNY') in data.get('exchangeRates',{}).get('rates',{'CNY':1}), f"Missing FX rate: {book['id']}"
print(f"Catalogue validated: {len(seen)} unique books, ISBN checksums and all photos OK.")

from decimal import Decimal
rates=data.get('exchangeRates',{}).get('rates',{'CNY':1})
assert all(Decimal(str(rate))>0 for rate in rates.values())
raw_total=sum(Decimal(str(b['listPrice']))*Decimal(str(rates[b['currency']])) for b in data['books'] if b['listPrice'] is not None and not b.get('priceGroupId'))
price_groups={g['id']:g for g in data.get('priceGroups',[])}
for g in price_groups.values():
    assert set(g['bookIds']) <= seen
    assert g['amount']>=0 and g['currency'] in rates
    raw_total+=Decimal(str(g['amount']))*Decimal(str(rates[g['currency']]))
for book in data['books']:
    assert not book.get('priceGroupId') or book['id'] in price_groups[book['priceGroupId']]['bookIds']
    assert isinstance(book.get('usageTags'),list) and book['usageTags'] and len(book['usageTags'])==len(set(book['usageTags']))

print(f"Original currencies preserved; reference CNY total: {raw_total:.2f}")
