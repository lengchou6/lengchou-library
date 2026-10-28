"""Report duplicate photographs and possible repeated editions without deleting records."""
from pathlib import Path
import json, hashlib, unicodedata
from collections import defaultdict

ROOT=Path(__file__).resolve().parents[1]/'dist'
data=json.loads((ROOT/'data/books.json').read_text())
def canonical_isbn(value):
    digits=value.replace('-','')
    if len(digits)==10:
        stem='978'+digits[:9]
        return stem+str((-sum(int(c)*(1 if i%2==0 else 3) for i,c in enumerate(stem)))%10)
    return digits
isbn=defaultdict(list);titles=defaultdict(list);photos=defaultdict(list)
for book in data['books']:
    if book.get('isbn'): isbn[canonical_isbn(book['isbn'])].append(book['id'])
    title=unicodedata.normalize('NFKC',book['title']+('：'+book['subtitle'] if book.get('subtitle') else '')).replace(' ','')
    titles[title].append({'id':book['id'],'isbn':book['isbn']})
    for photo in book['photos']:
        raw=(ROOT/photo['original']).read_bytes()
        digest=hashlib.sha256(raw).hexdigest()
        assert not photo.get('sha256') or photo['sha256']==digest, f"Changed original: {photo['original']}"
        photos[digest].append({'id':book['id'],'side':photo['side']})

for group in data.get('seriesGroups', []):
    for photo in group.get('photos', []):
        digest=hashlib.sha256((ROOT/photo['original']).read_bytes()).hexdigest()
        assert not photo.get('sha256') or digest==photo['sha256']
        photos[digest].append({'id':'series:'+group['id'],'side':photo['side']})

bookmap={b['id']:b for b in data['books']}
sharedset=lambda ids: len({bookmap[i].get('physicalSetId') for i in ids})==1 and bool(bookmap[ids[0]].get('physicalSetId'))
groups={g['id'] for g in data.get('seriesGroups',[])}
for b in data['books']:
    assert not b.get('seriesGroupId') or b['seriesGroupId'] in groups
    if b.get('seriesGroupId'):
        assert isinstance(b.get('seriesNumber'),int) and b['seriesNumber']>0
report={
 'books':len(data['books']),
 'physicalVolumes':sum(b.get('volumeCount',1) for b in data['books']),
 'originalPhotos':sum(len(b['photos']) for b in data['books'])+sum(len(g.get('photos',[])) for g in data.get('seriesGroups',[])),
 'booksWithoutISBN':[b['id'] for b in data['books'] if not b.get('isbn')],
 'seriesGroups':len(groups),
 'originalCurrencyTotals':{c:round(sum(b['listPrice'] or 0 for b in data['books'] if b['currency']==c),2) for c in {b['currency'] for b in data['books']}},
 'referenceCnyTotal':round(sum((b['listPrice'] or 0)*data.get('exchangeRates',{}).get('rates',{'CNY':1}).get(b['currency'],0) for b in data['books'] if not b.get('priceGroupId'))+sum(g['amount']*data['exchangeRates']['rates'][g['currency']] for g in data.get('priceGroups',[])),2),
 'exactDuplicatePhotos':[v for v in photos.values() if len(v)>1],
 'sameISBNNeedsReview':[v for v in isbn.values() if len(v)>1 and not sharedset(v)],
 'sharedSetISBN':[v for v in isbn.values() if len(v)>1 and sharedset(v)],
 'sameTitleDifferentISBN':[v for v in titles.values() if len({b['isbn'] for b in v})>1],
 'note':'Repeated ISBNs can represent another physical copy; review before merging. Originals are never deleted automatically.'
}
print(json.dumps(report,ensure_ascii=False,indent=2))
