const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
const W=ms=>A.waitForTimeout(ms);
await A.evaluate(()=>{state.selectedSector='frente-caixa';state.selectedWeek=0;setActive(12);week().model='5x2';render()});
await A.evaluate(()=>document.querySelector('[data-complete]').click());await W(2500);
const idx=3;
// sem dias marcados → erro
await A.evaluate(i=>{week().employees[i].offDays=[];render()},idx);
await A.evaluate(i=>{toastErroEm=0;document.querySelector(`input[data-employee="${i}"][data-field=folgaFixa]`).click()},idx);await W(200);
T('sem folgas marcadas, a caixinha avisa e não ativa',await A.evaluate(i=>!roster()[i].folgaFixa&&/marque primeiro/.test(document.getElementById('toast').textContent),idx));
// fixa quarta e sexta
await A.evaluate(i=>{const e=week().employees[i];e.sundayWork=true;e.offDays=['quarta','sexta'];render()},idx);
await A.evaluate(i=>document.querySelector(`input[data-employee="${i}"][data-field=folgaFixa]`).click(),idx);await W(300);
let st=await A.evaluate(i=>({f:roster()[i].folgaFixa,dis:[...document.querySelectorAll(`input[data-employee="${i}"][data-off]`)].filter(x=>x.disabled).map(x=>x.dataset.off)}),idx);
T('folga fixa guarda os dias e trava as caixas deles',JSON.stringify(st.f)==='["quarta","sexta"]'&&st.dis.includes('quarta')&&st.dis.includes('sexta'),JSON.stringify(st));
// recalcular: Completar + sugerir
await A.evaluate(()=>document.querySelector('[data-complete]').click());await W(300);
await A.evaluate(()=>{const o=document.querySelector('.ask-overlay [data-a="1"]');o&&o.click()});await W(2500);
for(let k=0;k<4;k++){await A.evaluate(()=>{});}
const all=await A.evaluate(i=>sector().weeks.map(w=>({off:w.employees[i].offDays,dom:w.employees[i].sundayWork})),idx);
T('depois de completar, a folga fixa é a mesma nas semanas (quarta sempre; sexta quando ela trabalha domingo)',all.every(x=>x.off.includes('quarta')&&x.off.every(d=>['quarta','sexta'].includes(d))&&(!x.dom||x.off.length===2)),JSON.stringify(all));
await A.evaluate(i=>{balanceOffs(week(),false);render()},idx);
const apos=await A.evaluate(i=>week().employees[i].offDays,idx);
T('recalcular as folgas da semana não troca os dias fixos',apos.every(d=>['quarta','sexta'].includes(d))&&apos.length>=1,JSON.stringify(apos));
// semana 2 também
await A.evaluate(()=>{state.selectedWeek=1;render();balanceOffs(week(),false);render()});
const s2=await A.evaluate(i=>week().employees[i].offDays,idx);
T('semana 2 também mantém',s2.every(d=>['quarta','sexta'].includes(d)),JSON.stringify(s2));
// liberar
await A.evaluate(()=>{state.selectedWeek=0;render()});
await A.evaluate(i=>document.querySelector(`input[data-employee="${i}"][data-field=folgaFixa]`).click(),idx);await W(300);
st=await A.evaluate(i=>({f:roster()[i].folgaFixa,dis:[...document.querySelectorAll(`input[data-employee="${i}"][data-off]`)].filter(x=>x.disabled).length}),idx);
T('desmarcar libera as caixas e o gerador',!st.f&&st.dis===0,JSON.stringify(st));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
