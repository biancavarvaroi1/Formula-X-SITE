(() => {
  'use strict';
  const SUPABASE_URL='https://vooflhvdoutjplfbnahl.supabase.co';
  const SUPABASE_PUBLIC_KEY='sb_publishable_iuJBis3q_83zNlYFER2AXQ_o8gzpDPA';
  const SUBJECTS={romana:'Limba Română',matematica:'Matematică',biologie:'Biologie',chimie:'Chimie',fizica:'Fizică',geografie:'Geografie',logica:'Logică, argumentare și comunicare'};
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const token=(params.get('token')||'').trim();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let group=null;

  function failLink(){
    $('loading').classList.add('hidden');
    $('joinForm').classList.add('hidden');
    $('groupBox').classList.add('hidden');
    $('invalid').classList.remove('hidden');
  }
  function setStatus(text,type=''){
    const el=$('status');el.textContent=text||'';el.className='status'+(type?' '+type:'');
  }
  function normalizePhone(value){
    let v=String(value||'').trim().replace(/[\s().-]/g,'');
    if(v.startsWith('00'))v='+'+v.slice(2);
    return v;
  }

  function timeout(ms,label='TIMEOUT'){return new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));}

  async function init(){
    if(!window.supabase?.createClient){$('loading').textContent='Nu s-a încărcat conexiunea. Reîncarcă pagina.';return}
    if(!uuid.test(token)){failLink();return}
    const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    window.fxGroupDb=db;
    const {data,error}=await Promise.race([db.rpc('fx33_group_info',{p_token:token}),timeout(10000,'GROUP_INFO_TIMEOUT')]);
    if(error){console.error('Formula X V33 group info:',error);failLink();return}
    group=Array.isArray(data)?data[0]:data;
    if(!group){failLink();return}
    $('groupName').textContent=group.group_name||'Grupă Formula X';
    $('groupMeta').textContent=`${SUBJECTS[group.subject]||group.subject||'Formula X'} · ${group.mentor_name||'Profesor Formula X'}`;
    $('groupBox').classList.remove('hidden');
    $('loading').classList.add('hidden');
    $('joinForm').classList.remove('hidden');
  }

  $('joinForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const name=$('studentName').value.trim();
    const phone=normalizePhone($('studentPhone').value);
    const website=$('website').value;
    if(name.length<2){setStatus('Scrie numele și prenumele.','error');return}
    if(!/^\+?\d{8,15}$/.test(phone)){setStatus('Scrie un număr de telefon valid.','error');return}
    const button=$('joinBtn');button.disabled=true;button.textContent='SE SALVEAZĂ…';setStatus('Te adăugăm în grupă…','info');
    try{
      const {data,error}=await Promise.race([window.fxGroupDb.rpc('fx33_join_group',{p_token:token,p_full_name:name,p_phone:phone,p_website:website}),timeout(12000,'GROUP_JOIN_TIMEOUT')]);
      if(error)throw error;
      const result=Array.isArray(data)?data[0]:data;
      if(!result?.ok){
        if(result?.code==='rate_limited')setStatus('Sunt prea multe încercări într-un timp scurt. Încearcă puțin mai târziu.','error');
        else if(result?.code==='invalid_link'){failLink();}
        else setStatus('Nu am putut salva datele. Verifică numele și telefonul și încearcă din nou.','error');
        return;
      }
      $('joinForm').classList.add('hidden');$('success').classList.remove('hidden');
    }catch(error){
      console.error('Formula X V33 join group:',error);
      setStatus('A apărut o eroare. Reîncarcă pagina și încearcă din nou.','error');
    }finally{
      button.disabled=false;button.textContent='INTRĂ ÎN GRUPĂ';
    }
  });

  init().catch(error=>{console.error(error);failLink();});
})();
