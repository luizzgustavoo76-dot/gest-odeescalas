const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
const W=ms=>A.waitForTimeout(ms);const textoSemFora=(v)=>false;
const toast=()=>A.evaluate(()=>{const t=document.getElementById('toast');return {txt:t.textContent,verde:t.style.background!=='',h:t.hidden}});
const limpa=()=>A.evaluate(()=>{document.getElementById('toast').hidden=true;toastErroEm=0;toastEm=0});
await A.evaluate(()=>{state.baseMonday='2026-11-08';state.selectedWeek=0;setActive(12);const ps=sundayPosts().filter(p=>p!=='caixa');ps.forEach((p,k)=>{[8+2*k,9+2*k].forEach(i=>{roster()[i].station=p;week().employees[i].station=p})});week().employees.forEach(e=>{e.sundayWork=false;e.offDays=[]});render()});
await limpa();await A.evaluate(()=>document.querySelector('[data-complete]').click());await W(300);
T('completar sem alterações manuais não pergunta nada',await A.evaluate(()=>!document.querySelector('.ask-overlay'))&&(await toast()).verde);

// ---------- confirmação ----------
await A.evaluate(()=>{const w=sector().weeks[1];const e=w.employees.find(x=>!x.sundayWork);e.offDays=['terça'];window.__antes=JSON.stringify(sector().weeks.slice(1));});
await limpa();await A.evaluate(()=>document.querySelector('[data-complete]').click());await W(250);
T('com ajuste manual na semana 2, o app pergunta antes de substituir',await A.evaluate(()=>!!document.querySelector('.ask-overlay')&&/substituir/.test(document.querySelector('.ask-overlay').textContent)));
await A.evaluate(()=>document.querySelector('.ask-overlay [data-a="0"]').click());await W(250);
T('Cancelar: nada muda',await A.evaluate(()=>JSON.stringify(sector().weeks.slice(1))===window.__antes),(await toast()).txt.slice(0,60));
await limpa();await A.evaluate(()=>document.querySelector('[data-complete]').click());await W(250);
await A.evaluate(()=>document.querySelector('.ask-overlay [data-a="1"]').click());await W(300);
T('Confirmar: semanas recalculadas',await A.evaluate(()=>JSON.stringify(sector().weeks.slice(1))!==window.__antes)&&(await toast()).verde);
await limpa();await A.evaluate(()=>document.querySelector('[data-complete]').click());await W(250);
T('logo depois, sem novas alterações, não pergunta de novo',await A.evaluate(()=>!document.querySelector('.ask-overlay')));

