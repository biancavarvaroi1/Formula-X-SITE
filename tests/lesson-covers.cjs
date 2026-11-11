const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const window = {};
let imageError;
vm.runInNewContext(fs.readFileSync('assets/formula-x-lessons-core.js','utf8'), {
  window,
  document:{
    querySelectorAll:()=>[],querySelector:()=>null,
    addEventListener:(type,listener,capture)=>{
      if(type==='error'){assert.equal(capture,true);imageError=listener;}
    },
  },
});
const fx = window.FormulaXLessons;
const cases = [
  ['harap-alb','Povestea lui Harap-Alb','romana','/assets/lessons/harap-alb/coperta.webp'],
  ['moara-cu-noroc','Moara cu noroc','romana','/assets/lessons/moara-cu-noroc/coperta.webp'],
  ['ultima-noapte','Ultima noapte de dragoste, întâia noapte de război','romana','/assets/lessons/ultima-noapte/coperta.webp'],
  ['baltagul','Baltagul','romana','/assets/lessons/baltagul/vitoria.webp'],
  ['ion','Ion — Liviu Rebreanu','romana','/assets/lessons/ion/Eseul_1_04_Scena_2_Sarutarea_pamantului.webp'],
  ['import-123','Plumb — George Bacovia','romana','/assets/lessons/plumb/coperta.webp'],
  ['import-456','Luceafărul — Mihai Eminescu','romana','/assets/lessons/luceafarul/coperta.webp'],
  ['progresii-123','Progresii','matematica','/assets/lesson-covers/progresii.svg'],
];
for(const [slug,title,subject,cover] of cases){
  const row={slug,title,subject,access:{allowed:true,state:'active'}};
  assert.equal(fx.coverInfo(row).cover,cover,title);
  const html=fx.catalogMarkup([row],subject);
  assert(html.includes('src="'+cover+'"'),title);
  assert(html.includes('object-fit:contain'),title+' must be shown in full');
  assert(html.includes('data-fxl-fallback='),title+' needs image recovery');
  assert(html.includes('href="'+fx.lessonUrl(slug)+'"'),title+' route changed');
  assert(!html.includes('fxl-cover-text'),title+' still has a logo placeholder');
}
for(const subject of ['romana','matematica','biologie','chimie','fizica','geografie','logica','unknown']){
  const info=fx.coverInfo({slug:'new-123',title:'Lecție nouă',subject});
  assert(fs.existsSync(info.cover.slice(1)),info.cover);
  assert(fs.readFileSync(info.cover.slice(1),'utf8').includes('<svg'),info.cover);
}
assert.equal(fx.coverInfo({title:'Aci sosi pe vremuri — Ion Pillat',subject:'romana'}).cover,'/assets/lesson-covers/romana.svg','An author first name must not select the novel Ion');
assert.equal(fx.coverInfo({title:'Ion',subject:'chimie'}).cover,'/assets/lesson-covers/chimie.svg','Subject filtering must apply to artwork');
assert.equal(fx.coverInfo({slug:'plumb',subject:'romana',cover_url:'https://example.com/custom.webp'}).cover,'https://example.com/custom.webp');
for(const bad of ['javascript:alert(1)','//example.com/image.webp','/\\example.com/image.webp','data:text/html,bad','https://example.com/ bad']){
  assert.equal(fx.coverInfo({cover_url:bad,subject:'romana'}).cover,'/assets/lesson-covers/romana.svg',bad);
}
const escaped=fx.catalogMarkup([{slug:'new',title:'<script>alert(1)</script>',subject:'romana',cover_url:'https://example.com/a?x=" onerror="bad'}]);
assert(!escaped.includes('<script>'));
assert(!escaped.includes(' onerror='));
assert(fx.catalogMarkup([{slug:'ion',title:'Ion',subject:'romana',access:{allowed:false,state:'locked'}}]).includes('Vezi accesul la lecție'));
assert(fx.catalogMarkup([{slug:'ion',title:'Ion',subject:'romana'}],'romana',{role:'admin'}).includes('Editează lecția'));
const attrs={'data-fxl-cover':'','data-fxl-fallback':'/assets/lesson-covers/romana.svg',src:'/missing.webp'};
const frame={innerHTML:''};
const img={hasAttribute:key=>key in attrs,getAttribute:key=>attrs[key],setAttribute:(key,value)=>attrs[key]=value,parentElement:frame};
imageError({target:img});
assert.equal(attrs.src,'/assets/lesson-covers/romana.svg');
imageError({target:img});
assert(frame.innerHTML.includes('<svg')&&!frame.innerHTML.includes('<img'),'Second failure must not leave a broken image or create a retry loop');
imageError({target:{hasAttribute:()=>false}});
for(const slug of ['ultima-noapte','plumb','luceafarul']){
  const data=fs.readFileSync('assets/lessons/'+slug+'/coperta.webp');
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
}
console.log('PASS: known covers, new lessons in every subject, safe URLs, access links and two-stage image recovery.');
