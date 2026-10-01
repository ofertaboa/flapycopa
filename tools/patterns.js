// Lista todos os padroes de caminho que precisam de base path / reescrita.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORIGIN='https://flapycopa.tanoclique.com';
const files=[];
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(['tools','.git','node_modules'].includes(f.name))continue;walk(p);continue;}
 if(/\.(html|css|js|json|txt|xml)$/i.test(f.name))files.push(p);}})(ROOT);

const PATTERNS=[
  ['href ou src absoluto',      /(?:href|src|srcset|poster)\s*=\s*"(\/[^"]*)"/g],
  ['url() no CSS',              /url\(\s*['"]?(\/[^'")]+)/g],
  ['origem absoluta',           new RegExp(ORIGIN.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[^"\'\\s<>)]*','g')],
  ['fetch/axios',               /\b(fetch|axios\.(?:get|post|put|delete))\(\s*['"`](\/[^'"`]+)/g],
  ['location',                  /\b(?:window\.)?location\.(?:href|assign|replace)\s*=\s*['"`](\/[^'"`]+)/g],
  ['passarinho.test',           /http:\/\/passarinho\.test[^"'`\s<>)]*/g],
  ['externos nao-origem',       /https?:\/\/(?!flapycopa\.tanoclique\.com|www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}[^"'`\s<>)]*/gi],
];
const acc=new Map();
for(const p of files){
  const rel=path.relative(ROOT,p);
  let t;try{t=fs.readFileSync(p,'utf8')}catch(e){continue}
  for(const [name,re] of PATTERNS){
    const r=new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g');
    let m;while((m=r.exec(t))){
      const v=m[0];
      if(name==='externos nao-origem'&&v.startsWith('http')&&v.startsWith(ORIGIN))continue;
      const key=name+'\t'+v;
      if(!acc.has(key))acc.set(key,new Set());
      acc.get(key).add(rel);
    }
  }
}
for(const [name] of PATTERNS){
  const rows=[...acc.entries()].filter(([k])=>k.startsWith(name+'\t'));
  console.log('\n=== '+name+' ('+rows.length+') ===');
  rows.sort().forEach(([k,fs2])=>{
    const v=k.split('\t').slice(1).join('\t');
    console.log('  '+v.slice(0,140)+'   ['+[...fs2].join(', ')+']');
  });
}
