const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.evaluate(()=>document.querySelector('.tab[data-tab=rules]').click());await A.waitForTimeout(200);
T('cada posto em uso tem a linha "Evitar folga em"',await A.evaluate(()=>document.querySelectorAll('#offRulesPanel .rule-days').length===document.querySelectorAll('#offRulesPanel [data-rule-post]:checked').length&&document.querySelectorAll('#offRulesPanel .rule-days').length>0));
T('padrão: só o sábado marcado em todos',await A.evaluate(()=>[...document.querySelectorAll('#offRulesPanel [data-rule-avoid]:checked')].every(x=>x.dataset.ruleAvoid.endsWith('|sábado'))&&document.querySelectorAll('#offRulesPanel [data-rule-avoid]:checked').length===document.querySelectorAll('#offRulesPanel .rule-days').length));
T('domingo não aparece como opção',await A.evaluate(()=>![...document.querySelectorAll('[data-rule-avoid]')].some(x=>x.dataset.ruleAvoid.endsWith('|domingo'))));
// conta folgas de 'fiscal' por dia, gerando as sugestões
// cenário: 3 pessoas no Fiscal, 5x2 → folgas distribuídas ao longo da semana
const conta=()=>A.evaluate(()=>{state.selectedSector='frente-caixa';state.selectedWeek=0;setActive(12);const w=week();w.model='5x2';
 w.employees.forEach((e,i)=>{const k=i<3?'fiscal':'caixa';e.station=k;roster()[i].station=k;e.sundayWork=false;e.offDays=['segunda','terça']});
 const r={};for(let n=0;n<8;n++){balanceOffs(week(),true);week().employees.filter(e=>e.station==='fiscal').forEach(e=>e.offDays.forEach(d=>r[d]=(r[d]||0)+1))}render();return r});
const antes=await conta();
// UI real: fiscal passa a evitar a terça (e libera o sábado)
await A.click('#offRulesPanel [data-rule-avoid="fiscal|terça"]',{force:true});await A.waitForTimeout(200);
T('marcar a terça do Fiscal grava só para o Fiscal',await A.evaluate(()=>JSON.stringify(regras().avoidDays)===JSON.stringify({fiscal:['terça','sábado']})),await A.evaluate(()=>JSON.stringify(regras().avoidDays)));
await A.click('#offRulesPanel [data-rule-avoid="fiscal|quarta"]',{force:true});await A.waitForTimeout(100);
T('o painel mantém o sábado marcado nos outros postos',await A.evaluate(()=>document.querySelector('[data-rule-avoid="recepcao|sábado"]').checked&&!document.querySelector('[data-rule-avoid="recepcao|terça"]').checked));
const dep=await conta();
T('com a quarta evitada, o Fiscal deixa de folgar na quarta',(antes['quarta']||0)>0&&!dep['quarta'],JSON.stringify(antes)+' → '+JSON.stringify(dep));
await A.click('#offRulesPanel [data-rule-avoid="fiscal|sábado"]',{force:true});await A.waitForTimeout(200);
T('liberar o sábado do Fiscal não mexe nos outros postos',await A.evaluate(()=>evitaDia('recepcao','sábado')&&!evitaDia('fiscal','sábado')&&evitaDia('fiscal','terça')));
await A.waitForTimeout(1800);
T('regra salva na nuvem junto das configurações',await A.evaluate(()=>{const c=__db.escalas.find(e=>e.setor==='_config');return !!c&&JSON.stringify(c.dados.settings.rules['frente-caixa'].avoidDays.fiscal)===JSON.stringify(['terça','quarta'])}));
T('o quadradinho geral de sábado não existe mais (só por posto)',await A.evaluate(()=>!document.getElementById('ruleSat')));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
