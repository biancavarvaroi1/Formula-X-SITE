/* Formula X · import ghidat: lecții literare → Supabase; acțiuni doar pentru personal autentificat. */
(async function(){
  "use strict";
  const byId=id=>document.getElementById(id);
  const message=(msg,bad=false)=>{
    const node=byId("global-status");
    node.textContent=msg;node.style.color=bad?"#ac3145":"#216545";
  };
  const lessons=window.FormulaXCuratedLiterature?.lessons||[];
  const known=new Map(lessons.map(lesson=>[lesson.slug,lesson]));
  const buttons=[...document.querySelectorAll("[data-import]")];
  let client=null,staff=null,busy=false;
  const status=(key,msg,bad=false)=>{
    const node=document.querySelector('[data-status="'+key+'"]');
    if(node){node.textContent=msg;node.classList.toggle("error",bad);}
  };
  const setActive=active=>{
    for(const btn of buttons)btn.disabled=!active||busy||btn.dataset.done==="1";
  };
  async function rpc(name,params){
    const {data,error}=await client.rpc(name,params);
    if(error)throw error;
    return data;
  }
  const cleanError=e=>{
    const code=String(e?.code||"");
    if(code==="42883"||code==="PGRST202")return "Funcțiile de lecții nu sunt încă instalate în Supabase. Rulează SQL-ul unic și reîncarcă pagina.";
    if(/nu este o lecție Studio|editorul original/i.test(e?.message||""))return "Această lecție a fost realizată cu editorul vechi și nu poate fi suprascrisă în siguranță de import. Deschide editorul original.";
    if(code==="42501"||/permission|permis|autori/i.test(e?.message||""))return "Contul nu are drepturi de administrare pentru această materie.";
    return "Nu am putut salva: "+String(e?.message||"eroare necunoscută");
  };
  async function catalog(){
    const result=await rpc("fx_teacher_lesson_catalog");
    const rows=result?.lessons||[];
    return Array.isArray(rows)?rows:[];
  }
  function exists(rows,lesson){
    return rows.find(row=>row?.subject==="romana"&&row?.title===lesson.title);
  }
  function studioLink(slug){
    if(!/^[a-z0-9-]{1,120}$/.test(slug))return "";
    return "/profesori/studio.html?slug="+encodeURIComponent(slug);
  }
  function markImported(lesson,row,text){
    const btn=document.querySelector('[data-import="'+lesson.slug+'"]');
    if(btn && btn.dataset.done!=="1"){btn.disabled=false;btn.textContent="Actualizează lecția existentă";}
    status(lesson.slug,text||"Lecția există. Poți înlocui doar conținutul ei din eseul profesorului; drepturile elevilor rămân intacte.");
    const card=document.querySelector('[data-lesson="'+lesson.slug+'"]');
    if(card && row?.slug && !card.querySelector("[data-edit-curated]")){
      const a=document.createElement("a");
      a.setAttribute("data-edit-curated","1");a.className="button alt";a.href=studioLink(row.slug);
      a.target="_blank";a.rel="noopener";a.textContent="Editează lecția";
      card.querySelector(".actions")?.append(a);
    }
  }
  async function refresh(){
    const rows=await catalog();
    for(const l of lessons){const row=exists(rows,l);if(row)markImported(l,row);}
    return rows;
  }
  async function importLesson(lesson){
    if(busy||!staff)return;
    const btn=document.querySelector('[data-import="'+lesson.slug+'"]');
    if(!btn||btn.dataset.done==="1")return;
    busy=true;setActive(false);
    btn.textContent="Se importă...";
    status(lesson.slug,"Verific lecțiile existente înainte de import...");
    try{
      let rows=await catalog();
      let present=exists(rows,lesson);
      const body=JSON.stringify({
        fx_format:lesson.fx_format,subject:lesson.subject,theme:lesson.theme,
        title:lesson.title,subtitle:lesson.subtitle,blocks:lesson.blocks
      });
      if(body.length>175000)throw Error("Materialul depășește limita editorului.");
      if(present){
        if(!present.slug)throw Error("Lecția existentă nu are un identificator valid.");
        if(!confirm("Actualizezi conținutul lecției „"+lesson.title+"” după eseul nou? Accesul și progresul elevilor se păstrează."))
          {markImported(lesson,present);return;}
        await rpc("fx_studio_update_lesson",{
          p_slug:present.slug,
          p_title:lesson.title,
          p_summary:lesson.summary,
          p_body:body
        });
        btn.dataset.done="1";
        btn.textContent="Actualizare efectuată";
        status(lesson.slug,"Lecția existentă a fost actualizată în Supabase. Accesul, grupele și progresul nu au fost modificate.");
        return;
      }
      await rpc("fx_create_lesson",{
        p_subject:"romana",p_title:lesson.title,p_summary:lesson.summary,p_body:body
      });
      rows=await catalog();
      present=exists(rows,lesson);
      if(!present?.slug){
        status(lesson.slug,"Lecția a fost creată, dar catalogul nu i-a returnat încă adresa. Găsește-o în Portal profesori.",true);
        btn.dataset.done="1";return;
      }
      // Materialul este creat cu accesul elevilor oprit; profesorul decide ulterior publicarea.
      try{
        await rpc("fx_set_lesson_enabled",{p_slug:present.slug,p_enabled:false});
        markImported(lesson,present,"Import reușit. Accesul elevilor este oprit; îl poți porni din portal.");
      }catch(disableError){
        markImported(lesson,present,"Lecția s-a creat, dar oprirea accesului nu a fost confirmată. Verifică imediat publicarea în Portal profesori.");
        status(lesson.slug,"Lecția există, dar publicarea trebuie verificată manual: "+cleanError(disableError),true);
      }
    }catch(error){
      status(lesson.slug,cleanError(error),true);
      btn.textContent="Reîncearcă importul";
    }finally{
      busy=false;setActive(true);
    }
  }
  try{
    if(!lessons.length||!window.supabase||!window.FX_SUPABASE_URL||!window.FX_SUPABASE_ANON_KEY){
      throw Error("Biblioteca sau configurarea site-ului nu poate fi încărcată.");
    }
    client=window.supabase.createClient(window.FX_SUPABASE_URL,window.FX_SUPABASE_ANON_KEY);
    const {data:{session},error}=await client.auth.getSession();
    if(error)throw error;
    if(!session?.user){
      message("Conectează-te mai întâi cu un cont de profesor din Formula X, apoi revino aici.",true);
      return;
    }
    const profile=await rpc("get_my_staff_profile");
    staff=Array.isArray(profile)?profile[0]:profile;
    if(!staff||!(staff.role==="admin"||(staff.role==="mentor"&&staff.subject==="romana"))){
      staff=null;
      message("Acest import poate fi făcut numai de profesorul de Română sau de administrator.",true);
      return;
    }
    message("Cont autorizat: "+String(staff.display_name||"profesor Formula X")+". Alege lecția pe care vrei să o imporți.");
    await refresh();
    setActive(true);
    for(const button of buttons){
      button.addEventListener("click",()=>{const l=known.get(button.dataset.import);if(l)void importLesson(l);});
    }
    client.auth.onAuthStateChange((event)=>{
      if(event==="SIGNED_OUT"){staff=null;setActive(false);message("Sesiunea a fost închisă. Reconectează-te pentru import.",true);}
    });
  }catch(error){setActive(false);message(cleanError(error),true);}
})();