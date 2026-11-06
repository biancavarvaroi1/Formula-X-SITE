const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const editor=fs.readFileSync(path.join(root,'assets/fx-editor-all.js'),'utf8');
const core=fs.readFileSync(path.join(root,'assets/formula-x-lessons-core.js'),'utf8');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
let checks=0;

function database(role='mentor',subject='romana',loggedIn=true){
  const state={role,subject,loggedIn,rows:new Map(),queries:[],auth:[],readError:false};
  const client={
    auth:{getSession:async()=>({data:{session:state.loggedIn?{user:{id:'fixture-user'}}:null}}),onAuthStateChange(fn){state.auth.push(fn);}},
    rpc:async name=>({data:name==='get_my_staff_profile'?[{role:state.role,subject:state.subject}]:null}),
    from(table){
      const q={table,action:'select',filters:{},payload:null,
        select(){return this;},eq(k,v){this.filters[k]=v;return this;},
        insert(payload){this.action='insert';this.payload=payload;return this;},
        update(payload){this.action='update';this.payload=payload;return this;},
        async maybeSingle(){
          state.queries.push({table,action:this.action,page:this.filters.page||this.payload?.page});
          if(this.action==='select')return state.readError?{error:{code:'PGRST205'}}:{data:state.rows.get(this.filters.page)||null};
          const old=state.rows.get(this.filters.page);
          if(!old||old.revision!==this.filters.revision)return {data:null};
          const next={...old,...this.payload,revision:old.revision+1};state.rows.set(this.filters.page,next);return {data:{revision:next.revision}};
        },
        async single(){
          const next={...this.payload,patches:JSON.parse(JSON.stringify(this.payload.patches)),revision:1};
          state.rows.set(next.page,next);return {data:{revision:1}};
        }
      };return q;
    }
  };
  return {state,client};
}

