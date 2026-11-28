const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.evaluate(()=>{state.baseMonday='2026-11-08';setActive(12);week().employees.forEach((e,i)=>e.sundayWork=i<5);suggestOffFor(week());render()});
const cov=()=>A.evaluate(()=>{const w=week();return DAYS.filter(d=>d[0]!=='domingo').map(d=>w.employees.filter(e=>worksOn(e,d[0],0)).length)});
const offs=()=>A.evaluate(()=>week().employees.reduce((t,e)=>t+e.offDays.length,0));
T('botões + e − só aparecem com o ajuste ligado',await A.evaluate(()=>!document.querySelector('#offAnalysis .oa-b')));
await A.click('#offAnalysis [data-ajuste]');await A.waitForTimeout(200);
T('ajuste ligado mostra os botões',await A.evaluate(()=>document.querySelectorAll('#offAnalysis .oa-b').length>10));
// turno: limite de PDVs
await A.evaluate(()=>{week().pdvCount=3;render()});
const tinha=await A.evaluate(()=>week().employees.filter(e=>e.station==='caixa'&&e.shift===0).length);
await A.evaluate(()=>document.querySelector('#offAnalysis [data-oa="turno"][data-post="caixa"][data-turno="0"][data-dl="1"]').click());await A.waitForTimeout(300);
T('passar do máximo de PDVs mostra erro vermelho',await A.evaluate(()=>{const t=document.getElementById('toast');return !t.hidden&&/^Erro/.test(t.textContent)&&getComputedStyle(t).backgroundColor==='rgb(161, 22, 26)'}),await A.evaluate(()=>document.getElementById('toast').textContent));
// turno dentro do limite
await A.evaluate(()=>{week().pdvCount=20;replicate('pdvs');replicate('team');render()});
const antes=await A.evaluate(()=>[0,1,2].map(i=>week().employees.filter(e=>e.station==='caixa'&&e.shift===i).length));
await A.evaluate(()=>document.querySelector('#offAnalysis [data-oa="turno"][data-post="caixa"][data-turno="2"][data-dl="1"]').click());await A.waitForTimeout(400);
const dep=await A.evaluate(()=>[0,1,2].map(i=>week().employees.filter(e=>e.station==='caixa'&&e.shift===i).length));
T('+1 no turno 3 e −1 em outro turno',dep[2]===antes[2]+1&&dep.reduce((a,x)=>a+x,0)===antes.reduce((a,x)=>a+x,0),antes.join('/')+' → '+dep.join('/'));
T('o rodízio dos postos guarda a nova divisão',await A.evaluate(d=>JSON.stringify(sector().postShifts.caixa)===JSON.stringify(d),dep));
T('as outras semanas seguem a mesma divisão',await A.evaluate(d=>sector().weeks.every(w=>JSON.stringify([0,1,2].map(i=>w.employees.filter(e=>e.station==='caixa'&&e.shift===i).length))===JSON.stringify(d)),dep));
// cobertura por hora
T('o ajuste vale também na cobertura por hora (mesmo botão)',await A.evaluate(()=>document.querySelector('#boardBar [data-ajuste]').classList.contains('secondary')));
T('cobertura por hora tem seletor de posto',await A.evaluate(()=>document.querySelectorAll('#boardBar .chip').length>=2));
T('cobertura por hora mostra + e −',await A.evaluate(()=>document.querySelectorAll('#coverageBoardBody .oa-b').length>10));
const celula=await A.evaluate(()=>{const b=[...document.querySelectorAll('#coverageBoardBody .oa-b[data-dl="1"]')][8];return {d:b.dataset.day,i:b.dataset.ini,f:b.dataset.fim}});
await A.evaluate(c=>{document.querySelector('#coverageBoardBody .oa-b[data-dl="1"][data-day="'+c.d+'"][data-ini="'+c.i+'"]').click()},celula);await A.waitForTimeout(300);
T('+ na cobertura por hora dá retorno',await A.evaluate(()=>{const t=document.getElementById('toast');return !t.hidden&&t.textContent.length>10}),await A.evaluate(()=>document.getElementById('toast').textContent));
// varredura: todas as células/dias, + e −, nas 4 áreas; sucesso tem que mudar de fato e o total de folgas não pode mudar
await A.evaluate(()=>{replicate('team');state.selectedWeek=0;week().employees.forEach((e,i)=>e.sundayWork=i<5);suggestOffFor(week());render()});
const varre=await A.evaluate(()=>{
  const dias=['segunda','terça','quarta','quinta','sexta','sábado'],out={ok:0,bloq:0,bug:[],semRetorno:[],btn:0};
  const tot=()=>week().employees.reduce((t,e)=>t+e.offDays.length,0);
  const sels=[];
  dias.forEach(d=>[1,-1].forEach(dl=>sels.push(['#coverageBoardBody .oa-b[data-day="'+d+'"][data-dl="'+dl+'"]','faixa '+d+' '+dl])));
  for(const [sel,nome] of sels){
    const el=document.querySelector(sel);if(!el){out.bug.push(nome+' sem botão');continue}out.btn++;
    document.getElementById('toast').hidden=true;toastErroEm=0;
    const snap=JSON.stringify(week().employees.map(e=>e.offDays)),t0=tot();el.click();
    const t=document.getElementById('toast'),dep=JSON.stringify(week().employees.map(e=>e.offDays));
    if(t.hidden){out.semRetorno.push(nome);continue}
    if(/^Erro/.test(t.textContent)){out.bloq++;if(dep!==snap)out.bug.push(nome+' erro mas mudou')}
    else{out.ok++;if(dep===snap||tot()!==t0)out.bug.push(nome+' sucesso sem mudança ou total alterado')}
    const o=JSON.parse(snap);week().employees.forEach((e,i)=>e.offDays=o[i]);render();
  }
  return out});
T('varredura: todas as células responderam (botões: '+varre.btn+', aplicadas: '+varre.ok+', bloqueadas com erro: '+varre.bloq+')',varre.btn===12&&varre.semRetorno.length===0,JSON.stringify(varre.semRetorno));
T('varredura: nenhuma "falsa confirmação" nem total de folgas alterado',varre.bug.length===0,varre.bug.join('; '));
T('varredura: a maioria das ações é aplicada em todos os dias',varre.ok>=8,String(varre.ok));
// vermelho prevalece: sugerir folgas sem domingos escolhidos
await A.evaluate(()=>{toastErroEm=0;toastEm=0;document.getElementById('toast').hidden=true;week().employees.forEach(e=>e.sundayWork=false);render()});
await A.evaluate(()=>document.querySelector('[data-suggest-off]').click());await A.waitForTimeout(400);
const tv=await A.evaluate(()=>{const t=document.getElementById('toast');return {h:t.hidden,txt:t.textContent,bg:t.style.background}});
T('erro em "sugerir folgas" não é trocado por mensagem verde',!tv.h&&tv.bg===''||/rro|ntes|escolh|domingo/i.test(tv.txt)&&tv.bg==='',JSON.stringify(tv));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
