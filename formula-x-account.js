(function () {
  'use strict';

  const SUPABASE_URL = 'https://vooflhvdoutjplfbnahl.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iuJBis3q_83zNlYFER2AXQ_o8gzpDPA';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('Formula X: biblioteca Supabase nu s-a încărcat.');
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  });

  const state = {
    user: null,
    profile: null,
    goal: { weekly_target: 3 },
    progress: new Map(),
    attempts: [],
    recoveryMode: false
  };

  const MATTER_LABELS = {
    romana: 'Română', mate: 'Matematică', istorie: 'Istorie', bio: 'Biologie', chimie: 'Chimie',
    fizica: 'Fizică', informatica: 'Informatică', geografie: 'Geografie', logica: 'Logică',
    psihologie: 'Psihologie', sociologie: 'Sociologie', economie: 'Economie', filosofie: 'Filosofie'
  };

  const OPTIONAL_LABELS = {
    'bio-anatomie': 'Biologie — Anatomie', 'bio-vegetala': 'Biologie — vegetală',
    'chimie-organica': 'Chimie organică', 'chimie-anorganica': 'Chimie anorganică',
    fizica: 'Fizică', informatica: 'Informatică', geografie: 'Geografie', logica: 'Logică',
    psihologie: 'Psihologie', sociologie: 'Sociologie', economie: 'Economie', filosofie: 'Filosofie'
  };

  const SPECIALIZATIONS = {
    real: [
      ['mate-info', 'Matematică-Informatică'],
      ['stiinte-naturii', 'Științele Naturii']
    ],
    uman: [
      ['filologie', 'Filologie'],
      ['stiinte-sociale', 'Științe Sociale']
    ],
    tehnologic: [
      ['tehnologic', 'Profil tehnologic']
    ],
    pedagogic: [
      ['pedagogic', 'Profil pedagogic']
    ]
  };

  function $(id) { return document.getElementById(id); }
  function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function testText(test) {
    return normalizeText([test.materie, test.materieLabel, test.titlu, test.detalii, test.proba, test.sesiune].join(' '));
  }
  function allTests() {
    try { return Array.isArray(TESTE_ANTRENAMENT) ? TESTE_ANTRENAMENT : []; }
    catch (_) { return []; }
  }

  // Filtrul public din arhivă: păstrează probele E.d comune și restrânge probele cu profil explicit.
  window.FormulaXProfileFilter = function (test, profile) {
    if (!profile || profile === 'toate') return true;
    const txt = testText(test);
    const mat = String(test.materie || '');
    if (mat === 'romana') {
      if (profile === 'real' || profile === 'tehnologic') return txt.includes('real') || txt.includes('tehnologic');
      if (profile === 'uman' || profile === 'pedagogic') return txt.includes('uman') || txt.includes('pedagogic');
    }
    if (mat === 'mate') {
      if (profile === 'real') return txt.includes('mate-info') || txt.includes('mate info') || txt.includes('stiinte');
      if (profile === 'tehnologic') return txt.includes('tehnologic');
      if (profile === 'pedagogic') return txt.includes('pedagogic');
      if (profile === 'uman') return false;
    }
    if (mat === 'istorie') return profile === 'uman' || profile === 'pedagogic';
    return true;
  };

  function relevantRomanian(test, profile) {
    const txt = testText(test);
    if (profile.profile === 'real' || profile.profile === 'tehnologic') return txt.includes('real') || txt.includes('tehnologic');
    return txt.includes('uman') || txt.includes('pedagogic');
  }

  function relevantMath(test, profile) {
    const txt = testText(test);
    if (profile.profile === 'real' && profile.specialization === 'mate-info') return txt.includes('mate-info') || txt.includes('mate info');
    if (profile.profile === 'real' && profile.specialization === 'stiinte-naturii') return txt.includes('stiinte') || txt.includes('st-nat') || txt.includes('st nat');
    if (profile.profile === 'tehnologic') return txt.includes('tehnologic');
    if (profile.profile === 'pedagogic') return txt.includes('pedagogic');
    return false;
  }

  function relevantOptional(test, optional, profile) {
    const txt = testText(test);
    if (optional === 'bio-anatomie') return test.materie === 'bio' && (txt.includes('anatomie') || txt.includes('fiziologie umana'));
    if (optional === 'bio-vegetala') return test.materie === 'bio' && (txt.includes('vegetal') || txt.includes('animala'));
    if (optional === 'chimie-organica') return test.materie === 'chimie' && txt.includes('organica');
    if (optional === 'chimie-anorganica') return test.materie === 'chimie' && (txt.includes('anorganica') || txt.includes('anorganic'));
    if (optional === 'informatica') {
      if (test.materie !== 'informatica') return false;
      if (profile.specialization === 'mate-info') return !txt.includes('stiinte') && !txt.includes('sn ') && !txt.includes('sn-');
      if (profile.specialization === 'stiinte-naturii') return txt.includes('stiinte') || txt.includes('sn ') || txt.includes('sn-');
      return true;
    }
    return test.materie === optional;
  }

  function personalizedTests() {
    const profile = state.profile;
    if (!profile || !profile.profile) return [];
    const optional = profile.optional_subject;
    return allTests().filter(test => {
      if (!test || !test.id || !test.subiect || !test.barem) return false;
      if (test.materie === 'romana') return relevantRomanian(test, profile);
      if (profile.profile === 'uman' && test.materie === 'istorie') return true;
      if (test.materie === 'mate' && relevantMath(test, profile)) return true;
      if (optional && relevantOptional(test, optional, profile)) return true;
      return false;
    });
  }

  function setMessage(el, message, type) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('error', 'success');
    if (type) el.classList.add(type);
  }

  function formatGrade(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '—';
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ro-RO', { day:'2-digit', month:'short', year:'numeric' }).format(d);
  }

  function profileLabel(profile) {
    if (!profile) return '';
    const main = { real:'Real', uman:'Uman', tehnologic:'Tehnologic', pedagogic:'Pedagogic' }[profile.profile] || profile.profile || '';
    const specPair = (SPECIALIZATIONS[profile.profile] || []).find(x => x[0] === profile.specialization);
    const spec = specPair ? specPair[1] : profile.specialization || '';
    const optional = OPTIONAL_LABELS[profile.optional_subject] || profile.optional_subject || '';
    return [main, spec, optional, profile.bac_year ? `BAC ${profile.bac_year}` : ''].filter(Boolean).join(' • ');
  }

  async function loadUserData() {
    if (!state.user) return;
    const uid = state.user.id;
    const [profileRes, progressRes, attemptsRes, goalRes] = await Promise.all([
      db.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
      db.from('test_progress').select('*').eq('user_id', uid),
      db.from('test_attempts').select('*').eq('user_id', uid).order('completed_at', { ascending: true }),
      db.from('goals').select('*').eq('user_id', uid).maybeSingle()
    ]);

    if (profileRes.error) console.error(profileRes.error);
    if (progressRes.error) console.error(progressRes.error);
    if (attemptsRes.error) console.error(attemptsRes.error);
    if (goalRes.error) console.error(goalRes.error);

    state.profile = profileRes.data || null;
    state.progress = new Map((progressRes.data || []).map(r => [r.test_id, r]));
    state.attempts = attemptsRes.data || [];
    state.goal = goalRes.data || { user_id: uid, weekly_target: 3 };
  }

  function profileComplete() {
    return Boolean(state.profile && state.profile.name && state.profile.profile && state.profile.specialization && state.profile.optional_subject);
  }

  function populateSpecializations(selected) {
    const profileType = $('fx-profile-type')?.value || '';
    const select = $('fx-profile-specialization');
    if (!select) return;
    const values = SPECIALIZATIONS[profileType] || [];
    select.innerHTML = values.length
      ? values.map(([value,label]) => `<option value="${value}">${label}</option>`).join('')
      : '<option value="" disabled selected>Alege mai întâi profilul</option>';
    if (selected && values.some(x => x[0] === selected)) select.value = selected;
  }

  function openOnboarding(force) {
    if (!state.user) return;
    if (!force && profileComplete()) return;
    const modal = $('fx-onboarding');
    if (!modal) return;
    $('fx-profile-name').value = state.profile?.name || state.user.user_metadata?.name || '';
    $('fx-profile-bac-year').value = String(state.profile?.bac_year || 2027);
    $('fx-profile-type').value = state.profile?.profile || '';
    populateSpecializations(state.profile?.specialization || '');
    if (state.profile?.optional_subject) $('fx-profile-optional').value = state.profile.optional_subject;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeOnboarding() {
    const modal = $('fx-onboarding');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function renderAuthState() {
    const auth = $('fx-auth-section');
    const dash = $('fx-dashboard');
    const chip = $('fx-account-user-chip');
    if (!state.user) {
      if (auth) auth.hidden = false;
      if (dash) dash.hidden = true;
      if (chip) chip.hidden = true;
      return;
    }
    if (auth) auth.hidden = true;
    if (dash) dash.hidden = false;
    if (chip) {
      chip.hidden = false;
      chip.textContent = state.profile?.name || state.user.email || 'Cont Formula X';
    }
    renderDashboard();
    if (!profileComplete()) openOnboarding(false);
  }

  function completedRelevantSet(relevant) {
    const ids = new Set(relevant.map(t => t.id));
    return new Set([...state.progress.values()].filter(r => r.completed && ids.has(r.test_id)).map(r => r.test_id));
  }

  function mondayStart(date) {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d;
  }

  function calculateStreak() {
    const days = new Set(state.attempts.map(a => {
      const d = new Date(a.completed_at); return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }).filter(Boolean));
    if (!days.size) return 0;
    let d = new Date(); d.setHours(0,0,0,0);
    const key = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    if (!days.has(key(d))) { d.setDate(d.getDate()-1); if (!days.has(key(d))) return 0; }
    let streak=0;
    while (days.has(key(d))) { streak++; d.setDate(d.getDate()-1); }
    return streak;
  }

  function renderChart(attempts) {
    const el = $('fx-progress-chart');
    if (!el) return;
    const last = attempts.slice(-12);
    if (!last.length) {
      el.innerHTML = '<div class="fx-empty">După ce salvezi prima notă, aici apare evoluția ta.</div>';
      $('fx-chart-trend').textContent = 'Începe primul test';
      return;
    }
    const width=720, height=250, padL=44, padR=18, padT=18, padB=38;
    const plotW=width-padL-padR, plotH=height-padT-padB;
    const x = i => last.length===1 ? padL+plotW/2 : padL + i*(plotW/(last.length-1));
    const y = g => padT + (10-Number(g))*(plotH/9);
    const pts=last.map((a,i)=>[x(i),y(a.grade),Number(a.grade)]);
    const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    const grid=[2,4,6,8,10].map(g=>`<g><line x1="${padL}" x2="${width-padR}" y1="${y(g)}" y2="${y(g)}" stroke="#e6ebf0"/><text x="${padL-10}" y="${y(g)+4}" text-anchor="end" font-size="11" fill="#8390a0">${g}</text></g>`).join('');
    const circles=pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#173d67"><title>${formatGrade(p[2])} • ${formatDate(last[i].completed_at)}</title></circle>`).join('');
    const labels=last.map((a,i)=>`<text x="${x(i)}" y="${height-12}" text-anchor="middle" font-size="9" fill="#8a95a3">${i+1}</text>`).join('');
    el.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evoluția ultimelor ${last.length} note">${grid}<path d="${path}" fill="none" stroke="#d69b18" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${circles}${labels}</svg>`;
    const first=Number(last[0].grade), latest=Number(last[last.length-1].grade);
    const diff=latest-first;
    $('fx-chart-trend').textContent = last.length < 2 ? `Prima notă: ${formatGrade(latest)}` : (diff > .01 ? `↗ +${diff.toFixed(2).replace('.',',')}` : diff < -.01 ? `↘ ${diff.toFixed(2).replace('.',',')}` : '→ Stabil');
  }

  function renderDashboard() {
    if (!state.user) return;
    const relevant = personalizedTests();
    const completed = completedRelevantSet(relevant);
    const total = relevant.length;
    const done = completed.size;
    const remaining = Math.max(0,total-done);
    const percentage = total ? Math.round(done*100/total) : 0;
    const grades = state.attempts.map(a=>Number(a.grade)).filter(Number.isFinite);
    const avg = grades.length ? grades.reduce((a,b)=>a+b,0)/grades.length : null;
    const streak = calculateStreak();

    $('fx-dashboard-greeting').textContent = `Bun venit${state.profile?.name ? ', '+state.profile.name.split(/\s+/)[0] : ''}!`;
    $('fx-dashboard-profile').textContent = profileComplete() ? profileLabel(state.profile) : 'Completează profilul pentru un traseu personalizat.';
    $('fx-stat-completed').textContent = String(done);
    $('fx-stat-total').textContent = `din ${total}`;
    $('fx-stat-remaining').textContent = String(remaining);
    $('fx-stat-average').textContent = avg == null ? '—' : formatGrade(avg);
    $('fx-stat-percent').textContent = `${percentage}%`;
    $('fx-stat-streak').textContent = `🔥 ${streak} ${streak===1?'zi':'zile'}`;

    renderChart(state.attempts);

    const start=mondayStart(new Date());
    const weeklyDone = state.attempts.filter(a => new Date(a.completed_at) >= start).length;
    const target = Number(state.goal?.weekly_target || 3);
    $('fx-goal-progress').textContent = `${weeklyDone} / ${target}`;
    $('fx-goal-bar').style.width = `${Math.min(100, Math.round(weeklyDone*100/target))}%`;
    $('fx-weekly-target').value = String(target);

    const matterGroups = new Map();
    relevant.forEach(t => {
      const key=t.materie;
      if(!matterGroups.has(key)) matterGroups.set(key,[]);
      matterGroups.get(key).push(t);
    });
    const subj=$('fx-subject-progress');
    if (subj) {
      subj.innerHTML = matterGroups.size ? [...matterGroups.entries()].map(([key,tests])=>{
        const d=tests.filter(t=>completed.has(t.id)).length;
        const pct=tests.length?Math.round(d*100/tests.length):0;
        return `<div class="fx-subject-row"><div class="fx-subject-name">${MATTER_LABELS[key]||key}</div><div class="fx-subject-bar"><span style="width:${pct}%"></span></div><div class="fx-subject-count">${d} / ${tests.length}</div></div>`;
      }).join('') : '<div class="fx-empty">Completează profilul pentru a vedea traseul pe materii.</div>';
    }

    const recent=$('fx-recent-attempts');
    if (recent) {
      const rows=state.attempts.slice().sort((a,b)=>new Date(b.completed_at)-new Date(a.completed_at)).slice(0,8);
      recent.innerHTML=rows.length?rows.map(a=>{
        const test=allTests().find(t=>t.id===a.test_id);
        const title=test?`${test.materieLabel||MATTER_LABELS[test.materie]||''} • ${test.titlu||test.id}`:a.test_id;
        return `<div class="fx-attempt-row"><strong>${escapeHtml(title)}</strong><span>${formatDate(a.completed_at)}</span><span class="fx-attempt-grade">${formatGrade(a.grade)}</span></div>`;
      }).join(''):'<div class="fx-empty">Nu ai încă încercări salvate.</div>';
    }
  }

  function escapeHtml(v) { return String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function enhanceTestRows() {
    const library=$('tests-library');
    if(!library) return;
    library.querySelectorAll('.simple-test-row[data-test-id]').forEach(row=>{
      if(row.dataset.fxEnhanced==='1') return;
      row.dataset.fxEnhanced='1';
      const id=row.dataset.testId;
      const box=document.createElement('div');
      box.className='fx-test-progress';
      box.dataset.progressFor=id;
      row.appendChild(box);
      renderTestProgressBox(box,id);
    });
  }

  function renderTestProgressBox(box,id) {
    if(!box) return;
    if(!state.user) {
      box.innerHTML='<span class="fx-test-progress-status">Vrei să ții minte testele făcute?</span><button type="button" class="fx-login-test-btn">SALVEAZĂ PROGRESUL</button><span class="fx-test-note">Cont gratuit Formula X</span>';
      box.querySelector('button').addEventListener('click',()=>{ if(typeof schimbaPagina==='function') schimbaPagina('cont'); });
      return;
    }
    const p=state.progress.get(id);
    const status=p?.completed ? `<span class="fx-test-progress-status done">✓ Rezolvat${p.last_grade!=null?' • ultima notă '+formatGrade(p.last_grade):''}</span>` : '<span class="fx-test-progress-status">Marchează testul ca rezolvat și salvează nota.</span>';
    box.innerHTML=`${status}<input class="fx-grade-input" type="number" min="1" max="10" step="0.01" inputmode="decimal" aria-label="Nota pentru test" placeholder="Nota" value="${p?.last_grade!=null?Number(p.last_grade).toFixed(2):''}"><button type="button" class="fx-save-test-btn">SALVEAZĂ</button><span class="fx-test-note">1,00–10,00</span>`;
    const btn=box.querySelector('.fx-save-test-btn');
    btn.addEventListener('click',()=>saveTestGrade(id,box));
  }

  async function saveTestGrade(id,box) {
    if(!state.user) return;
    const input=box.querySelector('.fx-grade-input');
    const grade=Number(String(input.value).replace(',','.'));
    if(!Number.isFinite(grade)||grade<1||grade>10){ input.focus(); input.setCustomValidity('Introdu o notă între 1 și 10.'); input.reportValidity(); input.setCustomValidity(''); return; }
    const btn=box.querySelector('.fx-save-test-btn'); btn.disabled=true; btn.textContent='SE SALVEAZĂ...';
    const now=new Date().toISOString();
    const attempt=await db.from('test_attempts').insert({user_id:state.user.id,test_id:id,grade,completed_at:now}).select().single();
    if(attempt.error){ console.error(attempt.error); btn.disabled=false;btn.textContent='SALVEAZĂ'; alert('Nu am putut salva nota. Verifică conexiunea și încearcă din nou.'); return; }
    const old=state.progress.get(id);
    const best=Math.max(grade, Number(old?.best_grade||0));
    const prog=await db.from('test_progress').upsert({user_id:state.user.id,test_id:id,completed:true,last_grade:grade,best_grade:best,completed_at:old?.completed_at||now,updated_at:now},{onConflict:'user_id,test_id'}).select().single();
    if(prog.error){ console.error(prog.error); }
    state.attempts.push(attempt.data);
    if(prog.data) state.progress.set(id,prog.data);
    renderTestProgressBox(box,id);
    renderDashboard();
  }

  function refreshAllTestProgressBoxes() {
    document.querySelectorAll('.fx-test-progress[data-progress-for]').forEach(box=>renderTestProgressBox(box,box.dataset.progressFor));
  }

  async function saveProfile(event) {
    event.preventDefault();
    if(!state.user) return;
    const payload={
      user_id:state.user.id,
      name:$('fx-profile-name').value.trim(),
      bac_year:Number($('fx-profile-bac-year').value),
      profile:$('fx-profile-type').value,
      specialization:$('fx-profile-specialization').value,
      optional_subject:$('fx-profile-optional').value,
      updated_at:new Date().toISOString()
    };
    if(!payload.name||!payload.profile||!payload.specialization||!payload.optional_subject){ setMessage($('fx-profile-message'),'Completează toate câmpurile.','error'); return; }
    const res=await db.from('profiles').upsert(payload,{onConflict:'user_id'}).select().single();
    if(res.error){ console.error(res.error); setMessage($('fx-profile-message'),'Nu am putut salva profilul. Încearcă din nou.','error'); return; }
    state.profile=res.data;
    setMessage($('fx-profile-message'),'Profil salvat.','success');
    closeOnboarding(); renderAuthState(); refreshAllTestProgressBoxes();
  }

  async function saveGoal() {
    if(!state.user) return;
    const weekly_target=Number($('fx-weekly-target').value);
    const res=await db.from('goals').upsert({user_id:state.user.id,weekly_target,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();
    if(res.error){ console.error(res.error); alert('Nu am putut salva obiectivul.'); return; }
    state.goal=res.data; renderDashboard();
  }

  async function signIn(event) {
    event.preventDefault();
    setMessage($('fx-auth-message'),'Se verifică datele...');
    const {error}=await db.auth.signInWithPassword({email:$('fx-login-email').value.trim(),password:$('fx-login-password').value});
    if(error){ setMessage($('fx-auth-message'), error.message==='Invalid login credentials'?'Email sau parolă incorectă.':error.message,'error'); return; }
    setMessage($('fx-auth-message'),'Autentificare reușită.','success');
  }

  async function signUp(event) {
    event.preventDefault();
    const name=$('fx-signup-name').value.trim();
    const email=$('fx-signup-email').value.trim();
    const password=$('fx-signup-password').value;
    setMessage($('fx-auth-message'),'Creăm contul...');
    const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:'https://formula-x.ro/#cont',data:{name}}});
    if(error){ setMessage($('fx-auth-message'),error.message,'error'); return; }
    if(data.session){ setMessage($('fx-auth-message'),'Cont creat și autentificat.','success'); }
    else setMessage($('fx-auth-message'),'Cont creat. Verifică emailul și apasă linkul de confirmare.','success');
  }

  async function forgotPassword() {
    const email=$('fx-login-email').value.trim();
    if(!email){ setMessage($('fx-auth-message'),'Scrie mai întâi adresa de email.','error'); $('fx-login-email').focus(); return; }
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:'https://formula-x.ro/#cont'});
    setMessage($('fx-auth-message'),error?error.message:'Ți-am trimis un email pentru resetarea parolei.',error?'error':'success');
  }

  async function updatePassword(event) {
    event.preventDefault();
    const password=$('fx-new-password').value;
    const {error}=await db.auth.updateUser({password});
    if(error){ setMessage($('fx-auth-message'),error.message,'error'); return; }
    state.recoveryMode=false;
    $('fx-reset-password-form').hidden=true;
    setMessage($('fx-auth-message'),'Parola a fost schimbată.','success');
  }

  function switchAuthTab(tab) {
    document.querySelectorAll('.fx-auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.authTab===tab));
    $('fx-login-form').hidden=tab!=='login'; $('fx-signup-form').hidden=tab!=='signup'; $('fx-reset-password-form').hidden=true;
    setMessage($('fx-auth-message'),'');
  }

  async function bootstrapSession() {
    const {data,error}=await db.auth.getSession();
    if(error) console.error(error);
    state.user=data.session?.user||null;
    if(state.user) await loadUserData();
    renderAuthState(); refreshAllTestProgressBoxes();
  }

  function setupEvents() {
    document.querySelectorAll('.fx-auth-tab').forEach(btn=>btn.addEventListener('click',()=>switchAuthTab(btn.dataset.authTab)));
    $('fx-login-form')?.addEventListener('submit',signIn);
    $('fx-signup-form')?.addEventListener('submit',signUp);
    $('fx-reset-password-form')?.addEventListener('submit',updatePassword);
    $('fx-forgot-password')?.addEventListener('click',forgotPassword);
    $('fx-profile-type')?.addEventListener('change',()=>populateSpecializations(''));
    $('fx-profile-form')?.addEventListener('submit',saveProfile);
    $('fx-close-onboarding')?.addEventListener('click',closeOnboarding);
    $('fx-edit-profile')?.addEventListener('click',()=>openOnboarding(true));
    $('fx-logout')?.addEventListener('click',()=>db.auth.signOut());
    $('fx-save-goal')?.addEventListener('click',saveGoal);
    $('fx-go-tests')?.addEventListener('click',()=>{ if(typeof schimbaPagina==='function') schimbaPagina('teste'); });
    $('tests-profile-filter')?.addEventListener('change',()=>{ if(typeof randareTesteAntrenament==='function') randareTesteAntrenament(); });

    const library=$('tests-library');
    if(library){
      const observer=new MutationObserver(()=>enhanceTestRows());
      observer.observe(library,{childList:true,subtree:true});
      enhanceTestRows();
    }
  }

  db.auth.onAuthStateChange((event,session)=>{
    setTimeout(async ()=>{
      if(event==='PASSWORD_RECOVERY'){
        state.recoveryMode=true;
        if(typeof schimbaPagina==='function') schimbaPagina('cont');
        if ($('fx-login-form')) $('fx-login-form').hidden=true;
        if ($('fx-signup-form')) $('fx-signup-form').hidden=true;
        if ($('fx-reset-password-form')) $('fx-reset-password-form').hidden=false;
        return;
      }
      state.user=session?.user||null;
      if(state.user) await loadUserData(); else { state.profile=null;state.progress=new Map();state.attempts=[];state.goal={weekly_target:3}; }
      renderAuthState(); refreshAllTestProgressBoxes();
    },0);
  });

  // Initializează după ce pagina este disponibilă.
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{ setupEvents(); bootstrapSession(); });
  } else {
    setupEvents(); bootstrapSession();
  }
})();
