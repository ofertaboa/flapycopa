// Rebase do espelho. Idempotente e capaz de trocar de base.
//   node tools\rebase.js                 -> aplica/repoe a base de tools\base.js
//   node tools\rebase.js --base=/flapycopa
//   node tools\rebase.js --base=          -> remove o prefixo (raiz: Netlify/VPS)
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ORIGIN='https://flapycopa.tanoclique.com';
const TK='\u0000'; // marcador de base durante a reescrita

function norm(b){b=String(b||'');if(b&&!b.startsWith('/'))b='/'+b;return b.replace(/\/+$/,'');}
const CUR=norm(require('./base'));
let NEW=CUR;
const a=process.argv.find(x=>x.startsWith('--base='));
if(a)NEW=norm(a.slice(7));

const files=[];
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(['tools','.git','node_modules'].includes(f.name))continue;walk(p);continue;}
 if(/\.(html|css|js|mjs|json|toml|md|bat|webmanifest)$/i.test(f.name)||f.name==='_redirects')files.push(p);}})(ROOT);

// correcoes pontuais -> emitem TK (a base nova entra no passo final)
const FIX=[
  // quebrado no origem tambem (404 la)
  ["background-image: url('/public/img/coin.png'); /* fallback or standard shape */", ""],
  [ORIGIN+'/uploads/teams/favicon_1783089187.png', TK+'/vendor/flagcdn/w40/br.png'],
  ['type="image/x-icon" href="'+TK+'/vendor/flagcdn/w40/br.png"', 'type="image/png" href="'+TK+'/vendor/flagcdn/w40/br.png"'],
  ['<img src="'+ORIGIN+'/uploads/teams/banner_promo_1783089187.png" alt="Promo&ccedil;&atilde;o">', ''],
  // dev-URL quebrada -> asset ja baixado
  ['http://passarinho.test/uploads/teams/team_argentina_1783039373.png', TK+'/uploads/teams/team_argentina_1783039373.png'],
  // externos -> locais
  ['https://cdn.jsdelivr.net/npm/disable-devtool', TK+'/vendor/disable-devtool.js'],
  ['https://flagcdn.com/w40/ar.png', TK+'/vendor/flagcdn/w40/ar.png'],
  ['https://flagcdn.com/w40/br.png', TK+'/vendor/flagcdn/w40/br.png'],
  ['https://flagcdn.com/w40/de.png', TK+'/vendor/flagcdn/w40/de.png'],
  ['https://flagcdn.com/w40/es.png', TK+'/vendor/flagcdn/w40/es.png'],
  ['https://flagcdn.com/w40/fr.png', TK+'/vendor/flagcdn/w40/fr.png'],
  ['https://flagcdn.com/w40/pt.png', TK+'/vendor/flagcdn/w40/pt.png'],
  ['https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap', TK+'/vendor/fonts/poppins.css'],
  ['<link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n', ''],
  ['<link rel="preconnect" href="https://fonts.googleapis.com">\r\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\r\n', ''],
  // API -> origem (CORS: *)
  ["fetch('/api/", "fetch('"+ORIGIN+"/api/"],
  ["fetch(`/api/", "fetch(`"+ORIGIN+"/api/"],
  ['href="/api/', 'href="'+ORIGIN+'/api/'],
  ['src="/api/', 'src="'+ORIGIN+'/api/'],
];

let changed=0;
const DOCS=/\.(toml|md|bat)$/i;
for(const p of files){
  const rel=path.relative(ROOT,p);
  const before=fs.readFileSync(p,'utf8');
  let v=before;

  // arquivos de apoio (docs/scripts de build): troca de base textual simples
  if(DOCS.test(p)||path.basename(p)==='_redirects'){
    v=v.replace(/https?:\/\/localhost:%PORT%[^\s"']*/g,'http://localhost:%PORT%'+(NEW||'')+'/');
    if(CUR)v=v.split(CUR).join(TK);
    v=v.split(TK).join(NEW);
    if(v!==before){fs.writeFileSync(p,v);changed++;console.log('PATCH  '+rel);}
    continue;
  }

  // 1) tokeniza a base atual
  if(CUR){
    v=v.split(CUR+'/').join(TK+'/');
    v=v.replace(new RegExp(CUR.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=["\'`])','g'),TK);
  }
  // 2) correcoes pontuais
  for(const [x,y] of FIX) if(x!==y&&v.includes(x)) v=v.split(x).join(y);
  // 3) caminhos absolutos que ainda nao tem base -> ganham TK
  v=v.replace(/(\b(?:href|src|action|poster)\s*=\s*")(\/[^"]*)/g,(m,pre,rest)=>{
    if(rest.startsWith('//')||rest.startsWith(TK)||rest.startsWith('/api/'))return m;
    return pre+TK+rest;
  });
  v=v.replace(/(url\(\s*['"]?)(\/[^'")]+)/g,(m,pre,rest)=>{
    if(rest.startsWith('//')||rest.startsWith(TK)||rest.startsWith('/api/'))return m;
    return pre+TK+rest;
  });
  v=v.replace(/(\b(?:window\.)?location\.(?:href|assign|replace)\s*=\s*['"`])(\/[^'"`]*)/g,(m,pre,rest)=>{
    if(rest.startsWith('//')||rest.startsWith(TK))return m;
    return pre+TK+rest;
  });
  v=v.replace(/(content\s*=\s*"0;\s*url=)(\/[^"]*)/g,(m,pre,rest)=>{
    if(rest.startsWith('//')||rest.startsWith(TK))return m;
    return pre+TK+rest;
  });
  // 3b) string literals de caminho em JS/HTML (bird:'/img/x.png', gif:'/x.gif'...)
  if(!/\.css$/i.test(p)){
    const EXT='png|jpe?g|gif|svg|ico|webp|bmp|avif|mp4|webm|mov|m3u8|mpd|mp3|ogg|wav|m4a|woff2?|ttf|otf|css|js|mjs|json|html|txt|xml';
    const lit=new RegExp('(["\'`])((?:\\\\)?/)([^"\'`]*?\\.(?:'+EXT+')(?:\\?[^"\'`]*)?)\\1','g');
    v=v.replace(lit,(m,q,sl,rest)=>{
      let u=(sl+rest).replace(/\\\//g,'/');   // normaliza escapes de barra
      if(u.startsWith('//'))return m;                                   // regex literal
      if(u.startsWith('/api/'))return m;                                // API
      if(CUR&&u.startsWith(CUR+'/'))u=TK+u.slice(CUR.length);           // troca a base antiga
      else if(NEW&&u.startsWith(NEW+'/'))return m;                      // ja esta com a base certa
      else if(u.startsWith('/'))u=TK+u;                                 // sem base -> adiciona
      else return m;
      return q+u+q;
    });
  }
  v=v.split(TK).join(NEW);
  if(v.includes(TK)){console.log('ATENCAO token sobrou em '+rel);}

  if(v!==before){fs.writeFileSync(p,v);changed++;console.log('PATCH  '+rel);}
}
console.log('\nCUR='+JSON.stringify(CUR)+'  NEW='+JSON.stringify(NEW)+'  alterados='+changed+'/'+files.length);
