const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
// 10 pessoas; a nº 1 de férias nas semanas 1 e 2, marcada (errado) para domingo e sem folga na semana 3
const r=await A.evaluate(()=>{state.baseMonday='2026-11-23';for(let i=0;i<4;i++){state.selectedWeek=i;setActive(10);const w=week();while(w.shifts.length>2)w.shifts.pop();w.employees.forEach((e,k)=>{e.station='caixa';e.shift=k%2;e.sundayWork=k%2===1;e.offDays=['quarta']})}
 state.selectedWeek=0;roster()[0].aus=[{de:iso(date('domingo',0)),ate:iso(date('sábado',1)),tipo:'ferias'}];
 const ws=sector().weeks;ws[0].employees[0].sundayWork=true;ws[1].employees[0].sundayWork=true;ws[2].employees[0].sundayWork=false;ws[2].employees[0].offDays=[];render();
 const cards=[...document.querySelectorAll('#coverageCards .coverage-card span')].map(x=>+x.textContent.match(/(\d+) colab/)[1]);
 const nome=roster()[0].name;
 return {cards,dom:compliance().filter(x=>x.text.includes(nome+':')&&/domingo/.test(x.text)).map(x=>x.text),carga:compliance().find(x=>x.text.includes(nome+':')&&/carga semanal/.test(x.text)),posts:document.getElementById('rotationPanel').innerText.includes('de férias/atestado nesta semana'),nome}});
T('cartões de turno não contam quem está de férias (9 de 10)',r.cards.reduce((a,b)=>a+b,0)===9,JSON.stringify(r.cards));
T('domingo de férias não conta como domingo trabalhado (sem alerta de domingos)',r.dom.length===0,r.dom.join(' | '));
T('quem voltou de férias sem folga gera erro com Corrigir',!!(r.carga&&r.carga.fix==='folgas'),JSON.stringify(r.carga));
T('Rodízio de postos avisa quem está de férias na semana',r.posts);
const ok=await A.evaluate(nome=>{const c=compliance().find(x=>x.text.includes(nome+':')&&/carga semanal/.test(x.text));const id='t'+Date.now();FIXES[id]={k:c.fix,wi:c.weeks[0],text:c.text};aplicaCorrecao(id);return {off:sector().weeks[2].employees[0].offDays,ainda:compliance().some(x=>x.text.includes(nome+':')&&/carga semanal/.test(x.text))}},r.nome);
T('Corrigir dá as folgas e o erro some',ok.off.length>=1&&!ok.ainda,JSON.stringify(ok));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
