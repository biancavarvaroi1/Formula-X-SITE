/* Shared teacher persistence. Student access remains in fx_open_lesson/RLS. */
(function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const blocked = new Set(['__proto__', 'prototype', 'constructor']);
  function client() {
    if (window.FormulaXAuthClient) return window.FormulaXAuthClient;
    if (window.FormulaXLessons) return window.FormulaXLessons.sb();
    return window.FormulaXAuthClient = window.supabase.createClient(window.FX_SUPABASE_URL, window.FX_SUPABASE_ANON_KEY, {
      auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce'}
    });
  }
  async function rpc(name, args) {
    const {data, error} = await client().rpc(name, args);
    if (error) throw error;
    return data;
  }
  async function requireStaff() {
    const {data, error} = await client().auth.getSession();
    if (error) throw error;
    if (!data?.session?.user) throw Error('Conectează-te în portalul profesorului.');
    const result = await rpc('get_my_staff_profile');
    const staff = Array.isArray(result) ? result[0] : result;
    if (!staff || !['mentor', 'admin'].includes(staff.role)) throw Error('Acest cont nu are acces la editorul profesorilor.');
    return {staff, user: data.session.user};
  }
  function decode(body) {
    if (typeof body !== 'string') return {kind: 'encrypted', doc: null};
    let doc;
    try {doc = JSON.parse(body);} catch (_) {}
    if (doc && typeof doc === 'object' && !Array.isArray(doc)) {
      return {kind: doc.fx_format === 'formula-x-blocks-v1' ? 'studio' : 'model', doc};
    }
    return {kind: 'text', doc: null};
  }
  function pointer(key) {return key.replace(/~/g, '~0').replace(/\//g, '~1');}
  function patchModel(doc, patches) {
    for (const [path, value] of Object.entries(patches?.model || {})) {
      if (!path.startsWith('/')) continue;
      const parts = path.slice(1).split('/').map(x => x.replace(/~1/g, '/').replace(/~0/g, '~'));
      if (parts.some(x => blocked.has(x))) continue;
      let target = doc;
      for (const part of parts.slice(0, -1)) target = target && Object.hasOwn(target, part) ? target[part] : null;
      const key = parts.at(-1);
      if (target && Object.hasOwn(target, key) && typeof target[key] === typeof value) target[key] = clone(value);
    }
    return doc;
  }
  function modelChanges(before, after, path = '', out = {}) {
    if (JSON.stringify(before) === JSON.stringify(after)) return out;
    if (path && (Array.isArray(after) || after === null || typeof after !== 'object')) {out[path] = after; return out;}
    for (const key of Object.keys(after || {})) {
      if (blocked.has(key) || ['assets', 'embeddedImages', 'imageData', 'ciphertext'].includes(key)) continue;
      modelChanges(before?.[key], after[key], path + '/' + pointer(key), out);
    }
    return out;
  }
  async function load(slug) {
    const record = await rpc('fx_editor_load_lesson', {p_slug: slug});
    const parsed = decode(record.body);
    if (parsed.kind === 'encrypted') {
      const result = await rpc('fx_open_lesson', {p_slug: slug});
      if (!result?.access?.allowed || !result.key || !window.FormulaXLessons) throw Error('Materialul protejat nu poate fi încărcat.');
      parsed.doc = await window.FormulaXLessons.decryptBundle(slug, result.version, result.key);
      parsed.kind = 'overlay';
      // Binary artwork stays in the encrypted bundle; the editor sends model changes only.
      delete parsed.doc.assets; delete parsed.doc.embeddedImages; delete parsed.doc.imageData;
    }
    if (parsed.doc) patchModel(parsed.doc, record.patches);
    return {...record, ...parsed, original: parsed.doc ? clone(parsed.doc) : null};
  }
  async function save(record, title, summary, doc) {
    const patches = record.kind === 'overlay' ? {
      ...(record.patches || {}), model: {...(record.patches?.model || {}), ...modelChanges(record.original, doc)}
    } : null;
    const receipt = await rpc('fx_editor_save_lesson', {
      p_slug: record.slug, p_title: title, p_summary: summary,
      p_body: patches ? null : JSON.stringify(doc), p_patches: patches,
      p_expected_revision: record.revision
    });
    return patches ? {...receipt, patches} : receipt;
  }
  async function create(id, doc) {
    return rpc('fx_editor_create_lesson', {
      p_id: id, p_subject: doc.subject, p_title: doc.title,
      p_summary: doc.subtitle || '', p_body: JSON.stringify(doc)
    });
  }
  function errorMessage(error) {
    if (['PGRST202', '42883', '42703'].includes(error?.code)) return 'Activează versiunea actuală a fișierului SUPABASE-UNIVERSAL-LECTII-2026.sql, apoi reîncarcă editorul.';
    if (error?.code === '40001') return 'Lecția a fost modificată în altă fereastră. Păstrează ciorna și reîncarcă versiunea nouă înainte de a salva.';
    if (error?.code === '42501') return 'Contul nu mai are permisiunea să editeze această materie. Reconectează-te în portal.';
    return error?.message || 'Conexiunea a fost întreruptă. Ciorna rămâne în acest browser.';
  }
  window.FormulaXLessonStore = {client, rpc, requireStaff, decode, load, save, create, patchModel, modelChanges, errorMessage};
})();
