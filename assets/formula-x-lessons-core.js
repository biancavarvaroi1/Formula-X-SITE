(() => {
  'use strict';
  const lessons = [
    {slug:'harap-alb',title:'Povestea lui Harap-Alb',author:'Ion Creangă',cover:'/assets/lessons/harap-alb/coperta.webp',character:'Harap-Alb'},
    {slug:'moara-cu-noroc',title:'Moara cu noroc',author:'Ioan Slavici',cover:'/assets/lessons/moara-cu-noroc/coperta.webp',character:'Ghiță'},
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    if(slug==='ion'||slug==='baltagul')return `/lectii/romana/${slug}.html`;
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
      const lesson={...item,author:fixed?.author||'Formula X',cover:fixed?.cover};
      const access = item?.access || {state:'locked',allowed:false};
      const note = access.state==='scheduled' ? `Se deschide la ${date(access.startsAt)}.` : access.allowed ? (fixed?'Ai acces la ambele eseuri și la toate imaginile lecției.':'Lecția este disponibilă pentru contul tău.') : 'Profesorul acordă acces individual sau prin grupa din care faci parte.';
      const edit=canEditLesson(staff,lesson)?`<a class="fxl-btn secondary" style="margin-top:10px" href="${editorUrl(lesson.slug)}">✎ Editează lecția</a>`:'';
      return `<article class="fxl-course">${lesson.cover?`<div class="fxl-cover"><img src="${lesson.cover}" alt="${esc(lesson.title)} — o singură ilustrație" loading="lazy" width="1254" height="1254"></div>`:'<div class="fxl-cover fxl-cover-text" aria-hidden="true">Formula <span>X</span></div>'}<div class="fxl-course-copy"><span class="fxl-badge ${esc(access.state)}">${esc(stateLabel(access))}</span><h3>${esc(lesson.title)}</h3><span class="fxl-note">${esc(lesson.author)}${fixed?' · 2 eseuri · scheme vizuale':''}</span><p>${esc(note)}</p><a class="fxl-btn" href="${lessonUrl(lesson.slug)}">${access.allowed?'Deschide lecția':'Vezi accesul la lecție'} →</a>${edit}</div></article>`;
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
  window.FormulaXLessons={lessons,esc,sb,rpc,linkAccount,lessonUrl,editorUrl,canEditLesson,date,stateLabel,catalogMarkup,refreshCatalog,decode,decryptBundle};
  document.querySelectorAll('[data-fxl-catalog]').forEach(el=>{el.innerHTML=catalogMarkup(undefined,el.dataset.fxlSubject);});
  if(document.querySelector('[data-fxl-catalog]')) {
    refreshCatalog();
    sb().auth.onAuthStateChange(()=>{setTimeout(refreshCatalog,0);});
    window.addEventListener('pageshow',refreshCatalog);
  }
})();
