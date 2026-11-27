const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
const chk=()=>A.evaluate(()=>{const ws=sector().weeks;const n=ws[0].employees.length;const r=[];for(let i=0;i<n;i++){const f=ws.map(w=>!!w.employees[i].sundayWork);const c=f.filter(Boolean).length;const seg=f.some((v,k)=>k<3&&v&&f[k+1]);if(c>2||seg)r.push(roster()[i].name+':'+f.map(Number).join(''))}return r});
// 1) função direta: pessoa 0 em 3 domingos (1 seguido) e outras 5 domingos por semana
await A.evaluate(()=>{for(let i=0;i<4;i++){state.selectedWeek=i;setActive(12)}state.selectedWeek=0;const ws=sector().weeks;ws.forEach(w=>{normalizeWeek(w);w.employees.forEach(e=>{e.sundayWork=false;e.offDays=['sexta']})});
 [[0,1,2,3],[0,4,5,6],[0,7,8,9],[1,2,10,11]].forEach((l,wi)=>l.forEach(i=>ws[wi].employees[i].sundayWork=true));});
const antes=await chk();
T('situação de teste tem gente com 3 domingos / domingos seguidos',antes.length>0,antes.join(' | '));
const r=await A.evaluate(()=>{const c=corrigirDomingos(0);return c});
const dep=await chk();
T('corrigirDomingos deixa todos com ao menos 2 domingos de folga e sem domingos seguidos',dep.length===0,dep.join(' | ')+' / '+JSON.stringify(r));
T('a quantidade de gente por domingo não mudou',JSON.stringify(await A.evaluate(()=>sector().weeks.map(w=>w.employees.filter(e=>e.sundayWork).length)))==='[4,4,4,4]');
T('a semana base (1) não foi alterada',await A.evaluate(()=>sector().weeks[0].employees.filter(e=>e.sundayWork).map(e=>roster()[sector().weeks[0].employees.indexOf(e)].name).length===4));
// 2) botão "Completar as 4 semanas" já entrega sem erro de domingo
await A.evaluate(()=>{for(let i=0;i<4;i++){state.selectedWeek=i;setActive(12)}const ws=sector().weeks;ws.forEach((w,i)=>{normalizeWeek(w);w.employees.forEach(e=>{e.sundayWork=false})});state.selectedWeek=0;ws[0].employees.forEach((e,i)=>{e.offDays=['sexta'];if(i<5)e.sundayWork=true});render()});
await A.click('[data-complete]');await A.waitForTimeout(500);
const ask=await A.$('.ask-actions [data-a="1"]');if(ask){await A.click('.ask-actions [data-a="1"]');await A.waitForTimeout(500)}
T('Completar as 4 semanas não deixa ninguém com menos de 2 domingos de folga',(await chk()).length===0,(await chk()).join(' | '));
const erros=await A.evaluate(()=>compliance().filter(x=>/só tem|domingos seguidos/.test(x.text)&&x.level==='erro').map(x=>x.text));
T('painel sem erro de mínimo de 2 domingos de folga nem domingos seguidos',erros.length===0,erros.join(' | '));
// 3) botão Corrigir no aviso do painel
await A.evaluate(()=>{const ws=sector().weeks;ws.forEach(w=>w.employees.forEach(e=>e.sundayWork=false));[[0,1,2,3],[0,4,5,6],[0,7,8,9],[1,2,10,11]].forEach((l,wi)=>l.forEach(i=>ws[wi].employees[i].sundayWork=true));render()});
const btn=await A.$$eval('.finding',els=>els.filter(x=>/só tem 1 domingo|dois domingos seguidos/.test(x.innerText)).map(x=>!!x.querySelector('.fix-btn')));
T('aviso de domingo da CCT tem botão Corrigir',btn.length>0&&btn.every(Boolean),JSON.stringify(btn));
await A.evaluate(()=>{const f=[...document.querySelectorAll('.finding')].find(x=>/só tem 1 domingo|dois domingos seguidos/.test(x.innerText));f.querySelector('.fix-btn').click()});await A.waitForTimeout(400);
T('clicar em Corrigir resolve os avisos',(await chk()).length===0&&!(await A.evaluate(()=>compliance().some(x=>/só tem|domingos seguidos/.test(x.text)))),(await chk()).join(' | '));
T('Desfazer fica disponível',await A.evaluate(()=>!!(state.undo&&state.undo[state.selectedSector])));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
