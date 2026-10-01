const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const jog=fs.readFileSync(path.join(ROOT,'jogar','index.html'),'utf8');

let i=idx.indexOf("if (ctx.state === 'suspended')");
console.log('=== resume no index ===');
console.log(i>=0? idx.slice(i-80,i+750):'NAO ACHOU');

console.log('\n=== chamadas de som no jogar ===');
for(const k of ['playSomFlap','playSomPonto','playSomQueda']){
  let x=0,n=0; const out=[];
  while((x=jog.indexOf(k,x))>=0&&n<15){
    const line=jog.slice(Math.max(0,jog.lastIndexOf('\n',x)+1), jog.indexOf('\n',x));
    out.push(line.trim().slice(0,160)); x+=k.length; n++;
  }
  console.log('-- '+k+' ('+n+')');
  out.forEach(l=>console.log('     '+l));
}
console.log('\nresume no jogar: '+(jog.match(/resume/g)||[]).length);
console.log('suspended no jogar: '+(jog.match(/suspended/g)||[]).length);

// onde o jogo comeca (gesto do usuario?)
console.log('\n=== startGame / pointerdown no jogar ===');
for(const k of ['function startGame','function beginGame','pointerdown','addEventListener(\'click\'','gesture','btn-start','start-btn']){
  let x=jog.indexOf(k);
  console.log((x>=0?'ACHOU ':'falta ')+k+(x>=0?' @'+x:''));
}
