const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
function show(kw,before,after,n){
  let x=0,k=0;
  while((x=idx.indexOf(kw,x))>=0&&k<(n||1)){
    console.log('\n=== '+kw+' @'+x+' ===');
    console.log(idx.slice(Math.max(0,x-before),x+after));
    x+=kw.length;k++;
  }
  if(!k)console.log('\n=== '+kw+' [NAO ACHOU] ===');
}
show('function updateCurrentUserUI',0,2200);
show('function syncHeroSaldoUI',0,900);
show('function refreshAuthenticatedUser',0,700);
