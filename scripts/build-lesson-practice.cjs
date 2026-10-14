const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'assets/formula-x-lesson-page.js');
const marker='// Formula X protected lesson page.';
const previous=fs.readFileSync(target,'utf8');
const index=previous.indexOf(marker);
if(index<0||previous.indexOf(marker,index+marker.length)>=0)throw Error('Lesson controller marker missing or duplicated');
const moduleSource=fs.readFileSync(path.join(root,'assets/formula-x-essay-practice.js'),'utf8').trimEnd();
const controller=previous.slice(index).trimEnd();
const next=moduleSource+'\n\n'+controller+'\n';
if(process.argv.includes('--check')){
  if(next!==previous)throw Error('Run node scripts/build-lesson-practice.cjs before publishing');
  console.log('Essay practice bundle is current.');
}else{
  fs.writeFileSync(target,next);
  console.log('Essay practice bundled into the protected lesson controller.');
}
