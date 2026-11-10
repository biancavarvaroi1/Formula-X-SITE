(() => {
  'use strict';
  const URL_BASE = 'https://formula-x.ro/grup/?token=';
  const URL_API = 'https://vooflhvdoutjplfbnahl.supabase.co';
  const KEY = 'sb_publishable_iuJBis3q_83zNlYFER2AXQ_o8gzpDPA';
  const db = window.FormulaXAuthClient || window.supabase?.createClient(URL_API, KEY, {
    auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce'}
  });
  if (!db) return;
  const $ = id => document.getElementById(id);
  let groups = [];
  let busy = false;
  const message = (msg, error) => {
    if (!$('fx-invite-msg')) return;
    $('fx-invite-msg').textContent = msg;
    $('fx-invite-msg').style.color = error ? '#a52b44' : '#19763b';
  };
  const selected = () => groups.find(g => g.id === $('fx-invite-group')?.value);
  function render() {
    const select = $('fx-invite-group');
    if (!select) return;
    const previous = select.value;
    select.replaceChildren();
    for (const g of groups) {
      const option = document.createElement('option');
      option.value = g.id;
      option.textContent = g.name + ' · ' + g.subject;
      select.append(option);
    }
    if (groups.some(g => g.id === previous)) select.value = previous;
    const g = selected();
    $('fx-invite-url').value = g && g.join_token ? URL_BASE + encodeURIComponent(g.join_token) : '';
    $('fx-invite-copy').disabled = !g || !g.active || !g.join_enabled || !g.join_token;
    $('fx-invite-toggle').disabled = !g;
    $('fx-invite-renew').disabled = !g;
    $('fx-invite-toggle').textContent = g?.join_enabled ? 'Oprește linkul' : 'Activează linkul';
    $('fx-invite-state').textContent = !g ? 'Nu există grupe.' : !g.active ? 'Grupa este inactivă.' : g.join_enabled ? 'Link activ – elevii cu cont intră automat.' : 'Link dezactivat.';
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    $('fx-invite-refresh').disabled = true;
    try {
      const result = await db.from('teacher_groups')
        .select('id,name,subject,join_token,join_enabled,active').order('name');
      if (result.error) throw result.error;
      groups = result.data || [];
      render();
      message(groups.length ? '' : 'Creează o grupă înainte de a genera invitații.', false);
    } catch (err) {
      console.error('Formula X group invitation:', err);
      message('Nu pot încărca grupele. Verifică instalarea SQL-ului pentru invitații în Supabase.', true);
    } finally { busy = false; $('fx-invite-refresh').disabled = false; }
  }
  async function copyLink() {
    const val = $('fx-invite-url').value;
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      message('Link copiat. Trimite-l elevului pe WhatsApp.', false);
    } catch {
      $('fx-invite-url').select();
      message('Selectează și copiază linkul din câmp.', false);
    }
  }
  async function toggle() {
    const g = selected();
    if (!g) return;
    $('fx-invite-toggle').disabled = true;
    try {
      const result = await db.from('teacher_groups').update({join_enabled:!g.join_enabled}).eq('id', g.id);
      if (result.error) throw result.error;
      g.join_enabled = !g.join_enabled;
      render();
      message(g.join_enabled ? 'Linkul este activ.' : 'Linkul a fost dezactivat.', false);
    } catch (err) { console.error(err); message('Nu am putut modifica linkul.', true); render(); }
  }
  async function rotate() {
    const g = selected();
    if (!g || !confirm('Generezi un link nou? Cel vechi nu va mai funcționa.')) return;
    $('fx-invite-renew').disabled = true;
    try {
      const result = await db.rpc('fx_group_invite_rotate', {p_group_id:g.id});
      if (result.error) throw result.error;
      g.join_token = result.data;
      render();
      message('Link nou generat. Trimite elevului noul link.', false);
    } catch (err) { console.error(err); message('Nu am putut genera linkul.', true); render(); }
  }
  function mount() {
    const tab = $('tab-groups');
    if (!tab || $('fx-invite-panel')) return;
    const section = document.createElement('section');
    section.id = 'fx-invite-panel';
    section.className = 'panel';
    section.style.marginBottom = '20px';
    section.innerHTML = '<div class="panel-head"><div><h2>🔗 Invită elevii automat</h2><p>Un elev care are deja cont intră direct în grupă prin link. Apare în înscrieri și la prezențe; accesul la lecții rămâne stabilit de profesor.</p></div></div>' +
      '<div style="display:grid;gap:12px;padding:0 18px 18px">' +
      '<label for="fx-invite-group">Grupa</label><select id="fx-invite-group" style="max-width:520px"></select>' +
      '<label for="fx-invite-url">Linkul grupei</label><input id="fx-invite-url" readonly aria-label="Link de invitație" style="width:100%;max-width:770px">' +
      '<p id="fx-invite-state" style="font-size:13px;margin:0"></p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:9px"><button class="btn btn-primary" id="fx-invite-copy">Copiază linkul</button>' +
      '<button class="btn btn-soft" id="fx-invite-toggle">Oprește linkul</button>' +
      '<button class="btn btn-soft" id="fx-invite-renew">Generează link nou</button>' +
      '<button class="btn btn-soft" id="fx-invite-refresh">Actualizează grupele</button></div>' +
      '<p id="fx-invite-msg" role="status" style="font-size:13px;margin:0"></p></div>';
    tab.insertBefore(section, tab.firstChild);
    $('fx-invite-group').addEventListener('change', render);
    $('fx-invite-copy').addEventListener('click', copyLink);
    $('fx-invite-toggle').addEventListener('click', toggle);
    $('fx-invite-renew').addEventListener('click', rotate);
    $('fx-invite-refresh').addEventListener('click', refresh);
    document.querySelectorAll('[data-tab="groups"]').forEach(b => b.addEventListener('click', refresh));
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();