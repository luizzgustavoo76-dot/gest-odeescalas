const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
// ---- continuidade
await A.evaluate(()=>{setActive(12);replicate('team');week().employees.forEach((e,i)=>e.sundayWork=i<6);fillSundays();render()});
const antes=await A.evaluate(()=>({base:state.baseMonday,dom:sector().weeks.map(w=>w.employees.map((e,i)=>e.sundayWork?i:-1).filter(x=>x>=0))}));
await A.evaluate(()=>document.querySelector('.tab[data-tab=gen]').click());
T('painel de ciclo aparece na aba Gerar',await A.evaluate(()=>!!document.getElementById('cicloAvancar')));
await A.click('#cicloAvancar');await A.waitForSelector('.ask-box');await A.click('.ask-box [data-a="1"]');await A.waitForTimeout(400);
const dep=await A.evaluate(()=>({base:state.baseMonday,sel:state.selectedWeek,n:sector().ciclos.length,dom:sector().weeks.map(w=>w.employees.map((e,i)=>e.sundayWork?i:-1).filter(x=>x>=0)),all:Object.keys(state.sectors).every(k=>state.sectors[k].ciclos&&state.sectors[k].ciclos.length===1)}));
const d1=new Date(antes.base+'T12:00:00'),d2=new Date(dep.base+'T12:00:00');
T('data avançou 28 dias',Math.round((d2-d1)/864e5)===28,antes.base+' → '+dep.base);
T('ciclo anterior guardado em todos os setores',dep.n===1&&dep.all);
T('volta para a semana 1',dep.sel===0);
T('quem trabalhou no último domingo folga no primeiro do novo ciclo',!dep.dom[0].some(i=>antes.dom[3].includes(i)),JSON.stringify(dep.dom[0])+' x '+JSON.stringify(antes.dom[3]));
T('mesma quantidade de domingos por semana',dep.dom.every((d,i)=>d.length===antes.dom[i].length));
T('ninguém repete domingo em semanas seguidas',dep.dom.every((d,i)=>i===0||!d.some(x=>dep.dom[i-1].includes(x))));
// voltar
await A.evaluate(()=>document.querySelector('.tab[data-tab=gen]').click());
await A.click('[data-ciclo]');await A.waitForSelector('.ask-box');await A.click('.ask-box [data-a="1"]');await A.waitForTimeout(400);
T('voltar ao ciclo anterior restaura data e domingos',await A.evaluate(a=>state.baseMonday===a.base&&JSON.stringify(sector().weeks.map(w=>w.employees.map((e,i)=>e.sundayWork?i:-1).filter(x=>x>=0)))===JSON.stringify(a.dom),antes));
// ---- botões dão retorno
await A.evaluate(()=>{document.getElementById('toast').hidden=true;toastEm=0;toastErroEm=0});
await A.evaluate(()=>document.querySelector('.tab[data-tab=shifts]').click());
await A.click('[data-replicate="shifts"]');await A.waitForTimeout(250);
T('botão de replicar mostra retorno',await A.evaluate(()=>{const t=document.getElementById('toast');return !t.hidden&&t.textContent.length>5}));
// ---- backup unificado
T('aba Equipe não tem mais backup',await A.evaluate(()=>!document.getElementById('exportButton')&&!document.getElementById('importFile')));
// ---- nova versão
await A.evaluate(()=>{window.__ver=1});
await A.route('**/index.html*',r=>r.fulfill({contentType:'text/html',body:'<meta name="build" content="9999">'}));
await A.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await A.waitForTimeout(1200);
T('aparece o botão "Nova versão! Atualizar?"',await A.evaluate(()=>{const n=document.getElementById('novaVersao');return !!n&&!n.hidden&&/Nova versão/.test(n.textContent)}));
// clicar no botão: salva o pendente e recarrega (não pode travar em "Aguarde")
await A.evaluate(()=>{window.__nav=null;});
await A.evaluate(()=>{week().employees[0].name='Teste atualizar';render()});await A.waitForTimeout(1500);
await A.evaluate(()=>{document.getElementById('toast').hidden=true});
const nav=A.waitForNavigation({timeout:6000}).then(()=>'recarregou').catch(()=>'nao recarregou');
await A.evaluate(()=>document.getElementById('novaVersao').click());
const rr=await nav;
T('clicar em "Nova versão! Atualizar?" recarrega a página (sem travar em "Aguarde")',rr==='recarregou',rr+' | '+await A.evaluate(()=>{try{return document.getElementById('toast').textContent}catch(e){return ''}}).catch(()=>''));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
