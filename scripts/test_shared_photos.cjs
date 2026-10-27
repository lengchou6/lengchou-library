// A physical set can have individual records without individual cover photographs.
const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=require('path').resolve(__dirname,'../dist')+'/';
const data=JSON.parse(fs.readFileSync(root+'data/books.json'));
const group=data.seriesGroups.find(g=>g.id==='lotr-wenjing-illustrated');
const members=data.books.filter(b=>b.photoGroupId===group.id);
assert.equal(members.length,7);assert.equal(group.photos.length,3);
assert(members.every(b=>b.photos.length===0),'shared photographs stored once');
const originals=new Set([...data.books,...data.seriesGroups].flatMap(o=>(o.photos||[]).map(p=>p.original)));
const dom=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{url:'https://example.test/#catalog',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;w.fetch=async()=>({ok:true,json:async()=>data});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.Image=class {set src(v){setTimeout(()=>this.onload?.(),0)}decode(){return Promise.resolve()}};
const pause=()=>new Promise(r=>setTimeout(r,35));
w.eval(fs.readFileSync(root+'app.js','utf8'));
(async()=>{
 await pause();
 for(const book of members){
  const card=d.querySelector(`[data-book="${book.id}"] img`);assert(card);assert(card.alt.includes('所属套装实拍'));assert.equal(card.dataset.original,group.photos[0].original);
  w.location.hash='book/'+book.id;await pause();
  assert.equal(d.querySelectorAll('#detail-page [data-side]').length,3);assert(d.querySelector('#detail-photo').alt.includes('套装正面'));assert(d.querySelector('.full-bibliography').textContent.includes('同款套装参考定价'));assert(!d.querySelector('.full-bibliography').textContent.includes('封底定价'));
  d.querySelector('[data-side="spines"]').click();await pause();assert.equal(d.querySelector('#detail-photo').dataset.original,group.photos[1].original);assert(d.querySelector('#detail-photo').alt.includes('整套书脊'));
 }
 w.location.hash='about';await pause();assert(d.querySelector('#about-page').textContent.includes(String(originals.size)));assert(members.every(b=>b.photos.length===0),'runtime must not mutate catalogue');
 const price=data.priceGroups.find(g=>g.id===members[0].priceGroupId);assert.equal(price.amount,628);assert.equal(price.bookIds.length,7);assert(members.every(b=>b.listPrice===null));
 console.log('PASS: seven physical records share three photographs, honest labels, working photo switches, unique image count and one set price; raw catalogue remains unchanged.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
