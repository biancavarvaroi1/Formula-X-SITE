(() => {
  'use strict';
  const FX=window.FormulaXLessons, root=document.getElementById('fxl-content');
  const slug=document.body.dataset.lesson||new URLSearchParams(location.search).get('slug');
  let meta=FX.lessons.find(l=>l.slug===slug)||{slug,title:'Lecție Formula X',author:'Formula X'};
  const e=FX.esc;
  let bundle=null,version=null,assetUrls={},sequence=0,heartbeat=null,expiryTimer=null;
  let account=null;
  function clearMaterial() {
    bundle=null;version=null;
    for(const url of Object.values(assetUrls)) URL.revokeObjectURL(url);
    assetUrls={};
    clearTimeout(expiryTimer);
    const dialog=document.getElementById('fxl-zoom');
    dialog?.close();
    if(dialog) dialog.querySelector('img').removeAttribute('src');
    root.replaceChildren();
  }
  function status(access={},message,context={}) {
    clearMaterial();
    const titles={login:'Conectează-te la Formula X',scheduled:'Acces programat',expired:'Perioada de acces s-a încheiat',paused:'Profesorul a oprit accesul',locked:'Lecție protejată',unavailable:'Lecția este în curs de activare',missing:'Lecția nu a fost găsită',error:'Nu am putut verifica accesul'};
    const descriptions={scheduled:`Lecția se deschide automat la ${FX.date(access.startsAt)}.`,locked:'Bianca îți poate acorda acces direct sau prin grupa ta. Folosește contul cu emailul pe care i l-ai comunicat.',expired:'Profesorul poate prelungi perioada de acces.',paused:'Revino după ce profesorul redeschide lecția.',unavailable:'Materialul este pregătit. Activarea accesului se finalizează în Formula X.',login:'Folosește același cont pe care îl ai pe site.'};
    let detail='';
    if(access.state==='locked') {
      if(context.enrolled===false) detail='Contul acesta nu este asociat unei înscrieri active la Română. Pentru acces prin grupă, profesorul verifică emailul din fișa elevului, statutul Activ și apartenența la grupa cu acces.';
      if(context.enrolled===true) detail='Înscrierea ta la Română este activă. Profesorul verifică dacă ești în grupa căreia i-a acordat această lecție, dacă grupa este activă și dacă accesul individual este setat pe „Preia accesul grupei”.';
      if(account?.email_confirmed_at===null) detail='Emailul acestui cont nu este confirmat. Confirmă contul prin mesajul primit pe email, apoi verifică din nou accesul.';
    }
    root.innerHTML=`<section class="fxl-status"><p class="fxl-eyebrow">${e(meta.title)}</p><h1>${e(titles[access.state]||titles.locked)}</h1>${account?.email&&access.state!=='login'?`<p class="fxl-note">Cont conectat: <strong>${e(account.email)}</strong></p>`:''}<p>${e(message||descriptions[access.state]||'Reîncearcă verificarea accesului.')}</p>${detail?`<p class="fxl-note" role="status">${e(detail)}</p>`:''}${access.state==='login'?`<form id="fxl-login" class="fxl-login"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Parolă<input name="password" type="password" autocomplete="current-password" required></label><button class="fxl-btn" type="submit">Intră în cont</button><p id="fxl-login-message" class="fxl-error" role="status"></p><a class="fxl-login-link" href="/parola-uitata/">Ai uitat parola?</a><a class="fxl-login-link" href="/#cont">Creează un cont Formula X</a></form>`:''}<div class="fxl-actions" style="justify-content:center"><button class="fxl-btn secondary" data-fxl-action="retry" type="button">Verifică accesul</button>${account&&access.state!=='login'?'<button class="fxl-btn secondary" data-fxl-action="switch-account" type="button">Schimbă contul</button>':''}<a class="fxl-btn secondary" href="/lectii/romana/">Toate lecțiile</a></div></section>`;
  }
  function image(src,alt) {
    const url=assetUrls[src] || (src.endsWith('/coperta.png')?meta.cover:'');
    if(!url) return '';
    return `<figure class="fxl-image"><button type="button" data-fxl-image="${e(src)}" aria-label="Mărește imaginea: ${e(alt)}"><img src="${e(url)}" alt="${e(alt)}" loading="lazy"></button><figcaption>Apasă pe imagine pentru mărire</figcaption></figure>`;
  }
  function points(list,numbered=false) {
    return `<${numbered?'ol':'ul'} class="fxl-points">${list.map((point,index)=>`<li><span aria-hidden="true">${numbered?index+1:'✓'}</span><span>${e(point)}</span></li>`).join('')}</${numbered?'ol':'ul'}>`;
  }
  function heading(step,title,description) {
    return `<div class="fxl-section-head"><div><p class="fxl-eyebrow">${e(step)}</p><h2>${e(title)}</h2></div><p>${e(description)}</p></div>`;
  }
  function card(item) {
    return `<article class="fxl-card">${image(item.image,item.alt)}<div class="fxl-card-copy"><p class="fxl-eyebrow">${e(item.eyebrow)}</p><h3>${e(item.title)}</h3>${points(item.points)}<p class="fxl-takeaway">${e(item.takeaway)}</p></div></article>`;
  }
  function render(access) {
    if(Object.hasOwn(bundle,'text')){
      root.innerHTML=`<p class="fxl-expiry">${access.endsAt?`Ai acces până la ${e(FX.date(access.endsAt))}.`:'Acces acordat de profesor.'}</p><article class="fxl-text-course"><p class="fxl-eyebrow">${e(bundle.subject)}</p><h1>${e(bundle.title)}</h1><div class="fxl-text-body">${e(bundle.text)}</div></article>`;
      return;
    }
    const selected=new URLSearchParams(location.search).get('eseu')==='caracterizare'?'caracterizare':'particularitati';
    const lesson=bundle.essays[selected];
    const names=lesson.reperNames||['Statutul personajului','Scene semnificative','Construcția personajului'];
    root.innerHTML=`<nav class="fxl-essay-nav" aria-label="Alege eseul">${[
      ['particularitati','Eseul 1 · Particularități de construcție ale operei','Două trăsături · tema · două scene · elemente de construcție'],
      ['caracterizare',`Eseul 2 · Caracterizarea lui ${meta.character}`,'Statut · trăsătura dominantă · două scene · caracterizare'],
    ].map(([id,title,detail])=>`<a href="?eseu=${id}" data-fxl-essay="${id}" ${selected===id?'aria-current="page"':''}><strong>${e(title)}</strong><span>${e(detail)}</span></a>`).join('')}</nav>
    <p id="fxl-expiry" class="fxl-expiry">${access.state==='teacher'?'Previzualizare profesor · accesul elevilor se gestionează din portal.':access.endsAt?`Ai acces până la ${e(FX.date(access.endsAt))}.`:'Acces acordat de profesor.'}</p>
    <section class="fxl-hero"><div class="fxl-hero-copy"><div class="fxl-labels"><span class="fxl-badge">${e(lesson.label)}</span><span class="fxl-badge active">Schemă vizuală</span></div><p class="fxl-eyebrow">${e(meta.author)}</p><p class="fxl-eyebrow">Introducere</p><h1>${e(lesson.essayTitle)}</h1><p>${e(lesson.intro)}</p><div class="fxl-key"><small>${e(lesson.keyLabel||'Trăsătura dominantă')}</small><strong>${e(lesson.keyIdea)}</strong><span>${e(lesson.secondaryIdea)}</span></div></div>${image(lesson.heroImage,lesson.heroAlt)}</section>
    <nav class="fxl-toc" aria-label="Cuprins">${names.map((name,index)=>`<a href="#reper-${index+1}"><small>Reper ${index+1}</small><strong>${e(name)}</strong></a>`).join('')}</nav>
    <section id="reper-1" class="fxl-section">${heading('Reper 1',lesson.firstReperTitle||'Statutul social, moral și psihologic',lesson.firstReperDescription||'Reține traseul personajului, apoi explicațiile pentru fiecare statut.')}<div class="fxl-grid ${lesson.statusCards.length===3?'three':''}">${lesson.statusCards.map(card).join('')}</div></section>
    <section class="fxl-memory"><p class="fxl-eyebrow">Ideea care leagă întregul eseu</p><strong>${e(lesson.keyIdea)}</strong><p>${e(lesson.memoryLine)}</p>${lesson.keyExplanation?`<p>${e(lesson.keyExplanation)}</p>`:''}</section>
    <section id="reper-2" class="fxl-section">${heading('Reper 2','Două scene semnificative',lesson.sceneDescription||`Ambele scene demonstrează trăsătura dominantă: ${lesson.keyIdea.toLocaleLowerCase('ro-RO')}.`)}<div class="fxl-grid">${lesson.scenes.map(scene=>`<article class="fxl-card">${image(scene.image,scene.alt)}<div class="fxl-card-copy"><p class="fxl-eyebrow">${e(scene.number)} · ${e(scene.chapter)}</p><h3>${e(scene.title)}</h3>${points(scene.points,true)}<div class="fxl-relevance"><p class="fxl-eyebrow">Relevanță</p><p>${e(scene.relevance)}</p></div></div></article>`).join('')}</div></section>
    <section id="reper-3" class="fxl-section">${heading('Reper 3',lesson.structureTitle||'Elemente de construcție a personajului',lesson.structureDescription||'Leagă trăsăturile de mijloacele de caracterizare, de nume și de conflicte.')}<div class="fxl-grid">${lesson.structureCards.map(card).join('')}</div></section>
    <section class="fxl-conclusion"><div class="fxl-conclusion-label">Concluzie</div><p>${e(lesson.conclusion)}</p></section>`;
  }
  async function verify() {
    const request=++sequence;
    try {
      const {data:{session}}=await FX.sb().auth.getSession();
      if(request!==sequence)return;
      account=session?.user||null;
      if(!session&&FX.lessons.some(l=>l.slug===slug)){status({state:'login'});return;}
      if(session)await FX.linkAccount();
      const result=await FX.rpc('fx_open_lesson',{p_slug:slug});
      if(request!==sequence)return;
      if(!result?.access?.allowed || (!result.key&&result.format!=='text')) {
        let enrolled;
        if(result?.access?.state==='locked'&&account?.id&&FX.lessons.some(l=>l.slug===slug)) {
          try {const checked=await FX.rpc('fx_student_is_enrolled',{p_student:account.id,p_subject:'romana'});if(typeof checked==='boolean')enrolled=checked;} catch {}
          if(request!==sequence)return;
        }
        status(result?.access||{state:'locked'},undefined,{enrolled});return;
      }
      if(result.format==='text'){
        meta={...meta,title:result.title};
        if(!bundle||bundle.text!==result.body){clearMaterial();bundle={text:result.body,title:result.title,subject:result.subject};version='text';render(result.access);}
      }
      else if(!bundle || version!==result.version) {
        const next=await FX.decryptBundle(slug,result.version,result.key);
        if(request!==sequence)return;
        clearMaterial(); bundle=next; version=result.version;
        for(const [path,asset] of Object.entries(bundle.assets||{})) {
          if(asset.type!=='image/webp') throw new Error('Format de imagine invalid');
          assetUrls[path]=URL.createObjectURL(new Blob([FX.decode(asset.data)],{type:asset.type}));
        }
        render(result.access);
      } else {
        const note=document.getElementById('fxl-expiry');
        if(note)note.textContent=result.access.endsAt?`Ai acces până la ${FX.date(result.access.endsAt)}.`:result.access.state==='teacher'?'Previzualizare profesor · accesul elevilor se gestionează din portal.':'Acces acordat de profesor.';
      }
      clearTimeout(expiryTimer);
      if(result.access.endsAt){const remaining=new Date(result.access.endsAt).getTime()-Date.now();expiryTimer=setTimeout(verify,remaining>0?Math.min(2147483647,remaining+50):60000);}
    } catch(error) {if(request===sequence)status({state:error.code==='PGRST202'||error.code==='42883'?'unavailable':'error'},error.code==='PGRST202'||error.code==='42883'?undefined:'Verifică conexiunea și încearcă din nou.');}
  }
  document.addEventListener('click',async event=>{
    const retry=event.target.closest('[data-fxl-action="retry"]'); if(retry){verify();return;}
    const switchAccount=event.target.closest('[data-fxl-action="switch-account"]');
    if(switchAccount){
      event.preventDefault();switchAccount.disabled=true;
      try {const {error}=await FX.sb().auth.signOut();if(error)throw error;sequence++;account=null;status({state:'login'});} catch {status({state:'error'},'Nu am putut schimba contul. Reîncearcă.');}
      return;
    }
    const tab=event.target.closest('[data-fxl-essay]');
    if(tab && bundle){event.preventDefault();history.pushState(null,'',`?eseu=${tab.dataset.fxlEssay}`);render({state:'active'});verify();window.scrollTo({top:0,behavior:'smooth'});return;}
    const picture=event.target.closest('[data-fxl-image]');
    if(picture && bundle){const dialog=document.getElementById('fxl-zoom');const img=dialog.querySelector('img');img.src=assetUrls[picture.dataset.fxlImage] || meta.cover;img.alt=picture.querySelector('img').alt;dialog.showModal();}
  });
  document.getElementById('fxl-zoom-close').addEventListener('click',()=>document.getElementById('fxl-zoom').close());
  document.getElementById('fxl-zoom').addEventListener('click',event=>{if(event.target.id==='fxl-zoom')event.target.close();});
  document.addEventListener('submit',async event=>{
    if(event.target.id!=='fxl-login')return;
    event.preventDefault(); const form=event.target,btn=form.querySelector('button'),msg=form.querySelector('[role="status"]');
    btn.disabled=true;msg.textContent='';
    try {
      const {error}=await FX.sb().auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});
      form.elements.password.value='';
      if(error){msg.textContent='Conectarea nu a reușit. Verifică emailul, parola și confirmarea contului.';return;}
      await verify();
    } catch {msg.textContent='Nu am putut realiza conectarea. Reîncearcă.';} finally {btn.disabled=false;}
  });
  FX.sb().auth.onAuthStateChange((event)=>{
    if(event==='SIGNED_OUT'){sequence++;account=null;status({state:'login'});}
    else setTimeout(verify,0);
  });
  window.addEventListener('popstate',()=>{if(bundle)render({state:'active'});verify();});
  window.addEventListener('focus',verify);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)verify();});
  window.addEventListener('pagehide',()=>{sequence++;clearMaterial();clearInterval(heartbeat);heartbeat=null;});
  window.addEventListener('pageshow',()=>{if(!heartbeat)heartbeat=setInterval(verify,60000);verify();});
  heartbeat=setInterval(verify,60000);verify();
})();
