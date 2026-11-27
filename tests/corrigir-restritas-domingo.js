const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
// restrita no último turno
await A.evaluate(()=>{setActive(12);const w=week();roster()[0].restricted=true;render();week().employees[0].shift=2;render()});
let txt=await A.evaluate(()=>document.getElementById('compliancePanel').innerText);
T('alerta de restrição tem botão Corrigir',await A.evaluate(()=>[...document.querySelectorAll('#compliancePanel .finding')].some(f=>/restrição/.test(f.textContent)&&f.querySelector('[data-fix]'))));
await A.evaluate(()=>{const f=[...document.querySelectorAll('#compliancePanel .finding')].find(f=>/restrição/.test(f.textContent));f.querySelector('[data-fix]').click()});await A.waitForTimeout(400);
T('corrigiu: restrita foi para o 1º turno',await A.evaluate(()=>week().employees[0].shift===0));
// domingo com saída depois do limite
await A.evaluate(()=>{const w=week();w.employees[1].sundayWork=true;w.sunday.end='23:00';render()});
T('alerta de domingo tem Corrigir',await A.evaluate(()=>[...document.querySelectorAll('#compliancePanel .finding')].some(f=>/domingo/.test(f.textContent)&&f.querySelector('[data-fix]'))));
await A.evaluate(()=>{const f=[...document.querySelectorAll('#compliancePanel .finding')].find(f=>/domingo/.test(f.textContent)&&f.querySelector('[data-fix]'));f.querySelector('[data-fix]').click()});await A.waitForTimeout(400);
T('corrigiu: domingo dentro do limite',await A.evaluate(()=>mins(week().sunday.end)<=mins(state.settings.sundayClose),await A.evaluate(()=>week().sunday.end)));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
