let contactMessages=[];

const SUPABASE_URL='https://vooflhvdoutjplfbnahl.supabase.co';
const SUPABASE_PUBLIC_KEY='sb_publishable_iuJBis3q_83zNlYFER2AXQ_o8gzpDPA';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
const resetSb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'formula-x-password-reset-request'}});
const SUBJECTS={
  romana:{label:'Limba Română',icon:'✒️',primary:'#a83d83',soft:'#da91bf',bg:'#fff4fa',tint:'#f9e7f3'},
  matematica:{label:'Matematică',icon:'📐',primary:'#17386f',soft:'#5174ad',bg:'#f3f7ff',tint:'#e8effa'},
  biologie:{label:'Biologie',icon:'🧬',primary:'#367b52',soft:'#78af8a',bg:'#f3fbf5',tint:'#e6f2e9'},
  chimie:{label:'Chimie',icon:'🧪',primary:'#5790a7',soft:'#9cc8d8',bg:'#f3fbfe',tint:'#e6f5fa'},
  fizica:{label:'Fizică',icon:'⚛️',primary:'#503579',soft:'#8971ad',bg:'#f8f4fd',tint:'#eee8f7'},
  geografie:{label:'Geografie',icon:'🌍',primary:'#7a3045',soft:'#d98fa3',bg:'#fff5f7',tint:'#f8e9ee'},
  logica:{label:'Logică, argumentare și comunicare',icon:'🧠',primary:'#9F11A1',soft:'#D77AD9',bg:'#FFF4FF',tint:'#F8E5F9'}
};
const WEEKDAYS=['','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică'];
const ATTENDANCE_WEEK_COUNT=17;
let staff=null,user=null,students=[],groups=[],members=[],sessions=[],activities=[],staffList=[],pageViews=[],attendance=[];
let attendanceAvailable=true;
let activeTab='students',calendarDate=new Date();

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=v=>v?new Intl.DateTimeFormat('ro-RO',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v)):'-';
const fmtDateTime=v=>v?new Intl.DateTimeFormat('ro-RO',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'-';
const timeShort=v=>String(v||'').slice(0,5);
function safeMeetingUrl(value){try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function subjectLabel(k){return SUBJECTS[k]?`${SUBJECTS[k].icon} ${SUBJECTS[k].label}`:k||'-'}
function statusBadge(s,archived){if(archived)return '<span class="badge b-archived">Eliminat</span>';const c=s==='activ'?'b-activ':s==='inactiv'?'b-inactiv':'b-nou';return `<span class="badge ${c}">${esc(s||'nou')}</span>`}
function typeLabel(t){return t==='sedinta_gratuita'?'Ședință gratuită':t==='manual'?'Adăugat de profesor':'Înscriere'}
function selectedSubject(){return staff?.role==='mentor'?staff.subject:$('adminSubject').value||''}
function visibleSubject(subject){const s=selectedSubject();return !s||subject===s}
function theme(){
  const t=staff?.role==='mentor'?SUBJECTS[staff.subject]:{primary:'#7a3045',soft:'#d98fa3',bg:'#fff7f9',tint:'#f8e9ee'};
  document.documentElement.style.setProperty('--primary',t?.primary||'#7a3045');
  document.documentElement.style.setProperty('--soft',t?.soft||'#d98fa3');
  document.documentElement.style.setProperty('--bg',t?.bg||'#fff7f9');
  document.documentElement.style.setProperty('--tint',t?.tint||'#f8e9ee');
}
function showLogin(msg=''){
  $('boot')?.classList.add('hidden');
  $('app').classList.add('hidden');
  $('login').classList.remove('hidden');
  $('loginMsg').textContent=msg;
  $('loginBtn').disabled=false;
  $('loginBtn').textContent='Intră în portal';
}
function showBoot(){
  $('login').classList.add('hidden');
  $('app').classList.add('hidden');
  $('boot')?.classList.remove('hidden');
}
function showApp(){
  $('boot')?.classList.add('hidden');
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
}
function portalNotice(message=''){
  const el=$('portalNotice');
  if(!el)return;
  el.textContent=message;
  el.classList.toggle('show',Boolean(message));
}
function goToPublicSite(){
  location.assign('https://formula-x.ro/?portal=site#acasa');
}
function openModal(title,body,foot=''){ $('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalFoot').innerHTML=foot;$('modal').classList.remove('hidden')}
function closeModal(){ $('modal').classList.add('hidden');$('modalBody').innerHTML='';$('modalFoot').innerHTML=''}
function setTab(tab){
  if(['views','messages','activity'].includes(tab) && staff?.role!=='admin') tab='students';
  activeTab=tab;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.tabview').forEach(v=>v.classList.add('hidden'));
  $('tab-'+tab)?.classList.remove('hidden');
  if(tab==='attendance')renderAttendance();
  if(tab==='calendar')renderCalendar();
  if(tab==='activity')renderActivity();
  if(tab==='views')renderViews();
}
async function staffForCurrentUser(){
  const {data:{user:u},error:userError}=await sb.auth.getUser();

  if(userError){
    console.error('Formula X V32 - auth.getUser:',userError);
    throw new Error('AUTH_USER_ERROR: '+(userError.message||'necunoscut'));
  }

  if(!u){
    throw new Error('AUTH_NO_USER');
  }

  user=u;

  // V27: folosim RPC-ul dedicat, nu SELECT direct din browser.
  const {data,error}=await sb.rpc('get_my_staff_profile');

  if(error){
    console.error('Formula X V32 - get_my_staff_profile:',error);
    throw new Error('STAFF_RPC_ERROR: '+(error.message||'necunoscut'));
  }

  const row=Array.isArray(data)?data[0]:data;

  if(!row){
    throw new Error('STAFF_NOT_FOUND');
  }

  if(row.role!=='mentor' && row.role!=='admin'){
    throw new Error('STAFF_INVALID_ROLE');
  }

  if(row.role==='mentor' && !SUBJECTS[row.subject]){
    throw new Error('STAFF_UNKNOWN_SUBJECT: '+String(row.subject||''));
  }

  return row;
}
function populateSubjectFilters(){
  $('adminSubject').innerHTML='<option value="">Toate materiile</option>'+Object.entries(SUBJECTS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
}
async function openPortal(){
  try{
    staff=await staffForCurrentUser()
  }catch(e){
    console.error('Formula X V32 - acces profesor:',e);
    const m=String(e?.message||e||'');
    let txt='Nu am putut verifica accesul.';
    if(m.includes('STAFF_NOT_FOUND')) txt='Contul este autentificat, dar nu este înregistrat ca profesor în staff_accounts.';
    else if(m.includes('STAFF_UNKNOWN_SUBJECT')) txt='Contul de profesor are o materie necunoscută în portal: '+m.split(':').slice(1).join(':').trim();
    else if(m.includes('STAFF_RPC_ERROR')) txt='Supabase nu permite citirea profilului de profesor. Contactează administratorul Formula X.';
    else if(m.includes('AUTH_NO_USER')) txt='Sesiunea nu a fost creată. Conectează-te din nou.';
    else if(m.includes('AUTH_USER_ERROR')) txt='Supabase a returnat o eroare la verificarea sesiunii.';
    showLogin(txt);
    return false
  }
  if(!staff)return false;
  document.body.classList.toggle('admin',staff.role==='admin');theme();populateSubjectFilters();
  $('hello').textContent=`Bună, ${staff.display_name}!`;
  if(staff.role==='admin'){
    $('heroText').textContent='Ai vizibilitate asupra elevilor, grupelor, calendarului și activității întregii echipe Formula X.';
    $('subjectPill').textContent='🛡 Administrator';
  }else{
    $('heroText').textContent=`Gestionezi elevii, mesajele, grupele și programările pentru ${SUBJECTS[staff.subject]?.label||staff.subject}.`;
    $('subjectPill').textContent=subjectLabel(staff.subject);
  }
  await loadAll();showApp();return true;
}
async function loadAll(){
  portalNotice('');
  await Promise.all([
    loadStaff(),
    loadStudents(),
    loadAttendance(),
    loadGroups(),
    loadMembers(),
    loadSessions(),
    loadActivity(),
    loadPageViews(),
    loadContactMessages()
  ]);
  renderAll();
}
async function loadStaff(){
  const {data,error}=await sb.from('staff_accounts').select('user_id,display_name,role,subject');
  if(error){console.error(error);staffList=[];return}staffList=data||[];
}
async function loadStudents(){
  let q=sb.from('enrollments').select('id,full_name,email,phone,subject,level,status,source,student_message,desired_grade,teacher_note,archived_at,request_type,created_at,updated_at').order('created_at',{ascending:false});
  if(staff.role==='mentor')q=q.eq('subject',staff.subject);
  const {data,error}=await q;if(error){console.error(error);students=[];return}students=data||[];
}
async function loadAttendance(){
  attendanceAvailable=true;
  let q=sb.from('student_attendance').select('id,enrollment_id,subject,week_number,marked_by,created_at').order('week_number',{ascending:true});
  if(staff?.role==='mentor')q=q.eq('subject',staff.subject);
  const {data,error}=await q;
  if(error){
    console.error('Formula X V32 - attendance:',error);
    attendance=[];
    attendanceAvailable=false;
    return;
  }
  attendance=data||[];
}
async function loadGroups(){
  let q=sb.from('teacher_groups').select('id,owner_id,subject,name,weekday,start_time,end_time,notes,active,created_at,updated_at').order('created_at',{ascending:true});
  if(staff.role==='mentor')q=q.eq('owner_id',user.id);
  const {data,error}=await q;if(error){console.error(error);groups=[];return}groups=data||[];
}
async function loadMembers(){
  const {data,error}=await sb.from('group_members').select('group_id,enrollment_id,added_at');
  if(error){console.error(error);members=[];return}members=data||[];
}
async function loadSessions(){
  let q=sb.from('teacher_sessions').select('id,owner_id,subject,group_id,enrollment_id,title,session_date,start_time,end_time,meeting_url,notes,status,created_at,updated_at').order('session_date',{ascending:true}).order('start_time',{ascending:true});
  if(staff.role==='mentor')q=q.eq('owner_id',user.id);
  const {data,error}=await q;if(error){console.error(error);sessions=[];return}sessions=data||[];
}
async function loadActivity(){
  if(!staff)return;
  let q=sb.from('teacher_activity').select('id,actor_id,subject,action,entity_type,entity_id,details,created_at').order('created_at',{ascending:false}).limit(250);
  if(staff.role==='mentor')q=q.eq('actor_id',user.id);
  const {data,error}=await q;if(error){console.error(error);activities=[];return}activities=data||[];
}

async function loadPageViews(){
  if(staff?.role!=='admin'){pageViews=[];return}
  const {data,error}=await sb.rpc('get_page_view_stats',{p_days:365});
  if(error){
    console.error('Formula X V32 - analytics:',error);
    pageViews=[];
    portalNotice('Portalul funcționează, dar statisticile de vizualizare nu au putut fi încărcate.');
    return;
  }
  pageViews=data||[];
}
const PAGE_LABELS={
  acasa:'Acasă',
  romana:'Română',
  mate:'Matematică',
  bio:'Biologie',
  fizica:'Fizică',
  chimie:'Chimie',
  geo:'Geografie',
  logica:'Logică',
  teste:'Teste BAC',
  'camera-studiu':'Camera de studiu',
  cont:'Cont',
  profesori:'Portal profesori'
};
function bucharestDateKey(d=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Europe/Bucharest',
    year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(d);
  const obj=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}
function dateMinusDaysKey(days){
  const d=new Date();
  d.setUTCDate(d.getUTCDate()-days);
  return bucharestDateKey(d);
}
function viewsFromDays(days){
  const min=dateMinusDaysKey(days-1);
  return pageViews.filter(r=>String(r.view_date)>=min);
}
function sumViews(rows){return rows.reduce((s,r)=>s+Number(r.views||0),0)}
function renderViews(){
  if(staff?.role!=='admin')return;
  const today=bucharestDateKey();
  $('viewsToday').textContent=sumViews(pageViews.filter(r=>String(r.view_date)===today));
  $('views7').textContent=sumViews(viewsFromDays(7));
  $('views30').textContent=sumViews(viewsFromDays(30));
  $('views365').textContent=sumViews(viewsFromDays(365));

  const days=Number($('viewsRange')?.value||30);
  const rows=viewsFromDays(days);
  const byPage=new Map();
  rows.forEach(r=>byPage.set(r.page_key,(byPage.get(r.page_key)||0)+Number(r.views||0)));
  const pages=[...byPage.entries()].sort((a,b)=>b[1]-a[1]);
  const max=Math.max(1,...pages.map(x=>x[1]));
  $('viewsBreakdownTitle').textContent=`Pagini — ultimele ${days} zile`;
  $('viewsBreakdown').innerHTML=pages.length?pages.map(([key,count])=>`
    <div class="view-row">
      <strong>${esc(PAGE_LABELS[key]||key)}</strong>
      <div class="view-bar"><div class="view-fill" style="width:${Math.max(3,(count/max)*100)}%"></div></div>
      <span class="view-count">${count}</span>
    </div>
  `).join(''):'<div class="empty">Nu există vizualizări în perioada selectată.</div>';

  const byDay=new Map();
  rows.forEach(r=>byDay.set(String(r.view_date),(byDay.get(String(r.view_date))||0)+Number(r.views||0)));
  const daysArr=[...byDay.entries()].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
  $('viewsDaily').innerHTML=daysArr.length?daysArr.map(([date,count])=>`
    <div class="daily-row"><span>${fmtDate(date+'T12:00:00')}</span><b>${count} vizualizări</b></div>
  `).join(''):'<div class="empty">Nu există date.</div>';
}

async function logActivity(subject,action,entityType,entityId,details={}){
  try{await sb.from('teacher_activity').insert({actor_id:user.id,subject,action,entity_type:entityType,entity_id:String(entityId||''),details})}catch(e){console.debug('Activity log:',e)}
}
function renderAll(){renderStats();renderStudents();renderAttendance();renderGroups();renderCalendar();renderActivity();renderViews();renderContactMessages()}
function relevantStudents(){return students.filter(s=>visibleSubject(s.subject))}
function relevantGroups(){return groups.filter(g=>visibleSubject(g.subject))}
function relevantSessions(){return sessions.filter(s=>visibleSubject(s.subject))}
function renderStats(){
  const ss=relevantStudents().filter(x=>!x.archived_at),gg=relevantGroups().filter(x=>x.active),now=new Date(),today=now.toISOString().slice(0,10),future=relevantSessions().filter(x=>x.session_date>=today&&x.status==='programata');
  $('statStudents').textContent=ss.length;$('statNew').textContent=ss.filter(x=>x.status==='nou').length;$('statActive').textContent=ss.filter(x=>x.status==='activ').length;$('statGroups').textContent=gg.length;$('statSessions').textContent=future.length;
}
function filteredStudents(){
  const q=$('studentSearch').value.trim().toLowerCase(),st=$('studentStatus').value,tp=$('studentType').value,show=$('showArchived').checked;
  return relevantStudents().filter(r=>{
    if(!show&&r.archived_at)return false;if(st&&r.status!==st)return false;if(tp&&r.request_type!==tp)return false;
    const groupNames=groups.filter(g=>members.some(m=>m.group_id===g.id&&m.enrollment_id===r.id)).map(g=>g.name).join(' ');
    const hay=[r.full_name,r.email,r.phone,r.level,r.student_message,r.teacher_note,r.desired_grade,groupNames].filter(Boolean).join(' ').toLowerCase();
    return !q||hay.includes(q);
  })
}
function groupsForStudent(id){return groups.filter(g=>members.some(m=>m.group_id===g.id&&m.enrollment_id===id))}
function renderStudents(){
  const arr=filteredStudents();
  if(!arr.length){$('studentsContent').innerHTML='<div class="empty">Nu există elevi pentru filtrele selectate.</div>';return}
  let h='<div class="table-wrap"><table class="student-table"><thead><tr><th>Elev</th><th>Contact</th><th>Materie</th><th>Mesaj elev</th><th>Grupă</th><th>Status</th><th>Acțiuni</th></tr></thead><tbody>';
  for(const r of arr){
    const gs=groupsForStudent(r.id);
    const msg=(r.student_message||'').trim();
    h+=`<tr>
      <td data-label="Elev"><div class="name">${esc(r.full_name)}</div><div class="subtext">${esc(r.level||'Nivel nespecificat')} • ${esc(typeLabel(r.request_type))}<br>${fmtDate(r.created_at)}</div></td>
      <td data-label="Contact">${esc(r.phone||'-')}<div class="subtext">${esc(r.email)}</div></td>
      <td data-label="Materie">${esc(subjectLabel(r.subject))}${r.desired_grade?`<div class="subtext">Țintă: ${esc(r.desired_grade)}</div>`:''}</td>
      <td data-label="Mesaj elev"><div class="message-preview ${msg?'':'message-empty'}">${msg?esc(msg.length>170?msg.slice(0,170)+'…':msg):'Nu a lăsat mesaj.'}</div></td>
      <td data-label="Grupă">${gs.length?gs.map(g=>`<span class="badge">${esc(g.name)}</span>`).join(' '):'<span class="subtext">Nealocat</span>'}</td>
      <td data-label="Status">${statusBadge(r.status,r.archived_at)}</td>
      <td data-label="Acțiuni"><div class="actions"><button class="btn btn-soft btn-sm" data-fx-action="editStudent" data-fx-id="${esc(r.id)}">Detalii</button><button class="btn ${r.archived_at?'btn-soft':'btn-danger'} btn-sm" data-fx-action="toggleArchive" data-fx-id="${esc(r.id)}">${r.archived_at?'Restaurează':'Șterge'}</button></div></td>
    </tr>`;
  }
  h+='</tbody></table></div>';$('studentsContent').innerHTML=h;
}
function attendanceKey(enrollmentId,weekNumber){return `${enrollmentId}:${Number(weekNumber)}`}
function attendanceForVisibleStudents(){
  const ids=new Set(relevantStudents().filter(r=>!r.archived_at).map(r=>r.id));
  return new Set(attendance.filter(a=>ids.has(a.enrollment_id)).map(a=>attendanceKey(a.enrollment_id,a.week_number)));
}
function renderAttendance(){
  const target=$('attendanceContent');
  if(!target)return;
  if(!attendanceAvailable){
    target.innerHTML='<div class="attendance-error"><strong>Prezența nu este activată încă în baza de date.</strong><br>Rulează o singură dată fișierul SQL V31 inclus în pachet, apoi apasă „Reîmprospătează”. Restul portalului funcționează normal.</div>';
    return;
  }
  const arr=relevantStudents().filter(r=>!r.archived_at).sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||''),'ro'));
  if(!arr.length){target.innerHTML='<div class="attendance-empty">Nu există elevi activi pentru materia selectată.</div>';return}
  const marked=attendanceForVisibleStudents();
  let h='<div class="attendance-wrap"><table class="attendance-table"><thead><tr><th class="attendance-student">Elev</th>';
  for(let w=1;w<=ATTENDANCE_WEEK_COUNT;w++)h+=`<th class="attendance-week" title="Săptămâna ${w}">S${w}</th>`;
  h+='<th class="attendance-total">Prezențe</th></tr></thead><tbody>';
  for(const r of arr){
    let total=0;
    h+=`<tr><td class="attendance-student"><span class="attendance-name">${esc(r.full_name)}</span><span class="attendance-meta">${esc(subjectLabel(r.subject))}${r.level?' • '+esc(r.level):''}</span></td>`;
    for(let w=1;w<=ATTENDANCE_WEEK_COUNT;w++){
      const checked=marked.has(attendanceKey(r.id,w));if(checked)total++;
      h+=`<td class="attendance-week"><input class="attendance-check" type="checkbox" ${checked?'checked':''} data-fx-change="attendance" data-enrollment-id="${esc(r.id)}" data-subject="${esc(r.subject)}" data-week="${w}" aria-label="${esc(r.full_name)} — săptămâna ${w}" title="Săptămâna ${w}"></td>`;
    }
    h+=`<td class="attendance-total" data-attendance-total="${esc(r.id)}">${total}/${ATTENDANCE_WEEK_COUNT}</td></tr>`;
  }
  h+='</tbody></table></div>';
  target.innerHTML=h;
}
function refreshAttendanceTotal(enrollmentId){
  const cell=document.querySelector(`[data-attendance-total="${String(enrollmentId)}"]`);
  if(!cell)return;
  const total=attendance.filter(a=>a.enrollment_id===enrollmentId&&Number(a.week_number)>=1&&Number(a.week_number)<=ATTENDANCE_WEEK_COUNT).length;
  cell.textContent=`${total}/${ATTENDANCE_WEEK_COUNT}`;
}
async function toggleAttendance(input){
  if(!input||!attendanceAvailable)return;
  const enrollmentId=input.dataset.enrollmentId;
  const subject=input.dataset.subject;
  const weekNumber=Number(input.dataset.week);
  const checked=input.checked;
  if(!enrollmentId||!subject||!Number.isInteger(weekNumber)||weekNumber<1||weekNumber>ATTENDANCE_WEEK_COUNT){input.checked=!checked;return}
  input.disabled=true;
  try{
    if(checked){
      const payload={enrollment_id:enrollmentId,subject,week_number:weekNumber,marked_by:user.id};
      const {data,error}=await sb.from('student_attendance').insert(payload).select('id,enrollment_id,subject,week_number,marked_by,created_at').single();
      if(error)throw error;
      attendance=attendance.filter(a=>!(a.enrollment_id===enrollmentId&&Number(a.week_number)===weekNumber));
      attendance.push(data||payload);
      logActivity(subject,'attendance_marked','enrollment',enrollmentId,{week_number:weekNumber}).catch(()=>{});
    }else{
      const {error}=await sb.from('student_attendance').delete().eq('enrollment_id',enrollmentId).eq('week_number',weekNumber);
      if(error)throw error;
      attendance=attendance.filter(a=>!(a.enrollment_id===enrollmentId&&Number(a.week_number)===weekNumber));
      logActivity(subject,'attendance_unmarked','enrollment',enrollmentId,{week_number:weekNumber}).catch(()=>{});
    }
    refreshAttendanceTotal(enrollmentId);
  }catch(error){
    console.error('Formula X V32 - save attendance:',error);
    input.checked=!checked;
    portalNotice('Prezența nu a putut fi salvată. Verifică conexiunea și încearcă din nou.');
  }finally{
    input.disabled=false;
  }
}
function studentFormBody(r=null){
  const sub=staff.role==='mentor'?`<input type="hidden" id="mSubject" value="${staff.subject}"><div class="field full"><label>Materie</label><div class="readonly-box">${esc(subjectLabel(staff.subject))}</div></div>`:
  `<div class="field"><label>Materie</label><select id="mSubject" required>${Object.entries(SUBJECTS).map(([k,v])=>`<option value="${k}" ${r?.subject===k?'selected':''}>${v.label}</option>`).join('')}</select></div>`;
  return `<div class="modal-grid">
    <div class="field"><label>Nume și prenume</label><input id="mName" value="${esc(r?.full_name||'')}" required></div>
    <div class="field"><label>Email</label><input id="mEmail" type="email" value="${esc(r?.email||'')}" required></div>
    <div class="field"><label>Telefon / WhatsApp</label><input id="mPhone" value="${esc(r?.phone||'')}"></div>
    <div class="field"><label>Clasa / nivel</label><input id="mLevel" value="${esc(r?.level||'')}"></div>
    ${sub}
    <div class="field"><label>Status</label><select id="mStatus"><option value="nou" ${r?.status==='nou'?'selected':''}>Nou</option><option value="activ" ${r?.status==='activ'?'selected':''}>Activ</option><option value="inactiv" ${r?.status==='inactiv'?'selected':''}>Inactiv</option></select></div>
    <div class="field full"><label>Mesajul lăsat de elev</label>${r?`<div class="readonly-box">${esc(r.student_message||'Nu a lăsat un mesaj.')}</div>`:`<textarea id="mMessage" placeholder="Mesaj/opțiune notată manual"></textarea>`}</div>
    <div class="field full"><label>Notă internă a profesorului</label><textarea id="mTeacherNote" placeholder="Observații despre elev, progres, ce trebuie urmărit...">${esc(r?.teacher_note||'')}</textarea></div>
  </div>`;
}
function addStudent(){openModal('Adaugă elev',studentFormBody(),'<button class="btn btn-soft" data-fx-action="closeModal">Renunță</button><button class="btn btn-primary" data-fx-action="saveNewStudent">Salvează elevul</button>')}
async function saveNewStudent(){
  const subject=$('mSubject').value,name=$('mName').value.trim(),email=$('mEmail').value.trim().toLowerCase();
  if(!subject||!name||!email){alert('Completează numele, emailul și materia.');return}
  const payload={full_name:name,email,phone:$('mPhone').value.trim()||null,subject,level:$('mLevel').value.trim()||null,status:$('mStatus').value,source:'mentor',request_type:'manual',student_message:$('mMessage')?.value.trim()||null,teacher_note:$('mTeacherNote').value.trim()||null};
  const {data,error}=await sb.from('enrollments').insert(payload).select('id').single();if(error){console.error(error);alert('Elevul nu a putut fi adăugat. Contactează administratorul Formula X.');return}
  await logActivity(subject,'student_added','enrollment',data.id,{name,email});closeModal();await loadAll();
}
function editStudent(id){
  const r=students.find(x=>x.id===id);if(!r)return;
  const gs=groupsForStudent(id);
  const groupInfo=gs.length?`<div class="field full"><label>Grupe curente</label><div class="readonly-box">${gs.map(g=>esc(g.name)).join(', ')}</div></div>`:'';
  openModal('Fișa elevului',studentFormBody(r)+groupInfo,`<button class="btn btn-soft" data-fx-action="closeModal">Închide</button><button class="btn btn-primary" data-fx-action="saveStudent" data-fx-id="${esc(id)}">Salvează modificările</button>`);
}
async function saveStudent(id){
  const r=students.find(x=>x.id===id);if(!r)return;
  const payload={full_name:$('mName').value.trim(),email:$('mEmail').value.trim().toLowerCase(),phone:$('mPhone').value.trim()||null,level:$('mLevel').value.trim()||null,status:$('mStatus').value,teacher_note:$('mTeacherNote').value.trim()||null};
  const {error}=await sb.from('enrollments').update(payload).eq('id',id);if(error){console.error(error);alert('Modificările nu au putut fi salvate.');return}
  await logActivity(r.subject,'student_updated','enrollment',id,{name:payload.full_name,status:payload.status});closeModal();await loadAll();
}
async function toggleArchive(id){
  const r=students.find(x=>x.id===id);if(!r)return;
  const archived=!r.archived_at;
  if(archived&&!confirm(`Elimini elevul ${r.full_name} din lista ta? Contul Formula X, progresul, testele și accesul la site rămân neschimbate. Îl poți restaura oricând.`))return;

  const {error}=await sb.rpc('staff_set_enrollment_archived',{
    p_enrollment_id:id,
    p_archived:archived
  });

  if(error){
    console.error('Formula X V35 - staff_set_enrollment_archived:',error);
    const missingRpc=String(error.code||'')==='PGRST202'||String(error.message||'').toLowerCase().includes('staff_set_enrollment_archived');
    alert(missingRpc
      ? 'Funcția de ștergere sigură nu este activată încă în Supabase. Rulează fișierul SQL V35 din pachet și încearcă din nou.'
      : (archived?'Elevul nu a putut fi eliminat din listă.':'Elevul nu a putut fi restaurat.'));
    return;
  }

  await logActivity(r.subject,archived?'student_archived':'student_restored','enrollment',id,{name:r.full_name});
  await loadAll();
}
function renderGroups(){
  const arr=relevantGroups();
  if(!arr.length){$('groupsContent').innerHTML='<div class="empty" style="grid-column:1/-1">Nu există grupe. Creează prima grupă.</div>';return}
  $('groupsContent').innerHTML=arr.map(g=>{
    const cnt=members.filter(m=>m.group_id===g.id).length;const owner=staffList.find(s=>s.user_id===g.owner_id);
    const schedule=g.weekday?`${WEEKDAYS[g.weekday]}${g.start_time?' · '+timeShort(g.start_time):''}${g.end_time?'–'+timeShort(g.end_time):''}`:'Program flexibil';
    return `<article class="group-card"><h3>${esc(g.name)}</h3><div class="group-meta">${esc(subjectLabel(g.subject))}<br>${esc(schedule)}${staff.role==='admin'?`<br>Profesor: ${esc(owner?.display_name||'—')}`:''}</div><span class="group-count">${cnt} elev${cnt===1?'':'i'}</span>${g.notes?`<div class="group-meta" style="margin-bottom:12px">${esc(g.notes)}</div>`:''}<div class="group-actions"><button class="btn btn-soft btn-sm" data-fx-action="manageMembers" data-fx-id="${esc(g.id)}">Elevi</button><button class="btn btn-soft btn-sm" data-fx-action="editGroup" data-fx-id="${esc(g.id)}">Editează</button><button class="btn btn-danger btn-sm" data-fx-action="deleteGroup" data-fx-id="${esc(g.id)}">Șterge</button></div></article>`
  }).join('');
}
function groupFormBody(g=null){
  const sub=staff.role==='mentor'?`<input type="hidden" id="gSubject" value="${staff.subject}">`:`<div class="field"><label>Materie</label><select id="gSubject">${Object.entries(SUBJECTS).map(([k,v])=>`<option value="${k}" ${g?.subject===k?'selected':''}>${v.label}</option>`).join('')}</select></div>`;
  return `<div class="modal-grid"><div class="field"><label>Nume grupă</label><input id="gName" value="${esc(g?.name||'')}" placeholder="Ex: Grupa Luni 18:00"></div>${sub}<div class="field"><label>Zi</label><select id="gWeekday"><option value="">Fără zi fixă</option>${WEEKDAYS.slice(1).map((d,i)=>`<option value="${i+1}" ${g?.weekday===i+1?'selected':''}>${d}</option>`).join('')}</select></div><div class="field"><label>Ora început</label><input id="gStart" type="time" value="${esc(timeShort(g?.start_time))}"></div><div class="field"><label>Ora sfârșit</label><input id="gEnd" type="time" value="${esc(timeShort(g?.end_time))}"></div><div class="field full"><label>Observații</label><textarea id="gNotes">${esc(g?.notes||'')}</textarea></div></div>`;
}
function addGroup(){openModal('Creează grupă',groupFormBody(),'<button class="btn btn-soft" data-fx-action="closeModal">Renunță</button><button class="btn btn-primary" data-fx-action="saveGroup">Creează grupa</button>')}
function editGroup(id){const g=groups.find(x=>x.id===id);if(!g)return;openModal('Editează grupa',groupFormBody(g),`<button class="btn btn-soft" data-fx-action="closeModal">Renunță</button><button class="btn btn-primary" data-fx-action="saveGroup" data-fx-id="${esc(id)}">Salvează</button>`)}
async function saveGroup(id=''){
  const name=$('gName').value.trim(),subject=$('gSubject').value;if(!name||!subject){alert('Completează numele și materia.');return}
  const payload={name,subject,weekday:$('gWeekday').value?Number($('gWeekday').value):null,start_time:$('gStart').value||null,end_time:$('gEnd').value||null,notes:$('gNotes').value.trim()||null};
  let res;if(id)res=await sb.from('teacher_groups').update(payload).eq('id',id);else res=await sb.from('teacher_groups').insert({...payload,owner_id:user.id});
  if(res.error){console.error(res.error);alert('Grupa nu a putut fi salvată.');return}
  await logActivity(subject,id?'group_updated':'group_created','group',id||name,{name});closeModal();await loadAll();
}
async function deleteGroup(id){
  const g=groups.find(x=>x.id===id);if(!g||!confirm(`Ștergi grupa "${g.name}"? Elevii nu vor fi șterși.`))return;
  const {error}=await sb.from('teacher_groups').delete().eq('id',id);if(error){console.error(error);alert('Grupa nu a putut fi ștearsă.');return}
  await logActivity(g.subject,'group_deleted','group',id,{name:g.name});await loadAll();
}
function manageMembers(groupId){
  const g=groups.find(x=>x.id===groupId);if(!g)return;
  const current=new Set(members.filter(m=>m.group_id===groupId).map(m=>m.enrollment_id));
  const eligible=students.filter(s=>s.subject===g.subject&&!s.archived_at);
  const body=`<div class="member-list">${eligible.length?eligible.map(s=>`<label class="member-option"><input type="checkbox" data-member="${s.id}" ${current.has(s.id)?'checked':''}><span><strong>${esc(s.full_name)}</strong><small>${esc(s.email)} • ${esc(s.level||'nivel nespecificat')}</small></span></label>`).join(''):'<div class="empty">Nu există elevi activi la această materie.</div>'}</div>`;
  openModal(`Elevii din ${g.name}`,body,`<button class="btn btn-soft" data-fx-action="closeModal">Renunță</button><button class="btn btn-primary" data-fx-action="saveMembers" data-fx-id="${esc(groupId)}">Salvează componența</button>`);
}
async function saveMembers(groupId){
  const g=groups.find(x=>x.id===groupId);if(!g)return;
  const ids=[...document.querySelectorAll('[data-member]:checked')].map(x=>x.dataset.member);
  const del=await sb.from('group_members').delete().eq('group_id',groupId);if(del.error){console.error(del.error);alert('Nu am putut actualiza grupa.');return}
  if(ids.length){const ins=await sb.from('group_members').insert(ids.map(enrollment_id=>({group_id:groupId,enrollment_id})));if(ins.error){console.error(ins.error);alert('Nu am putut salva toți elevii în grupă.');return}}
  await logActivity(g.subject,'group_members_updated','group',groupId,{group:g.name,members:ids.length});closeModal();await loadAll();
}
function renderCalendar(){
  const year=calendarDate.getFullYear(),month=calendarDate.getMonth();
  $('calendarTitle').textContent=new Intl.DateTimeFormat('ro-RO',{month:'long',year:'numeric'}).format(calendarDate);
  const first=new Date(year,month,1),last=new Date(year,month+1,0);let start=(first.getDay()+6)%7;
  const prevLast=new Date(year,month,0).getDate(),days=last.getDate();
  let cells=[];for(let i=0;i<start;i++)cells.push({d:prevLast-start+i+1,m:month-1,muted:true});
  for(let d=1;d<=days;d++)cells.push({d,m:month,muted:false});
  while(cells.length%7)cells.push({d:cells.length-start-days+1,m:month+1,muted:true});
  const ss=relevantSessions();
  let h=['Lun','Mar','Mie','Joi','Vin','Sâm','Dum'].map(d=>`<div class="cal-weekday">${d}</div>`).join('');
  for(const c of cells){
    const dt=new Date(year,c.m,c.d),iso=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    const ev=ss.filter(s=>s.session_date===iso);
    h+=`<div class="cal-day ${c.m!==month?'muted':''}"><div class="cal-date">${c.d}</div>${ev.map(s=>`<button class="event ${s.status==='finalizata'?'done':s.status==='anulata'?'cancelled':''}" data-fx-action="sessionDetails" data-fx-id="${esc(s.id)}">${esc(timeShort(s.start_time))} ${esc(s.title)}</button>`).join('')}</div>`;
  }
  $('calendarGrid').innerHTML=h;
  const today=new Date().toISOString().slice(0,10);const upcoming=ss.filter(s=>s.session_date>=today).slice().sort((a,b)=>(a.session_date+a.start_time).localeCompare(b.session_date+b.start_time)).slice(0,12);
  $('upcomingSessions').innerHTML=upcoming.length?'<h3 style="margin:4px 0">Următoarele ședințe</h3>'+upcoming.map(s=>sessionRow(s)).join(''):'<div class="empty">Nu există ședințe viitoare.</div>';
}
function sessionTarget(s){
  if(s.group_id){const g=groups.find(x=>x.id===s.group_id);return g?`Grupă: ${g.name}`:'Grupă'}
  const st=students.find(x=>x.id===s.enrollment_id);return st?`Elev: ${st.full_name}`:'Elev'
}
function sessionRow(s){return `<div class="session-row"><div class="session-main"><strong>${esc(s.title)}</strong><small>${fmtDate(s.session_date+'T00:00:00')} · ${esc(timeShort(s.start_time))}${s.end_time?'–'+esc(timeShort(s.end_time)):''} · ${esc(sessionTarget(s))} · ${esc(subjectLabel(s.subject))}</small></div><button class="btn btn-soft btn-sm" data-fx-action="sessionDetails" data-fx-id="${esc(s.id)}">Detalii</button></div>`}
function addSession(){
  const gs=relevantGroups().filter(g=>g.active),ss=relevantStudents().filter(s=>!s.archived_at);
  const sub=staff.role==='mentor'?`<input type="hidden" id="sSubject" value="${staff.subject}">`:`<div class="field"><label>Materie</label><select id="sSubject" data-fx-change="refreshSessionTargets">${Object.entries(SUBJECTS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></div>`;
  const body=`<div class="modal-grid">${sub}<div class="field"><label>Tip programare</label><select id="sTargetType" data-fx-change="refreshSessionTargets"><option value="group">Grupă</option><option value="student">Elev individual</option></select></div><div class="field full"><label>Grupă / elev</label><select id="sTarget"></select></div><div class="field full"><label>Titlu</label><input id="sTitle" placeholder="Ex: Recapitulare Subiectul I"></div><div class="field"><label>Data</label><input id="sDate" type="date"></div><div class="field"><label>Ora început</label><input id="sStart" type="time"></div><div class="field"><label>Ora sfârșit</label><input id="sEnd" type="time"></div><div class="field"><label>Link Meet</label><input id="sUrl" type="url" placeholder="https://meet.google.com/..."></div><div class="field full"><label>Observații</label><textarea id="sNotes"></textarea></div></div>`;
  openModal('Programează ședință',body,'<button class="btn btn-soft" data-fx-action="closeModal">Renunță</button><button class="btn btn-primary" data-fx-action="saveSession">Programează</button>');refreshSessionTargets();
}
function refreshSessionTargets(){
  const subject=$('sSubject')?.value||staff.subject,type=$('sTargetType')?.value||'group',sel=$('sTarget');if(!sel)return;
  if(type==='group')sel.innerHTML=groups.filter(g=>g.subject===subject&&g.active).map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  else sel.innerHTML=students.filter(s=>s.subject===subject&&!s.archived_at).map(s=>`<option value="${s.id}">${esc(s.full_name)} — ${esc(s.email)}</option>`).join('');
}
async function saveSession(){
  const subject=$('sSubject').value,type=$('sTargetType').value,target=$('sTarget').value,title=$('sTitle').value.trim(),date=$('sDate').value,start=$('sStart').value;
  if(!subject||!target||!title||!date||!start){alert('Completează materia, ținta, titlul, data și ora.');return}
  const enteredUrl=$('sUrl').value.trim();if(enteredUrl&&!safeMeetingUrl(enteredUrl)){alert('Introdu un link HTTPS valid pentru ședință.');return;}
  const payload={owner_id:user.id,subject,title,session_date:date,start_time:start,end_time:$('sEnd').value||null,meeting_url:$('sUrl').value.trim()||null,notes:$('sNotes').value.trim()||null,group_id:type==='group'?target:null,enrollment_id:type==='student'?target:null};
  const {data,error}=await sb.from('teacher_sessions').insert(payload).select('id').single();if(error){console.error(error);alert('Ședința nu a putut fi programată.');return}
  await logActivity(subject,'session_created','session',data.id,{title,date,start,target_type:type});closeModal();await loadAll();setTab('calendar');
}
function sessionDetails(id){
  const s=sessions.find(x=>x.id===id);if(!s)return;
  const meeting=safeMeetingUrl(s.meeting_url);
  const body=`<div class="modal-grid"><div class="field full"><label>Titlu</label><div class="readonly-box">${esc(s.title)}</div></div><div class="field"><label>Data</label><div class="readonly-box">${fmtDate(s.session_date+'T00:00:00')}</div></div><div class="field"><label>Ora</label><div class="readonly-box">${esc(timeShort(s.start_time))}${s.end_time?'–'+esc(timeShort(s.end_time)):''}</div></div><div class="field full"><label>Pentru</label><div class="readonly-box">${esc(sessionTarget(s))}</div></div>${meeting?`<div class="field full"><label>Meet</label><div class="readonly-box"><a href="${esc(meeting)}" target="_blank" rel="noopener">${esc(s.meeting_url)}</a></div></div>`:''}${s.notes?`<div class="field full"><label>Observații</label><div class="readonly-box">${esc(s.notes)}</div></div>`:''}</div>`;
  const foot=`<button class="btn btn-danger" data-fx-action="deleteSession" data-fx-id="${esc(id)}">Șterge</button>${s.status!=='finalizata'?`<button class="btn btn-soft" data-fx-action="setSessionStatus" data-fx-id="${esc(id)}" data-fx-status="finalizata">Marchează finalizată</button>`:''}${s.status!=='anulata'?`<button class="btn btn-soft" data-fx-action="setSessionStatus" data-fx-id="${esc(id)}" data-fx-status="anulata">Anulează</button>`:''}<button class="btn btn-soft" data-fx-action="closeModal">Închide</button>`;
  openModal('Detalii ședință',body,foot);
}
async function setSessionStatus(id,status){const s=sessions.find(x=>x.id===id);if(!s)return;const {error}=await sb.from('teacher_sessions').update({status}).eq('id',id);if(error){console.error(error);alert('Statusul nu a putut fi schimbat.');return}await logActivity(s.subject,'session_status','session',id,{title:s.title,status});closeModal();await loadAll()}
async function deleteSession(id){const s=sessions.find(x=>x.id===id);if(!s||!confirm('Ștergi această ședință din calendar?'))return;const {error}=await sb.from('teacher_sessions').delete().eq('id',id);if(error){console.error(error);alert('Ședința nu a putut fi ștearsă.');return}await logActivity(s.subject,'session_deleted','session',id,{title:s.title});closeModal();await loadAll()}
function renderActivity(){
  if(staff?.role!=='admin'){return}
  const arr=activities.filter(a=>visibleSubject(a.subject));
  if(!arr.length){$('activityContent').innerHTML='<div class="empty">Nu există activitate pentru filtrul selectat.</div>';return}
  const labels={student_added:'Elev adăugat',student_updated:'Elev actualizat',student_archived:'Elev eliminat din listă',student_restored:'Elev restaurat',group_created:'Grupă creată',group_updated:'Grupă actualizată',group_deleted:'Grupă ștearsă',group_members_updated:'Componență grupă schimbată',session_created:'Ședință programată',session_status:'Status ședință schimbat',session_deleted:'Ședință ștearsă'};
  $('activityContent').innerHTML=arr.map(a=>{const actor=staffList.find(s=>s.user_id===a.actor_id);return `<div class="activity"><small>${fmtDateTime(a.created_at)}</small><div><strong>${esc(labels[a.action]||a.action)}</strong><div class="subtext">${esc(actor?.display_name||'Profesor')} · ${esc(subjectLabel(a.subject))}</div>${a.details&&Object.keys(a.details).length?`<div class="subtext">${esc(JSON.stringify(a.details))}</div>`:''}</div><code>${esc(a.entity_type)}</code></div>`}).join('');
}
$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  $('loginMsg').textContent='';
  $('loginBtn').disabled=true;
  $('loginBtn').textContent='Se verifică...';

  const email=$('email').value.trim().toLowerCase();
  const password=$('password').value;

  const {data,error}=await sb.auth.signInWithPassword({email,password});

  if(error){
    console.error('Formula X V32 - login:',error);
    const code=error.code||error.name||'auth_error';
    showLogin('Conectarea Supabase a eșuat: '+code+'. Verifică emailul și parola.');
    return;
  }

  if(!data?.session){
    showLogin('Supabase nu a creat sesiunea de autentificare.');
    return;
  }

  const ok=await openPortal();

  if(!ok){
    // Nu ascundem mesajul diagnostic afișat de openPortal.
    await sb.auth.signOut();
    return;
  }
})
$('forgotBtn').addEventListener('click',async()=>{const email=$('email').value.trim();if(!email){location.assign('/parola-uitata/');return}$('loginMsg').textContent='Trimitem linkul...';const {error}=await resetSb.auth.resetPasswordForEmail(email,{redirectTo:'https://formula-x.ro/parola-uitata/'});if(error){$('loginMsg').textContent='Nu am putut trimite linkul.';return}location.assign('/parola-uitata/?trimis=1&email='+encodeURIComponent(email))})
async function logoutProfessor(){
  const btn=$('logoutBtn');
  if(btn){btn.disabled=true;btn.textContent='Se deconectează…'}
  const {error}=await sb.auth.signOut();
  if(error){
    console.error('Formula X V32 - logout:',error);
    if(btn){btn.disabled=false;btn.textContent='↪ Ieși din cont'}
    portalNotice('Nu am putut închide sesiunea. Încearcă din nou.');
    return;
  }
  staff=null;user=null;students=[];groups=[];members=[];sessions=[];activities=[];staffList=[];pageViews=[];attendance=[];attendanceAvailable=true;contactMessages=[];closeModal();
  for(const id of ['studentsContent','attendanceContent','groupsContent','upcomingSessions','activityContent','contactMessages']){if($(id))$(id).textContent='';}
  $('password').value='';
  showLogin('Te-ai deconectat cu succes.');
  try{history.replaceState(null,'',location.pathname)}catch(e){}
}
$('logoutBtn').addEventListener('click',logoutProfessor);
$('backSiteBtn').addEventListener('click',goToPublicSite);
$('loginBackSiteBtn').addEventListener('click',goToPublicSite);
$('refreshBtn').addEventListener('click',loadAll);
$('viewsRange')?.addEventListener('change',renderViews);
$('refreshViewsBtn')?.addEventListener('click',async()=>{await loadPageViews();renderViews()});$('closeModal').addEventListener('click',closeModal);$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()})
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)))
$('studentSearch').addEventListener('input',renderStudents);$('studentStatus').addEventListener('change',renderStudents);$('studentType').addEventListener('change',renderStudents);$('showArchived').addEventListener('change',renderStudents)
$('adminSubject').addEventListener('change',renderAll);$('addStudentBtn').addEventListener('click',addStudent);$('addGroupBtn').addEventListener('click',addGroup);$('addSessionBtn').addEventListener('click',addSession)
$('prevMonth').addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderCalendar()});$('nextMonth').addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderCalendar()});$('todayMonth').addEventListener('click',()=>{calendarDate=new Date();renderCalendar()})
;(async()=>{
  showBoot();
  try{
    const {data:{session},error}=await sb.auth.getSession();
    if(error) throw error;
    if(!session){
      showLogin();
      return;
    }
    const ok=await openPortal();
    if(!ok){
      await sb.auth.signOut();
      showLogin('Contul nu are acces la portalul profesorilor.');
    }
  }catch(error){
    console.error('Formula X V35 - bootstrap:',error);
    showLogin('Nu am putut verifica sesiunea. Reîncarcă pagina și încearcă din nou.');
  }
})();

