// Enumera todas as referencias de API nos HTML espelhados.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORIGIN='https://flapycopa.tanoclique.com';
const files=[path.join(ROOT,'index.html'),path.join(ROOT,'jogar','index.html')];
const CALLS=/\b(fetchJson|fetch|apiPost|apiGet|apiPut|axios\.\w+)\s*\(\s*(["'`])([^"'`]+)\2/g;
const ANYAPI=/["'`](\/api\/[^"'`]*)["'`]/g;
for(const p of files){
  const rel=path.relative(ROOT,p);
  const t=fs.readFileSync(p,'utf8');
  console.log('\n=== '+rel+' ===');
  const calls=new Set(); let m;
  const r1=new RegExp(CALLS.source,'g');
  while((m=r1.exec(t)))calls.add(m[1]+'('+JSON.stringify(m[3]));
  console.log('  -- chamadas com URL literal --');
  [...calls].sort().forEach(x=>{
    const u=x.replace(/^[^(]+\("([^"]+)$/,'$1');
    const bad=x.includes("'/api/")||x.includes('"/api/')||x.includes('`/api/');
    console.log('   '+(bad?'SEM-ORIGEM ':'ok        ')+x);
  });
  const api=new Set(); const r2=new RegExp(ANYAPI.source,'g');
  while((m=r2.exec(t)))api.add(m[1]);
  console.log('  -- literais /api/ no texto ('+api.size+') --');
  [...api].sort().forEach(x=>{
    const hasAbs=t.includes(ORIGIN+x);
    console.log('   '+(hasAbs?'(tambem com origem) ':'SEM ORIGEM  ')+x);
  });
}
