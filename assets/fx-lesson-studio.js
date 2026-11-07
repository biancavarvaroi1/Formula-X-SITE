/* Formula X · Studio vizual pentru profesori — format structurat, continut verificat pe server */
(async function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=v=>window.FormulaXStudioRenderer.escape(v);
const fmt=window.FormulaXStudioRenderer.FORMAT;
const types=[
  ["heading","§","Titlu / reper"],["text","¶","Text / explicație"],
  ["split","▣","Imagine + text"],["image","▧","Imagine mare"],
  ["callout","★","Relevanță / de reținut"],["steps","①","Pași / scene"],
  ["cards","▦","Fișe / idei"],["quote","❞","Citat"],
  ["quiz","☑","Întrebare grilă"],["video","▶","Video / link"],
  ["divider","—","Separator"]
];
const fields={
 heading:[["title","Titlu"],["text","Explicație scurtă","textarea"]],
 text:[["text","Textul lecției","textarea"]],
 split:[["eyebrow","Etichetă"],["title","Titlu"],["text","Explicație","textarea"],["image","Adresă imagine","image"],["side","Poziția imaginii","side"]],
 image:[["image","Adresă imagine","image"],["alt","Descriere pentru accesibilitate"],["caption","Legendă"]],
 callout:[["variant","Stilul casetei","variant"],["label","Etichetă"],["title","Titlu"],["text","Conținut","textarea"]],
 steps:[["title","Titlu"],["text","Un pas pe fiecare rând","textarea"]],
 cards:[["title","Titlu"],["text","O idee pe fiecare rând","textarea"]],
 quote:[["text","Citat","textarea"],["author","Autor / sursă"]],
 quiz:[["question","Întrebare"],["option0","Varianta A"],["option1","Varianta B"],["option2","Varianta C"],["option3","Varianta D"],["correct","Răspuns corect","correct"],["explanation","Explicație","textarea"]],
 video:[["title","Titlu"],["url","Link HTTPS"],["text","Descriere","textarea"]],divider:[]
};
const presets={
 heading:{title:"Reperul 1 — Contextul operei",text:"De ce este important?"},
 text:{text:"Explică noțiunea pe scurt. Poți evidenția cu **două steluțe** cuvintele importante."},
 split:{eyebrow:"SCENĂ REPREZENTATIVĂ",title:"Titlul scenei",text:"Explică ce se întâmplă și relevanța.",image:"",side:"left"},
 image:{image:"",alt:"Ilustrație sugestivă",caption:""},
 callout:{variant:"important",label:"RELEVANȚĂ",title:"De reținut",text:"Legătura dintre scenă și tema operei."},
 steps:{title:"Ideile în ordine",text:"Prima idee\nA doua idee\nA treia idee"},
 cards:{title:"Idei de învățat",text:"Ideea 1\nIdeea 2"},
 quote:{text:"Introdu un citat scurt din materialele pe care ai dreptul să le publici.",author:""},
 quiz:{question:"Ce ai reținut din lecție?",options:["Varianta A","Varianta B","Varianta C","Varianta D"],correct:0,explanation:"De ce este corect răspunsul?"},
 video:{title:"Material suplimentar",url:"",text:"Link către un video educativ sau o resursă."},
 divider:{}
};
const subjects={romana:"Română",matematica:"Matematică",biologie:"Biologie",chimie:"Chimie",fizica:"Fizică",geografie:"Geografie",logica:"Logică"};
const clone=x=>JSON.parse(JSON.stringify(x));
const params=new URLSearchParams(location.search);
const existingSlug=params.get("slug");
let state={doc:{fx_format:fmt,title:"Lecție nouă",subtitle:"Învață logic, vizual și interactiv.",subject:"romana",theme:"rose",blocks:[]},selected:-1,subject:"romana",staff:null,sb:null,loaded:false,saving:false,dirty:false,slug:existingSlug||null,viewer:"desktop",lastSavedHash:""};
const newId=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const tell=(message,error=false)=>{const el=$("fxs-message");el.textContent=message;el.classList.toggle("fxs-error",error)};
function draftKey(){return "fx-studio-draft-"+(state.slug||"new")+"-"+(state.staff?.user_id||state.staff?.id||state.sb?.auth?.user?.id||"staff")}
function saveLocal(){
 try{localStorage.setItem(draftKey(),JSON.stringify({doc:state.doc,when:new Date().toISOString()}));}catch(_){}
}
function mark(){state.dirty=true;saveLocal();renderPreview();$("fxs-save").disabled=!state.loaded;}
function newBlock(type){const b=clone(presets[type]||{});b.type=type;b.id=newId();return b}
function renderBlocks(){
 const target=$("fxs-items");
 target.innerHTML=state.doc.blocks.map((b,i)=>{
   const title=b.title||b.question||b.text||types.find(x=>x[0]===b.type)?.[2]||b.type;
   return '<article class="fxs-item '+(state.selected===i?"selected":"")+'"><div class="fxs-item-head">'+
    '<button type="button" class="fxs-item-select" data-select="'+i+'" title="Editează">'+esc((i+1)+". "+String(title).slice(0,65))+'</button>'+
    '<button type="button" data-up="'+i+'" title="Mută în sus" '+(i===0?"disabled":"")+'>↑</button>'+
    '<button type="button" data-down="'+i+'" title="Mută în jos" '+(i===state.doc.blocks.length-1?"disabled":"")+'>↓</button>'+
    '<button type="button" data-duplicate="'+i+'" title="Duplică">⧉</button>'+
    '<button type="button" data-remove="'+i+'" title="Șterge">×</button></div></article>';
 }).join("")||'<p class="fxs-muted">Nu există blocuri. Alege unul din panoul din stânga.</p>';
 renderForm();
}
function field(b,def){
 const [k,label,kind]=def;let value=k.startsWith("option")?b.options?.[Number(k.slice(6))]||"":b[k]??"";
 const name='data-field="'+esc(k)+'"';
 let control;
 if(kind==="textarea")control='<textarea '+name+' rows="5">'+esc(value)+'</textarea>';
 else if(kind==="side")control='<select '+name+'><option value="left" '+(value!=="right"?"selected":"")+'>Stânga</option><option value="right" '+(value==="right"?"selected":"")+'>Dreapta</option></select>';
 else if(kind==="variant")control='<select '+name+'>'+[["important","Important"],["normal","Normal"],["success","Concluzie"]].map(([v,l])=>'<option value="'+v+'" '+(value===v?"selected":"")+'>'+l+'</option>').join("")+'</select>';
 else if(kind==="correct")control='<select '+name+'>'+[0,1,2,3].map(i=>'<option value="'+i+'" '+(Number(value)===i?"selected":"")+'>'+String.fromCharCode(65+i)+'</option>').join("")+'</select>';
 else control='<input '+name+' value="'+esc(value)+'" '+(kind==="image"?'type="url" placeholder="https://... sau /assets/..."':'type="text"')+'>';
 return '<label class="fxs-field">'+esc(label)+control+'</label>'+(kind==="image"?'<button type="button" class="fxs-button" data-upload="'+esc(k)+'">Încarcă imagine (JPG/PNG/WEBP)</button>':"");
}
function renderForm(){
 const b=state.doc.blocks[state.selected];
 if(!b){$("fxs-fields").innerHTML='<p class="fxs-muted">Alege un bloc pentru a-l modifica. Previzualizarea din dreapta se actualizează automat.</p>';return}
 $("fxs-fields").innerHTML='<p class="fxs-muted">Bloc '+(state.selected+1)+' · '+esc(types.find(x=>x[0]===b.type)?.[2]||b.type)+'</p><div class="fxs-form">'+(fields[b.type]||[]).map(def=>field(b,def)).join("")+'</div>';
}
function renderPreview(){
 try{window.FormulaXStudioRenderer.render($("fxs-preview"),state.doc,{author:"Profesor Formula X"},{},{preview:true})}
 catch(err){tell("Previzualizarea a eșuat: "+err.message,true)}
}
function renderAll(){
 $("fxs-title").value=state.doc.title||"";
 $("fxs-subtitle").value=state.doc.subtitle||"";
 $("fxs-subject").value=state.doc.subject||"romana";
 $("fxs-theme").value=state.doc.theme||"rose";
 $("fxs-count").textContent=state.doc.blocks.length+" blocuri";
 renderBlocks();renderPreview();
}
function select(i){state.selected=i;renderBlocks()}
function mutateIndex(i,action){
 const a=state.doc.blocks;
 if(!a[i])return;
 if(action==="up"&&i>0){[a[i-1],a[i]]=[a[i],a[i-1]];state.selected=i-1}
 if(action==="down"&&i<a.length-1){[a[i+1],a[i]]=[a[i],a[i+1]];state.selected=i+1}
 if(action==="remove"){if(!confirm("Ștergi acest bloc din lecție?"))return;a.splice(i,1);state.selected=Math.min(i,a.length-1)}
 if(action==="duplicate"){const copy=clone(a[i]);copy.id=newId();a.splice(i+1,0,copy);state.selected=i+1}
 renderBlocks();mark();
}
function ensureValid(){
 const d=state.doc;
 if(!d.title.trim()||d.title.length>190)throw Error("Titlul trebuie să aibă între 1 și 190 de caractere.");
 if(!Object.hasOwn(subjects,d.subject))throw Error("Materia nu este validă.");
 if(d.blocks.length<1||d.blocks.length>150)throw Error("Adaugă între 1 și 150 de blocuri.");
 for(const b of d.blocks){
   if(!fields[b.type])throw Error("Tip de bloc invalid.");
   if(b.type==="quiz"){
     if(!b.question.trim()||b.options.some(x=>!String(x).trim())||b.options.length!==4)throw Error("Completează întrebarea și toate cele patru variante.");
     if(![0,1,2,3].includes(Number(b.correct)))throw Error("Răspuns corect invalid.");
   }
   if(["image","split"].includes(b.type)&&b.image){
     if(!window.FormulaXStudioRenderer.safeUrl(b.image))throw Error("Imaginea trebuie să aibă o adresă HTTPS sau /assets/.");
   }
 }
 const content=JSON.stringify(d);
 if(content.length>175000)throw Error("Lecția depășește limita de 175 KB. Folosește încărcarea de imagini, nu imagini introduse ca date base64.");
 return content;
}
async function save(){
 if(state.saving||!state.loaded)return;
 state.saving=true;$("fxs-save").disabled=true;tell("Se verifică și se salvează lecția…");
 try{
   const body=ensureValid();
   const previousDraftKey=draftKey();
   if(state.slug){
     const {error}=await state.sb.rpc("fx_studio_update_lesson",{p_slug:state.slug,p_title:state.doc.title,p_summary:state.doc.subtitle||"",p_body:body});
     if(error)throw error;
   }else{
     const {data,error}=await state.sb.rpc("fx_create_lesson",{p_subject:state.doc.subject,p_title:state.doc.title,p_summary:state.doc.subtitle||"",p_body:body});
     if(error)throw error;
     // Slugul exact este stabilit de server; nu ghicim. Îl identificăm după catalogul profesorului.
     const {data:cat,error:ce}=await state.sb.rpc("fx_teacher_lesson_catalog");
     if(!ce){
       const rows=cat?.lessons||[];
       const found=rows.filter(x=>x.title===state.doc.title&&x.subject===state.doc.subject);
       if(found.length===1&&found[0].slug)state.slug=found[0].slug;
     }
     if(!state.slug)tell("Lecția a fost creată. O găsești în panoul profesorului; pentru editare, deschide-o de acolo.");
   }
   localStorage.removeItem(previousDraftKey);state.dirty=false;
   tell("Lecția a fost salvată în Formula X. Accesul elevilor se acordă separat din portal.");
   $("fxs-save").disabled=false;
 }catch(e){
   tell("Salvarea nu a reușit: "+(e.code==="42883"||e.code==="PGRST202"?"trebuie activată funcția SQL a studioului pentru editarea lecțiilor existente.":e.message),true);
   $("fxs-save").disabled=false;
 }finally{state.saving=false}
}
async function uploadImage(key){
 const b=state.doc.blocks[state.selected];
 if(!b)return;
 const picker=document.createElement("input");picker.type="file";picker.accept="image/png,image/jpeg,image/webp";
 picker.onchange=async()=>{
   const file=picker.files?.[0];if(!file)return;
   if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>8*1024*1024){tell("Imaginea trebuie să fie PNG, JPG sau WEBP, maximum 8 MB.",true);return}
   const ext=file.type==="image/jpeg"?"jpg":file.type.split("/")[1];
   const directory=state.doc.subject+"/"+(state.slug||"draft")+"/";
   const name=directory+(crypto.randomUUID?.()||newId())+"."+ext;
   tell("Se încarcă imaginea…");
   try{
     const bucket=state.sb.storage.from("fx-universal-lesson-media");
     const {error}=await bucket.upload(name,file,{contentType:file.type,upsert:false});
     if(error)throw error;
     b[key]=bucket.getPublicUrl(name).data.publicUrl;
     renderForm();mark();tell("Imaginea a fost încărcată.");
   }catch(e){tell("Imaginea nu a fost încărcată: "+e.message,true)}
 };
 picker.click();
}
async function openLesson(){
 const {data:result,error}=await state.sb.rpc("fx_open_lesson",{p_slug:state.slug});
 if(error)throw error;
 if(!result?.access?.allowed)throw Error("Contul nu are permisiunea de a deschide această lecție.");
 if(result.format!=="text"||typeof result.body!=="string")throw Error("Lecția este într-un format protejat diferit. Folosește editorul existent.");
 let obj;
 try{obj=JSON.parse(result.body)}catch{obj=null}
 if(!obj||obj.fx_format!==fmt){
   throw Error("Lecția utilizează un format mai vechi. Pentru a o păstra intactă, se editează din editorul original. Studio este pentru lecțiile noi.");
 }
 state.doc=obj;state.doc.title=result.title||obj.title;
 const draft=localStorage.getItem(draftKey());
 if(draft){
   try{const parsed=JSON.parse(draft);
     if(parsed.doc?.fx_format===fmt&&confirm("Am găsit o ciornă nesalvată pentru această lecție. Vrei să o recuperezi?"))state.doc=parsed.doc;
   }catch(_){}
 }
}
async function init(){
 try{
   if(!window.supabase?.createClient||!window.FX_SUPABASE_URL||!window.FX_SUPABASE_ANON_KEY)throw Error("Configurația Supabase lipsește.");
   const sb=state.sb=window.FormulaXAuthClient||window.supabase.createClient(window.FX_SUPABASE_URL,window.FX_SUPABASE_ANON_KEY);
   const {data:{session}}=await sb.auth.getSession();
   if(!session?.user)throw Error("Conectează-te în portalul profesorului înainte să deschizi Studio.");
   const {data,error}=await sb.rpc("get_my_staff_profile");
   if(error)throw error;
   const staff=state.staff=Array.isArray(data)?data[0]:data;
   if(!staff||!["mentor","admin"].includes(staff.role))throw Error("Doar profesorii și administratorii pot utiliza Studio.");
   if(!Object.hasOwn(subjects,staff.subject||"")&&staff.role!=="admin")throw Error("Materia profesorului nu este recunoscută.");
   if(staff.role!=="admin"||state.slug){if(staff.role!=="admin")state.doc.subject=staff.subject;$("fxs-subject").disabled=true}
   if(state.slug)await openLesson();
   else{
     const stored=localStorage.getItem(draftKey());
     if(stored){
       try{const val=JSON.parse(stored);if(val.doc?.fx_format===fmt&&confirm("Recuperezi ciorna nesalvată?"))state.doc=val.doc}catch(_){}
     }
     if(staff.role!=="admin")state.doc.subject=staff.subject;
   }
   if(staff.role!=="admin"&&state.doc.subject!==staff.subject)throw Error("Nu ai acces să editezi lecțiile acestei materii.");
   state.loaded=true;
   $("fxs-save").disabled=false;
   $("fxs-user").textContent=session.user.email;
   renderAll();tell(state.slug?"Lecție încărcată. Poți modifica blocurile și salva.":"Poți începe o lecție nouă.");
 }catch(e){
   $("fxs-save").disabled=true;
   $("fxs-user").textContent="Acces restricționat";
   tell(e.message,true);
   renderAll();
 }
}
$("fxs-palette").innerHTML=types.map(([id,icon,label])=>'<button type="button" data-add="'+id+'"><span aria-hidden="true">'+icon+'</span>'+esc(label)+'</button>').join("");
$("fxs-palette").addEventListener("click",e=>{
 const a=e.target.closest("[data-add]");if(!a||!state.loaded)return;
 if(state.doc.blocks.length>=150){tell("Ai atins limita de 150 de blocuri.",true);return}
 state.doc.blocks.push(newBlock(a.dataset.add));state.selected=state.doc.blocks.length-1;
 renderBlocks();mark();
});
$("fxs-items").addEventListener("click",e=>{
 const a=e.target.closest("[data-select],[data-up],[data-down],[data-duplicate],[data-remove]");
 if(!a)return;
 for(const name of ["select","up","down","duplicate","remove"])if(a.hasAttribute("data-"+name)){
   const i=Number(a.dataset[name]);name==="select"?select(i):mutateIndex(i,name);return;
 }
});
$("fxs-fields").addEventListener("input",e=>{
 const el=e.target.closest("[data-field]");if(!el||!state.loaded)return;
 const b=state.doc.blocks[state.selected],key=el.dataset.field;if(!b)return;
 if(key.startsWith("option"))b.options[Number(key.slice(6))]=el.value;
 else b[key]=key==="correct"?Number(el.value):el.value;
 mark();
});
$("fxs-fields").addEventListener("change",e=>{
 const el=e.target.closest("[data-field]");if(!el)return;
 // Render form only for selects to preserve typing focus.
 if(["correct","side","variant"].includes(el.dataset.field))renderForm();
});
$("fxs-fields").addEventListener("click",e=>{
 const el=e.target.closest("[data-upload]");if(el)uploadImage(el.dataset.upload);
});
for(const [id,key] of [["fxs-title","title"],["fxs-subtitle","subtitle"],["fxs-subject","subject"],["fxs-theme","theme"]]){
 $(id).addEventListener("input",e=>{state.doc[key]=e.target.value;mark()});
}
$("fxs-save").onclick=save;
$("fxs-print").onclick=()=>window.print();
$("fxs-screen").onclick=()=>{
 state.viewer=state.viewer==="desktop"?"mobile":"desktop";
 $("fxs-preview-stage").classList.toggle("mobile",state.viewer==="mobile");
 $("fxs-screen").textContent=state.viewer==="desktop"?"📱 Telefon":"🖥️ Calculator";
};
window.addEventListener("beforeunload",e=>{
 if(state.dirty){e.preventDefault();e.returnValue=""}
});
renderAll();await init();
})();