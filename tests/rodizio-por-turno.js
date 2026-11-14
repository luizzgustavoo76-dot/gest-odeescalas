const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.evaluate(()=>{setActive(12);replicate('team');render()});
await A.evaluate(()=>document.querySelector('.tab[data-tab=rotation]').click());
T('painel mostra uma linha por turno',await A.evaluate(()=>document.querySelectorAll('#rotationPanel .post-shift-grid .post-name').length)===3);
T('uma coluna por posto',await A.evaluate(()=>document.querySelectorAll('#rotationPanel [data-pshift="0"]').length===postKeys().length));
T('posto sem colaboradora fica zerado e travado',await A.evaluate(()=>{const w=week();const vazios=postKeys().filter(k=>!w.employees.some(e=>e.station===k));return vazios.length>0&&vazios.every(k=>[...document.querySelectorAll('#rotationPanel [data-ppost="'+k+'"]')].every(i=>i.value==='0'&&i.disabled))}));
// escolhe: Pacote 1 no 1º, 1 no 2º, 0 no 3º ; Fiscal 1 no 3º
const posto=await A.evaluate(()=>{const w=week();const k=postKeys().find(x=>w.employees.filter(e=>e.station===x).length>=2)||postKeys()[0];return k});
const n=await A.evaluate(k=>week().employees.filter(e=>e.station===k).length,posto);
await A.fill('#rotationPanel [data-pshift="0"][data-ppost="'+posto+'"]',String(n-1));await A.dispatchEvent('#rotationPanel [data-pshift="0"][data-ppost="'+posto+'"]','change');await A.waitForTimeout(200);
await A.fill('#rotationPanel [data-pshift="2"][data-ppost="'+posto+'"]','1');await A.dispatchEvent('#rotationPanel [data-pshift="2"][data-ppost="'+posto+'"]','change');await A.waitForTimeout(200);
await A.fill('#rotationPanel [data-pshift="1"][data-ppost="'+posto+'"]','0');await A.dispatchEvent('#rotationPanel [data-pshift="1"][data-ppost="'+posto+'"]','change');await A.waitForTimeout(200);
T('valores ficam guardados no setor',await A.evaluate(k=>JSON.stringify(sector().postShifts[k]),posto)===JSON.stringify([n-1,0,1]));
await A.click('#applyPosts');await A.waitForTimeout(400);
const dist=await A.evaluate(k=>sector().weeks.map(w=>[0,1,2].map(i=>w.employees.filter(e=>e.station===k&&e.shift===i).length).join('/')),posto);
T('semana 1 respeita as quantidades por turno',dist[0]===(n-1)+'/0/1',dist.join(' | '));
T('todas as semanas mantêm as mesmas quantidades',dist.every(d=>d===dist[0]),dist.join(' | '));
const quem=await A.evaluate(k=>sector().weeks.map(w=>w.employees.filter(e=>e.station===k&&e.shift===2).map(e=>e.id).join(',')),posto);
T('quem fica no 3º turno muda a cada semana',new Set(quem).size>1,quem.join(' | '));
// salvo na nuvem
await A.waitForTimeout(1800);
T('escolha salva na nuvem',await A.evaluate(k=>{const r=__db.escalas.find(e=>e.setor===state.selectedSector);return !!(r&&r.dados.postShifts&&r.dados.postShifts[k])},posto));
// limpar
await A.evaluate(()=>document.querySelector('.tab[data-tab=rotation]').click());
await A.click('#clearPosts');await A.waitForTimeout(200);
T('limpar volta ao automático',await A.evaluate(()=>!sector().postShifts));
T('sem erros de página',errs.length===0,errs.join(';'));
// PDV acima do número de operadoras do turno: erro vermelho
await A.evaluate(()=>{week().pdvCount=Math.max(week().pdvCount,20);render();document.querySelector('.tab[data-tab=rules]').click()});
const info=await A.evaluate(()=>{const w=week();const i=w.shifts.findIndex((_,j)=>w.employees.filter(e=>e.station==='caixa'&&e.shift===j).length>0);return {i,n:w.employees.filter(e=>e.station==='caixa'&&e.shift===i).length}});
if(info.i>=0){
 for(let p=1;p<=info.n+1;p++){await A.evaluate(([i,p])=>{const c=document.querySelector('[data-pdvshift="'+i+'"][value="'+p+'"]');c.click()},[info.i,p]);await A.waitForTimeout(150)}
 const tz=await A.evaluate(()=>{const t=document.getElementById('toast');return {oculto:t.hidden,txt:t.textContent,bg:getComputedStyle(t).backgroundColor}});
 T('PDV a mais que operadoras mostra erro vermelho',!tz.oculto&&/^Erro/.test(tz.txt)&&tz.bg==='rgb(161, 22, 26)',tz.txt+' | '+tz.bg);
 T('o PDV excedente não foi marcado',await A.evaluate(i=>sector().pdvPlan[i].length,info.i)===info.n);
} else T('há turno com operadora para testar',false);
await b.close()})();
