const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.evaluate(()=>{state.baseMonday='2026-11-08';setActive(12);const w=week();w.employees.forEach((e,i)=>{e.station='caixa';e.shift=i<6?0:1;e.sundayWork=i%2===0});suggestOffFor(w);render()});
await A.click('#offAnalysis [data-ajuste]');await A.waitForTimeout(200);
const G0='pt:caixa:0',G1='pt:caixa:1';
const real=(sh,d)=>A.evaluate(([sh,d])=>week().employees.filter(e=>e.station==='caixa'&&e.shift===sh&&!worksOn(e,d)).length,[sh,d]);
const snap=()=>A.evaluate(()=>JSON.stringify(week().employees.map(e=>e.offDays)));
const clk=(g,d,dl)=>A.evaluate(([g,d,dl])=>document.querySelector('#offAnalysis [data-oa="dia"][data-g="'+g+'"][data-day="'+d+'"][data-dl="'+dl+'"]').click(),[g,d,dl]);
const s0=await snap();
const seg0=await real(0,'segunda');
// muda livremente: segunda 1º turno vai para 0 (vários cliques), sem mudar a escala
for(let k=0;k<seg0+2;k++) await clk(G0,'segunda',-1);
await A.waitForTimeout(200);
T('− muda só o rascunho (a escala não mexe)',(await snap())===s0);
T('o número aparece no rascunho e não fica negativo',await A.evaluate(g=>rascAtivo().g[g].v.segunda===0,G0));
T('mostra a célula alterada (era X)',await A.evaluate(()=>/era/.test(document.querySelector('#offAnalysis td.oa-draft').innerText)));
const errTxt=await A.evaluate(()=>document.querySelector('.rasc-bar').innerText);
T('acusa o erro na hora (faltam folgas)',/faltam/.test(errTxt),errTxt);
T('Aplicar fica bloqueado com erro',await A.evaluate(()=>document.getElementById('rascAplicar').disabled));
// coloca as folgas que faltaram em outro dia (quinta), até bater
const precisa=await A.evaluate(g=>{const x=gruposFolga().find(q=>q.g===g);return rascInfo(x).precisa},G0);
let soma=await A.evaluate(g=>Object.values(rascAtivo().g[g].v).reduce((a,b)=>a+b,0),G0);
const diasT=['terça','quarta','quinta','sexta','sábado'];let di=0;
while(soma<precisa){await clk(G0,diasT[di%5],1);di++;soma=await A.evaluate(g=>Object.values(rascAtivo().g[g].v).reduce((a,b)=>a+b,0),G0)}
await A.waitForTimeout(200);
const ok=await A.evaluate(()=>({erros:rascErros(),dis:document.getElementById('rascAplicar').disabled}));
T('com a soma certa, não há erro e Aplicar libera',ok.erros.length===0&&!ok.dis,ok.erros.join(' | '));
const alvo=await A.evaluate(()=>JSON.parse(JSON.stringify(rascAtivo().g)));
await A.click('#rascAplicar');await A.waitForTimeout(300);
const conf=await A.evaluate(a=>{const out=[];gruposFolga().forEach(x=>diasUteis().forEach(d=>{const r=folgaReal(x.mem,d[0]);if(r!==a[x.g].v[d[0]])out.push(x.g+' '+d[0]+' '+r+'≠'+a[x.g].v[d[0]])}));return out},alvo);
T('Aplicar deixa a escala exatamente com as quantidades escolhidas',conf.length===0,conf.join(' | '));
T('segunda do 1º turno ficou sem folga',(await real(0,'segunda'))===0);
T('todo mundo continua com a quantidade certa de folgas',await A.evaluate(()=>week().employees.every(e=>e.offDays.length===offLimit(e))));
T('rascunho some depois de aplicar',await A.evaluate(()=>!rascAtivo()));
T('Desfazer disponível',await A.evaluate(()=>!!state.undo[state.selectedSector]));
// descartar
await clk(G1,'segunda',1);await A.waitForTimeout(150);
const s1=await snap();
await A.click('#rascDescartar');await A.waitForTimeout(150);
T('Descartar limpa o rascunho sem mexer na escala',(await snap())===s1&&await A.evaluate(()=>!rascAtivo()));
// posto com poucas pessoas: todo o 1º turno folga na terça (com a soma certa) → só alerta, Aplicar libera
await A.evaluate(()=>{const x=gruposFolga().find(q=>q.g==='pt:caixa:0');rascIniciar();const v=rascAtivo().g[x.g].v;const tot=Object.values(v).reduce((a,b)=>a+b,0);const dias=Object.keys(v);dias.forEach(d=>v[d]=0);v['terça']=x.mem.length;let rest=tot-x.mem.length;for(const d of dias){if(d==='terça')continue;const p=Math.min(rest,x.mem.length-1);v[d]=p;rest-=p}render()});
const st=await A.evaluate(()=>({err:rascErros(),av:rascAvisos(),dis:document.getElementById('rascAplicar').disabled,txt:document.querySelector('.rasc-bar').innerText}));
T('ninguém trabalhando vira só alerta (não erro)',st.err.length===0&&st.av.some(x=>/ninguém trabalhando/.test(x)),JSON.stringify(st));
T('com só o alerta, Aplicar libera',!st.dis);
await A.click('#rascAplicar');await A.waitForTimeout(300);
T('aplica mesmo com o posto vazio na terça',(await real(0,'terça'))===6&&await A.evaluate(()=>week().employees.every(e=>e.offDays.length===offLimit(e))));
// folga errada continua bloqueando
await clk(G1,'segunda',1);await A.waitForTimeout(150);
T('soma de folgas errada continua bloqueando o Aplicar',await A.evaluate(()=>rascErros().length>0&&document.getElementById('rascAplicar').disabled));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
