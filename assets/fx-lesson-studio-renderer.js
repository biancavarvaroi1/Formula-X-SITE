/* Formula X Lesson Studio - safe visual renderer for authorized lessons. */
(function(){
  "use strict";
  const FMT="formula-x-blocks-v1";
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const text=v=>esc(v).replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");
  const safeUrl=(input,preview=false)=>{
    const s=String(input||"").trim();
    if(/^https:\/\/[^\s<>"']+$/i.test(s))return s;
    if(/^\/assets\/[A-Za-z0-9/_\-.%]+$/.test(s))return s;
    if(preview && /^blob:https?:\/\//.test(s))return s;
    return "";
  };
  function image(url,alt,preview){
    const src=safeUrl(url,preview);if(!src)return "";
    return '<img class="fxs-art" loading="lazy" decoding="async" src="'+esc(src)+'" alt="'+esc(alt||"Imagine pentru lecție")+'">';
  }
  function listItems(value){return String(value||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,25)}
  function block(b,index,preview){
    if(!b||typeof b!=="object")return "";
    const id="fxs-block-"+index;const a='<section class="fxs-block" id="'+id+'">';
    switch(b.type){
      case "heading":return a+'<h2>'+text(b.title)+'</h2>'+(b.text?'<p class="fxs-muted">'+text(b.text)+'</p>':"")+'</section>';
      case "text":return a+'<div class="fxs-prose">'+text(b.text)+'</div></section>';
      case "image":return a+'<figure class="fxs-figure">'+image(b.image,b.alt,preview)+(b.caption?'<figcaption>'+text(b.caption)+'</figcaption>':"")+'</figure></section>';
      case "split":return a+'<div class="fxs-split '+(b.side==="right"?"fxs-reverse":"")+'"><div class="fxs-split-visual">'+image(b.image,b.title,preview)+'</div><div class="fxs-split-copy"><span class="fxs-overline">'+esc(b.eyebrow||"REȚINE")+'</span><h3>'+text(b.title)+'</h3><p>'+text(b.text)+'</p></div></div></section>';
      case "callout":return a+'<aside class="fxs-callout '+(b.variant==="important"?"fxs-important":b.variant==="success"?"fxs-success":"")+'"><div class="fxs-overline">'+esc(b.label||"RELEVANȚĂ")+'</div><h3>'+text(b.title)+'</h3><p>'+text(b.text)+'</p></aside></section>';
      case "quote":return a+'<blockquote class="fxs-quote"><p>“'+text(b.text)+'”</p>'+(b.author?'<cite>'+esc(b.author)+'</cite>':"")+'</blockquote></section>';
      case "steps":return a+'<h3>'+text(b.title)+'</h3><ol class="fxs-steps">'+listItems(b.text).map((x,i)=>'<li><b>'+ (i+1) +'</b><span>'+text(x)+'</span></li>').join("")+'</ol></section>';
      case "cards":return a+'<h3>'+text(b.title)+'</h3><div class="fxs-mini-grid">'+listItems(b.text).map(x=>'<div class="fxs-mini-card">'+text(x)+'</div>').join("")+'</div></section>';
      case "quiz":{
        const opts=Array.isArray(b.options)?b.options.slice(0,6):[];
        if(opts.length<2)return "";
        return a+'<div class="fxs-question" data-fxs-quiz="'+esc(String(b.id||index))+'"><span class="fxs-overline">VERIFICĂ DACĂ AI ÎNȚELES</span><h3>'+text(b.question)+'</h3><div class="fxs-options">'+opts.map((x,i)=>'<button class="fxs-option" type="button" data-fxs-choice="'+i+'"><b>'+String.fromCharCode(65+i)+'.</b> '+text(x)+'</button>').join("")+'</div><p class="fxs-feedback" role="status" aria-live="polite"></p></div></section>';
      }
      case "video":{
        const url=safeUrl(b.url);
        return a+'<div class="fxs-video"><span class="fxs-overline">VIDEO / RESURSĂ</span><h3>'+text(b.title)+'</h3><p>'+text(b.text)+'</p>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Deschide resursa ↗</a>':"")+'</div></section>';
      }
      case "divider":return '<div class="fxs-divider" role="separator"></div>';
      default:return "";
    }
  }
  // Eseurile BAC păstrează blocurile și chestionarele, dar sunt citite ca
  // secțiuni legate între ele, nu ca zeci de panouri individuale.
  function renderEssayChapters(blocks,preview){
    let html="",isOpen=false;
    blocks.slice(0,150).forEach((b,index)=>{
      if(b?.type==="heading"){
        if(isOpen)html+="</article>";
        const label=String(b.title||"");
        const kind=/^REPERUL\s+[12]\b/i.test(label)?" fxs-chapter-reper":/^Cum scrii/i.test(label)?" fxs-chapter-recap":"";
        html+='<article class="fxs-essay-chapter'+kind+'">';
        isOpen=true;
      } else if(!isOpen){
        html+='<article class="fxs-essay-chapter">';
        isOpen=true;
      }
      html+=block(b,index,preview);
    });
    if(isOpen)html+="</article>";
    return html;
  }
  function poetryLesson(doc) {
    return doc.subject==="romana" && /^(?:Testament|Eu nu strivesc corola de minuni a lumii|Riga Crypto [șş]i lapona Enigel)(?:\s*[—–-]|\s*$)/i.test(String(doc.title||""));
  }
  function assessmentBlock(b) {
    return b.type==="quiz" || b.fxPart==="writing" || b.fxPart==="key" ||
      (b.type==="heading" && /^chestionar(?:ul)? final/i.test(b.title||"")) ||
      (b.type==="callout" && b.label==="AUTOEVALUARE");
  }
  function paperContent(doc,preview) {
    const study=[],questions=[],writing=[];
    doc.blocks.slice(0,150).forEach((b,i)=>{
      if(b.type==="quiz")questions.push({b,i});
      else if(b.fxPart==="writing")writing.push(b);
      else if(!assessmentBlock(b)){
        if(b.type==="quote") {
          study.push('<section class="fxs-block" id="fxs-block-'+i+'"><blockquote class="fxs-quote"><p>'+text(b.text)+'</p></blockquote></section>');
        } else if(b.fxPart==="matrix" && Array.isArray(b.rows)) {
          const row=(cells,tag)=>'<tr>'+cells.map(c=>'<'+tag+(tag==="th"?' scope="col"':'')+'>'+text(c)+'</'+tag+'>').join("")+'</tr>';
          study.push('<section class="fxs-block" id="fxs-block-'+i+'"><h3>'+text(b.title)+'</h3><div class="fxp-table"><table><thead>'+row(b.columns,"th")+'</thead><tbody>'+b.rows.map(r=>row(r,"td")).join("")+'</tbody></table></div></section>');
        } else if(b.type==="callout" && b.title==="Ce urmărește această operă?") study.push(block(Object.assign({},b,{title:"Ideea centrală"}),i,preview));
        else study.push(block(b,i,preview));
      }
    });
    if(!questions.length && !writing.length)return study.join("");
    const keys=questions.map(({b},j)=>'<li><b>'+(j+1)+' · '+String.fromCharCode(65+Number(b.correct))+'</b><span>'+text(b.explanation||"")+'</span></li>').join("");
    const prompts=writing.map((b,i)=>'<div class="fxp-prompt"><h3>Exercițiu de redactare '+(i+1)+'</h3><p>'+text(b.title)+'</p><div class="fxp-ruled" aria-hidden="true"></div></div>').join("");
    const guide=writing.length?'<h3>Repere pentru redactare</h3><ol>'+writing.map(b=>'<li>'+text(b.text)+'</li>').join("")+'</ol>':"";
    return study.join("")+'<section class="fxp-final"><h2>Chestionar final</h2><p>'+questions.length+' întrebări după studierea operei.</p>'+
      '<button type="button" data-fxp-toggle aria-expanded="false">Deschide chestionarul</button>'+
      '<div class="fxp-exercises" data-open="false">'+questions.map(({b,i},j)=>block(Object.assign({},b,{question:(j+1)+'. '+b.question}),i,preview)).join("")+
      prompts+'<button type="button" data-fxp-key aria-expanded="false">Arată răspunsurile explicate</button>'+
      '<div class="fxp-key" data-open="false"><h2>Răspunsuri explicate</h2><ol class="fxp-key-list">'+keys+'</ol>'+guide+'</div></div></section>';
  }
  function render(root,doc,meta={},access={},options={}){
    if(!root||!doc||doc.fx_format!==FMT||!Array.isArray(doc.blocks))throw new Error("Format de lecție necunoscut");
    const preview=options.preview===true;
    const variant=["rose","ocean","sage","sand"].includes(doc.theme)?doc.theme:"rose";
    const essay=/^(?:Luceafărul|Plumb)\s*[—–-]/i.test(String(doc.title||"")) && doc.subject==="romana";
    const paper=poetryLesson(doc);
    const titles=doc.blocks.map((b,i)=>({b,i})).filter(({b})=>b.type==="heading"&&b.title&&(!paper||!assessmentBlock(b)));
    const html='<div class="fxs-studio-view fxs-theme-'+variant+(essay?' fxs-bac-essay':'')+(paper?' fxp-paper':'')+'">'+
      '<header class="fxs-hero"><span class="fxs-overline">FORMULA X · LECȚIE INTERACTIVĂ</span>'+
      '<h1>'+text(doc.title||meta.title||"Lecție nouă")+'</h1>'+
      '<p>'+text(doc.subtitle||"Învață logic, vizual și interactiv.")+'</p>'+
      '<div class="fxs-badges"><span>'+esc(doc.subject||meta.subject||"Română")+'</span><span>'+esc(meta.author||"Formula X")+'</span>'+
      (preview?'<span>Previzualizare profesor</span>':access.endsAt?'<span>Acces până la '+esc(new Date(access.endsAt).toLocaleDateString("ro-RO"))+'</span>':"")+
      '</div></header>'+
      (paper?'<div class="fxp-tools"><button data-fxp-print type="button">Tipărește lecția</button></div>':'')+
      (titles.length?'<nav class="fxs-toc" aria-label="Cuprinsul lecției"><strong>Cuprins</strong>'+titles.map(({b,i})=>'<a href="#fxs-block-'+i+'">'+esc(b.title)+'</a>').join("")+'</nav>':"")+
      '<div class="fxs-content">'+(paper?paperContent(doc,preview):essay?renderEssayChapters(doc.blocks,preview):doc.blocks.slice(0,150).map((b,i)=>block(b,i,preview)).join(""))+'</div>'+
      '<footer class="fxs-end">Formula X · Ai parcurs lecția. Revino la reperele importante și verifică-ți cunoștințele!</footer></div>';
    root.innerHTML=html;
    root.__fxStudioDoc=doc;
    if(!root.__fxStudioHandler){
      root.__fxStudioHandler=true;
      root.addEventListener("click",ev=>{
        const action=ev.target.closest("[data-fxp-print],[data-fxp-toggle],[data-fxp-key]");
        if(action&&root.contains(action)){
          if(action.hasAttribute("data-fxp-print")){
            const current=root.__fxStudioDoc;
            const images=Array.from(root.querySelectorAll(".fxp-paper img"));
            images.forEach(img=>{img.loading="eager"});
            Promise.all(images.map(img=>img.decode?img.decode().catch(()=>{}):Promise.resolve())).then(()=>{
              if(root.__fxStudioDoc===current && root.contains(action))window.print();
            });
          }else{
            const key=action.hasAttribute("data-fxp-key"),panel=action.nextElementSibling;
            const opened=panel.dataset.open!=="true";panel.dataset.open=String(opened);
            action.setAttribute("aria-expanded",String(opened));
            action.textContent=key?(opened?"Ascunde răspunsurile explicate":"Arată răspunsurile explicate"):(opened?"Restrânge chestionarul":"Deschide chestionarul");
          }
          return;
        }
        const button=ev.target.closest("[data-fxs-choice]");
        if(!button||!root.contains(button))return;
        const parent=button.closest("[data-fxs-quiz]");
        if(!parent||parent.dataset.completed==="1")return;
        const key=parent.dataset.fxsQuiz;
        const quiz=root.__fxStudioDoc.blocks.find((b,i)=>b.type==="quiz"&&String(b.id||i)===key);
        if(!quiz)return;
        const chosen=Number(button.dataset.fxsChoice),correct=Number(quiz.correct);
        parent.dataset.completed="1";
        parent.querySelectorAll(".fxs-option").forEach(x=>{
          x.disabled=true;
          if(Number(x.dataset.fxsChoice)===correct)x.classList.add("is-right");
          else if(x===button)x.classList.add("is-wrong");
        });
        const feedback=parent.querySelector(".fxs-feedback");
        feedback.textContent=(chosen===correct?"Corect! ":"Mai încearcă la recapitulare. ")+(quiz.explanation||"");
      });
    }
  }
  window.FormulaXStudioRenderer={FORMAT:FMT,render,escape:esc,safeUrl};
})();