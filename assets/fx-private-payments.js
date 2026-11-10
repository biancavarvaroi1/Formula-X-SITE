(() => {
  'use strict';
  const API='https://vooflhvdoutjplfbnahl.supabase.co';
  const KEY='sb_publishable_iuJBis3q_83zNlYFER2AXQ_o8gzpDPA';
  if(!window.supabase?.createClient)return;
  const sb=window.supabase.createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  const $=id=>document.getElementById(id);
  const SESSIONS=[1,2,3,4];
  let owner=null,students=[],payments=new Map(),legacy=new Map(),loading=false,monthShown='';
  const month=()=>{
    const parts=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',timeZone:'Europe/Bucharest'}).formatToParts(new Date());
    return parts.find(x=>x.type==='year').value+'-'+parts.find(x=>x.type==='month').value;
  };
  const dateKey=()=>($('fx-pay-month')?.value||month())+'-01';
  const paymentKey=(studentId,n)=>studentId+':'+n;
  function notify(msg,bad=false){
    const el=$('fx-pay-notice');if(!el)return;
    el.textContent=msg;el.style.color=bad?'#a52c44':'#257143';
  }
  function validMoney(value){
    if(String(value).trim()==='')return null;
    const n=Number(String(value).replace(',','.'));
    if(!Number.isFinite(n)||n<0||n>100000)throw new Error('Suma trebuie să fie între 0 și 100.000 lei.');
    return Math.round(n*100)/100;
  }
  function totals(){
    let settled=0,sum=0,complete=0,partial=0,missing=0;
    for(const student of students){
      let count=0;
      for(const n of SESSIONS){
        const row=payments.get(paymentKey(student.id,n));
        if(row?.paid){count++;settled++;sum+=Number(row.amount_ron)||0;}
      }
      if(count===4)complete++;else if(count>0)partial++;else missing++;
    }
    const money=new Intl.NumberFormat('ro-RO',{style:'currency',currency:'RON',maximumFractionDigits:2}).format(sum);
    $('fx-pay-summary').textContent=students.length+' elevi · '+settled+'/'+(students.length*4)+' ședințe achitate · '+money+' încasați (din bife).';
    $('fx-pay-counts').textContent=complete+' achitați integral · '+partial+' parțial · '+missing+' fără ședințe bifate.';
  }
  function make(tag,text,className){
    const e=document.createElement(tag);
    if(text!==undefined&&text!==null)e.textContent=text;
    if(className)e.className=className;
    return e;
  }
  function draw(){
    const host=$('fx-pay-rows');if(!host)return;
    host.replaceChildren();
    totals();
    const query=($('fx-pay-search')?.value||'').trim().toLocaleLowerCase('ro');
    const visible=students.filter(s=>(s.full_name+' '+s.email).toLocaleLowerCase('ro').includes(query));
    if(!visible.length){host.append(make('p','Nu există elevi pentru căutarea selectată.'));return;}
    for(const student of visible){
      const article=make('article',null,'fx-pay-student');
      article.style.cssText='background:#fff;border:1px solid #eadde1;padding:16px;border-radius:14px;display:grid;gap:12px';
      const head=make('div');head.style.cssText='display:flex;justify-content:space-between;align-items:start;gap:10px;flex-wrap:wrap';
      const title=make('div');title.append(make('strong',student.full_name));
      const mail=make('div',student.email||'');mail.style.cssText='font-size:12px;color:#75686e;overflow-wrap:anywhere';
      title.append(mail);
      const count=SESSIONS.filter(n=>payments.get(paymentKey(student.id,n))?.paid).length;
      const progress=make('span',count+'/4 ședințe achitate');
      progress.style.cssText='font-size:12px;font-weight:700;color:#733450;background:#fae9f0;padding:5px 9px;border-radius:20px';
      head.append(title,progress);article.append(head);
      const old=legacy.get(student.id);
      if(old&&(old.paid||old.amount_ron!==null&&old.amount_ron!==undefined)){
        const warning=make('p','Plată lunară veche înregistrată: '+(old.paid?'achitat':'nebifată')+(old.amount_ron!=null?' · '+old.amount_ron+' lei':'')+'. Verifică înainte de a distribui suma pe ședințe.');
        warning.style.cssText='font-size:12px;color:#875719;background:#fff9e9;padding:9px;border-radius:9px;margin:0';
        article.append(warning);
      }
      const grid=make('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px';
      grid.className='fx-pay-session-grid';
      for(const n of SESSIONS){
        const existing=payments.get(paymentKey(student.id,n))||{};
        const cell=make('div');cell.style.cssText='border:1px solid #eadde1;border-radius:10px;padding:10px;display:grid;gap:6px;min-width:0';
        const label=make('label');label.style.cssText='display:flex;gap:6px;align-items:center;font-weight:700;font-size:13px;cursor:pointer';
        const checked=make('input');checked.type='checkbox';checked.checked=!!existing.paid;
        checked.setAttribute('aria-label',student.full_name+' ședința '+n+' achitată');
        label.append(checked,make('span','Ședința '+n));
        const amount=make('input');amount.type='number';amount.min='0';amount.max='100000';amount.step='0.01';
        amount.placeholder='40 lei';amount.value=existing.amount_ron??'40';
        amount.setAttribute('aria-label','Sumă în lei, ședința '+n+' pentru '+student.full_name);
        amount.style.cssText='font-size:13px;border:1px solid #e5d6df;border-radius:8px;padding:8px;width:100%;min-width:0';
        const suffix=make('small','lei / ședință');suffix.style.color='#75686e';
        cell.append(label,amount,suffix);grid.append(cell);
        let saving=false;
        const save=async()=>{
          if(saving||!owner)return;
          let val;
          try{val=validMoney(amount.value);}catch(err){notify(err.message,true);amount.value=existing.amount_ron??'40';return;}
          const key=paymentKey(student.id,n);
          const previous=payments.get(key)||{};
          const row={
            teacher_id:owner,enrollment_id:student.id,month_start:dateKey(),
            session_number:n,paid:checked.checked,amount_ron:val,
            paid_at:checked.checked?(previous.paid_at||new Date().toISOString()):null,
            updated_at:new Date().toISOString()
          };
          saving=true;checked.disabled=true;amount.disabled=true;notify('Se salvează ședința '+n+'…');
          try{
            const {error}=await sb.from('fx_private_session_payments')
              .upsert(row,{onConflict:'teacher_id,enrollment_id,month_start,session_number'});
            if(error)throw error;
            if(dateKey()===row.month_start){
              payments.set(key,row);
              progress.textContent=SESSIONS.filter(i=>payments.get(paymentKey(student.id,i))?.paid).length+'/4 ședințe achitate';
              totals();
            }
            notify('Salvat: '+student.full_name+', ședința '+n+'.');
          }catch(err){
            console.error('Formula X session payment:',err);
            checked.checked=!!previous.paid;amount.value=previous.amount_ron??'40';
            notify('Nu s-a salvat. Verifică instalarea SQL-ului pentru cele 4 ședințe.',true);
          }finally{saving=false;checked.disabled=false;amount.disabled=false;}
        };
        checked.addEventListener('change',save);amount.addEventListener('change',save);
      }
      article.append(grid);host.append(article);
    }
  }
  async function load(){
    if(!owner||loading||!$('fx-pay-month'))return;
    loading=true;notify('Se încarcă…');
    const requestMonth=dateKey();
    try{
      const {data:groups,error:gerr}=await sb.from('teacher_groups').select('id').eq('owner_id',owner);
      if(gerr)throw gerr;
      const ids=(groups||[]).map(x=>x.id);
      let people=[],records=[],oldRecords=[];
      if(ids.length){
        const {data:members,error:merr}=await sb.from('group_members').select('enrollment_id').in('group_id',ids);
        if(merr)throw merr;
        const enrollments=[...new Set((members||[]).map(x=>x.enrollment_id))];
        if(enrollments.length){
          const [a,b,c]=await Promise.all([
            sb.from('enrollments').select('id,full_name,email,archived_at').in('id',enrollments),
            sb.from('fx_private_session_payments').select('enrollment_id,session_number,paid,amount_ron,paid_at').eq('teacher_id',owner).eq('month_start',requestMonth),
            sb.from('fx_private_student_payments').select('enrollment_id,paid,amount_ron').eq('teacher_id',owner).eq('month_start',requestMonth)
          ]);
          if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
          people=a.data||[];records=b.data||[];oldRecords=c.data||[];
        }
      }
      if(dateKey()!==requestMonth)return;
      students=people.filter(x=>!x.archived_at).sort((a,b)=>a.full_name.localeCompare(b.full_name,'ro'));
      payments=new Map(records.map(x=>[paymentKey(x.enrollment_id,x.session_number),x]));
      legacy=new Map(oldRecords.map(x=>[x.enrollment_id,x]));
      monthShown=requestMonth;draw();notify('');
    }catch(err){
      console.error('Formula X session ledger:',err);
      students=[];payments.clear();legacy.clear();draw();
      notify('Registrul celor 4 ședințe nu este configurat în Supabase. Rulează SQL-ul actualizat, apoi reîncarcă.',true);
    }finally{loading=false;}
  }
  function mount(){
    const tab=$('tab-students');if(!tab||$('fx-pay-panel'))return;
    const style=make('style');
    style.textContent='@media(max-width:780px){.fx-pay-session-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:390px){.fx-pay-session-grid{grid-template-columns:1fr!important}}';
    document.head.append(style);
    const section=make('section');section.id='fx-pay-panel';section.className='panel';section.style.marginBottom='20px';
    section.innerHTML='<div class="panel-head"><div><h2>🔒 Plăți pe ședințe · privat</h2><p>Bifează separat cele 4 ședințe din fiecare lună și modifică suma, dacă a plătit doar o ședință. Informațiile sunt vizibile doar profesorului.</p></div></div>'+
      '<div style="display:grid;gap:12px;padding:0 18px 18px">'+
      '<div style="display:flex;flex-wrap:wrap;align-items:end;gap:12px"><label>Luna <input type="month" id="fx-pay-month"></label>'+
      '<label>Caută elev <input type="search" id="fx-pay-search" placeholder="Nume sau email"></label>'+
      '<button type="button" class="btn btn-soft" id="fx-pay-refresh">Actualizează</button></div>'+
      '<p id="fx-pay-summary" style="margin:0;font-weight:700"></p><p id="fx-pay-counts" style="margin:0;color:#75686e"></p>'+
      '<div id="fx-pay-rows" style="display:grid;gap:10px"></div>'+
      '<p id="fx-pay-notice" role="status" style="font-size:13px;margin:0"></p></div>';
    tab.insertBefore(section,tab.firstChild);
    $('fx-pay-month').value=month();
    $('fx-pay-month').addEventListener('change',load);
    $('fx-pay-search').addEventListener('input',draw);
    $('fx-pay-refresh').addEventListener('click',load);
    document.querySelectorAll('[data-tab="students"]').forEach(btn=>btn.addEventListener('click',load));
    load();
  }
  async function reconcile(){
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session){owner=null;$('fx-pay-panel')?.remove();return;}
      const {data,error}=await sb.rpc('get_my_staff_profile');if(error)return;
      const staff=Array.isArray(data)?data[0]:data;
      if(!staff||staff.role!=='mentor'){owner=null;$('fx-pay-panel')?.remove();return;}
      owner=session.user.id;mount();
    }catch(err){console.error('Formula X payment initialization:',err);}
  }
  let scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;reconcile();},100);
  }
  sb.auth.onAuthStateChange(schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();