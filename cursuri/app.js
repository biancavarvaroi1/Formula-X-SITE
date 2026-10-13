(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const message = text => { $('notice').textContent = text || ''; };
  if (!window.supabase || !window.FX_SUPABASE_URL || !window.FX_SUPABASE_ANON_KEY || window.FX_SUPABASE_URL.includes('PROJECT')) {
    message('Configurare lipsă: completează cursuri/config.js folosind datele Supabase din site-ul existent.'); return;
  }
  const sb = window.supabase.createClient(window.FX_SUPABASE_URL, window.FX_SUPABASE_ANON_KEY);
  let user = null, staff = null, lessons = [], groups = [], activeLesson = null;
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString(36);
  const timestamp = s => s ? new Date(s).toISOString() : null;
  const box = (el, show) => el.classList.toggle('hidden', !show);
  const request = async promise => {const {data,error} = await promise; if(error) throw error; return data;};
  async function initialize() {
    const {data:{session}}=await sb.auth.getSession(); user=session?.user||null;
    if(user){ const rows=await request(sb.rpc('get_my_staff_profile')); staff=rows?.[0]||null; }
    $('identity').textContent=user ? 'Conectat: '+user.email : 'Poți citi gratuit lecțiile demonstrative.';
    box($('authSection'),!user); box($('teacher'),!!staff);
    if(staff){$('lessonSubject').value=staff.subject||'romana'; $('lessonSubject').disabled=staff.role!=='admin'; }
    await loadLessons(); if(staff) await loadGroups();
  }
  async function loadLessons(){
    lessons=await request(sb.from('fx_lessons').select('*').order('sort_order').order('created_at',{ascending:false}));
    const filter=$('subject').value;
    $('lessons').replaceChildren();
    for(const l of lessons.filter(v=>!filter||v.subject===filter)){
      const card=document.createElement('article');card.className='card';
      const tag=document.createElement('div');tag.className='tag';tag.textContent=l.subject.toUpperCase()+' · '+(l.is_demo?'GRATUIT':'CURSANȚI');
      const title=document.createElement('h3');title.textContent=l.title;
      const info=document.createElement('p');info.textContent=l.summary||'Lecție Formula X';
      const btn=document.createElement('button');btn.textContent='Deschide lecția →';btn.onclick=()=>openLesson(l);
      card.append(tag,title,info,btn);$('lessons').append(card);
    }
    if(!lessons.length) message('Nu sunt lecții disponibile momentan.');
    if(staff){
      $('grantLesson').replaceChildren();
      for(const l of lessons.filter(x=>staff.role==='admin'||x.subject===staff.subject)){
       const o=document.createElement('option');o.value=l.id;o.textContent=l.title+' · '+l.subject;$('grantLesson').append(o);
      } await loadRules();
    }
  }
  async function openLesson(l){
    activeLesson=l; message('');
    try {
      const data=await request(sb.from('fx_lesson_contents').select('body').eq('lesson_id',l.id).maybeSingle());
      if(!data){ message('Lecția este protejată. Conectează-te cu un cont care are acces sau solicită acces profesorului.');box($('authSection'),!user);return; }
      $('detailSubject').textContent=l.subject.toUpperCase();$('detailTitle').textContent=l.title;
      $('detailBody').textContent=data.body;box($('librarySection'),false);box($('detail'),true);
      window.scrollTo(0,0);
    } catch(e){message('Nu se poate deschide lecția: '+e.message);}
  }
  async function loadGroups(){
    const q=sb.from('teacher_groups').select('id,name,subject').order('name');
    groups=(await request(q)).filter(g=>staff.role==='admin'||g.subject===staff.subject);
    renderGroups();
  }
  function renderGroups(){
    const l=lessons.find(x=>x.id===$('grantLesson').value);const s=l?.subject;
    $('grantGroup').replaceChildren();
    for(const g of groups.filter(g=>g.subject===s)){const o=document.createElement('option');o.value=g.id;o.textContent=g.name;$('grantGroup').append(o);}
  }
  async function loadRules(){
    const lessonId=$('grantLesson').value;if(!lessonId)return;
    const rules=await request(sb.from('fx_lesson_grants').select('id,group_id,student_id,permitted,starts_at,ends_at').eq('lesson_id',lessonId));
    const container=$('rules');container.replaceChildren();
    for(const r of rules){
      const line=document.createElement('p');
      const group=groups.find(g=>g.id===r.group_id);
      line.textContent=(group?'Grupă: '+group.name:'Elev: '+r.student_id)+' · '+(r.permitted?'Permis':'Blocat')+(r.starts_at?' · De la '+new Date(r.starts_at).toLocaleString('ro-RO'):'')+(r.ends_at?' · Până la '+new Date(r.ends_at).toLocaleString('ro-RO'):'')+' ';
      const b=document.createElement('button');b.className='locked';b.textContent='Șterge regula';b.onclick=async()=>{if(!confirm('Ștergi regula?'))return;try{await request(sb.from('fx_lesson_grants').delete().eq('id',r.id));await loadRules();message('Regulă ștearsă.');}catch(e){message(e.message)}};
      line.append(b);container.append(line);
    }
  }
  $('subject').onchange=loadLessons;
  $('backBtn').onclick=()=>{box($('detail'),false);box($('librarySection'),true);};
  $('grantLesson').onchange=()=>{renderGroups();loadRules().catch(e=>message(e.message));};
  $('grantType').onchange=()=>{const student=$('grantType').value==='student';box($('studentTarget'),student);box($('groupTarget'),!student);if(!student)$('grantPermitted').value='true';};
  $('loginForm').onsubmit=async e=>{e.preventDefault();try{await request(sb.auth.signInWithPassword({email:$('email').value,password:$('password').value}));await initialize();message('Autentificare reușită.');}catch(err){message('Autentificare: '+err.message)}};
  $('lessonForm').onsubmit=async e=>{
    e.preventDefault();try{
      const subject=$('lessonSubject').value;
      const l=await request(sb.from('fx_lessons').insert({subject,slug:slug($('lessonTitle').value),title:$('lessonTitle').value.trim(),summary:$('lessonSummary').value.trim(),is_demo:$('lessonDemo').checked,published:$('lessonPublished').checked,created_by:user.id}).select('id').single());
      try {await request(sb.from('fx_lesson_contents').insert({lesson_id:l.id,body:$('lessonBody').value}));}
      catch(err){await sb.from('fx_lessons').delete().eq('id',l.id);throw err;}
      $('lessonForm').reset();if(staff.role!=='admin')$('lessonSubject').value=staff.subject;
      await loadLessons();message('Lecție creată cu succes.');
    }catch(err){message('Salvarea a eșuat: '+err.message)}
  };
  $('grantForm').onsubmit=async e=>{
    e.preventDefault();try{
      const lesson=lessons.find(x=>x.id===$('grantLesson').value);if(!lesson)throw Error('Selectează o lecție.');
      const student=$('grantType').value==='student';
      let studentId=null,groupId=null;
      if(student){const lookup=await request(sb.rpc('fx_lookup_student',{p_email:$('grantEmail').value,p_subject:lesson.subject}));studentId=lookup?.[0]?.user_id;if(!studentId)throw Error('Elevul nu are un cont legat de înscrierea activă la materia respectivă.');}
      else {groupId=$('grantGroup').value;if(!groupId)throw Error('Alege o grupă.');if($('grantPermitted').value==='false')throw Error('Blocarea este individuală; alege Elev.');}
      const permitted=$('grantPermitted').value==='true';
      const starts_at=permitted?timestamp($('grantStart').value):null;
      const ends_at=permitted?timestamp($('grantEnd').value):null;
      if(starts_at&&ends_at&&starts_at>=ends_at)throw Error('Data de final trebuie să fie după început.');
      // Upsert alternative: delete prior rule first, then insert; valid only for authorized staff.
      let query=sb.from('fx_lesson_grants').delete().eq('lesson_id',lesson.id);
      query=student?query.eq('student_id',studentId):query.eq('group_id',groupId);
      await request(query);
      await request(sb.from('fx_lesson_grants').insert({lesson_id:lesson.id,student_id:studentId,group_id:groupId,permitted,starts_at,ends_at,created_by:user.id}));
      await loadRules();message('Regula de acces este activă.');
    }catch(err){message('Accesul nu a fost modificat: '+err.message)}
  };
  initialize().catch(err=>message('Inițializare: '+err.message));
})();
