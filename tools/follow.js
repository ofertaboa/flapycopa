// Segue refs relativas/absolutas a partir dos arquivos locais e baixa o que
// faltar no espelho (ex.: fontes Next dentro de CSS, imagens em url()).
// Idempotente.  Uso:  node tools\follow.js [--dry]
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORIGIN='https://flapycopa.tanoclique.com';
const DRY=process.argv.includes('--dry');
const EX=new Set(['.git','tools','node_modules']);
const SCANNED=/\.(html|css|js|mjs|json|webmanifest)$/i;
const REF=/(?:href|src|poster)\s*=\s*"([^"]+)"|url\(\s*['"]?([^'")]+)|["'`]([^"'`\s<>()$]*?\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|m3u8|mp3|ogg|wav|m4a|woff2?|ttf|otf|css|js|json)(?:\?[^"'`\s<>()]*)?)["'`]/gi;

function listFiles(){const out=[];(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(EX.has(f.name))continue;walk(p);continue;}
 if(SCANNED.test(f.name))out.push(p);}})(ROOT);return out;}

const BASE=norm(require('./base'));
function norm(b){b=String(b||'');if(b&&!b.startsWith('/'))b='/'+b;return b.replace(/\/+$/,'');}
function resolve(fromRel,ref){
  let u=ref.split('?')[0].split('#')[0].replace(/\\\//g,'/'); // JS: '\/img\/x' -> /img/x
  try{u=decodeURIComponent(u);}catch(e){}
  if(/^(https?:)?\/\//i.test(u)){
    if(u.startsWith(ORIGIN))u=u.slice(ORIGIN.length);
    else if(u.startsWith('http://passarinho.test'))u=u.slice('http://passarinho.test'.length);
    else return null; // externo ja tratado pelo rebase
  }
  if(BASE&&u.startsWith(BASE+'/'))u=u.slice(BASE.length);
  else if(u===BASE)u='/';
  if(!u.startsWith('/'))u=path.posix.join(path.posix.dirname(fromRel.replace(/\\/g,'/')),u);
  return path.posix.normalize(u).replace(/^\.\//,'').replace(/^\//,'');
}
function has(rel){const p=path.join(ROOT,rel.replace(/\//g,path.sep));
  if(fs.existsSync(p)&&fs.statSync(p).isFile())return true;
  if(fs.existsSync(p)&&fs.statSync(p).isDirectory())return fs.existsSync(path.join(p,'index.html'));
  return false;}

(async()=>{
  const pending=new Set();const from=new Map();
  for(const f of listFiles()){
    const rel=path.relative(ROOT,f).replace(/\\/g,'/');
    const t=fs.readFileSync(f,'utf8');
    let m;const re=new RegExp(REF.source,'gi');
    while((m=re.exec(t))){
      const ref=(m[1]||m[2]||m[3]||'').trim();
      if(!ref||ref.startsWith('data:')||ref.startsWith('#')||ref.includes('${'))continue;
      if(/\.(html)$/i.test(ref)&&!ref.includes('/'))continue;
      const r=resolve(rel,ref);
      if(!r||!/\.(png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|m3u8|mp3|ogg|wav|m4a|woff2?|ttf|otf|css|js|json)$/i.test(r))continue;
      if(!has(r)&&!pending.has(r)){pending.add(r);from.set(r,rel+' -> '+ref);}
    }
  }
  console.log('faltando: '+pending.size);
  let ok=0,fail=0;
  for(const rel of pending){
    const url=ORIGIN+'/'+rel;
    if(DRY){console.log('baixaria '+url);continue;}
    try{
      const r=await fetch(url,{signal:AbortSignal.timeout(60000)});
      if(r.status!==200)throw new Error('HTTP '+r.status);
      const b=Buffer.from(await r.arrayBuffer());
      const p=path.join(ROOT,rel.replace(/\//g,path.sep));
      fs.mkdirSync(path.dirname(p),{recursive:true});
      fs.writeFileSync(p,b);
      console.log('BAIXOU '+String(b.length).padStart(9)+'  '+rel+'   ['+from.get(rel)+']');
      ok++;
    }catch(e){console.log('FALHOU '+rel+'  '+e.message+'   ['+from.get(rel)+']');fail++;}
  }
  console.log('\nok='+ok+'  falhas='+fail+(DRY?'  (dry)':''));
  process.exit(fail?1:0);
})();
