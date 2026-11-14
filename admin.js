/* ===== Painel administrativo: usuários, níveis de acesso e setores =====
   Só aparece para administradores. As ações passam pela função "admin-usuarios" do Supabase,
   que confere no servidor se quem chamou é administrador. */
(function(){
  const SETORES=[['frente-caixa','Frente de Caixa'],['acougue-frios','Açougue e Frios'],['loja-deposito','Loja e Depósito'],['padaria','Padaria'],['horti-fruit','Horti Fruit']];
  const NIVEIS=[['admin','Administrador'],['gerente','Gerente'],['leitor','Somente leitura']];
  const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let ctx=null,lista=[],ov=null;

  async function chama(corpo){
    const {data,error}=await ctx.sb.functions.invoke('admin-usuarios',{body:corpo});
    if(error){
      let msg=error.message||'Falha na comunicação.';
      try{if(error.context&&error.context.json){const j=await error.context.json();if(j&&j.erro)msg=j.erro}}catch(e){}
      throw new Error(msg);
    }
    if(data&&data.erro)throw new Error(data.erro);
    return data;
  }
  const aviso=(m,ok)=>{const e=ov.querySelector('#admMsg');e.textContent=m||'';e.dataset.ok=ok?'1':'';e.hidden=!m;if(m)e.scrollIntoView({block:'nearest'})};
  const setoresHtml=(sel,nome,dis)=>SETORES.map(([id,n])=>`<label class="adm-chk"><input type="checkbox" data-set="${id}" ${sel.includes(id)?'checked':''} ${dis?'disabled':''}> ${esc(n)}</label>`).join('');
  const niveisHtml=sel=>NIVEIS.map(([id,n])=>`<option value="${id}" ${id===sel?'selected':''}>${n}</option>`).join('');
  const quando=t=>t?new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'nunca';

  function cartao(u){
    const eu=u.id===ctx.eu.id;
    return `<article class="adm-user ${u.bloqueado?'bloq':''}" data-id="${esc(u.id)}">
      <div class="adm-linha"><div class="adm-campo"><label>Nome</label><input data-f="nome" value="${esc(u.nome)}" placeholder="Nome"></div>
      <div class="adm-campo"><label>E-mail</label><div class="adm-email">${esc(u.email)}${eu?' <span class="adm-tag">você</span>':''}${u.bloqueado?' <span class="adm-tag red">bloqueado</span>':''}</div></div>
      <div class="adm-campo"><label>Nível</label><select data-f="papel">${niveisHtml(u.papel)}</select></div></div>
      <div class="adm-sets" ${u.papel==='admin'?'data-all="1"':''}><label>Setores liberados</label><div>${u.papel==='admin'?'<span class="adm-tag">todos os setores</span>':setoresHtml(u.setores||[],u.id,false)}</div></div>
      <div class="adm-rodape"><small>Último acesso: ${quando(u.ultimo_login)}</small>
      <div class="adm-btns"><button type="button" class="button" data-a="salvar">Salvar</button>
      <button type="button" class="button outline" data-a="senha">Nova senha</button>
      ${eu?'':`<button type="button" class="button outline" data-a="${u.bloqueado?'desbloquear':'bloquear'}">${u.bloqueado?'Desbloquear':'Bloquear'}</button><button type="button" class="button outline perigo" data-a="excluir">Excluir</button>`}</div></div>
      <div class="adm-extra" hidden></div></article>`;
  }
  function desenha(){
    const box=ov.querySelector('#admLista');
    box.innerHTML=lista.length?lista.map(cartao).join(''):'<p class="adm-vazio">Nenhum usuário.</p>';
    ov.querySelector('#admTotal').textContent=lista.length+' usuário(s)';
  }
  async function carrega(){
    ov.querySelector('#admLista').innerHTML='<p class="adm-vazio">Carregando…</p>';
    try{const r=await chama({acao:'listar'});lista=r.usuarios||[];desenha()}
    catch(e){ov.querySelector('#admLista').innerHTML='<p class="adm-vazio">Não foi possível carregar os usuários: '+esc(e.message)+'</p>'}
  }
  const lerSetores=el=>[...el.querySelectorAll('input[data-set]:checked')].map(i=>i.dataset.set);

  function monta(){
    ov=document.createElement('div');ov.id='adminOverlay';
    ov.innerHTML=`<div class="adm-box"><header class="adm-head"><div><h2>Administração de usuários</h2><small id="admTotal"></small></div><button type="button" class="button outline" id="admFechar">Fechar</button></header>
      <p id="admMsg" class="adm-msg" hidden></p>
      <section class="adm-novo"><h3>Novo usuário</h3>
        <div class="adm-linha"><div class="adm-campo"><label>Nome</label><input id="nvNome" placeholder="Nome completo"></div>
        <div class="adm-campo"><label>E-mail</label><input id="nvEmail" type="email" placeholder="nome@exemplo.com" autocomplete="off"></div>
        <div class="adm-campo"><label>Senha (mín. 6)</label><input id="nvSenha" type="text" placeholder="Senha" autocomplete="off"></div>
        <div class="adm-campo"><label>Nível</label><select id="nvPapel">${niveisHtml('gerente')}</select></div></div>
        <div class="adm-sets" id="nvSets"><label>Setores liberados</label><div>${setoresHtml([], 'nv', false)}</div></div>
        <div class="adm-btns"><button type="button" class="button" id="nvCriar">Criar usuário</button></div></section>
      <section><h3>Usuários</h3><div id="admLista"></div></section>
      <p class="adm-ajuda"><b>Administrador</b>: vê e edita todos os setores e gerencia usuários. <b>Gerente</b>: vê e edita só os setores marcados. <b>Somente leitura</b>: vê só os setores marcados. Mudanças de acesso valem na próxima vez que a pessoa entrar.</p></div>`;
    document.body.appendChild(ov);
    const fecha=()=>{ov.remove();ov=null;document.body.classList.remove('adm-aberto')};
    ov.querySelector('#admFechar').addEventListener('click',fecha);
    // nível do formulário de novo usuário
    const nvSync=()=>{const adm=ov.querySelector('#nvPapel').value==='admin';ov.querySelector('#nvSets').style.display=adm?'none':''};
    ov.querySelector('#nvPapel').addEventListener('change',nvSync);nvSync();
    ov.querySelector('#nvCriar').addEventListener('click',async ev=>{
      const b=ev.currentTarget;aviso('');
      const corpo={acao:'criar',nome:ov.querySelector('#nvNome').value,email:ov.querySelector('#nvEmail').value,senha:ov.querySelector('#nvSenha').value,papel:ov.querySelector('#nvPapel').value,setores:lerSetores(ov.querySelector('#nvSets'))};
      b.disabled=true;b.textContent='Criando…';
      try{await chama(corpo);aviso(corpo.papel!=='admin'&&!corpo.setores.length?'Usuário criado, mas sem nenhum setor liberado: ele entra e não vê nada. Marque os setores abaixo e salve.':'Usuário criado. Passe o e-mail e a senha para a pessoa.',true);
        ['#nvNome','#nvEmail','#nvSenha'].forEach(s=>ov.querySelector(s).value='');ov.querySelectorAll('#nvSets input').forEach(i=>i.checked=false);await carrega()}
      catch(e){aviso(e.message)}
      b.disabled=false;b.textContent='Criar usuário';
    });
    // ações por usuário
    ov.querySelector('#admLista').addEventListener('change',e=>{
      if(e.target.dataset.f==='papel'){const c=e.target.closest('.adm-user'),sets=c.querySelector('.adm-sets');
        if(e.target.value==='admin'){sets.dataset.all='1';sets.querySelector('div').innerHTML='<span class="adm-tag">todos os setores</span>'}
        else{const u=lista.find(x=>x.id===c.dataset.id);delete sets.dataset.all;sets.querySelector('div').innerHTML=setoresHtml(u&&u.papel!=='admin'?u.setores:[],'',false)}}
    });
    ov.querySelector('#admLista').addEventListener('click',async e=>{
      const btn=e.target.closest('button[data-a]');if(!btn)return;
      const c=btn.closest('.adm-user'),id=c.dataset.id,acao=btn.dataset.a,extra=c.querySelector('.adm-extra');aviso('');
      const rodar=async(corpo,ok)=>{btn.disabled=true;try{await chama(corpo);aviso(ok,true);await carrega()}catch(er){aviso(er.message);btn.disabled=false}};
      if(acao==='salvar'){
        const papel=c.querySelector('[data-f=papel]').value;
        return rodar({acao:'atualizar',id,nome:c.querySelector('[data-f=nome]').value,papel,setores:lerSetores(c)},'Alterações salvas.');
      }
      if(acao==='senha'){
        extra.hidden=false;extra.innerHTML='<div class="adm-campo"><label>Nova senha (mín. 6)</label><input class="adm-ns" type="text" autocomplete="off"></div><div class="adm-btns"><button type="button" class="button" data-a="senha-ok">Definir senha</button><button type="button" class="button outline" data-a="cancela">Cancelar</button></div>';
        extra.querySelector('input').focus();return;
      }
      if(acao==='senha-ok')return rodar({acao:'senha',id,senha:extra.querySelector('.adm-ns').value},'Senha alterada.');
      if(acao==='excluir'){
        extra.hidden=false;extra.innerHTML='<p class="adm-aviso">Excluir este usuário? Ele perde o acesso. As escalas não são apagadas.</p><div class="adm-btns"><button type="button" class="button perigo-solid" data-a="excluir-ok">Sim, excluir</button><button type="button" class="button outline" data-a="cancela">Cancelar</button></div>';return;
      }
      if(acao==='excluir-ok')return rodar({acao:'excluir',id},'Usuário excluído.');
      if(acao==='cancela'){extra.hidden=true;extra.innerHTML='';return}
      if(acao==='bloquear'||acao==='desbloquear')return rodar({acao,id},acao==='bloquear'?'Usuário bloqueado.':'Usuário desbloqueado.');
    });
    document.body.classList.add('adm-aberto');
  }
  window.abrirAdmin=c=>{if(ov)return;ctx=c;monta();carrega()};
})();
