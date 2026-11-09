const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=p=>fs.readFileSync(p,'utf8');
const storeScope={window:{FormulaXAuthClient:{auth:{getSession:async()=>({data:{session:{user:{id:'mentor'}}}})},rpc:async(name,args)=>{storeScope.calls.push({name,args});if(name==='get_my_staff_profile')return {data:[{role:'mentor',subject:'romana'}]};return {data:{slug:'lecție-id',revision:7}};}}},calls:[]};
vm.runInNewContext(source('assets/fx-lesson-store.js'),storeScope);
const store=storeScope.window.FormulaXLessonStore;
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
function studio(existing=false){
 const nodes=new Map(),auth=[],writes=[],drafts=new Map();let signedIn=true,createCount=0;
 function element(id){if(nodes.has(id))return nodes.get(id);const e={id,innerHTML:'',textContent:'',value:'',disabled:false,hidden:false,dataset:{},classList:{toggle(){}},addEventListener(){},querySelector(){return {}}};nodes.set(id,e);return e;}
 const doc={fx_format:'formula-x-blocks-v1',title:'Titlu identic',subject:'romana',subtitle:'',theme:'rose',blocks:[{type:'text',id:'one',text:'Text original'}]};
 const win={addEventListener(){},print(){},supabase:{createClient(){}},FX_SUPABASE_URL:'url',FX_SUPABASE_ANON_KEY:'key',
 FormulaXStudioRenderer:{FORMAT:'formula-x-blocks-v1',escape:s=>String(s||''),safeUrl:s=>s,render(){}},
 FormulaXLessons:{lessonUrl:s=>'/cursuri/lectie.html?slug='+s},FormulaXLessonModelEditor:{mount(){},preview(){}},
 FormulaXLessonStore:{client:()=>({auth:{onAuthStateChange(fn){auth.push(fn);}}}),requireStaff:async()=>{if(!signedIn)throw Error('Conectează-te');return {staff:{role:'mentor',subject:'romana'},user:{id:'mentor-a',email:'a@example.test'}};},load:async()=>({slug:'existing',title:doc.title,summary:'',subject:'romana',kind:'studio',doc:JSON.parse(JSON.stringify(doc)),revision:1}),errorMessage:e=>e.message,
 create:async(id,d)=>{createCount++;writes.push({id,doc:d});return {slug:'server-id',revision:1};},save:async(r,t,s,d)=>{writes.push({r,t,s,doc:d});return {slug:r.slug,revision:r.revision+1};}}};
 const ctx={window:win,document:{getElementById:element},crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789012'},location:{search:existing?'?slug=existing':'',href:'https://formula-x.ro/profesori/studio.html'},history:{replaceState(){}},URL,URLSearchParams,TextEncoder,localStorage:{setItem:(k,v)=>drafts.set(k,v),getItem:k=>drafts.get(k),removeItem:k=>drafts.delete(k)},console,confirm:()=>false};
 let code=source('assets/fx-lesson-studio.js').replace('renderAll();\nwindow.FormulaXLessonStore.client()', 'window.qa={state,save,init};\nrenderAll();\nwindow.FormulaXLessonStore.client()');
 vm.runInNewContext(code,ctx);
 return {win,nodes,writes,drafts,doc,createCount:()=>createCount,async signout(){signedIn=false;for(const fn of auth)fn('SIGNED_OUT',null);await flush();}};
}
(async()=>{
 assert.equal(store.decode('simplu').kind,'text');assert.equal(store.decode('{"fx_format":"formula-x-blocks-v1"}').kind,'studio');assert.equal(store.decode('{"essays":{}}').kind,'model');
 await store.requireStaff();
 const original={essays:{scene:{text:'Original',points:['A','B']}}};
 const edited=JSON.parse(JSON.stringify(original));edited.essays.scene.text='Nou';edited.essays.scene.points.push('C');
 const changes=store.modelChanges(original,edited);const actual=store.patchModel(JSON.parse(JSON.stringify(original)),{model:changes});assert.equal(JSON.stringify(actual),JSON.stringify(edited));
 store.patchModel({}, {model:{'/__proto__/polluted':true}});assert.equal({}.polluted,undefined);
 const record={slug:'legacy',kind:'overlay',revision:2,original,patches:{model:{'/old':'kept'}}};
 const saved=await store.save(record,'Titlu','',edited);assert(saved.patches.model['/essays/scene/text']==='Nou');
 const twice=JSON.parse(JSON.stringify(edited));twice.essays.scene.text='Iarăși';
 const second=await store.save({...record,...saved,original:edited},'Titlu','',twice);
 assert(second.patches.model['/essays/scene/points'].includes('C'),'second overlay save must retain earlier changes');
 const client=storeScope.window.FormulaXAuthClient,previousRpc=client.rpc;
 client.rpc=async(name)=>({data:name==='fx_editor_load_lesson'?{slug:'harap-alb',body:null,revision:1}:name==='fx_open_lesson'?{access:{allowed:true},key:'key',version:'version'}:null});
 storeScope.window.FormulaXLessons={decryptBundle:async()=>({slug:'harap-alb',essays:{particularitati:{text:'Editabil'}},assets:{large:'x'.repeat(500000)}})};
 const encrypted=await store.load('harap-alb');assert.equal(encrypted.kind,'overlay');assert(!encrypted.doc.assets);assert(JSON.stringify(encrypted.doc).length<400000,'Encrypted artwork must not make model edits exceed the request limit');
 client.rpc=previousRpc;
 const modelScope={window:{FormulaXStudioRenderer:{escape:v=>String(v).replaceAll('<','&lt;')}},confirm:()=>true};
 vm.runInNewContext(source('assets/fx-lesson-model-editor.js'),modelScope);
 const target={innerHTML:''},model={scenes:[{title:'Prima',image:'/assets/scene.webp',text:'<script>'},{title:'A doua'}]};let dirty=0;
 modelScope.window.FormulaXLessonModelEditor.mount(target,model,()=>dirty++);
 assert(!target.innerHTML.includes('><script>'));assert(target.innerHTML.includes('data-model-upload="/scenes/0/image"'));
 target.oninput({target:{closest(){return {dataset:{modelPath:'/scenes/0/title',modelKind:'string'},value:'Modificat'};}}});
 assert.equal(model.scenes[0].title,'Modificat');assert.equal(dirty,1);
 target.onclick({target:{closest(selector){if(selector==='[data-model-upload]')return null;return {dataset:{modelDuplicate:'/scenes/0'},hasAttribute:name=>name==='data-model-duplicate'};}}});
 assert.equal(model.scenes.length,3);assert.equal(model.scenes[1].title,'Modificat');
 const fresh=studio();await flush();fresh.win.qa.state.doc=JSON.parse(JSON.stringify(fresh.doc));await fresh.win.qa.save();await fresh.win.qa.save();
 assert.equal(fresh.createCount(),1,'Save twice creates exactly one lesson');assert.equal(fresh.writes[1].r.slug,'server-id','Use server slug, never a title lookup');
 await fresh.signout();assert.equal(fresh.win.qa.state.loaded,false);assert.equal(fresh.nodes.get('fxs-save').disabled,true);const count=fresh.writes.length;await fresh.win.qa.save();assert.equal(fresh.writes.length,count);
 const existing=studio(true);await flush();existing.win.qa.state.record.revision=4;await existing.win.qa.save();assert.equal(existing.writes[0].r.revision,4);
 const html=source('index.html');assert(html.includes('if (!force) return false;'));assert(!html.includes('redirectStaffToPortal(data.user, true)'));
 assert(source('assets/formula-x-portal.js').includes('onAuthStateChange'));assert(!/if\(!ok\)\{[^}]*auth\.signOut/s.test(source('assets/formula-x-portal.js')));
 assert(source('profesori/index.html').includes('id="tab-lessons"'));assert(source('profesori/index.html').includes('formula-x-lesson-teacher.js'));
 assert(!source('cursuri/app.js').includes("from('fx_lesson_contents')"));assert(source('cursuri/app.js').includes("FX.rpc('fx_lesson_catalog')"));
 console.log('PASS: common persistence, format adapters, cumulative overlays, save-twice identity, revisions, sign-out, private portal wiring and access-aware library.');
})().catch(e=>{console.error(e);process.exitCode=1;});
