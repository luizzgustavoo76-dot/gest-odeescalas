const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
// escala: terça da semana 1, Colaboradora 1 no 1º turno (07:00), sem folga na terça
const info=await A.evaluate(()=>{setActive(12);const w=week();w.employees.forEach(e=>{e.offDays=['sexta'];e.sundayWork=false});
 roster()[0].name='Maria da Silva';roster()[1].name='Joana Souza';roster()[2].name='Ana Pereira';roster()[3].name='Carla Lima';render();w.employees[0].shift=0;w.employees[1].shift=0;w.employees[2].shift=0;
 week().employees[3].offDays=['terça'];
 render();return {terca:iso(date('terça',0)),s:w.shifts[0]}});
const [y,m,d]=info.terca.split('-');
const pad=(s,n)=>String(s).padEnd(n,' ');
let nsr=0;const L=[];
const emp=(pis,nome)=>{nsr++;L.push(String(nsr).padStart(9,'0')+'5'+d+m+y+'0800'+'I'+pis+pad(nome,52))};
const bat=(pis,hhmm)=>{nsr++;L.push(String(nsr).padStart(9,'0')+'3'+d+m+y+hhmm+pis)};
emp('000000000001','MARIA DA SILVA');emp('000000000002','JOANA SOUZA');emp('000000000004','CARLA LIMA');emp('000000000009','FULANA DE TAL');
// Maria: entrou 07:40 (atraso), almoço 11:00-13:30 (longo), saiu 17:30
['0740','1100','1330','1730'].forEach(h=>bat('000000000001',h));
// Joana ok-ish: 07:00, 11:00, 13:00, 16:24...
['0700','1100','1300','1724'].forEach(h=>bat('000000000002',h));
// Carla está de folga na terça mas bateu
['0900','1300'].forEach(h=>bat('000000000004',h));
['0800','1200'].forEach(h=>bat('000000000009',h));
fs.writeFileSync('/tmp/afd-teste.txt',L.join('\r\n')+'\r\n');
await A.setInputFiles('#afdFile','/tmp/afd-teste.txt');await A.waitForTimeout(600);
const txt=await A.evaluate(()=>document.getElementById('afdOv')?document.getElementById('afdOv').innerText:'');
T('painel abre',/Conferir ponto/.test(txt),txt.slice(0,80));
T('atraso da Maria',/Maria da Silva[\s\S]*Chegou 07:40/.test(txt));
T('almoço longo da Maria',/Almoço de 2h30/.test(txt));
T('Carla bateu na folga',/Bateu ponto no dia de folga/.test(txt));
T('Ana sem batida (faltou)',/Ana Pereira[\s\S]*Sem nenhuma batida/.test(txt));
T('quem não é da escala aparece à parte',/FULANA DE TAL/.test(txt));
T('Joana sem erros',!/Joana Souza[^\n]*\n?[^\n]*Chegou/.test(txt));
T('sem erros de página',errs.length===0,errs.join(';'));
console.log(txt.slice(0,1500));await b.close()})();
