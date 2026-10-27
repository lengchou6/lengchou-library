'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const blank = '<span class="unfilled">未填写</span>';
  const money = (value, currency='CNY') => value == null ? blank : `${({CNY:'¥',USD:'US$',GBP:'£',EUR:'€'})[currency] || currency+' '}${Number(value).toFixed(2)}`;
  let exchangeRates = {rates:{CNY:1}};
  let priceGroups=[];
  const priceGroup = book => priceGroups.find(g=>g.id===book.priceGroupId);
  const priceAmount = book => book.listPrice ?? priceGroup(book)?.amount ?? null;
  const converted = book => priceAmount(book)==null || exchangeRates.rates[book.currency || 'CNY']==null ? null : priceAmount(book)*exchangeRates.rates[book.currency || 'CNY'];
  const sumCny = items => {const seen=new Set();return items.reduce((sum,b)=>{const key=b.priceGroupId || b.id;if(seen.has(key))return sum;seen.add(key);return sum+(converted(b) ?? 0);},0);};
  const priceText = book => priceAmount(book)==null ? '未填写' : money(priceAmount(book),book.currency)+(book.priceGroupId?`（全 ${priceGroup(book).bookIds.length} 册合价，仅计一次）`:'')+(book.currency && book.currency!=='CNY' ? (converted(book)==null?' · 暂无折算汇率':` · 约 ${money(converted(book))}`) : '');
  const isForeign=book=>book.language && !book.language.startsWith('zh');
  const titleAttrs = book => isForeign(book) ? ` class="foreign-title" lang="${esc(book.language)}"` : '';
  const secondaryTitle = book => book.referenceTitle ? book.referenceTitle : book.subtitle || '　';
  const rateNote = () => `参考汇率：${esc(exchangeRates.date || '')} · ${Object.entries(exchangeRates.rates).filter(([code])=>code!=='CNY').map(([code,rate])=>`1 ${esc(code)} = ${esc(rate)} CNY`).join('，')}；<a href="${esc(exchangeRates.sourceUrl)}" target="_blank" rel="noopener">${esc(exchangeRates.source)}</a>。固定折算，手动更新；非实际购书支出。`;
  const date = value => value ? value.slice(0, 10).replaceAll('-', '.') : '';
  const datetime = value => value ? `${date(value)} ${value.match(/T(\d{2}:\d{2}(?::\d{2})?)/)?.[1] || ''}` : '';
  const photoCount = () => books.reduce((n,b)=>n+b.photos.length,0)+seriesGroups.reduce((n,g)=>n+(g.photos || []).length,0);
  const authorLine = book => book.authors.map(a => `${a.country ? `［${a.country}］` : ''}${a.name}${isForeign(book) && a.originalName?' / '+a.originalName:''}`).join('、');
  const fullTitle = book => `${book.title}${book.subtitle ? `${/[！!？?：:]$/.test(book.title)?'':'：'}${book.subtitle}` : ''}`;
  const imagePath = (book, side='front', size='thumbnail') => {
    const photo = book.photos.find(p => p.side === side);
    return photo ? (size==='original' ? photo.original : photo[size] || photo.preview || photo.original) : '';
  };
  let categoryOrder = [], seriesGroups = [], seriesFilter = 'all';
  let books = [], category = '全部', activeBook = null, side = 'front', zoom = 1;
  let lastCatalogFocus = null, catalogScroll = 0, currentPage = null, bookSequence = [];
  let suppressPhotoClick = false, viewerSource=null, viewerSide=null, viewerReturnFocus=null;
  let cardIndex=0;
  const cardCache=new Map(), searchIndex=new Map();
  const previewLoads=new Map();let photoRequest=0, searchTimer, composing=false, renderedColumns=0;
  const columnCount=()=>innerWidth>=1360?5:innerWidth>=1040?4:innerWidth>=720?3:2;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const dialog = $('#photo-dialog');
  const pages = ['catalog','detail','timeline','about'];
  function setPage(name) {
    pages.forEach(p => { $(`#${p}-page`).hidden = p !== name; });
    syncImageErrors();
    document.querySelectorAll('[data-nav]').forEach(a => {
      if(a.dataset.nav === (name === 'detail' ? 'catalog' : name)) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
  }
  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.hidden = false;
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 2600);
  }
  function categories() {
    $('#categories').innerHTML = ['全部', ...new Set([...categoryOrder,...books.map(b=>b.category)].filter(c=>books.some(b=>b.category===c)))].map(c => `<button type="button" class="category-button" data-category="${esc(c)}" aria-pressed="${category === c}">${esc(c)}<span>${c === '全部' ? books.length : books.filter(b=>b.category===c).length}</span></button>`).join('');
    $('#categories').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      category = btn.dataset.category; categories(); renderCollection();
      $('#categories').querySelectorAll('button').forEach(b=>{if(b.dataset.category===category)b.focus();});
    }));
  }
  function readQuery(){
    const params=new URL(location.href).searchParams;
    category=books.some(b=>b.category===params.get('category'))?params.get('category'):'全部';
    seriesFilter=seriesGroups.some(g=>g.id===params.get('series'))?params.get('series'):'all';
    $('#search').value=params.get('q') || '';
    $('#sort').value=['title','accession-desc'].includes(params.get('sort'))?params.get('sort'):'series';
  }
  function writeQuery(){
    const url=new URL(location.href);
    for(const [key,value] of Object.entries({category:category==='全部'?'':category,series:seriesFilter==='all'?'':seriesFilter,q:$('#search').value.trim(),sort:$('#sort').value==='series'?'':$('#sort').value})){
      if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);
    }
    if(url.href!==location.href)history.replaceState(null,'',url.href);
  }
  function visibleBooks() {
    const q=$('#search').value.trim().toLocaleLowerCase(),compact=q.replace(/[\s-]/g,'');
    const result=books.filter(b=>{
      const text=searchIndex.get(b.id);
      return (category==='全部'||b.category===category) && (seriesFilter==='all'||b.seriesGroupId===seriesFilter) && (!q||text.normal.includes(q)||text.compact.includes(compact));
    });
    const sort=$('#sort').value;
    const shelfOrder=b=>b.seriesGroupId?'series-'+String(seriesGroups.findIndex(g=>g.id===b.seriesGroupId)).padStart(3,'0'):'single-'+b.id;
    result.sort((a,b)=>sort==='title'?fullTitle(a).localeCompare(fullTitle(b),'zh-Hans-CN-u-co-pinyin'):sort==='accession-desc'?b.accessionedAt.localeCompare(a.accessionedAt):shelfOrder(a).localeCompare(shelfOrder(b)) || (a.seriesNumber??0)-(b.seriesNumber??0));
    return result;
  }
  const coverSizes='(min-width: 1360px) 240px, (min-width: 1040px) 250px, (min-width: 720px) 28vw, 44vw';
  function responsivePhoto(photo){
    return photo?.sources?.length?` srcset="${photo.sources.map(item=>`${esc(item.path)} ${item.width}w`).join(', ')}" sizes="${coverSizes}"`:'';
  }
  function bookCard(b) {
    if(cardCache.has(b.id))return cardCache.get(b.id);
    const node=document.createElement('a'), index=cardIndex++;
    node.className='book-card';node.href='#book/'+encodeURIComponent(b.id);node.dataset.book=b.id;node.setAttribute('aria-label','查看'+fullTitle(b));
    node.innerHTML=`<div class="cover-stage"><img decoding="async" class="cover-image" data-original="${esc(imagePath(b,'front','original'))}" src="${esc(imagePath(b))}"${responsivePhoto(b.photos.find(p=>p.side==='front'))} alt="${esc(fullTitle(b))}实体书正面" width="${b.photos[0].width||400}" height="${b.photos[0].height||580}" loading="${index<5?'eager':'lazy'}" fetchpriority="${index===0?'high':'auto'}"></div><div class="book-card-info"><h3${titleAttrs(b)}>${esc(b.title)}${b.subtitle?`<span class="title-secondary">${/[！!？?：:]$/.test(b.title)?'':'：'}${esc(b.subtitle)}</span>`:''}</h3>${b.authors.length?`<p class="book-author">${esc(authorLine(b))}</p>`:''}</div>`;
    cardCache.set(b.id,node);return node;
  }
  function resetFilterValues(){category='全部';seriesFilter='all';$('#search').value='';}
  function renderActiveFilters(){
    const chips=[];
    if(category!=='全部')chips.push(['category','类别：'+category]);
    if(seriesFilter!=='all')chips.push(['series','系列：'+(seriesGroups.find(g=>g.id===seriesFilter)?.shortTitle || '单册藏书')]);
    if($('#search').value.trim())chips.push(['search','搜索：'+$('#search').value.trim()]);
    const panel=$('#active-filters');panel.hidden=!chips.length;
    panel.innerHTML=chips.map(([key,label])=>`<button type="button" data-clear-filter="${key}" aria-label="取消${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('');
    panel.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
      const key=button.dataset.clearFilter;
      if(key==='category')category='全部';
      if(key==='series')seriesFilter='all';
      if(key==='search')$('#search').value='';
      categories();renderCollection();
      const next=$('#active-filters button');(next || $('#search')).focus({preventScroll:true});
    }));
  }
  function renderCollection() {
    clearTimeout(searchTimer);writeQuery();renderActiveFilters();const result=visibleBooks();
    const filtered=category!=='全部'||seriesFilter!=='all'||Boolean($('#search').value.trim());
    $('#results-status').hidden=!filtered;$('#results-status').textContent=`找到 ${result.length} 册`;
    const focusedBook=document.activeElement?.closest('.book-card')?.dataset.book;
    const container=$('#collection');container.setAttribute('aria-busy','false');
    bookSequence=[];renderedColumns=columnCount();
    const fragment=document.createDocumentFragment();
    if(!result.length){
      container.innerHTML='<div class="empty-state"><h2>还没有找到这本书</h2><p>试试其他关键词，或查看全部藏书。</p><button type="button" class="primary-button" id="clear-filters">清除筛选</button></div>';
      $('#clear-filters').addEventListener('click',()=>{resetFilterValues();categories();renderCollection();$('#search').focus();});return;
    }
    const groups=$('#sort').value==='series'?[...new Set([...categoryOrder,...result.map(b=>b.category)])].map(title=>({title,items:result.filter(b=>b.category===title)})):[{title:'',items:result}];
    for(const group of groups.filter(g=>g.items.length)){
      const section=document.createElement('section');section.className='category-shelf';
      if(group.title){const heading=document.createElement('h2');heading.className='shelf-heading';heading.textContent=group.title;const count=document.createElement('small');count.textContent=group.items.length+' 册';heading.append(count);section.append(heading);}
      const selected=seriesGroups.find(g=>g.id===seriesFilter);
      if(selected?.photos?.length){const panel=document.createElement('div');panel.innerHTML=seriesPhotos(selected);section.append(panel);}
      let row;group.items.forEach((book,index)=>{
        if(index%renderedColumns===0){row=document.createElement('div');row.className='shelf-row';section.append(row);}
        const item=document.createElement('article');item.className='shelf-item';
        if($('#sort').value==='series' && book.seriesGroupId!==group.items[index-1]?.seriesGroupId && book.seriesGroupId){
          const series=seriesGroups.find(g=>g.id===book.seriesGroupId),button=document.createElement('button');button.type='button';button.className='series-marker';button.dataset.openSeries=series.id;button.textContent=series.shortTitle;button.setAttribute('aria-label','查看'+series.title);item.append(button);
        }
        item.append(bookCard(book));row.append(item);bookSequence.push(book.id);
      });fragment.append(section);
    }
    container.replaceChildren(fragment);syncImageErrors();
    if(focusedBook)cardCache.get(focusedBook)?.focus({preventScroll:true});
  }
  $('#collection').addEventListener('click',event=>{
    const button=event.target.closest('[data-open-series]');
    if(button){seriesFilter=button.dataset.openSeries;renderCollection();$('#collection').scrollIntoView({block:'start'});}
  });
  function seriesPhotos(group){
    if(!group?.photos?.length)return '';
    return `<details class="series-photo-panel"><summary>查看套装封面</summary><div class="series-photo-grid">${group.photos.map((p,index)=>`<button type="button" data-group-photo="${esc(group.id)}" data-photo-index="${index}" aria-label="放大查看${esc(p.label)}"><img data-original="${esc(p.original)}" src="${esc(p.thumbnail || p.preview || p.original)}" alt="${esc(p.label)}" width="160" height="220" loading="lazy" decoding="async"><span>${esc(p.label)} ↗</span></button>`).join('')}</div></details>`;
  }
  function seriesRelated(book) {
    const group=seriesGroups.find(g=>g.id===book.seriesGroupId);
    if(!group)return '';
    const members=books.filter(b=>b.seriesGroupId===group.id).sort((a,b)=>(a.seriesNumber??0)-(b.seriesNumber??0));
    return `<section class="detail-block related-series"><h2>${group.kind==='不同语种版本'?'同作品版本':'同系列藏书'} <small>已藏 ${members.length} 册</small></h2><p class="metadata-footnote">${esc(group.title)} · ${esc(book.seriesLabel)}</p>${seriesPhotos(group)}<div class="related-grid">${members.map(b=>b.id===book.id?`<span class="related-current"><small>${esc(b.seriesLabel)}</small>${esc(fullTitle(b))}<em>当前这册</em></span>`:`<a href="#book/${encodeURIComponent(b.id)}"><small>${esc(b.seriesLabel)}</small>${esc(fullTitle(b))}<span aria-hidden="true"> ↗</span></a>`).join('')}</div><button type="button" class="text-button" id="view-series" data-series="${esc(group.id)}">查看本系列全部已藏书目 ↗</button></section>`;
  }
  function field(label, value, wide=false) {
    if(value == null || value === '')return '';
    return `<div${wide?' class="wide"':''}><dt>${esc(label)}</dt><dd>${value == null || value === '' ? blank : esc(value)}</dd></div>`;
  }
  function renderDetail(book) {
    activeBook=book;side=book.photos[0]?.side || 'front';
    $('#detail-page').innerHTML = `<a href="#catalog" class="back-link">← 返回藏书目录</a><div class="detail-layout"><div class="photo-panel"><div class="photo-viewer"><button type="button" class="photo-arrow photo-prev" data-photo-step="-1" aria-label="上一张照片">‹</button><button type="button" class="photo-stage" id="open-photo" aria-label="放大查看书籍照片"><img decoding="async" id="detail-photo" data-original="${esc(imagePath(book,side,'original'))}" width="${book.photos[0].width || 800}" height="${book.photos[0].height || 1160}" src="${esc(imagePath(book,side,'preview'))}" alt="${esc(fullTitle(book))}正面照片"><span class="zoom-label">放大查看 ↗</span></button><button type="button" class="photo-arrow photo-next" data-photo-step="1" aria-label="下一张照片">›</button></div><div class="photo-toolbar"><div class="photo-sides" role="group" aria-label="照片方向">${book.photos.map(p=>`<button type="button" data-side="${esc(p.side)}" aria-pressed="${p.side===side}">${esc(p.label)}</button>`).join('')}</div><span id="photo-position" role="status"></span></div><div class="photo-caption" id="photo-caption"></div></div><article><p class="detail-category">${esc(book.category)}</p><h1 class="detail-title${isForeign(book)?' foreign-title':''}" lang="${esc(book.language || 'zh-Hans')}">${esc(fullTitle(book))}</h1>${book.referenceTitle?`<p class="detail-subtitle">${esc(book.referenceTitle)}</p>`:''}${book.authors.length||book.translators.length?`<p class="detail-author">${esc(authorLine(book))}${book.translators.length?` / ${esc(book.translators.join('、'))} 译`:''}</p>`:''}<dl class="metadata-grid basic-info">${field('出版社',book.publisher)}${field('版本',book.rulesVersionLabel || book.publicationVersion || book.coverEditionLabel || book.edition)}</dl>${book.description?`<section class="detail-intro"><h2>内容简介</h2><p class="detail-description">${esc(book.description)}</p></section>`:''}<details class="full-bibliography"><summary>完整书目</summary><dl class="metadata-grid">${field('藏书编号',book.id)}${field('语种',book.languageLabel)}${field('ISBN',book.isbn)}${field('ISBN 范围',book.isbnScope)}${field('丛书',book.series)}${field('系列册序',book.seriesLabel)}${field('封面版本标识',book.coverEditionLabel)}${field('规则版本',book.rulesVersionLabel)}${field('出版版本',book.publicationVersion)}${field('出版日期',book.publicationDate)}${field('版次',book.edition)}${field('印次',book.printing)}${field('封底定价',priceAmount(book)==null?null:priceText(book))}${field('实付价格',book.paidPrice==null?null:money(book.paidPrice,book.currency))}${field('入库时间',datetime(book.accessionedAt))}${field('购买时间',book.purchaseDate)}${field('购买渠道',book.purchaseChannel)}${field('阅读状态',book.readingStatus)}${field('存放位置',book.location)}${field('个人备注',book.notes,true)}</dl>${book.coverEditionLabel?'<p class="metadata-footnote">封面版本标识未核对版权页。</p>':''}${book.currency && book.currency!=='CNY' && priceAmount(book)!=null?`<p class="metadata-footnote">${rateNote()}</p>`:''}${book.condition?`<p class="metadata-footnote">外观成色（照片预估）：${esc(book.condition.label)}。${esc(book.condition.note)} 仅参考外观，内页与装订未检查。</p>`:''}${book.referenceSources?.length?`<ul>${book.referenceSources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.label)} ↗</a></li>`).join('')}</ul>`:''}</details>${seriesRelated(book)}</article></div>`;
    $('#view-series')?.addEventListener('click',()=>{catalogScroll=0;lastCatalogFocus=null;seriesFilter=book.seriesGroupId;category='全部';$('#sort').value='series';$('#search').value='';categories();renderCollection();location.hash='catalog';});
    if(!$('#detail-page .basic-info').children.length)$('#detail-page .basic-info').remove();
    $('#detail-page article').insertAdjacentHTML('beforeend',bookNavigation(book));
    $('#open-photo').addEventListener('click',()=>{if(!suppressPhotoClick)openPhoto();});
    $('#detail-page').querySelectorAll('[data-photo-step]').forEach(b=>b.addEventListener('click',()=>stepPhoto(Number(b.dataset.photoStep))));
    bindPhotoGestures($('#open-photo'),false);
    document.querySelectorAll('[data-side]').forEach(btn=>btn.addEventListener('click',()=>{side=btn.dataset.side;updatePhoto();}));
    updatePhoto();
  }
  function loadPreview(url){
    if(!previewLoads.has(url)){
      const task=new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>Promise.resolve(img.decode?.()).catch(()=>{}).then(()=>resolve(url));img.onerror=()=>reject(new Error('图片未能载入'));img.src=url;});
      previewLoads.set(url,task);task.catch(()=>previewLoads.delete(url));
    }
    return previewLoads.get(url);
  }
  function updatePhoto() {
    const book=activeBook,photo=book.photos.find(p=>p.side===side);if(!photo)return;
    const request=++photoRequest,index=book.photos.indexOf(photo),url=imagePath(book,side,'preview'),img=$('#detail-photo');
    $('#detail-page').querySelectorAll('[data-photo-step]').forEach(b=>b.hidden=book.photos.length<2);
    document.querySelectorAll('[data-side]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.side===side)));
    const commit=()=>{
      if(request!==photoRequest || !img.isConnected)return;
      img.dataset.original=photo.original;img.src=url;img.alt=`${fullTitle(book)}${photo.label}实拍预览`;img.setAttribute('aria-busy','false');
      $('#photo-position').textContent=`${photo.label} · ${index+1}/${book.photos.length}`;
      if(book.photos.length>1&&!navigator.connection?.saveData){const next=book.photos[(index+1)%book.photos.length];loadPreview(imagePath(book,next.side,'preview')).catch(()=>{});}
    };
    if(img.getAttribute('src')===url){commit();return;}
    img.setAttribute('aria-busy','true');$('#photo-position').textContent='正在载入'+photo.label+'…';
    loadPreview(url).then(commit).catch(()=>{if(request===photoRequest&&img.isConnected){img.setAttribute('aria-busy','false');img.dataset.original=photo.original;img.src=url;$('#photo-position').textContent=photo.label+'未能载入';}});
  }
  function bookNavigation(book){
    const ids=bookSequence.includes(book.id)?bookSequence:books.map(b=>b.id);
    const i=ids.indexOf(book.id);
    const link=(id,label)=>{const b=books.find(b=>b.id===id);return b?`<a href="#book/${encodeURIComponent(id)}"><small>${label}</small><span>${esc(fullTitle(b))}</span></a>`:`<span class="book-nav-end">${label==='上一本'?'已是第一本':'已是最后一本'}</span>`;};
    return `<nav class="book-navigation" aria-label="按当前目录顺序浏览">${link(ids[i-1],'上一本')}<span class="book-nav-position">${i+1} / ${ids.length}</span>${link(ids[i+1],'下一本')}</nav>`;
  }
  function stepPhoto(delta){
    const source=dialog.open?viewerSource:activeBook;
    if(!source || source.photos.length<2)return;
    const current=dialog.open?viewerSide:side;
    const i=source.photos.findIndex(p=>p.side===current);
    const next=source.photos[(i+delta+source.photos.length)%source.photos.length].side;
    if(dialog.open){
      viewerSide=next;
      if(source===activeBook){side=next;updatePhoto();}
      updateLightbox();
    }else{side=next;updatePhoto();}
  }
  function bindPhotoGestures(element,fullScreen){
    let start=null,pinch=null,multi=false;
    const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
    element.addEventListener('touchstart',e=>{
      if(e.touches.length===2 && fullScreen){multi=true;start=null;pinch={distance:distance(e.touches),zoom};}
      else if(e.touches.length===1){multi=false;start={x:e.touches[0].clientX,y:e.touches[0].clientY};}
    },{passive:true});
    element.addEventListener('touchmove',e=>{
      if(pinch && e.touches.length===2){e.preventDefault();setZoom(pinch.zoom*distance(e.touches)/Math.max(1,pinch.distance));}
    },{passive:false});
    element.addEventListener('touchend',e=>{
      if(e.touches.length)return;
      if(!multi && start && (!fullScreen || zoom<=1)){
        const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;
        if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.4){
          suppressPhotoClick=true;stepPhoto(dx<0?1:-1);setTimeout(()=>suppressPhotoClick=false,400);
        }
      }
      start=null;pinch=null;multi=false;
    });
    element.addEventListener('touchcancel',()=>{start=null;pinch=null;multi=false;});
  }
  function setZoom(value) {
    zoom=Math.min(3,Math.max(.5,value));
    const body=$('#lightbox-body');
    const img=$('#lightbox-image');
    const aspect=img.naturalWidth && img.naturalHeight ? img.naturalWidth/img.naturalHeight : (viewerSource?.orientation==='landscape'?1120/800:800/1160);
    const fitWidth=Math.min(body.clientWidth-48,(body.clientHeight-48)*aspect);
    $('#lightbox-image').style.width=`${Math.max(100,fitWidth)*zoom}px`;
    $('#zoom-reset').textContent=`${Math.round(zoom*100)}%`;
    $('#zoom-in').disabled=zoom>=3;$('#zoom-out').disabled=zoom<=.5;
  }
  function updateLightbox() {
    const photo=viewerSource.photos.find(p=>p.side===viewerSide);
    $('#photo-dialog-title').textContent=`${fullTitle(viewerSource)} · ${photo.label} · 原图`;
    $('#lightbox-image').src=photo.original;
    $('#lightbox-image').alt=`${fullTitle(viewerSource)}${photo.label}照片`;
    $('#lightbox-position').textContent=`${photo.label} · ${viewerSource.photos.indexOf(photo)+1}/${viewerSource.photos.length}`;
    dialog.querySelectorAll('[data-photo-step]').forEach(b=>b.hidden=viewerSource.photos.length<2);
    setZoom(1);$('#lightbox-body').scrollTo?.(0,0);
  }
  function openViewer(source,photoSide,trigger){
    viewerSource=source;viewerSide=photoSide;viewerReturnFocus=trigger;
    dialog.showModal();document.body.classList.add('photo-is-open');updateLightbox();$('#close-photo').focus();
  }
  function openPhoto(){openViewer(activeBook,side,$('#open-photo'));}
  function closePhoto(){
    dialog.close();document.body.classList.remove('photo-is-open');
    if(viewerReturnFocus?.isConnected)viewerReturnFocus.focus({preventScroll:true});
    viewerSource=null;viewerSide=null;syncImageErrors();
  }
  function renderTimeline() {
    const groups=new Map();
    [...books].sort((a,b)=>b.accessionedAt.localeCompare(a.accessionedAt)).forEach(b=>{const d=date(b.accessionedAt);if(!groups.has(d))groups.set(d,[]);groups.get(d).push(b);});
    $('#timeline-page').innerHTML=`<header class="page-heading"><p class="eyebrow">入库记录</p><h1>书架，慢慢生长。</h1><p>按拍摄时间记录实体书的入库足迹；当前已编目 ${books.length} 册。</p></header>${[...groups].map(([d,list])=>`<section class="timeline-group" aria-label="${d}入库记录"><h2 class="timeline-date">${d}<small>入库 ${list.length} 册</small></h2><div>${list.map(b=>`<a class="timeline-entry" href="#book/${encodeURIComponent(b.id)}"><img decoding="async" data-original="${esc(imagePath(b,'front','original'))}" src="${esc(imagePath(b))}" alt="${esc(fullTitle(b))}封面" width="54" height="76" loading="lazy"><div><span class="entry-id">${esc(b.id)}</span><h2${titleAttrs(b)}>${esc(fullTitle(b))}</h2><p>${esc(b.category)} · ${esc(authorLine(b))}</p></div><time datetime="${esc(b.accessionedAt)}">${datetime(b.accessionedAt).split(' ')[1]}</time></a>`).join('')}</div></section>`).join('')}`;
  }
  function renderAbout() {
    $('#about-page').innerHTML=`<header class="page-heading"><p class="eyebrow">关于藏书馆</p><h1>我的书，也有自己的档案。</h1><p>一份持续生长的个人实体藏书目录。</p></header><div class="about-layout"><div><article><h2>为拥有的书留一份记录</h2><p>冷愁藏书馆记录已经拥有的实体书。封面与封底均来自实物拍摄，书角的磨损、纸面的痕迹，也属于这一册书。</p><p>这里从三本书开始，逐步整理书名、作者、分类与收藏信息。已编目册数仅代表已经录入的部分。</p></article><article><h2>编目方式</h2><p>每册实体书拥有固定的藏书编号，例如 LC-000001。ISBN 单独记录，用于识别出版版本；相同版本的不同实体册仍可分别编目。</p><p>分类采用一个主分类与多个标签，便于按主题查找。分类可以调整，藏书编号保持不变。</p><p>同系列图书保留每册独立档案，可按系列分组浏览。系列关系与购买套装分别记录；“已藏”仅统计已录入实体册，不代表已确认集齐全部出版物。</p></article><article><h2>成色记录</h2><p>成色按实拍照片中的封面、封底与边角磨损粗估，使用“约八五成新”等描述，不代表精确测量或专业品相鉴定。内页、装订牢固度、缺页、笔记及霉斑等情况尚未检查。</p></article><article><h2>照片与时间</h2><p>页面使用保留完整构图的实拍预览，保留拍摄时的倾斜、背景与生活痕迹；放大查看时加载本馆收到的附件版本，可能不同于拍摄设备上的原始文件。入库时间取首张正面照片的拍摄时间，以北京时间记录。</p><p>首批照片的时间来自文件名，并用水印核对至分钟；秒数来自文件名，图片没有可读取的 EXIF 拍摄时间。</p></article><article><h2>价格与待补信息</h2><p>${rateNote()}</p><p>封底定价按原币记录，页面合计与价格排序按固定汇率折合人民币。折算不代表购书支出或藏书估值；缺少价格时不按零元计算。</p><p>购买时间、购买渠道、阅读状态、存放位置与个人备注尚未填写。购买时间可按实际已知程度记录为年、年月或完整日期。</p></article></div><aside class="about-aside"><h2>馆藏小笺</h2><dl><div><dt>馆藏类型</dt><dd>个人实体藏书</dd></div><div><dt>首批编目</dt><dd>2026 年 10 月 18 日</dd></div><div><dt>当前记录</dt><dd>${books.length} 册 · ${photoCount()} 张实拍</dd></div><div><dt>编号规则</dt><dd>LC-000001 起，逐册递增</dd></div></dl><p class="about-foot">藏书有序，阅读随心。<br>每一次翻阅，都可以是新的开始。</p></aside></div>`;
  }
  function route() {
    const hash=location.hash.slice(1) || 'catalog';
    if(dialog.open){dialog.close();document.body.classList.remove('photo-is-open');}
    if(hash.startsWith('book/')) {
      let id;try{id=decodeURIComponent(hash.slice(5));}catch{id='';}
      const book=books.find(b=>b.id===id);
      setPage('detail');
      if(book){renderDetail(book);document.title=`${fullTitle(book)} · 冷愁藏书馆`;}
      else{$('#detail-page').innerHTML='<div class="error-state"><h1>未找到这份藏书档案</h1><p>请检查编号，或返回目录继续浏览。</p><a href="#catalog" class="primary-button">返回目录</a></div>';document.title='未找到档案 · 冷愁藏书馆';}
    } else if(hash==='timeline') {setPage('timeline');renderTimeline();document.title='入库记录 · 冷愁藏书馆';}
    else if(hash==='about') {setPage('about');renderAbout();document.title='关于 · 冷愁藏书馆';}
    else {setPage('catalog');document.title='冷愁藏书馆 · 个人馆藏';}
    const returning=hash==='catalog' && currentPage==='detail';
    window.scrollTo({top:returning?catalogScroll:0,behavior:'instant'});
    currentPage=hash.startsWith('book/')?'detail':hash;
    const heading=document.querySelector('.page:not([hidden]) h1');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
    if(hash==='catalog' && lastCatalogFocus){const link=[...document.querySelectorAll('[data-book]')].find(a=>a.dataset.book===lastCatalogFocus);link?.focus({preventScroll:true});if(link){link.classList.add('just-viewed');setTimeout(()=>link.classList.remove('just-viewed'),2000);}}
  }
  const failedImages=new Set(), imageRecovery=new WeakMap();
  function syncImageErrors(){
    for(const img of failedImages)if(!img.isConnected)failedImages.delete(img);
    const count=[...failedImages].filter(img=>!img.closest('.page[hidden]') && (!img.closest('dialog') || dialog.open)).length;
    $('#image-errors').hidden=!count;
    $('#image-error-message').textContent=count?`${count} 张图片未能加载`:'';
  }
  function retryImage(img,url,state,delay=0){
    clearTimeout(state.timer);
    img.setAttribute('aria-busy','true');
    const previous=img.getAttribute('src');
    state.timer=setTimeout(()=>{
      if(!img.isConnected || img.getAttribute('src')!==previous)return;
      const fresh=new URL(url,location.href);fresh.searchParams.set('reload',Date.now().toString(36));
      // Updating src alone does not retry a resource selected from srcset.
      img.removeAttribute('srcset');img.removeAttribute('sizes');
      state.request=fresh.href;img.src=state.request;
    },delay);
  }
  document.addEventListener('error',event=>{
    const img=event.target;
    if(img.tagName!=='IMG' || !img.getAttribute('src') || (img.complete&&img.naturalWidth>0))return;
    let state=imageRecovery.get(img);
    if(!state || state.request!==img.getAttribute('src')){
      if(state)clearTimeout(state.timer);
      state={request:img.getAttribute('src'),primary:img.currentSrc || img.src,attempt:0};imageRecovery.set(img,state);
    }
    if(state.attempt<2){
      const target=state.attempt===0?state.primary:(img.dataset.original || state.primary);
      retryImage(img,target,state,state.attempt===0?300:1000);state.attempt++;return;
    }
    img.setAttribute('aria-busy','false');failedImages.add(img);img.classList.add('image-failed');syncImageErrors();
  },true);
  document.addEventListener('load',event=>{
    const img=event.target;
    if(img.tagName==='IMG'){
      clearTimeout(imageRecovery.get(img)?.timer);imageRecovery.delete(img);
      img.setAttribute('aria-busy','false');failedImages.delete(img);img.classList.remove('image-failed');syncImageErrors();
    }
  },true);
  $('#retry-images').addEventListener('click',()=>{
    for(const img of [...failedImages])if(img.isConnected){
      const state=imageRecovery.get(img) || {primary:img.currentSrc || img.src};
      state.attempt=0;imageRecovery.set(img,state);failedImages.delete(img);img.classList.remove('image-failed');
      retryImage(img,state.primary,state);
    }
    syncImageErrors();
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-group-photo]');
    if(!button)return;
    const group=seriesGroups.find(g=>g.id===button.dataset.groupPhoto);
    const photo=group?.photos?.[Number(button.dataset.photoIndex)];
    if(photo)openViewer(group,photo.side,button);
  });
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#book/"]');
    if(link && currentPage==='catalog'){
      catalogScroll=window.scrollY;lastCatalogFocus=decodeURIComponent(link.hash.slice(6));
    }
  });
  bindPhotoGestures($('#lightbox-body'),true);
  dialog.querySelectorAll('[data-photo-step]').forEach(b=>b.addEventListener('click',()=>stepPhoto(Number(b.dataset.photoStep))));
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stepPhoto(event.key==='ArrowLeft'?-1:1);}
  });
  $('#lightbox-image').addEventListener('load',()=>{if(dialog.open)setZoom(zoom);});
  $('#search').addEventListener('compositionstart',()=>{composing=true;clearTimeout(searchTimer);});
  $('#search').addEventListener('compositionend',()=>{composing=false;clearTimeout(searchTimer);searchTimer=setTimeout(renderCollection,140);});
  $('#search').addEventListener('input',()=>{clearTimeout(searchTimer);if(!composing)searchTimer=setTimeout(renderCollection,140);});
  $('#sort').addEventListener('change',renderCollection);
  $('#close-photo').addEventListener('click',closePhoto);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closePhoto();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePhoto();}});
  $('#zoom-in').addEventListener('click',()=>setZoom(zoom+.25));
  $('#zoom-out').addEventListener('click',()=>setZoom(zoom-.25));
  $('#zoom-reset').addEventListener('click',()=>setZoom(1));
  let resizeTimer;window.addEventListener('resize',()=>{if(dialog.open)setZoom(zoom);clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(books.length&&columnCount()!==renderedColumns)renderCollection();},100);});
  window.addEventListener('popstate',()=>{if(books.length){readQuery();categories();renderCollection();}});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!dialog.open&&!$('#catalog-page').hidden&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
  fetch('data/books.json?v=20261028-books-0000',{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error('书目未能载入');return response.json();}).then(data=>{
    priceGroups=data.priceGroups || [];exchangeRates=data.exchangeRates || {rates:{CNY:1}};books=data.books;categoryOrder=data.categoryOrder || [];seriesGroups=data.seriesGroups || [];$('#summary').textContent=`共 ${books.length} 册`;
    books.forEach(b=>{const normal=[fullTitle(b),b.originalTitle,b.referenceTitle,b.id,b.isbn,b.publisher,b.category,b.series,b.seriesLabel,...(b.titleAliases||[]),...b.tags,...b.translators,...b.authors.flatMap(a=>[a.name,a.originalName||''])].join(' ').toLocaleLowerCase();searchIndex.set(b.id,{normal,compact:normal.replace(/[\s-]/g,'')});});
    readQuery();categories();renderCollection();route();window.addEventListener('hashchange',route);
  }).catch(()=>{
    $('#collection').setAttribute('aria-busy','false');$('#collection').innerHTML='<div class="error-state"><h2>书目暂时未能展开</h2><p>请检查网络后重试。如果在本地查看，请通过网页服务器打开。</p><button type="button" class="primary-button" id="retry-load">重新载入</button></div>';$('#retry-load').addEventListener('click',()=>location.reload());
  });
})();
