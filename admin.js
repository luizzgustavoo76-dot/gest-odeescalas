/* ===== Painel administrativo: usuários, acessos, atividade e histórico de escalas =====
   Só aparece para administradores. As ações passam pela função "admin-usuarios" do Supabase,
   que confere no servidor se quem chamou é administrador. */
(function(){
  const SETORES=[['frente-caixa','Frente de Caixa'],['acougue-frios','Açougue e Frios'],['loja-deposito','Loja e Depósito'],['padaria','Padaria'],['horti-fruit','Horti Fruit']];
  const NIVEIS=[['admin','Administrador'],['usuario','Usuário']];
  const nomeNivel=id=>(NIVEIS.find(n=>n[0]===id)||[0,id])[1];
  const nomeSetor=id=>(SETORES.find(n=>n[0]===id)||[0,id])[1];
  const ACOES={backup_baixado:'Baixou o backup completo',backup_restaurado:'Restaurou um backup',escala_salva:'Salvou a escala',escala_restaurada:'Restaurou uma versão da escala',usuario_criado:'Criou o usuário',usuario_editado:'Editou a conta de',usuario_nivel:'Mudou o nível de',usuario_senha:'Trocou a senha de',usuario_bloquear:'Bloqueou',usuario_desbloquear:'Desbloqueou',usuario_excluido:'Excluiu o usuário'};
  const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let ctx=null,ultimoBackup=null,lista=[],ov=null,aba='usuarios',marcados=new Set(),abertos=new Set(),filtro={q:'',papel:'',status:'',ordem:'nome'},sel='frente-caixa',donoSel=null;

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
    const vazios=lista.filter(u=>!u.bloqueado&&!u.setores_salvos).length;
    const alertas=[];
    if(ad<2)alertas.push('Só há '+ad+' administrador. Recomenda-se ter pelo menos 2, para não perder o acesso se uma conta for bloqueada.');
    const dias=ultimoBackup?(Date.now()-new Date(ultimoBackup))/864e5:null;
    if(dias===null)alertas.push('Nenhum backup foi baixado ainda. Abra a aba Backup e baixe um.');else if(dias>7)alertas.push('O último backup foi há '+Math.floor(dias)+' dias. Baixe um novo na aba Backup.');
    if(nunca)alertas.push(nunca+' usuário(s) nunca entraram.');
    if(vazios)alertas.push(vazios+' conta(s) ainda sem nenhuma escala salva (ainda não importaram os dados).');
    const tab=`<div class="adm-matriz"><table><thead><tr><th>Conta</th><th>Setores com dados</th><th>Última edição</th><th></th></tr></thead><tbody>${lista.map(u=>`<tr><td>${esc(u.nome||u.email)}${u.bloqueado?' <span class="adm-tag red">bloqueado</span>':''}</td><td>${u.setores_salvos} de ${SETORES.length}</td><td>${fmt(u.ultima_edicao)}</td><td><button type="button" class="button outline" data-abrir="${esc(u.id)}">Abrir dados</button></td></tr>`).join('')}</tbody></table></div>`;
    return `<div class="adm-cards"><div><b>${n}</b><span>contas</span></div><div><b>${ad}</b><span>administradores</span></div><div><b>${n-ad}</b><span>usuários</span></div><div class="${bl?'red':''}"><b>${bl}</b><span>bloqueados</span></div></div>
      ${alertas.length?`<div class="adm-alertas">${alertas.map(a=>`<p>⚠ ${esc(a)}</p>`).join('')}</div>`:'<p class="adm-ok">✓ Nenhum alerta.</p>'}
      <h3>Dados de cada conta</h3><p class="adm-ajuda">Cada conta tem as próprias escalas, separadas das outras. Como administrador você pode abrir e editar os dados de qualquer uma.</p>${tab}`;
  }

  /* ---------- Usuários ---------- */
  function filtrada(){
    const q=filtro.q.trim().toLowerCase();
    let r=lista.filter(u=>(!q||(u.nome+' '+u.email).toLowerCase().includes(q))&&(!filtro.papel||u.papel===filtro.papel)&&(!filtro.status||(filtro.status==='bloqueado'?u.bloqueado:filtro.status==='ativo'?!u.bloqueado:!u.ultimo_login)));
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
          <div class="adm-rodape"><small>Criada em ${fmt(u.criado_em)} · Último acesso: ${fmt(u.ultimo_login)} (${rel(u.ultimo_login)}) · ${u.setores_salvos} de ${SETORES.length} setores com dados</small>
        <div class="adm-btns"><button type="button" class="button" data-a="salvar">Salvar</button><button type="button" class="button outline" data-a="dados">Abrir dados</button>
        <button type="button" class="button outline" data-a="senha">Nova senha</button>
        ${eu?'':`<button type="button" class="button outline" data-a="${u.bloqueado?'desbloquear':'bloquear'}">${u.bloqueado?'Desbloquear':'Bloquear'}</button><button type="button" class="button outline perigo" data-a="excluir">Excluir</button>`}</div></div>
        <div class="adm-extra" hidden></div></div></article>`;
  }
  function usuarios(){
    return `<section class="adm-novo"><h3>Novo usuário</h3>
        <div class="adm-linha"><div class="adm-campo"><label>Nome</label><input id="nvNome" placeholder="Nome completo"></div>
        <div class="adm-campo"><label>E-mail</label><input id="nvEmail" type="email" placeholder="nome@exemplo.com" autocomplete="off"></div>
        <div class="adm-campo"><label>Senha (mín. 6)</label><div class="adm-inl"><input id="nvSenha" type="text" placeholder="Senha" autocomplete="off"><button type="button" class="button outline" id="nvGerar" title="Gerar senha forte">Gerar</button></div></div>
        <div class="adm-campo"><label>Nível</label><select id="nvPapel">${niveisHtml('usuario')}</select></div></div>
        <div class="adm-btns"><button type="button" class="button" id="nvCriar">Criar usuário</button><button type="button" class="button outline" id="nvCopiar" hidden>Copiar e-mail e senha</button></div></section>
      <div class="adm-filtros"><input id="fQ" type="search" placeholder="Buscar por nome ou e-mail…" value="${esc(filtro.q)}">
        <select id="fPapel"><option value="">Todos os níveis</option>${NIVEIS.map(([i,n])=>`<option value="${i}" ${filtro.papel===i?'selected':''}>${n}</option>`).join('')}</select>
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
      <button type="button" class="button outline" data-l="bloquear">Bloquear</button><button type="button" class="button outline" data-l="desbloquear">Desbloquear</button>
      <button type="button" class="button outline" data-l="csv">Exportar CSV</button>
`:`<button type="button" class="button outline" data-l="csv-todos">Exportar CSV</button>`);
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
        if(e.acao.startsWith('escala')&&d.colaboradoras!=null)det=` de ${d.dono_email||'—'} (${d.colaboradoras} colaboradoras${e.qtd>1?' · '+e.qtd+' salvamentos':''})`;
        else if(d.papel)det=` → ${nomeNivel(d.papel)}`;
        
        return `<tr><td>${fmt(e.ultima_em||e.quando)}</td><td>${esc(e.ator_email||'—')}</td><td>${esc(ACOES[e.acao]||e.acao)} <b>${esc(alvo||'')}</b>${esc(det)}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="adm-vazio">Nada registrado ainda.</p>'}`;
      box.querySelector('#aFiltro').onchange=e=>{filtro.atv=e.target.value;atividade()};
      box.querySelector('#aCsv').onclick=()=>baixaCsv('atividade.csv',[['quando','quem','acao','alvo','detalhes']].concat(ev.map(e=>[e.ultima_em||e.quando,e.ator_email,e.acao,e.alvo,JSON.stringify(e.detalhes||{})])));
    }catch(e){box.innerHTML='<p class="adm-vazio">Não foi possível carregar: '+esc(e.message)+'</p>'}
  }

  /* ---------- Histórico de escalas ---------- */
  async function historico(){
    const box=ov.querySelector('#admConteudo');
    if(!donoSel||!lista.some(u=>u.id===donoSel))donoSel=ctx.alvo?ctx.alvo():ctx.eu.id;
    box.innerHTML=`<div class="adm-filtros"><select id="hDono">${lista.map(u=>`<option value="${esc(u.id)}" ${donoSel===u.id?'selected':''}>${esc(u.nome||u.email)}</option>`).join('')}</select><select id="hSetor">${SETORES.map(([i,n])=>`<option value="${i}" ${sel===i?'selected':''}>${n}</option>`).join('')}</select></div>
      <p class="adm-ajuda">Cada setor de cada conta guarda automaticamente as versões anteriores (uma a cada 2 min de edição, até 60). Restaurar volta o setor para aquela versão; o que está agora é guardado antes, então dá para desfazer. Quem estiver com o app aberto recebe a versão restaurada na hora.</p><div id="hLista"><p class="adm-vazio">Carregando…</p></div>`;
    box.querySelector('#hSetor').onchange=e=>{sel=e.target.value;historico()};box.querySelector('#hDono').onchange=e=>{donoSel=e.target.value;historico()};
    try{
      const r=await chama({acao:'historico',dono:donoSel,setor:sel}),v=r.versoes||[];
      box.querySelector('#hLista').innerHTML=v.length?`<div class="adm-matriz"><table class="adm-log"><thead><tr><th>Versão de</th><th>Editada por</th><th>Conteúdo</th><th></th></tr></thead><tbody>${v.map(x=>`<tr><td>${fmt(x.versao_em||x.salvo_em)}</td><td>${esc(x.por||'—')}</td><td>${x.resumo?esc((x.resumo.colaboradoras||0)+' colaboradoras · '+(x.resumo.semanas||0)+' semanas'+((x.resumo.primeiros||[]).length?' · '+x.resumo.primeiros.join(', ')+'…':'')):'—'}</td><td><button type="button" class="button outline" data-h="${x.id}">Restaurar</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="adm-vazio">Ainda não há versões anteriores deste setor. Elas aparecem depois da próxima edição.</p>';
    }catch(e){box.querySelector('#hLista').innerHTML='<p class="adm-vazio">Não foi possível carregar: '+esc(e.message)+'</p>'}
  }

  /* ---------- Backup ---------- */
  function backup(){
    const box=ov.querySelector('#admConteudo');
    const dias=ultimoBackup?Math.floor((Date.now()-new Date(ultimoBackup))/864e5):null;
    box.innerHTML=`<div class="adm-cards"><div class="${dias===null||dias>7?'red':''}"><b>${dias===null?'—':dias}</b><span>${dias===null?'nenhum backup baixado':'dia(s) desde o último backup ('+fmt(ultimoBackup)+')'}</span></div></div>
      <section class="adm-novo"><h3>Baixar backup completo</h3>
        <p class="adm-ajuda">Gera um arquivo com as escalas de <b>todas as contas</b> e a lista de contas, e salva no seu computador (pasta Downloads). Guarde-o em local seguro (pen drive, nuvem pessoal). Faça isso toda semana ou antes de mudanças grandes. Senhas não entram no backup.</p>
        <div class="adm-btns"><button type="button" class="button" id="bkBaixar">Baixar backup agora</button></div></section>
      <section class="adm-novo"><h3>Restaurar de um backup</h3>
        <p class="adm-ajuda">Escolha um arquivo de backup. As escalas dele voltam para as contas de mesmo e-mail e <b>substituem</b> as atuais (a versão atual é guardada antes no histórico, então dá para desfazer). Contas que não existem mais são ignoradas: crie-as de novo antes, com o mesmo e-mail.</p>
        <div class="adm-btns"><label class="button outline import-label">Escolher arquivo de backup…<input type="file" id="bkArq" accept=".json,application/json" hidden></label></div>
        <div id="bkInfo"></div></section>`;
    box.querySelector('#bkBaixar').onclick=async ev=>{
      const b=ev.currentTarget;b.disabled=true;b.textContent='Gerando…';aviso('');
      try{
        const dados=await chama({acao:'backup'});
        const d=new Date(),p=n=>String(n).padStart(2,'0');
        const nome='backup-bom-dia-'+d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'_'+p(d.getHours())+'h'+p(d.getMinutes())+'.json';
        const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(dados)],{type:'application/json'}));a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);
        ultimoBackup=new Date().toISOString();
        aviso('Backup gerado: '+nome+' ('+dados.escalas.length+' linhas de '+dados.perfis.length+' conta(s)). Guarde o arquivo em local seguro.',true);
        backup();
      }catch(e){aviso(e.message);b.disabled=false;b.textContent='Baixar backup agora'}
    };
    box.querySelector('#bkArq').onchange=async e=>{
      const f=e.target.files[0];if(!f)return;const info=box.querySelector('#bkInfo');aviso('');
      let bk;try{bk=JSON.parse(await f.text())}catch(er){aviso('Não consegui ler esse arquivo: não é um JSON válido.');return}
      if(!bk||bk.sistema!=='bom-dia-gestao-escalas'||!Array.isArray(bk.escalas)){aviso('Este arquivo não é um backup válido do app.');return}
      const contas=new Set(bk.escalas.map(x=>x.dono_email||x.dono));
      info.innerHTML=`<p class="adm-aviso">Backup de ${esc(fmt(bk.gerado_em))}: ${bk.escalas.length} linhas de ${contas.size} conta(s). Restaurar agora vai substituir as escalas atuais dessas contas.</p><div class="adm-btns"><button type="button" class="button perigo-solid" id="bkOk">Sim, restaurar</button><button type="button" class="button outline" id="bkNao">Cancelar</button></div>`;
      info.querySelector('#bkNao').onclick=()=>{info.innerHTML='';e.target.value=''};
      info.querySelector('#bkOk').onclick=async ev=>{
        ev.currentTarget.disabled=true;
        try{const r=await chama({acao:'restaurar_backup',backup:bk});info.innerHTML='';
          aviso(r.restauradas+' linha(s) restaurada(s).'+(r.sem_conta.length?' Sem conta correspondente (ignoradas): '+r.sem_conta.join(', ')+'.':'')+' Quem estiver com o app aberto recebe os dados restaurados na hora.',true)}
        catch(er){aviso(er.message);ev.currentTarget.disabled=false}
      };
    };
  }

  function baixaCsv(nome,linhas){
    const txt='﻿'+linhas.map(l=>l.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  }

  async function carrega(){
    try{const r=await chama({acao:'listar'});lista=r.usuarios||[];ultimoBackup=r.ultimo_backup||null;marcados=new Set([...marcados].filter(i=>lista.some(u=>u.id===i)));
      ov.querySelector('#admTotal').textContent=lista.length+' usuário(s)';mostra()}
    catch(e){ov.querySelector('#admConteudo').innerHTML='<p class="adm-vazio">Não foi possível carregar os usuários: '+esc(e.message)+'</p>'}
  }
  function mostra(){
    ov.querySelectorAll('.adm-abas button').forEach(b=>b.classList.toggle('on',b.dataset.aba===aba));
    const box=ov.querySelector('#admConteudo');aviso('');
    if(aba==='resumo')box.innerHTML=resumo();
    else if(aba==='usuarios'){box.innerHTML=usuarios();ligaUsuarios();desenhaLista()}
    else if(aba==='atividade')atividade();
    else if(aba==='backup')backup();
    else historico();
  }

  function ligaUsuarios(){
    const box=ov.querySelector('#admConteudo');
    box.querySelector('#nvGerar').onclick=()=>{box.querySelector('#nvSenha').value=gerarSenha()};
    let ultimo=null;
    box.querySelector('#nvCriar').onclick=async ev=>{
      const b=ev.currentTarget;aviso('');
      const corpo={acao:'criar',nome:box.querySelector('#nvNome').value,email:box.querySelector('#nvEmail').value,senha:box.querySelector('#nvSenha').value,papel:box.querySelector('#nvPapel').value};
      b.disabled=true;b.textContent='Criando…';
      try{await chama(corpo);ultimo={e:corpo.email,s:corpo.senha};
        ['#nvNome','#nvEmail','#nvSenha'].forEach(s=>box.querySelector(s).value='');
        await carrega();
        aviso('Conta criada. Passe o e-mail e a senha para a pessoa: ela começa com os dados em branco e importa a própria planilha.',true);
        const c=ov.querySelector('#nvCopiar');if(c){c.hidden=false;c.onclick=async()=>{try{await navigator.clipboard.writeText('E-mail: '+ultimo.e+'\nSenha: '+ultimo.s);c.textContent='Copiado ✓'}catch(e){c.textContent='Não deu para copiar'}}}
      }catch(e){aviso(e.message)}
      const bb=ov.querySelector('#nvCriar');if(bb){bb.disabled=false;bb.textContent='Criar usuário'}
    };
    const refiltra=()=>{filtro.q=box.querySelector('#fQ').value;filtro.papel=box.querySelector('#fPapel').value;filtro.status=box.querySelector('#fStatus').value;filtro.ordem=box.querySelector('#fOrdem').value;desenhaLista()};
    box.querySelector('#fQ').oninput=refiltra;['#fPapel','#fStatus','#fOrdem'].forEach(s=>box.querySelector(s).onchange=refiltra);

    const L=box.querySelector('#admLista');
    L.addEventListener('change',e=>{
      const c=e.target.closest('.adm-user');if(!c)return;
      if(e.target.matches('[data-mark]')){e.target.checked?marcados.add(c.dataset.id):marcados.delete(c.dataset.id);desenhaLote();return}
    });
    L.addEventListener('click',async e=>{
      const btn=e.target.closest('button[data-a]');if(!btn)return;
      const c=btn.closest('.adm-user'),id=c.dataset.id,acao=btn.dataset.a,extra=c.querySelector('.adm-extra');aviso('');
      const rodar=async(corpo,ok)=>{btn.disabled=true;try{await chama(corpo);await carrega();aviso(ok,true)}catch(er){aviso(er.message);btn.disabled=false}};
      if(acao==='dados'){const nome=(c.querySelector('[data-f=nome]').value||'').trim()||c.querySelector('.adm-topo span').textContent.trim();fechaPainel();ctx.abrirComo(id,nome);return}
      if(acao==='abrir'){const d=c.querySelector('.adm-det');d.hidden=!d.hidden;d.hidden?abertos.delete(id):abertos.add(id);btn.textContent=d.hidden?'Editar ▾':'Fechar ▴';return}
      if(acao==='salvar')return rodar({acao:'atualizar',id,nome:c.querySelector('[data-f=nome]').value,papel:c.querySelector('[data-f=papel]').value},'Alterações salvas.');
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
        return baixaCsv('usuarios.csv',[['nome','email','nivel','setores_com_dados','bloqueado','ultimo_acesso','criado_em']].concat(us.map(u=>[u.nome,u.email,nomeNivel(u.papel),u.setores_salvos+' de '+SETORES.length,u.bloqueado?'sim':'não',u.ultimo_login||'',u.criado_em])))}
      b.disabled=true;
      try{const r=await chama({acao:'lote',op,ids:[...marcados]});await carrega();aviso(r.feitos+' usuário(s) alterado(s).'+(r.pulados.length?' Não alterados: '+r.pulados.join(', ')+'.':''),true)}catch(er){aviso(er.message);b.disabled=false}
    });
  }

  function fechaPainel(){if(ov){ov.remove();ov=null}document.body.classList.remove('adm-aberto')}
  function monta(){
    ov=document.createElement('div');ov.id='adminOverlay';
    ov.innerHTML=`<div class="adm-box"><header class="adm-head"><div><h2>Administração</h2><small id="admTotal"></small></div><button type="button" class="button outline" id="admFechar">Fechar</button></header>
      <nav class="adm-abas"><button type="button" data-aba="resumo">Resumo</button><button type="button" data-aba="usuarios">Usuários</button><button type="button" data-aba="atividade">Atividade</button><button type="button" data-aba="historico">Histórico de escalas</button><button type="button" data-aba="backup">Backup</button></nav>
      <p id="admMsg" class="adm-msg" hidden></p>
      <div id="admConteudo"><p class="adm-vazio">Carregando…</p></div>
      <p class="adm-ajuda">Cada conta tem os próprios dados. <b>Usuário</b>: vê e edita só os seus. <b>Administrador</b>: além disso, gerencia contas e pode abrir e editar os dados de qualquer uma. </p></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#admFechar').addEventListener('click',fechaPainel);
    ov.querySelector('.adm-abas').addEventListener('click',e=>{const b=e.target.closest('button[data-aba]');if(!b)return;aba=b.dataset.aba;mostra()});
    ov.querySelector('#admConteudo').addEventListener('click',async e=>{
      const ab=e.target.closest('button[data-abrir]');if(ab){const u=lista.find(x=>x.id===ab.dataset.abrir);fechaPainel();ctx.abrirComo(ab.dataset.abrir,u&&(u.nome||u.email));return}
      const b=e.target.closest('button[data-h]');if(!b)return;
      if(b.dataset.ok!=='1'){b.dataset.ok='1';b.textContent='Confirmar restauração?';setTimeout(()=>{if(b.isConnected){b.dataset.ok='';b.textContent='Restaurar'}},4000);return}
      b.disabled=true;
      try{await chama({acao:'restaurar',id:Number(b.dataset.h)});aviso('Versão restaurada. A escala foi atualizada para todos que estão com o app aberto.',true);historico()}catch(er){aviso(er.message);b.disabled=false}
    });
    document.body.classList.add('adm-aberto');
  }
  window.abrirAdmin=c=>{if(ov)return;ctx=c;aba='usuarios';monta();carrega()};
})();
