const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
T('só 2 botões de preencher + 1 de sugerir folgas',await A.evaluate(()=>!!document.querySelector('[data-complete]')&&!!document.querySelector('[data-replicate="all"]')&&!!document.querySelector('[data-suggest-off]')&&!document.querySelector('[data-replicate="team"],[data-replicate="pdvs"],[data-suggest-off-all],[data-suggest-sundays]')));
const clica=()=>A.evaluate(()=>{document.getElementById('toast').hidden=true;toastErroEm=0;document.querySelector('[data-complete]').click()});
const info=()=>A.evaluate(()=>{const W=sector().weeks,m=state.settings;
 const dom=W.map(w=>w.employees.map(e=>e.sundayWork?1:0));
 const n=W[0].employees.length;
 return {sel:state.selectedWeek,n,iguais:W.every(w=>w.employees.length===n&&w.employees.every((e,i)=>e.name===W[0].employees[i].name&&e.shift===W[0].employees[i].shift&&e.station===W[0].employees[i].station&&e.pdv===W[0].employees[i].pdv)),
  seguidos:dom[0].some((_,i)=>[0,1,2].some(k=>dom[k][i]&&dom[k+1][i])),
  folgasDom:dom[0].map((_,i)=>dom.filter(d=>!d[i]).length),
  qt:dom.map(d=>d.reduce((a,b)=>a+b,0)),
  folgOk:W.every(w=>w.employees.every(e=>e.offDays.length===(w.model==='6x1'?(e.sundayWork?1:0):(e.sundayWork?2:1)))),
  postos:W.map(w=>sundayPosts().every(p=>w.employees.some(e=>e.sundayWork&&e.station===p))),
  erros:compliance().filter(x=>x.level==='erro').map(x=>x.text.slice(0,90)),
  toast:document.getElementById('toast').textContent.slice(0,90),tbg:document.getElementById('toast').style.background}});
await A.evaluate(()=>{setActive(12);const ps=sundayPosts();ps.filter(p=>p!=='caixa').forEach((p,k)=>{[8+2*k,9+2*k].forEach(i=>{roster()[i].station=p;week().employees[i].station=p})});render()});
// sem domingos marcados → o app escolhe
for(const model of ['5x2','6x1']){
 await A.evaluate((m)=>{state.baseMonday='2026-11-08';state.selectedWeek=0;setActive(12);week().model=m;week().employees.forEach(e=>{e.sundayWork=false;e.offDays=[]});sector().weeks.slice(1).forEach(w=>{w.employees=[]});},model);
 await clica();await A.waitForTimeout(400);
 const r=await info();
 T(model+': equipe das 4 semanas igual à Semana 1',r.iguais&&r.n===12,JSON.stringify(r.sel));
 T(model+': app escolheu domingos (quantidade por semana: '+r.qt+')',r.qt.every(q=>q>=1)&&r.qt[0]<=6);
 T(model+': ninguém trabalha dois domingos seguidos',!r.seguidos);
 T(model+': todos com pelo menos 2 domingos de folga no mês',r.folgasDom.every(x=>x>=2),r.folgasDom.join(','));
 T(model+': folgas certas nas 4 semanas',r.folgOk);
 T(model+': posto obrigatório coberto no domingo',r.postos.every(Boolean));
 T(model+': toast de pronto (verde)',/Pronto|completadas/.test(r.toast)&&r.tbg!=='',r.toast);
}
// domingos já marcados pelo usuário são mantidos; estando na semana 3
await A.evaluate(()=>{state.selectedWeek=0;week().model='5x2';const ks=sundayPosts();week().employees.forEach((e,i)=>e.sundayWork=false);[0,2,4,6].forEach(i=>week().employees[i].sundayWork=true);
 ks.forEach(p=>{if(!week().employees.some(e=>e.sundayWork&&e.station===p)){const c=week().employees.find(e=>e.station===p);if(c)c.sundayWork=true}});state.selectedWeek=0;render()});
const marc=await A.evaluate(()=>sector().weeks[0].employees.map(e=>e.sundayWork?1:0).join(''));
await clica();await A.waitForTimeout(400);
const r2=await info();
T('com a Semana 1 aberta: ela é a base e a tela continua na semana 1',r2.sel===0&&r2.iguais);
T('domingos marcados na Semana 1 foram mantidos',await A.evaluate(()=>sector().weeks[0].employees.map(e=>e.sundayWork?1:0).join(''))===marc);
T('sem domingos seguidos nem alertas de erro',!r2.seguidos&&r2.erros.length===0,r2.erros.join(' | '));
// remover do domingo
await A.evaluate(()=>{state.selectedWeek=0;render();document.getElementById('toast').hidden=true;toastErroEm=0});
const antesD=await A.evaluate(()=>({n:sundayWorkers().length,bt:document.querySelectorAll('#sundaySchedule [data-sun-rem]').length,nome:sundayWorkers().filter(e=>e.station==='caixa').pop().name}));
T('escala de domingo tem um botão Remover por colaboradora',antesD.bt===antesD.n&&antesD.n>0,antesD.bt+'/'+antesD.n);
await A.evaluate((nome)=>{const i=week().employees.findIndex(e=>e.name===nome);document.querySelector('#sundaySchedule [data-sun-rem="'+i+'"]').click()},antesD.nome);await A.waitForTimeout(200);
const depD=await A.evaluate((nome)=>{const e=week().employees.find(x=>x.name===nome);return {n:sundayWorkers().length,dom:e.sundayWork,offs:e.offDays.length,need:week().model==='6x1'?0:1,t:document.getElementById('toast').textContent,linhas:document.querySelectorAll('#sundaySchedule tbody tr').length}},antesD.nome);
T('Remover tira a pessoa do domingo e refaz as folgas dela',depD.n===antesD.n-1&&!depD.dom&&depD.offs===depD.need&&depD.linhas===depD.n,JSON.stringify(depD));
T('aviso de removida aparece',/removida do domingo/.test(depD.t),depD.t.slice(0,90));
// impressão: sem botão Remover e sem número da semana
const imp=await A.evaluate(async()=>{const h=await buildPrintHtml(false);return {rem:/Remover|data-sun-rem/.test(h),sem:/Semana \d/.test(h),data:h.includes(range()),linhasDom:(h.split('class="sun"')[1]||'').split('<tr>').length-2,n:sundayWorkers().length}});
T('impressão não mostra o botão Remover',!imp.rem&&imp.linhasDom===imp.n,JSON.stringify(imp));
T('impressão mostra só as datas, sem "Semana N"',!imp.sem&&imp.data);
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