// ---------- férias ----------
const quem=await A.evaluate(()=>sector().weeks[1].employees.findIndex(e=>e.sundayWork&&e.station==='caixa'));
const domAntes=await A.evaluate(()=>sector().weeks[1].employees.filter(e=>e.sundayWork).length);
const add=(i,tipo,de,ate)=>A.evaluate(([i,tipo,de,ate])=>{const box=document.querySelectorAll('#operatorsList .aus-box')[i];box.querySelector('[data-aus-tipo]').value=tipo;box.querySelector('[data-aus-de]').value=de;box.querySelector('[data-aus-ate]').value=ate;box.querySelector('[data-aus-add]').click()},[i,tipo,de,ate]);
T('ficha tem o bloco "Férias / atestado"',await A.evaluate(()=>document.querySelectorAll('#operatorsList .aus-box').length===12));
T('bloco de férias começa recolhido em todas as fichas',await A.evaluate(()=>[...document.querySelectorAll('#operatorsList details.aus-box')].every(d=>!d.open)));
await A.evaluate((i)=>{document.querySelectorAll('#operatorsList details.aus-box')[i].querySelector('summary').click()},quem);await W(80);
T('clicar abre só o bloco daquela pessoa',await A.evaluate((i)=>[...document.querySelectorAll('#operatorsList details.aus-box')].filter(d=>d.open).length===1&&document.querySelectorAll('#operatorsList details.aus-box')[i].open,quem));
await limpa();await add(quem,'ferias','2026-11-20','2026-11-10');await W(100);
let t=await toast();T('data de fim antes do início: erro vermelho',/^Erro/.test(t.txt)&&!t.verde,t.txt);
await limpa();await add(quem,'ferias','2026-11-15','2026-11-21');await W(150);
T('depois de adicionar, o bloco continua aberto e mostra "1 registrada"',await A.evaluate((i)=>{const d=document.querySelectorAll('#operatorsList details.aus-box')[i];return d.open&&/1 registrada/.test(d.querySelector('summary').textContent)},quem));
t=await toast();const semSub=/não havia ninguém livre/.test(t.txt);T('férias registradas: aviso com as semanas recalculadas',/semana\(s\) 2/.test(t.txt)&&t.verde===!semSub,t.txt.slice(0,120));
const f=await A.evaluate((i)=>{state.selectedWeek=1;render();const w=sector().weeks[1],e=w.employees[i];
 return {trab:DAYS.filter(d=>worksOn(e,d[0],1)).length,dom:e.sundayWork,offs:e.offDays.length,domQt:w.employees.filter(x=>x.sundayWork).length,
  chips:document.querySelectorAll('#scheduleTable .off-chip.aus').length,erroFolga:issues().join(' '),
  comp:compliance().filter(x=>x.level==='erro').map(x=>x.text.slice(0,80)),
  cob:DAYS.filter(d=>d[0]!=='domingo').map(d=>w.employees.filter(x=>worksOn(x,d[0],1)).length),
  sem1:DAYS.filter(d=>worksOn(sector().weeks[0].employees[i],d[0],0)).length,
  res:resumoCiclo()[i]}},quem);
const v=await A.evaluate((i)=>{const e=sector().weeks[1].employees[i];const tr=[...document.querySelectorAll('#scheduleTable tbody tr')].find(r=>r.querySelector('.employee-link').textContent===e.name);
 const outras=sector().weeks[1].employees.filter(x=>x.station==='caixa'&&!foraSemana(x,1));
 return {vermelho:getComputedStyle(tr.querySelector('.employee-link')).color,sel:tr.querySelectorAll('select').length,txt:[...tr.children].slice(1,6).map(c=>c.textContent.trim()).join('|'),
  analise:!document.querySelector('#offAnalysis').textContent.includes(e.name),whats:textoWhats().split('*Férias / atestado*')[1]||'',nome:e.name,
  pdvsUnicos:(()=>{const m={};return outras.every(x=>{const k=x.pdv+'-'+x.shift;if(m[k])return false;m[k]=1;return true})})()}},quem);
