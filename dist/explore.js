'use strict';
(() => {
  const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const id=n=>'LC-'+String(n).padStart(6,'0'), range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
  let books=[],byId=new Map(),ready=false;
  const count=bs=>bs.reduce((n,b)=>n+(b.volumeCount||1),0), title=b=>b.title+(b.subtitle?'：'+b.subtitle:'');
  const original=b=>b.photos.find(p=>p.side==='front')?.original||b.photos[0]?.original||'';
  const cover=b=>b.photos.find(p=>p.side==='front')?.thumbnail||b.photos[0]?.preview||b.photos[0]?.original||'';
  const themes=[
    {key:'world',name:'造一座世界',note:'神话、异兽与想象中的疆域',color:'#5c786b',ids:[17,18,19,20,21,42,56,74,75,79,80,95,98,99,100,101,...range(33,39)],lead:[79,98,17]},
    {key:'story',name:'叙事工坊',note:'人物、冲突、对白与镜头',color:'#926b56',ids:[2,15,24,25,26,66,68,69,70,83,91,95,245],lead:[26,2,83]},
    {key:'play',name:'游戏的骨架',note:'从游玩体验到机制、关卡与数值',color:'#647c88',ids:[...range(4,13),16,22,57,63,64,65,67,84,85,86,87,90,92,93,94,96],lead:[90,85,94]},
    {key:'jianghu',name:'江湖夜雨',note:'金庸、古龙、蜀山与江湖旧事',color:'#897049',ids:[97,...range(43,46),...range(191,243),...range(255,300)],lead:[285,198,255]},
    {key:'future',name:'未来来信',note:'宇宙、时间与人的边界',color:'#6d718b',ids:[23,28,...range(33,39),82,88,111,112,113,140,141,244],lead:[111,244,82]},
    {key:'human',name:'人间与文明',note:'从历史社会，到日常生活与人的处境',color:'#887468',ids:[1,3,14,40,41,58,59,60,61,62,71,75,76,77,78,81,89,102,103,104,105,106,107,108,109,110,115,116,118,119,122,123,124,125,126,137,138,150,151,152,156,157,158,159,160,161,162,163,164,165,166,246,...range(167,175)],lead:[58,109,246]}
  ];
  const paths=[
    {key:'myth',name:'神话如何成为人物',intro:'把神话材料、英雄结构与人物塑造放在一条线上。',nodes:[79,95,2,91],edges:['从神话材料看向英雄叙事的结构。','从英雄结构转向不同人物原型。','将人物模型带入游戏剧本与角色创作。']},
    {key:'story',name:'故事如何走上银幕',intro:'沿着故事、情节、语言和画面，观察叙事的不同层次。',nodes:[26,66,25,83],edges:['从整体结构进一步看情节、悬念与冲突。','人物之间的冲突也通过对白展开。','从语言表达走向镜头中的视觉表达。']},
    {key:'world',name:'从传说走进奇幻世界',intro:'将神话、奇幻作品和世界创造工具相互参照。',nodes:[56,74,17,98],edges:['并置神话传统与奇幻小说，比较各自的想象。','从奇幻作品转向可参与的角色与规则。','再从规则书看游戏世界的创造方法。']},
    {key:'rules',name:'游戏怎样变得可玩',intro:'连接机制、空间、战斗与数据，换几个角度看设计。',nodes:[85,86,94,96],edges:['机制需要在关卡空间中被玩家体验。','从关卡中的挑战转向战斗与数值。','用数据分析为设计判断补充反馈。']},
    {key:'future',name:'宇宙之外，仍然是人',intro:'从太空想象走向文明尺度，再回到人的身份问题。',nodes:[244,111,82,88],edges:['并置两种关于宇宙与文明的科幻想象。','从文明尺度切回个体的身份与边界。','同一作者的不同作品，可比较其问题意识。']}
  ];
  function items(theme){return theme.ids.map(n=>byId.get(id(n))).filter(Boolean);}
  function mini(b){return `<a class="discovery-book" href="#book/${b.id}"><span class="discovery-cover"><img data-original="${esc(original(b))}" src="${esc(cover(b))}" alt="${esc(title(b))}封面" loading="lazy"></span><span><strong>${esc(title(b))}</strong><small>${esc(b.authors.map(a=>a.name).join('、'))}</small></span></a>`;}
  function head(kicker,name,description){return `<header class="discovery-heading"><p class="eyebrow">${kicker}</p><h1>${name}</h1><p>${description}</p></header>`;}
  function renderThemes(key){
    const page=$('#themes-page'),selected=themes.find(t=>t.key===key);
    if(!selected){
      page.innerHTML=head('主题书架','换个角度，遇见一本书。','按题材与内容整理的专题；一本书也可以出现在不同书架。')+`<div class="theme-grid">${themes.map(t=>`<a class="theme-card" style="--theme:${t.color}" href="#themes/${t.key}"><span class="theme-art" aria-hidden="true">${t.lead.map(n=>{const b=byId.get(id(n));return b?`<img data-original="${esc(original(b))}" src="${esc(cover(b))}" alt="" loading="lazy">`:'';}).join('')}</span><span class="theme-card-copy"><small>${count(items(t))} 册</small><h2>${t.name}</h2><p>${t.note}</p><span class="theme-open">走进书架 <span aria-hidden="true">↗</span></span></span></a>`).join('')}</div>`;
      return;
    }
    const bs=items(selected);
    page.innerHTML=`<a class="back-link" href="#themes">← 全部主题</a>`+head('主题书架',selected.name,selected.note)+`<div class="discovery-subhead"><p>本架 ${count(bs)} 册</p><a href="#map">看看书与书的联系 ↗</a></div><div class="discovery-books">${bs.map(mini).join('')}</div>`;
  }
  function renderMap(key='myth',node=0){
    const p=paths.find(p=>p.key===key)||paths[0];node=Math.max(0,Math.min(node,p.nodes.length-1));
    const page=$('#map-page');
    page.innerHTML=head('书间地图','一本书，通往另一本。','按内容整理的关联路线，可从任意一本开始；不是必读顺序。')+`<div class="route-tabs" role="group" aria-label="选择关联路线">${paths.map(x=>`<button type="button" data-route="${x.key}" aria-pressed="${p.key===x.key}">${x.name}</button>`).join('')}</div><section class="map-canvas" aria-label="${p.name}"><header><h2>${p.name}</h2><p>${p.intro}</p></header><ol class="map-track">${p.nodes.map((n,i)=>{const b=byId.get(id(n));return `<li><button class="map-station" data-station="${i}" aria-pressed="${node===i}"><span class="station-dot" aria-hidden="true"></span><img data-original="${esc(original(b))}" src="${esc(cover(b))}" alt="" loading="lazy"><strong>${esc(title(b))}</strong><small>${esc(b.authors.map(a=>a.name).join('、'))}</small></button></li>`;}).join('')}</ol><div id="map-connection" class="map-connection"><div><p class="eyebrow">${node===p.nodes.length-1?'回看这条联系':'从这里，再往前一步'}</p><h3>${esc(byId.get(id(p.nodes[node])).title)}</h3><a class="text-link" href="#book/${id(p.nodes[node])}">查看这本书 ↗</a></div><div><p>${esc(p.edges[Math.min(node,p.edges.length-1)])}</p>${node<p.nodes.length-1?`<button class="text-link" data-next-station="${node+1}">下一站：${esc(byId.get(id(p.nodes[node+1])).title)} →</button>`:`<button class="text-link" data-next-station="0">回到路线起点 →</button>`}</div></div></section>`;
    page.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>{location.hash='map/'+b.dataset.route;}));
    page.querySelectorAll('[data-station],[data-next-station]').forEach(b=>b.addEventListener('click',()=>{renderMap(p.key,Number(b.dataset.station??b.dataset.nextStation));page.querySelector(`[data-station="${b.dataset.station??b.dataset.nextStation}"]`)?.focus({preventScroll:true});}));
  }
  function renderHistory(selectedDate){
    const days=[...new Set(books.map(b=>b.accessionedAt?.slice(0,10)).filter(Boolean))].sort();
    const cutoff=days.includes(selectedDate)?selectedDate:days.at(-1),index=days.indexOf(cutoff),snapshot=books.filter(b=>b.accessionedAt?.slice(0,10)<=cutoff),newBooks=snapshot.filter(b=>b.accessionedAt.slice(0,10)===cutoff);
    const categories=[...new Set(books.map(b=>b.category))],page=$('#history-page');
    page.innerHTML=head('书阁时光','回到书架生长的那一天。','依据已有入库时间回看目录；这里记录的是编目足迹，不是购买时间或阅读进度。')+`<div class="history-control"><label for="snapshot-date">回看日期</label><select id="snapshot-date">${days.map(d=>`<option value="${d}" ${d===cutoff?'selected':''}>${d.replaceAll('-','.')} · 累计 ${count(books.filter(b=>b.accessionedAt.slice(0,10)<=d))} 册</option>`).join('')}</select><div><button type="button" data-day-step="-1" ${index===0?'disabled':''} aria-label="上一个入库日期">←</button><button type="button" data-day-step="1" ${index===days.length-1?'disabled':''} aria-label="下一个入库日期">→</button></div></div><section class="snapshot-summary"><div><span class="snapshot-date">${cutoff.replaceAll('-','.')}</span><h2>那时，书阁里有 <strong>${count(snapshot)}</strong> 册。</h2><p>当天入库 ${count(newBooks)} 册 · 共 ${days.length} 个入库日期可回看</p></div><div class="snapshot-bars" aria-label="当时的分类构成">${categories.map(c=>{const n=count(snapshot.filter(b=>b.category===c));return `<div><span>${esc(c)}</span><span class="snapshot-bar" aria-hidden="true"><i style="width:${n/count(snapshot)*100}%"></i></span><strong>${n}</strong></div>`;}).join('')}</div></section><div class="history-tabs" role="group" aria-label="回看范围"><button type="button" data-history-view="new" aria-pressed="true">当天入库</button><button type="button" data-history-view="all" aria-pressed="false">当时全部藏书</button><a href="#timeline">完整入库记录 ↗</a></div><p class="history-result" aria-live="polite">当天入库 ${count(newBooks)} 册</p><div class="discovery-books history-books">${newBooks.map(mini).join('')}</div>`;
    $('#snapshot-date').addEventListener('change',e=>location.hash='history/'+e.target.value);
    page.querySelectorAll('[data-day-step]').forEach(b=>b.addEventListener('click',()=>location.hash='history/'+days[index+Number(b.dataset.dayStep)]));
    page.querySelectorAll('[data-history-view]').forEach(b=>b.addEventListener('click',()=>{const all=b.dataset.historyView==='all';page.querySelectorAll('[data-history-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('.history-books').innerHTML=(all?snapshot:newBooks).map(mini).join('');$('.history-result').textContent=(all?'当时全部藏书 ':'当天入库 ')+count(all?snapshot:newBooks)+' 册';}));
  }
  function related(book){
    document.querySelector('#book-connections')?.remove();
    const links=[];
    for(const p of paths){const index=p.nodes.indexOf(Number(book.id.slice(3)));if(index<0)continue;for(const j of [index-1,index+1])if(j>=0&&j<p.nodes.length){const b=byId.get(id(p.nodes[j]));if(!links.some(x=>x.b.id===b.id))links.push({b,reason:p.edges[Math.min(index,j)]});}}
    const ts=themes.filter(t=>t.ids.includes(Number(book.id.slice(3))));if(!links.length&&!ts.length)return;
    const panel=document.createElement('section');panel.id='book-connections';panel.className='book-connections';panel.innerHTML=`<h2>书与书之间</h2>${links.length?`<div class="related-books">${links.slice(0,3).map(x=>`<article>${mini(x.b)}<p>${esc(x.reason)}</p></article>`).join('')}</div>`:''}${ts.length?`<div class="book-theme-links"><span>也在这些书架上</span>${ts.map(t=>`<a href="#themes/${t.key}">${t.name} ↗</a>`).join('')}</div>`:''}<a class="text-link" href="#map">展开书间地图 →</a>`;$('#detail-page').append(panel);
  }
  const birdSvg=`<svg class="bird-drawing" viewBox="0 0 90 100" aria-hidden="true"><path class="bird-tail" d="M37 65 24 96 45 79" fill="#778581"/><path d="M31 68 29 80M47 69 48 80" stroke="#9c8271" stroke-width="3"/><path d="M19 81h45" stroke="#b7b4a6" stroke-width="2" stroke-linecap="round"/><ellipse cx="39" cy="53" rx="21" ry="27" fill="#7d8983"/><path d="M22 46Q6 56 26 72L38 52" fill="#e9e8db"/><g class="bird-head"><path d="M38 25Q30 8 19 7L35 13 38 1 45 23" fill="#c9bb73"/><path d="M20 33Q20 14 39 15 63 14 63 34 64 51 45 51 24 50 20 33" fill="#ddd194"/><path d="M61 29Q75 31 62 43Z" fill="#5e6967"/><circle class="bird-eye" cx="49" cy="29" r="3.6" fill="#283b3b"/><circle cx="50" cy="28" r="1" fill="#fff"/><circle cx="36" cy="39" r="7" fill="#c98960"/></g></svg>`;
  function setupBird(){
    const host=document.createElement('aside');host.id='library-bird';host.setAttribute('aria-label','书阁玄凤');
    let hidden=false;try{hidden=localStorage.getItem('library-bird-hidden')==='true';}catch{}
    $('#bird-return').innerHTML=birdSvg;
    host.hidden=hidden;host.innerHTML=`<div class="bird-panel" hidden><p id="bird-says" role="status">书都在这里，随便翻翻。</p><div><button type="button" data-bird-random>替我挑一本 ↗</button><button type="button" data-bird-hide>收起</button></div></div><button type="button" class="bird-perch" aria-label="和玄凤打个招呼" aria-expanded="false">${birdSvg}</button>`;document.body.append(host);
    const toggle=()=>{const panel=host.querySelector('.bird-panel');panel.hidden=!panel.hidden;host.querySelector('.bird-perch').setAttribute('aria-expanded',String(!panel.hidden));host.classList.remove('bird-hello');void host.offsetWidth;host.classList.add('bird-hello');};
    host.querySelector('.bird-perch').addEventListener('click',toggle);
    host.querySelector('[data-bird-hide]').addEventListener('click',()=>{host.hidden=true;try{localStorage.setItem('library-bird-hidden','true');}catch{}$('#bird-return').focus();});
    host.querySelector('[data-bird-random]').addEventListener('click',()=>{if(!books.length)return;const b=books[Math.floor(Math.random()*books.length)];location.hash='book/'+b.id;host.querySelector('.bird-panel').hidden=true;host.querySelector('.bird-perch').setAttribute('aria-expanded','false');});
    $('#bird-return').addEventListener('click',()=>{host.hidden=false;try{localStorage.removeItem('library-bird-hidden');}catch{}host.querySelector('.bird-panel').hidden=true;toggle();host.querySelector('.bird-perch').focus();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){host.querySelector('.bird-panel').hidden=true;host.querySelector('.bird-perch').setAttribute('aria-expanded','false');}});
    document.addEventListener('library-catalog',e=>{host.classList.toggle('bird-curious',e.detail.empty);$('#bird-says').textContent=e.detail.empty?'这本暂时没找到，换个关键词试试？':'书都在这里，随便翻翻。';if(e.detail.empty&&!host.hidden){host.querySelector('.bird-panel').hidden=false;host.querySelector('.bird-perch').setAttribute('aria-expanded','true');}});
  }
  document.addEventListener('library-ready',e=>{books=e.detail.books;byId=new Map(books.map(b=>[b.id,b]));ready=true;setupBird();});
  document.addEventListener('library-explore-route',e=>{if(!ready)return;const [page,key]=e.detail.hash.split('/');if(page==='themes')renderThemes(key);if(page==='map')renderMap(key);if(page==='history')renderHistory(key);});
  document.addEventListener('library-detail',e=>{if(ready)related(e.detail.book);});
})();
