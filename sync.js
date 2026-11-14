/* ===== Login + sincronização com o Supabase =====
   Sem URL/chave em supabase-config.js o app continua funcionando só neste aparelho. */
(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase||!window.supabase.createClient)return;
  const sb=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const synced={};            // último JSON conhecido na nuvem, por setor
  const sent=[];let me=null,perfil=null,timer=null,pushing=false,again=false,applying=false,channel=null;
  const $=id=>document.getElementById(id);
  const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const SETORES=()=>Object.keys(state.sectors);
  const status=(t,cls)=>{const e=$('statusText');if(e){e.textContent=t;e.dataset.sync=cls||''}};
  const hora=()=>new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const warn=m=>{try{toast(m)}catch(e){console.warn(m)}};
  const podeEditar=s=>!!perfil&&(perfil.papel==='admin'||s==='_config'||(perfil.setores||[]).includes(s));

  /* ---------- tela de login ---------- */
  const ov=document.createElement('div');ov.id='loginOverlay';ov.hidden=true;
  ov.innerHTML=`<form id="loginForm" class="login-card" autocomplete="on"><img src="logo.png" alt="Bom Dia" class="login-logo"><h2>Gestão de Escalas</h2><p>Entre com seu e-mail e senha.</p><label>E-mail<input id="loginEmail" type="email" required autocomplete="username"></label><label>Senha<input id="loginPass" type="password" required autocomplete="current-password"></label><p id="loginErr" class="login-err" hidden></p><button class="button" type="submit" id="loginBtn">Entrar</button><button class="link-btn" type="button" id="loginReset">Esqueci minha senha</button></form>`;
  document.body.appendChild(ov);
  const showLogin=on=>{ov.hidden=!on;document.body.classList.toggle('need-login',on)};
  const loginErr=m=>{const e=$('loginErr');e.textContent=m||'';e.hidden=!m};
  const traduz=m=>/invalid login/i.test(m)?'E-mail ou senha incorretos.':/email not confirmed/i.test(m)?'E-mail ainda não confirmado.':/rate limit|too many/i.test(m)?'Muitas tentativas. Aguarde um pouco.':'Não foi possível entrar: '+m;
  $('loginForm').addEventListener('submit',async ev=>{
    ev.preventDefault();loginErr('');const b=$('loginBtn');b.disabled=true;b.textContent='Entrando…';
    const {error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPass').value});
    b.disabled=false;b.textContent='Entrar';if(error)loginErr(traduz(error.message));
  });
  $('loginReset').addEventListener('click',async()=>{
    const em=$('loginEmail').value.trim();if(!em){loginErr('Digite seu e-mail e clique de novo.');return}
    const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.href.split('#')[0]});
    loginErr(error?traduz(error.message):'Enviamos um link para redefinir a senha no seu e-mail.');
  });

  /* ---------- barra do usuário ---------- */
  const bar=document.createElement('div');bar.id='userBar';bar.hidden=true;
  bar.innerHTML='<span id="userWho"></span><button type="button" class="button outline" id="refreshBtn">Atualizar da nuvem</button><button type="button" class="button" id="logoutBtn">Sair</button>';
  const top=document.querySelector('.top-actions');(top||document.body).appendChild(bar);
  $('refreshBtn').addEventListener('click',()=>{if(me)puxar(false)});
  $('logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut()});

  /* ---------- diagnóstico ---------- */
  const diag=document.createElement('div');diag.id='syncDiag';diag.hidden=true;document.body.appendChild(diag);
  const mostraDiag=(extra)=>{try{
    const k=state.selectedSector,w=state.sectors[k].weeks[state.selectedWeek];
    diag.textContent='[build 66] '+(extra?extra+' · ':'')+'Aqui: '+((window.SECTORS&&SECTORS[k])||k)+', semana '+(state.selectedWeek+1)+' → '+w.employees.length+' colaboradoras ('+w.employees.slice(0,2).map(e=>e.name).join(', ')+'…) · setores na nuvem: '+Object.keys(synced).filter(x=>x!=='_config'&&synced[x]).length;
    diag.hidden=false}catch(e){diag.textContent='diag: '+e.message;diag.hidden=false}};
  window.addEventListener('error',e=>{status('Erro no app: '+e.message,'err')});
  window.addEventListener('unhandledrejection',e=>{status('Erro: '+((e.reason&&e.reason.message)||e.reason),'err')});

  /* ---------- aplicar dados da nuvem ---------- */
  function aplicar(linhas){
    applying=true;
    try{
      for(const l of linhas){
        if(l.setor==='_config'){
          if(l.dados.baseMonday)state.baseMonday=l.dados.baseMonday;
          if(l.dados.settings)state.settings={...state.settings,...l.dados.settings};
        }else if(state.sectors[l.setor]!==undefined){state.sectors[l.setor]=l.dados}
      }
      try{normalize()}catch(e){console.warn(e)}
      for(const l of linhas){
        if(l.setor==='_config')synced._config=JSON.stringify(cfgDados());
        else if(state.sectors[l.setor]!==undefined)synced[l.setor]=JSON.stringify(state.sectors[l.setor]);
      }
      try{localStorage.setItem(STORE,JSON.stringify(state))}catch(e){}
      try{render()}catch(e){console.warn(e);status('Erro ao mostrar os dados da nuvem: '+e.message,'err')}
    }finally{applying=false}
  }
  const cfgDados=()=>({baseMonday:state.baseMonday,settings:state.settings});

  /* ---------- enviar mudanças ---------- */
  function pendentes(){
    const out=[];
    for(const k of SETORES()){const j=JSON.stringify(state.sectors[k]);if(j!==synced[k])out.push({setor:k,dados:state.sectors[k],j})}
    const c=cfgDados(),cj=JSON.stringify(c);if(cj!==synced._config)out.push({setor:'_config',dados:c,j:cj});
    return out;
  }
  async function enviar(){
    if(!me)return;
    if(pushing){again=true;return}
    pushing=true;
    try{
      const lista=pendentes();if(!lista.length){status('Sincronizado com a nuvem · '+hora(),'ok');return}
      status('Salvando na nuvem…','busy');
      let negado=[];
      for(const it of lista){
        if(!podeEditar(it.setor)){negado.push(it.setor);synced[it.setor]=it.j;continue}
        const {error}=await sb.from('escalas').upsert({setor:it.setor,dados:it.dados},{onConflict:'setor'});
        if(error){
          if(/row-level security|permission/i.test(error.message))negado.push(it.setor);
          else{status('Erro ao salvar na nuvem (as mudanças estão neste aparelho)','err');console.warn(error);return}
        }
        synced[it.setor]=it.j;sent.push(JSON.stringify(it.dados));if(sent.length>30)sent.shift();
      }
      if(negado.length){
        warn('Você não tem permissão para editar: '+negado.map(s=>(window.SECTORS&&SECTORS[s])||s).join(', ')+'. Recarregando a versão da nuvem.');
        await puxar();return;
      }
      status('Sincronizado com a nuvem · '+hora(),'ok');
    }finally{pushing=false;if(again){again=false;agendar()}}
  }
  function agendar(){if(!me||applying)return;clearTimeout(timer);status('Alterações pendentes…','busy');timer=setTimeout(enviar,800)}

  /* ---------- buscar da nuvem ---------- */
  async function puxar(primeira){
    const {data,error}=await sb.from('escalas').select('*');
    if(error){status('Sem conexão com a nuvem — usando dados deste aparelho','err');console.warn(error);return}
    if(primeira&&data.length){try{localStorage.setItem('bom-dia-antes-da-nuvem',JSON.stringify(state))}catch(e){}}
    status('Baixando '+data.length+' setor(es) da nuvem…','busy');
    aplicar(data);
    // setores que ainda não existem na nuvem sobem na primeira vez
    for(const k of SETORES().concat('_config'))if(podeEditar(k)&&!data.some(l=>l.setor===k))synced[k]=undefined;
    await enviar();
    if(primeira)status('Sincronizado com a nuvem · '+hora(),'ok');
    mostraDiag('Baixou '+data.length+' linhas');
  }

  function tempoReal(){
    if(channel)sb.removeChannel(channel);
    channel=sb.channel('escalas-tempo-real').on('postgres_changes',{event:'*',schema:'public',table:'escalas'},p=>{
      const l=p.new;if(!l||!l.setor)return;
      const j=JSON.stringify(l.dados);
      if(sent.includes(j)||j===synced[l.setor])return; // eco do que eu mesmo salvei
      aplicar([l]);status('Atualizado por outra pessoa · '+hora(),'ok');
    }).subscribe();
  }

  const r0=render;render=function(){const v=r0.apply(this,arguments);try{if(me)mostraDiag()}catch(e){}return v};
  /* ---------- ligar o salvar do app ---------- */
  const save0=save;
  save=function(){const r=save0.apply(this,arguments);agendar();return r};

  /* ---------- sessão ---------- */
  async function entrou(user){
    me=user;
    const {data:p}=await sb.from('perfis').select('*').eq('id',user.id).maybeSingle();
    if(!p){ // sessão de um usuário que não existe mais (ex.: conta apagada)
      me=null;await sb.auth.signOut();showLogin(true);loginErr('Esta sessão não é mais válida. Entre novamente com seu e-mail e senha.');return;
    }
    perfil=p;
    $('userWho').textContent=(perfil.nome||user.email)+' · '+(perfil.papel==='admin'?'administrador':(perfil.setores&&perfil.setores.length?perfil.setores.map(s=>(window.SECTORS&&SECTORS[s])||s).join(', '):'somente leitura'));
    bar.hidden=false;showLogin(false);
    await puxar(true);tempoReal();
  }
  function saiu(){
    me=null;perfil=null;bar.hidden=true;clearTimeout(timer);
    if(channel){sb.removeChannel(channel);channel=null}
    showLogin(true);status('Entre para ver as escalas','');
  }
  sb.auth.onAuthStateChange((ev,sess)=>{
    if(ev==='SIGNED_OUT'||(!sess&&ev!=='INITIAL_SESSION'))saiu();
    else if(sess&&ev==='SIGNED_IN'&&!me)setTimeout(()=>entrou(sess.user),0);
  });
  (async()=>{
    showLogin(true);                       // esconde as escalas até confirmar a sessão
    const {data}=await sb.auth.getSession();
    if(data.session){await entrou(data.session.user)}else{showLogin(true)}
  })();
})();
