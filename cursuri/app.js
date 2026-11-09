/* The library reads through the same access RPC as individual lesson pages. */
(() => {
 'use strict';
 const FX=window.FormulaXLessons,$=id=>document.getElementById(id),sb=FX.sb();
 let sequence=0;
 async function refresh(){
  const request=++sequence;
  try{
   const {data,error}=await sb.auth.getSession();if(error)throw error;
   const user=data?.session?.user;let staff=null;
   if(user){await FX.linkAccount();const result=await sb.rpc('get_my_staff_profile');if(!result.error)staff=Array.isArray(result.data)?result.data[0]:result.data;}
   const rows=await FX.rpc('fx_lesson_catalog');
   if(request!==sequence)return;
   $('identity').textContent=user?'Conectat: '+user.email:'Poți citi lecțiile demonstrative fără cont.';
   $('authSection').classList.toggle('hidden',!!user);
   $('teacher').classList.toggle('hidden',!staff||!['admin','mentor'].includes(staff.role));
   $('lessons').innerHTML=FX.catalogMarkup(Array.isArray(rows)?rows:[],$('subject').value,staff);
   $('notice').textContent='';
  }catch(error){if(request===sequence)$('notice').textContent='Nu am putut încărca lecțiile. '+(error.message||'Reîncearcă după verificarea conexiunii.');}
 }
 $('subject').onchange=()=>refresh();
 $('loginForm').onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
  try{const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error)throw error;await refresh();}
  catch(error){$('notice').textContent='Autentificare nereușită: '+error.message;}
  finally{button.disabled=false;}
 };
 sb.auth.onAuthStateChange((event)=>{
  if(event==='SIGNED_OUT'){sequence++;$('lessons').replaceChildren();$('teacher').classList.add('hidden');}
  setTimeout(refresh,0);
 });
 window.addEventListener('pageshow',()=>refresh());
 refresh();
})();
