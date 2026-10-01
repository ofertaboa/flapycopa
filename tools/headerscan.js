const fs=require('fs'),path=require('path');
const t=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ks=['id="top-name"','id="top-balance"','profile-summary-balance','id="profile-name"',
          'header-btn-3d-blue','Entrar Button','Balance & Fast PIX','guest-actions','auth-actions',
          'top-name','top-balance'];
for(const k of ks){const i=t.indexOf(k);console.log((i>=0?'ACHOU ':'falta  ')+k+(i>=0?' @'+i:''));}
const i=t.indexOf('Balance & Fast PIX');
console.log('\n=== bloco do header ===');
console.log(t.slice(i-150, i+2600));
