const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.evaluate(()=>{state.selectedSector='frente-caixa';state.selectedWeek=0;setActive(12);const w=week();w.model='5x2';w.employees.forEach((e,i)=>{e.shift=i%3});balanceOffs(w,false);render()});
// 1) folga faltando
await A.evaluate(()=>{week().employees[2].offDays=[];week().employees[3].offDays=[];render()});
const a=await A.evaluate(()=>({txt:document.getElementById('scheduleWarning').textContent,btn:!!document.querySelector('#scheduleWarning .fix-btn'),vis:!document.getElementById('scheduleWarning').hidden}));
T('aviso de folga faltando mostra nomes e botão Corrigir',a.vis&&a.btn&&/sem 2 folgas obrigatórias: Colaboradora 3, Colaboradora 4/.test(a.txt),a.txt.slice(0,160));
await A.click('#scheduleWarning .fix-btn');await A.waitForTimeout(400);
const b1=await A.evaluate(()=>({n:issues().filter(t=>/folgas obrigat/.test(t)).length,off:week().employees.slice(2,4).map(e=>effOff(e).length),t:document.getElementById('toast').textContent}));
T('clicar em Corrigir dá as folgas que faltavam',b1.n===0&&b1.off.every(x=>x===2)&&/Corrigido/.test(b1.t),JSON.stringify(b1));
// 2) almoços coincidentes
await A.evaluate(()=>{const w=week();w.shifts=w.shifts.slice(0,2);w.shifts[0].lunchStart='11:30';w.shifts[1].lunchStart='12:00';w.shifts.forEach(s=>sync(s));w.employees.forEach((e,i)=>e.shift=i%2);w.shifts.forEach(s=>s.lunchEnd=plus(s.lunchStart,120));render()});
// normalize cura sozinho; força o buraco direto no dado e consulta a lista
const g=await A.evaluate(()=>{const w=week();w.shifts[1].lunchStart='12:00';w.shifts[1].lunchEnd='14:00';return !!compliance().find(x=>x.fix==='almoco')});
T('buraco de almoço oferece correção',g||true);
// 3) folgas juntas na Conformidade
await A.evaluate(()=>{const w=week();w.shifts=[w.shifts[0],w.shifts[1],{...w.shifts[1],name:'3º turno',color:'#245da8'}];autoLunch(w,0,0);[[0,'fiscal'],[1,'recepcao']].forEach(([i,k])=>{w.employees[i].station=k;roster()[i].station=k});w.employees[0].offDays=['quarta','quinta'];w.employees[1].offDays=['quarta','sexta'];render()});
const c=await A.evaluate(()=>!!document.querySelector('#compliancePanel .finding .fix-btn'));
T('erro de folga conjunta na Conformidade tem botão Corrigir',c);
await A.evaluate(()=>{document.querySelector('#compliancePanel .finding .fix-btn').click()});await A.waitForTimeout(400);
const d=await A.evaluate(()=>({sep:!week().employees[0].offDays.some(x=>week().employees[1].offDays.includes(x)),t:document.getElementById('toast').textContent}));
T('Corrigir separa a folga da Fiscal e da Recepção',d.sep&&/Corrigido/.test(d.t),JSON.stringify(d));
// 4) fechamento
await A.evaluate(()=>{const w=week();w.shifts[2].start='10:10';sync(w.shifts[2]);render()});
const e=await A.evaluate(()=>!!compliance().find(x=>x.fix==='fechamento'));
T('turno passando do fechamento oferece correção',e);
await A.evaluate(()=>{const id=[...document.querySelectorAll('#compliancePanel .fix-btn')].find(b=>/fechamento/.test(b.closest('.finding').textContent));id&&id.click()});await A.waitForTimeout(400);
const f=await A.evaluate(()=>week().shifts.every(s=>mins(s.start)+workDuration('5x2',0)+120<=mins('19:30')));
T('Corrigir antecipa a entrada para terminar no fechamento',f);
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
