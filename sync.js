/* ===== Login + dados 100% na nuvem (Supabase) =====
   - Nada de escala, nome ou folga é lido ou gravado no aparelho: tudo vem e vai para o Supabase.
   - No aparelho ficam só preferências visuais (painéis recolhidos, setor/semana abertos) e o login.
   - Sem conexão com a nuvem o app NÃO abre.
   - Antes de salvar, confere a versão: se outra pessoa alterou o setor, recarrega a versão nova em vez de sobrescrever. */
(function(){
  const BUILD='build 69';
  const cfg=window.SUPABASE_CONFIG||{};
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
   <div id="loadCard" class="login-card"><img src="logo.png" alt="Bom Dia" class="login-logo"><h2>Carregando…</h2><p id="loadMsg">Buscando as escalas na nuvem.</p></div>
   <div id="errCard" class="login-card" hidden><img src="logo.png" alt="Bom Dia" class="login-logo"><h2 id="errTitle">Sem conexão</h2><p id="errMsg"></p><button class="button" type="button" id="errRetry">Tentar de novo</button><button class="link-btn" type="button" id="errOut">Sair</button></div>`;
  document.body.appendChild(ov);document.body.classList.add('need-login');
  let retryFn=()=>location.reload();
  const painel=(n,msg)=>{ // 'login' | 'load' | 'err' | null (libera o app)
    $('loginForm').hidden=n!=='login';$('loadCard').hidden=n!=='load';$('errCard').hidden=n!=='err';
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
  let me=null,perfil=null,timer=null,pushing=false,again=false,applying=false,channel=null,pronto=false,uiOk=false;
  const ehAdmin=()=>!!perfil&&perfil.papel==='admin';
  const visivel=s=>!!perfil&&(ehAdmin()||s==='_config'||(perfil.setores||[]).includes(s));
  const podeEditar=s=>!!perfil&&(ehAdmin()||(perfil.papel==='gerente'&&(s==='_config'||(perfil.setores||[]).includes(s))));
  const NIVEL={admin:'administrador',gerente:'gerente',leitor:'somente leitura'};

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
  bar.innerHTML='<span id="userWho"></span><button type="button" class="button outline" id="adminBtn" hidden>Administração</button><button type="button" class="button" id="logoutBtn">Sair</button>';
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
  $('adminBtn').addEventListener('click',()=>{if(window.abrirAdmin)window.abrirAdmin({sb,eu:me})});

  /* ---------- faixa de diagnóstico ---------- */
  const diag=document.createElement('div');diag.id='syncDiag';diag.hidden=true;document.body.appendChild(diag);
  const mostraDiag=extra=>{try{
    const k=state.selectedSector,w=state.sectors[k].weeks[state.selectedWeek];
    diag.textContent='['+BUILD+'] '+(extra?extra+' · ':'')+'Nuvem → '+nomeSetor(k)+', semana '+(state.selectedWeek+1)+': '+w.employees.length+' colaboradoras ('+w.employees.slice(0,2).map(e=>e.name).join(', ')+'…)';
    diag.hidden=false}catch(e){diag.textContent='diag: '+e.message;diag.hidden=false}};
  window.addEventListener('error',e=>{status('Erro no app: '+e.message,'err')});
  window.addEventListener('unhandledrejection',e=>{status('Erro: '+((e.reason&&e.reason.message)||e.reason),'err')});

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
  }
  function pendentes(){
    const out=[];
    for(const k of SETORES()){if(!podeEditar(k))continue;const c=carga(k),j=JSON.stringify(c);if(j!==synced[k])out.push({setor:k,dados:c,j})}
    if(podeEditar('_config')){const c=cfgDados(),cj=JSON.stringify(c);if(cj!==synced._config)out.push({setor:'_config',dados:c,j:cj})}
    return out;
  }
  const rls=e=>e&&/row-level security|permission/i.test(e.message||'');
  async function gravar(it){
    const v=ver[it.setor];
    if(v===undefined){
      const {data,error}=await sb.from('escalas').insert({setor:it.setor,dados:it.dados}).select();
      if(error){if(error.code==='23505')return'conflito';if(rls(error))return'negado';throw error}
      ver[it.setor]=data[0].atualizado_em;return'ok';
    }
    const {data,error}=await sb.from('escalas').update({dados:it.dados}).eq('setor',it.setor).eq('atualizado_em',v).select();
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
        if(!podeEditar(it.setor)){negado.push(it.setor);continue}
        const r=await gravar(it);
        if(r==='ok'){synced[it.setor]=it.j;sent.push(JSON.stringify(it.dados));if(sent.length>30)sent.shift()}
        else if(r==='conflito')conflito.push(it.setor);else negado.push(it.setor);
      }
      if(negado.length||conflito.length){
        if(conflito.length)warn('Outra pessoa alterou '+conflito.map(nomeSetor).join(', ')+' antes de você salvar. Carreguei a versão mais recente: refaça sua alteração.');
        else warn('Você não tem permissão para editar: '+negado.map(nomeSetor).join(', ')+'. Recarreguei a versão da nuvem.');
        const {data,error}=await sb.from('escalas').select('*').in('setor',conflito.concat(negado));
        if(error)throw error;
        aplicar(data);
      }
      status('Sincronizado com a nuvem · '+hora(),'ok');
    }catch(e){
      console.warn(e);pronto=false;
      erro('Conexão perdida','Não foi possível salvar na nuvem. As últimas alterações não foram salvas. Reconecte e carregue de novo a versão da nuvem.',()=>carregar(true));
    }finally{pushing=false;if(again){again=false;agendar()}}
  }
  function agendar(){if(!me||!pronto||applying)return;clearTimeout(timer);status('Alterações pendentes…','busy');timer=setTimeout(enviar,800)}
  window.addEventListener('beforeunload',e=>{if(pronto&&(timer||pendentes().length)){e.preventDefault();e.returnValue=''}});

  /* ---------- preferências visuais (único uso do aparelho além do login) ---------- */
  const UIK='bom-dia-ui';
  const guardaUi=()=>{if(!uiOk)return;try{localStorage.setItem(UIK,JSON.stringify({sector:state.selectedSector,week:state.selectedWeek}))}catch(e){}};
  const restauraUi=()=>{try{const u=JSON.parse(localStorage.getItem(UIK)||'null');if(u&&state.sectors[u.sector]){state.selectedSector=u.sector;state.selectedWeek=Math.min(3,Math.max(0,+u.week||0))}}catch(e){}uiOk=true};

  /* ---------- setores liberados e modo somente leitura ---------- */
  function ajustaSetores(){
    const sel=$('sectorSelect');
    if(sel)[...sel.options].forEach(o=>{if(!visivel(o.value))o.remove()});
    if(!SETORES().some(visivel)){
      pronto=false;erro('Nenhum setor liberado','Seu acesso ainda não tem nenhum setor liberado. Peça ao administrador para liberar.',()=>location.reload());return false;
    }
    if(sel&&!visivel(sel.value))sel.value=SETORES().find(visivel);
    return true;
  }
  const LIVRES='.period-tabs button,.tab,#toggleSettings,#toggleOperators,#toggleBoard,#toggleOff,#printFileButton,#scheduleTable thead button,#sectorSelect,#logoutBtn,#adminBtn,#syncDiag';
  const bloqueado=t=>{if(!document.body.classList.contains('somente-leitura')||!t||!t.closest)return false;
    return !!(t.closest('main,#weekStart,.import-label,#modelButton,#xlsxFile'))&&!t.closest(LIVRES)};
  ['click','change','input','keydown'].forEach(tp=>document.addEventListener(tp,e=>{
    if(!bloqueado(e.target))return;if(tp==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;
    e.stopImmediatePropagation();if(tp==='click'||tp==='keydown')e.preventDefault();
  },true));
  const ro=document.createElement('div');ro.id='roBanner';ro.hidden=true;ro.textContent='Somente leitura: você pode ver este setor, mas não editar.';
  const mainEl=document.querySelector('main');if(mainEl)mainEl.insertBefore(ro,mainEl.firstChild);
  function aplicaLeitura(){
    const so=!!perfil&&!podeEditar(state.selectedSector);
    document.body.classList.toggle('somente-leitura',so);ro.hidden=!so;
  }

  /* ---------- buscar da nuvem ---------- */
  async function carregar(primeira){
    painel('load','Buscando as escalas na nuvem.');
    const {data,error}=await sb.from('escalas').select('*');
    if(error){pronto=false;erro('Sem conexão','Não foi possível buscar as escalas na nuvem. O app só abre com conexão. Verifique a internet e tente de novo.',()=>carregar(primeira));return false}
    clearTimeout(timer);timer=null;
    for(const k of Object.keys(ver))delete ver[k];
    aplicar(data);
    if(!ajustaSetores())return false;
    if(primeira!==false||!uiOk)restauraUi();
    if(!visivel(state.selectedSector))state.selectedSector=SETORES().find(visivel);
    try{normalize();render()}catch(e){console.warn(e)}
    pronto=true;aplicaLeitura();
    // setores que ainda não existem na nuvem são criados (só por quem pode editar)
    for(const k of SETORES().concat('_config'))if(podeEditar(k)&&!data.some(l=>l.setor===k))synced[k]=undefined;
    painel(null);
    await enviar();
    status('Sincronizado com a nuvem · '+hora(),'ok');
    mostraDiag('Baixou '+data.length+' linhas');
    return true;
  }
  function tempoReal(){
    if(channel)sb.removeChannel(channel);
    channel=sb.channel('escalas-tempo-real').on('postgres_changes',{event:'*',schema:'public',table:'escalas'},p=>{
      const l=p.new;if(!l||!l.setor||!pronto)return;
      const j=JSON.stringify(l.dados);
      if(l.atualizado_em===ver[l.setor]||sent.includes(j)||j===synced[l.setor])return; // eco do que eu mesmo salvei
      const meu=l.setor==='_config'?JSON.stringify(cfgDados())!==synced._config:(state.sectors[l.setor]&&JSON.stringify(carga(l.setor))!==synced[l.setor]);
      aplicar([l]);
      status('Atualizado por outra pessoa · '+hora(),'ok');
      if(meu)warn('Outra pessoa alterou '+nomeSetor(l.setor)+'. Suas alterações pendentes nesse setor foram substituídas pela versão mais nova.');
    }).subscribe();
  }

  /* ---------- salvar do app → nuvem (nada vai para o aparelho) ---------- */
  save=function(){agendar()};
  const r0=render;render=function(){const v=r0.apply(this,arguments);try{if(me&&pronto){mostraDiag();guardaUi();aplicaLeitura()}}catch(e){}return v};

  /* ---------- sessão ---------- */
  async function entrou(user){
    me=user;painel('load','Entrando…');
    const {data:p,error}=await sb.from('perfis').select('*').eq('id',user.id).maybeSingle();
    if(error){me=null;erro('Sem conexão','Não foi possível verificar seu acesso. Verifique a internet e tente de novo.',()=>entrou(user));return}
    if(!p){me=null;await sb.auth.signOut();painel('login');loginErr('Esta sessão não é mais válida. Entre novamente com seu e-mail e senha.');return}
    perfil=p;
    $('userWho').textContent=(perfil.nome||user.email)+' · '+NIVEL[perfil.papel]+(perfil.papel!=='admin'&&perfil.setores&&perfil.setores.length?' ('+perfil.setores.map(nomeSetor).join(', ')+')':'');
    $('adminBtn').hidden=!ehAdmin();bar.hidden=false;
    if(await carregar(true))tempoReal();
  }
  function saiu(){
    me=null;perfil=null;pronto=false;bar.hidden=true;clearTimeout(timer);timer=null;
    if(channel){sb.removeChannel(channel);channel=null}
    painel('login');status('Entre para ver as escalas','');
  }
  sb.auth.onAuthStateChange((ev,sess)=>{
    if(ev==='SIGNED_OUT'||(!sess&&ev!=='INITIAL_SESSION'))saiu();
    else if(sess&&ev==='SIGNED_IN'&&!me)setTimeout(()=>entrou(sess.user),0);
  });
  (async()=>{
    let s;try{s=(await sb.auth.getSession()).data.session}catch(e){erro('Sem conexão','Não foi possível verificar o login. Verifique a internet e tente de novo.');return}
    if(s)await entrou(s.user);else painel('login');
  })();
})();
