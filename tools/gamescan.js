const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const jog=fs.readFileSync(path.join(ROOT,'jogar','index.html'),'utf8');
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
function show(t,label,kw,before,after){
  let x=t.indexOf(kw);
  console.log('\n=== '+label+' : '+kw+(x>=0?' @'+x:'  [NAO ACHOU]')+' ===');
  if(x>=0) console.log(t.slice(Math.max(0,x-before),x+after));
}
show(jog,'jogar','async function iniciarPartida',0,2000);
show(jog,'jogar','function loadConfigs',0,1600);
show(jog,'jogar','let isSoundOn',0,300);
show(jog,'jogar','somAtivo',0,300);
show(idx,'index','let isSoundOn',0,400);
show(idx,'index','isSoundOn =',0,400);
