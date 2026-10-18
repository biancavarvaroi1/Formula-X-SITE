const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/formula-x-essay-practice.js'),'utf8');
const ctx={window:{},Math,Number,Set,Map,Array,String,Object,Intl};
vm.runInNewContext(source,ctx);
const study=ctx.window.FormulaXEssayPractice;
const questions=Array.from({length:18},(_,i)=>({
  id:'baltagul-q-'+(i+1),
  reper:Math.floor(i/6)+1,
  prompt:'Întrebarea din Baltagul '+(i+1)+'?',
  choices:['A '+i,'B '+i,'C '+i,'D '+i],
  correct:i%4,
  explanation:'Explicația răspunsului '+(i+1)
}));
const lesson={quizQuestions:questions};
const rows=study.makeQuestions('baltagul','particularitati',lesson);
assert.equal(rows.length,18);
assert.equal(new Set(rows.map(r=>r.id)).size,18);
assert.equal(rows[5].reper,1);
assert.equal(rows[6].reper,2);
assert.equal(rows[12].reper,3);
for(let i=0;i<18;i++){
  assert.equal(rows[i].choices[0],questions[i].choices[questions[i].correct]);
  assert.equal(rows[i].explanation,questions[i].explanation);
}
study.setContext({slug:'baltagul',essay:'particularitati',version:'test',lesson,reperNames:['Trăsături','Scene','Structură']});
assert.equal(study.start(1),true);
assert.equal(study.snapshot().quiz.questions.length,6);
assert.equal(study.start(0),true);
assert.equal(study.snapshot().quiz.questions.length,18);
assert.equal(study.start(3),true);
assert.equal(study.snapshot().quiz.questions.length,6);
assert.throws(()=>study.makeQuestions('baltagul','particularitati',{quizQuestions:questions.slice(1)}),/șase întrebări/);
assert.throws(()=>study.makeQuestions('baltagul','particularitati',{quizQuestions:[...questions.slice(0,17),questions[0]]}),/Întrebare invalidă/);
assert.throws(()=>study.makeQuestions('baltagul','particularitati',{quizQuestions:[...questions.slice(0,17),{...questions[17],correct:9}]}),/Întrebare invalidă/);
console.log('BALTAGUL: întrebări valide, grupare pe repere și răspunsuri corecte.');
