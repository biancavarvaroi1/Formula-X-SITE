/* Editor pentru lectiile simple din /cursuri/, acces numai profesori. */
(function(){
'use strict';
if(!location.pathname.startsWith('/cursuri'))return;
var sb,staff,rows=[],current=null,oldBody=false;
function $(id){return document.getElementById(id)}
function esc(x){return String(x??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function msg(t){if($('fxce-msg'))$('fxce-msg').textContent=t}
async function init(){
 if(!window.supabase?.createClient||!window.FX_SUPABASE_URL||!window.FX_SUPABASE_ANON_KEY)return;
 sb=window.supabase.createClient(window.FX_SUPABASE_URL,window.FX_SUPABASE_ANON_KEY);
 var session=(await sb.auth.getSession()).data.session;
 if(!session?.user)return;
 var q=await sb.rpc('get_my_staff_profile');staff=Array.isArray(q.data)?q.data[0]:q.data;
 if(q.error||!staff||!['admin','mentor'].includes(staff.role))return;
 var wrap=document.createElement('section');wrap.className='panel';wrap.id='fx-course-existing-editor';
 wrap.innerHTML='<style>#fx-course-existing-editor{margin:24px 0;padding:23px;background:#fff7fa;border:1px solid #e3cad5;border-radius:20px}#fx-course-existing-editor input,#fx-course-existing-editor select,#fx-course-existing-editor textarea{box-sizing:border-box;width:100%;padding:11px;margin:7px 0 15px;border:1px solid #bda8b0;border-radius:9px;font:14px system-ui}#fx-course-existing-editor textarea{min-height:260px}#fx-course-existing-editor label{display:block;font-weight:700}#fx-course-existing-editor .fxce-check input{width:auto}#fx-course-existing-editor button{padding:11px 15px;border:0;border-radius:10px;background:#683c55;color:#fff;cursor:pointer}#fxce-form[hidden]{display:none}</style><h2>✎ Editează lecțiile existente</h2><p>Alege lecția, apoi modifică materialul complet. Sunt disponibile numai materiile contului tău.</p><select id="fxce-list"></select><button id="fxce-open" type="button">Deschide lecția</button><form id="fxce-form" hidden><label>Titlu<input id="fxce-title" required></label><label>Descriere<input id="fxce-summary"></label><label>Conținut<textarea id="fxce-body" required></textarea></label><label class="fxce-check"><input id="fxce-published" type="checkbox"> Publicată</label><label class="fxce-check"><input id="fxce-demo" type="checkbox"> Demo public</label><button type="submit" id="fxce-save">Salvează lecția</button></form><p id="fxce-msg" role="status"></p>';
 document.querySelector('#teacher')?.append(wrap);
 $('fxce-open').onclick=open;$('fxce-form').onsubmit=save;
 await list();
}
async function list(){
 var r=await sb.from('fx_lessons').select('id,slug,subject,title,summary,published,is_demo').order('title');
 if(r.error){msg(r.error.message);return}
 rows=(r.data||[]).filter(function(x){return staff.role==='admin'||staff.subject===x.subject});
 $('fxce-list').innerHTML=rows.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.subject)+' · '+esc(x.title)+'</option>'}).join('');
 $('fxce-open').disabled=!rows.length;
}
async function open(){
 current=rows.find(function(x){return x.id===$('fxce-list').value});
 if(!current)return;
 var r=await sb.from('fx_lesson_contents').select('body').eq('lesson_id',current.id).maybeSingle();
 if(r.error){msg(r.error.message);return}
 oldBody=!!r.data;
 $('fxce-title').value=current.title;$('fxce-summary').value=current.summary||'';
 $('fxce-body').value=r.data?.body||'';$('fxce-published').checked=!!current.published;$('fxce-demo').checked=!!current.is_demo;
 $('fxce-form').hidden=false;msg('');
}
async function save(e){
 e.preventDefault();if(!current)return;
 var b=$('fxce-save');b.disabled=true;
 try{
 var body=$('fxce-body').value;if(!body.trim())throw Error('Continutul nu poate fi gol.');
 var q=oldBody?sb.from('fx_lesson_contents').update({body:body}).eq('lesson_id',current.id):sb.from('fx_lesson_contents').insert({lesson_id:current.id,body:body});
 var r=await q.select('lesson_id');if(r.error)throw r.error;if(!r.data?.length)throw Error('Modificarea a fost refuzata.');
 var m=await sb.from('fx_lessons').update({title:$('fxce-title').value.trim(),summary:$('fxce-summary').value.trim(),published:$('fxce-published').checked,is_demo:$('fxce-demo').checked}).eq('id',current.id).select('id');
 if(m.error)throw m.error;if(!m.data?.length)throw Error('Metadatele nu au fost actualizate.');
 $('fxce-form').hidden=true;await list();msg('Salvat. Lectia este actualizata.');
 }catch(err){msg('Eroare: '+err.message)}finally{b.disabled=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){init().catch(console.warn)},{once:true});else init().catch(console.warn);
})();