// Rebaixa o HTML bruto do origem (usado para refazer o rebase do zero).
// Uso:  node tools\refetch.js
const fs=require('fs'),path=require('path');
const ORIGIN='https://flapycopa.tanoclique.com';
const ROOT=path.join(__dirname,'..');
const PAGES=[['/','index.html'],['/jogar','jogar/index.html']];
(async()=>{
  for(const [route,dest] of PAGES){
    const r=await fetch(ORIGIN+route,{signal:AbortSignal.timeout(60000)});
    if(r.status!==200)throw new Error(route+' -> '+r.status);
    const buf=Buffer.from(await r.arrayBuffer());
    const p=path.join(ROOT,dest);
    fs.mkdirSync(path.dirname(p),{recursive:true});
    fs.writeFileSync(p,buf);
    console.log('BAIXOU '+String(buf.length).padStart(8)+'  '+dest+'   <- '+ORIGIN+route);
  }
})();
