const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const moduleSource=fs.readFileSync(path.join(root,'assets/formula-x-essay-practice.js'),'utf8');
const pageSource=fs.readFileSync(path.join(root,'assets/formula-x-lesson-page.js'),'utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;};
function fixture(slug,essay){
  const card=(prefix,index)=>({title:`${prefix} ${index}`,eyebrow:'Semnificație',image:`${slug}/coperta.png`,alt:'Ilustrație',takeaway:`${prefix} traseu ${index}`,relevance:`${prefix} relevanță ${index}`,number:index+1,chapter:'Fragment',points:Array.from({length:6},(_,n)=>`${prefix} ${index}, explicația ${n}: detalii despre personajul analizat.`)});
  return {label:'Material de test',essayTitle:'Eseu de test',intro:'Introducere pentru verificarea exercițiului.',keyIdea:'IDEA DOMINANTĂ',keyExplanation:'Explicația ideii dominante.',secondaryIdea:'Idee secundară',memoryLine:'Reține argumentele prin imagini.',heroImage:`${slug}/coperta.png`,heroAlt:'Copertă',reperNames:['Primul reper','Al doilea reper','Al treilea reper'],statusCards:Array.from({length:essay==='caracterizare'?3:2},(_,i)=>card('Statut',i)),scenes:[card('Scenă',0),card('Scenă',1)],structureCards:[card('Structură',0),card('Structură',1)],conclusion:'Concluzie pentru verificare.'};
}
const actualPath=process.argv[2];
const lessons=actualPath?JSON.parse(fs.readFileSync(actualPath,'utf8')):Object.fromEntries(['harap-alb','moara-cu-noroc'].map(slug=>[slug,{slug,assets:{},essays:Object.fromEntries(['particularitati','caracterizare'].map(essay=>[essay,fixture(slug,essay)]))}]));
const scope={window:{}};
vm.runInNewContext(moduleSource,scope);
const study=scope.window.FormulaXEssayPractice;
const context=(slug,essay)=>({slug,essay,version:'test-version',lesson:lessons[slug].essays[essay],reperNames:lessons[slug].essays[essay].reperNames||['Statut','Scene semnificative','Construcție']});
const image=()=>'<img src="data:image/webp;base64,AA==" alt="Ilustrație">';
const bank=[];
for(const [slug,bundle] of Object.entries(lessons))for(const [essay,lesson] of Object.entries(bundle.essays)){
  const questions=study.makeQuestions(slug,essay,lesson);
  check(questions.length===18,`${slug}/${essay}: 18 questions required`);
  for(const reper of [1,2,3])check(questions.filter(q=>q.reper===reper).length===6,'Six questions per reper');
  check(new Set(questions.map(q=>q.id)).size===18,'Unique question IDs within each essay');
  const source=JSON.stringify(lesson);
  for(const q of questions){
    check(q.choices.length===4&&new Set(q.choices).size===4&&q.correct===0&&q.explanation.length>0,'One correct answer and four distinct choices');
    check(['Caracterizare directă','Autocaracterizare'].includes(q.choices[0])||source.includes(q.choices[0]),'Answers must come from the authorized essay');
    check(!q.image||q.image.endsWith('/coperta.png')||bundle.assets[q.image],'Only original lesson images');
  }
  bank.push(...questions);
  study.setContext(context(slug,essay));
  for(const reper of [1,2,3]){
    check(study.start(reper),'Quiz starts for this reper');
    const snapshot=study.snapshot().quiz;
    check(snapshot.questions.length===6&&snapshot.questions.every(q=>q.reper===reper),'Other repere cannot leak into a section quiz');
    check(study.quizHtml(image).includes('din 6'),'Correct quiz length in UI');
  }
}
check(bank.length===72,'All four essays have their own questions');
if(actualPath){
  const key=(slug,essay)=>lessons[slug].essays[essay].keyIdea;
  check(key('harap-alb','caracterizare')==='CARACTERUL PROFUND UMAN','Preserve the selected Harap-Alb trait');
  check(key('moara-cu-noroc','caracterizare')==='LĂCOMIA','Preserve the selected Ghiță trait');
  check(lessons['harap-alb'].essays.caracterizare.scenes[1].title.includes('GRĂDINA URSULUI'),'Characterization uses the requested scene');
  check(lessons['moara-cu-noroc'].essays.particularitati.statusCards[0].title==='CONSTRUCȚIA PROTAGONISTULUI'&&lessons['moara-cu-noroc'].essays.particularitati.statusCards[1].title==='CONFLICTUL','Particularities use the two requested traits');
}
study.setContext(context('moara-cu-noroc','caracterizare'));
const paragraph=Array.from({length:120},(_,i)=>`personajul${i} familie bani răspundere alegeri învățare`).join(' ');
const hidden=html=>Array.from(html.matchAll(/data-fxs-word="(\d+)"/g),m=>Number(m[1]));
let previous=[];
for(let level=0;level<=3;level++){
  check(study.setLevel(level),'Choose masking level');
  const html=study.text(paragraph,'exercise');
  const current=hidden(html);
  check(previous.every(index=>current.includes(index)),'Harder levels keep already hidden words hidden');
  if(level>0)check(current.length>previous.length,'Harder levels hide more words');
  previous=current;
}
const hint=previous[0];
check(study.reveal('exercise',hint),'Reveal one word');
check(hidden(study.text(paragraph,'exercise')).length===previous.length-1,'One hint reveals exactly one masked word');
check(!study.reveal('unknown',hint)&&!study.reveal('exercise',-1),'Ignore invalid hints');
study.toggleText();
check(study.effectiveLevel()===0&&hidden(study.text(paragraph,'exercise')).length===0,'Comparison restores full text');
study.toggleText();
check(study.effectiveLevel()===3,'Return to the previous exercise');
study.setLevel(4);
check(!study.text('SECRET WORDS','exercise').includes('SECRET')&&study.effectiveLevel()===4,'Final level removes the text');
check(!study.setLevel(5)&&!study.setLevel(-1),'Reject invalid levels');
study.setLevel(0);
check(study.text('<img src=x onerror=alert(1)>','escaped').includes('&lt;img')&&!study.text('<img src=x>','escaped').includes('<img'),'Lesson text is escaped');
check(!study.start(-1)&&!study.start(4)&&!study.start(1,true),'Ignore invalid and unfinished retries');
study.start(0);
const wrongIDs=[];
while(!study.snapshot().quiz.finished){
  const quiz=study.snapshot().quiz,q=quiz.questions[quiz.index];
  check(!study.next()&&!study.check()&&!study.select(4),'Question requires a valid answer before advancing');
  const wrong=quiz.index%4===0;
  if(wrong)wrongIDs.push(q.id);
  study.select(wrong?(q.correct+1)%4:q.correct);
  const selectedHTML=study.quizHtml(image);
  check(!selectedHTML.includes('fxs-feedback'),'No answer disclosure before verification');
  check(study.check(),'Verify the selected answer');
  check(!study.check()&&!study.select(q.correct),'Verified answers are locked');
  check(study.quizHtml(image).includes(q.explanation.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))),'Feedback explains the answer from the lesson');
  check(study.next(),'Advance after verification');
}
check(study.score().correct===18-wrongIDs.length&&study.score().total===18,'Score reflects verified answers');
const results=study.quizHtml(image);
check(results.includes('Reper 1:')&&results.includes('Reper 2:')&&results.includes('Reper 3:'),'Results include a breakdown for each reper');
check(study.start(0,true),'Retry only wrong answers');
check(study.snapshot().quiz.questions.length===wrongIDs.length&&study.snapshot().quiz.questions.every(q=>wrongIDs.includes(q.id)),'Retry contains exactly the missed questions');
while(!study.snapshot().quiz.finished){const quiz=study.snapshot().quiz;study.select(quiz.questions[quiz.index].correct);study.check();study.next();}
check(study.score().correct===wrongIDs.length&&!study.start(0,true),'Perfect retry has no wrong-answer replay');
study.setContext(context('moara-cu-noroc','particularitati'));
check(!study.quizActive()&&study.snapshot().fragments===0,'Switching essays clears the old quiz and revealed fragments');
study.reset();
check(study.snapshot().context===null&&study.snapshot().quiz===null&&study.snapshot().fragments===0&&!study.start(0),'Reset clears private practice state');