function page(db,pathname='/lectii/romana/moara-cu-noroc.html',search=''){
  const ids=new Map(),events={};let uiCount=0;
  function element(tag='div',attrs=''){
    const classes=new Set();
    const el={tagName:tag.toUpperCase(),dataset:{},hidden:/\bhidden\b/.test(attrs),disabled:false,open:false,value:'',textContent:'',
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},append(){},closest(){return null;},
      showModal(){this.open=true;},close(){this.open=false;},click(){this.onclick?.();},
      querySelectorAll(){return this.fields||[];}
    };
    Object.defineProperty(el,'innerHTML',{set(html){
      this.html=html;
      for(const match of html.matchAll(/<(\w+)([^>]*\bid="([^"]+)"[^>]*)>/g))ids.set(match[3],element(match[1],match[2]));
      this.fields=[...html.matchAll(/<textarea[^>]*data-fxe-key="([^"]+)"[^>]*>([^<]*)<\/textarea>/g)].map(m=>({dataset:{fxeKey:m[1]},value:m[2]}));
    },get(){return this.html||'';}});
    return el;
  }
  const textParent=element('p'),text={nodeValue:'Textul original al lecției.',parentElement:textParent};
  const body=element('body');body.dataset={};body.append=()=>uiCount++;
  const document={readyState:'complete',body,head:{append(){}},
    getElementById:id=>ids.get(id)||null,createElement:element,
    createTreeWalker(){let next=true;return {nextNode(){if(!next)return false;next=false;this.currentNode=text;return true;}};},
    querySelectorAll:selector=>selector==='#fxe-fields [data-fxe-key]'?ids.get('fxe-fields').fields:[],
    addEventListener(name,fn){events[name]=fn;}
  };
  const window={FormulaXLessons:{lessons:[{slug:'moara-cu-noroc'},{slug:'harap-alb'}],sb:()=>db.client},addEventListener(){}};
  vm.runInNewContext(editor,{window,document,location:{pathname,search},URLSearchParams,NodeFilter:{SHOW_TEXT:4,FILTER_ACCEPT:1,FILTER_REJECT:2},MutationObserver:class{observe(){}},requestAnimationFrame:fn=>queueMicrotask(fn),setTimeout:fn=>queueMicrotask(fn),console,confirm:()=>true});
  return {window,document,ids,text,events,uiCount:()=>uiCount,
    async editText(value){
      const target={closest(selector){if(selector==='[data-fxe-ui],dialog'||selector==='img')return null;return textParent;}};
      events.click({target,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
      ids.get('fxe-fields').fields[0].value=value;ids.get('fxe-confirm').onclick();await flush();
    }
  };
}

function catalog(db){
  const target={dataset:{},innerHTML:''};let enabled=false;
  const document={querySelectorAll:()=>enabled?[target]:[],querySelector:()=>null};
  const window={FormulaXAuthClient:db.client,addEventListener(){}};
  vm.runInNewContext(core,{window,document,setTimeout,console,Intl,Date});
  return {api:window.FormulaXLessons,target,enable(){enabled=true;}};
}

(async()=>{
  const rows=[{slug:'moara-cu-noroc',subject:'romana',title:'Moara cu noroc'},{slug:'progresii',subject:'matematica',title:'Progresii'},{slug:'reactii',subject:'chimie',title:'Reacții'}];
  const fixture=catalog(database());
  for(const [staff,count] of [[null,0],[{role:'student',subject:'romana'},0],[{role:'mentor',subject:'romana'},1],[{role:'admin'},3]]){
    const html=fixture.api.catalogMarkup(rows,null,staff);
    assert.equal((html.match(/Editează lecția/g)||[]).length,count);checks++;
  }
  assert.equal(fixture.api.editorUrl('reactii'),'/cursuri/lectie.html?slug=reactii&editor=1');
  assert.equal(fixture.api.editorUrl('moara-cu-noroc'),'/lectii/romana/moara-cu-noroc.html?editor=1');
  assert.equal(fixture.api.editorUrl('ion'),'/lectii/romana/ion.html?editor=1');checks++;

  for(const [role,subject,loggedIn,allowed] of [['mentor','romana',true,true],['admin','chimie',true,true],['mentor','chimie',true,false],['student','romana',true,false],['admin','romana',false,false]]){
    const db=database(role,subject,loggedIn),p=page(db);
    await p.window.FormulaXUniversalEditor.ready();await flush();
    assert.equal(p.ids.get('fxe-start').hidden,!allowed,`${role}/${subject}/${loggedIn}`);
    assert(db.state.queries.some(q=>q.page==='romana/moara-cu-noroc'));checks++;
  }

  const db=database('mentor','chimie'),p=page(db,'/cursuri/lectie.html','?slug=reactii&editor=1');
  await p.window.FormulaXUniversalEditor.ready();assert.equal(p.uiCount(),0);
  await p.window.FormulaXUniversalEditor.setLesson({slug:'reactii',subject:'chimie'});await flush();
  assert.equal(p.ids.get('fxe-panel').hidden,false,'Generic lessons must automatically enter edit mode');
  await p.editText('Material corectat de profesor.');
  assert.equal(p.text.nodeValue,'Material corectat de profesor.');
  await p.ids.get('fxe-save').onclick();
  assert(db.state.rows.has('chimie/reactii'),'Save under the server-provided subject and requested slug');
  assert.equal(db.state.rows.get('chimie/reactii').revision,1);checks++;
  const reopened=page(db,'/cursuri/lectie.html','?slug=reactii');
  await reopened.window.FormulaXUniversalEditor.ready();
  await reopened.window.FormulaXUniversalEditor.setLesson({slug:'reactii',subject:'chimie'});await flush();
  assert.equal(reopened.text.nodeValue,'Material corectat de profesor.','Changes must survive a fresh lesson load');checks++;
  await p.window.FormulaXUniversalEditor.setLesson({slug:'reactii',subject:'chimie'});assert.equal(p.uiCount(),1);checks++;

  await p.editText('Modificare încă nesalvată.');
  db.state.loggedIn=false;for(const callback of db.state.auth)callback('SIGNED_OUT');await flush();
  assert.equal(p.ids.get('fxe-start').hidden,true);assert.equal(p.ids.get('fxe-panel').hidden,true);
  await p.ids.get('fxe-save').onclick();assert.equal(db.state.rows.get('chimie/reactii').revision,1,'Signing out must revoke editing even with unsaved changes');checks++;

  const missing=database();missing.state.readError=true;const m=page(missing);
  await m.window.FormulaXUniversalEditor.ready();assert.equal(m.ids.get('fxe-start').hidden,false,'A missing edits table must not hide a verified teacher button');checks++;

  const live=database(),c=catalog(live);c.enable();
  live.client.rpc=async name=>({data:name==='fx_lesson_catalog'?rows:name==='get_my_staff_profile'?[{role:live.state.role,subject:live.state.subject}]:null});
  await c.api.refreshCatalog();assert(c.target.innerHTML.includes('Editează lecția'));checks++;
  live.state.loggedIn=false;await c.api.refreshCatalog();assert(!c.target.innerHTML.includes('Editează lecția'));checks++;
  console.log(`PASS: ${checks} teacher editor scenarios: catalog links, roles, shared session, generic routes, saving/reloading, sign-out and missing SQL.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
