// Inventario do espelho: refs, rotas, externos e contexto do CTA.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORIGIN='https://flapycopa.tanoclique.com';
const files=[];
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(['tools','.git','node_modules'].includes(f.name))continue;walk(p);continue;}
 if(/\.(html|js|css|json|txt|xml|webmanifest)$/i.test(f.name))files.push(p);}})(ROOT);
console.log('arquivos: '+files.length);

const ATTR=/(?:href|src|srcset|poster|content)\s*=\s*"([^"]+)"|(https?:\/\/[^\s"'<>`)]+)/gi;
const intRef=new Map(), ext=new Set(), hrefs=new Set();
for(const p of files){
  const rel=path.relative(ROOT,p);
  let t;try{t=fs.readFileSync(p,'utf8')}catch(e){continue}
  let m;
  const re=new RegExp(ATTR.source,'gi');
  while((m=re.exec(t))){
    let v=(m[1]||m[2]||'').trim();
    if(!v)continue;
    if(v.startsWith(ORIGIN)){
      const rest=v.slice(ORIGIN.length)||'/';
      if(!intRef.has(rest))intRef.set(rest,[]);
      if(intRef.get(rest).length<4)intRef.get(rest).push(rel);
      continue;
    }
    if(/^https?:\/\//i.test(v)){ ext.add(v); continue; }
    if(v.startsWith('/')||/^[a-z]/i.test(v)){
      const clean=v.split('?')[0].split('#')[0];
      if(clean&&clean!=='#'){ hrefs.add(clean); if(!intRef.has(clean))intRef.set(clean,[]); if(intRef.get(clean).length<4)intRef.get(clean).push(rel); }
    }
  }
}
console.log('\n=== REFERENCIAS INTERNAS ('+intRef.size+') ===');
[...intRef.keys()].sort().forEach(k=>console.log('  '+k.padEnd(60)+' <- '+[...new Set(intRef.get(k))].join(', ')));
console.log('\n=== URLS EXTERNAS ('+ext.size+') ===');
[...ext].sort().forEach(u=>console.log('  '+u));

const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const L=idx.toLowerCase();
console.log('\n=== CTA (acessar/jogar agora) ===');
let i=0,n=0;
for(const kw of ['acessar','jogar agora','começar','entrar agora','jogar grátis','jogargratis','jogaragora']){
  i=0;n=0;
  while((i=L.indexOf(kw,i))>=0&&n<3){
    console.log('\n--- "'+kw+'" @'+i+' ---');
    console.log(JSON.stringify(idx.slice(Math.max(0,i-400),i+300)));
    i+=kw.length;n++;
  }
}
