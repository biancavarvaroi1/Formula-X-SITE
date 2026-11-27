/* Formula X — preînscriere vizibilă lângă mentorul de Română. */
(function(){
 'use strict';
 const normalize=s=>String(s||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('ro-RO');
 const target='/preinscriere-bianca.html';
 function addAfter(node,id){
  if(!node||document.getElementById(id))return;
  const interactive=node.closest('a,button');
  if(interactive)node=interactive;
  const link=document.createElement('a');
  link.id=id;link.href=target;link.textContent='Preînscriere la noua grupă →';
  link.className='fx-bianca-apply';
  link.style.cssText='display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center;justify-content:center;background:#a83d83;color:#fff;padding:11px 16px;margin:10px 0;border-radius:10px;font-size:14px;font-weight:750;line-height:1.35;text-decoration:none;position:relative;z-index:2;max-width:100%;box-sizing:border-box;';
  link.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();window.location.assign(target);});
  node.insertAdjacentElement('afterend',link);
 }
 function install(){
  const nodes=Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,strong,small'));
  const detail=nodes.find(n=>/^h[1-6]$/i.test(n.tagName)&&normalize(n.textContent)==='bianca varvaroi');
  if(detail)addAfter(detail,'fx-bianca-apply-detail');
  const mentor=nodes.find(n=>normalize(n.textContent)==='mentor: bianca varvaroi'&&!Array.from(n.children).some(c=>normalize(c.textContent)==='mentor: bianca varvaroi'));
  if(mentor)addAfter(mentor,'fx-bianca-apply-card');
  // Retain a visible link even if the mentor-card markup is changed in a future release.
  if(!detail&&!mentor){
    const heading=nodes.find(n=>/^h[1-6]$/i.test(n.tagName)&&normalize(n.textContent)==='alege materia');
    if(heading)addAfter(heading,'fx-bianca-apply-card');
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 window.addEventListener('pageshow',install);
 // Some views create their content only after the learner chooses a subject.
 document.addEventListener('click',()=>queueMicrotask(install));
})();