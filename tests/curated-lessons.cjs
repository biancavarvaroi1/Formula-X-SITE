const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const read=p=>fs.readFileSync(p,"utf8");
const w={};
vm.runInNewContext(read("assets/fx-curated-literature-2027.js"),{window:w});
const lessons=w.FormulaXCuratedLiterature?.lessons;
assert(Array.isArray(lessons)&&lessons.length===2,"Both BAC lyrical lessons must be available");
let quizzes=0,blocks=0;
for(const l of lessons){
  assert(l.subject==="romana"&&l.fx_format==="formula-x-blocks-v1");
  assert(Array.isArray(l.blocks)&&l.blocks.length>=30&&l.blocks.length<=150,l.slug);
  assert(read("profesori/importa-literatura.html").includes('data-import="'+l.slug+'"'));
  assert(l.blocks.some(b=>b.type==="image"),l.slug+" needs a study visual");
  assert(l.blocks.some(b=>b.type==="callout"&&/RELEVANȚĂ/.test(b.label||"")),l.slug+" needs relevant scene explanations");
  assert(l.blocks.some(b=>b.type==="steps"),l.slug+" needs the BAC essay sequence");
  const ids=new Set();
  for(const b of l.blocks){
    if(b.type==="quiz"){
      quizzes++;
      assert(!ids.has(b.id),"Duplicate quiz id: "+b.id);
      ids.add(b.id);
      assert(b.options.length===4,new Error(b.id+" invalid answer count"));
      assert(new Set(b.options.map(x=>x.toLowerCase())).size===4,b.id+" repeated options");
      assert(Number.isInteger(b.correct)&&b.correct>=0&&b.correct<4,b.id+" correct out of range");
      assert(typeof b.explanation==="string"&&b.explanation.length>20,b.id+" requires explanation");
    }
    if(b.type==="image"){
      assert(/^\/assets\/[A-Za-z0-9/_.-]+\.svg$/.test(b.image),"Only local static diagrams allowed");
      assert(fs.existsSync(b.image.slice(1)),b.image+" missing");
      assert(read(b.image.slice(1)).includes("<svg"),b.image+" invalid SVG");
    }
  }
  assert(ids.size>=10,l.slug+" needs practice questions");
  const body=JSON.stringify({fx_format:l.fx_format,title:l.title,subtitle:l.subtitle,subject:l.subject,theme:l.theme,blocks:l.blocks});
  assert(body.length<175000,"Studio text limit exceeded");
  blocks+=l.blocks.length;
}
assert(quizzes>=20,"At least 20 practice questions");
const importScript=read("assets/fx-curated-importer.js");
for(const s of ["get_my_staff_profile","fx_teacher_lesson_catalog","fx_create_lesson","fx_set_lesson_enabled","SIGNED_OUT"]){
  assert(importScript.includes(s),"Importer missing "+s);
}
const html=read("index.html");
assert(html.includes("if (!force) return false;"),"A staff login must not automatically redirect from the homepage");
assert(!html.includes("redirectStaffToPortal(data.user, true)"),"Staff login still force-redirects");
assert(read("assets/formula-x-lesson-teacher.js").includes("/profesori/importa-literatura.html"));
assert(read("profesori/studio.html").includes("/profesori/importa-literatura.html"));
const sql=read("SUPABASE-UNIVERSAL-LECTII-2026.sql");
for(const s of ["BEGIN;","COMMIT;","fx_universal_lesson_edits","fx_studio_update_lesson","private.can_manage_subject","fx_set_lesson_enabled"]){
  assert(sql.includes(s),"Unified installer missing "+s);
}
assert(!/\bDROP\s+TABLE\b/i.test(sql),"Installer must not delete existing tables");
assert(!/\bDELETE\s+FROM\s+public\./i.test(sql),"Installer must not delete user data");
console.log("PASS: "+lessons.length+" lessons, "+blocks+" blocks, "+quizzes+" quizzes; no automatic staff redirect; single SQL installer.");
