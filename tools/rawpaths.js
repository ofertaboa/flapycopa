// Reporta TODOS os string literals com caminho raiz-absoluto que faltam o base path.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const BASE=require('./base');
const EX=new Set(['tools','.git','node_modules']);
// sufixos de endpoint da API (comparados com indexOf), nao caminhos de asset
const ALLOW=new Map([['js/shim.js',/^\/(auth|profile)\//]]);
const files=[];
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(EX.has(f.name))continue;walk(p);continue;}
 if(/\.(html|js|mjs|css|json)$/i.test(f.name))files.push(p);}})(ROOT);

const re=/(["'`])((?:\\)?\/)([^"'`\s<>]*)\1/g;
const hits=new Map();
for(const p of files){
  const rel=path.relative(ROOT,p);
  if(/\.css$/i.test(p))continue;   // seletores Tailwind escapados nao sao URL
  const t=fs.readFileSync(p,'utf8');
  let m;const r=new RegExp(re.source,'g');
  while((m=r.exec(t))){
    const raw=m[3];
    const val=(m[2]+raw).replace(/\\\//g,'/');
    if(val.startsWith('//'))continue;                 // regex literal / protocolo
    if(val.startsWith('/api/'))continue;              // API (origem)
    if(BASE&&val.startsWith(BASE+'/'))continue;       // ja tem base
    if(raw.startsWith('\u0000'))continue;             // token interno
    if(m[0].length<=3)continue;                       // "/" ou '/' solto
    const al=ALLOW.get(rel.split(path.sep).join('/'));
    if(al&&al.test(val))continue;                     // sufixo de endpoint, nao URL
    if(!hits.has(val))hits.set(val,new Set());
    hits.get(val).add(rel);
  }
}
console.log('literals raiz-absolutos SEM base: '+hits.size);
[...hits.keys()].sort().forEach(v=>console.log('  '+v.slice(0,90).padEnd(92)+' ['+[...hits.get(v)].join(', ')+']'));
