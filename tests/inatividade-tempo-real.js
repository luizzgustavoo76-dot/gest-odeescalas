/* Os tempos de verdade (15 min admin / 30 min usuário), com relógio simulado: ninguém fica logado além do limite */
const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const novo=async(user)=>{const ctx=await b.newContext({viewport:{width:1200,height:800}});const A=await ctx.newPage();
 await A.clock.install({time:new Date('2026-11-15T12:00:00')});
 if(user)await A.addInitScript(()=>{sessionStorage.setItem('mdb',JSON.stringify({escalas:[],perfis:[{id:'u1',email:'a@a',papel:'usuario'}]}))});
 await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
 await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
 await A.goto(BASE+'/index.html');await A.clock.runFor(1500);
 await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.clock.runFor(3000);return A};
const estado=async(A)=>{for(let i=0;i<5;i++){try{return await A.evaluate(()=>({logado:!document.getElementById('userBar').hidden,aviso:!!document.getElementById('inatAviso'),quem:document.getElementById('userWho').textContent}))}catch(e){await A.waitForTimeout(300)}}return {logado:false,aviso:false,quem:'?'}};
for(const [nome,user,min] of [['administrador',null,15],['usuário','u1',30]]){
 const A=await novo(user);let s=await estado(A);
 T(nome+': entrou',s.logado,s.quem);
 await A.clock.runFor((min-2)*60e3);s=await estado(A);
 T(nome+': aos '+(min-2)+' min ainda conectado, sem aviso',s.logado&&!s.aviso);
 await A.clock.runFor(90e3);s=await estado(A);
 T(nome+': perto do limite aparece o aviso',s.logado&&s.aviso);
 await A.clock.runFor(60e3);await A.clock.runFor(8000);await A.waitForTimeout(500);s=await estado(A);
 T(nome+': passou de '+min+' min parado → volta para a tela de login',!s.logado);
 await A.context().close()}
await b.close()})();
