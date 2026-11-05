// Purchase totals belong to orders/sets; cover prices keep their original currencies.
const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=require('path').resolve(__dirname,'../dist')+'/',data=JSON.parse(fs.readFileSync(root+'data/books.json'));
const groups=data.purchaseGroups || [],books=new Map(data.books.map(b=>[b.id,b])),members=new Set();
for(const g of groups){
  assert(Number.isFinite(g.amount) && g.amount>=0);assert(data.exchangeRates.rates[g.currency]);
  assert(g.bookIds.length>1 && new Set(g.bookIds).size===g.bookIds.length);
  assert.equal(g.volumeCount,g.bookIds.reduce((n,id)=>n+(books.get(id).volumeCount || 1),0));
  for(const id of g.bookIds){assert(!members.has(id));members.add(id);const b=books.get(id);assert.equal(b.purchaseGroupId,g.id);assert.equal(b.paidPrice,null);assert.equal(b.purchaseChannel,g.channel);}
}
for(const b of data.books){if(b.purchaseGroupId)assert(groups.some(g=>g.id===b.purchaseGroupId && g.bookIds.includes(b.id)));if(b.paidPrice!=null){assert(Number.isFinite(b.paidPrice) && b.paidPrice>=0);assert(data.exchangeRates.rates[b.paidCurrency || b.currency]);}}
const dom=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{url:'https://example.test/#catalog',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;w.fetch=async()=>({ok:true,json:async()=>data});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.Image=class{set src(v){setTimeout(()=>this.onload?.(),0)}decode(){return Promise.resolve()}};
const pause=(ms=20)=>new Promise(r=>setTimeout(r,ms));
const field=label=>[...d.querySelectorAll('.metadata-grid dt')].find(e=>e.textContent===label)?.nextElementSibling?.textContent;
w.eval(fs.readFileSync(root+'app.js','utf8'));
(async()=>{
 await pause();assert.equal(d.querySelector('#summary').textContent,`共 ${data.books.reduce((n,b)=>n+(b.volumeCount||1),0)} 册`);
 for(const g of groups){for(const id of [g.bookIds[0],g.bookIds.at(-1)]){w.location.hash='book/'+id;await pause();assert(field('实付价格').includes(g.amount.toFixed(2)));assert(field('实付价格').includes(g.label));assert.equal(field('购买渠道'),g.channel);}}
 for(const id of ['LC-000017','LC-000072','LC-000073']){w.location.hash='book/'+id;await pause();assert(field('实付价格').includes('¥'));assert(!field('实付价格').includes('US$'));assert(!field('实付价格').includes('£'));assert(!field('实付价格').includes('€'));}
 w.location.hash='book/LC-000017';await pause();assert(field('封底定价').includes('US$49.99'));
 w.location.hash='book/LC-000072';await pause();assert(field('封底定价').includes('£14.99'));
 // Use an isolated fixture so this case remains testable when every real book is priced.
 const unknownData=JSON.parse(JSON.stringify(data)),unknown=unknownData.books.find(b=>!b.purchaseGroupId);
 assert(unknown,'需要一个非合购书目作为缺价测试样本');unknown.paidPrice=null;
 const unknownDom=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{url:'https://example.test/#book/'+unknown.id,runScripts:'outside-only',pretendToBeVisual:true});
 const uw=unknownDom.window;uw.fetch=async()=>({ok:true,json:async()=>unknownData});uw.scrollTo=()=>{};uw.HTMLElement.prototype.scrollIntoView=()=>{};
 uw.Image=class{set src(v){setTimeout(()=>this.onload?.(),0)}decode(){return Promise.resolve()}};
 try{uw.eval(fs.readFileSync(root+'app.js','utf8'));await pause();assert(uw.document.querySelector('.metadata-grid'),'缺价书目的详情应正常加载');assert(![...uw.document.querySelectorAll('.metadata-grid dt')].some(e=>e.textContent==='实付价格'));}finally{uw.close();}
 w.location.hash='about';await pause();const amount=groups.reduce((n,g)=>n+g.amount,0)+data.books.filter(b=>!b.purchaseGroupId&&b.paidPrice!=null).reduce((n,b)=>n+b.paidPrice,0);const count=groups.length+data.books.filter(b=>!b.purchaseGroupId&&b.paidPrice!=null).length;
 assert(d.querySelector('#about-page').textContent.includes(`已记录 ${count} 笔购买`));assert(d.querySelector('#about-page').textContent.includes('¥'+amount.toFixed(2)));
 console.log('PASS: 套装购买金额不重复记入各册；人民币实付与外币封底定价分开；渠道、未知价格及购买合计显示正确。');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
