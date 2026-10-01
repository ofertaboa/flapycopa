// Rastreia o site de origem e baixa HTML + assets internos para a pasta do projeto.
// Uso:  node tools\mirror.js
const fs=require('fs'),path=require('path'),http=require('http'),https=require('https');
const ORIGIN='https://flapycopa.tanoclique.com';
const OUT=path.join(__dirname,'..');
const seen=new Set(), queue=[], assets=new Set(), routes=new Set(['/', '/jogar']);
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

function get(u,bin){return new Promise((res,rej)=>{
  const mod=u.startsWith('https')?https:http;
  const r=mod.get(u,{headers:{'user-agent':UA,'accept':'*/*','accept-language':'pt-BR,pt;q=0.9'},timeout:45000},(s)=>{
    if(s.statusCode>=300&&s.statusCode<400&&s.headers.location)return res(get(new URL(s.headers.location,u).href,bin));
    if(s.statusCode!==200){s.resume();return rej(new Error(u+' -> '+s.statusCode));}
    const c=[];s.on('data',d=>c.push(d));s.on('end',()=>res(bin?Buffer.concat(c):Buffer.concat(c).toString('utf8')));
  });
  r.on('error',rej);r.on('timeout',()=>r.destroy(new Error('timeout '+u)));
});}

const SKIP_DIR=new Set(['tools','.git','node_modules','orig']);
function save(rel,buf){
  const clean=rel.replace(/^\/+/,'').split('?')[0];
  const p=path.join(OUT,clean);
  if(!p.startsWith(OUT))return;
  if(clean.split('/').some(seg=>SKIP_DIR.has(seg)))return;
  fs.mkdirSync(path.dirname(p),{recursive:true});
  if(!fs.existsSync(p)||fs.statSync(p).size===0)fs.writeFileSync(p,buf);
}
function abs(u,base){try{return new URL(u,base).href}catch(e){return null}}
function pushUrl(u){
  if(!u||u.startsWith('data:')||u.startsWith('mailto:')||u.startsWith('tel:')||u.startsWith('#'))return;
  if(u.startsWith('http')&&!u.startsWith(ORIGIN))return;
  const url=u.startsWith('http')?u:ORIGIN+(u.startsWith('/')?u:'/'+u);
  if(seen.has(url))return; seen.add(url); queue.push(url);
}

const extRe=/\.(js|css|woff2?|ttf|otf|eot|png|jpe?g|webp|gif|svg|ico|avif|bmp|mp3|mp4|webm|wav|ogg|m4a|m3u8|ts|json|webmanifest|txt|xml|map)(\?|$)/i;
function collectRefs(text,base){
  if(!text)return;
  const re=/(?:src|href|srcSet|srcset|url|poster)\s*[:=]\s*["'`]([^"'`]+)["'`]|["'`](\/(?:_next|img|images|image|uploads|assets|static|audio|audios|music|sounds|video|videos|media|fonts|css|js|storage|build|vendor|favicon)[^"'`\s)]*)["'`]|["'`]([^"'`\s)]+\.(?:png|jpe?g|webp|gif|svg|ico|avif|mp3|mp4|webm|wav|ogg|m4a|m3u8|ts|woff2?|ttf|otf|css|js)(?:\?[^"'`\s)]*)?)["'`]/gi;
  let m;while((m=re.exec(text))){
    let u=m[1]||m[2]||m[3]; if(!u)continue;
    if(u.startsWith(ORIGIN))u=u.slice(ORIGIN.length);
    if(u.startsWith('//'))continue;
    if(u.startsWith('data:')||u.startsWith('#'))continue;
    if(!extRe.test(u))continue;
    const a=abs(u,base); if(a&&a.startsWith(ORIGIN))pushUrl(a);
  }
}
function collectRoutes(text){
  if(!text)return;
  const re=/["'`](\/[a-z0-9][a-z0-9\-\/_]{0,60})["'`]/gi;
  let m;
  while((m=re.exec(text))){
    const p=m[1];
    if(extRe.test(p))continue;
    if(p.startsWith('/api/')||p.startsWith('/_next/'))continue;
    if(/\/(node_modules|src|app|Http|Controllers|resources|vendor|storage\/app)/.test(p))continue;
    if(p.split('/').filter(Boolean).length>4)continue;
    routes.add(p);
  }
  const rm=/\{"page":"(\/[^"]*)"/g; while((m=rm.exec(text)))routes.add(m[1].replace(/\/\[.*?\]/g,''));
}

(async()=>{
  ['/','/jogar'].forEach(p=>pushUrl(ORIGIN+p));
  let guard=0;
  while(queue.length&&guard<4000){
    guard++;
    const url=queue.shift();
    let buf;
    try{buf=await get(url,true);}catch(e){console.log('FAIL',e.message);continue;}
    const p=new URL(url).pathname;
    const head=buf.slice(0,400).toString('latin1').toLowerCase();
    const isHtml=head.includes('<!doctype')||head.includes('<html');
    if(isHtml||extRe.test(p)){
      if(isHtml){
        const rel=p==='/'?'/index.html':(p.replace(/\/+$/,'')+'/index.html');
        save(rel,buf);
        const t=buf.toString('utf8');
        collectRefs(t,url);collectRoutes(t);
        console.log('HTML  '+p+'  ->  '+rel+'  '+buf.length);
      }else{
        save(p,buf);
        if(/\.(js|css|m3u8|json|xml|txt|map)$/i.test(p)){const t=buf.toString('utf8');collectRefs(t,url);collectRoutes(t);}
        console.log('ASSET '+p+'  '+buf.length);
      }
    }else{
      save(p,buf);console.log('OUTRO '+p+'  '+buf.length);
    }
    if(queue.length>5000)break;
  }
  for(const r of [...routes]){const u=ORIGIN+(r==='/'?'/':r); if(!seen.has(u))queue.push(u);}
  guard=0;
  while(queue.length&&guard<600){
    guard++;
    const url=queue.shift();
    let buf; try{buf=await get(url,true);}catch(e){console.log('FAIL2',e.message);continue;}
    const p=new URL(url).pathname;
    const isHtml=buf.slice(0,400).toString('latin1').toLowerCase().includes('<html');
    if(isHtml){
      const rel=p.replace(/\/+$/,'')+'/index.html';
      save(rel,buf);const t=buf.toString('utf8');collectRefs(t,url);collectRoutes(t);
      console.log('HTML2 '+p+'  ->  '+rel+'  '+buf.length);
    }else{
      save(p,buf);
      if(/\.(js|css|m3u8|json|xml|txt|map)$/i.test(p)){const t=buf.toString('utf8');collectRefs(t,url);collectRoutes(t);}
      console.log('ASSET2 '+p+'  '+buf.length);
    }
  }
  fs.writeFileSync(path.join(__dirname,'routes.json'),JSON.stringify([...routes].sort(),null,2));
  console.log('\nROUTES: '+[...routes].sort().join('  '));
  console.log('DONE urls='+seen.size);
})().catch(e=>{console.error('FATAL',e);process.exit(1)});
