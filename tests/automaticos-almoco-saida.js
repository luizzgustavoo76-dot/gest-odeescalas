const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
const W=ms=>A.waitForTimeout(ms);
T('os dois automáticos vêm ligados',await A.evaluate(()=>{const c=[...document.querySelectorAll('[data-autoflag]')];return c.length===2&&c.every(x=>x.checked)}));
// ordem ao adicionar turnos
for(const n of [4,5]){await A.evaluate(n=>{setShiftCount(n)},n);
 const r=await A.evaluate(()=>week().shifts.map(s=>[s.name,s.start,s.lunchStart]));
 const ord=r.every((x,i)=>i===0||x[1]>=r[i-1][1]);const nomes=r.every((x,i)=>x[0]===(i+1)+'º turno');
 T(n+' turnos: entradas em ordem e nomes na sequência',ord&&nomes,JSON.stringify(r));
 T(n+' turnos: sem buraco de cobertura',await A.evaluate(()=>gapOf(week())===null));}
// tolerância de 5 min no 2º turno
await A.evaluate(()=>{setShiftCount(2)});
await A.evaluate(()=>{const w=week();w.shifts[0].lunchStart='11:00';w.shifts[0].lunchEnd='13:00';render()});
await A.evaluate(()=>{const e=document.querySelector('[data-shift="1"][data-field=lunchStart]');e.value='12:56';e.dispatchEvent(new Event('change',{bubbles:true}))});await W(200);
T('2º turno pode sair 4 min antes do retorno do 1º (tolerância)',await A.evaluate(()=>week().shifts[1].lunchStart==='12:56'),await A.evaluate(()=>week().shifts[1].lunchStart));
await A.evaluate(()=>{const e=document.querySelector('[data-shift="1"][data-field=lunchStart]');e.value='12:30';e.dispatchEvent(new Event('change',{bubbles:true}))});await W(200);
T('mais cedo que isso volta para o retorno do 1º',await A.evaluate(()=>week().shifts[1].lunchStart==='13:00'));
// desligar almoço automático: não recascateia
await A.evaluate(()=>setShiftCount(3));
await A.evaluate(()=>document.querySelector('[data-autoflag=autoAlmoco]').click());await W(200);
const antes=await A.evaluate(()=>week().shifts.map(s=>s.lunchStart));
await A.evaluate(()=>{const e=document.querySelector('[data-shift="0"][data-field=lunchStart]');e.value='10:30';e.dispatchEvent(new Event('change',{bubbles:true}))});await W(200);
const dep=await A.evaluate(()=>week().shifts.map(s=>s.lunchStart));
T('com almoço manual, mexer no 1º não move os outros',dep[1]===antes[1]&&dep[2]===antes[2]&&dep[0]==='10:30',JSON.stringify([antes,dep]));
// saída manual
await A.evaluate(()=>document.querySelector('[data-autoflag=autoSaida]').click());await W(200);
T('saída fica editável com o automático desligado',await A.evaluate(()=>!document.querySelector('[data-shift="0"][data-field=end]').disabled));
await A.evaluate(()=>{const e=document.querySelector('[data-shift="0"][data-field=end]');e.value='16:00';e.dispatchEvent(new Event('change',{bubbles:true}))});await W(200);
T('saída manual é guardada',await A.evaluate(()=>week().shifts[0].end==='16:00'));
await A.evaluate(()=>document.querySelector('[data-autoflag=autoSaida]').click());await W(200);
T('religar recalcula a saída',await A.evaluate(()=>week().shifts[0].end!=='16:00'));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
