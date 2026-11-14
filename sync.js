/* ===== Login + dados 100% na nuvem (Supabase) =====
   - Nada de escala, nome ou folga é lido ou gravado no aparelho: tudo vem e vai para o Supabase.
   - No aparelho ficam só preferências visuais (painéis recolhidos, setor/semana abertos) e o login.
   - Sem conexão com a nuvem o app NÃO abre.
   - Antes de salvar, confere a versão: se outra pessoa alterou o setor, recarrega a versão nova em vez de sobrescrever. */
(function(){
  const BUILD='build '+((document.querySelector('meta[name=build]')||{}).content||'?');
  const cfg=window.SUPABASE_CONFIG||{};
  try{document.getElementById('buildTag').textContent=BUILD}catch(e){}
  const $=id=>document.getElementById(id);
  const SETORES=()=>Object.keys(state.sectors);
  const nomeSetor=s=>(typeof SECTORS!=='undefined'&&SECTORS[s])||(s==='_config'?'configurações gerais':s);
  const hora=()=>new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const status=(t,cls)=>{const e=$('statusText');if(e){e.textContent=t;e.dataset.sync=cls||''}};
  const warn=m=>{try{toast(m)}catch(e){console.warn(m)}};

  /* ---------- telas de bloqueio: login / carregando / erro ---------- */
  const ov=document.createElement('div');ov.id='loginOverlay';ov.hidden=false;
  ov.innerHTML=`
   <form id="loginForm" class="login-card" autocomplete="on" hidden><img src="logo.png" alt="Bom Dia" class="login-logo"><h2>Gestão de Escalas</h2><p>Entre com seu e-mail e senha.</p><label>E-mail<input id="loginEmail" type="email" required autocomplete="username"></label><label>Senha<input id="loginPass" type="password" required autocomplete="current-password"></label><p id="loginErr" class="login-err" hidden></p><button class="button" type="submit" id="loginBtn">Entrar</button><button class="link-btn" type="button" id="loginReset">Esqueci minha senha</button></form>
   <form id="passForm" class="login-card" hidden><img src="logo.png" alt="Bom Dia" class="login-logo"><h2 id="passTitle">Nova senha</h2><p id="passDesc"></p><label>Nova senha (mín. 6 caracteres)<input id="passNova" type="password" required minlength="6" autocomplete="new-password"></label><label>Repita a nova senha<input id="passRep" type="password" required minlength="6" autocomplete="new-password"></label><p id="passErr" class="login-err" hidden></p><button class="button" type="submit" id="passBtn">Salvar nova senha</button><button class="link-btn" type="button" id="passCancel">Cancelar</button></form>
   <div id="loadCard" class="login-card"><img src="logo.png" alt="Bom Dia" class="login-logo"><h2>Carregando…</h2><p id="loadMsg">Buscando as escalas na nuvem.</p></div>
   <div id="errCard" class="login-card" hidden><img src="logo.png" alt="Bom Dia" class="login-logo"><h2 id="errTitle">Sem conexão</h2><p id="errMsg"></p><button class="button" type="button" id="errRetry">Tentar de novo</button><button class="link-btn" type="button" id="errOut">Sair</button></div>`;
  document.body.appendChild(ov);document.body.classList.add('need-login');
  let retryFn=()=>location.reload();
  let recuperando=/type=recovery/.test(location.hash);
  const linkRuim=/error_code=|error_description=/.test(location.hash);
  const painel=(n,msg)=>{ // 'login' | 'load' | 'err' | null (libera o app)
    $('loginForm').hidden=n!=='login';$('passForm').hidden=n!=='senha';$('loadCard').hidden=n!=='load';$('errCard').hidden=n!=='err';
    ov.hidden=!n;document.body.classList.toggle('need-login',!!n);
    if(n==='load'&&msg)$('loadMsg').textContent=msg;
  };
  const erro=(titulo,msg,retry)=>{$('errTitle').textContent=titulo;$('errMsg').textContent=msg;retryFn=retry||(()=>location.reload());painel('err')};
  $('errRetry').addEventListener('click',()=>retryFn());
  const loginErr=m=>{const e=$('loginErr');e.textContent=m||'';e.hidden=!m};

  if(!cfg.url||!cfg.anonKey){erro('Nuvem não configurada','Preencha a URL e a chave em supabase-config.js. Sem a nuvem o app não abre.');$('errOut').hidden=true;return}
  if(!window.supabase||!window.supabase.createClient){erro('Sem conexão','Não foi possível carregar o serviço da nuvem. Verifique a internet e tente de novo.');$('errOut').hidden=true;return}
  const sb=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true}});

  const ver={};              // versão (atualizado_em) de cada setor, como está na nuvem
  const synced={};           // JSON de cada setor, como está na nuvem
  const sent=[];
  let blank=false,me=null,alvo=null,alvoNome='',perfil=null,timer=null,pushing=false,again=false,applying=false,channel=null,pronto=false,uiOk=false;
  const ehAdmin=()=>!!perfil&&perfil.papel==='admin';
  // cada conta tem os próprios dados; o administrador pode abrir e editar os de qualquer conta

  const traduz=m=>/invalid login/i.test(m)?'E-mail ou senha incorretos.':/email not confirmed/i.test(m)?'E-mail ainda não confirmado.':/rate limit|too many/i.test(m)?'Muitas tentativas. Aguarde um pouco.':'Não foi possível entrar: '+m;
  $('loginForm').addEventListener('submit',async ev=>{
    ev.preventDefault();loginErr('');const b=$('loginBtn');b.disabled=true;b.textContent='Entrando…';
    const {error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPass').value});
    b.disabled=false;b.textContent='Entrar';if(error)loginErr(traduz(error.message));
  });
  $('loginReset').addEventListener('click',async()=>{
    const em=$('loginEmail').value.trim();if(!em){loginErr('Digite seu e-mail e clique de novo.');return}
    const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.href.split('#')[0]});
    loginErr(error?traduz(error.message):'Se esse e-mail tiver conta, enviamos um link para redefinir a senha. Confira também a caixa de spam.');
  });

  /* ---------- trocar senha / recuperar senha ---------- */
  const passErr=m=>{const e=$('passErr');e.textContent=m||'';e.hidden=!m};
  function mostraSenha(recup){
    $('passTitle').textContent=recup?'Defina sua nova senha':'Trocar senha';
    $('passDesc').textContent=recup?'Você entrou pelo link do e-mail. Escolha uma senha nova para continuar.':'Escolha uma nova senha para a sua conta.';
    $('passCancel').hidden=!!recup;$('passNova').value='';$('passRep').value='';passErr('');painel('senha');
  }
  $('passCancel').addEventListener('click',()=>painel(null));
  $('passForm').addEventListener('submit',async ev=>{
    ev.preventDefault();passErr('');
    const a=$('passNova').value,b2=$('passRep').value;
    if(a.length<6){passErr('A senha precisa ter pelo menos 6 caracteres.');return}
    if(a!==b2){passErr('As duas senhas não são iguais.');return}
    const btn=$('passBtn');btn.disabled=true;btn.textContent='Salvando…';
    const {error}=await sb.auth.updateUser({password:a});
    btn.disabled=false;btn.textContent='Salvar nova senha';
    if(error){passErr(/same|different/i.test(error.message)?'Escolha uma senha diferente da atual.':/weak|pwned|leak|compromis/i.test(error.message)?'Essa senha é fraca ou já vazou na internet. Escolha outra.':'Não foi possível trocar: '+error.message);return}
    if(recuperando){recuperando=false;try{history.replaceState(null,'',location.pathname)}catch(e){}location.reload();return}
    painel(null);warn('Senha alterada com sucesso.');
  });

  /* ---------- barra do usuário ---------- */
  const bar=document.createElement('div');bar.id='userBar';bar.hidden=true;
  bar.innerHTML='<span id="userWho"></span><button type="button" class="button outline" id="adminBtn" hidden>Administração</button><button type="button" class="button outline icone" id="undoBtn" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" disabled>↶</button><button type="button" class="button outline icone" id="redoBtn" title="Refazer (Ctrl+Y)" aria-label="Refazer" disabled>↷</button><button type="button" class="button outline" id="histBtn">Histórico</button><button type="button" class="button outline" id="pwBtn">Trocar senha</button><button type="button" class="button" id="logoutBtn">Sair</button>';
  const top=document.querySelector('.top-actions');(top||document.body).appendChild(bar);
  // Sair: encerra a sessão, apaga o login guardado no aparelho e recarrega a página (funciona mesmo com sessão antiga/inválida)
  const sair=async()=>{
    clearTimeout(timer);timer=null;pronto=false;
    try{await Promise.race([sb.auth.signOut({scope:'local'}),new Promise(r=>setTimeout(r,2500))])}catch(e){}
    try{Object.keys(localStorage).filter(k=>/^sb-/.test(k)||k.indexOf('supabase')>=0).forEach(k=>localStorage.removeItem(k))}catch(e){}
    try{Object.keys(sessionStorage).filter(k=>/^sb-/.test(k)).forEach(k=>sessionStorage.removeItem(k))}catch(e){}
    location.reload();
  };
  $('logoutBtn').addEventListener('click',sair);$('errOut').addEventListener('click',sair);
  $('pwBtn').addEventListener('click',()=>mostraSenha(false));
  $('undoBtn').addEventListener('click',()=>desfazer());$('redoBtn').addEventListener('click',()=>refazer());
  $('histBtn').addEventListener('click',()=>abreHistorico());
  $('adminBtn').addEventListener('click',()=>{if(window.abrirAdmin)window.abrirAdmin({sb,eu:me,abrirComo:trocarAlvo,alvo:()=>alvo})});

  /* ---------- erros do app ---------- */
  // os erros também vão para a aba Atividade do administrador (função registrar_erro, no máx. 20 por hora por conta)
  let errosEnviados=0;
  function registraErro(msg,onde){
    try{if(!me||errosEnviados>=10||!msg)return;errosEnviados++;
      sb.rpc('registrar_erro',{mensagem:String(msg).slice(0,500),onde:String(onde||'').slice(0,80)+' · '+BUILD}).then(()=>{},()=>{})}catch(e){}
  }
  window.addEventListener('error',e=>{status('Erro no app: '+e.message,'err');registraErro(e.message+(e.filename?' ('+String(e.filename).split('/').pop()+':'+e.lineno+')':''),'erro na tela')});
  window.addEventListener('unhandledrejection',e=>{const m=(e.reason&&e.reason.message)||e.reason;status('Erro: '+m,'err');registraErro(m,'erro na tela')});

  /* ---------- dados <-> nuvem ---------- */
  const carga=k=>({...state.sectors[k],_roster:(state.roster&&state.roster[k])||[]});
  const cfgDados=()=>({baseMonday:state.baseMonday,settings:state.settings});
  function aplicar(linhas){
    applying=true;
    try{
      state.roster=state.roster||{};
      for(const l of linhas){
        ver[l.setor]=l.atualizado_em;
        if(l.setor==='_config'){
          if(l.dados.baseMonday)state.baseMonday=l.dados.baseMonday;
          if(l.dados.settings)state.settings={...state.settings,...l.dados.settings};
        }else if(state.sectors[l.setor]!==undefined){
          const d={...l.dados},rs=d._roster;delete d._roster;
          state.sectors[l.setor]=d;
          if(Array.isArray(rs)&&rs.length)state.roster[l.setor]=rs;
          else{const em=(d.weeks&&d.weeks[0]&&d.weeks[0].employees)||[];state.roster[l.setor]=em.map(e=>({name:e.name,restricted:!!e.restricted,station:e.station}))}
        }
      }
      try{normalize()}catch(e){console.warn(e)}
      for(const l of linhas){
        if(l.setor==='_config')synced._config=JSON.stringify(cfgDados());
        else if(state.sectors[l.setor]!==undefined)synced[l.setor]=JSON.stringify(carga(l.setor));
      }
      try{render()}catch(e){console.warn(e);status('Erro ao mostrar os dados da nuvem: '+e.message,'err')}
    }finally{applying=false}
    zeraDesfazer();
  }
  function pendentes(){
    const out=[];
    for(const k of SETORES()){const c=carga(k),j=JSON.stringify(c);if(j!==synced[k])out.push({setor:k,dados:c,j})}
    {const c=cfgDados(),cj=JSON.stringify(c);if(cj!==synced._config)out.push({setor:'_config',dados:c,j:cj})}
    return out;
  }
  const rls=e=>e&&/row-level security|permission/i.test(e.message||'');
  async function gravar(it){
    const v=ver[it.setor];
    if(v===undefined){
      const {data,error}=await sb.from('escalas').insert({dono:alvo,setor:it.setor,dados:it.dados}).select();
      if(error){if(error.code==='23505')return'conflito';if(rls(error))return'negado';throw error}
      ver[it.setor]=data[0].atualizado_em;return'ok';
    }
    const {data,error}=await sb.from('escalas').update({dados:it.dados}).eq('dono',alvo).eq('setor',it.setor).eq('atualizado_em',v).select();
    if(error){if(rls(error))return'negado';throw error}
    if(!data||!data.length)return'conflito';
    ver[it.setor]=data[0].atualizado_em;return'ok';
  }
  async function enviar(){
    if(!me||!pronto)return;
    if(pushing){again=true;return}
    pushing=true;
    try{
      const lista=pendentes();if(!lista.length){status('Sincronizado com a nuvem · '+hora(),'ok');return}
      status('Salvando na nuvem…','busy');
      const negado=[],conflito=[];
      for(const it of lista){
        const r=await gravar(it);
        if(r==='ok'){synced[it.setor]=it.j;sent.push(JSON.stringify(it.dados));if(sent.length>30)sent.shift()}
        else if(r==='conflito')conflito.push(it.setor);else negado.push(it.setor);
      }
      if(negado.length||conflito.length){
        if(conflito.length)warn('Outra pessoa alterou '+conflito.map(nomeSetor).join(', ')+' antes de você salvar. Carreguei a versão mais recente: refaça sua alteração.');
        else warn('Você não tem permissão para editar: '+negado.map(nomeSetor).join(', ')+'. Recarreguei a versão da nuvem.');
        const {data,error}=await sb.from('escalas').select('*').eq('dono',alvo).in('setor',conflito.concat(negado));
        if(error)throw error;
        aplicar(data);
      }
      status('Sincronizado com a nuvem · '+hora(),'ok');mostraNova();
    }catch(e){
      console.warn(e);pronto=false;registraErro((e&&e.message)||e,'ao salvar na nuvem');
      erro('Conexão perdida','Não foi possível salvar na nuvem. As últimas alterações não foram salvas. Reconecte e carregue de novo a versão da nuvem.',()=>carregar(true));
    }finally{pushing=false;if(again){again=false;agendar()}}
  }
  function agendar(){if(!me||!pronto||applying)return;clearTimeout(timer);status('Alterações pendentes…','busy');timer=setTimeout(enviar,800)}
  /* atualização automática: confere se saiu versão nova e recarrega sozinho */
  const meuBuild=(document.querySelector('meta[name=build]')||{}).content;
  let verificando=false;
  async function checaVersao(){
    if(verificando||!meuBuild)return;verificando=true;
    try{
      const u=location.href.split('#')[0].split('?')[0];
      const r=await fetch(u+'?_='+Date.now(),{cache:'no-store'});if(!r.ok)return;
      const m=(await r.text()).match(/<meta name="build" content="([^"]+)"/);
      if(!m||m[1]===meuBuild)return;
      if(pronto&&(timer||pendentes().length)){warn('Há uma versão nova do app. Ela será aplicada assim que suas alterações forem salvas.');return}
      location.replace(u+'?v='+m[1]);
    }catch(e){}finally{verificando=false}
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checaVersao()});
  setInterval(checaVersao,120000);setTimeout(checaVersao,4000);
  window.addEventListener('beforeunload',e=>{if(pronto&&(timer||pendentes().length)){e.preventDefault();e.returnValue=''}});

  /* ---------- preferências visuais (único uso do aparelho além do login) ---------- */
  const UIK='bom-dia-ui';
  const guardaUi=()=>{if(!uiOk)return;try{localStorage.setItem(UIK,JSON.stringify({sector:state.selectedSector,week:state.selectedWeek}))}catch(e){}};
  const restauraUi=()=>{try{const u=JSON.parse(localStorage.getItem(UIK)||'null');if(u&&state.sectors[u.sector]){state.selectedSector=u.sector;state.selectedWeek=Math.min(3,Math.max(0,+u.week||0))}}catch(e){}uiOk=true};

  const mainEl=document.querySelector('main');

  /* ---------- buscar da nuvem ---------- */
  async function carregar(primeira){
    painel('load','Buscando as escalas na nuvem.');
    const {data,error}=await sb.from('escalas').select('*').eq('dono',alvo);
    if(error){pronto=false;erro('Sem conexão','Não foi possível buscar as escalas na nuvem. O app só abre com conexão. Verifique a internet e tente de novo.',()=>carregar(primeira));return false}
    clearTimeout(timer);timer=null;
    for(const k of Object.keys(ver))delete ver[k];
    for(const k of Object.keys(synced))delete synced[k];
    // começa de uma escala em branco para não misturar dados de outra conta
    const sel0=state.selectedSector,sem0=state.selectedWeek;
    state=newState();if(sel0&&state.sectors[sel0]){state.selectedSector=sel0;state.selectedWeek=sem0}
    blank=data.length===0;
    if(blank){ // conta nova: escala em branco (1 colaboradora por semana), nada é salvo até a pessoa mexer
      for(const k of SETORES())state.sectors[k].weeks.forEach(w=>{w.activeCount=1;w.employees=w.employees.slice(0,1);w.rotation=rotation(1,w.shifts.length)});
    }
    aplicar(data);
    if(primeira!==false||!uiOk)restauraUi();
    try{normalize();render()}catch(e){console.warn(e)}
    pronto=true;
    // setores que ainda não existem na nuvem são criados (só por quem pode editar)
    if(blank){for(const k of SETORES())synced[k]=JSON.stringify(carga(k));synced._config=JSON.stringify(cfgDados())}
    else for(const k of SETORES().concat('_config'))if(!data.some(l=>l.setor===k))synced[k]=undefined;
    mostraNova();
    painel(null);
    await enviar();
    status('Sincronizado com a nuvem · '+hora(),'ok');
    return true;
  }
  function tempoReal(){
    if(channel)sb.removeChannel(channel);
    channel=sb.channel('escalas-tempo-real').on('postgres_changes',{event:'*',schema:'public',table:'escalas'},p=>{
      const l=p.new;if(!l||!l.setor||!pronto||l.dono!==alvo)return;
      const j=JSON.stringify(l.dados);
      if(l.atualizado_em===ver[l.setor]||sent.includes(j)||j===synced[l.setor])return; // eco do que eu mesmo salvei
      const meu=l.setor==='_config'?JSON.stringify(cfgDados())!==synced._config:(state.sectors[l.setor]&&JSON.stringify(carga(l.setor))!==synced[l.setor]);
      aplicar([l]);
      status('Atualizado por outra pessoa · '+hora(),'ok');
      if(meu)warn('Outra pessoa alterou '+nomeSetor(l.setor)+'. Suas alterações pendentes nesse setor foram substituídas pela versão mais nova.');
    }).subscribe();
  }

  /* ---------- salvar do app → nuvem (nada vai para o aparelho) ---------- */
  save=function(){anotaDesfazer();agendar()};

  /* ---------- desfazer / refazer (Ctrl+Z, Ctrl+Y) ---------- */
  const pilha=[],refaz=[];let ultimo=null,ultimaTela='',desfazendo=false;
  const retrato=()=>JSON.stringify({sectors:state.sectors,roster:state.roster||{},baseMonday:state.baseMonday,settings:state.settings});
  const tela=()=>state.selectedSector+'/'+state.selectedWeek;
  function botoesDesfazer(){const d=$('undoBtn'),r=$('redoBtn');if(d)d.disabled=!pilha.length;if(r)r.disabled=!refaz.length}
  function zeraDesfazer(){pilha.length=0;refaz.length=0;try{ultimo=retrato();ultimaTela=tela()}catch(e){ultimo=null}botoesDesfazer()}
  function anotaDesfazer(){
    if(!me||!pronto||applying||desfazendo)return;
    const agora=retrato();
    if(agora===ultimo){ultimaTela=tela();return}
    // só trocar de setor/semana pode ajustar detalhes internos: isso não conta como alteração a desfazer
    if(ultimo!==null&&tela()===ultimaTela){pilha.push(ultimo);if(pilha.length>40)pilha.shift();refaz.length=0}
    ultimo=agora;ultimaTela=tela();botoesDesfazer();
  }
  function volta(de,para,msg){
    if(!me||!pronto)return;
    if(!de.length){warn(msg);return}
    para.push(retrato());const d=JSON.parse(de.pop());
    desfazendo=true;
    try{state.sectors=d.sectors;state.roster=d.roster;state.baseMonday=d.baseMonday;state.settings=d.settings;state.notice='';
      if(!state.sectors[state.selectedSector])state.selectedSector=Object.keys(state.sectors)[0];
      normalize();render()}finally{desfazendo=false}
    ultimo=retrato();ultimaTela=tela();botoesDesfazer();agendar();
  }
  const desfazer=()=>volta(pilha,refaz,'Nada para desfazer.');
  const refazer=()=>volta(refaz,pilha,'Nada para refazer.');
  document.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const k=e.key.toLowerCase();
    if(k!=='z'&&k!=='y')return;
    const t=e.target,tag=t&&t.tagName;
    if(tag==='TEXTAREA'||(tag==='INPUT'&&!/^(checkbox|radio|button|range)$/.test(t.type||'')))return; // em campo de texto vale o desfazer do próprio campo
    if(!ov.hidden||document.getElementById('adminOverlay')||document.getElementById('histOverlay'))return;
    e.preventDefault();(k==='y'||e.shiftKey)?refazer():desfazer();
  });
  afterRender.push(()=>{if(me&&pronto){guardaUi();mostraNova()}});

  /* ---------- histórico de versões da própria conta ---------- */
  const quandoFmt=t=>t?new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
  const escH=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function abreHistorico(){
    if(!me||!pronto||document.getElementById('histOverlay'))return;
    const setor=state.selectedSector;
    const h=document.createElement('div');h.id='histOverlay';
    h.innerHTML='<div class="hist-box"><header><div><h2>Histórico · '+escH(nomeSetor(setor))+'</h2><small>Versões anteriores deste setor, guardadas automaticamente enquanto você edita (até 60).</small></div><button type="button" class="button outline" id="histFechar">Fechar</button></header><div id="histLista"><p class="hist-vazio">Carregando…</p></div></div>';
    document.body.appendChild(h);
    const fecha=()=>h.remove();
    h.querySelector('#histFechar').addEventListener('click',fecha);
    h.addEventListener('click',e=>{if(e.target===h)fecha()});
    const {data,error}=await sb.from('escalas_historico').select('id,resumo,versao_em,salvo_em').eq('dono',alvo).eq('setor',setor).order('id',{ascending:false}).limit(30);
    const L=h.querySelector('#histLista');
    if(error){L.innerHTML='<p class="hist-vazio">Não foi possível carregar o histórico. Verifique a internet e tente de novo.</p>';return}
    if(!data.length){L.innerHTML='<p class="hist-vazio">Ainda não há versões anteriores deste setor. Elas aparecem conforme você edita.</p>';return}
    L.innerHTML='<table><thead><tr><th>Versão de</th><th>Conteúdo</th><th></th></tr></thead><tbody>'+data.map(v=>{const r=v.resumo||{};
      return '<tr><td>'+quandoFmt(v.versao_em||v.salvo_em)+'</td><td>'+escH((r.colaboradoras||0)+' colaboradoras'+((r.primeiros||[]).length?' · '+r.primeiros.join(', ')+'…':''))+'</td><td><button type="button" class="button outline" data-ver="'+v.id+'">Restaurar</button></td></tr>'}).join('')+'</tbody></table>';
    L.addEventListener('click',async e=>{
      const b=e.target.closest('button[data-ver]');if(!b)return;
      if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='Confirmar?';setTimeout(()=>{if(b.isConnected){b.dataset.ok='';b.textContent='Restaurar'}},4000);return}
      b.disabled=true;
      const {data:v,error:e2}=await sb.from('escalas_historico').select('dados').eq('id',+b.dataset.ver).maybeSingle();
      if(e2||!v){warn('Não foi possível carregar essa versão.');b.disabled=false;return}
      const d={...v.dados},rs=d._roster;delete d._roster;
      state.sectors[setor]=d;state.roster=state.roster||{};
      if(Array.isArray(rs)&&rs.length)state.roster[setor]=rs;
      state.notice='';fecha();
      try{normalize();render()}catch(x){console.warn(x)}
      warn('Versão restaurada. Se não era essa, use Desfazer (Ctrl+Z).');
    });
  }

  /* ---------- aviso de conta nova (em branco) ---------- */
  const cn=document.createElement('div');cn.id='contaNova';cn.hidden=true;
  cn.innerHTML='<b>Conta nova, em branco.</b> <span id="contaNovaTxt"></span> <button type="button" class="link-btn" id="contaNovaOk">Entendi</button>';
  if(mainEl)mainEl.insertBefore(cn,mainEl.firstChild);
  let cnFechado=false;
  function mostraNova(){const quem=alvo&&me&&alvo!==me.id;
    $('contaNovaTxt').textContent=quem?'Esta conta ainda não tem nenhuma escala salva.':'Comece clicando em "Importar planilha…" no alto da página ou cadastre as colaboradoras manualmente.';
    cn.hidden=!(blank&&Object.keys(ver).length===0&&!cnFechado)}
  $('contaNovaOk').addEventListener('click',()=>{cnFechado=true;cn.hidden=true});

  /* ---------- administrador abrindo os dados de outra conta ---------- */
  const vc=document.createElement('div');vc.id='verComo';vc.hidden=true;
  vc.innerHTML='<span id="verComoTxt"></span><button type="button" class="button" id="verComoVolta">Voltar aos meus dados</button>';
  if(mainEl)mainEl.insertBefore(vc,mainEl.firstChild);
  async function trocarAlvo(id,nome){
    if(!ehAdmin()||!me||!id)return false;
    if(pronto&&(timer||pendentes().length)){clearTimeout(timer);timer=null;await enviar()}
    alvo=id;alvoNome=id===me.id?'':(nome||'outra conta');
    vc.hidden=id===me.id;$('verComoTxt').textContent='Você está vendo e editando os dados de '+alvoNome+'.';
    const ok=await carregar(false);return ok;
  }
  $('verComoVolta').addEventListener('click',()=>{if(me)trocarAlvo(me.id)});

  /* ---------- sessão ---------- */
  async function entrou(user){
    me=user;painel('load','Entrando…');
    const {data:p,error}=await sb.from('perfis').select('*').eq('id',user.id).maybeSingle();
    if(error){me=null;erro('Sem conexão','Não foi possível verificar seu acesso. Verifique a internet e tente de novo.',()=>entrou(user));return}
    if(!p){me=null;await sb.auth.signOut();painel('login');loginErr('Esta sessão não é mais válida. Entre novamente com seu e-mail e senha.');return}
    perfil=p;if(!alvo||alvo!==user.id){alvo=user.id;alvoNome=''}
    $('userWho').textContent=(perfil.nome||user.email)+(perfil.papel==='admin'?' · administrador':'');
    $('adminBtn').hidden=!ehAdmin();bar.hidden=false;
    if(await carregar(true)){tempoReal();if(ehAdmin())lembraBackup()}
  }
  let lembrou=false;
  async function lembraBackup(){
    if(lembrou)return;lembrou=true;
    try{const {data}=await sb.functions.invoke('admin-usuarios',{body:{acao:'listar'}});
      const u=data&&data.ultimo_backup,dias=u?(Date.now()-new Date(u))/864e5:null;
      if(data&&data.usuarios&&(dias===null||dias>7))warn(dias===null?'Você ainda não baixou nenhum backup. Abra Administração → Backup.':'Faz '+Math.floor(dias)+' dias que você não baixa o backup. Abra Administração → Backup.')}catch(e){}
  }
  function saiu(){
    me=null;alvo=null;perfil=null;pronto=false;bar.hidden=true;clearTimeout(timer);timer=null;
    if(channel){sb.removeChannel(channel);channel=null}
    painel('login');status('Entre para ver as escalas','');
  }
  sb.auth.onAuthStateChange((ev,sess)=>{
    if(ev==='PASSWORD_RECOVERY'){recuperando=true;mostraSenha(true);return}
    if(ev==='SIGNED_OUT'||(!sess&&ev!=='INITIAL_SESSION'))saiu();
    else if(sess&&ev==='SIGNED_IN'&&!me&&!recuperando)setTimeout(()=>entrou(sess.user),0);
  });
  (async()=>{
    let s;try{s=(await sb.auth.getSession()).data.session}catch(e){erro('Sem conexão','Não foi possível verificar o login. Verifique a internet e tente de novo.');return}
    if(s&&recuperando)mostraSenha(true);
    else if(s)await entrou(s.user);
    else{painel('login');if(linkRuim)loginErr('Este link é inválido ou já expirou. Clique em "Esqueci minha senha" para receber outro.')}
  })();
})();
