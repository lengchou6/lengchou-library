'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const blank = '<span class="unfilled">未填写</span>';
  const money = (value, currency='CNY') => value == null ? blank : `${({CNY:'¥',USD:'US$',GBP:'£'})[currency] || currency+' '}${Number(value).toFixed(2)}`;
  let exchangeRates = {rates:{CNY:1}};
  let priceGroups=[];
  const priceGroup = book => priceGroups.find(g=>g.id===book.priceGroupId);
  const priceAmount = book => book.listPrice ?? priceGroup(book)?.amount ?? null;
  const converted = book => priceAmount(book)==null || exchangeRates.rates[book.currency || 'CNY']==null ? null : priceAmount(book)*exchangeRates.rates[book.currency || 'CNY'];
  const sumCny = items => {const seen=new Set();return items.reduce((sum,b)=>{const key=b.priceGroupId || b.id;if(seen.has(key))return sum;seen.add(key);return sum+(converted(b) ?? 0);},0);};
  const priceText = book => priceAmount(book)==null ? '未填写' : money(priceAmount(book),book.currency)+(book.priceGroupId?'（全两册合价，仅计一次）':'')+(book.currency && book.currency!=='CNY' ? (converted(book)==null?' · 暂无折算汇率':` · 约 ${money(converted(book))}`) : '');
  const titleAttrs = book => book.language==='en' ? ' class="foreign-title" lang="en"' : '';
  const secondaryTitle = book => book.referenceTitle ? book.referenceTitle : book.subtitle || '　';
  const rateNote = () => `参考汇率：${esc(exchangeRates.date || '')} · 1 USD = ${esc(exchangeRates.rates.USD)} CNY，1 GBP = ${esc(exchangeRates.rates.GBP)} CNY；<a href="${esc(exchangeRates.sourceUrl)}" target="_blank" rel="noopener">${esc(exchangeRates.source)}</a>。固定折算，手动更新；非实际购书支出。`;
  const date = value => value ? value.slice(0, 10).replaceAll('-', '.') : '';
  const datetime = value => value ? `${date(value)} ${value.match(/T(\d{2}:\d{2}(?::\d{2})?)/)?.[1] || ''}` : '';
  const photoCount = () => books.reduce((n,b)=>n+b.photos.length,0)+seriesGroups.reduce((n,g)=>n+(g.photos || []).length,0);
  const authorLine = book => book.authors.map(a => `${a.country ? `［${a.country}］` : ''}${a.name}${book.language==='en' && a.originalName?' / '+a.originalName:''}`).join('、');
  const fullTitle = book => `${book.title}${book.subtitle ? `：${book.subtitle}` : ''}`;
  const imagePath = (book, side='front', size='thumbnail') => {
    const photo = book.photos.find(p => p.side === side);
    return photo ? (size==='original' ? photo.original : photo[size] || photo.preview || photo.original) : '';
  };
  let categoryOrder = [], seriesGroups = [], seriesFilter = 'all', grouping = 'series', languageFilter = 'all', usageFilter = 'all';
  let books = [], category = '全部', view = 'grid', activeBook = null, side = 'front', zoom = 1;
  let lastCatalogFocus = null, catalogScroll = 0, currentPage = null, bookSequence = [];
  let suppressPhotoClick = false, recentExpanded=false, viewerSource=null, viewerSide=null, viewerReturnFocus=null;
  const collapsedSeries = new Set();
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
  function summary() {
    const total = sumCny(books);
    $('#summary').innerHTML = `<span><strong>${String(books.length).padStart(2,'0')}</strong> 册已编目</span><span><strong>${String(new Set(books.map(b=>b.category)).size).padStart(2,'0')}</strong> 个分类</span><span><strong>${String(photoCount()).padStart(2,'0')}</strong> 张实拍</span><span><strong>${String(seriesGroups.length).padStart(2,'0')}</strong> 个系列</span><details class="summary-valuation"><summary>${books.some(b=>priceAmount(b)==null)?'已知定价':'定价'}折合约 ¥${total.toFixed(2)}</summary><p>${rateNote()}</p></details>`;
    $('#footer-count').textContent = `已编目 ${books.length} 册`;
  }
  const languageName = code => code==='zh-Hans'?'中文':code==='en'?'英语':books.find(b=>b.language===code)?.languageLabel || code;
  function renderUsage(){
    const tags=[...new Set(books.flatMap(b=>b.usageTags || []))];
    $('#usage-filter').innerHTML='<option value="all">全部用途</option>'+tags.map(tag=>`<option value="${esc(tag)}">${esc(tag)} · ${books.filter(b=>(b.usageTags || []).includes(tag)).length} 册</option>`).join('');
    $('#usage-filter').value=usageFilter;
  }
  function resetFilterValues(){
    category='全部';seriesFilter='all';languageFilter='all';usageFilter='all';$('#language-filter').value='all';$('#usage-filter').value='all';$('#search').value='';
  }
  function syncFilterToggle(){
    const count=Number(category!=='全部')+Number(seriesFilter!=='all')+Number(languageFilter!=='all')+Number(usageFilter!=='all')+Number(Boolean($('#search').value.trim()));
    const open=$('#filter-toggle').getAttribute('aria-expanded')==='true';
    $('#filter-toggle').textContent=(open?'收起筛选':'展开筛选')+(count?` · 已选 ${count} 项`:'');
  }
  function setFilterPanel(open){
    $('#filter-toggle').setAttribute('aria-expanded',String(open));$('#filter-panel').classList.toggle('is-open',open);syncFilterToggle();
  }
  function chooseUsage(tag){
    catalogScroll=0;lastCatalogFocus=null;resetFilterValues();usageFilter=tag;$('#usage-filter').value=tag;categories();renderSeriesControls();renderCollection();location.hash='catalog';
  }
  function usageChips(book){return `<div class="usage-chips" aria-label="用途标签">${(book.usageTags || []).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>`;}
  function renderLanguages(){
    const codes=[...new Set(books.map(b=>b.language || 'zh-Hans'))];
    $('#language-filter').innerHTML='<option value="all">全部语种</option>'+codes.map(code=>`<option value="${esc(code)}">${esc(languageName(code))} · ${books.filter(b=>(b.language || 'zh-Hans')===code).length} 册</option>`).join('');
    $('#language-filter').value=languageFilter;
  }
  function chooseShelf(id){
    collapsedSeries.delete(id);
    usageFilter='all';$('#usage-filter').value='all';seriesFilter=id;category='全部';languageFilter='all';$('#language-filter').value='all';$('#search').value='';
    grouping='series';$('#grouping').value='series';categories();renderSeriesControls();renderCollection();
    $('#collection').scrollIntoView({behavior:'auto',block:'start'});
    const target=$('#collection h3');if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
  }
  function renderShortcuts(){
    $('#series-shortcuts').innerHTML=[{id:'all',shortTitle:'全部藏书'},...seriesGroups,{id:'standalone',shortTitle:'单册藏书'}].map(g=>`<button type="button" data-shelf="${esc(g.id)}" aria-pressed="${seriesFilter===g.id}">${esc(g.shortTitle)}</button>`).join('');
    $('#series-shortcuts').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>chooseShelf(b.dataset.shelf)));
  }
  function renderRecent(){
    const recent=[...books].sort((a,b)=>b.accessionedAt.localeCompare(a.accessionedAt)).slice(0,6);
    $('#recent-books').innerHTML=`<div class="recent-heading"><div><h2>最近入库</h2><p>${recentExpanded?'最近整理的':'先看最新'} ${recentExpanded?recent.length:Math.min(3,recent.length)} 册</p></div><button type="button" class="text-button" id="newest-first">按最新入库浏览 ↗</button></div><div class="recent-grid">${recent.map((b,index)=>`<a class="recent-book" ${index>=3&&!recentExpanded?'hidden':''} href="#book/${encodeURIComponent(b.id)}" aria-label="查看最近入库的${esc(fullTitle(b))}"><img decoding="async" src="${esc(imagePath(b))}" alt="${esc(b.title)}完整实拍预览" width="60" height="84" loading="${index<2?'eager':'lazy'}" fetchpriority="${index===0?'high':'auto'}"><span><strong${titleAttrs(b)}>${esc(b.title)}</strong>${b.referenceTitle?`<small>${esc(b.referenceTitle)}</small>`:''}<time datetime="${esc(b.accessionedAt)}">${date(b.accessionedAt)} · ${b.accessionedAt.slice(11,16)}</time></span></a>`).join('')}</div><button type="button" class="text-button recent-toggle" id="recent-toggle" aria-expanded="${recentExpanded}">${recentExpanded?'收起':'展开最近六册'}</button>`;
    $('#recent-toggle').addEventListener('click',()=>{recentExpanded=!recentExpanded;renderRecent();$('#recent-toggle').focus({preventScroll:true});});
    $('#newest-first').addEventListener('click',()=>{
      usageFilter='all';$('#usage-filter').value='all';seriesFilter='all';category='全部';languageFilter='all';$('#language-filter').value='all';$('#search').value='';grouping='all';$('#grouping').value='all';$('#sort').value='accession-desc';categories();renderSeriesControls();renderCollection();$('#collection').scrollIntoView({behavior:'auto',block:'start'});
    });
  }
  function categories() {
    $('#categories').innerHTML = ['全部', ...new Set([...categoryOrder,...books.map(b=>b.category)].filter(c=>books.some(b=>b.category===c)))].map(c => `<button type="button" class="category-button" data-category="${esc(c)}" aria-pressed="${category === c}">${esc(c)}<span>${c === '全部' ? books.length : books.filter(b=>b.category===c).length}</span></button>`).join('');
    $('#categories').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      category = btn.dataset.category; categories(); renderCollection();
      $('#categories').querySelectorAll('button').forEach(b=>{if(b.dataset.category===category)b.focus();});
    }));
  }
  function visibleBooks() {
    const q = $('#search').value.trim().toLocaleLowerCase();
    const compact = value => value.replace(/[\s-]/g,'');
    const result = books.filter(b => {
      const haystack = [fullTitle(b), b.originalTitle || '', b.referenceTitle || '', b.languageLabel || '', b.rulesVersion || '', b.publicationVersion || '', ...(b.titleAliases || []), ...(b.usageTags || []), b.id, b.isbn, b.publisher, b.category, b.series || '', b.seriesLabel || '', ...b.tags, ...b.translators, ...b.authors.flatMap(a=>[a.name,a.originalName || ''])].join(' ').toLocaleLowerCase();
      return (usageFilter==='all' || (b.usageTags || []).includes(usageFilter)) && (languageFilter==='all' || (b.language || 'zh-Hans')===languageFilter) && (category === '全部' || b.category === category) && (seriesFilter === 'all' || (seriesFilter === 'standalone' ? !b.seriesGroupId : b.seriesGroupId === seriesFilter)) && (!q || haystack.includes(q) || compact(haystack).includes(compact(q)));
    });
    const sort = $('#sort').value;
    result.sort((a,b) => {
      if(sort==='title') return fullTitle(a).localeCompare(fullTitle(b),'zh-Hans-CN-u-co-pinyin');
      if(sort.startsWith('price')) {
        if(converted(a) == null) return converted(b) == null ? a.id.localeCompare(b.id) : 1;
        if(converted(b) == null) return -1;
        return sort==='price-asc' ? converted(a)-converted(b) : converted(b)-converted(a);
      }
      return sort==='accession-desc' ? b.accessionedAt.localeCompare(a.accessionedAt) : a.accessionedAt.localeCompare(b.accessionedAt);
    });
    return result;
  }
  function bookCard(b) {
    const landscape=b.orientation==='landscape';
    return `<a class="book-card${landscape?' book-landscape':''}" href="#book/${encodeURIComponent(b.id)}" data-book="${esc(b.id)}" aria-label="查看${esc(fullTitle(b))}的藏书档案"><div class="cover-stage"><span class="spine-id">${esc(b.id)}</span><img decoding="async" class="cover-image" src="${esc(imagePath(b))}" alt="${esc(b.title)}实体书正面" width="${landscape?560:400}" height="${landscape?400:580}" loading="lazy"><span class="stage-label">${landscape?'横版藏书':'实体藏书'} · 实拍</span></div><div class="book-card-info"><div class="book-meta-top"><span>${esc(b.category)}${b.language==='en'?' · 英语':''}${b.rulesVersion?' · '+esc(b.rulesVersion):''}</span><span class="book-id">${esc(b.id)}</span></div><h3${titleAttrs(b)}>${esc(b.title)}</h3><p class="book-subtitle">${esc(secondaryTitle(b))}</p><p class="book-author">${esc(authorLine(b))}</p>${usageChips(b)}<p class="condition-line"><span>${esc(b.condition?.label || '未评估')}</span><small>照片预估</small></p><div class="book-card-bottom"><span>入库 <time datetime="${esc(b.accessionedAt)}">${date(b.accessionedAt)}</time></span><span class="card-arrow" aria-hidden="true">↗</span></div></div></a>`;
  }
  function bookTable(items) {
    return `<div class="table-wrap"><table><caption class="sr-only">藏书目录，共${items.length}册</caption><thead><tr><th scope="col">书名 / 作者</th><th scope="col">藏书编号</th><th scope="col">系列 / 册序</th><th scope="col">类别 / 用途</th><th scope="col">成色（外观预估）</th><th scope="col">定价</th><th scope="col">入库日期</th></tr></thead><tbody>${items.map(b=>`<tr><td><a class="table-book" href="#book/${encodeURIComponent(b.id)}" data-book="${esc(b.id)}"><img decoding="async" src="${esc(imagePath(b))}" alt="" width="34" height="49" loading="lazy"><span><strong${titleAttrs(b)}>${esc(b.title)}</strong>${b.referenceTitle?`<small>${esc(secondaryTitle(b))}</small>`:''}<small>${esc(authorLine(b))}</small></span></a></td><td class="mono">${esc(b.id)}</td><td>${esc(seriesGroups.find(g=>g.id===b.seriesGroupId)?.shortTitle || '—')}${b.seriesLabel?' / '+esc(b.seriesLabel):''}</td><td>${esc(b.category)}${usageChips(b)}</td><td>${esc(b.condition?.label || '未评估')}</td><td class="mono">${esc(priceText(b))}</td><td class="mono">${date(b.accessionedAt)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderSeriesControls() {
    $('#series-filter').innerHTML=`<option value="all">全部系列与藏书</option>${seriesGroups.map(g=>`<option value="${esc(g.id)}">${esc(g.shortTitle)} · 已藏 ${books.filter(b=>b.seriesGroupId===g.id).length} 册</option>`).join('')}<option value="standalone">单册藏书</option>`;
    $('#series-filter').value=seriesFilter;renderShortcuts();
  }
  function renderActiveFilters(){
    const chips=[];
    if(category!=='全部')chips.push(['category','类别：'+category]);
    if(seriesFilter!=='all')chips.push(['series','系列：'+(seriesGroups.find(g=>g.id===seriesFilter)?.shortTitle || '单册藏书')]);
    if(languageFilter!=='all')chips.push(['language','语种：'+languageName(languageFilter)]);
    if(usageFilter!=='all')chips.push(['usage','用途：'+usageFilter]);
    if($('#search').value.trim())chips.push(['search','搜索：'+$('#search').value.trim()]);
    const panel=$('#active-filters');panel.hidden=!chips.length;
    panel.innerHTML=chips.map(([key,label])=>`<button type="button" data-clear-filter="${key}" aria-label="取消${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('');
    panel.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
      const key=button.dataset.clearFilter;
      if(key==='category')category='全部';
      if(key==='series'){seriesFilter='all';$('#series-filter').value='all';}
      if(key==='language'){languageFilter='all';$('#language-filter').value='all';}
      if(key==='usage'){usageFilter='all';$('#usage-filter').value='all';}
      if(key==='search')$('#search').value='';
      categories();renderSeriesControls();renderCollection();
      const next=$('#active-filters button');(next || $('#search')).focus({preventScroll:true});
    }));
  }
  function renderCollection() {
    syncFilterToggle();renderShortcuts();renderActiveFilters();const result=visibleBooks();
    const filterLabel=seriesGroups.find(g=>g.id===seriesFilter)?.shortTitle || (seriesFilter==='standalone'?'单册藏书':'');
    $('#results-status').textContent=`显示 ${result.length} / ${books.length} 册${category==='全部'?'':' · '+category}${filterLabel?' · '+filterLabel:''}${languageFilter==='all'?'':' · '+languageName(languageFilter)}${usageFilter==='all'?'':' · 用途：'+usageFilter}${$('#search').value.trim()?' · “'+$('#search').value.trim()+'”':''}`;
    $('#grid-view').setAttribute('aria-pressed',String(view==='grid'));
    $('#table-view').setAttribute('aria-pressed',String(view==='table'));
    const container=$('#collection');container.setAttribute('aria-busy','false');
    if(!result.length){
      container.innerHTML='<div class="empty-state"><h3>还没有找到这本书</h3><p>试试其他关键词，或查看全部藏书。</p><button type="button" class="primary-button" id="clear-filters">清除筛选</button></div>';
      $('#clear-filters').addEventListener('click',()=>{resetFilterValues();categories();renderSeriesControls();renderCollection();$('#search').focus();});return;
    }
    const content=items=>view==='grid'?`<div class="book-grid">${items.map(bookCard).join('')}</div>`:bookTable(items);
    bookSequence=result.map(b=>b.id);
    if(grouping==='series'){
      const groups=seriesGroups.map(g=>({...g,items:result.filter(b=>b.seriesGroupId===g.id)}));
      groups.push({id:'standalone',title:'单册藏书',description:'单册编目，按当前排序浏览。',items:result.filter(b=>!b.seriesGroupId)});
      bookSequence=[];
      container.innerHTML=groups.filter(g=>g.items.length).map(g=>{
        const all=books.filter(b=>g.id==='standalone'?!b.seriesGroupId:b.seriesGroupId===g.id);
        const items=[...g.items];
        if(g.id!=='standalone' && $('#sort').value.startsWith('accession'))items.sort((a,b)=>(a.seriesNumber??0)-(b.seriesNumber??0));
        bookSequence.push(...items.map(b=>b.id));
        const count=items.length===all.length?`已藏 ${all.length} 册`:`显示 ${items.length} / 已藏 ${all.length} 册`;
        return `<section class="series-section" aria-label="${esc(g.title)}"><header class="series-heading"><div><p class="eyebrow">${g.id==='standalone'?'单册陈列':'系列藏书'}</p><h3>${esc(g.title)} <span>${count}</span></h3><p>${esc(g.description)}</p></div><div class="series-actions"><span class="series-total">${items.some(b=>priceAmount(b)==null)?'已知定价':'定价'}折合 ${money(sumCny(items))}</span><button type="button" class="series-toggle" data-toggle-series="${esc(g.id)}" aria-expanded="${!collapsedSeries.has(g.id)}" aria-controls="shelf-${esc(g.id)}">${collapsedSeries.has(g.id)?'展开':'收起'}</button></div></header>${seriesPhotos(g)}<div id="shelf-${esc(g.id)}"${collapsedSeries.has(g.id)?' hidden':''}>${content(items)}</div></section>`;
      }).join('');
    }else{container.innerHTML=content(result);}
    container.querySelectorAll('[data-toggle-series]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.toggleSeries, open=button.getAttribute('aria-expanded')!=='true';
      if(open)collapsedSeries.delete(id);else collapsedSeries.add(id);
      button.setAttribute('aria-expanded',String(open));button.textContent=open?'收起':'展开';
      document.getElementById(button.getAttribute('aria-controls')).hidden=!open;
    }));
    container.querySelectorAll('[data-book]').forEach(a=>a.addEventListener('click',()=>{lastCatalogFocus=a.dataset.book;}));
    syncImageErrors();
  }
  function seriesPhotos(group){
    if(!group?.photos?.length)return '';
    return `<details class="series-photo-panel"><summary>套装照片 · ${group.photos.length} 张</summary><p>系列补充照片，不计为额外藏书。点击可放大，左右切换。</p><div class="series-photo-grid">${group.photos.map((p,index)=>`<button type="button" data-group-photo="${esc(group.id)}" data-photo-index="${index}" aria-label="放大查看${esc(p.label)}"><img src="${esc(p.thumbnail || p.preview || p.original)}" alt="${esc(p.label)}" width="160" height="220" loading="lazy" decoding="async"><span>${esc(p.label)} ↗</span></button>`).join('')}</div></details>`;
  }
  function seriesRelated(book) {
    const group=seriesGroups.find(g=>g.id===book.seriesGroupId);
    if(!group)return '';
    const members=books.filter(b=>b.seriesGroupId===group.id).sort((a,b)=>(a.seriesNumber??0)-(b.seriesNumber??0));
    return `<section class="detail-block related-series"><h2>同系列藏书 <small>已藏 ${members.length} 册</small></h2><p class="metadata-footnote">${esc(group.title)} · ${esc(book.seriesLabel)}</p>${seriesPhotos(group)}<div class="related-grid">${members.map(b=>b.id===book.id?`<span class="related-current"><small>${esc(b.seriesLabel)}</small>${esc(b.title)}<em>当前这册</em></span>`:`<a href="#book/${encodeURIComponent(b.id)}"><small>${esc(b.seriesLabel)}</small>${esc(b.title)}<span aria-hidden="true"> ↗</span></a>`).join('')}</div><button type="button" class="text-button" id="view-series" data-series="${esc(group.id)}">查看本系列全部已藏书目 ↗</button></section>`;
  }
  function field(label, value, wide=false) {
    return `<div${wide?' class="wide"':''}><dt>${esc(label)}</dt><dd>${value == null || value === '' ? blank : esc(value)}</dd></div>`;
  }
  function renderDetail(book) {
    activeBook=book;side=book.photos[0]?.side || 'front';
    $('#detail-page').innerHTML = `<a href="#catalog" class="back-link">← 返回藏书目录</a><div class="detail-layout"><div class="photo-panel"><div class="photo-viewer"><button type="button" class="photo-arrow photo-prev" data-photo-step="-1" aria-label="上一张照片">‹</button><button type="button" class="photo-stage" id="open-photo" aria-label="放大查看书籍照片"><img decoding="async" id="detail-photo" width="${book.photos[0].width || 800}" height="${book.photos[0].height || 1160}" src="${esc(imagePath(book,side,'preview'))}" alt="${esc(book.title)}正面照片"><span class="zoom-label">放大查看 ↗</span></button><button type="button" class="photo-arrow photo-next" data-photo-step="1" aria-label="下一张照片">›</button></div><div class="photo-toolbar"><div class="photo-sides" role="group" aria-label="照片方向">${book.photos.map(p=>`<button type="button" data-side="${esc(p.side)}" aria-pressed="${p.side===side}">${esc(p.label)}</button>`).join('')}</div><span id="photo-position" role="status"></span></div><div class="photo-caption" id="photo-caption"></div></div><article><p class="detail-category">${esc(book.category)}</p><h1 class="detail-title${book.language==='en'?' foreign-title':''}" lang="${esc(book.language || 'zh-Hans')}">${esc(book.title)}</h1>${book.referenceTitle?`<p class="detail-subtitle">${esc(secondaryTitle(book))}</p>`:''}${book.subtitle?`<p class="detail-subtitle">${esc(book.subtitle)}</p>`:''}<p class="detail-author">${esc(authorLine(book))}${book.translators.length?` 著 / ${esc(book.translators.join('、'))} 译`:''}</p><p class="detail-id">藏书编号 ${esc(book.id)}</p><div class="tag-list">${book.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><section class="detail-usage"><h2>参考用途</h2><div class="usage-buttons">${(book.usageTags || []).map(tag=>`<button type="button" data-usage="${esc(tag)}">${esc(tag)}</button>`).join('')}</div><p class="metadata-footnote">按书目主题整理的个人用途标签，可随阅读调整。点击可查找同用途藏书。</p></section><section class="detail-intro"><h2>内容简介</h2><p class="detail-description">${esc(book.description)}</p></section><section class="detail-block"><h2>书目信息</h2><dl class="metadata-grid">${field('语种',book.languageLabel || '中文')}${field('出版社',book.publisher)}${field('ISBN',book.isbn)}${book.isbnScope?field('ISBN 范围',book.isbnScope):''}${field(book.seriesGroupId==='tencent-game-development'?'系列归组':'丛书',book.series,true)}${field('系列册序',book.seriesLabel)}${field('购买套装',book.purchaseGroupId ? '已关联购买记录' : null)}${field('封面版本标识',book.coverEditionLabel)}${book.rulesVersion?`${field('规则版本',book.rulesVersionLabel)}${field('出版版本',book.publicationVersion)}${field('印次',book.printing || '待版权页核对')}`:field('出版日期 / 版次',book.publicationDate || book.edition)}${field('封底定价',priceAmount(book)==null ? null : priceText(book))}${field('实付价格',book.paidPrice == null ? null : money(book.paidPrice,book.currency))}</dl>${book.currency!=='CNY'?`<p class="metadata-footnote">${rateNote()}</p>`:''}${book.coverEditionLabel?'<p class="metadata-footnote">版本为封面标识，具体出版版次待版权页核对。</p>':''}</section><section class="detail-block"><h2>收藏档案</h2><dl class="metadata-grid">${field('外观成色（照片预估）',book.condition?.label)}${field('成色评估日期',book.condition?.assessedOn)}${field('可见外观情况',book.condition?.note,true)}${field('评估范围',book.condition ? '仅参考封面、封底和边角；内页及装订等情况未检查。' : null,true)}${field('入库时间（北京时间）',datetime(book.accessionedAt),true)}${field('购买时间',book.purchaseDate)}${field('购买渠道',book.purchaseChannel)}${field('阅读状态',book.readingStatus)}${field('存放位置',book.location)}${field('个人备注',book.notes,true)}</dl><p class="metadata-footnote">入库时间取自正面照片的拍摄记录；仅有水印分钟时不补造秒数。购买时间、渠道与实付价格可后续补充。</p></section><p class="metadata-footnote">资料来源：${esc(book.metadataSource)}。</p>${book.referenceSources?.length?`<section class="detail-block"><h2>中文辅助信息与资料来源</h2><p class="metadata-footnote">${esc(book.translationNote)}</p>${book.titleAliases?.length?`<p class="metadata-footnote">检索别名：${esc(book.titleAliases.join(' / '))}</p>`:''}<ul>${book.referenceSources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.label)} ↗</a></li>`).join('')}</ul></section>`:''}${seriesRelated(book)}</article></div>`;
    $('#detail-page').querySelectorAll('[data-usage]').forEach(btn=>btn.addEventListener('click',()=>chooseUsage(btn.dataset.usage)));
    const pending=[...$('#detail-page').querySelectorAll('.metadata-grid>div')].filter(row=>row.querySelector('.unfilled'));
    if(pending.length){
      const panel=document.createElement('details');panel.className='pending-info';
      panel.innerHTML=`<summary>待补信息 · ${pending.length} 项</summary><dl class="metadata-grid">${pending.map(row=>row.outerHTML).join('')}</dl>`;
      pending.forEach(row=>row.remove());$('#detail-page article').append(panel);
    }
    $('#view-series')?.addEventListener('click',()=>{catalogScroll=0;lastCatalogFocus=null;collapsedSeries.delete(book.seriesGroupId);usageFilter='all';$('#usage-filter').value='all';seriesFilter=book.seriesGroupId;category='全部';languageFilter='all';$('#language-filter').value='all';grouping='series';$('#grouping').value='series';$('#search').value='';categories();renderSeriesControls();renderCollection();location.hash='catalog';});
    $('#detail-page article').insertAdjacentHTML('beforeend',bookNavigation(book));
    $('#open-photo').addEventListener('click',()=>{if(!suppressPhotoClick)openPhoto();});
    $('#detail-page').querySelectorAll('[data-photo-step]').forEach(b=>b.addEventListener('click',()=>stepPhoto(Number(b.dataset.photoStep))));
    bindPhotoGestures($('#open-photo'),false);
    document.querySelectorAll('[data-side]').forEach(btn=>btn.addEventListener('click',()=>{side=btn.dataset.side;updatePhoto();}));
    updatePhoto();
  }
  function updatePhoto() {
    const photo=activeBook.photos.find(p=>p.side===side);
    if(!photo)return;
    const index=activeBook.photos.indexOf(photo);
    $('#photo-position').textContent=`${photo.label} · ${index+1}/${activeBook.photos.length}`;
    $('#detail-page').querySelectorAll('[data-photo-step]').forEach(b=>b.hidden=activeBook.photos.length<2);
    const img=$('#detail-photo'); img.src=imagePath(activeBook,side,'preview');img.alt=`${activeBook.title}${photo.label}实拍预览`;
    document.querySelectorAll('[data-side]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.side===side)));
    $('#photo-caption').innerHTML=`<p>${esc(photo.label)} · 完整实拍预览 · ${datetime(photo.capturedAt)} UTC+08:00</p><p>${esc(photo.sourceFilename)}</p><p>时间来源：${esc(photo.timeSource)}；当前图片无可读取 EXIF。</p>`;
  }
  function bookNavigation(book){
    const ids=bookSequence.includes(book.id)?bookSequence:books.map(b=>b.id);
    const i=ids.indexOf(book.id);
    const link=(id,label)=>{const b=books.find(b=>b.id===id);return b?`<a href="#book/${encodeURIComponent(id)}"><small>${label}</small><span>${esc(b.title)}</span></a>`:`<span class="book-nav-end">${label==='上一本'?'已是第一本':'已是最后一本'}</span>`;};
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
    $('#photo-dialog-title').textContent=`${viewerSource.title} · ${photo.label} · 原图`;
    $('#lightbox-image').src=photo.original;
    $('#lightbox-image').alt=`${viewerSource.title}${photo.label}照片`;
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
    $('#timeline-page').innerHTML=`<header class="page-heading"><p class="eyebrow">入库记录</p><h1>书架，慢慢生长。</h1><p>按拍摄时间记录实体书的入库足迹；当前已编目 ${books.length} 册。</p></header>${[...groups].map(([d,list])=>`<section class="timeline-group" aria-label="${d}入库记录"><h2 class="timeline-date">${d}<small>入库 ${list.length} 册</small></h2><div>${list.map(b=>`<a class="timeline-entry" href="#book/${encodeURIComponent(b.id)}"><img decoding="async" src="${esc(imagePath(b))}" alt="${esc(b.title)}封面" width="54" height="76" loading="lazy"><div><span class="entry-id">${esc(b.id)}</span><h2${titleAttrs(b)}>${esc(b.title)}</h2><p>${esc(b.category)} · ${esc(authorLine(b))}</p></div><time datetime="${esc(b.accessionedAt)}">${datetime(b.accessionedAt).split(' ')[1]}</time></a>`).join('')}</div></section>`).join('')}`;
  }
  function renderAbout() {
    $('#about-page').innerHTML=`<header class="page-heading"><p class="eyebrow">关于藏书馆</p><h1>我的书，也有自己的档案。</h1><p>一份持续生长的个人实体藏书目录。</p></header><div class="about-layout"><div><article><h2>为拥有的书留一份记录</h2><p>冷愁藏书馆记录已经拥有的实体书。封面与封底均来自实物拍摄，书角的磨损、纸面的痕迹，也属于这一册书。</p><p>这里从三本书开始，逐步整理书名、作者、分类与收藏信息。已编目册数仅代表已经录入的部分。</p></article><article><h2>编目方式</h2><p>每册实体书拥有固定的藏书编号，例如 LC-000001。ISBN 单独记录，用于识别出版版本；相同版本的不同实体册仍可分别编目。</p><p>分类采用一个主分类与多个标签，便于按主题查找。分类可以调整，藏书编号保持不变。</p><p>同系列图书保留每册独立档案，可按系列分组浏览。系列关系与购买套装分别记录；“已藏”仅统计已录入实体册，不代表已确认集齐全部出版物。</p></article><article><h2>成色记录</h2><p>成色按实拍照片中的封面、封底与边角磨损粗估，使用“约八五成新”等描述，不代表精确测量或专业品相鉴定。内页、装订牢固度、缺页、笔记及霉斑等情况尚未检查。</p></article><article><h2>照片与时间</h2><p>页面使用保留完整构图的实拍预览，保留拍摄时的倾斜、背景与生活痕迹；放大查看时加载原始照片。入库时间取首张正面照片的拍摄时间，以北京时间记录。</p><p>首批照片的时间来自文件名，并用水印核对至分钟；秒数来自文件名，图片没有可读取的 EXIF 拍摄时间。</p></article><article><h2>价格与待补信息</h2><p>${rateNote()}</p><p>封底定价按原币记录，页面合计与价格排序按固定汇率折合人民币。折算不代表购书支出或藏书估值；缺少价格时不按零元计算。</p><p>购买时间、购买渠道、阅读状态、存放位置与个人备注尚未填写。购买时间可按实际已知程度记录为年、年月或完整日期。</p></article></div><aside class="about-aside"><h2>馆藏小笺</h2><dl><div><dt>馆藏类型</dt><dd>个人实体藏书</dd></div><div><dt>首批编目</dt><dd>2026 年 10 月 18 日</dd></div><div><dt>当前记录</dt><dd>${books.length} 册 · ${photoCount()} 张实拍</dd></div><div><dt>编号规则</dt><dd>LC-000001 起，逐册递增</dd></div></dl><p class="about-foot">藏书有序，阅读随心。<br>每一次翻阅，都可以是新的开始。</p></aside></div>`;
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
  function exportCsv() {
    const rows=[['藏书编号','书名','副标题','中文参考名','语种','规则版本','出版版本','印次','作者','译者','主分类','标签','用途标签','系列','系列册序','购买套装关联','成色（外观预估）','成色说明','出版社','ISBN','封底定价','定价范围','整套计价组','币种','参考折合人民币','汇率日期','入库时间','购买时间','购买渠道','实付价格','阅读状态','存放位置','个人备注'],...visibleBooks().map(b=>[b.id,b.title,b.subtitle,b.referenceTitle,b.languageLabel,b.rulesVersionLabel,b.publicationVersion,b.rulesVersion?(b.printing || '待版权页核对'):null,authorLine(b),b.translators.join('、'),b.category,b.tags.join(' / '),(b.usageTags || []).join(' / '),b.series,b.seriesLabel,b.purchaseGroupId,b.condition?.label,b.condition?.note,b.publisher,b.isbn,priceAmount(b),b.priceGroupId?'全两册合价，仅计一次':'单册',b.priceGroupId,b.currency,converted(b)==null?null:converted(b).toFixed(2),exchangeRates.date,b.accessionedAt,b.purchaseDate,b.purchaseChannel,b.paidPrice,b.readingStatus,b.location,b.notes])];
    const cell=value=>{let s=String(value??'');if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='冷愁藏书馆-书目.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast(`已导出当前筛选的 ${rows.length-1} 册书目`);
  }
  const failedImages=new Set();
  function syncImageErrors(){
    for(const img of failedImages)if(!img.isConnected)failedImages.delete(img);
    const count=[...failedImages].filter(img=>!img.closest('.page[hidden]') && (!img.closest('dialog') || dialog.open)).length;
    $('#image-errors').hidden=!count;
    $('#image-error-message').textContent=count?`${count} 张图片未能加载`:'';
  }
  document.addEventListener('error',event=>{
    if(event.target.tagName==='IMG'){failedImages.add(event.target);event.target.classList.add('image-failed');syncImageErrors();}
  },true);
  document.addEventListener('load',event=>{
    if(event.target.tagName==='IMG'){failedImages.delete(event.target);event.target.classList.remove('image-failed');syncImageErrors();}
  },true);
  $('#retry-images').addEventListener('click',()=>{
    for(const img of [...failedImages])if(img.isConnected){failedImages.delete(img);img.classList.remove('image-failed');const src=img.getAttribute('src');img.removeAttribute('src');img.src=src;}
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
  $('#filter-toggle').addEventListener('click',()=>setFilterPanel($('#filter-toggle').getAttribute('aria-expanded')!=='true'));
  $('#apply-filters').addEventListener('click',()=>{setFilterPanel(false);$('#results-status').scrollIntoView({behavior:'auto',block:'start'});$('#filter-toggle').focus({preventScroll:true});});
  $('#reset-filters').addEventListener('click',()=>{resetFilterValues();categories();renderSeriesControls();renderCollection();});
  $('#usage-filter').addEventListener('change',e=>{usageFilter=e.target.value;renderCollection();});
  $('#language-filter').addEventListener('change',e=>{languageFilter=e.target.value;renderCollection();});
  $('#series-filter').addEventListener('change',e=>{seriesFilter=e.target.value;renderCollection();});
  $('#grouping').addEventListener('change',e=>{grouping=e.target.value;renderCollection();});
  $('#lightbox-image').addEventListener('load',()=>{if(dialog.open)setZoom(zoom);});
  $('#search').addEventListener('input',renderCollection);
  $('#sort').addEventListener('change',renderCollection);
  $('#grid-view').addEventListener('click',()=>{view='grid';renderCollection();});
  $('#table-view').addEventListener('click',()=>{view='table';renderCollection();});
  $('#export-csv').addEventListener('click',exportCsv);
  $('#close-photo').addEventListener('click',closePhoto);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closePhoto();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePhoto();}});
  $('#zoom-in').addEventListener('click',()=>setZoom(zoom+.25));
  $('#zoom-out').addEventListener('click',()=>setZoom(zoom-.25));
  $('#zoom-reset').addEventListener('click',()=>setZoom(1));
  window.addEventListener('resize',()=>{if(dialog.open)setZoom(zoom);});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!dialog.open&&!$('#catalog-page').hidden&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
  fetch('data/books.json?v=20261024-core').then(response=>{if(!response.ok)throw new Error('书目未能载入');return response.json();}).then(data=>{
    priceGroups=data.priceGroups || [];exchangeRates=data.exchangeRates || {rates:{CNY:1}};books=data.books;categoryOrder=data.categoryOrder || [];seriesGroups=data.seriesGroups || [];summary();renderUsage();renderLanguages();renderRecent();categories();renderSeriesControls();renderCollection();route();window.addEventListener('hashchange',route);
  }).catch(()=>{
    $('#collection').setAttribute('aria-busy','false');$('#collection').innerHTML='<div class="error-state"><h2>书目暂时未能展开</h2><p>请检查网络后重试。如果在本地查看，请通过网页服务器打开。</p><button type="button" class="primary-button" id="retry-load">重新载入</button></div>';$('#retry-load').addEventListener('click',()=>location.reload());
  });
})();
