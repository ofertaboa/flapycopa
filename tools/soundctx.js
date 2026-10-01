const fs=require('fs'),path=require('path');
const j=fs.readFileSync(path.join(__dirname,'..','jogar','index.html'),'utf8');
function ctx(kw,before,after,idx){
  let x=idx!==undefined?idx:j.indexOf(kw);
  if(x<0){console.log('--- '+kw+': nao achou');return -1;}
  console.log('\n=== '+kw+' @'+x+' ===');
  console.log(j.slice(Math.max(0,x-before),x+after));
  return x;
}
ctx('function startGame',0,900);
let a=j.indexOf('playSomFlap();');
ctx('chamada playSomFlap',900,400,a);
let b=j.indexOf('playSomPonto();');
ctx('chamada playSomPonto',700,300,b);
let c=j.indexOf('playSomQueda();');
ctx('chamada playSomQueda',700,300,c);
ctx('pointerdown',500,700,39394);
