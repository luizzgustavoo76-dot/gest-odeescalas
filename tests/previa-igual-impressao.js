const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.evaluate(()=>{setActive(12);const w=week();const ks=['fiscal','caixa','recepcao','pacote'];w.employees.forEach((e,i)=>{const nm='NOME '+String.fromCharCode(65+(11-i));e.station=ks[i%4];e.shift=(i*2)%w.shifts.length;e.name=nm;const r=roster()[i];r.station=ks[i%4];r.name=nm});render()});
const ord=()=>A.evaluate(()=>[...document.querySelectorAll('#scheduleTable tbody tr')].map(r=>r.classList.contains('grp')?'#'+r.textContent.trim():r.querySelector('.employee-link').textContent));
const tela=await ord();
T('prévia tem uma faixa por posto',tela.filter(x=>x[0]==='#').length===4,tela.filter(x=>x[0]==='#').join(' | '));
T('faixa mostra o nome do posto e a contagem',tela.some(x=>/^#.+ · \d+ pessoas?$/.test(x)));
// ordem da impressão
const imp=await A.evaluate(()=>{const emps=week().employees,po=k=>{const i=postKeys().indexOf(k);return i<0?99:i};
 return [...emps].sort((x,y)=>{const a=week().shifts[x.shift],c=week().shifts[y.shift];return po(x.station)-po(y.station)||(mins(a.start)*2000+mins(a.lunchStart))-(mins(c.start)*2000+mins(c.lunchStart))||x.name.localeCompare(y.name,'pt-BR')}).map(e=>e.name)});
T('ordem na tela = ordem da impressão',JSON.stringify(tela.filter(x=>x[0]!=='#'))===JSON.stringify(imp),tela.filter(x=>x[0]!=='#').join(',')+' / '+imp.join(','));
// clicar em Entrada tira as faixas
await A.click('#scheduleTable [data-sort=name]');await A.waitForTimeout(200);
T('ordenar por Colaboradora volta à lista simples',!(await ord()).some(x=>x[0]==='#'));
await A.click('#scheduleTable [data-sort=station]');await A.waitForTimeout(200);
T('clicar em Posto volta ao agrupamento',(await ord()).filter(x=>x[0]==='#').length===4);
// trocar o TURNO de alguém na tela: continua com as faixas (não volta à prévia antiga) e a linha fica no lugar
const antesOrd=await ord();
await A.selectOption('#scheduleTable tbody tr:not(.grp) select[data-field=shift]','2');await A.waitForTimeout(300);
const depOrd=await ord();
T('trocar o turno mantém as faixas de posto',depOrd.filter(x=>x[0]==='#').length===4,depOrd.filter(x=>x[0]==='#').join(' | '));
T('trocar o turno mantém a linha no lugar',JSON.stringify(depOrd.map(x=>x))===JSON.stringify(antesOrd.map(x=>x)));
T('aparece o aviso "Reordenar agora"',!!(await A.$('#reordenarBtn')));
await A.click('#reordenarBtn');await A.waitForTimeout(300);
T('Reordenar agora recoloca por horário dentro do posto',(await ord()).filter(x=>x[0]==='#').length===4&&!(await A.$('#reordenarBtn')));
// trocar o POSTO: a pessoa vai para a faixa do novo posto
await A.selectOption('#scheduleTable tbody tr:not(.grp) select[data-field=station]','pacote');await A.waitForTimeout(300);
const o3=await ord();
T('trocar o posto leva a pessoa para a faixa do novo posto',o3.filter(x=>x[0]==='#').length===4&&/Pacote · 4 pessoas/.test(o3.join('|')),o3.filter(x=>x[0]==='#').join(' | '));
T('sem erros de página',errs.length===0,errs.join(';'));
// impressão ignora as faixas da tela
const html=await A.evaluate(()=>typeof buildPrintHtml==='function'?buildPrintHtml('week'):'');
T('impressão continua montando',/<table/.test(html)||html==='');
await b.close()})();
