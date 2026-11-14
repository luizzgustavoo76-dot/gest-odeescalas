const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
// calendário
T('o domingo é o 1º dia da semana',await A.evaluate(()=>DAYS[0][0]==='domingo'&&DAYS[6][0]==='sábado'));
await A.evaluate(()=>{const el=document.getElementById('weekStart');el.value='2026-11-11';el.dispatchEvent(new Event('change',{bubbles:true}))});await A.waitForTimeout(200);
T('a data de referência é ajustada para o DOMINGO (qua 11/11 → dom 08/11)',await A.evaluate(()=>state.baseMonday==='2026-11-08'&&document.getElementById('weekStart').value==='2026-11-08'),await A.evaluate(()=>state.baseMonday));
T('domingo cai no início e sábado no fim da semana 1',await A.evaluate(()=>iso(date('domingo',0))==='2026-11-08'&&iso(date('sábado',0))==='2026-11-14'&&iso(date('domingo',1))==='2026-11-15'));
T('rótulo "Domingo de referência"',await A.evaluate(()=>/Domingo de referência/.test(document.querySelector('.week-picker label').textContent)));
// análise: primeira coluna é domingo
await A.evaluate(()=>{setActive(12);week().employees.forEach((e,i)=>e.sundayWork=i<5);suggestOffFor(week());render()});
T('tabelas começam no domingo (Cobertura e Análise)',await A.evaluate(()=>/dom/i.test(document.querySelector('#coverageBoardHead th:nth-child(2)').textContent)&&/dom/i.test(document.querySelector('#offAnalysis thead th:nth-child(2)').textContent)));
// 5x2
T('5x2: todas com 2 folgas (domingo conta)',await A.evaluate(()=>week().employees.every(e=>effOff(e).length===2)));
// 6x1 sem folga extra
await A.evaluate(()=>{week().model='6x1';suggestOffFor(week());render()});
const r6=await A.evaluate(()=>week().employees.map(e=>({d:e.sundayWork,n:e.offDays.length,t:effOff(e).length})));
T('6x1: quem trabalha no domingo tem 1 folga em dia útil',r6.filter(x=>x.d).every(x=>x.n===1&&x.t===1));
T('6x1: quem não trabalha no domingo tem só o domingo (sem folga extra)',r6.filter(x=>!x.d).every(x=>x.n===0&&x.t===1),JSON.stringify(r6.filter(x=>!x.d).slice(0,2)));
T('6x1: nenhum alerta de quantidade de folgas',await A.evaluate(()=>issues().filter(t=>/sem \d|folga/.test(t)&&!/domingo sem/.test(t)).length===0),await A.evaluate(()=>issues().join(' | ')));
await A.evaluate(()=>{week().model='5x2';suggestOffFor(week());render()});
// ciclo: continua com 28 dias
await A.evaluate(()=>{replicate('team');fillSundays();render()});
const ant=await A.evaluate(()=>state.baseMonday);await A.evaluate(()=>avancaCiclo());
T('avançar ciclo mantém o início no domingo (+28 dias)',await A.evaluate(a=>{const d=new Date(state.baseMonday+'T12:00:00');return d.getDay()===0&&Math.round((d-new Date(a+'T12:00:00'))/864e5)===28},ant));
// migração de conta antiga
const mig=await A.evaluate(()=>{state.settings.semanaDom=false;state.baseMonday='2026-11-09';sector().weeks.forEach(w=>w.employees.forEach(e=>{e.sundayWork=true;e.offDays=['sexta']}));
 const nomes=sector().weeks[0].employees.map(e=>e.name).join('|'),r=migraSemanaDomingo();
 return {r,base:state.baseMonday,flag:state.settings.semanaDom,dom:sector().weeks.every(w=>w.employees.every(e=>!e.sundayWork)),nomes:sector().weeks[0].employees.map(e=>e.name).join('|')===nomes,folgas:sector().weeks[0].employees.every(e=>effOff(e).length>=1)}});
T('conta antiga: migra uma única vez para domingo a sábado',mig.r&&mig.flag&&mig.base==='2026-11-08');
T('conta antiga: domingos limpos e nomes preservados',mig.dom&&mig.nomes);
T('conta antiga: não migra de novo',await A.evaluate(()=>migraSemanaDomingo()===false));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
