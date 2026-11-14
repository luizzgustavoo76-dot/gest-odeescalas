const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));
const route=async p=>{await p.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));await p.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}))};
const ctx=await b.newContext({viewport:{width:1400,height:900},acceptDownloads:true});const A=await ctx.newPage();await route(A);A.on('pageerror',e=>console.log('ERR',e.message));
const login=async(p,u)=>{await p.fill('#loginEmail',u);await p.fill('#loginPass','ok');await p.click('#loginBtn');await p.waitForTimeout(1500)};
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);await login(A,'a@a');
T('admin: app lembra do backup (consulta a função)',await A.evaluate(()=>__calls.includes('fn listar')));
T('admin: toast de backup',/backup/i.test(await A.textContent('#toast')));
// conta do admin NÃO em branco? (nova conta do admin também é em branco)
T('conta sem dados abre em branco (1 colaboradora)',await A.evaluate(()=>state.sectors['frente-caixa'].weeks.every(w=>w.activeCount===1&&w.employees.length===1)));
T('aviso de conta nova visível',await A.evaluate(()=>!document.getElementById('contaNova').hidden));
T('nada gravado antes de mexer',await A.evaluate(()=>__db.escalas.length===0));
await A.evaluate(()=>{setActive(4)});await A.waitForTimeout(1800);
T('ao editar, grava',await A.evaluate(()=>__db.escalas.some(e=>e.setor==='frente-caixa')));
T('aviso some após salvar',await A.evaluate(()=>document.getElementById('contaNova').hidden));
// trocar senha
await A.click('#pwBtn');T('form de trocar senha aparece',await A.evaluate(()=>!document.getElementById('passForm').hidden&&!document.getElementById('passCancel').hidden));
await A.fill('#passNova','abc');await A.fill('#passRep','abc');await A.evaluate(()=>document.getElementById('passForm').requestSubmit());await A.waitForTimeout(200);
await A.evaluate(()=>{document.getElementById('passNova').removeAttribute('minlength');document.getElementById('passRep').removeAttribute('minlength')});
await A.evaluate(()=>document.getElementById('passForm').requestSubmit());await A.waitForTimeout(300);
T('senha curta recusada',/pelo menos 6/.test(await A.textContent('#passErr')));
await A.fill('#passNova','segredo123');await A.fill('#passRep','outra1234');await A.evaluate(()=>document.getElementById('passForm').requestSubmit());await A.waitForTimeout(300);
T('senhas diferentes recusadas',/não são iguais/.test(await A.textContent('#passErr')));
await A.fill('#passNova','igual123');await A.fill('#passRep','igual123');await A.evaluate(()=>document.getElementById('passForm').requestSubmit());await A.waitForTimeout(300);
T('mesma senha recusada com mensagem',/diferente da atual/.test(await A.textContent('#passErr')));
await A.fill('#passNova','novasenha1');await A.fill('#passRep','novasenha1');await A.evaluate(()=>document.getElementById('passForm').requestSubmit());await A.waitForTimeout(400);
T('senha trocada e tela liberada',await A.evaluate(()=>__calls.includes('updateUser novasenha1')&&document.getElementById('loginOverlay').hidden));
// backup
await A.click('#adminBtn');await A.waitForTimeout(500);await A.click('.adm-abas [data-aba=backup]');
const [dl]=await Promise.all([A.waitForEvent('download'),A.click('#bkBaixar')]);
const nome=dl.suggestedFilename();const caminho=require('os').tmpdir()+'/bk.json';await dl.saveAs(caminho);const bk=JSON.parse(fs.readFileSync(caminho,'utf8'));
T('baixou backup .json',/^backup-bom-dia-.*\.json$/.test(nome)&&bk.sistema==='bom-dia-gestao-escalas'&&bk.escalas.length>0,nome+' · '+bk.escalas.length+' linhas');
T('mensagem de backup gerado',/Backup gerado/.test(await A.textContent('#admMsg')));
await A.setInputFiles('#bkArq',caminho);await A.waitForTimeout(300);
T('pede confirmação antes de restaurar',await A.evaluate(()=>!!document.getElementById('bkOk')));
await A.click('#bkOk');await A.waitForTimeout(500);
T('restaurou',/restaurada/.test(await A.textContent('#admMsg')),await A.textContent('#admMsg'));
fs.writeFileSync(require('os').tmpdir()+'/ruim.json','{"x":1}');await A.setInputFiles('#bkArq',require('os').tmpdir()+'/ruim.json');await A.waitForTimeout(300);
T('arquivo inválido recusado',/não é um backup válido/.test(await A.textContent('#admMsg')));

// recuperar senha por link
const R=await ctx.newPage();await route(R);R.on('pageerror',e=>console.log('ERR',e.message));
await R.goto(BASE+'/index.html#access_token=x&type=recovery');await R.waitForTimeout(1200);
T('link de recuperação abre "Defina sua nova senha"',await R.evaluate(()=>!document.getElementById('passForm').hidden&&/Defina/.test(document.getElementById('passTitle').textContent)&&document.getElementById('passCancel').hidden));
T('app não carrega por trás',await R.evaluate(()=>!document.getElementById('loginOverlay').hidden));
await R.fill('#passNova','recuperada1');await R.fill('#passRep','recuperada1');await R.evaluate(()=>document.getElementById('passForm').requestSubmit());await R.waitForTimeout(1500);
T('após definir, entra no app',await R.evaluate(()=>document.getElementById('loginOverlay').hidden&&!location.hash));
// link expirado
const E=await ctx.newPage();await route(E);await E.evaluate(()=>sessionStorage.clear()).catch(()=>{});
await E.goto(BASE+'/index.html#error=access_denied&error_code=otp_expired&error_description=expired');await E.waitForTimeout(800);
await E.evaluate(()=>sessionStorage.removeItem('msess'));await E.reload();await E.waitForTimeout(800);
T('link expirado mostra aviso no login',/expirou/.test(await E.textContent('#loginErr')));
await b.close()})();
