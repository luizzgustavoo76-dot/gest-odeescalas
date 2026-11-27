const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
for(const k of ['padaria','horti-fruit','acougue-frios','loja-deposito','frente-caixa','padaria']){
 await A.selectOption('#sectorSelect',k);await A.waitForTimeout(400);
 const r=await A.evaluate(()=>({s:state.selectedSector,v:document.getElementById('sectorSelect').value,t:document.getElementById('mainTitle').textContent}));
 T('trocar para '+k+' pelo seletor',r.s===k&&r.v===k&&r.t.includes(SECTOR_NAME(k)),JSON.stringify(r));
}
function SECTOR_NAME(k){return {'padaria':'Padaria','horti-fruit':'Horti Fruit','acougue-frios':'Açougue e Frios','loja-deposito':'Loja e Depósito','frente-caixa':'Frente de Caixa'}[k]}
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
