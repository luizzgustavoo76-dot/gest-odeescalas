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
await A.evaluate(()=>{setActive(12);state.selectedWeek=1;week().model='6x1';state.selectedWeek=0;week().model='5x2';render()});
T('botão Desfazer começa desabilitado',await A.evaluate(()=>document.getElementById('undoTopBtn').disabled));
// copiar completo a partir da semana 2: não mexe na semana 1
await A.evaluate(()=>{state.selectedWeek=1;week().model='5x2';render();week().model='6x1';render()});
await A.evaluate(()=>{const b=document.querySelector('[data-replicate="all"]');b&&b.click()});await W(400);
await A.evaluate(()=>{const o=document.querySelector('.ask-overlay [data-a="1"], #askOk, .ask-ok');o&&o.click()});await W(500);
const m=await A.evaluate(()=>sector().weeks.map(w=>w.model));
T('copiar completo da semana 2 só afeta semanas seguintes',m[0]==='5x2'&&m[1]==='6x1'&&m[2]==='6x1'&&m[3]==='6x1',JSON.stringify(m));
T('Desfazer habilita depois da cópia',await A.evaluate(()=>!document.getElementById('undoTopBtn').disabled));
await A.evaluate(()=>document.getElementById('undoTopBtn').click());await W(300);
await A.evaluate(()=>{const o=document.querySelector('.ask-overlay [data-a="1"], #askOk, .ask-ok');o&&o.click()});await W(500);
T('Desfazer devolve as semanas 3 e 4',await A.evaluate(()=>sector().weeks[2].model==='5x2'&&sector().weeks[3].model==='5x2'),await A.evaluate(()=>JSON.stringify(sector().weeks.map(w=>w.model))));
// cadeado
await A.evaluate(()=>{state.selectedWeek=0;roster()[0].fixo=0;roster()[1].folgaFixa=['quarta'];week().employees[1].offDays=['quarta'];render()});
const t=await A.evaluate(()=>textoWhats());
T('WhatsApp mostra cadeado e legenda',/🔒/.test(t)&&/turno ou folga fixos/.test(t));
T('linha da tabela mostra cadeado',await A.evaluate(()=>!!document.querySelector('#scheduleTable .cad')));
await A.evaluate(()=>{state.selectedWeek=0;week().employees.forEach((e,i)=>e.sundayWork=i===0);render()});
const fx=await A.evaluate(()=>{const c=compliance().filter(x=>x.fix==='domingo');return c.length});
T('erro de domingo mínimo oferece Corrigir',fx>0,String(fx));
if(fx){await A.evaluate(()=>{const c=compliance().find(x=>x.fix==='domingo');const id='tst';FIXES[id]={k:'domingo',wi:c.weeks[0],text:c.text};aplicaCorrecao(id)});await W(300);
T('Corrigir escala gente no domingo',await A.evaluate(()=>week().employees.filter(e=>e.sundayWork).length>1));}
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
