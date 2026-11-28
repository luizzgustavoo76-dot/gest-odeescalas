const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
// caso da Anne: semana 3 folga domingo + terça; semana 4 trabalha domingo e folga sexta → 9 dias seguidos
const r=await A.evaluate(()=>{state.baseMonday='2026-11-23';for(let i=0;i<4;i++){state.selectedWeek=i;setActive(6);week().employees.forEach((e,k)=>{e.sundayWork=k%2===0;e.offDays=e.sundayWork?['segunda','terça']:['quarta']})}
 const ws=sector().weeks;const p=ws[2].employees[1],q=ws[3].employees[1];p.sundayWork=false;p.offDays=['terça'];q.sundayWork=true;q.offDays=['sexta','sábado'];
 state.selectedWeek=0;render();
 const err=compliance().find(x=>/dias seguidos sem descanso/.test(x.text)&&x.text.startsWith(roster()[1].name+':'));
 return {err}});
T('9 dias seguidos aparece como ERRO (art. 67)',r.err&&r.err.level==='erro'&&/^Colaboradora 2: 9 dias/.test(r.err.text),JSON.stringify(r.err));
T('o erro tem botão Corrigir',!!(r.err&&/^sequencia:/.test(r.err.fix)));
const fx=await A.evaluate(()=>{const c=compliance().find(x=>/dias seguidos sem descanso/.test(x.text)&&x.text.startsWith(roster()[1].name+':'));const id='s'+Date.now();FIXES[id]={k:c.fix,wi:c.weeks[0],text:c.text};aplicaCorrecao(id);
 return {off:sector().weeks[3].employees[1].offDays,ainda:compliance().some(x=>/dias seguidos sem descanso/.test(x.text)&&x.text.startsWith(roster()[1].name+':')),n:sector().weeks[3].employees[1].offDays.length}});
T('Corrigir leva uma folga para segunda ou terça da semana 4',fx.off.some(d=>d==='segunda'||d==='terça')&&fx.n===2,JSON.stringify(fx.off));
T('o erro some e a quantidade de folgas continua 2',!fx.ainda);
// "Sugerir folgas nas 4 semanas" já evita
const auto=await A.evaluate(()=>{suggestOffAll();return compliance().filter(x=>/dias seguidos sem descanso/.test(x.text)).map(x=>x.text)});
T('sugerir folgas das 4 semanas não deixa ninguém com mais de 6 dias seguidos',auto.length===0,auto.join(' | '));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
