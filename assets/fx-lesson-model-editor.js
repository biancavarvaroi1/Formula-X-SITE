/* Adapter for existing essay/quiz models; preserves their original renderer. */
(function () {
  'use strict';
  const labels = {essays:'Eseuri',particularitati:'Particularități',caracterizare:'Caracterizare',repere:'Repere',scenes:'Scene',points:'Idei',statusCards:'Statut / trăsături',structureCards:'Elemente de construcție',quizQuestions:'Chestionare',quiz:'Chestionare',question:'Întrebare',options:'Variante de răspuns',correct:'Răspuns corect (numărul variantei, de la 0)',explanation:'Explicație',title:'Titlu',text:'Text',intro:'Introducere',conclusion:'Concluzie',relevance:'Relevanță',takeaway:'De reținut',image:'Imagine',alt:'Descriere imagine',theme:'Temă',keyIdea:'Idee centrală'};
  const excluded = new Set(['assets','embeddedImages','imageData','ciphertext','fx_format','slug','subject','id','__proto__','constructor','prototype']);
  const esc = x => window.FormulaXStudioRenderer.escape(x);
  const key = x => x.replace(/~/g,'~0').replace(/\//g,'~1');
  function parts(path) {return path.slice(1).split('/').map(x => x.replace(/~1/g,'/').replace(/~0/g,'~'));}
  function at(doc, path) {return parts(path).reduce((value, part) => value?.[part], doc);}
  function set(doc,path,value) {const p=parts(path),last=p.pop();p.reduce((v,k)=>v[k],doc)[last]=value;}
  function fields(value, path='', label='Lecție', depth=0) {
    if (depth > 12 || value === null) return '';
    if (typeof value !== 'object') {
      if (typeof value === 'string' && (value.length > 12000 || value.startsWith('data:'))) return '';
      const kind=typeof value;
      return '<label class="fxs-field">'+esc(label)+(kind==='boolean'?'<select data-model-path="'+esc(path)+'" data-model-kind="boolean"><option value="true" '+(value?'selected':'')+'>Da</option><option value="false" '+(!value?'selected':'')+'>Nu</option></select>':kind==='number'?'<input type="number" data-model-path="'+esc(path)+'" data-model-kind="number" value="'+esc(value)+'">':'<textarea rows="3" data-model-path="'+esc(path)+'" data-model-kind="string">'+esc(value)+'</textarea>')+'</label>'+(/\/(?:image|heroImage|src)$/.test(path)&&kind==='string'?'<button type="button" class="fxs-button" data-model-upload="'+esc(path)+'">Încarcă imagine</button>':'');
    }
    const entries=Object.entries(value).filter(([name])=>!excluded.has(name));
    const arr=Array.isArray(value);
    return '<details class="fxs-model-group" '+(depth<2?'open':'')+'><summary>'+esc(label)+'</summary>'+entries.map(([name,item])=>{
      const p=path+'/'+key(name),nameLabel=arr?String(Number(name)+1)+'. '+String(item?.title||item?.question||'Element').slice(0,55):labels[name]||name;
      const fixed=/\/(quizQuestions|options)$/.test(path);
      const controls=arr&&!fixed?'<div class="fxs-row"><button type="button" class="fxs-button" data-model-move="'+esc(p)+'" data-direction="-1">↑</button><button type="button" class="fxs-button" data-model-move="'+esc(p)+'" data-direction="1">↓</button><button type="button" class="fxs-button" data-model-duplicate="'+esc(p)+'">Duplică</button><button type="button" class="fxs-button" data-model-remove="'+esc(p)+'">Șterge</button></div>':'';
      return '<div class="fxs-model-entry">'+fields(item,p,nameLabel,depth+1)+controls+'</div>';
    }).join('')+(arr&&value.length&&typeof value[0]==='string'&& !/\/options$/.test(path)?'<button type="button" class="fxs-button" data-model-add="'+esc(path)+'">+ Adaugă idee</button>':'')+'</details>';
  }
  function mount(target,doc,onChange,context={}) {
    target.innerHTML=fields(doc);
    target.oninput=e=>{
      const input=e.target.closest('[data-model-path]');if(!input)return;
      const kind=input.dataset.modelKind;
      const value=kind==='number'?Number(input.value):kind==='boolean'?input.value==='true':input.value;
      if(kind==='number'&&!Number.isFinite(value))return;
      set(doc,input.dataset.modelPath,value);onChange();
    };
    target.onclick=e=>{
      const upload=e.target.closest('[data-model-upload]');
      if(upload){
        const picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp';
        picker.onchange=async()=>{
          const file=picker.files?.[0];if(!file)return;
          if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8388608){alert('Alege JPG, PNG sau WEBP de maximum 8 MB.');return;}
          try{
            const ext=file.type==='image/jpeg'?'jpg':file.type.split('/')[1];
            const bucket=window.FormulaXLessonStore.client().storage.from('fx-universal-lesson-media');
            const name=context.subject+'/'+context.slug+'/'+crypto.randomUUID()+'.'+ext;
            const {error}=await bucket.upload(name,file,{contentType:file.type,upsert:false});if(error)throw error;
            set(doc,upload.dataset.modelUpload,bucket.getPublicUrl(name).data.publicUrl);
            mount(target,doc,onChange,context);onChange();
          }catch(error){alert('Imaginea nu a fost încărcată: '+error.message);}
        };picker.click();return;
      }
      const b=e.target.closest('[data-model-add],[data-model-remove],[data-model-duplicate],[data-model-move]');if(!b)return;
      const action=['add','remove','duplicate','move'].find(x=>b.hasAttribute('data-model-'+x));
      const path=b.dataset['model'+action[0].toUpperCase()+action.slice(1)];
      if(action==='add'){const a=at(doc,path);if(a.length>=150)return;a.push('Idee nouă');}
      else {
        const p=parts(path),index=Number(p.pop()),a=p.reduce((v,k)=>v[k],doc);
        if(action==='remove'){if(a.length<=1||!confirm('Ștergi acest element din lecție?'))return;a.splice(index,1);}
        if(action==='duplicate'){if(a.length>=150)return;a.splice(index+1,0,JSON.parse(JSON.stringify(a[index])));}
        if(action==='move'){const dest=index+Number(b.dataset.direction);if(dest<0||dest>=a.length)return;[a[index],a[dest]]=[a[dest],a[index]];}
      }
      mount(target,doc,onChange,context);onChange();
    };
  }
  function preview(target,doc) {
    const blocks=[];
    function walk(v,label,depth=0) {
      if(depth>8||blocks.length>=150||v===null)return;
      if(typeof v==='string'){if(v.length<12000&&!v.startsWith('data:'))blocks.push({type:'text',text:v});return;}
      if(typeof v!=='object')return;
      if(label&&depth<3)blocks.push({type:'heading',title:label});
      for(const [k,item] of Object.entries(v))if(!excluded.has(k))walk(item,labels[k]||(!/^\d+$/.test(k)?k:''),depth+1);
    }
    walk(doc,'');
    window.FormulaXStudioRenderer.render(target,{fx_format:'formula-x-blocks-v1',title:'Previzualizarea structurii',blocks},{},{},{preview:true});
  }
  window.FormulaXLessonModelEditor={mount,preview};
})();
