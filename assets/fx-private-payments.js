(() => {
  'use strict';
  const API='https://vooflhvdoutjplfbnahl.supabase.co';
  const KEY='sb_publishable_iuJBis3q_83zNlYFER2AXQ_o8gzpDPA';
  if (!window.supabase?.createClient) return;
  const db=window.supabase.createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  const $=id=>document.getElementById(id);
  let teacher=null,students=[],records=new Map(),busy=false;
  const currentMonth=()=>{
    const p=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',timeZone:'Europe/Bucharest'}).formatToParts(new Date());
    return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value;
  };
  const monthDate=()=>($('fx-pay-month')?.value||currentMonth())+'-01';
  const notice=(s,isError=false)=>{
    const n=$('fx-pay-notice');
    if(n){n.textContent=s||'';n.style.color=isError?'#9b3037':'#277046';}
  };
  function money(value) {
    if(value===''||value===null||value===undefined) return null;
    const x=Number(String(value).replace(',','.'));
    if(!Number.isFinite(x)||x<0||x>100000)throw Error('Suma trebuie să fie între 0 și 100.000 lei.');
    return Math.round(x*100)/100;
  }
  function draw() {
    const host=$('fx-pay-rows');
    if(!host)return;
    host.replaceChildren();
    const query=($('fx-pay-search')?.value||'').trim().toLocaleLowerCase('ro');
    const visible=students.filter(x=>(x.full_name+' '+x.email).toLocaleLowerCase('ro').includes(query));
    const paidCount=students.filter(x=>records.get(x.id)?.paid).length;
    $('fx-pay-summary').textContent=students.length+' elevi în grupele tale · '+paidCount+' achitați · '+(students.length-paidCount)+' neachitați pentru luna selectată.';
    if(!visible.length){const empty=document.createElement('p');empty.textContent='Nu există elevi în grupele tale pentru această căutare.';host.append(empty);return;}
    for(const student of visible) {
      const existing=records.get(student.id)||{};
      const article=document.createElement('article');article.className='fx-pay-row';
      article.style.cssText='display:grid;grid-template-columns:minmax(145px,1fr) auto minmax(95px,125px);align-items:center;gap:10px;padding:12px;border:1px solid #eadde1;border-radius:12px;background:#fff;';
      const person=document.createElement('div');person.style.minWidth='0';
      const name=document.createElement('strong');name.textContent=student.full_name;
      const email=document.createElement('small');email.textContent=student.email||'';
      email.style.cssText='display:block;overflow-wrap:anywhere;color:#75686e';
      person.append(name,email);
      const paidLabel=document.createElement('label');paidLabel.style.cssText='display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700';
      const check=document.createElement('input');check.type='checkbox';check.checked=!!existing.paid;
      check.setAttribute('aria-label','Achitat: '+student.full_name);
      const paidText=document.createElement('span');paidText.textContent='Achitat';
      paidLabel.append(check,paidText);
      const amount=document.createElement('input');amount.type='number';amount.min='0';amount.max='100000';amount.step='0.01';
      amount.placeholder='Lei (opțional)';amount.value=existing.amount_ron??'';
      amount.setAttribute('aria-label','Sumă încasată pentru '+student.full_name);
      amount.style.cssText='width:100%;min-width:0;max-width:125px;padding:8px;border:1px solid #e5d6df;border-radius:9px';
      article.append(person,paidLabel,amount);
      host.append(article);
      const save=async()=>{
        if(!teacher)return;
        const month=monthDate();
        const payload={teacher_id:teacher,enrollment_id:student.id,month_start:month,paid:check.checked,paid_at:check.checked?new Date().toISOString():null,amount_ron:money(amount.value),updated_at:new Date().toISOString()};
        check.disabled=true;amount.disabled=true;notice('Se salvează…');
        try{
          const {error}=await db.from('fx_private_student_payments').upsert(payload,{onConflict:'teacher_id,enrollment_id,month_start'});
          if(error)throw error;
          records.set(student.id,payload);
          notice('Salvat pentru '+student.full_name+'.');
          $('fx-pay-summary').textContent=students.length+' elevi în grupele tale · '+students.filter(x=>records.get(x.id)?.paid).length+' achitați pentru luna selectată.';
        }catch(e){
          console.error('Formula X private payments:',e);
          check.checked=!!records.get(student.id)?.paid;
          amount.value=records.get(student.id)?.amount_ron??'';
          notice(e?.message||'Nu s-a salvat. Verifică SQL-ul de plăți din Supabase.',true);
        }finally{check.disabled=false;amount.disabled=false;}
      };
      check.addEventListener('change',save);
      amount.addEventListener('change',save);
    }
  }
  async function load() {
    if(!teacher||busy||!$('fx-pay-month'))return;
    busy=true;
    notice('');
    try {
      const {data:groups,error:gErr}=await db.from('teacher_groups').select('id').eq('owner_id',teacher);
      if(gErr)throw gErr;
      const ids=(groups||[]).map(g=>g.id);
      if(!ids.length){students=[];records.clear();draw();return;}
      const {data:members,error:mErr}=await db.from('group_members').select('enrollment_id').in('group_id',ids);
      if(mErr)throw mErr;
      const studentIds=[...new Set((members||[]).map(m=>m.enrollment_id))];
      if(!studentIds.length){students=[];records.clear();draw();return;}
      const [{data:people,error:eErr},{data:payments,error:pErr}]=await Promise.all([
        db.from('enrollments').select('id,full_name,email,archived_at').in('id',studentIds),
        db.from('fx_private_student_payments').select('enrollment_id,paid,paid_at,amount_ron').eq('month_start',monthDate())
      ]);
      if(eErr)throw eErr;if(pErr)throw pErr;
      students=(people||[]).filter(x=>!x.archived_at).sort((a,b)=>a.full_name.localeCompare(b.full_name,'ro'));
      records=new Map((payments||[]).map(p=>[p.enrollment_id,p]));
      draw();
    }catch(e){
      console.error('Formula X payments failed:',e);
      notice('Nu am putut încărca registrul. Rulează SQL-ul SUPABASE-PLATI-PRIVATE-ELEVI.sql în Supabase și reîncarcă.',true);
    }finally{busy=false;}
  }
  function mount() {
    const tab=$('tab-students');
    if(!tab||$('fx-pay-panel'))return;
    const section=document.createElement('section');section.id='fx-pay-panel';section.className='panel';section.style.marginBottom='20px';
    section.innerHTML='<div class="panel-head"><div><h2>🔒 Evidența privată a plăților</h2><p>Doar tu vezi și modifici încasările elevilor din grupele tale. Bifa nu procesează bani și nu emite chitanțe.</p></div></div>'+
      '<div style="display:grid;gap:12px;padding:0 18px 18px">'+
      '<div style="display:flex;flex-wrap:wrap;align-items:end;gap:12px"><label>Luna <input type="month" id="fx-pay-month"></label>'+
      '<label>Caută elev <input type="search" id="fx-pay-search" placeholder="Nume sau email"></label>'+
      '<button type="button" class="btn btn-soft" id="fx-pay-refresh">Actualizează</button></div>'+
      '<p id="fx-pay-summary" style="margin:0;color:#75686e"></p><div id="fx-pay-rows" style="display:grid;gap:8px"></div>'+
      '<p id="fx-pay-notice" role="status" style="font-size:13px"></p></div>';
    tab.insertBefore(section,tab.firstChild);
    $('fx-pay-month').value=currentMonth();
    $('fx-pay-month').addEventListener('change',load);
    $('fx-pay-search').addEventListener('input',draw);
    $('fx-pay-refresh').addEventListener('click',load);
    document.querySelectorAll('[data-tab="students"]').forEach(el=>el.addEventListener('click',load));
    load();
  }
  async function reconcile(){
    try{
      const {data:{session}}=await db.auth.getSession();
      if(!session){teacher=null;$('fx-pay-panel')?.remove();return;}
      const {data,error}=await db.rpc('get_my_staff_profile');
      if(error){return;}
      const staff=Array.isArray(data)?data[0]:data;
      if(!staff||staff.role!=='mentor'){teacher=null;$('fx-pay-panel')?.remove();return;}
      teacher=session.user.id;
      mount();
    }catch(e){console.error('Payment portal init:',e);}
  }
  let pending=false;
  const schedule=()=>{
    if(pending)return;
    pending=true;
    setTimeout(()=>{pending=false;reconcile();},100);
  };
  db.auth.onAuthStateChange(()=>schedule());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();