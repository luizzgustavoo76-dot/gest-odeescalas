const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
for(const [nome,vp] of [['PC',{width:1400,height:900}],['celular',{width:390,height:844}]]){
const A=await (await b.newContext({viewport:vp})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
T(nome+': menu da conta começa fechado',await A.evaluate(()=>document.getElementById('userMenu').hidden));
T(nome+': botões de ação na mesma fila',await A.evaluate(()=>{const ids=['xlsxFile','afdFile'].map(i=>document.getElementById(i).parentElement),bs=[...ids,document.getElementById('histPontoBtn'),document.getElementById('printFileButton')];const ys=bs.map(e=>Math.round(e.getBoundingClientRect().top));return Math.max(...ys)-Math.min(...ys)<4}));
T(nome+': Importar e Conferir lado a lado',await A.evaluate(()=>{const a=document.getElementById('xlsxFile').parentElement.getBoundingClientRect(),c=document.getElementById('afdFile').parentElement.getBoundingClientRect();return Math.abs(a.top-c.top)<3&&c.left>=a.right-1||nome==='x'}));
await A.click('#userMenuBtn');
T(nome+': clicar no nome abre o menu com Painel ADM, Histórico, Trocar senha e Sair',await A.evaluate(()=>!document.getElementById('userMenu').hidden&&['adminBtn','histBtn','pwBtn','logoutBtn'].every(i=>document.getElementById(i)&&document.getElementById(i).offsetParent!==null)));
await A.click('#adminBtn');await A.waitForTimeout(500);
T(nome+': Painel ADM abre e o menu fecha',await A.evaluate(()=>!!document.querySelector('.adm-box')&&document.getElementById('userMenu').hidden));
await A.click('#admFechar');
await A.click('#userMenuBtn');await A.keyboard.press('Escape');
T(nome+': Esc fecha o menu',await A.evaluate(()=>document.getElementById('userMenu').hidden));
await A.click('#userMenuBtn');await A.click('h2');await A.waitForTimeout(100);
T(nome+': clicar fora fecha o menu',await A.evaluate(()=>document.getElementById('userMenu').hidden));
T(nome+': sem rolagem lateral',await A.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
T(nome+': sem erros de página',errs.length===0,errs.join(';'));
}
await b.close()})();
