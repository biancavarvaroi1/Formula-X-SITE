(() => {
  'use strict';
  const lessons = [
    {slug:'harap-alb',title:'Povestea lui Harap-Alb',author:'Ion Creangă',cover:'/assets/lessons/harap-alb/coperta.webp',character:'Harap-Alb'},
    {slug:'moara-cu-noroc',title:'Moara cu noroc',author:'Ioan Slavici',cover:'/assets/lessons/moara-cu-noroc/coperta.webp',character:'Ghiță'},
    {slug:'ultima-noapte',title:'Ultima noapte de dragoste, întâia noapte de război',author:'Camil Petrescu',cover:'/assets/lessons/ultima-noapte/coperta.webp?v=20261111',character:'Ștefan Gheorghidiu'},
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Covers are public catalog artwork, separate from protected lesson contents.
  const covers = [
    {key:'harap-alb',subject:'romana',cover:lessons[0].cover,author:'Ion Creangă',alt:'Harap-Alb și calul său pe drumul spre împărăție'},
    {key:'moara-cu-noroc',subject:'romana',cover:lessons[1].cover,author:'Ioan Slavici',alt:'Ilustrație pentru nuvela Moara cu noroc'},
    {key:'ultima-noapte',subject:'romana',cover:lessons[2].cover,author:'Camil Petrescu',alt:'Ștefan Gheorghidiu între experiența iubirii și cea a războiului'},
    {key:'ion',subject:'romana',cover:'/assets/lessons/ion/Eseul_1_04_Scena_2_Sarutarea_pamantului.webp',author:'Liviu Rebreanu',alt:'Ion și pământul, simbolul patimii sale'},
    {key:'baltagul',subject:'romana',cover:'/assets/lessons/baltagul/vitoria.webp',author:'Mihail Sadoveanu',alt:'Vitoria Lipan, protagonista romanului Baltagul'},
    {key:'plumb',subject:'romana',cover:'/assets/lessons/plumb/coperta.webp?v=20261111',author:'George Bacovia',alt:'Cavou, sicriu de plumb și flori cenușii în lumina rece'},
    {key:'luceafarul',subject:'romana',cover:'/assets/lessons/luceafarul/coperta.webp?v=20261111',author:'Mihai Eminescu',alt:'Fata de împărat privește Luceafărul de la fereastra castelului'},
    {key:'progresii',subject:'matematica',cover:'/assets/lesson-covers/progresii.svg',alt:'Șir de trepte și puncte care sugerează creșterea unei progresii'},
  ];
  const coverSubjects = ['romana','matematica','biologie','chimie','fizica','geografie','logica'];
  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  function safeCover(value) {
    if (typeof value !== 'string') return '';
    const url = value.trim();
    return /^(?:\/(?!\/)[^\s\\]*|https:\/\/[^\s\\]+)$/i.test(url) ? url : '';
  }
  function coverInfo(item = {}) {
    const subject = normalize(item.subject);
    // Match titles as well: newly imported lessons can have server-generated slugs.
    const slug = normalize(item.slug), title = normalize(item.title);
    const identity = '-'+slug+'-'+title+'-';
    const known = covers.find(c => (!subject || subject === c.subject) && (c.key === 'ion'
      ? slug === 'ion' || slug.startsWith('ion-') || title === 'ion' || title.startsWith('ion-')
      : identity.includes('-'+c.key+'-')));
    const fallback = '/assets/lesson-covers/'+(coverSubjects.includes(subject) ? subject : 'general')+'.svg';
    return {
      cover:safeCover(item.cover_url) || safeCover(item.cover) || known?.cover || fallback,
      fallback,
      author:item.author || known?.author || 'Formula X',
      alt:known?.alt || 'Ilustrație pentru '+(item.title || 'lecție'),
    };
  }
  function coverMarkup(item) {
    const art = coverInfo(item);
    return `<div class="fxl-cover"><img data-fxl-cover data-fxl-fallback="${esc(art.fallback)}" src="${esc(art.cover)}" alt="${esc(art.alt)}" loading="lazy" decoding="async" width="900" height="900" style="width:100%;height:100%;object-fit:contain;object-position:center"></div>`;
  }
  function recoverCover(event) {
    const img = event.target;
    if (!img?.hasAttribute?.('data-fxl-cover')) return;
    const fallback = img.getAttribute('data-fxl-fallback');
    if (fallback && img.getAttribute('src') !== fallback) {
      img.setAttribute('src',fallback);
      return;
    }
    // A small inline book also works when a fallback file cannot be loaded.
    const frame = img.parentElement;
    if (frame) frame.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="Carte deschisă"><path fill="#f2e8dc" d="M0 0h400v300H0z"/><g fill="#fffcf6" stroke="#795660" stroke-width="5" stroke-linejoin="round"><path d="M200 90Q130 50 55 80v150q75-30 145 10Z"/><path d="M200 90q70-40 145-10v150q-75-30-145 10Z"/></g><path d="M200 90v150" stroke="#795660" stroke-width="4"/></svg>';
  }
  document.addEventListener?.('error',recoverCover,true);
  let client;
  function sb() {
    if (window.FormulaXAuthClient) return window.FormulaXAuthClient;
    if (!client) client = window.supabase.createClient('https://vooflhvdoutjplfbnahl.supabase.co','sb_publishable_iuJBis3q_83zNlYFER2AXQ_o8gzpDPA',{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'},
    });
    return client;
  }
  async function rpc(name, params) {
    const {data,error} = await sb().rpc(name,params);
    if (error) throw error;
    return data;
  }
  async function linkAccount() {
    const {data:{session}}=await sb().auth.getSession();
    if(session)await rpc('fx_link_my_enrollments');
  }
  function lessonUrl(slug) {
    if(slug==='ion'||slug==='baltagul'||slug==='ultima-noapte')return `/lectii/romana/${slug}.html`;
    return lessons.some(l=>l.slug===slug)?`/lectii/romana/${slug}.html`:`/cursuri/lectie.html?slug=${encodeURIComponent(slug)}`;
  }
  function editorUrl(slug){
    const url=lessonUrl(slug);
    return url+(url.includes('?')?'&':'?')+'editor=1';
  }
  function canEditLesson(staff,lesson){
    return !!staff&&(staff.role==='admin'||(staff.role==='mentor'&&staff.subject===lesson.subject));
  }
  function date(value) {
    if (!value || !Number.isFinite(new Date(value).getTime())) return '';
    return new Intl.DateTimeFormat('ro-RO',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  }
  function stateLabel(access = {}) {
    const labels = {active:'Acces activ',teacher:'Previzualizare profesor',demo:'Lecție publică',scheduled:'Acces programat',expired:'Acces încheiat',paused:'Lecție oprită',login:'Conectează-te',unavailable:'În curs de activare',locked:'Acces acordat de profesor'};
    return labels[access.state] || 'Acces acordat de profesor';
  }
  function catalogMarkup(rows,subject,staff=null) {
    const items=Array.isArray(rows)?rows.filter(row=>!subject||row.subject===subject):lessons.map(l=>({...l,subject:'romana'})).filter(row=>!subject||row.subject===subject);
    return items.map(item => {
      const fixed=lessons.find(l=>l.slug===item.slug);
      const lesson={...item,...coverInfo(item)};
      const access = item?.access || {state:'locked',allowed:false};
      const note = access.state==='scheduled' ? `Se deschide la ${date(access.startsAt)}.` : access.allowed ? (fixed?'Ai acces la ambele eseuri și la toate imaginile lecției.':'Lecția este disponibilă pentru contul tău.') : 'Profesorul acordă acces individual sau prin grupa din care faci parte.';
      const edit=canEditLesson(staff,lesson)?`<a class="fxl-btn secondary" style="margin-top:10px" href="${editorUrl(lesson.slug)}">✎ Editează lecția</a>`:'';
      return `<article class="fxl-course">${coverMarkup(lesson)}<div class="fxl-course-copy"><span class="fxl-badge ${esc(access.state)}">${esc(stateLabel(access))}</span><h3>${esc(lesson.title)}</h3><span class="fxl-note">${esc(lesson.author)}${fixed?' · 2 eseuri · scheme vizuale':''}</span><p>${esc(note)}</p><a class="fxl-btn" href="${lessonUrl(lesson.slug)}">${access.allowed?'Deschide lecția':'Vezi accesul la lecție'} →</a>${edit}</div></article>`;
    }).join('') || '<p class="fxl-note">Nu sunt încă lecții pentru materia selectată.</p>';
  }
  let catalogRequest=0;
  async function refreshCatalog() {
    const request=++catalogRequest;
    const targets = document.querySelectorAll('[data-fxl-catalog]');
    if (!targets.length) return;
    let rows=[],staff=null;
    try {
      await linkAccount();
      rows=await rpc('fx_lesson_catalog');
      const {data:{session}}=await sb().auth.getSession();
      if(session){try{const data=await rpc('get_my_staff_profile');staff=Array.isArray(data)?data[0]:data;}catch{}}
    } catch {
      if(request!==catalogRequest)return;
      targets.forEach(el => {el.innerHTML=catalogMarkup(undefined,el.dataset.fxlSubject);});
      return;
    }
    if(request!==catalogRequest)return;
    targets.forEach(el => {el.innerHTML=catalogMarkup(Array.isArray(rows)?rows:[],el.dataset.fxlSubject,staff);});
  }
  function decode(value) {
    const raw=atob(value), bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
    return bytes;
  }
  async function decryptBundle(slug,version,key) {
    if (!lessons.some(l=>l.slug===slug) || !/^[a-f0-9]{64}$/.test(version)) throw new Error('Material invalid');
    const response=await fetch(`/assets/lessons/${slug}.${version}.fxb`,{credentials:'omit'});
    if(!response.ok) throw new Error('Material indisponibil');
    const bytes=new Uint8Array(await response.arrayBuffer());
    const cryptoKey=await crypto.subtle.importKey('raw',decode(key),'AES-GCM',false,['decrypt']);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12),additionalData:new TextEncoder().encode(`FormulaX|${slug}|${version}`)},cryptoKey,bytes.slice(12));
    const unpacked=await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const bundle=JSON.parse(new TextDecoder().decode(unpacked));
    if(bundle.slug!==slug || !bundle.essays?.particularitati || !bundle.essays?.caracterizare) throw new Error('Material invalid');
    return bundle;
  }
  window.FormulaXLessons={lessons,esc,sb,rpc,linkAccount,lessonUrl,editorUrl,canEditLesson,date,stateLabel,coverInfo,coverMarkup,catalogMarkup,refreshCatalog,decode,decryptBundle};
  document.querySelectorAll('[data-fxl-catalog]').forEach(el=>{el.innerHTML=catalogMarkup(undefined,el.dataset.fxlSubject);});
  if(document.querySelector('[data-fxl-catalog]')) {
    refreshCatalog();
    sb().auth.onAuthStateChange(()=>{setTimeout(refreshCatalog,0);});
    window.addEventListener('pageshow',refreshCatalog);
  }
})();

