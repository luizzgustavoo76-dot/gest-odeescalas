/* ===== Painel administrativo: usuários, acessos, atividade e histórico de escalas =====
   Só aparece para administradores. As ações passam pela função "admin-usuarios" do Supabase,
   que confere no servidor se quem chamou é administrador. */
(function(){
  const SETORES=[['frente-caixa','Frente de Caixa'],['acougue-frios','Açougue e Frios'],['loja-deposito','Loja e Depósito'],['padaria','Padaria'],['horti-fruit','Horti Fruit']];
  const NIVEIS=[['admin','Administrador'],['gerente','Gerente'],['leitor','Somente leitura']];
  const nomeNivel=id=>(NIVEIS.find(n=>n[0]===id)||[0,id])[1];
  const nomeSetor=id=>(SETORES.find(n=>n[0]===id)||[0,id])[1];
  const ACOES={escala_salva:'Salvou a escala',escala_restaurada:'Restaurou uma versão da escala',usuario_criado:'Criou o usuário',usuario_editado:'Editou o acesso de',usuario_nivel:'Mudou o nível de',usuario_setores:'Mudou os setores de',usuario_senha:'Trocou a senha de',usuario_bloquear:'Bloqueou',usuario_desbloquear:'Desbloqueou',usuario_excluido:'Excluiu o usuário'};
  const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let ctx=null,lista=[],ov=null,aba='usuarios',marcados=new Set(),abertos=new Set(),filtro={q:'',papel:'',setor:'',status:'',ordem:'nome'},sel='frente-caixa';

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
  const setoresHtml=(sel)=>SETORES.map(([id,n])=>`<label class="adm-chk"><input type="checkbox" data-set="${id}" ${sel.includes(id)?'checked':''}> ${esc(n)}</label>`).join('');
  const niveisHtml=s=>NIVEIS.map(([id,n])=>`<option value="${id}" ${id===s?'selected':''}>${n}</option>`).join('');
  const fmt=t=>t?new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
  const rel=t=>{if(!t)return 'nunca entrou';const d=(Date.now()-new Date(t))/6e4;if(d<2)return 'agora há pouco';if(d<60)return Math.round(d)+' min atrás';if(d<1440)return Math.round(d/60)+' h atrás';return Math.round(d/1440)+' dia(s) atrás'};
  const lerSetores=el=>[...el.querySelectorAll('input[data-set]:checked')].map(i=>i.dataset.set);
  const gerarSenha=()=>{const a='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';const r=crypto.getRandomValues(new Uint32Array(10));r.forEach(n=>s+=a[n%a.length]);return s};

  /* ---------- Resumo ---------- */
  function resumo(){
    const n=lista.length,ad=lista.filter(u=>u.papel==='admin').length,bl=lista.filter(u=>u.bloqueado).length,nunca=lista.filter(u=>!u.ultimo_login).length;
    const sem=lista.filter(u=>u.papel!=='admin'&&!(u.setores||[]).length&&!u.bloqueado).length;
    const alertas=[];
    if(ad<2)alertas.push('Só há '+ad+' administrador. Recomenda-se ter pelo menos 2, para não perder o acesso se uma conta for bloqueada.');
    if(sem)alertas.push(sem+' usuário(s) sem nenhum setor liberado: entram e não veem nada.');
    if(nunca)alertas.push(nunca+' usuário(s) nunca entraram.');
    const matriz=`<div class="adm-matriz"><table><thead><tr><th>Usuário</th>${SETORES.map(s=>`<th>${esc(s[1])}</th>`).join('')}</tr></thead><tbody>${lista.filter(u=>!u.bloqueado).map(u=>`<tr><td>${esc(u.nome||u.email)}</td>${SETORES.map(([id])=>{const v=u.papel==='admin'?'E':(u.setores||[]).includes(id)?(u.papel==='gerente'?'E':'V'):'';return `<td class="${v?'m'+v:''}">${v==='E'?'edita':v==='V'?'vê':'—'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<div class="adm-cards"><div><b>${n}</b><span>usuários</span></div><div><b>${ad}</b><span>administradores</span></div><div><b>${lista.filter(u=>u.papel==='gerente').length}</b><span>gerentes</span></div><div><b>${lista.filter(u=>u.papel==='leitor').length}</b><span>somente leitura</span></div><div class="${bl?'red':''}"><b>${bl}</b><span>bloqueados</span></div></div>
      ${alertas.length?`<div class="adm-alertas">${alertas.map(a=>`<p>⚠ ${esc(a)}</p>`).join('')}</div>`:'<p class="adm-ok">✓ Nenhum alerta de acesso.</p>'}
      <h3>Quem acessa o quê</h3>${matriz}`;
  }

  /* ---------- Usuários ---------- */
  function filtrada(){
    const q=filtro.q.trim().toLowerCase();
    let r=lista.filter(u=>(!q||(u.nome+' '+u.email).toLowerCase().includes(q))&&(!filtro.papel||u.papel===filtro.papel)&&(!filtro.setor||u.papel==='admin'||(u.setores||[]).includes(filtro.setor))&&(!filtro.status||(filtro.status==='bloqueado'?u.bloqueado:filtro.status==='ativo'?!u.bloqueado:!u.ultimo_login)));
    const o=filtro.ordem;
    r.sort((a,b)=>o==='acesso'?String(b.ultimo_login||'').localeCompare(String(a.ultimo_login||'')):o==='criado'?String(b.criado_em).localeCompare(String(a.criado_em)):o==='nivel'?NIVEIS.findIndex(n=>n[0]===a.papel)-NIVEIS.findIndex(n=>n[0]===b.papel):(a.nome||a.email).localeCompare(b.nome||b.email));
    return r;
  }
  function cartao(u){
    const eu=u.id===ctx.eu.id;
    return `<article class="adm-user ${u.bloqueado?'bloq':''}" data-id="${esc(u.id)}">
      <div class="adm-topo"><label class="adm-chk"><input type="checkbox" data-mark ${marcados.has(u.id)?'checked':''}> <b>${esc(u.nome||'(sem nome)')}</b></label><span>${esc(u.email)}${eu?' <span class="adm-tag">você</span>':''}${u.bloqueado?' <span class="adm-tag red">bloqueado</span>':''}${!u.ultimo_login?' <span class="adm-tag">nunca entrou</span>':''}</span><span class="adm-tag">${nomeNivel(u.papel)}</span><button type="button" class="adm-mais" data-a="abrir">${abertos.has(u.id)?'Fechar ▴':'Editar ▾'}</button></div>
      <div class="adm-det" ${abertos.has(u.id)?'':'hidden'}>
        <div class="adm-linha"><div class="adm-campo"><label>Nome</label><input data-f="nome" value="${esc(u.nome)}" placeholder="Nome"></div>
        <div class="adm-campo"><label>Nível</label><select data-f="papel">${niveisHtml(u.papel)}</select></div></div>
        <div class="adm-sets" ${u.papel==='admin'?'data-all="1"':''}><label>Setores liberados</label><div>${u.papel==='admin'?'<span class="adm-tag">todos os setores</span>':setoresHtml(u.setores||[])}</div></div>
        <div class="adm-rodape"><small>Criado em ${fmt(u.criado_em)} · Último acesso: ${fmt(u.ultimo_login)} (${rel(u.ultimo_login)})</small>
        <div class="adm-btns"><button type="button" class="button" data-a="salvar">Salvar</button>
        <button type="button" class="button outline" data-a="senha">Nova senha</button>
        ${eu?'':`<button type="button" class="button outline" data-a="${u.bloqueado?'desbloquear':'bloquear'}">${u.bloqueado?'Desbloquear':'Bloquear'}</button><button type="button" class="button outline perigo" data-a="excluir">Excluir</button>`}</div></div>
        <div class="adm-extra" hidden></div></div></article>`;
  }
  function usuarios(){
    return `<section class="adm-novo"><h3>Novo usuário</h3>
        <div class="adm-linha"><div class="adm-campo"><label>Nome</label><input id="nvNome" placeholder="Nome completo"></div>
        <div class="adm-campo"><label>E-mail</label><input id="nvEmail" type="email" placeholder="nome@exemplo.com" autocomplete="off"></div>
        <div class="adm-campo"><label>Senha (mín. 6)</label><div class="adm-inl"><input id="nvSenha" type="text" placeholder="Senha" autocomplete="off"><button type="button" class="button outline" id="nvGerar" title="Gerar senha forte">Gerar</button></div></div>
        <div class="adm-campo"><label>Nível</label><select id="nvPapel">${niveisHtml('gerente')}</select></div></div>
        <div class="adm-sets" id="nvSets"><label>Setores liberados</label><div>${setoresHtml([])}</div></div>
        <div class="adm-btns"><button type="button" class="button" id="nvCriar">Criar usuário</button><button type="button" class="button outline" id="nvCopiar" hidden>Copiar e-mail e senha</button></div></section>
      <div class="adm-filtros"><input id="fQ" type="search" placeholder="Buscar por nome ou e-mail…" value="${esc(filtro.q)}">
        <select id="fPapel"><option value="">Todos os níveis</option>${NIVEIS.map(([i,n])=>`<option value="${i}" ${filtro.papel===i?'selected':''}>${n}</option>`).join('')}</select>
        <select id="fSetor"><option value="">Todos os setores</option>${SETORES.map(([i,n])=>`<option value="${i}" ${filtro.setor===i?'selected':''}>${n}</option>`).join('')}</select>
        <select id="fStatus"><option value="">Qualquer situação</option><option value="ativo" ${filtro.status==='ativo'?'selected':''}>Ativos</option><option value="bloqueado" ${filtro.status==='bloqueado'?'selected':''}>Bloqueados</option><option value="nunca" ${filtro.status==='nunca'?'selected':''}>Nunca entraram</option></select>
        <select id="fOrdem"><option value="nome">Ordenar: nome</option><option value="acesso" ${filtro.ordem==='acesso'?'selected':''}>Ordenar: último acesso</option><option value="criado" ${filtro.ordem==='criado'?'selected':''}>Ordenar: mais novos</option><option value="nivel" ${filtro.ordem==='nivel'?'selected':''}>Ordenar: nível</option></select></div>
      <div class="adm-lote" id="admLote"></div>
      <div id="admLista"></div>`;
  }
  function desenhaLista(){
    const r=filtrada(),box=ov.querySelector('#admLista');if(!box)return;
    box.innerHTML=r.length?r.map(cartao).join(''):'<p class="adm-vazio">Nenhum usuário encontrado.</p>';
    ov.querySelector('#admTotal').textContent=lista.length+' usuário(s)'+(r.length!==lista.length?' · '+r.length+' exibido(s)':'');
    desenhaLote();
  }
  function desenhaLote(){
    const b=ov.querySelector('#admLote');if(!b)return;const n=marcados.size;
    const vis=filtrada().map(u=>u.id),todos=vis.length&&vis.every(i=>marcados.has(i));
    b.innerHTML=`<label class="adm-chk"><input type="checkbox" id="mTodos" ${todos?'checked':''}> Marcar todos exibidos</label>`+(n?`<span class="adm-tag">${n} marcado(s)</span>
      <select id="lPapel"><option value="">Mudar nível…</option>${NIVEIS.map(([i,x])=>`<option value="${i}">${x}</option>`).join('')}</select>
      <button type="button" class="button outline" data-l="setores_add">+ Liberar setores</button><button type="button" class="button outline" data-l="setores_set">Definir setores</button>
      <button type="button" class="button outline" data-l="bloquear">Bloquear</button><button type="button" class="button outline" data-l="desbloquear">Desbloquear</button>
      <button type="button" class="button outline" data-l="csv">Exportar CSV</button>
      <div class="adm-sets adm-lsets" hidden><label>Setores da ação em lote</label><div>${setoresHtml([])}</div><div class="adm-btns"><button type="button" class="button" data-l="aplicar-setores">Aplicar</button></div></div>`:`<button type="button" class="button outline" data-l="csv-todos">Exportar CSV</button>`);
  }

  /* ---------- Atividade ---------- */
  async function atividade(){
    const box=ov.querySelector('#admConteudo');box.innerHTML='<p class="adm-vazio">Carregando…</p>';
    try{
      const r=await chama({acao:'auditoria',limite:200,filtro:filtro.atv||''});
      const ev=r.eventos||[];
      box.innerHTML=`<div class="adm-filtros"><select id="aFiltro"><option value="">Todas as atividades</option><option value="usuario" ${filtro.atv==='usuario'?'selected':''}>Só usuários e acessos</option><option value="escala" ${filtro.atv==='escala'?'selected':''}>Só escalas</option></select><button type="button" class="button outline" id="aCsv">Exportar CSV</button></div>
      <p class="adm-ajuda">Registro dos últimos eventos. Salvamentos seguidos da mesma pessoa no mesmo setor (em até 10 min) aparecem agrupados.</p>
      ${ev.length?`<div class="adm-matriz"><table class="adm-log"><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead><tbody>${ev.map(e=>{
        const alvo=e.acao.startsWith('escala')?nomeSetor(e.alvo):e.alvo;
        let det='';const d=e.detalhes||{};
        if(e.acao==='escala_salva'&&d.colaboradoras!=null)det=` (${d.colaboradoras} colaboradoras${e.qtd>1?' · '+e.qtd+' salvamentos':''})`;
        else if(d.papel)det=` → ${nomeNivel(d.papel)}`;
        else if(d.setores)det=d.setores.length?' → '+d.setores.map(nomeSetor).join(', '):'';
        return `<tr><td>${fmt(e.ultima_em||e.quando)}</td><td>${esc(e.ator_email||'—')}</td><td>${esc(ACOES[e.acao]||e.acao)} <b>${esc(alvo||'')}</b>${esc(det)}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="adm-vazio">Nada registrado ainda.</p>'}`;
      box.querySelector('#aFiltro').onchange=e=>{filtro.atv=e.target.value;atividade()};
      box.querySelector('#aCsv').onclick=()=>baixaCsv('atividade.csv',[['quando','quem','acao','alvo','detalhes']].concat(ev.map(e=>[e.ultima_em||e.quando,e.ator_email,e.acao,e.alvo,JSON.stringify(e.detalhes||{})])));
    }catch(e){box.innerHTML='<p class="adm-vazio">Não foi possível carregar: '+esc(e.message)+'</p>'}
  }

  /* ---------- Histórico de escalas ---------- */
  async function historico(){
    const box=ov.querySelector('#admConteudo');
    box.innerHTML=`<div class="adm-filtros"><select id="hSetor">${SETORES.map(([i,n])=>`<option value="${i}" ${sel===i?'selected':''}>${n}</option>`).join('')}</select></div>
      <p class="adm-ajuda">Cada setor guarda automaticamente as versões anteriores (uma a cada 2 min de edição, até 60). Restaurar volta o setor para aquela versão; o que está agora é guardado antes, então dá para desfazer. Quem estiver com o app aberto recebe a versão restaurada na hora.</p><div id="hLista"><p class="adm-vazio">Carregando…</p></div>`;
    box.querySelector('#hSetor').onchange=e=>{sel=e.target.value;historico()};
    try{
      const r=await chama({acao:'historico',setor:sel}),v=r.versoes||[];
      box.querySelector('#hLista').innerHTML=v.length?`<div class="adm-matriz"><table class="adm-log"><thead><tr><th>Versão de</th><th>Editada por</th><th>Conteúdo</th><th></th></tr></thead><tbody>${v.map(x=>`<tr><td>${fmt(x.versao_em||x.salvo_em)}</td><td>${esc(x.por||'—')}</td><td>${x.resumo?esc((x.resumo.colaboradoras||0)+' colaboradoras · '+(x.resumo.semanas||0)+' semanas'+((x.resumo.primeiros||[]).length?' · '+x.resumo.primeiros.join(', ')+'…':'')):'—'}</td><td><button type="button" class="button outline" data-h="${x.id}">Restaurar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="adm-vazio">Ainda não há versões anteriores deste setor. Elas aparecem depois da próxima edição.</p>';
    }catch(e){box.querySelector('#hLista').innerHTML='<p class="adm-vazio">Não foi possível carregar: '+esc(e.message)+'</p>'}
  }

  function baixaCsv(nome,linhas){
    const txt='﻿'+linhas.map(l=>l.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  }

  async function carrega(){
    try{const r=await chama({acao:'listar'});lista=r.usuarios||[];marcados=new Set([...marcados].filter(i=>lista.some(u=>u.id===i)));
      ov.querySelector('#admTotal').textContent=lista.length+' usuário(s)';mostra()}
    catch(e){ov.querySelector('#admConteudo').innerHTML='<p class="adm-vazio">Não foi possível carregar os usuários: '+esc(e.message)+'</p>'}
  }
  function mostra(){
    ov.querySelectorAll('.adm-abas button').forEach(b=>b.classList.toggle('on',b.dataset.aba===aba));
    const box=ov.querySelector('#admConteudo');aviso('');
    if(aba==='resumo')box.innerHTML=resumo();
    else if(aba==='usuarios'){box.innerHTML=usuarios();ligaUsuarios();desenhaLista()}
    else if(aba==='atividade')atividade();
    else historico();
  }

  function ligaUsuarios(){
    const box=ov.querySelector('#admConteudo');
    const nvSync=()=>{box.querySelector('#nvSets').style.display=box.querySelector('#nvPapel').value==='admin'?'none':''};
    box.querySelector('#nvPapel').onchange=nvSync;nvSync();
    box.querySelector('#nvGerar').onclick=()=>{box.querySelector('#nvSenha').value=gerarSenha()};
    let ultimo=null;
    box.querySelector('#nvCriar').onclick=async ev=>{
      const b=ev.currentTarget;aviso('');
      const corpo={acao:'criar',nome:box.querySelector('#nvNome').value,email:box.querySelector('#nvEmail').value,senha:box.querySelector('#nvSenha').value,papel:box.querySelector('#nvPapel').value,setores:lerSetores(box.querySelector('#nvSets'))};
      b.disabled=true;b.textContent='Criando…';
      try{await chama(corpo);ultimo={e:corpo.email,s:corpo.senha};
        ['#nvNome','#nvEmail','#nvSenha'].forEach(s=>box.querySelector(s).value='');box.querySelectorAll('#nvSets input').forEach(i=>i.checked=false);
        await carrega();
        aviso(corpo.papel!=='admin'&&!corpo.setores.length?'Usuário criado, mas sem nenhum setor liberado: ele entra e não vê nada. Abra "Editar" e marque os setores.':'Usuário criado. Passe o e-mail e a senha para a pessoa.',true);
        const c=ov.querySelector('#nvCopiar');if(c){c.hidden=false;c.onclick=async()=>{try{await navigator.clipboard.writeText('E-mail: '+ultimo.e+'\nSenha: '+ultimo.s);c.textContent='Copiado ✓'}catch(e){c.textContent='Não deu para copiar'}}}
      }catch(e){aviso(e.message)}
      const bb=ov.querySelector('#nvCriar');if(bb){bb.disabled=false;bb.textContent='Criar usuário'}
    };
    const refiltra=()=>{filtro.q=box.querySelector('#fQ').value;filtro.papel=box.querySelector('#fPapel').value;filtro.setor=box.querySelector('#fSetor').value;filtro.status=box.querySelector('#fStatus').value;filtro.ordem=box.querySelector('#fOrdem').value;desenhaLista()};
    box.querySelector('#fQ').oninput=refiltra;['#fPapel','#fSetor','#fStatus','#fOrdem'].forEach(s=>box.querySelector(s).onchange=refiltra);

    const L=box.querySelector('#admLista');
    L.addEventListener('change',e=>{
      const c=e.target.closest('.adm-user');if(!c)return;
      if(e.target.matches('[data-mark]')){e.target.checked?marcados.add(c.dataset.id):marcados.delete(c.dataset.id);desenhaLote();return}
      if(e.target.dataset.f==='papel'){const sets=c.querySelector('.adm-sets');
        if(e.target.value==='admin'){sets.dataset.all='1';sets.querySelector('div').innerHTML='<span class="adm-tag">todos os setores</span>'}
        else{const u=lista.find(x=>x.id===c.dataset.id);delete sets.dataset.all;sets.querySelector('div').innerHTML=setoresHtml(u&&u.papel!=='admin'?u.setores:[])}}
    });
    L.addEventListener('click',async e=>{
      const btn=e.target.closest('button[data-a]');if(!btn)return;
      const c=btn.closest('.adm-user'),id=c.dataset.id,acao=btn.dataset.a,extra=c.querySelector('.adm-extra');aviso('');
      const rodar=async(corpo,ok)=>{btn.disabled=true;try{await chama(corpo);await carrega();aviso(ok,true)}catch(er){aviso(er.message);btn.disabled=false}};
      if(acao==='abrir'){const d=c.querySelector('.adm-det');d.hidden=!d.hidden;d.hidden?abertos.delete(id):abertos.add(id);btn.textContent=d.hidden?'Editar ▾':'Fechar ▴';return}
      if(acao==='salvar')return rodar({acao:'atualizar',id,nome:c.querySelector('[data-f=nome]').value,papel:c.querySelector('[data-f=papel]').value,setores:lerSetores(c)},'Alterações salvas.');
      if(acao==='senha'){extra.hidden=false;extra.innerHTML='<div class="adm-campo"><label>Nova senha (mín. 6)</label><div class="adm-inl"><input class="adm-ns" type="text" autocomplete="off"><button type="button" class="button outline" data-a="gerar">Gerar</button></div></div><div class="adm-btns"><button type="button" class="button" data-a="senha-ok">Definir senha</button><button type="button" class="button outline" data-a="cancela">Cancelar</button></div>';extra.querySelector('input').focus();return}
      if(acao==='gerar'){extra.querySelector('.adm-ns').value=gerarSenha();return}
      if(acao==='senha-ok')return rodar({acao:'senha',id,senha:extra.querySelector('.adm-ns').value},'Senha alterada. Passe a nova senha para a pessoa.');
      if(acao==='excluir'){extra.hidden=false;extra.innerHTML='<p class="adm-aviso">Excluir este usuário? Ele perde o acesso. As escalas não são apagadas.</p><div class="adm-btns"><button type="button" class="button perigo-solid" data-a="excluir-ok">Sim, excluir</button><button type="button" class="button outline" data-a="cancela">Cancelar</button></div>';return}
      if(acao==='excluir-ok')return rodar({acao:'excluir',id},'Usuário excluído.');
      if(acao==='cancela'){extra.hidden=true;extra.innerHTML='';return}
      if(acao==='bloquear'||acao==='desbloquear')return rodar({acao,id},acao==='bloquear'?'Usuário bloqueado.':'Usuário desbloqueado.');
    });

    // ações em lote
    const LT=box.querySelector('#admLote');
    LT.addEventListener('change',async e=>{
      if(e.target.id==='mTodos'){const vis=filtrada().map(u=>u.id);vis.forEach(i=>e.target.checked?marcados.add(i):marcados.delete(i));desenhaLista();return}
      if(e.target.id==='lPapel'&&e.target.value){
        const papel=e.target.value;e.target.disabled=true;
        try{const r=await chama({acao:'lote',op:'papel',papel,ids:[...marcados]});await carrega();aviso(r.feitos+' usuário(s) alterado(s).'+(r.pulados.length?' Não alterados: '+r.pulados.join(', ')+'.':''),true)}catch(er){aviso(er.message)}
      }
    });
    LT.addEventListener('click',async e=>{
      const b=e.target.closest('button[data-l]');if(!b)return;const op=b.dataset.l;aviso('');
      if(op==='csv'||op==='csv-todos'){const us=op==='csv'?lista.filter(u=>marcados.has(u.id)):filtrada();
        return baixaCsv('usuarios.csv',[['nome','email','nivel','setores','bloqueado','ultimo_acesso','criado_em']].concat(us.map(u=>[u.nome,u.email,nomeNivel(u.papel),u.papel==='admin'?'todos':(u.setores||[]).map(nomeSetor).join(', '),u.bloqueado?'sim':'não',u.ultimo_login||'',u.criado_em])))}
      if(op==='setores_add'||op==='setores_set'){const p=LT.querySelector('.adm-lsets');p.hidden=false;p.dataset.op=op;return}
      if(op==='aplicar-setores'){const p=LT.querySelector('.adm-lsets');const s=lerSetores(p);
        try{const r=await chama({acao:'lote',op:p.dataset.op||'setores_add',setores:s,ids:[...marcados]});await carrega();aviso(r.feitos+' usuário(s) alterado(s).'+(r.pulados.length?' Não alterados: '+r.pulados.join(', ')+'.':''),true)}catch(er){aviso(er.message)}
        return}
      b.disabled=true;
      try{const r=await chama({acao:'lote',op,ids:[...marcados]});await carrega();aviso(r.feitos+' usuário(s) alterado(s).'+(r.pulados.length?' Não alterados: '+r.pulados.join(', ')+'.':''),true)}catch(er){aviso(er.message);b.disabled=false}
    });
  }

  function monta(){
    ov=document.createElement('div');ov.id='adminOverlay';
    ov.innerHTML=`<div class="adm-box"><header class="adm-head"><div><h2>Administração</h2><small id="admTotal"></small></div><button type="button" class="button outline" id="admFechar">Fechar</button></header>
      <nav class="adm-abas"><button type="button" data-aba="resumo">Resumo</button><button type="button" data-aba="usuarios">Usuários</button><button type="button" data-aba="atividade">Atividade</button><button type="button" data-aba="historico">Histórico de escalas</button></nav>
      <p id="admMsg" class="adm-msg" hidden></p>
      <div id="admConteudo"><p class="adm-vazio">Carregando…</p></div>
      <p class="adm-ajuda"><b>Administrador</b>: vê e edita todos os setores e gerencia usuários. <b>Gerente</b>: vê e edita só os setores marcados. <b>Somente leitura</b>: vê só os setores marcados. Mudanças de acesso valem na próxima vez que a pessoa entrar.</p></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#admFechar').addEventListener('click',()=>{ov.remove();ov=null;document.body.classList.remove('adm-aberto')});
    ov.querySelector('.adm-abas').addEventListener('click',e=>{const b=e.target.closest('button[data-aba]');if(!b)return;aba=b.dataset.aba;mostra()});
    ov.querySelector('#admConteudo').addEventListener('click',async e=>{
      const b=e.target.closest('button[data-h]');if(!b)return;
      if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='Confirmar restauração?';setTimeout(()=>{if(b.isConnected){b.dataset.ok='';b.textContent='Restaurar'}},4000);return}
      b.disabled=true;
      try{await chama({acao:'restaurar',id:Number(b.dataset.h)});aviso('Versão restaurada. A escala foi atualizada para todos que estão com o app aberto.',true);historico()}catch(er){aviso(er.message);b.disabled=false}
    });
    document.body.classList.add('adm-aberto');
  }
  window.abrirAdmin=c=>{if(ov)return;ctx=c;aba='usuarios';monta();carrega()};
})();
