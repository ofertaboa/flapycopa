// Scan compartilhado de refs. Remove comentarios, ignora placeholders e
// trata caminho relativo/absoluto com base path.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const EX=new Set(['.git','tools','node_modules','orig']);
const RAW=require('./base');
const BASE=RAW?(String(RAW).startsWith('/')?String(RAW):'/'+String(RAW)).replace(/\/+$/g,''):'';
const MEDIA_RE=/\.(png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|mov|m3u8|mpd|mp3|ogg|wav|m4a|aac|flac|woff2?|ttf|otf|eot|css|js|mjs|json|xml|txt|webmanifest|map|html)$/i;
// rotas logicas do app: nao sao arquivos, sao diretorios com index.html
const LOGICAL=new Set(['','jogar']);

function stripComments(t,ext){
  if(/\.css$/i.test(ext))return t.replace(/\/\*[\s\S]*?\*\//g,'');
  return t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/[^\n]*/g,'$1');
}
function listFiles(){
  const out=[];
  (function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
    if(f.isDirectory()){if(EX.has(f.name))continue;walk(p);continue;}
    if(/\.(html|js|mjs|css|json|webmanifest)$/i.test(f.name))out.push(p);}})(ROOT);
  return out;
}
function routes(){
  return fs.readdirSync(ROOT,{withFileTypes:true})
    .filter(f=>f.isDirectory()&&!EX.has(f.name)&&fs.existsSync(path.join(ROOT,f.name,'index.html')))
    .map(f=>f.name);
}
/** @returns {{local:[{ref,from,dest}],abs:[{ref,from,path}],ext:[{ref,from}]}} */
function scan(){
  const ROUTES=routes();
  const local=[],abs=[],ext=[];
  const seen=new Set();
  for(const p of listFiles()){
    const rel=path.relative(ROOT,p);
    const raw=fs.readFileSync(p,'utf8');
    const t=stripComments(raw,path.extname(p));
    const re=/(?:href|src|data-src|action|poster|content)\s*=\s*"([^"]+)"|url\(\s*['"]?([^'")]+)|["'`]([^"'`\s<>()$]*?\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|mov|m3u8|mpd|mp3|ogg|wav|m4a|aac|flac|woff2?|ttf|otf|eot|css|js|mjs|json|xml|txt|webmanifest|map|html)(?:\?[^"'`\s<>()]*)?)["'`]/gi;
    let m;
    while((m=re.exec(t))){
      const ref=(m[1]||m[2]||m[3]||'').trim();
      if(!ref||ref.startsWith('data:')||ref.startsWith('#'))continue;
      if(ref.includes('${')||/^https?:\.\.\./.test(ref))continue;      // template / placeholder
      const key=rel+'|'+ref;
      if(seen.has(key))continue; seen.add(key);
      // chave de objeto literal (import map / mapa de rotas) -> nao e arquivo
      if(new RegExp('[\'"`]'+ref.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\'"`]\\s*:').test(t))continue;
      // nome .html solto = rota logica, nao arquivo
      if(/^[^/\\]*\.html$/i.test(ref))continue;

      if(/^(https?:)?\/\//i.test(ref)){
        const host=(/^https?:\/\/([^/]+)/i.exec(ref)||[])[1]||'';
        // namespace/placeholder/lib-interno: nao e asset do espelho
        if(/^(localhost|127\.0\.0\.1|www\.w3\.org|theajack\.github\.io|tailwindcss\.com)$/i.test(host))continue;
        ext.push({ref,from:rel}); continue;
      }
      const noQuery=decodeURIComponent(ref.split('?')[0].split('#')[0]);
      if(!MEDIA_RE.test(noQuery))continue;
      const logicalKey=noQuery.replace(/^\//,'').replace(new RegExp('^'+(BASE?BASE.replace(/^\//,'')+'/':'')),'');
      if(LOGICAL.has(noQuery.replace(/^\//,''))||LOGICAL.has(logicalKey))continue;

      if(noQuery.startsWith('/')){
        let p2=noQuery.replace(/^\//,'');
        const naked=!!(BASE&&!ref.startsWith(BASE)&&!/\/api\//.test(ref));
        if(BASE&&p2.startsWith(BASE.slice(1)+'/'))p2=p2.slice(BASE.length);
        else if(BASE&&p2===BASE.slice(1))p2='';
        abs.push({ref,from:rel,path:p2,dest:path.join(ROOT,p2),naked}); continue;
      }
      const cands=[];
      const dir=path.dirname(rel);
      cands.push(path.join(dir,noQuery).replace(/\\/g,'/'));
      for(const r of ROUTES)cands.push(path.join(r,noQuery).replace(/\\/g,'/'));
      cands.push(noQuery);
      const dest=cands.map(c=>c.replace(/^\.\//,'')).find(c=>fs.existsSync(path.join(ROOT,c)));
      local.push({ref,from:rel,dest:dest?path.join(ROOT,dest):null,cands:[...new Set(cands.map(c=>c.replace(/^\.\//,'')))]});
    }
  }
  return {local,abs,ext,routes:routes()};
}
module.exports={scan,ROOT,BASE,MEDIA_RE,listFiles,routes};
