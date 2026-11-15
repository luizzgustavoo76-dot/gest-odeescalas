const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
const prep=()=>A.evaluate(()=>{state.selectedSector='frente-caixa';state.selectedWeek=0;setActive(12);const w=week();w.model='5x2';
 w.employees.forEach((e,i)=>{e.station='caixa';roster()[i].station='caixa'});
 [[0,'fiscal'],[1,'recepcao']].forEach(([i,k])=>{w.employees[i].station=k;roster()[i].station=k});
 w.employees.forEach((e,i)=>{e.offDays=['segunda','terça']});render();return {nso:noSameOff()}});
const p=await prep();
T('Fiscal e Recepção são o grupo "não folgam junto"',p.nso.includes('fiscal')&&p.nso.includes('recepcao'),JSON.stringify(p));
const sug=async()=>{await A.evaluate(()=>{balanceOffs(week(),false);render()});await A.waitForTimeout(200);return A.evaluate(()=>{const w=week();return [w.employees[0].offDays,w.employees[1].offDays]})};
for(const m of ['5x2','6x1']){await A.evaluate(m=>{setModel(m)},m);const o=await sug();
 T('sugestão '+m+': fiscal e recepcionista nunca folgam no mesmo dia',o[0].length+o[1].length>=0&&!o[0].some(d=>o[1].includes(d)),JSON.stringify(o))}
await A.evaluate(()=>setModel('5x2'));
// as 4 semanas
await A.evaluate(()=>{document.querySelector('[data-complete]').click()});await A.waitForTimeout(2500);
const all=await A.evaluate(()=>sector().weeks.map(w=>[w.employees[0].offDays,w.employees[1].offDays]));
T('nas 4 semanas também',all.every(o=>!o[0].some(d=>o[1].includes(d))),JSON.stringify(all));
// marcação manual
await A.evaluate(()=>{const w=week();w.employees[0].offDays=['quarta','quinta'];w.employees[1].offDays=['segunda'];render()});
await A.evaluate(()=>{toastErroEm=0;const el=document.querySelector('input[data-employee="1"][data-off="quarta"]');el.click()});await A.waitForTimeout(300);
const man=await A.evaluate(()=>({off:week().employees[1].offDays,t:document.getElementById('toast').textContent}));
T('marcar à mão o mesmo dia da outra é recusado',!man.off.includes('quarta')&&/já folga quarta/.test(man.t),JSON.stringify(man));
// alerta
await A.evaluate(()=>{const w=week();w.employees[1].offDays=['quarta','sexta'];render()});
const al=await A.evaluate(()=>document.getElementById('compliancePanel').textContent);
T('conformidade avisa folga conjunta de Fiscal e Recepção',/(Fiscal e Recepção|Recepção e Fiscal): mais de uma colaboradora de folga no mesmo dia/.test(al));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
