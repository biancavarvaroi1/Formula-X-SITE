/* Formula X: import local ZIP lessons into protected Supabase Studio through teacher RPCs. No public lesson JSON. */
(async()=>{
'use strict';
const $=id=>document.getElementById(id),status=$('fx-state'),fileInput=$('fx-package'),button=$('fx-import'),update=$('fx-update');
const specs=[
{slug:'eu-nu-strivesc-corola',file:'eu-nu-strivesc-corola.json'},
{slug:'testament',file:'testament.json'},
{slug:'riga-crypto-si-lapona-enigel',file:'riga-crypto-si-lapona-enigel.json'}
];
let db=null,staff=null,running=false;
const setStatus=(s,bad=false,good=false)=>{status.textContent=s;status.classList.toggle('bad',bad);status.classList.toggle('good',good);};
const result=(slug,s)=>{const e=document.querySelector('[data-result="'+slug+'"]');if(e)e.textContent=s;};
const basename=p=>p.split('/').pop();
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const uint16=(v,i)=>v.getUint16(i,true),uint32=(v,i)=>v.getUint32(i,true);
async function unzip(file){
 if(file.size>40*1024*1024)throw Error('Arhiva depășește 40 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(uint32(view,i)===0x06054b50){end=i;break;}}
 if(end<0)throw Error('Nu am găsit structura ZIP.');
 const count=uint16(view,end+10),central=uint32(view,end+16),out=new Map();let pos=central;
 if(count>100||central>=bytes.length)throw Error('Arhiva are structură invalidă.');
 for(let i=0;i<count;i++){
  if(pos+46>bytes.length||uint32(view,pos)!==0x02014b50)throw Error('Intrare ZIP invalidă.');
  const method=uint16(view,pos+10),comp=uint32(view,pos+20),size=uint32(view,pos+24),
  n=uint16(view,pos+28),extra=uint16(view,pos+30),comment=uint16(view,pos+32),off=uint32(view,pos+42);
  const filename=decoder.decode(bytes.subarray(pos+46,pos+46+n));
  pos+=46+n+extra+comment;
  if(!filename||filename.endsWith('/'))continue;
  const name=basename(filename);
  if(!/^(?:[a-z0-9-]+\.json|[a-z0-9-]+\.webp)$/i.test(name))continue;
  if(out.has(name))throw Error('Arhiva conține nume duplicate: '+name);
  if(size>4*1024*1024||comp>4*1024*1024)throw Error('Un fișier din arhivă este prea mare: '+name);
  if(off+30>bytes.length||uint32(view,off)!==0x04034b50)throw Error('Date ZIP deteriorate.');
  const start=off+30+uint16(view,off+26)+uint16(view,off+28);
  if(start+comp>bytes.length)throw Error('Date ZIP incomplete.');
  let data=bytes.slice(start,start+comp);
  if(method===8){
   if(!('DecompressionStream' in window))throw Error('Browserul nu poate dezarhiva ZIP. Folosește ultima versiune Chrome sau Edge.');
   const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   data=new Uint8Array(await new Response(stream).arrayBuffer());
  }else if(method!==0)throw Error('Compresie ZIP neacceptată.');
  if(data.byteLength!==size)throw Error('Fișier ZIP incomplet: '+name);
  out.set(name,data);
 }
 return out;
}
const imageName=s=>/^[a-z0-9-]+\.webp$/i.test(String(s||''))?s:null;
function validate(d,slug){
 if(!d||d.slug!==slug||!d.title||!d.author||!Array.isArray(d.repere)||d.repere.length!==3)throw Error('Lecția '+slug+' nu respectă structura în 3 repere.');
 if(d.repere.some(r=>!Array.isArray(r.cards)||r.cards.length!==2||r.cards.some(c=>!Array.isArray(c.steps)||c.steps.length<4)))throw Error('Lipsesc explicații detaliate sau secțiunile ilustrate din '+slug);
 if(!Array.isArray(d.quiz)||d.quiz.length<12||d.quiz.length>25||d.quiz.some(q=>!Array.isArray(q)||!Array.isArray(q[1])||q[1].length!==4||new Set(q[1]).size!==4||!Number.isInteger(q[2])||q[2]<0||q[2]>=4))throw Error('Testul final al lecției '+slug+' trebuie să conțină 12–25 întrebări valide, cu câte 4 variante.');
 if(!Array.isArray(d.terms)||d.terms.length<4||!Array.isArray(d.recapitulare)||!d.recapitulare.length)throw Error('Lipsesc fișele de înțelegere și recapitulare din '+slug);
 const files=[d.hero,...d.repere.flatMap(r=>r.cards.map(c=>c.image))];
 if(files.some(x=>!imageName(x)))throw Error('Imagine cu denumire invalidă în '+slug);
 return files;
}
const clean=v=>String(v||'').trim();
function documentFor(d,urls){
 const blocks=[
 {type:'heading',title:'Înainte de lectură · date esențiale',text:d.author+' · '+d.year+' · '+d.volume+' · '+d.kind},
 {type:'image',image:urls.get(d.hero),alt:'Ilustrație în acuarelă pentru '+d.title},
 {type:'text',text:d.intro},
 {type:'callout',variant:'important',label:'IDEEA CENTRALĂ',title:'Ideea centrală',text:d.thesis}
 ];
 if(Array.isArray(d.route))blocks.push({type:'steps',title:'Firul lecturii',text:d.route.map(([term,meaning])=>term+' — '+meaning).join('\n')});
 d.repere.forEach((rep,index)=>{
  blocks.push({type:'heading',title:'Reperul '+(index+1)+' — '+rep.name,text:rep.lead});
  rep.cards.forEach((card)=>{
    blocks.push({type:'split',eyebrow:card.label||'EXPLICAȚIE COMPLETĂ',title:card.title,
      image:urls.get(card.image),side:'left',
      text:card.steps.map(clean).join('\n\n')});
    if(card.quote)blocks.push({type:'quote',text:card.quote});
    if(card.relevance)blocks.push({type:'callout',variant:'important',label:'RELEVANȚĂ',title:'Legătura cu reperul BAC',text:card.relevance});
  });
 });
 if(d.extra?.rows?.length){
  blocks.push({type:'heading',title:'Schemă vizuală · '+(d.extra.title||'Recapitulare'),text:'Compară ideile înainte de a trece la elementele de sinteză.'});
  blocks.push({type:'cards',fxPart:'matrix',title:d.extra.title||'Sinteză',columns:d.extra.columns||[],rows:d.extra.rows,text:d.extra.rows.map(row=>row.map(clean).join(' — ')).join('\n')});
 }
 if(d.terms?.length){
  blocks.push({type:'heading',title:'Dicționarul lecției',text:'Noțiunile pe care trebuie să le explici corect într-un eseu.'});
  blocks.push({type:'cards',title:'Termeni esențiali',text:d.terms.map(x=>clean(x.term)+' — '+clean(x.definition)).join('\n')});
 }
 if(d.common_confusions?.length){
  blocks.push({type:'heading',title:'Atenție la examen',text:'Confuzii frecvente și clarificări înainte de recapitulare.'});
  blocks.push({type:'steps',title:'Nu confunda aceste idei',text:d.common_confusions.map(clean).join('\n')});
 }
 if(d.recapitulare?.length){
  blocks.push({type:'heading',title:'Recapitularea celor trei repere',text:'Ce trebuie să poți reproduce fără ajutorul materialului.'});
  blocks.push({type:'steps',title:'Schema de memorat',text:d.recapitulare.map(clean).join('\n')});
 }
 if(Array.isArray(d.workshop)&&d.workshop.length){
  blocks.push({type:'heading',title:'De la observație la argument'});
  ['Observație inițială','Paragraf dezvoltat','Cum este construit argumentul'].forEach((title,i)=>{
   if(d.workshop[i])blocks.push({type:'callout',label:'ATELIER DE REDACTARE',title,text:d.workshop[i]});
  });
 }
 if(d.conclusion)blocks.push({type:'callout',variant:'success',label:'CONCLUZIE',title:'Încheierea eseului',text:d.conclusion});
 if(Array.isArray(d.essay)&&d.essay.length)blocks.push({type:'heading',title:'Eseu-model'},{type:'text',text:d.essay.map(clean).join('\n\n')});
 blocks.push({type:'divider'});
 blocks.push({type:'heading',title:'Chestionarul final · '+d.title,text:'Ai parcurs toate reperele, explicațiile și concluzia. Verifică acum ce ai reținut. Răspunsul corect și explicația se afișează după fiecare alegere.'});
 blocks.push({type:'callout',label:'AUTOEVALUARE',variant:'important',title:d.quiz.length+' întrebări după studierea operei',text:'Fiecare întrebare are patru variante. Pentru un exercițiu corect, încearcă să răspunzi fără să consulți lecția.'});
 d.quiz.forEach((q,i)=>blocks.push({type:'quiz',id:slugQuiz(d.slug,i),question:clean(q[0]),options:q[1].map(clean),correct:q[2],explanation:clean(q[3])}));
 if(Array.isArray(d.shorts))d.shorts.forEach(([prompt,guide])=>blocks.push({type:'text',fxPart:'writing',title:prompt,text:guide}));
 if(blocks.length>150)throw Error('Prea multe blocuri pentru lecția '+d.title);
 return {fx_format:'formula-x-blocks-v1',subject:'romana',theme:'rose',title:d.title+' — '+d.author,
 subtitle:d.subtitle+' · 3 repere BAC · explicații detaliate · chestionar final',blocks};
}
function slugQuiz(slug,i){return slug+'-q'+(i+1)}
async function rpc(name,params){const {data,error}=await db.rpc(name,params);if(error)throw error;return data;}
const rowsFrom=r=>Array.isArray(r?.lessons)?r.lessons:[];
const match=(rows,d)=>rows.find(x=>x?.subject==='romana'&&[d.title,d.title+' — '+d.author].includes(x.title));
async function uploadImages(zip,lessons){
 const unique=[...new Set(lessons.flatMap(d=>[d.hero,...d.repere.flatMap(r=>r.cards.map(c=>c.image))]))];
 for(const name of unique)if(!zip.has(name))throw Error('Imagine lipsă din ZIP: '+name);
 const urls=new Map(),bucket=db.storage.from('fx-universal-lesson-media');
 for(let i=0;i<unique.length;i++){
  const name=unique[i],data=zip.get(name);
  const uuid=crypto.randomUUID();
  const path='romana/import-2027/'+uuid+'.webp';
  setStatus('Încarc imaginile în biblioteca Formula X: '+(i+1)+' din '+unique.length+' · '+name);
  const {error}=await bucket.upload(path,new Blob([data],{type:'image/webp'}),{contentType:'image/webp',upsert:false});
  if(error)throw Error('Încărcarea imaginii '+name+' a eșuat: '+error.message);
  urls.set(name,bucket.getPublicUrl(path).data.publicUrl);
 }
 return urls;
}
async function importAll(){
 if(running||!staff||!fileInput.files?.[0])return;
 running=true;button.disabled=true;
 try{
  const zip=await unzip(fileInput.files[0]);
  const lessons=specs.map(s=>{
    if(!zip.has(s.file))throw Error('Fișier JSON lipsă: '+s.file);
    const d=JSON.parse(decoder.decode(zip.get(s.file)));validate(d,s.slug);return d;
  });
  let rows=rowsFrom(await rpc('fx_teacher_lesson_catalog'));
  const existing=lessons.filter(d=>match(rows,d));
  if(existing.length&&!update.checked)throw Error('Există deja '+existing.map(d=>d.title).join(', ')+'. Bifează actualizarea numai dacă vrei să înlocuiești aceste lecții.');
  if(existing.length&&!window.confirm('Actualizezi '+existing.length+' lecții existente? Materialele noi vor înlocui conținutul, dar nu vor modifica accesul sau grupele.'))return;
  const urls=await uploadImages(zip,lessons);
  let completed=0;
  for(const d of lessons){
   const doc=documentFor(d,urls),body=JSON.stringify(doc),summary='BAC 2027 · '+d.kind+'. '+d.subtitle;
   if(doc.blocks.length>150||body.length>175000)throw Error('Lecția '+d.title+' depășește limita editorului.');
   let current=match(rows,d);
   setStatus('Salvez lecția în Supabase: '+d.title);
   if(current){
    await rpc('fx_studio_update_lesson',{p_slug:current.slug,p_title:doc.title,p_summary:summary,p_body:body});
    result(d.slug,'Actualizată în Supabase. Drepturile existente au fost păstrate.');
   }else{
    await rpc('fx_create_lesson',{p_subject:'romana',p_title:doc.title,p_summary:summary,p_body:body});
    rows=rowsFrom(await rpc('fx_teacher_lesson_catalog'));
    current=match(rows,d);
    if(!current?.slug)throw Error('Lecția '+d.title+' a fost creată, dar identificatorul ei nu a putut fi confirmat. Verifică portalul profesorului.');
    await rpc('fx_set_lesson_enabled',{p_slug:current.slug,p_enabled:false});
    result(d.slug,'Salvată ca lecție nouă; accesul elevilor este oprit.');
   }
   completed++;
  }
  setStatus('Au fost importate '+completed+' lecții cu toate imaginile. Verifică în Studio și activează accesul elevilor din portal.',false,true);
 }catch(e){setStatus('Import întrerupt: '+(e?.message||String(e))+'. Dacă unele lecții au fost salvate, verifică-le în Portal profesori înainte de a reîncerca.',true);}
 finally{running=false;button.disabled=!staff||!fileInput.files?.[0];}
}
function fxRevisionCode(){
 // The URL fragment stays in the teacher's browser. Only the existing staff-authenticated RPCs can save a revision.
 const prefix="#editie=";
 const hasRevision=location.hash.startsWith(prefix);
 if(!hasRevision)return;
 const signature={testament:["Testament","Tudor Arghezi"],"eu-nu-strivesc-corola":["Eu nu strivesc corola de minuni a lumii","Lucian Blaga"],"riga-crypto-si-lapona-enigel":["Riga Crypto și lapona Enigel","Ion Barbu"]};
 let lessons=null;
 const revisionButton=document.createElement("button");
 revisionButton.type="button";revisionButton.textContent="Publică ediția revizuită";revisionButton.disabled=true;
 button.after(revisionButton);button.hidden=true;
 const legacyCheck=update.closest("label");
 if(legacyCheck){legacyCheck.hidden=true;legacyCheck.style.display="none";}
 const uploadPanel=fileInput.closest("section");
 const hint=document.createElement("p");
 hint.className="note";hint.textContent="Se pregătesc cele trei ediții. Dacă lecțiile există deja în Studio, ilustrațiile lor se păstrează automat.";
 if(uploadPanel){
  uploadPanel.querySelector("h2").textContent="Publică cele trei ediții revizuite";
  uploadPanel.querySelector("p").textContent="Textele, exercițiile și eseurile sunt pregătite. După verificarea contului, le poți salva în catalogul de Română.";
  const drop=uploadPanel.querySelector(".upload");drop.querySelector("strong").textContent="Arhivă cu ilustrații — opțională pentru lecțiile deja ilustrate";
  uploadPanel.insertBefore(hint,drop);
 }
 async function decodeLessons(){
  const b64=location.hash.slice(prefix.length);
  if(!/^[A-Za-z0-9_-]{1,85000}$/.test(b64))throw Error("Linkul ediției este incomplet.");
  if(typeof DecompressionStream!=="function")throw Error("Deschide linkul într-o versiune actuală de Safari, Chrome, Edge sau Firefox.");
  const binary=atob(b64.replace(/-/g,"+").replace(/_/g,"/")),raw=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip")).getReader();
  let total=0;const chunks=[];
  for(;;){const v=await reader.read();if(v.done)break;total+=v.value.length;if(total>210000){await reader.cancel();throw Error("Ediția depășește dimensiunea acceptată.");}chunks.push(v.value);}
  const edition=JSON.parse(await new Blob(chunks).text());
  if(edition.v!==1||!Array.isArray(edition.lessons)||edition.lessons.length!==specs.length)throw Error("Ediția trebuie să cuprindă cele trei lecții.");
  const ordered=specs.map(s=>edition.lessons.find(d=>d?.slug===s.slug));
  for(const d of ordered){
   if(!d||d.title!==signature[d.slug][0]||d.author!==signature[d.slug][1])throw Error("Titlul sau autorul lecției este incorect.");
   validate(d,d.slug);
   if(!Array.isArray(d.essay)||!d.essay.length||!Array.isArray(d.shorts)||d.shorts.length!==3)throw Error("Lipsesc eseul sau exercițiile de redactare.");
  }
  return ordered;
 }
 const slots=d=>[d.hero,...d.repere.flatMap(rep=>rep.cards.map(c=>c.image))];
 function imageReference(src){return typeof src==="string"&&(/^(https:\/\/|\/(?!\/))/.test(src))?src:null;}
 async function openExisting(row){
  if(!row)return null;
  const old=await rpc("fx_open_lesson",{p_slug:row.slug});
  if(!old?.access?.allowed||old.format!=="text"||typeof old.body!=="string")throw Error("Contul nu poate actualiza conținutul lecției "+row.title+".");
  let blocks=[];try{const obj=JSON.parse(old.body);if(obj?.fx_format==="formula-x-blocks-v1"&&Array.isArray(obj.blocks))blocks=obj.blocks;}catch{}
  const hero=blocks.find(b=>b.type==="image"&&imageReference(b.image));
  const illustrations=blocks.filter(b=>b.type==="split").map(b=>imageReference(b.image));
  const images=hero&&illustrations.length===6&&illustrations.every(Boolean)?[hero.image,...illustrations]:null;
  return {body:old.body,images};
 }
 async function artFromArchive(missing,file){
  if(!file)throw Error("Pentru "+missing.map(x=>x.d.title).join(", ")+" este necesară arhiva anterioară cu ilustrații. Selecteaz-o în câmpul de pe pagină, apoi apasă din nou Publică.");
  const zip=await unzip(file);
  const originals=missing.map(({d})=>{
   const entry=specs.find(s=>s.slug===d.slug);
   if(!zip.has(entry.file))throw Error("Arhiva nu conține fișa originală pentru "+d.title+".");
   const src=JSON.parse(decoder.decode(zip.get(entry.file)));
   if(src?.slug!==d.slug||!Array.isArray(src.repere)||src.repere.length!==3||src.repere.some(r=>!Array.isArray(r.cards)||r.cards.length!==2))throw Error("Nu pot asocia ilustrațiile pentru "+d.title+".");
   if(slots(src).some(n=>!imageName(n)||!zip.has(n)))throw Error("Arhiva nu conține toate ilustrațiile pentru "+d.title+".");
   return src;
  });
  const urls=await uploadImages(zip,originals);
  return originals.map(src=>slots(src).map(n=>urls.get(n)));
 }
 async function publish(){
  if(!lessons||!staff||running)return;
  running=true;revisionButton.disabled=true;
  try{
   const rows=rowsFrom(await rpc("fx_teacher_lesson_catalog"));
   const records=[];
   for(const d of lessons){
    const row=match(rows,d);
    const original=await openExisting(row);
    records.push({d,row,original,images:original?.images||null});
   }
   const missing=records.filter(x=>!x.images);
   if(missing.length&&!fileInput.files?.[0]){hint.textContent="Pentru lecțiile fără ilustrații în Studio, alege arhiva Formula X pe care o ai deja. Textele revizuite sunt încărcate din link.";fileInput.focus();throw Error("Selectează arhiva anterioară cu ilustrații pentru "+missing.map(x=>x.d.title).join(", ")+".");}
   const exist=records.filter(x=>x.row).length,fresh=records.length-exist;
   const message="Publici cele trei ediții revizuite? "+exist+" lecții existente își păstrează grupele și drepturile."+ (fresh?" Pentru cele "+fresh+" lecții noi vei putea configura accesul în Portal profesori.":"");
   if(!window.confirm(message))return;
   if(missing.length){const extracted=await artFromArchive(missing,fileInput.files[0]);missing.forEach((r,i)=>{r.images=extracted[i];});}
   const planned=records.map(record=>{
    const map=new Map(slots(record.d).map((k,i)=>[k,record.images[i]]));
    const doc=documentFor(record.d,map),body=JSON.stringify(doc);
    if(!body||doc.blocks.length>150||body.length>175000)throw Error("Lecția "+record.d.title+" depășește limitele Studio.");
    return {...record,doc,body};
   });
   let currentRows=rows;
   for(const {d,row,original,doc,body} of planned){
    const summary="BAC 2027 · "+d.kind+" · analiză pe trei repere, eseu-model și chestionar final";
    setStatus("Salvez "+d.title+"…");
    if(row){
     const current=await openExisting(row);
     if(current.body!==original.body&&current.body!==body)throw Error("Lecția "+d.title+" a fost modificată între timp. Verifică noua versiune înainte de a relua.");
     if(current.body!==body)await rpc("fx_studio_update_lesson",{p_slug:row.slug,p_title:doc.title,p_summary:summary,p_body:body});
     result(d.slug,"Ediție revizuită. Grupele și drepturile existente s-au păstrat.");
    }else{
     currentRows=rowsFrom(await rpc("fx_teacher_lesson_catalog"));
     if(match(currentRows,d))throw Error(d.title+" a apărut între timp în catalog. Reia pentru a păstra lecția deja creată.");
     await rpc("fx_create_lesson",{p_subject:"romana",p_title:doc.title,p_summary:summary,p_body:body});
     currentRows=rowsFrom(await rpc("fx_teacher_lesson_catalog"));
     const created=match(currentRows,d);if(!created?.slug)throw Error("Verifică în Portal profesori salvarea lecției "+d.title+".");
     await rpc("fx_set_lesson_enabled",{p_slug:created.slug,p_enabled:false});
     result(d.slug,"Ediție nouă. Alege grupele și activează accesul din Portal profesori.");
    }
   }
   hint.textContent="Cele trei ediții includ analiza, eseul-model, chestionarul final și formatul A4.";
   setStatus(fresh?"Cele trei ediții au fost salvate. Configurează în Portal profesori accesul grupelor pentru lecțiile noi.":"Cele trei ediții au fost publicate cu accesul existent al elevilor.",false,true);
  }catch(error){setStatus(String(error?.message||error),true);}
  finally{running=false;revisionButton.disabled=!staff||!lessons;}
 }
 revisionButton.addEventListener("click",publish);
 return {async ready(){
  try{lessons=await decodeLessons();revisionButton.disabled=!staff;hint.textContent="Ediție pregătită. Ilustrațiile se iau din lecțiile existente. Folosește arhiva anterioară numai pentru operele care încă nu au ilustrații în Studio.";
   setStatus("Cont de profesor verificat. Cele trei texte revizuite sunt pregătite pentru publicare.",false,true);
  }catch(error){setStatus(String(error?.message||error),true);}
 }};
}
const revisionLink=fxRevisionCode();
fileInput.addEventListener('change',()=>{button.disabled=!staff||!fileInput.files?.[0]||running});
button.addEventListener('click',importAll);
try{
 if(!window.supabase?.createClient||!window.FX_SUPABASE_URL||!window.FX_SUPABASE_ANON_KEY)throw Error('Lipsesc datele de conectare ale site-ului.');
 db=window.supabase.createClient(window.FX_SUPABASE_URL,window.FX_SUPABASE_ANON_KEY);
 const {data:{session},error}=await db.auth.getSession();if(error)throw error;
 if(!session?.user){setStatus('Conectează-te în Portal profesori, apoi revino la această pagină.',true);return;}
 const profile=await rpc('get_my_staff_profile');staff=Array.isArray(profile)?profile[0]:profile;
 if(!(staff&&(staff.role==='admin'||staff.role==='mentor'&&staff.subject==='romana'))){staff=null;setStatus('Importul este permis doar profesorului de Română sau administratorului.',true);return;}
 if(revisionLink){await revisionLink.ready();return;}
 setStatus('Cont de profesor verificat. Alege arhiva ZIP și apasă „Importă toate cele trei lecții”.',false,true);
}catch(e){setStatus('Nu s-a putut valida contul: '+(e?.message||e),true)}
})();