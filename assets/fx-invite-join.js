(() => {
  'use strict';
  const API_URL = 'https://vooflhvdoutjplfbnahl.supabase.co';
  const API_KEY = 'sb_publishable_iuJBis3q_83zNlYFER2AXQ_o8gzpDPA';
  const token = new URLSearchParams(location.search).get('token');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const $ = id => document.getElementById(id);
  const hide = (id,hidden) => $(id).classList.toggle('hidden',hidden);
  const names = {romana:'Română',matematica:'Matematică',biologie:'Biologie',chimie:'Chimie',fizica:'Fizică',geografie:'Geografie',logica:'Logică'};
  const errors = {
    invalid_link:'Linkul este expirat sau dezactivat. Cere profesorului un link nou.',
    login_required:'Autentifică-te în contul Formula X.',
    enrollment_inactive:'Înscrierea ta a fost dezactivată sau arhivată. Contactează profesorul.',
    email_missing:'Contul tău nu are email. Contactează echipa Formula X.'
  };
  let db,busy=false;
  function status(message,type='') {
    $('status').textContent=message;
    $('status').className='message '+type;
  }
  function fail(message) {
    hide('loading',true);hide('loginBox',true);hide('doneBox',true);
    $('title').textContent='Nu putem folosi această invitație';
    status(message,'error');
  }
  function login() {
    hide('loading',true);hide('loginBox',false);
    $('title').textContent='Intră în grupa ta';
    status('');
  }
  async function join() {
    if (busy) return;
    busy=true;
    hide('loginBox',true);hide('loading',false);
    status('Verificăm contul și grupa…');
    try {
      const infoResult=await db.rpc('fx_group_invite_info',{p_token:token});
      if(infoResult.error)throw infoResult.error;
      const info=infoResult.data;
      if(!info?.ok){fail(errors[info?.code]||'Invitație indisponibilă.');return;}
      const result=await db.rpc('fx_group_invite_join',{p_token:token});
      if(result.error)throw result.error;
      if(!result.data?.ok){fail(errors[result.data?.code]||'Înscrierea a eșuat.');return;}
      $('title').textContent='Bine ai venit în grupă!';
      $('groupName').textContent=info.group_name;
      $('groupMeta').textContent=(names[info.subject]||info.subject)+' · '+info.mentor_name;
      hide('groupInfo',false);hide('loading',true);hide('doneBox',false);
      $('doneText').textContent=result.data.code==='already_member'
        ? 'Ești deja înscris în această grupă.'
        : 'Ai fost înscris automat! Profesorul te vede la înscrieri, în grupă și la prezențe.';
      status('');
    } catch(err) {
      console.error('Formula X invite join:',err);
      fail(err?.code==='PGRST202'
        ? 'Invitațiile nu sunt încă instalate în Supabase. Contactează profesorul.'
        : 'Nu am putut finaliza înscrierea. Reîncarcă pagina.');
    } finally {busy=false;}
  }
  async function init() {
    if(!uuid.test(token||'')){fail('Link invalid. Cere profesorului unul nou.');return;}
    if(!window.supabase?.createClient){fail('Nu s-a încărcat autentificarea.');return;}
    db=window.FormulaXAuthClient||window.supabase.createClient(API_URL,API_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}
    });
    const {data,error}=await db.auth.getSession();
    if(error)throw error;
    if(data.session)await join();else login();
  }
  $('loginForm').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const button=$('loginButton');button.disabled=true;
    status('Te autentificăm…');
    try {
      const {error}=await db.auth.signInWithPassword({
        email:$('email').value.trim(),password:$('password').value
      });
      if(error){status('Emailul sau parola nu sunt corecte.','error');return;}
      $('password').value='';
      await join();
    } catch(err){console.error(err);status('Autentificarea nu a reușit.','error');}
    finally{button.disabled=false;}
  });
  init().catch(err=>{console.error(err);fail('Eroare de conectare. Reîncarcă pagina.');});
})();