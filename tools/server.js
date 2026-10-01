// Servidor local que serve o espelho com o mesmo base path do GitHub Pages.
// Uso:  node tools\server.js        (http://localhost:8090/flapycopa/)
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const PORT=process.env.PORT||8090;
const RAW=require('./base');
const BASE=RAW?(String(RAW).startsWith('/')?String(RAW):'/'+String(RAW)).replace(/\/+$/g,''):'';
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.bmp':'image/bmp','.avif':'image/avif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.m4a':'audio/mp4','.mp4':'video/mp4','.webm':'video/webm','.m3u8':'application/vnd.apple.mpegurl','.ts':'video/mp2t','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.map':'application/json'};
function send(res,code,file){
  if(!file){res.writeHead(code,{'Content-Type':'text/html; charset=utf-8'});return res.end(notFound(code));}
  const st=fs.statSync(file);
  const type=TYPES[path.extname(file).toLowerCase()]||'application/octet-stream';
  res.writeHead(code,{'Content-Type':type,'Content-Length':st.size,'Cache-Control':'no-cache'});
  fs.createReadStream(file).pipe(res);
}
function notFound(code){
  const f=path.join(ROOT,'404.html');
  if(fs.existsSync(f))return fs.readFileSync(f,'utf8');
  return '<!DOCTYPE html><meta charset="utf-8"><title>404</title><h1>404</h1><a href="'+BASE+'/">Voltar</a>';
}
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p.endsWith('/')&&p!=='/')p=p.slice(0,-1);
  if(BASE){
    if(p===BASE)p='/';
    else if(p.startsWith(BASE+'/'))p=p.slice(BASE.length);
    else{res.writeHead(307,{'Location':p==='/'?BASE+'/':BASE+p});return res.end();}
  }
  let file=path.join(ROOT,p.replace(/[/\\]/g,path.sep));
  if(!file.startsWith(ROOT))return send(res,403,null);
  try{
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory()){
      const idx=path.join(file,'index.html');
      if(fs.existsSync(idx))return send(res,200,idx);
      return send(res,404,null);
    }
    if(!fs.existsSync(file)){
      const withExt=path.join(ROOT,p+'.html');
      if(fs.existsSync(withExt))return send(res,200,withExt);
      const idx=path.join(ROOT,p,'index.html');
      if(fs.existsSync(idx))return send(res,200,idx);
      console.log('[404]',req.method,p);
      return send(res,404,null);
    }
    send(res,200,file);
  }catch(e){console.log('[ERR]',e.message);send(res,500,null);}
}).listen(PORT,()=>console.log('FlapyCopa local: http://localhost:'+PORT+(BASE||'')+'/'));
