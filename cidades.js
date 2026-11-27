/* Cidades atendidas e a convenção coletiva (CCT) de cada uma.
   Base confirmada na pesquisa: Sindiempresarial de Campo Mourão e Região (Campo Mourão, Araruna, Engenheiro Beltrão, Peabiru).
   Terra Boa e São Pedro do Ivaí: CCT ainda a confirmar — até lá valem as regras de Campo Mourão, avisando na tela. */
(function(){
  const LISTA=[
    {id:'campo-mourao',nome:'Campo Mourão',cct:'CCT Comerciários – Campo Mourão e Região',ok:true},
    {id:'araruna',nome:'Araruna',cct:'CCT Comerciários – Campo Mourão e Região',ok:true},
    {id:'engenheiro-beltrao',nome:'Engenheiro Beltrão',cct:'CCT Comerciários – Campo Mourão e Região',ok:true},
    {id:'peabiru',nome:'Peabiru',cct:'CCT Comerciários – Campo Mourão e Região',ok:true},
    {id:'sao-pedro-do-ivai',nome:'São Pedro do Ivaí',cct:'CCT a confirmar (usando regras de Campo Mourão)',ok:false},
    {id:'terra-boa',nome:'Terra Boa',cct:'CCT a confirmar (usando regras de Campo Mourão)',ok:false}
  ];
  window.CIDADES=LISTA;
  window.cidadeInfo=id=>LISTA.find(c=>c.id===id)||null;
  window.cidadeOpcoes=sel=>'<option value=""'+(!sel?' selected':'')+'>Não informada</option>'+LISTA.map(c=>'<option value="'+c.id+'"'+(c.id===sel?' selected':'')+'>'+c.nome+'</option>').join('');
  /* mostra a cidade/CCT da conta aberta ao lado do nome */
  window.defineCidade=function(id){
    window.cidadeConta=id||null;
    let el=document.getElementById('cidadeTag');
    if(!el){const w=document.getElementById('userWho');if(!w)return;el=document.createElement('span');el.id='cidadeTag';el.className='cidade-tag';w.insertAdjacentElement('afterend',el)}
    const c=window.cidadeInfo(id);
    el.hidden=!c;if(c){el.textContent='📍 '+c.nome+(c.ok?'':' · CCT a confirmar');el.title=c.cct;el.classList.toggle('pend',!c.ok)}
  };
})();
