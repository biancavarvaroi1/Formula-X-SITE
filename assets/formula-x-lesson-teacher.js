(() => {
  'use strict';
  const FX=window.FormulaXLessons,e=FX.esc;
  let ctx=null,catalog={lessons:[],grants:[]},request=0,activeTarget=null,loadError='';
  const feedback=(text,error=false)=>{
    const node=document.getElementById('fxlt-feedback');
    if(node){node.textContent=text;node.className=`fxlt-feedback ${error?'error':'success'}`;}
  };
  function errorMessage(error={}) {
    const code=String(error.code||''),message=String(error.message||'');
    if(code==='PGRST202'||code==='42883')return 'Administrarea accesului nu este încă activată în Supabase. Rulează fișierul de activare, apoi reîncarcă portalul.';
    if(/^(Elevul |Permisiunea |Închiderea |Grupa |Nu poți |Autentificare |Acces profesor |Nu am putut confirma accesul salvat\.)/.test(message))return message;
    if(code==='42501')return 'Contul conectat nu are permisiunea de a administra această lecție sau grupă. Verifică autentificarea în contul profesorului.';
    if(code==='23505')return 'Există deja o regulă de acces pentru această selecție. Reîmprospătează portalul și reîncearcă.';
    if(error instanceof TypeError||/fetch|network|connection/i.test(message))return 'Conexiunea a fost întreruptă. Verifică internetul, apoi reîncearcă salvarea.';
    return `Salvarea accesului nu a reușit.${/^[A-Z0-9]{5,10}$/.test(code)?` Cod eroare: ${code}.`:''} Reîmprospătează portalul și reîncearcă.`;
  }
  function groupReadiness(group) {
    const ids=new Set(ctx.members.filter(m=>m.group_id===group.id).map(m=>m.enrollment_id));
    const members=ctx.students.filter(s=>ids.has(s.id));
    const active=members.filter(s=>s.status==='activ'&&!s.archived_at).length;
    return `<section class="fxlt-inherited"><strong>Elevii grupei: ${active} activi din ${members.length}.</strong>${!group.active?'<p>Grupa este inactivă. Elevii nu primesc acces printr-o grupă inactivă.</p>':''}${!members.length?'<p>Grupa nu are elevi. Adaugă elevii din butonul „Elevi” al grupei.</p>':''}${active<members.length?'<p>Elevii cu statut Nou, Inactiv sau Eliminat nu primesc acces prin grupă. Verifică statutul în fișa fiecărui elev.</p>':''}<details><summary>Verifică elevii și emailurile grupei</summary><ul>${members.map(s=>`<li>${e(s.full_name)} · ${e(s.email||'Email lipsă')} · ${s.archived_at?'Eliminat':s.status==='activ'?'Activ':s.status==='nou'?'Nou':'Inactiv'}</li>`).join('')}</ul></details><p>Elevul trebuie să folosească un cont cu emailul confirmat, identic cu emailul din fișa sa.</p></section>`;
  }
  function localTime(iso){
    if(!iso)return '';
    const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function groupCount(slug){return catalog.grants.filter(g=>g.lesson_slug===slug && g.group_id && g.enabled && ctx.groups.some(x=>x.id===g.group_id&&x.active)).length;}
  function render(){
    const target=document.getElementById('fxlt-content');if(!target||!ctx)return;
    const lessons=catalog.lessons.filter(l=>!ctx.subject||ctx.subject===l.subject);
    if(!lessons.length){target.innerHTML='<div class="empty">Nu sunt încă lecții disponibile pentru materia selectată.</div>';return;}
    target.innerHTML=`<div class="fxlt-cards">${lessons.map(l=>`<article class="fxlt-card"><span class="badge">${l.enabled?'Deschisă pentru elevii cu acces':'Accesul elevilor este oprit'}</span><h3>${e(l.title)}</h3><p>${FX.lessons.some(x=>x.slug===l.slug)?'Eseul 1 și eseul 2<br>':''}${groupCount(l.slug)} grupe cu lecția selectată${l.ready?'':'<br>Materialul este în curs de activare.'}</p><div class="actions"><a class="btn btn-soft btn-sm" href="${FX.lessonUrl(l.slug)}" target="_blank" rel="noopener">Vezi lecția</a><button class="btn btn-soft btn-sm" data-fxlt-action="choose" data-fxlt-slug="${e(l.slug)}">Acordă acces</button><button class="btn ${l.enabled?'btn-danger':'btn-primary'} btn-sm" data-fxlt-action="publication" data-fxlt-slug="${e(l.slug)}" data-fxlt-enabled="${l.enabled?'false':'true'}">${l.enabled?'Oprește pentru toți elevii':'Redeschide pentru elevi'}</button></div></article>`).join('')}</div><p class="fxlt-inherited">Folosește „Acces la lecții” din fișa elevului sau a grupei. Blocarea individuală are prioritate față de accesul grupei; „Preia accesul grupei” elimină excepția individuală.</p>`;
  }
  async function refresh(){
    if(!ctx)return false;
    const current=++request;
    try{
      const {data,error}=await ctx.sb.rpc('fx_teacher_lesson_catalog');
      if(error)throw error;
      if(current!==request)return false;
      loadError='';catalog=data||{lessons:[],grants:[]};render();return true;
    }catch(error){
      if(current!==request)return false;
      catalog={lessons:[],grants:[]};
      loadError=errorMessage(error);
      const target=document.getElementById('fxlt-content');
      if(target)target.innerHTML=`<div class="empty">${e(loadError)} Elevii și grupele existente pot fi gestionate în continuare.</div>`;
      return false;
    }
  }
  function grantFor(slug,type,id){
    return catalog.grants.find(g=>g.lesson_slug===slug && (type==='group'?g.group_id===id:(g.enrollment_ids||[]).includes(id)));
  }
  function inherited(slug,id){
    const groupIds=ctx.members.filter(m=>m.enrollment_id===id).map(m=>m.group_id);
    const rows=catalog.grants.filter(g=>g.lesson_slug===slug && g.enabled && groupIds.includes(g.group_id));
    const names=rows.map(row=>ctx.groups.find(g=>g.id===row.group_id)?.name).filter(Boolean);
    return names.length?`Grupă cu lecția selectată: ${names.join(', ')}.`:'Lecția nu este selectată în grupele acestui elev.';
  }
  function showTarget(type,id,focusSlug){
    const entity=(type==='group'?ctx.groups:ctx.students).find(x=>x.id===id);if(!entity)return;
    const lessons=catalog.lessons.filter(l=>l.subject===entity.subject);
    activeTarget={type,id};
    const title=type==='group'?entity.name:entity.full_name;
    const body=`<p>${type==='group'?'Alege lecțiile disponibile întregii grupe. Elevii adăugați ulterior preiau automat acest acces.':'Acordă acces direct sau lasă elevul să preia accesul grupei. Emailul contului trebuie să coincidă cu emailul din fișa elevului.'}</p>${type==='group'?groupReadiness(entity):`<p class="fxlt-inherited">Cont elev: ${e(entity.email||'Completează emailul în fișa elevului.')}${entity.status!=='activ'||entity.archived_at?'<br>Înscrierea nu este activă. Pentru acces prin grupă este necesar statutul Activ.':''}</p>`}${lessons.map(l=>{
      const grant=grantFor(l.slug,type,id);
      const mode=grant?(grant.enabled?'enabled':'disabled'):(type==='student'?'inherit':'disabled');
      return `<section class="fxlt-rule" data-fxlt-rule="${e(l.slug)}"><h3>${e(l.title)}</h3>${focusSlug===l.slug?'<span class="badge">Lecția selectată</span>':''}<label class="fxlt-mode">Acces<select data-fxlt-mode><option value="enabled" ${mode==='enabled'?'selected':''}>Permite accesul</option><option value="disabled" ${mode==='disabled'?'selected':''}>Blochează accesul</option>${type==='student'?`<option value="inherit" ${mode==='inherit'?'selected':''}>Preia accesul grupei</option>`:''}</select></label><div class="fxlt-dates"><label>Se deschide la<input type="datetime-local" data-fxlt-start value="${e(localTime(grant?.starts_at))}"></label><label>Se închide la<input type="datetime-local" data-fxlt-end value="${e(localTime(grant?.ends_at))}"></label></div>${type==='student'?`<p class="fxlt-inherited">${e(inherited(l.slug,id))}</p>`:''}<div class="actions"><button class="btn btn-primary btn-sm" data-fxlt-action="now" data-fxlt-slug="${e(l.slug)}">Dă acces acum</button><button class="btn btn-danger btn-sm" data-fxlt-action="stop" data-fxlt-slug="${e(l.slug)}">Oprește accesul</button></div></section>`;
    }).join('')}<p class="fxlt-inherited">Fără dată de deschidere = acces imediat. Fără dată de închidere = acces fără termen. Orele folosesc fusul dispozitivului tău (${e(Intl.DateTimeFormat().resolvedOptions().timeZone)}).</p><div id="fxlt-feedback" class="fxlt-feedback" role="status"></div>`;
    ctx.openModal(`Acces la lecții · ${title}`,body,`<button class="btn btn-soft" data-fx-action="closeModal">Închide</button><button class="btn btn-primary" data-fxlt-action="save" ${lessons.length?'':'disabled'}>Salvează accesul</button>`);
    if(!lessons.length)feedback('Nu sunt încă lecții pentru această materie.',true);
  }
  async function openTarget(type,id,focusSlug){
    if(!ctx)return;
    if(!await refresh()){ctx.openModal('Acces la lecții',`<p>${e(loadError||'Reîncarcă portalul și verifică autentificarea.')}</p>`,'<button class="btn btn-soft" data-fx-action="closeModal">Închide</button>');return;}
    showTarget(type,id,focusSlug);
  }
  function choose(slug){
    const lesson=catalog.lessons.find(l=>l.slug===slug);if(!lesson)return;
    const groups=ctx.groups.filter(g=>g.subject===lesson.subject&&g.active);
    const students=ctx.students.filter(s=>s.subject===lesson.subject&&!s.archived_at);
    ctx.openModal(`Acordă acces · ${lesson.title}`,`<div class="field"><label>Grupă</label><select id="fxlt-group"><option value="">Alege grupa</option>${groups.map(g=>`<option value="${e(g.id)}">${e(g.name)}</option>`).join('')}</select></div><div class="field"><label>Sau elev individual</label><select id="fxlt-student"><option value="">Alege elevul</option>${students.map(s=>`<option value="${e(s.id)}">${e(s.full_name)} · ${e(s.email)}</option>`).join('')}</select></div><div id="fxlt-feedback" class="fxlt-feedback" role="status"></div>`,`<button class="btn btn-soft" data-fx-action="closeModal">Închide</button><button class="btn btn-primary" data-fxlt-action="target" data-fxlt-slug="${e(slug)}">Alege lecțiile și perioada</button>`);
  }
  function createLesson(){
    const subjects={romana:'Română',matematica:'Matematică',biologie:'Biologie',chimie:'Chimie',fizica:'Fizică',geografie:'Geografie',logica:'Logică'};
    const options=Object.entries(subjects).filter(([id])=>ctx.staff.role==='admin'||ctx.staff.subject===id);
    ctx.openModal('Adaugă o lecție',`<div class="field"><label>Materia</label><select id="fxlt-new-subject">${options.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></div><div class="field"><label>Titlu</label><input id="fxlt-new-title" maxlength="200" required></div><div class="field"><label>Descriere scurtă</label><input id="fxlt-new-summary"></div><div class="field"><label>Conținut</label><textarea id="fxlt-new-body" rows="10" required></textarea></div><p class="fxlt-inherited">După salvare, alegi elevii sau grupele care primesc acces.</p><div id="fxlt-feedback" class="fxlt-feedback" role="status"></div>`,`<button class="btn btn-soft" data-fx-action="closeModal">Renunță</button><button class="btn btn-primary" data-fxlt-action="create-save">Salvează lecția</button>`);
  }
  function collectRules(){
    return [...document.querySelectorAll('[data-fxlt-rule]')].map(node=>{
      const mode=node.querySelector('[data-fxlt-mode]').value;
      const start=node.querySelector('[data-fxlt-start]').value,end=node.querySelector('[data-fxlt-end]').value;
      const startsAt=start?new Date(start).toISOString():null,endsAt=end?new Date(end).toISOString():null;
      if(startsAt&&endsAt&&endsAt<=startsAt)throw new Error('Închiderea trebuie să fie după deschidere.');
      return {slug:node.dataset.fxltRule,mode,startsAt,endsAt};
    });
  }
  async function save(rules,button){
    if(!activeTarget||!ctx)return;
    const target={...activeTarget};button.disabled=true;feedback('Se salvează accesul…');
    try{
      const {error}=await ctx.sb.rpc('fx_save_lesson_access',{p_target_type:target.type,p_target_id:target.id,p_rules:rules});if(error)throw error;
      if(!await refresh())throw new Error('Nu am putut confirma accesul salvat. Reîmprospătează portalul.');
      showTarget(target.type,target.id);feedback('Accesul a fost salvat.');
    }catch(error){feedback(errorMessage(error),true);}finally{button.disabled=false;}
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-fxlt-action]');if(!button||!ctx)return;
    event.preventDefault();const action=button.dataset.fxltAction,slug=button.dataset.fxltSlug;
    try{
      if(action==='student'||action==='group'){await openTarget(action,button.dataset.fxltId);return;}
      if(action==='choose'){choose(slug);return;}
      if(action==='create'){createLesson();return;}
      if(action==='create-save'){
        const title=document.getElementById('fxlt-new-title').value.trim(),body=document.getElementById('fxlt-new-body').value;
        if(title.length<2||!body.trim()){feedback('Completează titlul și conținutul lecției.',true);return;}
        button.disabled=true;
        const {error}=await ctx.sb.rpc('fx_create_lesson',{p_subject:document.getElementById('fxlt-new-subject').value,p_title:title,p_summary:document.getElementById('fxlt-new-summary').value.trim(),p_body:body});
        if(error)throw error;
        ctx.closeModal();await refresh();ctx.portalNotice?.('Lecția a fost creată. Alege acum elevii sau grupele care primesc acces.');return;
      }
      if(action==='target'){
        const group=document.getElementById('fxlt-group').value,student=document.getElementById('fxlt-student').value;
        if(Boolean(group)===Boolean(student)){feedback('Alege fie o grupă, fie un elev.',true);return;}
        showTarget(group?'group':'student',group||student,slug);return;
      }
      if(action==='save'){await save(collectRules(),button);return;}
      if(action==='now'||action==='stop'){await save([{slug,mode:action==='now'?'enabled':'disabled',startsAt:null,endsAt:null}],button);return;}
      if(action==='publication'){
        button.disabled=true;
        const {error}=await ctx.sb.rpc('fx_set_lesson_enabled',{p_slug:slug,p_enabled:button.dataset.fxltEnabled==='true'});if(error)throw error;
        await refresh();return;
      }
    }catch(error){const message=errorMessage(error);feedback(message,true);ctx.portalNotice?.(message);}finally{button.disabled=false;}
  });
  window.FormulaXLessonTeacher={
    mount(context){ctx=context;refresh();},refresh,
    reset(){ctx=null;catalog={lessons:[],grants:[]};activeTarget=null;loadError='';request++;const node=document.getElementById('fxlt-content');if(node)node.replaceChildren();},
  };
})();
