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
const templates=[
["bac","📖","Eseu BAC",[
 {type:"heading",title:"REPERUL 1 — Context și particularități",text:"Încadrare, trăsături și tema operei"},
 {type:"split",eyebrow:"TRĂSĂTURA 1",title:"Prima trăsătură",text:"Explică și folosește un exemplu sugestiv.",image:"",side:"left"},
 {type:"split",eyebrow:"TRĂSĂTURA 2",title:"A doua trăsătură",text:"Prezintă elementele reprezentative.",image:"",side:"right"},
 {type:"callout",variant:"important",label:"RELEVANȚĂ",title:"Concluzia primului reper",text:"Cum demonstrează cele două trăsături apartenența operei?"},
 {type:"heading",title:"REPERUL 2 — Scene și structură",text:"Două scene semnificative"},
 {type:"split",eyebrow:"SCENA 1",title:"Prima scenă",text:"Prezintă evenimentul, apoi explică relevanța.",image:"",side:"left"},
 {type:"split",eyebrow:"SCENA 2",title:"A doua scenă",text:"Explică legătura scenei cu tema sau cu personajul.",image:"",side:"right"},
 {type:"quiz",question:"Ce idee este esențială pentru această operă?",options:["Completează A","Completează B","Completează C","Completează D"],correct:0,explanation:"Explică de ce acesta este răspunsul corect."}
]],
["stem","🧪","Științe / STEM",[
 {type:"heading",title:"REPERUL 1 — Ce învățăm?",text:"Obiectivele lecției"},
 {type:"text",text:"Explică mai întâi noțiunile esențiale, într-un limbaj accesibil."},
 {type:"split",eyebrow:"EXEMPLU VIZUAL",title:"Cum funcționează?",text:"Explică imaginea, graficul sau schema.",image:"",side:"left"},
 {type:"steps",title:"Rezolvare pas cu pas",text:"Identifică datele\nAlege metoda\nAplică formula\nVerifică rezultatul"},
 {type:"callout",variant:"success",label:"REȚINE",title:"Formula / principiul important",text:"Scrie regula de bază și când se folosește."},
 {type:"quiz",question:"Aplică regula într-un exemplu.",options:["Răspuns A","Răspuns B","Răspuns C","Răspuns D"],correct:0,explanation:"Prezintă rezolvarea."}
]],
["recap","🎯","Recapitulare",[
 {type:"heading",title:"Recapitulare — Ce trebuie să știi?",text:"Principalele noțiuni"},
 {type:"cards",title:"Cele mai importante 4 idei",text:"Prima idee\nA doua idee\nA treia idee\nA patra idee"},
 {type:"callout",variant:"important",label:"GREȘEALĂ FRECVENTĂ",title:"La ce să fii atent",text:"Explică o confuzie obișnuită."},
 {type:"quiz",question:"Întrebarea 1",options:["A","B","C","D"],correct:0,explanation:"Argumentează răspunsul."},
 {type:"quiz",question:"Întrebarea 2",options:["A","B","C","D"],correct:1,explanation:"Argumentează răspunsul."}
]]
];
const subjects={romana:"Română",matematica:"Matematică",biologie:"Biologie",chimie:"Chimie",fizica:"Fizică",geografie:"Geografie",logica:"Logică"};
const clone=x=>JSON.parse(JSON.stringify(x));
const params=new URLSearchParams(location.search);
const existingSlug=params.get("slug");
let state={record:null,mode:"studio",userId:null,createId:crypto.randomUUID(),doc:{fx_format:fmt,title:"Lecție nouă",subtitle:"Învață logic, vizual și interactiv.",subject:"romana",theme:"rose",blocks:[]},selected:-1,subject:"romana",staff:null,sb:null,loaded:false,saving:false,dirty:false,slug:existingSlug||null,viewer:"desktop",lastSavedHash:""};
const newId=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const tell=(message,error=false)=>{const el=$("fxs-message");el.textContent=message;el.classList.toggle("fxs-error",error)};
function draftKey(){return "fx-studio-draft-"+(state.slug||"new")+"-"+(state.userId||"anonymous")}
function saveLocal(){
 try{localStorage.setItem(draftKey(),JSON.stringify({doc:state.doc,createId:state.createId,revision:state.record?.revision,when:new Date().toISOString()}));}catch(_){}
}
function mark(){if(!state.loaded)return;state.dirty=true;saveLocal();renderPreview();$("fxs-save").disabled=!state.loaded;}
function newBlock(type){const b=clone(presets[type]||{});b.type=type;b.id=newId();return b}
function renderBlocks(){
 if(state.mode!=="studio"){
   window.FormulaXLessonModelEditor.mount($("fxs-items"),state.doc,mark,{subject:state.doc.subject,slug:state.slug});
   $("fxs-fields").textContent="Editează reperele, scenele și întrebările de mai sus. Structura originală a lecției se păstrează.";
   return;
 }
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
 try{if(state.mode!=="studio"){window.FormulaXLessonModelEditor.preview($("fxs-preview"),state.doc);return;}window.FormulaXStudioRenderer.render($("fxs-preview"),state.doc,{author:"Profesor Formula X"},{},{preview:true})}
 catch(err){tell("Previzualizarea a eșuat: "+err.message,true)}
}
function renderAll(){
 $("fxs-title").value=state.doc.title||"";
 $("fxs-subtitle").value=state.doc.subtitle||"";
 $("fxs-subject").value=state.doc.subject||"romana";
 $("fxs-theme").value=state.doc.theme||"rose";
 $("fxs-count").textContent=state.mode==="studio"?state.doc.blocks.length+" blocuri":"Formatul original al lecției";
 $("fxs-palette").hidden=state.mode!=="studio";$("fxs-templates").hidden=state.mode!=="studio";
 $("fxs-theme").disabled=state.mode!=="studio";
 $("fxs-open").hidden=!state.slug;
 if(state.slug)$("fxs-open").href=window.FormulaXLessons.lessonUrl(state.slug);
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
 if(d.title.trim().length<2||d.title.length>190)throw Error("Titlul trebuie să aibă între 2 și 190 de caractere.");
 if(!Object.hasOwn(subjects,d.subject))throw Error("Materia nu este validă.");
 if(state.mode!=="studio"){
   const content=JSON.stringify(d);
   if(new TextEncoder().encode(content).length>400000)throw Error("Lecția depășește limita de 400 KB.");
   return content;
 }
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
 if(new TextEncoder().encode(content).length>175000)throw Error("Lecția depășește limita de 175 KB. Folosește încărcarea de imagini, nu imagini introduse ca date base64.");
 return content;
}
async function save(){
 if(state.saving||!state.loaded)return;
 state.saving=true;$("fxs-save").disabled=true;tell("Se verifică și se salvează lecția…");
 try{
   const snapshot=ensureValid(),doc=JSON.parse(snapshot),draft=draftKey(),userId=state.userId;
   const {user}=await window.FormulaXLessonStore.requireStaff();
   if(user.id!==userId)throw Error("Contul a fost schimbat. Redeschide editorul.");
   const receipt=state.record
     ?await window.FormulaXLessonStore.save(state.record,doc.title,doc.subtitle||"",doc)
     :await window.FormulaXLessonStore.create(state.createId,doc);
   if(state.userId!==userId||!state.loaded)return;
   if(!receipt?.slug||!Number.isFinite(Number(receipt.revision)))throw Error("Serverul nu a confirmat versiunea salvată.");
   state.slug=receipt.slug;
   state.record={...(state.record||{}),...receipt,kind:state.record?.kind||"studio",original:doc};
   const url=new URL(location.href);url.searchParams.set("slug",state.slug);history.replaceState(null,"",url.pathname+url.search);
   state.dirty=JSON.stringify(state.doc)!==snapshot;
   try{localStorage.removeItem(draft);}catch(_){}
   if(state.dirty)saveLocal();
   $("fxs-open").hidden=false;$("fxs-open").href=window.FormulaXLessons.lessonUrl(state.slug);
   tell(state.dirty?"Versiunea a fost salvată. Mai ai modificări noi de salvat.":"Lecția a fost salvată. Accesul elevilor se gestionează din portal.");
 }catch(e){tell("Salvarea nu a reușit: "+window.FormulaXLessonStore.errorMessage(e),true);}
 finally{state.saving=false;$("fxs-save").disabled=!state.loaded;}
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
 const record=await window.FormulaXLessonStore.load(state.slug);
 state.record=record;
 state.mode=["studio","text"].includes(record.kind)?"studio":"model";
 state.doc=record.kind==="text"
   ?{fx_format:fmt,subject:record.subject,title:record.title,subtitle:record.summary||"",theme:"rose",blocks:[{type:"text",id:newId(),text:record.body}]}
   :record.doc;
 state.doc.title=record.title;state.doc.subtitle=record.summary||"";state.doc.subject=record.subject;
 const draft=localStorage.getItem(draftKey());
 if(draft){try{const saved=JSON.parse(draft);
   if(saved.doc?.subject===record.subject&&confirm("Recuperezi ciorna nesalvată pentru această lecție?")){state.doc=saved.doc;state.dirty=true;if(Number.isFinite(saved.revision))state.record.revision=saved.revision;}
 }catch(_){} }
}
let initSequence=0;
async function init(){
 try{
   if(!window.supabase?.createClient||!window.FX_SUPABASE_URL||!window.FX_SUPABASE_ANON_KEY)throw Error("Configurația Supabase lipsește.");
   const request=++initSequence;
   const sb=state.sb=window.FormulaXLessonStore.client();
   const {staff,user}=await window.FormulaXLessonStore.requireStaff();
   if(request!==initSequence)return;
   state.staff=staff;state.userId=user.id;
   if(!Object.hasOwn(subjects,staff.subject||"")&&staff.role!=="admin")throw Error("Materia profesorului nu este recunoscută.");
   if(staff.role!=="admin"||state.slug){if(staff.role!=="admin")state.doc.subject=staff.subject;$("fxs-subject").disabled=true}
   if(state.slug)await openLesson();
   else{
     const stored=localStorage.getItem(draftKey());
     if(stored){
       try{const val=JSON.parse(stored);if(val.doc?.fx_format===fmt&&confirm("Recuperezi ciorna nesalvată?")){state.doc=val.doc;state.dirty=true;if(/^[a-f0-9-]{36}$/.test(val.createId||""))state.createId=val.createId;}}catch(_){}
     }
     if(staff.role!=="admin")state.doc.subject=staff.subject;
   }
   if(staff.role!=="admin"&&state.doc.subject!==staff.subject)throw Error("Nu ai acces să editezi lecțiile acestei materii.");
   if(request!==initSequence)return;
   state.loaded=true;
   $("fxs-save").disabled=false;
   $("fxs-user").textContent=user.email;
   renderAll();tell(state.slug?"Lecție încărcată. Poți modifica blocurile și salva.":"Poți începe o lecție nouă.");
 }catch(e){
   $("fxs-save").disabled=true;
   $("fxs-user").textContent="Acces restricționat";
   tell(e.message,true);
   renderAll();
 }
}
$("fxs-templates").innerHTML=templates.map(([id,icon,label])=>'<button type="button" data-template="'+id+'"><span aria-hidden="true">'+icon+'</span>'+esc(label)+'</button>').join("");
$("fxs-templates").addEventListener("click",e=>{
 const button=e.target.closest("[data-template]");if(!button||!state.loaded)return;
 if(state.mode!=="studio")return;
 const template=templates.find(x=>x[0]===button.dataset.template);if(!template)return;
 if(state.doc.blocks.length&&!confirm("Acest șablon înlocuiește blocurile actuale. Continui?"))return;
 state.doc.blocks=clone(template[3]).map(b=>({...b,id:newId()}));
 state.selected=0;renderAll();mark();tell("Șablonul a fost încărcat. Personalizează imaginile și explicațiile.");
});
$("fxs-palette").innerHTML=types.map(([id,icon,label])=>'<button type="button" data-add="'+id+'"><span aria-hidden="true">'+icon+'</span>'+esc(label)+'</button>').join("");
$("fxs-palette").addEventListener("click",e=>{
 const a=e.target.closest("[data-add]");if(!a||!state.loaded||state.mode!=="studio")return;
 if(state.doc.blocks.length>=150){tell("Ai atins limita de 150 de blocuri.",true);return}
 state.doc.blocks.push(newBlock(a.dataset.add));state.selected=state.doc.blocks.length-1;
 renderBlocks();mark();
});
$("fxs-items").addEventListener("click",e=>{
 if(state.mode!=="studio"||!state.loaded)return;
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
renderAll();
window.FormulaXLessonStore.client().auth.onAuthStateChange((event,session)=>{
 if(!session?.user||state.userId&&session.user.id!==state.userId){
   initSequence++;state.loaded=false;state.record=null;state.userId=null;state.dirty=false;state.mode="studio";
   state.doc={fx_format:fmt,title:"Lecție",subject:"romana",blocks:[]};
   $("fxs-save").disabled=true;$("fxs-items").oninput=null;$("fxs-items").onclick=null;
   renderAll();tell("Sesiunea a fost închisă sau contul a fost schimbat. Reconectează-te în portal.",true);
 }
});
await init();
})();
