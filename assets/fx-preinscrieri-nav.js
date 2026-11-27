/* Preînscrieri Formula X — afișare în portal, numai pentru mentorul Bianca. */
(function(){
 'use strict';
 const link=document.getElementById('fx-bianca-preinscrieri-profesor');
 if(!link)return;
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function sync(){
   let visible=false;
   try{if(typeof staff!=='undefined'&&staff)visible=normalize(staff.display_name)==='bianca varvaroi'&&staff.subject==='romana';}
   catch{}
   link.hidden=!visible;
   link.style.display=visible?'':'none';
 }
 sync();
 const hello=document.getElementById('hello'), app=document.getElementById('app');
 const observer=new MutationObserver(sync);
 if(hello)observer.observe(hello,{subtree:true,childList:true,characterData:true});
 if(app)observer.observe(app,{attributes:true,attributeFilter:['class','hidden','style']});
 window.addEventListener('pageshow',sync);
})();