const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
const lim=()=>A.evaluate(()=>{toastErroEm=0;return null});
await A.evaluate(()=>{setActive(12);week().employees.forEach((e,i)=>e.shift=i%3);render()});
// 1) carga 5x2 = 42h
const c=await A.evaluate(()=>({d:workDuration('5x2',0),s:workDuration('5x2',0)*5,six:workDuration('6x1',0)*6,txt:document.getElementById('compliancePanel').textContent}));
T('5x2 soma 42h semanais (8h24 por dia)',c.d===504&&c.s===2520,JSON.stringify(c));
T('conformidade mostra 42h00 no 5x2 e não 41h40',/42h por semana|42h/.test(c.txt)&&!/41h40/.test(c.txt),c.txt.slice(c.txt.indexOf('Carga'),c.txt.indexOf('Carga')+160));
// 2) padrão já respeita o fechamento (19:30)
const d=await A.evaluate(()=>{const w=sector().weeks[0];return {close:state.settings.weekClose,ends:w.shifts.map(s=>s.start+'-'+s.end),lun:w.shifts.map(s=>s.lunchStart+'-'+s.lunchEnd),gap:gapOf(w)}});
T('turnos padrão do 5x2 terminam até o fechamento',d.ends.every(e=>e.split('-')[1]<='19:30'&&e.split('-')[1]>'12:00'),JSON.stringify(d));
T('sem buraco de cobertura no padrão',d.gap===null);
// 3) entrada tarde demais é recusada
await A.click('.tab[data-tab=shifts]');
await A.evaluate(()=>{toastErroEm=0});
await A.fill('input[data-shift="2"][data-field=start]','10:10');await A.dispatchEvent('input[data-shift="2"][data-field=start]','change');await A.waitForTimeout(300);
const r=await A.evaluate(()=>({st:sector().weeks[0].shifts[2].start,t:document.getElementById('toast').textContent,hid:document.getElementById('toast').hidden}));
T('entrada 10:10 no 5x2 é recusada com erro',r.st!=='10:10'&&!r.hid&&/devendo horas/.test(r.t),JSON.stringify(r));
// 4) 6x1 → 5x2 antecipa a entrada sozinho
await A.evaluate(()=>{setModel('6x1');const w=sector().weeks[0];w.shifts[2].start='10:10';sync(w.shifts[2],'6x1',0);w.shifts[2].lunchStart='13:00';sync(w.shifts[2],'6x1',0);render()});
const e6=await A.evaluate(()=>sector().weeks[0].shifts[2].start+'-'+sector().weeks[0].shifts[2].end);
T('6x1 aceita entrada 10:10 (termina 19:30)',e6==='10:10-19:30',e6);
await A.evaluate(()=>{toastErroEm=0;setModel('5x2')});
const e5=await A.evaluate(()=>{const s=sector().weeks[0].shifts;return {st:s.map(x=>x.start+'-'+x.end),ok:s.every(x=>x.end<='19:30')}});
T('trocar 6x1→5x2 antecipa a entrada automaticamente',e5.ok&&e5.st.some(x=>x.startsWith('09:06')),JSON.stringify(e5));
// 5) 2 turnos: almoço do 2º = retorno do 1º
await A.evaluate(()=>setShiftCount(2));
const l2=await A.evaluate(()=>{const s=sector().weeks[0].shifts;return {l:s.map(x=>x.lunchStart+'-'+x.lunchEnd),gap:gapOf(sector().weeks[0])}});
T('com 2 turnos o 2º almoça quando o 1º volta',l2.l[1].split('-')[0]===l2.l[0].split('-')[1]&&l2.gap===null,JSON.stringify(l2));
// mudar o almoço do 1º arrasta o 2º
await A.fill('input[data-shift="0"][data-field=lunchStart]','11:30');await A.dispatchEvent('input[data-shift="0"][data-field=lunchStart]','change');await A.waitForTimeout(300);
const l3=await A.evaluate(()=>{const s=sector().weeks[0].shifts;return s.map(x=>x.lunchStart+'-'+x.lunchEnd)});
T('almoço do 1º às 11:30 leva o 2º para 13:30',l3[0]==='11:30-13:30'&&l3[1].startsWith('13:30'),JSON.stringify(l3));
// almoço do 2º coincidente (buraco) é recusado
await A.evaluate(()=>{toastErroEm=0});
await A.fill('input[data-shift="1"][data-field=lunchStart]','12:00');await A.dispatchEvent('input[data-shift="1"][data-field=lunchStart]','change');await A.waitForTimeout(300);
const l4=await A.evaluate(()=>({l:sector().weeks[0].shifts.map(x=>x.lunchStart),t:document.getElementById('toast').textContent}));
T('almoços que deixam a loja sem ninguém são recusados',l4.l[1]!=='12:00'&&/sem nenhuma colaboradora/.test(l4.t),JSON.stringify(l4));
// 3 turnos: 1h de diferença
await A.evaluate(()=>setShiftCount(3));
const l5=await A.evaluate(()=>{const s=sector().weeks[0].shifts.map(x=>mins(x.lunchStart));return [s[1]-s[0],s[2]-s[1]]});
T('com 3 turnos os almoços ficam 1h distantes',l5[0]===60&&l5[1]===60,JSON.stringify(l5));
// 6) turno fixo
await A.click('.tab[data-tab=team]');
const f0=await A.evaluate(()=>{const w=sector().weeks[0];return {s:w.employees[0].shift,n:w.employees[0].name}});
await A.evaluate(()=>{const e=week().employees[1];e.shift=0;render()});
await A.evaluate(()=>{const el=document.querySelector('input[data-employee="1"][data-field=fixo]');el.click()});await A.waitForTimeout(300);
const f1=await A.evaluate(()=>({dis:!!document.querySelector('select[data-employee="1"][data-field=shift]').disabled,tbl:!!document.querySelector('select.tbl-sel[data-employee="1"][data-field=shift]').disabled,fx:roster()[1].fixo}));
T('marcar turno fixo trava a caixa de turno',f1.dis&&f1.tbl&&f1.fx===0,JSON.stringify(f1));
await A.evaluate(()=>{document.querySelector('[data-complete]').click()});await A.waitForTimeout(2500);
await A.evaluate(()=>{applyRotation&&0});
const f2=await A.evaluate(()=>sector().weeks.map(w=>w.employees[1].shift));
T('fixa fica no mesmo turno nas 4 semanas',f2.every(x=>x===0),JSON.stringify(f2));
await A.evaluate(()=>{const w=week();w.rotation.counts=[4,4,4];applyRotation()});await A.waitForTimeout(300);
const f3=await A.evaluate(()=>sector().weeks.map(w=>w.employees[1].shift));
T('rodízio não mexe em quem é fixa',f3.every(x=>x===0),JSON.stringify(f3));
await A.evaluate(()=>{document.querySelector('input[data-employee="1"][data-field=fixo]').click()});await A.waitForTimeout(300);
const f4=await A.evaluate(()=>({dis:!!document.querySelector('select[data-employee="1"][data-field=shift]').disabled,fx:roster()[1].fixo}));
T('desmarcar libera a troca de turno',!f4.dis&&f4.fx===undefined,JSON.stringify(f4));
// 7) domingo: férias não aparece como opção
await A.evaluate(()=>{const e=week().employees;const r=roster()[3];const d=ymd(date('domingo',0));r.aus=[{tipo:'ferias',de:d,ate:ymd(date('sábado',0))}];e[3].sundayWork=false;render()});
const dm=await A.evaluate(()=>{const nm=week().employees[3].name;const sel=document.getElementById('addSunSel');const opts=[...sel.options];return {noOk:!opts.some(o=>!o.disabled&&o.textContent.startsWith(nm)),dis:opts.filter(o=>o.disabled&&o.textContent.startsWith(nm)).map(o=>o.textContent)}});
T('quem está de férias não pode ser adicionada ao domingo',dm.noOk&&dm.dis.length===1&&/de férias/.test(dm.dis[0]),JSON.stringify(dm));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
