const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('assets/fx-lesson-studio-renderer.js','utf8');
const context={window:{},console};
vm.createContext(context);vm.runInContext(source,context);
const api=context.window.FormulaXStudioRenderer;
const doc={fx_format:api.FORMAT,title:'Lecție <script>rău</script>',subtitle:'**BAC**',subject:'romana',theme:'rose',
blocks:[
{type:'heading',title:'Reper 1',text:'Descriere'},
{type:'text',text:'Text <img src=x onerror=alert(1)> explicat'},
{type:'split',title:'Scena',text:'Explicație',image:'javascript:alert(1)'},
{type:'callout',title:'Relevanță',text:'De reținut',variant:'important'},
{type:'quiz',id:'q1',question:'Cine?',options:['Ion','Ela','Ștefan','Ghiță'],correct:2,explanation:'Ștefan'},
{type:'steps',title:'Pași',text:'Primul\nAl doilea'},
{type:'divider'}
]};
const target={innerHTML:'',addEventListener(ev,cb){this.handler=cb;}};
api.render(target,doc,{author:'Profesor'},{},{preview:true});
assert(target.innerHTML.includes('Lecție &lt;script&gt;rău&lt;/script&gt;'));
assert(!target.innerHTML.includes('<script>rău</script>'));
assert(!target.innerHTML.includes('javascript:alert(1)'));
assert(target.innerHTML.includes('fxs-question'));
assert(target.innerHTML.includes('fxs-split'));
assert(!api.safeUrl('data:text/html,<svg onload=alert(1)>'));
assert(api.safeUrl('https://example.com/image.webp'));
assert(api.safeUrl('/assets/lessons/sample/test.webp'));
assert.equal((target.innerHTML.match(/fxs-block/g)||[]).length>=6,true);
console.log('Studio renderer: safe markup, sections, quizzes, images OK.');

// Specific artwork, even when the imported URL is absent; existing media and text remain intact.
for(const [title,needle] of [['Eu nu strivesc corola de minuni a lumii — Lucian Blaga','blaga-prozodie.svg'],['Testament — Tudor Arghezi','arghezi-urat.svg'],['Riga Crypto și lapona Enigel — Ion Barbu','barbu-genuri.svg']]){
 const section=title.startsWith('Eu')?'Prozodie':title.startsWith('Testament')?'Estetica urâtului':'Amestecul genurilor';
 const d={fx_format:api.FORMAT,title,subject:'romana',blocks:[{type:'split',title:section,text:'Textul profesorului',image:''}]};
 const t={innerHTML:'',addEventListener(){}};api.render(t,d);
 assert(t.innerHTML.includes(needle));assert(t.innerHTML.includes('Textul profesorului'));assert.equal(d.blocks[0].image,'');
 assert(fs.existsSync('assets/lesson-illustrations/'+needle));
 d.blocks[0].image='https://example.com/original.webp';api.render(t,d);
 assert(t.innerHTML.includes('src="https://example.com/original.webp"'));assert(t.innerHTML.includes('data-fxs-art-backup'));
}
