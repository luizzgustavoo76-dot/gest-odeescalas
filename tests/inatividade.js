const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1200,height:800}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.addInitScript(()=>{window.INATIVIDADE_MS={admin:3000,usuario:6000,aviso:1500}});
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
const entra=async()=>{await A.waitForSelector('#loginBtn',{state:'visible'});await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForFunction(()=>!document.getElementById('userBar').hidden,null,{timeout:5000})};
const logado=()=>A.evaluate(()=>!document.getElementById('userBar').hidden);
await A.goto(BASE+'/index.html');await entra();
T('logado como administrador',await logado()&&/administrador/.test(await A.textContent('#userWho')));
await A.waitForTimeout(1900);
T('1 min antes (aqui 1,5 s) aparece o aviso de inatividade',await A.evaluate(()=>!!document.getElementById('inatAviso')&&/desconectado por inatividade/.test(document.getElementById('inatAviso').textContent)));
await A.evaluate(()=>document.getElementById('inatFica').click());await A.waitForTimeout(300);
T('"Continuar conectado" fecha o aviso e mantém o login',await A.evaluate(()=>!document.getElementById('inatAviso'))&&await logado());
// usando o sistema, não cai
for(let i=0;i<6;i++){await A.keyboard.press('Shift');await A.waitForTimeout(700)}
T('enquanto usa (4 s > limite de 3 s) continua logado e sem aviso',await logado()&&await A.evaluate(()=>!document.getElementById('inatAviso')));
// alteração pendente + inatividade: salva e sai
await A.evaluate(()=>{week().employees[0].name='Teste Inativo';render();if(typeof saveState==='function')saveState()});
await A.waitForSelector('#loginBtn',{state:'visible',timeout:8000});
T('sem uso pelo tempo limite: volta para a tela de login',true);
T('tela de login explica o motivo',/desconectado por inatividade/.test(await A.textContent('#loginErr')),await A.textContent('#loginErr'));
// sessão guardada e navegador fechado por mais que o limite: pede login de novo
await entra();
await A.evaluate(()=>localStorage.setItem('escalas-ultimo-uso',String(Date.now()-60000)));
await A.reload();await A.waitForSelector('#loginBtn',{state:'visible',timeout:8000});
T('reabrir depois de muito tempo parado pede login de novo',/desconectado por inatividade/.test(await A.textContent('#loginErr')));
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