// Exercise the actual protected page event handlers and revocation path.
(async()=>{
  const slug='moara-cu-noroc',bundle=lessons[slug];
  let allowed=false,user={id:'student-test',email:'student@example.test'},decrypts=0,accessEnd=null;
  const callbacks={},node={innerHTML:'',replaceChildren(){this.innerHTML='';}},checkButton={disabled:true};
  const dialog={close(){},querySelector(){return {removeAttribute(){}};},addEventListener(){}};
  const doc={body:{dataset:{lesson:slug}},getElementById(id){if(id==='fxl-content')return node;if(id==='fxl-zoom')return dialog;if(id==='fxl-zoom-close')return {addEventListener(){}};if(id==='fxs-check')return checkButton;return null;},addEventListener(name,fn){callbacks[name]=fn;}};
  const auth={getSession:async()=>({data:{session:user?{user}:null}}),onAuthStateChange(fn){callbacks.auth=fn;}};
  const fx={lessons:[{slug,title:'Moara cu noroc',character:'Ghiță',cover:'/cover.png'}],esc,sb:()=>({auth}),linkAccount:async()=>{},date:value=>value,decode:value=>Uint8Array.from(Buffer.from(value,'base64')),decryptBundle:async()=>{decrypts++;return bundle;},rpc:async name=>name==='fx_student_is_enrolled'?false:{access:{state:allowed?'active':'locked',allowed,endsAt:accessEnd},key:allowed?'test-key':null,version:'test-version'}};
  const page={window:{FormulaXLessons:fx,addEventListener(){},scrollTo(){}},document:doc,location:{search:''},history:{pushState(_,__,url){page.location.search=url;}},URL,URLSearchParams,Blob,Uint8Array,Date,setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){}};
  vm.runInNewContext(pageSource.replace('  heartbeat=setInterval(verify,60000);verify();\n})();','  globalThis.qa={verify};\n})();'),page);
  const practice=page.window.FormulaXEssayPractice;
  const click=dataset=>callbacks.click({preventDefault(){},target:{closest(selector){return selector==='[data-fxs-action]'?{dataset}:null;}}});
  await page.qa.verify();
  check(decrypts===0&&!node.innerHTML.includes('data-fxs-action')&&!practice.start(0),'Unauthorized accounts cannot load practice content');
  allowed=true;await page.qa.verify();
  check(decrypts===1&&node.innerHTML.includes('Chestionar pe tot eseul')&&[1,2,3].every(r=>node.innerHTML.includes(`data-fxs-reper="${r}"`)),'Authorized lesson has full and per-reper controls');
  await click({fxsAction:'harder'});
  check(node.innerHTML.includes('fxs-blank')&&practice.selectedLevel()===1,'Page button hides text');
  await click({fxsAction:'level',fxsLevel:'4'});
  check(node.innerHTML.includes('class="fxs-images-only"')&&!node.innerHTML.includes(bundle.essays.particularitati.intro),'Page final level retains images without the essay text');
  await click({fxsAction:'quiz',fxsReper:'2'});
  check(node.innerHTML.includes('Întrebarea 1 din 6')&&!node.innerHTML.includes('fxs-lesson-body'),'Page opens the selected reper quiz');
  const q=practice.snapshot().quiz.questions[0];
  callbacks.change({target:{matches:()=>true,value:String(q.correct)}});
  check(!checkButton.disabled,'Choosing a radio answer enables verification');
  await click({fxsAction:'check'});
  check(node.innerHTML.includes('Corect!')&&node.innerHTML.includes('Întrebarea următoare'),'Page verifies the selected option and provides feedback');
  accessEnd='2099-01-01T12:00:00Z';await page.qa.verify();
  await click({fxsAction:'back'});
  check(node.innerHTML.includes(accessEnd)&&node.innerHTML.includes('fxs-images-only'),'Returning to the essay preserves masking and updated access time');
  await click({fxsAction:'quiz',fxsReper:'0'});
  const tab={dataset:{fxlEssay:'caracterizare'}};
  await callbacks.click({preventDefault(){},target:{closest(selector){return selector==='[data-fxl-essay]'?tab:null;}}});
  check(!practice.quizActive()&&practice.snapshot().context.essay==='caracterizare'&&node.innerHTML.includes(bundle.essays.caracterizare.keyIdea),'Switching essay replaces the previous question set');
  await click({fxsAction:'quiz',fxsReper:'3'});
  allowed=false;await page.qa.verify();
  check(!node.innerHTML.includes('fxs-quiz')&&!practice.quizActive()&&practice.snapshot().context===null&&practice.snapshot().fragments===0,'Access revocation closes the active quiz and clears private state');
  allowed=true;await page.qa.verify();await click({fxsAction:'quiz',fxsReper:'1'});
  user=null;callbacks.auth('SIGNED_OUT');
  check(node.innerHTML.includes('Conectează-te')&&!practice.quizActive()&&practice.snapshot().context===null,'Signing out also clears practice content');
  console.log(`${checks} practice checks passed: 72 questions, progressive masking, per-reper quizzes, feedback, scoring, retry, essay switching and access revocation${actualPath?' with the approved lesson data':''}.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
