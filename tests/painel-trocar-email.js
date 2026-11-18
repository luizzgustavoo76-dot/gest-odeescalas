const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.click('#adminBtn');await A.waitForTimeout(500);
await A.fill('#nvNome','Maria');await A.fill('#nvEmail','maria@x.com');await A.fill('#nvSenha','segredo1');await A.click('#nvCriar');await A.waitForTimeout(700);
await A.fill('#nvNome','Joana');await A.fill('#nvEmail','joana@x.com');await A.fill('#nvSenha','segredo2');await A.click('#nvCriar');await A.waitForTimeout(700);
const card=()=>A.locator('.adm-user',{hasText:'maria@x.com'}).first();
await A.evaluate(()=>[...document.querySelectorAll('.adm-user')].forEach(c=>{c.querySelector('[data-a=abrir]')&&0}));
await A.locator('.adm-user[data-email="maria@x.com"] [data-a=abrir]').click();
T('campo de e-mail aparece na edição',await A.locator('.adm-user[data-email="maria@x.com"] [data-f=email]').inputValue()==='maria@x.com');
// e-mail já usado
await A.fill('.adm-user[data-email="maria@x.com"] [data-f=email]','joana@x.com');
await A.click('.adm-user[data-email="maria@x.com"] [data-a=salvar]');await A.waitForTimeout(600);
T('e-mail de outra conta é recusado',await A.evaluate(()=>__db.perfis.find(p=>p.nome==='Maria').email==='maria@x.com')&&/Já existe/.test(await A.textContent('#admMsg')));
// troca válida
await A.fill('.adm-user[data-email="maria@x.com"] [data-f=email]','  Maria.Nova@X.com ');
await A.click('.adm-user[data-email="maria@x.com"] [data-a=salvar]');await A.waitForTimeout(700);
T('e-mail alterado (minúsculo, sem espaços)',await A.evaluate(()=>__db.perfis.find(p=>p.nome==='Maria').email==='maria.nova@x.com'));
T('painel avisa que ela entra com o novo e-mail',await A.evaluate(()=>/novo e-mail/.test(document.getElementById('admMsg').textContent)));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
