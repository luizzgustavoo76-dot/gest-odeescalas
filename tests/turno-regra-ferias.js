const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
// 10 operadoras de caixa, regra 4 no 1º e 6 no 2º; uma de férias na semana 1
await A.evaluate(()=>{state.baseMonday='2026-11-23';for(let i=0;i<4;i++){state.selectedWeek=i;setActive(10);const w=week();while(w.shifts.length>2)w.shifts.pop();w.employees.forEach(e=>{e.station='caixa';e.shift=0})}
 state.selectedWeek=0;sector().postShifts={caixa:[4,6]};applyPostPlan(true);
 const r=roster();r[0].aus=[{de:iso(date('domingo',0)),ate:iso(date('sábado',0)),tipo:'ferias'}];applyPostPlan(true);modoAjuste=true;render()});
const cnt=()=>A.evaluate(()=>sector().weeks.map((w,wi)=>[0,1].map(s=>w.employees.filter(e=>e.station==='caixa'&&e.shift===s&&!foraSemana(e,wi)).length)));
const c0=await cnt();
T('semana com férias reparte a regra 4/6 entre 9',JSON.stringify(c0[0])==='[4,5]'&&JSON.stringify(c0[1])==='[4,6]',JSON.stringify(c0));
T('a tabela mostra a regra do rodízio',/regra do rodízio: 4/.test(await A.evaluate(()=>document.querySelector('#offAnalysis .oa-turnos').innerText)));
await A.evaluate(()=>{toastErroEm=0;document.querySelector('#offAnalysis [data-oa="turno"][data-post="caixa"][data-turno="0"][data-dl="-1"]').click()});await A.waitForTimeout(300);
const c1=await cnt();
T('−1 no 1º turno (semana com férias) passa 1 para o 2º',JSON.stringify(c1[0])==='[3,6]'&&JSON.stringify(c1[1])==='[3,7]',JSON.stringify(c1));
T('a regra do rodízio vira 3/7',await A.evaluate(()=>JSON.stringify(sector().postShifts.caixa)==='[3,7]'));
await A.evaluate(()=>document.querySelector('#offAnalysis [data-oa="turno"][data-post="caixa"][data-turno="1"][data-dl="-1"]').click());await A.waitForTimeout(300);
T('−1 no 2º volta para 4/6',await A.evaluate(()=>JSON.stringify(sector().postShifts.caixa)==='[4,6]'));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
