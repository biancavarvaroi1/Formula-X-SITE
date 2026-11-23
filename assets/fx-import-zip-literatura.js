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
 if(!d||d.slug!==slug||!d.title||!d.author||!Array.isArray(d.repere)||d.repere.length!==3)throw Error('Datele lecției '+slug+' nu respectă modelul de 3 repere.');
 if(d.repere.some(r=>!Array.isArray(r.cards)||r.cards.length!==2))throw Error('Lipsesc unele dintre cele 6 secțiuni ilustrate.');
 if(!Array.isArray(d.quiz)||d.quiz.length!==8||d.quiz.some(q=>!Array.isArray(q)||!Array.isArray(q[1])||q[1].length<2||!Number.isInteger(q[2])||q[2]<0||q[2]>=q[1].length))throw Error('Test incomplet în '+slug);
 const files=[d.hero,...d.repere.flatMap(r=>r.cards.map(c=>c.image))];
 if(files.some(x=>!imageName(x)))throw Error('Imagine cu denumire invalidă.');
 return files;
}
const clean=v=>String(v||'').trim();
function documentFor(d,urls){
 const blocks=[
 {type:'heading',title:'Date esențiale',text:d.author+' · '+d.year+' · '+d.volume+' · '+d.kind},
 {type:'image',image:urls.get(d.hero),alt:'Ilustrație în acuarelă pentru '+d.title},
 {type:'text',text:d.intro},
 {type:'callout',variant:'important',label:'IDEA CENTRALĂ',title:'De reținut',text:d.thesis}
 ];
 const qsize=d.quiz_sections||[3,3,2];let qi=0;
 d.repere.forEach((rep,index)=>{
  blocks.push({type:'heading',title:'Reperul '+(index+1)+' — '+rep.name,text:rep.lead});
  rep.cards.forEach((card,n)=>{
    blocks.push({type:'split',eyebrow:card.label||'EXPLICAȚIE',title:card.title,
      image:urls.get(card.image),side:n%2===0?'left':'right',
      text:card.steps.map((s,i)=>(i+1)+'. '+clean(s)).join('\n\n')});
    if(card.quote)blocks.push({type:'quote',text:card.quote});
    if(card.relevance)blocks.push({type:'callout',variant:'important',label:'RELEVANȚĂ',title:'De ce contează?',text:card.relevance});
  });
  let limit=Number(qsize[index]||0);
  for(let j=0;j<limit&&qi<d.quiz.length;j++,qi++){
    const q=d.quiz[qi];
    blocks.push({type:'quiz',id:slugQuiz(d.slug,qi),question:clean(q[0]),options:q[1].map(clean),correct:q[2],explanation:clean(q[3])});
  }
 });
 if(d.extra?.rows?.length){
  blocks.push({type:'heading',title:'Schemă de sinteză',text:d.extra.title||'Recapitulare'});
  blocks.push({type:'cards',title:(d.extra.columns||[]).join(' · '),text:d.extra.rows.map(row=>row.map(clean).join(' — ')).join('\n')});
 }
 if(d.conclusion)blocks.push({type:'callout',variant:'success',label:'CONCLUZIE',title:'Încheierea eseului',text:d.conclusion});
 return {fx_format:'formula-x-blocks-v1',subject:'romana',theme:'rose',title:d.title+' — '+d.author,
 subtitle:d.subtitle+' · 3 repere BAC · imagini și verificare',blocks};
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
fileInput.addEventListener('change',()=>{button.disabled=!staff||!fileInput.files?.[0]||running});
button.addEventListener('click',importAll);
try{
 if(!window.supabase?.createClient||!window.FX_SUPABASE_URL||!window.FX_SUPABASE_ANON_KEY)throw Error('Lipsesc datele de conectare ale site-ului.');
 db=window.supabase.createClient(window.FX_SUPABASE_URL,window.FX_SUPABASE_ANON_KEY);
 const {data:{session},error}=await db.auth.getSession();if(error)throw error;
 if(!session?.user){setStatus('Conectează-te în Portal profesori, apoi revino la această pagină.',true);return;}
 const profile=await rpc('get_my_staff_profile');staff=Array.isArray(profile)?profile[0]:profile;
 if(!(staff&&(staff.role==='admin'||staff.role==='mentor'&&staff.subject==='romana'))){staff=null;setStatus('Importul este permis doar profesorului de Română sau administratorului.',true);return;}
 setStatus('Cont de profesor verificat. Alege arhiva ZIP și apasă „Importă toate cele trei lecții”.',false,true);
}catch(e){setStatus('Nu s-a putut valida contul: '+(e?.message||e),true)}
})();