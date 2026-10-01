// Procura defeitos de base path / refs quebradas nos arquivos do espelho.
// Uso:  node tools\verify.js
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const EX=new Set(['tools','.git','node_modules','orig']);
function walk(d,o=[]){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(EX.has(f.name))continue;walk(p,o);}
 else if(/\.(html|js|mjs|css|webmanifest|json)$/.test(f.name))o.push(p);}return o;}

const RAW=require('./base');
const B=RAW?(String(RAW).startsWith('/')?String(RAW):'/'+String(RAW)).replace(/\/+$/g,''):'';
const BAD=B?['undefined/','href="/"','src="/"','start_url":"/"','passarinho.test',
               'flagcdn.com','fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net',
               'uploads/teams/favicon_1783089187','uploads/teams/banner_promo_1783089187','/public/img/coin.png']:
            ['undefined/','passarinho.test'];
let bad=0;
for(const f of walk(ROOT)){
  const t=fs.readFileSync(f,'utf8');
  const rel=path.relative(ROOT,f);
  for(const p of BAD)if(t.includes(p)){console.log('DEFEITO  '+JSON.stringify(p)+'  ->  '+rel);bad++;}
  if(!B)continue;
  // refs absolutas que escaparam do base
  let m;
  const attr=new RegExp('(?:href|src|action|poster)\\s*=\\s*"\\/(?!'+B.slice(1)+'\\/)[^"]+"','g');
  while((m=attr.exec(t))){console.log('SEM BASE '+m[0]+'  ->  '+rel);bad++;}
  const loc=new RegExp('location\\.(?:href|assign|replace)\\s*=\\s*[\'"`]\\/(?!'+B.slice(1)+'\\/)[^\'"`]+','g');
  while((m=loc.exec(t))){console.log('SEM BASE '+m[0]+'  ->  '+rel);bad++;}
}
console.log('defeitos: '+bad);

if(process.argv.includes('--hash')){
  const h={};
  for(const f of walk(ROOT))h[path.relative(ROOT,f)]=crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
  fs.writeFileSync(process.argv[process.argv.indexOf('--hash')+1],JSON.stringify(h));
  console.log('snapshot gravado: '+Object.keys(h).length+' arquivos');
}
if(process.argv.includes('--cmp')){
  const a=JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--cmp')+1],'utf8'));
  let d=0;
  for(const f of walk(ROOT)){const rel=path.relative(ROOT,f);
    const v=crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
    if(a[rel]!==v){console.log('DIFERE '+rel);d++;}}
  console.log('arquivos diferentes do snapshot: '+d);
}
