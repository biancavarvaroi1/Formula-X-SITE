/* Formula X BAC 2027 navigation — does not alter legacy tests. */
(function(){
 function add(){
  if(document.getElementById('formula-x-teste-2027-link'))return;
  var targets=['#teste','#teste-bac','#arhiva-teste','#arhiva','#testele','#tests','#sectiune-teste'];
  var root=null;
  for(var i=0;i<targets.length&&!root;i++)root=document.querySelector(targets[i]);
  if(!root){
   var headings=Array.from(document.querySelectorAll('h1,h2,h3'));
   var h=headings.find(function(x){return /teste|arhiv|subiecte bac/i.test(x.textContent||'')});
   if(h)root=h.parentElement;
  }
  if(!root)root=document.querySelector('main')||document.body;
  var a=document.createElement('a');
  a.id='formula-x-teste-2027-link';
  a.href='/modele-2027/';
  a.textContent='📚 Teste BAC 2027 — subiecte și bareme PDF';
  a.setAttribute('aria-label','Deschide pagina cu toate testele BAC 2027');
  a.style.cssText='display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:14px 8px 14px 0;padding:13px 20px;border-radius:12px;background:linear-gradient(110deg,#0c244a,#1d4c84);color:#fff;font:700 15px/1.4 system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 14px #17376133;max-width:100%;text-align:center;';
  root.insertBefore(a,root.firstChild);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
