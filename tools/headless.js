// Renderiza as rotas no Chrome headless e classifica o console:
//   [erro] -> FALHA  (falha de recurso/JS do NOSSO site)
//   [api]  -> aviso  (API PHP do origem, nao e responsabilidade do espelho)
//   resto  -> ignorado (info do Chrome)
// Uso:  node tools\headless.js [--all]
//       set PORT=8090 && node tools\headless.js
//       set SITE=https://ofertaboa.github.io && node tools\headless.js
const {spawnSync}=require('child_process'),path=require('path'),os=require('os');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HOST=(process.env.SITE||('http://localhost:'+(process.env.PORT||8090))).replace(/\/+$/,'');
const B=(()=>{const r=require('./base');return r?String(r).replace(/^\/?/,'/').replace(/\/+$/,''):''})();
const EXTRA=process.argv.slice(2).filter(a=>!a.startsWith('--')&&!a.includes('='));
const list=EXTRA.length?EXTRA:['/','/jogar'];
const IGNORE=/AudioContext|beforeinstallprompt|preloaded using link|Download the React DevTools|favicon\.ico|third-party cookie|\[DOM\] Password field|Password field is not contained|disable-devtool/i;
const API=/CORS policy|flapycopa\.tanoclique\.com|No 'Access-Control-Allow|Access-Control-Allow-Origin/i;
const FAIL=/Failed to load resource|net::ERR_|Uncaught|SyntaxError|TypeError|ReferenceError|Cannot read prop|is not a function|status of 4\d\d|status of 5\d\d/i;
let fails=0;
for(const r of list){
  const u=HOST+B+(r==='/'?'/':r);
  const tag=r.replace(/[^a-z0-9]/gi,'')||'home';
  const res=spawnSync(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--virtual-time-budget=20000',
    '--user-data-dir='+path.join(os.tmpdir(),'fc_'+tag+'_'+Date.now()),'--enable-logging=stderr','--v=0','--dump-dom',u],
    {encoding:'utf8',timeout:240000,maxBuffer:64*1024*1024});
  const html=res.stdout||'';
  const lines=(res.stderr||'').split(/\r?\n/).filter(l=>l.includes('CONSOLE')&&!IGNORE.test(l));
  const erros=lines.filter(l=>!API.test(l)&&FAIL.test(l));
  const api=lines.filter(l=>API.test(l));
  const visible=html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().length;
  const blank=visible<40;
  const bad=erros.length>0||blank;
  if(bad)fails++;
  console.log((bad?'FALHA ':'OK    ')+r.padEnd(18)+' dom='+String(html.length).padStart(7)+
    ' texto='+String(visible).padStart(5)+(blank?'  [BRANCO]':'')+
    (erros.length?'  erros='+erros.length:'')+(api.length?'  api='+api.length:''));
  erros.slice(0,8).forEach(e=>console.log('        [erro] '+e.slice(0,260)));
  if(process.argv.includes('--all')){
    api.slice(0,6).forEach(e=>console.log('        [api]  '+e.slice(0,260)));
    lines.filter(l=>!API.test(l)&&!FAIL.test(l)).slice(0,6).forEach(l=>console.log('        [info] '+l.slice(0,220)));
  }
}
console.log('\nfalhas: '+fails);
process.exit(fails?1:0);
