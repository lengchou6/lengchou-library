const fs=require('fs'),assert=require('assert');const {JSDOM}=require('jsdom');
const root=require('path').resolve(__dirname,'../dist')+'/';const data=JSON.parse(fs.readFileSync(root+'data/books.json'));
const dom=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{url:'https://example.test/#catalog',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;w.fetch=async(url,opts)=>{assert.equal(opts.cache,'no-cache');return{ok:true,json:async()=>data}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
w.eval(fs.readFileSync(root+'app.js','utf8'));
(async()=>{
 await pause(20);const img=d.querySelector('.cover-image'),source='https://example.test/assets/test-large.webp';Object.defineProperty(img,'currentSrc',{value:source,configurable:true});
 assert(img.srcset);img.dispatchEvent(new w.Event('error'));assert(d.querySelector('#image-errors').hidden);await pause(340);
 assert(!img.hasAttribute('srcset'));assert.equal(new URL(img.src).pathname,'/assets/test-large.webp');assert(new URL(img.src).searchParams.has('reload'));
 img.dispatchEvent(new w.Event('error'));await pause(1050);assert.equal(new URL(img.src).pathname,'/'+img.dataset.original);assert(d.querySelector('#image-errors').hidden);
 img.dispatchEvent(new w.Event('error'));assert(!d.querySelector('#image-errors').hidden);assert.equal(d.querySelector('#image-error-message').textContent,'1 张图片未能加载');
 const failed=img.src;d.querySelector('#retry-images').click();await pause(20);assert.notEqual(img.src,failed);assert.equal(new URL(img.src).pathname,'/assets/test-large.webp');
 img.dispatchEvent(new w.Event('load'));assert(d.querySelector('#image-errors').hidden);assert(!img.classList.contains('image-failed'));
 img.dispatchEvent(new w.Event('error'));const before=img.src;img.dispatchEvent(new w.Event('load'));await pause(340);assert.equal(img.src,before,'successful load cancels pending retry');
 d.querySelector('#lightbox-image').dispatchEvent(new w.Event('error'));assert(d.querySelector('#image-errors').hidden,'empty viewer is not an image failure');
 for(const owner of [...data.books,...data.seriesGroups])for(const p of owner.photos||[])for(const kind of ['thumbnail','preview'])if(p[kind]){const original=root+p[kind],legacy=root+p.original.replace(/[^/]+$/,p.side+'-'+kind+'-v1.webp');assert(fs.existsSync(legacy),legacy);assert(fs.readFileSync(legacy).equals(fs.readFileSync(original)),legacy)}
 console.log('PASS: responsive URL actually retried; original fallback; bounded recovery; persistent error visible; manual retry makes fresh request; load cancels stale retry; empty viewer ignored; every v1 alias preserved.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
