const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const ctx=await b.newContext({viewport:{width:1400,height:900}});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
T('viewport sem zoom',await A.evaluate(()=>/user-scalable=no/.test(document.querySelector('meta[name=viewport]').content)&&/maximum-scale=1/.test(document.querySelector('meta[name=viewport]').content)));
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
await A.click('#adminBtn');await A.waitForTimeout(500);
// abre o histórico e troca de aba antes da resposta chegar
await A.click('[data-aba=historico]');await A.click('[data-aba=resumo]');await A.waitForTimeout(1500);
T('trocar de aba durante o histórico não gera erro',errs.length===0,errs.join(';'));
await A.click('[data-aba=historico]');await A.waitForTimeout(1000);
T('histórico normal carrega',await A.locator('#hLista').count()===1);
await b.close()})();
