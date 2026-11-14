const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));
const route=async p=>{await p.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));await p.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}))};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();await route(A);A.on('pageerror',e=>console.log('ERR',e.message));
const login=async(p,u)=>{await p.fill('#loginEmail',u);await p.fill('#loginPass','ok');await p.click('#loginBtn');await p.waitForTimeout(1500)};
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);await login(A,'a@a');
// admin define 7 colaboradoras na Frente de Caixa
await A.evaluate(()=>{state.sectors['frente-caixa'].weeks.forEach(w=>{w.activeCount=7});normalize();save()});await A.waitForTimeout(1800);
T('linhas do admin têm dono u1',await A.evaluate(()=>__db.escalas.length>0&&__db.escalas.every(e=>e.dono==='u1')),await A.evaluate(()=>__db.escalas.length+' linhas'));
// cria usuário B
await A.click('#adminBtn');await A.waitForTimeout(500);
T('sem campos de setor no painel',await A.evaluate(()=>!document.querySelector('#adminOverlay [data-set]')));
await A.fill('#nvNome','Joãozinho');await A.fill('#nvEmail','joao@x.com');await A.fill('#nvSenha','segredo1');await A.click('#nvCriar');await A.waitForTimeout(600);
T('criou Joãozinho como usuário',await A.evaluate(()=>__db.perfis.some(p=>p.email==='joao@x.com'&&p.papel==='usuario')));
await A.click('#admFechar');await A.click('#logoutBtn');await A.waitForTimeout(1200);
// login como B
await A.waitForTimeout(1500);
const idB=await A.evaluate(()=>__db.perfis.find(p=>p.email==='joao@x.com').id);
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.evaluate(id=>{window.__user=id},idB);await login(A,'joao@x.com');
T('B não vê o botão Painel ADM',await A.evaluate(()=>document.getElementById('adminBtn').hidden));
const nB=await A.evaluate(()=>state.sectors['frente-caixa'].weeks[0].activeCount);
T('B NÃO recebe os dados do admin (7 colaboradoras)',nB!==7,'tem '+nB);
await A.evaluate(()=>{state.sectors['frente-caixa'].weeks.forEach(w=>{w.activeCount=3});normalize();save()});await A.waitForTimeout(1800);
T('linhas de B têm dono B',await A.evaluate(id=>__db.escalas.filter(e=>e.dono===id).length>0,idB));
T('dados do admin intactos',await A.evaluate(()=>__db.escalas.find(e=>e.dono==='u1'&&e.setor==='frente-caixa').dados.weeks[0].activeCount===7));
await A.click('#logoutBtn');await A.waitForTimeout(1200);
// volta como admin e abre dados de B
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);await A.evaluate(()=>{window.__user='u1'});await login(A,'a@a');
T('admin vê os seus 7',await A.evaluate(()=>state.sectors['frente-caixa'].weeks[0].activeCount)===7);
await A.click('#adminBtn');await A.waitForTimeout(500);await A.click('.adm-abas [data-aba=resumo]');
T('resumo mostra dados por conta',await A.evaluate(()=>document.querySelectorAll('[data-abrir]').length)===2);
await A.locator('[data-abrir]').nth(1).click();await A.waitForTimeout(1500);
T('abriu dados de B (3 colaboradoras)',await A.evaluate(()=>state.sectors['frente-caixa'].weeks[0].activeCount)===3);
T('faixa "vendo dados de"',await A.evaluate(()=>!document.getElementById('verComo').hidden),await A.textContent('#verComoTxt'));
await A.evaluate(()=>{state.sectors['frente-caixa'].weeks.forEach(w=>{w.activeCount=2});normalize();save()});await A.waitForTimeout(1800);
T('admin editou dados de B',await A.evaluate(id=>__db.escalas.find(e=>e.dono===id&&e.setor==='frente-caixa').dados.weeks[0].activeCount===2,idB));
T('dados do admin continuam 7',await A.evaluate(()=>__db.escalas.find(e=>e.dono==='u1'&&e.setor==='frente-caixa').dados.weeks[0].activeCount===7));
await A.click('#verComoVolta');await A.waitForTimeout(1500);
T('voltou aos dados do admin (7)',await A.evaluate(()=>state.sectors['frente-caixa'].weeks[0].activeCount)===7);
T('faixa some',await A.evaluate(()=>document.getElementById('verComo').hidden));
await b.close()})();
