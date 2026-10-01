// Baixa para dentro do projeto tudo que hoje vem de fora, e o que existe no
// origem mas nao foi espelhado. Idempotente.
// Uso:  node tools\vendor.js [--dry]
const fs=require('fs'),path=require('path');
const netfetch=globalThis.fetch;
const ROOT=path.join(__dirname,'..');
const ORIGIN='https://flapycopa.tanoclique.com';
const DRY=process.argv.includes('--dry');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

function save(rel,buf){
  const p=path.join(ROOT,rel.replace(/^\/+/,''));
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,buf);
  return p;
}
async function get(url,opts){
  const r=await netfetch(url,{headers:Object.assign({'user-agent':UA},(opts&&opts.headers)||{}),signal:AbortSignal.timeout(60000),redirect:'follow'});
  if(!r.status===200){}
  if(r.status!==200)throw new Error(url+' -> '+r.status);
  return{buf:Buffer.from(await r.arrayBuffer()),ct:r.headers.get('content-type')||'',url:r.url};
}
const jobs=[
  // existentes no origem mas fora do espelho
  {url:ORIGIN+'/uploads/teams/team_argentina_1783039373.png', dest:'uploads/teams/team_argentina_1783039373.png'},
  {url:ORIGIN+'/img/flapbird/birds/bird-argentina.png',       dest:'img/flapbird/birds/bird-argentina.png'},
  // externos -> locais
  {url:'https://flagcdn.com/w40/ar.png', dest:'vendor/flagcdn/w40/ar.png'},
  {url:'https://flagcdn.com/w40/br.png', dest:'vendor/flagcdn/w40/br.png'},
  {url:'https://flagcdn.com/w40/de.png', dest:'vendor/flagcdn/w40/de.png'},
  {url:'https://flagcdn.com/w40/es.png', dest:'vendor/flagcdn/w40/es.png'},
  {url:'https://flagcdn.com/w40/fr.png', dest:'vendor/flagcdn/w40/fr.png'},
  {url:'https://flagcdn.com/w40/pt.png', dest:'vendor/flagcdn/w40/pt.png'},
  {url:'https://cdn.jsdelivr.net/npm/disable-devtool', dest:'vendor/disable-devtool.js'},
];

(async()=>{
  let ok=0,fail=0;
  for(const j of jobs){
    const local=path.join(ROOT,j.dest);
    if(fs.existsSync(local)&&fs.statSync(local).size>0){console.log('ja existe  '+j.dest+'  ('+fs.statSync(local).size+')');ok++;continue;}
    if(DRY){console.log('baixaria   '+j.url+' -> '+j.dest);continue;}
    try{
      const r=await get(j.url);
      save(j.dest,r.buf);
      console.log('BAIXOU     '+r.buf.length+'  '+j.dest+'   <- '+j.url);
      ok++;
    }catch(e){console.log('FALHOU     '+e.message);fail++;}
  }

  // Google Fonts: CSS + woff2 locais
  const fontCss=fs.join?null:null;
  const cssPath=path.join(ROOT,'vendor/fonts/poppins.css');
  if(!fs.existsSync(cssPath)&&!DRY){
    try{
      const url='https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap';
      const r=await get(url);
      let css=r.buf.toString('utf8');
      const urls=[...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map(m=>m[1]))];
      console.log('fontes: '+urls.length+' arquivo(s)');
      for(const u of urls){
        const name=u.split('/').pop().split('?')[0];
        const fr=await get(u);
        save('vendor/fonts/'+name,fr.buf);
        css=css.split(u).join('./'+name);
      }
      save('vendor/fonts/poppins.css',Buffer.from(css,'utf8'));
      console.log('BAIXOU     vendor/fonts/poppins.css + '+urls.length+' woff2');
      ok++;
    }catch(e){console.log('FALHOU fonts '+e.message);fail++;}
  }else if(fs.existsSync(cssPath)){console.log('ja existe  vendor/fonts/poppins.css');ok++;}

  console.log('\nok='+ok+'  falhas='+fail+(DRY?'  (dry)':''));
  process.exit(fail?1:0);
})();
