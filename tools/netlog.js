// Roda o Chrome com --log-net-log e reporta requisicoes com erro/status >= 400.
// Uso:  node tools\netlog.js <url> [--all]
const {spawnSync}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url=process.argv[2];
if(!url){console.log('uso: node tools\\netlog.js <url> [--all]');process.exit(2);}
const tmp=path.join(os.tmpdir(),'netlog_'+Date.now()+'.json');
spawnSync(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--virtual-time-budget=20000',
  '--log-net-log='+tmp,'--net-log-capture-mode=IncludeSensitive','--dump-dom',url],
  {encoding:'utf8',timeout:240000,maxBuffer:64*1024*1024});
if(!fs.existsSync(tmp)){console.log('netlog nao gerado');process.exit(1);}
const log=JSON.parse(fs.readFileSync(tmp,'utf8'));
const C=log.constants||{};
const ev=(C.eventTypes||[]).map(x=>x&&x.name);
const events=log.events||[];
const byId={};
for(const e of events){
  const id=e.source&&e.source.id;if(id==null)continue;
  const s=byId[id]||(byId[id]={id,name:(ev[e.type]||'')+''});
  const p=e.params||{};
  if(typeof p.url==='string')s.url=p.url;
  if(p.url_request&&typeof p.url_request.url==='string')s.url=p.url_request.url;
  if(Array.isArray(p.headers)){
    const first=String(p.headers[0]||'');
    if(/^HTTP\/\d/.test(first)){const m=/^HTTP\/\d(?:\.\d)?\s+(\d{3})/.exec(first);if(m)s.status=+m[1];}
    if(/^(GET|HEAD|POST|OPTIONS)\s/.test(first))s.req=first;
  }
  if(p.status!=null&&typeof p.status==='number')s.status=p.status;
  if(typeof p.net_error==='number'&&p.net_error!==0)s.net_error=p.net_error;
}
const rows=Object.values(byId).filter(s=>s.url&&/^https?:/.test(s.url));
const seen=new Set(),all=[];
for(const s of rows){const k=s.url.split('#')[0];if(seen.has(k))continue;seen.add(k);all.push(s);}
const bad=all.filter(s=>(s.status&&s.status>=400)||s.net_error);
console.log('requisicoes: '+all.length);
console.log('\n=== FALHAS ===');
if(!bad.length)console.log('(nenhuma)');
for(const s of bad)console.log((s.status||('net:'+s.net_error))+'  '+s.url);
fs.unlinkSync(tmp);
if(process.argv.includes('--all')){
  console.log('\n=== TODAS ===');
  all.forEach(s=>console.log((s.status||s.net_error||'   ?')+'  '+s.url));
}
