const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const bundle=JSON.parse(fs.readFileSync(path.join(root,'assets/public-harap-alb-particularitati.json'),'utf8'));
const lesson=bundle.essays.particularitati;
const files={
  'umanizarea-fantasticului':'162fbf5d9b40232e7757b607d435c287ec05c84b',
  'statut-psihologic':'5e166862688b41ad2350c4e889956dea90b36f26',
  'scena-fantanii':'49b5250a539b3ac9b907dbe8827108d48acf84e8',
  'moartea-si-invierea':'9e39ca2a4ea8466b15686afd2b0fc0bf243a3a81',
  'podul-si-spatiul':'e8fd4e5253c8ffc8f54a23a10c86874c8c05f84d',
};
const original=name=>'/lessons/harap-alb/'+name+'.png';
const publicUrl=name=>'/assets/lessons/harap-alb/'+name+'.webp';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let checks=0;
(async()=>{
  assert.deepEqual(Object.keys(bundle.essays),['particularitati']);
  assert.deepEqual(bundle.assets,{});checks++;
  assert.deepEqual(bundle.imageUrls,Object.fromEntries(Object.keys(files).map(n=>[original(n),publicUrl(n)])));checks++;
  assert.equal(lesson.heroImage,original('umanizarea-fantasticului'));checks++;
  assert.deepEqual(lesson.statusCards.map(c=>c.image),[original('statut-psihologic'),original('umanizarea-fantasticului')]);checks++;
  assert.deepEqual(lesson.scenes.map(c=>c.image),[original('scena-fantanii'),original('moartea-si-invierea')]);checks++;
  assert.deepEqual(lesson.structureCards.map(c=>c.image),[original('moartea-si-invierea'),original('podul-si-spatiul')]);checks++;
  for(const [name,sha] of Object.entries(files)){
    const bytes=fs.readFileSync(path.join(root,publicUrl(name).slice(1)));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    const gitHash=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
    assert.equal(gitHash,sha,'The restored illustration must be byte-identical to the original');checks++;
  }
  const callbacks={},node={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const zoomImg={src:'',alt:'',removeAttribute(name){this[name]='';}};
  let zoomOpened=false,sessionCalls=0,rpcCalls=0,decryptCalls=0,fetches=0;
  const dialog={close(){zoomOpened=false;},showModal(){zoomOpened=true;},querySelector(){return zoomImg;},addEventListener(){}};
  const doc={body:{dataset:{lesson:'harap-alb'}},getElementById(id){if(id==='fxl-content')return node;if(id==='fxl-zoom')return dialog;if(id==='fxl-zoom-close')return {addEventListener(){}};return null;},addEventListener(name,fn){callbacks[name]=fn;}};
  let user=null;
  const auth={getSession:async()=>{sessionCalls++;return {data:{session:user?{user}:null}};},onAuthStateChange(fn){callbacks.auth=fn;}};
  const fx={lessons:[{slug:'harap-alb',title:'Povestea lui Harap-Alb',author:'Ion Creangă',character:'Harap-Alb',cover:'/assets/lessons/harap-alb/coperta.webp'}],esc:escape,sb:()=>({auth}),linkAccount:async()=>{},date:()=>'',decode:()=>new Uint8Array(),decryptBundle:async()=>{decryptCalls++;throw Error('Do not decrypt protected essays for public visitors');},rpc:async name=>{rpcCalls++;return name==='fx_student_is_enrolled'?false:{access:{state:'locked',allowed:false}};}};
  const location={search:'?eseu=particularitati'};
  const scope={window:{FormulaXLessons:fx,addEventListener(){},scrollTo(){}},document:doc,location,history:{pushState(_,__,url){location.search=url;}},URL,URLSearchParams,Blob,Uint8Array,Date,Intl,setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},fetch:async(url,options)=>{fetches++;assert(url.startsWith('/assets/public-harap-alb-particularitati.json?'));assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-cache');return {ok:true,json:async()=>bundle};}};
  const js=fs.readFileSync(path.join(root,'assets/formula-x-lesson-page.js'),'utf8').replace('  heartbeat=setInterval(verify,60000);verify();\n})();','  globalThis.qa={verify,render,imageUrl};\n})();');
  vm.runInNewContext(js,scope);
  await scope.qa.verify();
  assert.equal(sessionCalls,0);assert.equal(rpcCalls,0);assert.equal(decryptCalls,0);
  assert(node.innerHTML.includes('Eseul 1 este disponibil gratuit, fără cont.'));checks++;
  const renderedImages=()=>[...node.innerHTML.matchAll(/<img src="([^"]+)"/g)].map(m=>m[1]);
  const expected=[lesson.heroImage,...lesson.statusCards.map(c=>c.image),...lesson.scenes.map(c=>c.image),...lesson.structureCards.map(c=>c.image)].map(src=>bundle.imageUrls[src]);
  assert.deepEqual(renderedImages(),expected);assert.equal(new Set(expected).size,5);assert(!node.innerHTML.includes('src="/assets/lessons/harap-alb/coperta.webp"'));checks++;
  for(const [src,url] of Object.entries(bundle.imageUrls)){
    const picture={dataset:{fxlImage:src},querySelector(){return {alt:'Original illustration'};}};
    await callbacks.click({target:{closest(selector){return selector==='[data-fxl-image]'?picture:null;}}});
    assert(zoomOpened);assert.equal(zoomImg.src,url);checks++;
  }
  assert.equal(scope.qa.imageUrl('/lessons/harap-alb/missing.png'),'');checks++;
  const study=scope.window.FormulaXEssayPractice;
  for(let level=0;level<=4;level++){
    study.setLevel(level);scope.qa.render({state:'public',allowed:true});
    assert.deepEqual(renderedImages(),expected);checks++;
  }
  for(let reper=1;reper<=3;reper++){
    study.start(reper);scope.qa.render({state:'public',allowed:true});
    for(const url of renderedImages())assert(Object.values(bundle.imageUrls).includes(url));
    assert(!node.innerHTML.includes('src="/assets/lessons/harap-alb/coperta.webp"'));checks++;
    study.stop();
  }
  location.search='?eseu=caracterizare';await scope.qa.verify();
  assert.equal(fetches,1);assert.equal(decryptCalls,0);assert(node.innerHTML.includes('Conectează-te la Formula X'));checks++;
  user={id:'student',email:'elev@example.test',email_confirmed_at:'2026-10-15T00:00:00Z'};
  await scope.qa.verify();assert(node.innerHTML.includes('Lecție protejată'));assert.equal(fetches,1);assert.equal(decryptCalls,0);checks++;
  location.search='?eseu=particularitati';await scope.qa.verify();assert.deepEqual(renderedImages(),expected);checks++;
  console.log(`${checks} public Harap-Alb image checks passed: original bytes, correct mapping, anonymous access, image zoom, masking, quizzes and protected essay isolation.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
