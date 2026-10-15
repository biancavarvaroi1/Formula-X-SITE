const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets/formula-x-lesson-page.js'),'utf8');
const publicBundle=JSON.parse(fs.readFileSync(path.join(root,'assets/public-harap-alb-particularitati.json'),'utf8'));
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
let checks=0;
function createPage(protectedEssay=false){
  const callbacks={},windowEvents={},intervals=new Map(),timeouts=new Map();
  let timerId=0,fetches=0,rpcCalls=0,decrypts=0,offline=false,allowed=true;
  let user=protectedEssay?{id:'student-a',email:'student@example.test'}:null;
  const node={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const dialog={close(){},querySelector(){return {removeAttribute(){}};},addEventListener(){}};
  const doc={hidden:false,body:{dataset:{lesson:'harap-alb'}},getElementById(id){if(id==='fxl-content')return node;if(id==='fxl-zoom')return dialog;if(id==='fxl-zoom-close'||id==='fxs-check')return {disabled:true,addEventListener(){}};return null;},addEventListener(name,fn){callbacks[name]=fn;}};
  const lesson=JSON.parse(JSON.stringify(publicBundle.essays.particularitati));
  if(protectedEssay){lesson.statusCards.push({...lesson.statusCards[0],title:'Statut psihologic'});}
  const privateBundle={slug:'harap-alb',essays:{caracterizare:lesson},assets:{}};
  const auth={getSession:async()=>({data:{session:user?{user}:null}}),onAuthStateChange(fn){callbacks.auth=fn;}};
  const fx={lessons:[{slug:'harap-alb',title:'Povestea lui Harap-Alb',character:'Harap-Alb',cover:'/assets/lessons/harap-alb/coperta.webp'}],esc:escape,sb:()=>({auth}),linkAccount:async()=>{},date:value=>value,decode:()=>new Uint8Array(),decryptBundle:async()=>{decrypts++;return privateBundle;},rpc:async(name)=>{
    rpcCalls++;if(offline)throw Error('Temporary connection failure');
    if(name==='fx_student_is_enrolled')return false;
    return {access:{state:allowed?'active':'locked',allowed},key:allowed?'test-key':null,version:'protected-test-v1'};
  }};
  const location={search:protectedEssay?'?eseu=caracterizare':'?eseu=particularitati'};
  const scope={window:{FormulaXLessons:fx,scrollTo(){},addEventListener(name,fn){windowEvents[name]=fn;}},document:doc,location,history:{pushState(_,__,url){location.search=url;}},URL,URLSearchParams,Blob,Uint8Array,Date,Intl,setInterval(fn,ms){const id=++timerId;intervals.set(id,{fn,ms});return id;},clearInterval(id){intervals.delete(id);},setTimeout(fn,ms){const id=++timerId;timeouts.set(id,{fn,ms});return id;},clearTimeout(id){timeouts.delete(id);},fetch:async()=>{fetches++;if(offline)throw Error('Temporary connection failure');return {ok:true,json:async()=>publicBundle};}};
  vm.runInNewContext(source,scope);
  const study=scope.window.FormulaXEssayPractice;
  const click=dataset=>callbacks.click({preventDefault(){},target:{closest(selector){return selector==='[data-fxs-action]'?{dataset}:null;}}});
  return {node,study,doc,callbacks,windowEvents,intervals,timeouts,location,
    async ready(){await flush();},
    async action(fxsAction,extra={}){await click({fxsAction,...extra});await flush();},
    async verify(){await windowEvents.focus();await flush();},
    async tickMinute(){for(const {fn,ms} of [...intervals.values()])if(ms===60000)await fn();await flush();},
    async event(name,event={}){await windowEvents[name](event);await flush();},
    async visibility(hidden){doc.hidden=hidden;await callbacks.visibilitychange();await flush();},
    async authEvent(name){callbacks.auth(name);for(const [id,timer] of [...timeouts])if(timer.ms===0){timeouts.delete(id);await timer.fn();}await flush();},
    setOffline(value){offline=value;},setAllowed(value){allowed=value;},setUser(value){user=value;},
    stats:()=>({fetches,rpcCalls,decrypts}),
    state:()=>JSON.parse(JSON.stringify(study.snapshot().quiz)),
  };
}
async function reachQuestion(page,count){
  for(let i=0;i<count;i++){
    const quiz=page.state(),correct=quiz.questions[quiz.index].correct;
    page.callbacks.change({target:{matches:()=>true,value:String(i%2?correct:(correct+1)%4)}});
    await page.action('check');await page.action('next');
  }
}
(async()=>{
  for(const reper of [0,1,2,3]){
    const page=createPage();await page.ready();
    await page.action('quiz',{fxsReper:String(reper)});await reachQuestion(page,3);
    const quiz=page.state(),choice=(quiz.questions[quiz.index].correct+1)%4;
    page.callbacks.change({target:{matches:()=>true,value:String(choice)}});
    const before=page.state(),html=page.node.innerHTML;
    for(let minute=0;minute<5;minute++)await page.tickMinute();
    assert.deepEqual(page.state(),before,'The one-minute timer must preserve the quiz, choices, answers and current selection');
    assert.equal(page.node.innerHTML,html,'Background verification must not replace the question DOM');
    assert.equal(page.stats().fetches,1,'Do not download and reinstall an already loaded public lesson');checks++;
    await page.event('focus');await page.visibility(true);await page.visibility(false);await page.event('pageshow',{persisted:false});
    await page.authEvent('TOKEN_REFRESHED');
    assert.deepEqual(page.state(),before,'Focus, visibility, pageshow and token refresh must preserve progress');checks++;
    await page.action('check');const checked=page.state();await page.tickMinute();
    assert.deepEqual(page.state(),checked,'Do not lose checked feedback or overwrite scores');checks++;
    await page.event('pagehide',{persisted:true});assert.equal(page.node.innerHTML,'');
    await page.event('pageshow',{persisted:true});
    assert.deepEqual(page.state(),checked,'Browser back/forward restoration must resume the exact question');
    assert(page.node.innerHTML.includes('fxs-feedback'));checks++;
    await page.action('next');assert.equal(page.state().index,4);checks++;
    await page.action('restart');assert.equal(page.state().index,0,'Explicit restart still starts a new attempt');checks++;
    const signedOutState=page.state();await page.authEvent('SIGNED_OUT');
    assert.deepEqual(page.state(),signedOutState,'A public quiz must not depend on the account session');checks++;
  }
  const page=createPage(true);await page.ready();
  await page.action('quiz',{fxsReper:'0'});await reachQuestion(page,5);
  const before=page.state();
  await page.tickMinute();await page.event('focus');await page.visibility(false);await page.authEvent('TOKEN_REFRESHED');
  assert.deepEqual(page.state(),before,'Protected access checks must not restart an authorized quiz');
  assert(page.stats().rpcCalls>=4);checks++;
  await page.event('pagehide',{persisted:true});assert.equal(page.node.innerHTML,'');
  await page.event('pageshow',{persisted:true});assert.deepEqual(page.state(),before);checks++;
  page.setOffline(true);await page.verify();
  assert(page.node.innerHTML.includes('Nu am putut verifica accesul'));
  assert(!page.node.innerHTML.includes('fxs-options'),'Hide protected material while access cannot be verified');
  page.setOffline(false);await page.verify();
  assert.deepEqual(page.state(),before,'A temporary network failure must not destroy the attempt');checks++;
  page.setAllowed(false);await page.verify();
  assert.equal(page.state(),null);assert(page.node.innerHTML.includes('Lecție protejată'));checks++;
  page.setAllowed(true);await page.verify();await page.action('quiz',{fxsReper:'2'});
  await reachQuestion(page,2);page.setUser({id:'student-b',email:'other@example.test'});await page.verify();
  assert.equal(page.state(),null,'Never inherit another account’s quiz after switching accounts');checks++;
  await page.action('quiz',{fxsReper:'1'});page.setUser(null);await page.authEvent('SIGNED_OUT');
  assert.equal(page.state(),null);assert(page.node.innerHTML.includes('Conectează-te la Formula X'));checks++;
  const revokedWhileAway=createPage(true);await revokedWhileAway.ready();await revokedWhileAway.action('quiz',{fxsReper:'0'});
  await reachQuestion(revokedWhileAway,2);await revokedWhileAway.event('pagehide',{persisted:true});
  revokedWhileAway.setAllowed(false);await revokedWhileAway.event('pageshow',{persisted:true});
  assert.equal(revokedWhileAway.state(),null);assert(!revokedWhileAway.node.innerHTML.includes('fxs-options'));checks++;
  console.log(`${checks} quiz continuity scenarios passed: 60-second refresh, focus, app switching, token refresh, back/forward, temporary network failure, account isolation and access revocation.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
