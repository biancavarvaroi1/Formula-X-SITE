/* Formula X editor universal: RLS verificat in Supabase; nu modifica accesul elevilor. */
(function(){
'use strict';
var path=location.pathname.match(/^\/(?:assets\/)?lectii\/([a-z-]+)\/([a-z0-9-]+)\.html$/i);
if(!path)return;
var subject=path[1],slug=path[2],page=subject+'/'+slug;
var state={sb:null,patches:{texts:{},images:{},model:{},answers:{}},revision:null,edit:false,allowed:false,dirty:false,model:null};
var nodes=new WeakMap(),images=new WeakMap();
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function keyText(s){return 't-'+hash(String(s).replace(/\s+/g,' ').trim())}
function keyImage(x){var v=images.get(x);return 'i-'+hash((v.src||'')+'|'+v.alt+'|'+v.id)}
function changed(){state.dirty=true;if($('fxe-save'))$('fxe-save').disabled=false;note('Modificari nesalvate.')}
function note(v){if($('fxe-message'))$('fxe-message').textContent=v}
function valid(){return !!(window.supabase&&window.supabase.createClient&&window.FX_SUPABASE_URL&&window.FX_SUPABASE_ANON_KEY)}
function normal(o){var p={texts:{},images:{},model:{},answers:{}};if(o&&typeof o==='object')Object.keys(p).forEach(function(k){if(o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k]))p[k]=o[k]});return p}
function patchModel(value){if(!value||typeof value!=='object')return value;Object.entries(state.patches.model).forEach(function(e){var ks=e[0].slice(1).split('/').map(function(s){return s.replace(/~1/g,'/').replace(/~0/g,'~')});var cur=value;for(var i=0;i<ks.length-1;i++){if(cur==null||!Object.hasOwn(cur,ks[i]))return;cur=cur[ks[i]]}var k=ks[ks.length-1];if(cur&&Object.hasOwn(cur,k)&&typeof cur[k]===typeof e[1])cur[k]=e[1]});return value}
function registerModel(x){state.model=x}
function editable(node){return node.parentElement&&!node.parentElement.closest('[data-fxe-ui],script,style,noscript,textarea,input,select,button,a,dialog')&&node.nodeValue.trim()}
function apply(){
 if(!state.sb)return;
 var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){return editable(n)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
 var list=[];while(walker.nextNode())list.push(walker.currentNode);
 list.forEach(function(n){if(!nodes.has(n))nodes.set(n,n.nodeValue);var v=state.patches.texts[keyText(nodes.get(n))];if(typeof v==='string'&&n.nodeValue!==v)n.nodeValue=v});
 document.querySelectorAll('img').forEach(function(img){if(img.closest('[data-fxe-ui]'))return;if(!images.has(img))images.set(img,{src:img.getAttribute('src')||'',alt:img.alt||'',id:img.id||''});var u=state.patches.images[keyImage(img)];if(typeof u==='string'&&u.indexOf('https://')===0&&img.src!==u){img.src=u;img.removeAttribute('srcset')}});
 document.querySelectorAll('.practice[data-answer]').forEach(function(x,i){var n=state.patches.answers['practice-'+i];if(n!==undefined&&Number.isFinite(Number(n)))x.dataset.answer=String(n)});
}
var scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;apply()})}
function dialog(title,content,onSave){
 var d=$('fxe-dialog');$('fxe-title').textContent=title;$('fxe-fields').innerHTML=content;
 $('fxe-confirm').onclick=function(){onSave();d.close()};d.showModal();
}
function editText(target){
 var a=[];var w=document.createTreeWalker(target,NodeFilter.SHOW_TEXT,{acceptNode:function(n){return n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
 while(w.nextNode())a.push(w.currentNode);
 if(!a.length)return;
 var unique=new Map();a.forEach(function(n){if(!nodes.has(n))nodes.set(n,n.nodeValue);unique.set(keyText(nodes.get(n)),n)});
 var html=Array.from(unique).map(function(entry,i){var k=entry[0],n=entry[1];return '<label class="fxe-field">Fragment '+(i+1)+'<textarea rows="4" data-fxe-key="'+k+'">'+esc(state.patches.texts[k]??n.nodeValue)+'</textarea></label>'}).join('');
 dialog('Modifica textul',html,function(){document.querySelectorAll('#fxe-fields [data-fxe-key]').forEach(function(el){state.patches.texts[el.dataset.fxeKey]=el.value});changed();schedule()});
}
async function uploadImage(img){
 var input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.click();
 input.onchange=async function(){var f=input.files&&input.files[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8388608){alert('Imagine PNG, JPG sau WEBP de maximum 8 MB.');return}
 try{var ext=f.type==='image/jpeg'?'jpg':f.type.split('/')[1];var name=subject+'/'+slug+'/'+crypto.randomUUID()+'.'+ext;var b=state.sb.storage.from('fx-universal-lesson-media');var r=await b.upload(name,f,{upsert:false,contentType:f.type});if(r.error)throw r.error;if(!images.has(img))images.set(img,{src:img.getAttribute('src')||'',alt:img.alt||'',id:img.id||''});state.patches.images[keyImage(img)]=b.getPublicUrl(name).data.publicUrl;changed();schedule()}catch(e){alert('Nu am putut incarca imaginea: '+e.message)}
 };
}
function primitiveFields(model){
 var list=[];var seen=new WeakSet();
 function walk(x,path,depth){if(depth>13||list.length>1500||x==null)return;
 if(typeof x==='string'||typeof x==='number'||typeof x==='boolean'){if(typeof x!=='string'||x.length<8000)list.push([path,x]);return}
 if(typeof x!=='object'||seen.has(x))return;seen.add(x);
 Object.keys(x).forEach(function(k){if(['assets','embeddedImages','ciphertext','blob','imageData'].includes(k))return;walk(x[k],path+'/'+k.replace(/~/g,'~0').replace(/\//g,'~1'),depth+1)})}
 walk(model,'',0);return list;
}
function editModel(){
 if(!state.model){note('Aceasta pagina nu expune un model structurat; editeaza textele si imaginile.');return}
 var arr=primitiveFields(state.model);var html='<input id="fxe-filter" placeholder="Cauta scena, reper, intrebare..." style="width:100%;padding:10px">';
 html+=arr.map(function(t){var v=state.patches.model[t[0]]??t[1];return '<label class="fxe-field" data-fxe-label="'+esc(t[0])+'">'+esc(t[0].slice(1).replaceAll('/',' → '))+'<textarea rows="2" data-fxe-pointer="'+esc(t[0])+'" data-fxe-kind="'+typeof t[1]+'">'+esc(v)+'</textarea></label>'}).join('');
 dialog('Repere, scene si chestionare',html,function(){
 document.querySelectorAll('#fxe-fields [data-fxe-pointer]').forEach(function(el){var p=el.dataset.fxePointer,kind=el.dataset.fxeKind,v=el.value;if(kind==='number')v=Number(v);if(kind==='boolean')v=v==='true';state.patches.model[p]=v});changed();note('Modelul este pregatit. Salveaza, apoi reincarca lectia.');
 });
 $('fxe-filter').oninput=function(){var q=this.value.toLowerCase();document.querySelectorAll('#fxe-fields [data-fxe-label]').forEach(function(el){el.hidden=!el.dataset.fxeLabel.toLowerCase().includes(q)})}
}
function editAnswers(){
 var a=[...document.querySelectorAll('.practice[data-answer]')];
 if(!a.length){note('Raspunsurile acestei lectii se editeaza din modelul structurat, daca este disponibil.');return}
 var html=a.map(function(c,i){return '<label class="fxe-field">Exercitiul '+(i+1)+'<input data-fxe-answer="'+i+'" type="number" step="any" value="'+esc(state.patches.answers['practice-'+i]??c.dataset.answer)+'"></label>'}).join('');
 dialog('Raspunsuri corecte',html,function(){document.querySelectorAll('[data-fxe-answer]').forEach(function(x){state.patches.answers['practice-'+x.dataset.fxeAnswer]=x.value});changed();schedule()});
}
async function save(){
 if(!state.allowed||!state.dirty)return;
 $('fxe-save').disabled=true;note('Se salveaza...');
 try{var r;if(state.revision===null)r=await state.sb.from('fx_universal_lesson_edits').insert({page:page,subject:subject,patches:state.patches}).select('revision').single();
 else r=await state.sb.from('fx_universal_lesson_edits').update({patches:state.patches}).eq('page',page).eq('revision',state.revision).select('revision').maybeSingle();
 if(r.error)throw r.error;if(!r.data)throw Error('Exista o versiune mai noua. Reincarca pagina si verifica modificarile.');
 state.revision=r.data.revision;state.dirty=false;note('Salvat. Elevii vad modificarile la reincarcare.')}catch(e){note('Eroare salvare: '+e.message);$('fxe-save').disabled=false}
}
function ui(){
 var css=document.createElement('style');css.textContent='.fxe-toggle,.fxe-panel{position:fixed;z-index:2147483000;bottom:15px;right:15px;background:#fff7f6;color:#63394d;padding:13px;border:1px solid #d9b8c6;border-radius:14px;box-shadow:0 12px 28px #0003;font:13px system-ui}.fxe-toggle{background:#63394d;color:white;cursor:pointer}.fxe-panel{left:15px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fxe-panel[hidden],.fxe-toggle[hidden]{display:none!important}.fxe-panel button,.fxe-dialog button{padding:9px;border:1px solid #cba7b9;background:white;border-radius:9px;color:#63394d;cursor:pointer}.fxe-dialog{width:min(790px,94vw);max-height:88vh;border-radius:16px;padding:20px;border:1px solid #cba7b9;color:#372734}.fxe-dialog::backdrop{background:#20152299}.fxe-fields{max-height:65vh;overflow:auto}.fxe-field{display:block;margin:10px 0;font:13px system-ui}.fxe-field textarea,.fxe-field input{display:block;width:100%;box-sizing:border-box;border:1px solid #d8c3ce;border-radius:7px;padding:9px;font:14px system-ui}.fxe-editing p,.fxe-editing h1,.fxe-editing h2,.fxe-editing h3,.fxe-editing li,.fxe-editing img{cursor:crosshair!important}';document.head.append(css);
 var div=document.createElement('div');div.dataset.fxeUi='1';div.innerHTML='<button id="fxe-start" class="fxe-toggle" hidden>✎ Editeaza lectia</button><div id="fxe-panel" class="fxe-panel" hidden><strong>Editor profesor</strong><button id="fxe-model">Repere si grile</button><button id="fxe-answers">Raspunsuri</button><button id="fxe-save" disabled>Salveaza modificarile</button><button id="fxe-cancel">Inchide</button><small id="fxe-message"></small></div><dialog id="fxe-dialog" class="fxe-dialog"><h2 id="fxe-title"></h2><div id="fxe-fields" class="fxe-fields"></div><button id="fxe-confirm">Aplica</button><button id="fxe-close">Anuleaza</button></dialog>';document.body.append(div);
 $('fxe-start').onclick=function(){state.edit=true;document.body.classList.add('fxe-editing');$('fxe-start').hidden=true;$('fxe-panel').hidden=false;note('Apasa pe un text sau pe o imagine.')};
 $('fxe-model').onclick=editModel;$('fxe-answers').onclick=editAnswers;$('fxe-save').onclick=save;$('fxe-close').onclick=function(){$('fxe-dialog').close()};
 $('fxe-cancel').onclick=function(){if(state.dirty&&!confirm('Renunti la schimbarile nesalvate?'))return;location.reload()};
 document.addEventListener('click',function(e){if(!state.edit||e.target.closest('[data-fxe-ui],dialog'))return;var img=e.target.closest('img'),target=e.target.closest('p,li,h1,h2,h3,h4,blockquote,.formula,.relevance,.takeaway');if(!img&&!target)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(img)uploadImage(img);else editText(target)},true);
 window.addEventListener('beforeunload',function(e){if(state.dirty){e.preventDefault();e.returnValue=''}});
}
async function refresh(){
 if(!state.sb||state.dirty)return;
 var r=await state.sb.from('fx_universal_lesson_edits').select('patches,revision').eq('page',page).maybeSingle();
 if(!r.error){state.patches=normal(r.data&&r.data.patches);state.revision=r.data?r.data.revision:null;schedule()}
 var s=await state.sb.rpc('get_my_staff_profile');
 var staff=Array.isArray(s.data)?s.data[0]:s.data;
 state.allowed=!s.error&&!!staff&&(staff.role==='admin'||(staff.role==='mentor'&&staff.subject===subject));
 if(state.allowed){$('fxe-start').hidden=false;if(location.search.includes('editor=1')&&!state.edit)$('fxe-start').click()}
}
async function init(){
 if(!valid())return;
 state.sb=window.supabase.createClient(window.FX_SUPABASE_URL,window.FX_SUPABASE_ANON_KEY);
 ui();await refresh();
 new MutationObserver(schedule).observe(document.body,{childList:true,characterData:true,subtree:true});
 state.sb.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_IN')setTimeout(function(){refresh().catch(console.warn)},100)});
}
var ready=new Promise(function(resolve){function start(){init().finally(resolve)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()});
window.FormulaXUniversalEditor={ready:function(){return ready},patchModel:patchModel,registerModel:registerModel};
})();