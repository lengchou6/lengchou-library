const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=require('path').resolve(__dirname,'../dist')+'/',data=JSON.parse(fs.readFileSync(root+'data/books.json'));
const dom=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{url:'https://example.test/#themes',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;w.fetch=async()=>({ok:true,json:async()=>data});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.Image=class{set src(v){setTimeout(()=>this.onload?.(),0)}decode(){return Promise.resolve()}};
const pause=(ms=30)=>new Promise(r=>setTimeout(r,ms));
w.eval(fs.readFileSync(root+'explore.js','utf8'));w.eval(fs.readFileSync(root+'app.js','utf8'));
const route=async hash=>{w.location.hash=hash;await pause();};
(async()=>{
 await pause();assert(!d.querySelector('#themes-page').hidden);assert.equal(d.querySelectorAll('.theme-card').length,6);
 for(const link of [...d.querySelectorAll('.theme-card')]){await route(link.hash);assert(d.querySelectorAll('#themes-page .discovery-book').length>0);for(const a of d.querySelectorAll('#themes-page .discovery-book'))assert(data.books.some(b=>a.hash==='#book/'+b.id));}
 await route('#map');assert.equal(d.querySelectorAll('.map-station').length,4);
 for(const b of [...d.querySelectorAll('[data-route]')]){await route('#map/'+b.dataset.route);assert.equal(d.querySelectorAll('.map-station').length,4);d.querySelector('[data-station="2"]').click();assert.equal(d.querySelector('[data-station="2"]').getAttribute('aria-pressed'),'true');assert(d.querySelector('#map-connection').textContent.length>40);}
 await route('#book/LC-000079');assert(d.querySelector('#book-connections a[href="#book/LC-000095"]'));assert(d.querySelector('#book-connections a[href="#themes/world"]'));
 await route('#history');const days=[...d.querySelector('#snapshot-date').options].map(o=>o.value);assert(days.length>1);
 for(const date of [days[0],days.at(-1)]){await route('#history/'+date);const expected=data.books.filter(b=>b.accessionedAt.slice(0,10)<=date).reduce((n,b)=>n+(b.volumeCount||1),0);assert(d.querySelector('.snapshot-summary h2').textContent.includes(String(expected)));d.querySelector('[data-history-view="all"]').click();assert.equal(d.querySelectorAll('.history-books .discovery-book').length,data.books.filter(b=>b.accessionedAt.slice(0,10)<=date).length);}
 await route('#catalog');d.querySelector('.bird-perch').click();assert(!d.querySelector('.bird-panel').hidden);d.querySelector('[data-bird-hide]').click();assert(d.querySelector('#library-bird').hidden);d.querySelector('#bird-return').click();assert(!d.querySelector('#library-bird').hidden);d.querySelector('[data-bird-random]').click();await pause();assert(w.location.hash.startsWith('#book/'));assert(!d.querySelector('#detail-page').hidden);
 await route('#catalog');d.querySelector('#search').value='绝对不在书阁里的测试关键词';d.querySelector('#search').dispatchEvent(new w.Event('input'));await pause(200);assert(d.querySelector('#library-bird').classList.contains('bird-curious'));assert(d.querySelector('#bird-says').textContent.includes('换个关键词'));
 assert.equal(data.books.reduce((n,b)=>n+(b.volumeCount||1),0),300);console.log('PASS: 主题书架与全部书目链接、五条关联路线、详情关联、历史快照册数、玄凤显隐与随机翻书、搜索空结果。');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