T('nome em vermelho na semana das férias',v.vermelho==='rgb(185, 28, 28)',v.vermelho);
T('sem turno, posto, PDV nem horários na linha dela',v.sel===0&&/^—\|—\|—\|—\|—$/.test(v.txt),v.sel+' '+v.txt);
T('WhatsApp lista ela só em "Férias / atestado"',v.whats.includes(v.nome)&&!textoSemFora(v),'');
T('na semana 1 (sem férias) a linha dela volta ao normal',await A.evaluate((i)=>{state.selectedWeek=0;render();const e=week().employees[i];const tr=[...document.querySelectorAll('#scheduleTable tbody tr')].find(r=>r.querySelector('.employee-link').textContent===e.name);const ok=tr.querySelectorAll('select').length>=1&&!tr.classList.contains('aus-row');state.selectedWeek=1;render();return ok},quem));
T('na semana das férias ela não trabalha nenhum dia',f.trab===0&&!f.dom&&f.offs===0,JSON.stringify([f.trab,f.dom,f.offs]));
T('domingo dela: outra pessoa assumiu, ou o app avisou em vermelho que não havia substituta',f.domQt===domAntes||(semSub&&f.domQt===domAntes-1),f.domQt+' / '+domAntes+' semSub='+semSub);
T('tabela mostra 7 dias marcados como férias',f.chips===7,String(f.chips));
T('sem alerta falso de folgas nem erros de conformidade',!/folga/i.test(f.erroFolga)&&f.comp.length===0,f.erroFolga+' | '+f.comp.join(' | '));
T('as outras semanas dela continuam normais',f.sem1>=5,String(f.sem1));
T('cobertura do dia conta sem ela (ninguém abaixo de metade)',Math.min(...f.cob)>=6,f.cob.join(','));
T('resumo do ciclo mostra 7 dias de férias',f.res.aus===7,JSON.stringify(f.res));
await limpa();await add(quem,'atestado','2026-11-18','2026-11-19');await W(100);
t=await toast();T('período sobreposto: erro vermelho',/^Erro/.test(t.txt)&&!t.verde,t.txt);
// atestado parcial (2 dias) para outra pessoa na semana 3
const outra=(quem+1)%8;
await limpa();await add(outra,'atestado','2026-11-24','2026-11-25');await W(150);
const g=await A.evaluate((i)=>{const e=sector().weeks[2].employees[i];return {ter:worksOn(e,'terça',2),qua:worksOn(e,'quarta',2),offs:e.offDays,need:(e.sundayWork?2:1)}},outra);
T('atestado de 2 dias: não trabalha nesses dias e as folgas ficam fora deles',!g.ter&&!g.qua&&!g.offs.includes('terça')&&!g.offs.includes('quarta')&&g.offs.length===g.need,JSON.stringify(g));
// remover
await limpa();await A.evaluate((i)=>document.querySelectorAll('#operatorsList .aus-box')[i].querySelector('[data-aus-del]').click(),quem);await W(150);
const h=await A.evaluate((i)=>({trab:DAYS.filter(d=>worksOn(sector().weeks[1].employees[i],d[0],1)).length,aus:(roster()[i].aus||[]).length}),quem);
T('remover as férias: ela volta à escala',h.trab>=5&&h.aus===0,JSON.stringify(h));
// completar com férias: quem está de férias no domingo não é escolhida
await A.evaluate(()=>{state.selectedWeek=0;render()});
await limpa();await add(0,'ferias','2026-11-08','2026-12-05');await W(150);
await A.evaluate(()=>{week().employees.forEach(e=>{e.sundayWork=false});render()});
await limpa();await A.evaluate(()=>document.querySelector('[data-complete]').click());await W(250);
if(await A.evaluate(()=>!!document.querySelector('.ask-overlay'))){await A.evaluate(()=>document.querySelector('.ask-overlay [data-a="1"]').click());await W(300)}
const k=await A.evaluate(()=>({dom:sector().weeks.map(w=>w.employees[0].sundayWork),offs:sector().weeks.map(w=>w.employees[0].offDays.length),res:resumoCiclo()[0]}));
T('férias no ciclo inteiro: nunca escalada no domingo, sem folgas, 0 dias trabalhados',k.dom.every(x=>!x)&&k.offs.every(x=>x===0)&&k.res.dias===0&&k.res.aus===28,JSON.stringify(k));

// ---------- resumo ----------
const r=await A.evaluate(()=>{const L=resumoCiclo();return {n:L.length,linhas:document.querySelectorAll('#resumoCiclo tbody tr').length,ex:L[3],domF:L.slice(1).every(x=>x.domF>=2)}});
T('resumo do ciclo: 1 linha por colaboradora, com horas',r.n===12&&r.linhas===12&&r.ex.min>0&&r.ex.dias>0,JSON.stringify(r.ex));
T('resumo: todas com 2 ou mais domingos de folga',r.domF);

// ---------- aviso de equipe pequena ----------
const av=await A.evaluate(()=>{state.selectedSector='acougue-frios';state.selectedWeek=0;render();setActive(8);document.querySelector('.tab[data-tab="rules"]').click();
 return [...document.querySelectorAll('[data-pouco]')].map(x=>x.textContent)});
T('aba Regras avisa posto com equipe pequena para alternar domingos',av.length>=1&&/precisa de 4 pessoas \(tem 2\)/.test(av[0]),av[0]);
const av2=await A.evaluate(()=>{state.selectedSector='frente-caixa';render();return document.querySelectorAll('[data-pouco]').length});
T('posto com equipe suficiente não mostra o aviso',av2===0,String(av2));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
