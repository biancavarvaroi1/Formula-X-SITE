/* Compatibility entry for cached pages. All database lessons use Studio. */
(function(){
 'use strict';
 const target=document.querySelector('#teacher');if(!target)return;
 const link=document.createElement('a');link.href='/profesori/studio.html';
 link.textContent='Deschide editorul de lecții';target.append(link);
})();
