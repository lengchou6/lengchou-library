// A complete physical set is one catalogue entry, with its true volume count.
const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=require('path').resolve(__dirname,'../dist')+'/';
const data=JSON.parse(fs.readFileSync(root+'data/books.json'));
const set=data.books.find(b=>b.id==='LC-000127');
assert.equal(set.volumeCount,7);assert.equal(set.photos.length,3);assert.equal(set.listPrice,628);
assert.equal(set.accessionIds.length,7);assert.equal(data.books.filter(b=>b.physicalSetId===set.physicalSetId).length,1);
const dom=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{url:'https://example.test/#catalog',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;w.fetch=async()=>({ok:true,json:async()=>data});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.Image=class {set src(v){setTimeout(()=>this.onload?.(),0)}decode(){return Promise.resolve()}};
const pause=(ms=35)=>new Promise(r=>setTimeout(r,ms));
w.eval(fs.readFileSync(root+'app.js','utf8'));
(async()=>{
 await pause();assert.equal(d.querySelector('#summary').textContent,'共 133 册');
 const setCards=()=>[...d.querySelectorAll('.book-card')].filter(c=>c.textContent.includes('魔戒'));
 assert.equal(setCards().length,1);assert(setCards()[0].textContent.includes('全7册'));assert(setCards()[0].querySelector('img').alt.includes('套装实拍'));
 for(const sort of ['series','title','accession-desc']){d.querySelector('#sort').value=sort;d.querySelector('#sort').dispatchEvent(new w.Event('change'));assert.equal(setCards().length,1)}
 const search=d.querySelector('#search');search.value='魔戒';search.dispatchEvent(new w.Event('input'));await pause(180);assert.equal(d.querySelectorAll('.book-card').length,1);assert.equal(d.querySelector('#results-status').textContent,'找到 7 册');
 for(const id of set.accessionIds){w.location.hash='book/'+id;await pause();assert(d.querySelector('.detail-title').textContent.includes('全7册'));assert.equal(d.querySelectorAll('#detail-page [data-side]').length,3)}
 d.querySelector('[data-side="spines"]').click();await pause();assert.equal(d.querySelector('#detail-photo').dataset.original,set.photos[1].original);
 w.location.hash='timeline';await pause();assert.equal([...d.querySelectorAll('.timeline-entry')].filter(c=>c.textContent.includes('魔戒')).length,1);assert(d.querySelector('#timeline-page').textContent.includes('133 册'));
 w.location.hash='about';await pause();assert(d.querySelector('#about-page').textContent.includes('133 册 · 262 张实拍'));
 console.log('PASS: one complete-set card in all sorts and search; seven-volume totals; three photos switch; all seven old links resolve; timeline and about counts preserved.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