const fxPortalActions={closeModal,deleteGroup,deleteSession,editGroup,editStudent,manageMembers,refreshSessionTargets,saveGroup,saveMembers,saveNewStudent,saveSession,saveStudent,sessionDetails,setSessionStatus,toggleArchive};
document.addEventListener("click",event=>{const b=event.target.closest("[data-fx-action]");if(!b)return;if(!Object.hasOwn(fxPortalActions,b.dataset.fxAction))return;const fn=fxPortalActions[b.dataset.fxAction];if(typeof fn!=="function")return;event.preventDefault();fn(b.dataset.fxId||undefined,b.dataset.fxStatus||undefined);});
document.addEventListener("change",event=>{if(event.target.matches("[data-fx-change=refreshSessionTargets]"))refreshSessionTargets();if(event.target.matches("[data-fx-change=attendance]"))toggleAttendance(event.target);});


async function loadContactMessages(){
  contactMessages=[];if(staff?.role!=='admin')return;
  const {data,error}=await sb.from('fx_contact_messages').select('id,full_name,email,message,created_at,archived_at').is('archived_at',null).order('created_at',{ascending:false}).limit(200);
  if(error){portalNotice('Mesajele de contact nu au putut fi încărcate.');return;}contactMessages=data||[];
  const status=await sb.rpc('fx30_security_status');
  if(!status.error&&status.data){const s=status.data;$('securityStatus').textContent=(s.forms_enabled?'Formulare active. ':'Formulare suspendate. ')+s.pending_notifications+' notificări în așteptare.';}
}
function renderContactMessages(){
  if(staff?.role!=='admin'){if($('contactMessages'))$('contactMessages').textContent='';return;}
  $('contactMessages').innerHTML=contactMessages.length?contactMessages.map(m=>`<article class="activity"><small>${fmtDateTime(m.created_at)}</small><div><strong>${esc(m.full_name)}</strong><div>${esc(m.email)}</div><p style="white-space:pre-wrap">${esc(m.message)}</p></div></article>`).join(''):'<div class="empty">Nu există mesaje de contact.</div>';
}
