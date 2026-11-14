const BASE=process.env.BASE||'http://localhost:8765';
const {chromium,devices}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));
const route=async p=>{await p.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));await p.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}))};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();await route(A);const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.addInitScript(()=>{window.__abertos=[];window.open=(u)=>{window.__abertos.push(u);return {}}});
await A.goto(BASE+'/index.html');await A.waitForTimeout(600);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.evaluate(()=>{setActive(9);const r=roster();['ANA','BIA','CARLA','DANI','ELIS','FABI','GABI','HELO','IVA'].forEach((n,i)=>r[i].name=n);render()});
// ordem das linhas
const nomes=()=>A.evaluate(()=>[...document.querySelectorAll('#scheduleTable tbody .employee-link')].map(x=>x.textContent).join(','));
const antes=await nomes();
await A.selectOption('#scheduleTable tbody tr:first-child select[data-field=shift]','2');await A.waitForTimeout(200);
T('trocar turno na tabela não muda a ordem das linhas',await nomes()===antes,await nomes());
T('aparece aviso com "Reordenar agora"',!!(await A.$('#reordenarBtn')));
await A.click('#reordenarBtn');await A.waitForTimeout(200);
T('reordenar aplica a ordem por horário',await nomes()!==antes&&!(await A.$('#ordemAviso')),await nomes());
// regras: sábado
await A.evaluate(()=>document.querySelector('.tab[data-tab=rules]').click());
T('painel de regras aparece',await A.evaluate(()=>document.querySelectorAll('#offRulesPanel .rule-row').length)===4);
T('padrão: Recepção e Fiscal não folgam juntas',await A.evaluate(()=>[...document.querySelectorAll('#offRulesPanel [data-rule-nso]:checked')].map(x=>x.dataset.ruleNso).sort().join())==='fiscal,recepcao');
const sab=()=>A.evaluate(()=>{const g=JSON.stringify(state.sectors);state.sectors['frente-caixa'].weeks.forEach(w=>w.activeCount=20);normalize();sector().weeks.forEach(w=>balanceOffs(w,true));const n=state.sectors['frente-caixa'].weeks.reduce((t,w)=>t+w.employees.filter(e=>e.offDays.includes('sábado')).length,0);state.sectors=JSON.parse(g);render();return n});
const s1=await sab();
await A.uncheck('#ruleSat');const s2=await sab();
T('desligar "evitar sábado" passa a usar o sábado nas sugestões',s2>s1,s1+' → '+s2);
await A.check('#ruleSat');
// postos: desativar Pacote
await A.uncheck('#offRulesPanel [data-rule-post=pacote]');await A.waitForTimeout(200);
T('posto desativado some das listas',await A.evaluate(()=>!postKeys().includes('pacote')&&![...document.querySelectorAll('#scheduleTable select[data-field=station] option')].some(o=>o.value==='pacote')));
await A.check('#offRulesPanel [data-rule-post=pacote]');
// posto novo
await A.fill('#rulePostName','Balcão');await A.click('#rulePostAdd');await A.waitForTimeout(200);
const kNovo=await A.evaluate(()=>postKeys().find(k=>k.startsWith('x_')));
T('posto novo criado e disponível na tabela',!!kNovo&&await A.evaluate(k=>[...document.querySelectorAll('#scheduleTable select[data-field=station] option')].some(o=>o.value===k&&o.textContent==='Balcão'),kNovo));
await A.selectOption('#scheduleTable tbody tr:first-child select[data-field=station]',kNovo);await A.waitForTimeout(1800);
T('posto novo salvo na nuvem (config + pessoa)',await A.evaluate(k=>{const c=__db.escalas.find(e=>e.setor==='_config').dados.settings.rules['frente-caixa'].custom;const p=__db.escalas.find(e=>e.setor==='frente-caixa').dados;return c[0].name==='Balcão'&&p.weeks[0].employees.some(e=>e.station===k)},kNovo));
await A.reload();await A.waitForTimeout(2000);
T('posto novo continua depois de recarregar',await A.evaluate(k=>POST_NAMES[k]==='Balcão'&&week().employees.some(e=>e.station===k),kNovo));
// WhatsApp
await A.click('#whatsButton');await A.waitForTimeout(200);
const url=await A.evaluate(()=>__abertos[0]||'');const txt=decodeURIComponent(url.split('text=')[1]||'');
T('WhatsApp abre wa.me com o texto da escala',/^https:\/\/wa\.me\/\?text=/.test(url)&&/Escala · Frente de Caixa/.test(txt)&&/ANA/.test(txt)&&/folgas:/.test(txt)&&/Domingo/.test(txt));

// impressão: fonte do domingo com teto
T('fonte do domingo limitada a 14pt',await A.evaluate(()=>printMetrics(2,150,11,14).font<=14&&printMetrics(2,150,11,14).row<=11));
// instalar como app
const man=await A.evaluate(async()=>{const r=await fetch(document.querySelector('link[rel=manifest]').href);return r.ok?await r.json():null});
const ic=await A.evaluate(async()=>(await fetch('icon-512.png')).ok&&(await fetch('icon-192.png')).ok&&(await fetch('icon-maskable-512.png')).ok);
T('manifesto e ícones para instalar',!!man&&man.display==='standalone'&&man.icons.length===3&&ic);
console.log('erros de página:',errs.length,errs.slice(0,3));
// celular
const M=await (await b.newContext({...devices['iPhone 13']})).newPage();await route(M);
await M.goto(BASE+'/index.html');await M.waitForTimeout(600);
await M.fill('#loginEmail','a@a');await M.fill('#loginPass','ok');await M.click('#loginBtn');await M.waitForTimeout(1500);
T('celular abre em Resumo',await M.evaluate(()=>document.body.classList.contains('resumo-cel')&&getComputedStyle(document.querySelector('#scheduleTable td[data-label="Turno"]')).display==='none'));
await M.click('#mobView [data-mv=editar]');
T('celular: Editar mostra os campos',await M.evaluate(()=>!document.body.classList.contains('resumo-cel')&&getComputedStyle(document.querySelector('#scheduleTable td[data-label="Turno"]')).display!=='none'));
T('celular: sem rolagem lateral',await M.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await b.close()})();
