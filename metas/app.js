/* ===================== utilidades ===================== */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl = (v, d=2) => (v==null||isNaN(v)) ? '—' : v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:d,maximumFractionDigits:d});
const brl0 = v => brl(v,0);
const nf = (v,d=2) => (v==null||isNaN(v)) ? '—' : v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct = (v,d=1) => (v==null||!isFinite(v)) ? '—' : (v*100).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%';
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DSEM = ['dom','seg','ter','qua','qui','sex','sáb'];
const pDate = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const fDate = s => { const d=pDate(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };
const fDateL = s => { const d=pDate(s); return `${DSEM[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayIso = () => isoOf(new Date());
const mesLabel = m => { const [y,mm]=m.split('-').map(Number); return `${MESES[mm-1][0].toUpperCase()+MESES[mm-1].slice(1)} ${y}`; };
const sum = a => a.reduce((x,y)=>x+(+y||0),0);
const round2 = v => Math.round((+v||0)*100)/100;
const clone = o => JSON.parse(JSON.stringify(o));
function toast(msg, ms=2800){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), ms); }
function status(p){ if(p==null||!isFinite(p)) return 'none'; if(p>=1) return 'good'; if(p>=0.9) return 'warn'; return 'bad'; }
const STXT = {good:'✔ Na meta', warn:'▲ Perto', bad:'▼ Abaixo', none:'Sem dados'};
function badge(p){ const s=status(p); return `<span class="badge b-${s}" title="${STXT[s]}">${s==='good'?'✔':s==='warn'?'▲':s==='bad'?'▼':'·'} ${pct(p)}</span>`; }
function barH(p, mark){ const s=status(p); const c={good:'var(--good)',warn:'#e0a100',bad:'var(--bad)',none:'#ccc'}[s]; const w=Math.max(0,Math.min(1,(p||0)/1.3))*100; const mk=mark!=null?`<span class="mk" style="left:${Math.min(100,mark/1.3*100)}%"></span>`:''; return `<div class="bar"><i style="width:${w}%;background:${c}"></i>${mk}</div>`; }

/* Parse número brasileiro / internacional */
/* ===================== estado ===================== */
const { parseNum, extractNums, parseLines, matchSector, ALIASES } = Parser;
const S = { sb:null, user:null, perfil:null, gerente:false, setoresAll:[], mesList:[], months:{}, mes:null, view:'painel', setorSel:null, cutoff:null, lancData:null, loaded:false, writeChain:Promise.resolve(), charts:[] };

function curDoc(){ return S.months[S.mes] || null; }
function diasDoMes(m){ const [y,mm]=m.split('-').map(Number); const n=new Date(y,mm,0).getDate(); return Array.from({length:n},(_,i)=>`${m}-${String(i+1).padStart(2,'0')}`); }
function vendaDia(d){ if(!d) return 0; if(+d.total>0) return +d.total; return d.vendas?sum(Object.values(d.vendas)):0; }
function temVenda(d){ return !!d && (vendaDia(d)>0); }
function lastSetorDay(doc){ const ks=Object.keys(doc.dias||{}).sort(); let l=null; for(const k of ks){ const v=doc.dias[k].vendas; if(v&&Object.keys(v).length) l=k; } return l; }
function lastDataDay(doc){ const ks=Object.keys(doc.dias||{}).sort(); let l=null; for(const k of ks) if(temVenda(doc.dias[k])) l=k; return l; }

/* ===================== cálculo ===================== */
function calc(doc, cutoff){
  const dias = diasDoMes(doc.mes);
  const metaLoja = +doc.metaLoja || sum(doc.setores.map(s=>s.meta));
  const totSet = sum(doc.setores.map(s=>+s.meta||0)) || 1;
  const setores = doc.setores.map(s=>({ ...s, share:(+s.meta||0)/metaLoja, metaAte:0, real:0, perda:0, diasComVenda:0, daily:[] }));
  let loja = { metaMes:metaLoja, metaAte:0, real:0, perda:0, daily:[], metaDiasSum:0 };
  const hoje = todayIso();
  for(const k of dias){
    const d = doc.dias?.[k] || {};
    const meta = +d.meta||0; loja.metaDiasSum+=meta;
    const real = vendaDia(d); const per = d.perdas?sum(Object.values(d.perdas)):0;
    const ate = cutoff && k<=cutoff;
    if(ate){ loja.metaAte+=meta; loja.real+=real; loja.perda+=per; }
    loja.daily.push({k, meta, real, perda:per, ate, temSetores:!!(d.vendas&&Object.keys(d.vendas).length)});
    for(const s of setores){
      const sm = meta*s.share; const sr = +(d.vendas?.[s.id])||0; const sp = +(d.perdas?.[s.id])||0;
      if(ate){ s.metaAte+=sm; s.real+=sr; s.perda+=sp; if(sr) s.diasComVenda++; }
      s.daily.push({k, meta:sm, real:sr, perda:sp, ate});
    }
  }
  // venda dos setores (apenas dias com detalhamento) para comparação justa por setor
  const restantes = dias.filter(k=>!cutoff||k>cutoff);
  const metaRest = sum(restantes.map(k=>+(doc.dias?.[k]?.meta)||0));
  loja.falta = Math.max(0, loja.metaMes-loja.real);
  loja.pAte = loja.metaAte? loja.real/loja.metaAte : null;
  loja.pMes = loja.metaMes? loja.real/loja.metaMes : null;
  loja.proj = loja.pAte!=null ? loja.real + metaRest*loja.pAte : null;
  loja.diasRest = restantes.length; loja.metaRest = metaRest;
  loja.necDia = restantes.length? loja.falta/restantes.length : 0;
  loja.fatorNec = metaRest? loja.falta/metaRest : null; // quanto da meta restante precisa vender
  loja.pPerda = loja.real? loja.perda/loja.real : null;
  const proxDia = (hoje>=dias[0] && hoje<=dias[dias.length-1]) ? hoje : (restantes[0]||null);
  loja.proxDia = proxDia; loja.metaProx = proxDia? (+(doc.dias?.[proxDia]?.meta)||0) : 0;
  for(const s of setores){
    s.pAte = s.metaAte? s.real/s.metaAte : null; s.pMes = s.meta? s.real/s.meta : null;
    s.falta = Math.max(0,(+s.meta||0)-s.real); s.pPerda = s.real? s.perda/s.real : null;
    s.metaProx = loja.metaProx*s.share; s.necDia = loja.diasRest? s.falta/loja.diasRest : 0;
    s.proj = s.pAte!=null ? s.real + metaRest*s.share*s.pAte : null;
    s.partReal = null;
  }
  const totReal = sum(setores.map(s=>s.real));
  setores.forEach(s=> s.partReal = totReal? s.real/totReal : null);
  loja.totSetores = totReal;
  return { loja, setores, dias };
}

/* ===================== render ===================== */
function destroyCharts(){ S.charts.forEach(c=>{try{c.destroy()}catch(e){}}); S.charts=[]; }
function render(){
  fillMesSelect();
  destroyCharts();
  const app=$('#app');
  if(!S.loaded){ return; }
  const doc=curDoc();
  if(!doc){
    if(S.view==='usuarios' && S.gerente) return renderUsuarios(app);
    app.innerHTML = S.gerente ? `<div class="card empty"><h2>Nenhum mês cadastrado ainda</h2><p>Crie o primeiro mês ou importe as planilhas mensais em <a href="#metas">Metas do mês</a>.</p></div>`
      : `<div class="card empty"><h2>Nenhuma meta liberada para você ainda</h2><p>Peça ao gerente para cadastrar as metas do mês.</p></div>`;
    if(S.view==='metas' && S.gerente) renderMetas(app,null);
    return;
  }
  if(!S.cutoff || !S.cutoff.startsWith(doc.mes)) S.cutoff = lastSetorDay(doc) || lastDataDay(doc) || diasDoMes(doc.mes)[0];
  if(S.view==='painel') renderPainel(app,doc);
  else if(S.view==='setor') renderSetor(app,doc);
  else if(S.view==='lancar') renderLancar(app,doc);
  else if(S.view==='historico') renderHistoricoAsync(app);
  else if(S.view==='usuarios' && S.gerente) renderUsuarios(app);
  else if(S.view==='metas' && S.gerente) renderMetas(app,doc);
  else renderPainel(app,doc);
}

function cutoffSelect(doc){
  const opts = diasDoMes(doc.mes).filter(k=>temVenda(doc.dias?.[k])).map(k=>`<option value="${k}" ${k===S.cutoff?'selected':''}>até ${fDateL(k)}</option>`).join('');
  return `<label class="f" style="min-width:170px">Dados até<select id="selCut">${opts||'<option>sem vendas</option>'}</select></label>`;
}
function bindCutoff(){ const s=$('#selCut'); if(s) s.onchange=e=>{S.cutoff=e.target.value; render();}; }

/* ---------- PAINEL ---------- */
function renderPainel(app, doc){
  const {loja,setores} = calc(doc,S.cutoff);
  const sortKey = S.sortKey||'meta'; const dir=S.sortDir||-1;
  const sorted = [...setores].sort((a,b)=> sortKey==='nome' ? a.nome.localeCompare(b.nome)*dir : ((a[sortKey]??-1)-(b[sortKey]??-1))*dir);
  const diffSet = Math.abs(loja.totSetores-loja.real)>1;
  const metaWarn = Math.abs(loja.metaDiasSum-loja.metaMes)>1;
  const necTxt = loja.fatorNec!=null ? `${pct(loja.fatorNec,0)} da meta diária planejada` : '';
  app.innerHTML = `
  <div class="row" style="align-items:flex-end;margin-bottom:14px">
    <div><h1>${mesLabel(doc.mes)}</h1><p class="sub" style="margin:0">Acumulado até <b>${fDateL(S.cutoff)}</b> · ${loja.diasRest} dia(s) restante(s)</p></div>
    <div class="sp"></div>${cutoffSelect(doc)}
    <button class="btn" id="btnXlsx">⬇ Baixar Excel</button>
    <a class="btn p" href="#lancar">＋ Lançar vendas</a>
  </div>
  ${metaWarn?`<div class="note" style="margin-bottom:12px">A soma das metas diárias (${brl0(loja.metaDiasSum)}) é diferente da meta do mês (${brl0(loja.metaMes)}). Ajuste em <a href="#metas">Metas do mês</a>.</div>`:''}
  <div class="grid kpis">
    <div class="kpi hero"><div class="l">% da meta até a data</div><div class="v">${pct(loja.pAte)}</div><div class="d">${STXT[status(loja.pAte)]} · ${loja.real>=loja.metaAte?'+':''}${brl0(loja.real-loja.metaAte)} vs. meta</div></div>
    <div class="kpi"><div class="l">Realizado</div><div class="v">${brl0(loja.real)}</div><div class="d">Meta até a data: ${brl0(loja.metaAte)}</div></div>
    <div class="kpi"><div class="l">Meta do mês</div><div class="v">${brl0(loja.metaMes)}</div><div class="d">${pct(loja.pMes)} atingido · falta ${brl0(loja.falta)}</div>${barH(loja.pMes)}</div>
    <div class="kpi"><div class="l">Projeção do mês</div><div class="v">${brl0(loja.proj)}</div><div class="d">${pct(loja.proj/loja.metaMes)} da meta, mantendo o ritmo</div></div>
    <div class="kpi"><div class="l">Precisa vender/dia</div><div class="v">${brl0(loja.necDia)}</div><div class="d">${necTxt}</div></div>
    <div class="kpi"><div class="l">Meta de ${loja.proxDia?fDate(loja.proxDia):'—'}</div><div class="v">${brl0(loja.metaProx)}</div><div class="d">${loja.proxDia?fDateL(loja.proxDia):''}</div></div>
    ${(()=>{ const c=compAnoAnterior(doc,S.cutoff); return c?`<div class="kpi"><div class="l">vs. ${mesLabel(c.mes)}</div><div class="v" style="color:${c.cresc>=0?'var(--good)':'var(--bad)'}">${c.cresc>=0?'▲ +':'▼ '}${pct(c.cresc)}</div><div class="d">Mesmo período: ${brl0(c.real)} até dia ${c.dia}</div></div>`:''; })()}
    <div class="kpi"><div class="l">Perdas lançadas</div><div class="v">${brl0(loja.perda)}</div><div class="d">${pct(loja.pPerda,2)} sobre a venda</div></div>
  </div>

  <div class="grid two" style="margin-top:12px">
    <div class="card">
      <div class="row"><h2 style="margin:0">Venda diária × meta</h2><div class="sp"></div><div class="tabs2" id="chTabs"><button data-c="dia" class="${(S.chMode||'dia')==='dia'?'on':''}">Diário</button><button data-c="acum" class="${S.chMode==='acum'?'on':''}">Acumulado</button></div></div>
      <div class="legend"><span><i class="lg-bar"></i>Realizado</span><span><i class="lg-line"></i>Meta</span></div>
      <div class="chartbox"><canvas id="chLoja"></canvas></div>
    </div>
    <div class="card">
      <h2>Ranking de atingimento</h2>
      <div class="chartbox" style="height:${Math.max(300,setores.length*24)}px"><canvas id="chRank"></canvas></div>
    </div>
  </div>

  <div class="card" style="margin-top:12px">
    <div class="row" style="margin-bottom:10px"><h2 style="margin:0">Setores — detalhado</h2><div class="sp"></div><span class="small muted">Clique em um setor para ver o dia a dia</span></div>
    ${diffSet?`<div class="note small" style="margin-bottom:10px">O realizado da loja (${brl0(loja.real)}) usa o total do caixa quando ele foi lançado; a soma dos setores é ${brl0(loja.totSetores)}.</div>`:''}
    <div class="tw dtable"><table>
      <thead><tr>
        <th class="sort" data-k="nome">Setor</th><th class="n sort gx" data-k="share">Repr.</th><th class="n sort" data-k="meta">Meta mês</th><th class="n sort" data-k="metaAte">Meta até data</th><th class="n sort" data-k="real">Realizado</th><th class="sort" data-k="pAte">% até data</th><th class="n sort" data-k="pMes">% mês</th><th class="n sort" data-k="falta">Falta</th><th class="n sort" data-k="necDia">Precisa/dia</th><th class="n sort" data-k="metaProx">Meta ${loja.proxDia?fDate(loja.proxDia):''}</th><th class="n sort" data-k="perda">Perda</th><th class="n sort" data-k="pPerda">% perda</th>
      </tr></thead>
      <tbody>${sorted.map(s=>`<tr class="click" data-s="${s.id}">
        <td><b>${esc(s.nome)}</b></td><td class="n gx">${pct(s.share)}</td><td class="n">${brl0(s.meta)}</td><td class="n">${brl0(s.metaAte)}</td><td class="n"><b>${brl0(s.real)}</b></td>
        <td style="min-width:150px"><div class="row" style="gap:8px;flex-wrap:nowrap">${badge(s.pAte)}<div style="flex:1">${barH(s.pAte,1)}</div></div></td>
        <td class="n">${pct(s.pMes)}</td><td class="n">${brl0(s.falta)}</td><td class="n">${brl0(s.necDia)}</td><td class="n">${brl0(s.metaProx)}</td><td class="n">${s.perda?brl0(s.perda):'—'}</td><td class="n">${s.perda?pct(s.pPerda,2):'—'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>${S.gerente?'Loja':'Total'}</td><td class="n gx">100%</td><td class="n">${brl0(loja.metaMes)}</td><td class="n">${brl0(loja.metaAte)}</td><td class="n">${brl0(loja.real)}</td><td>${badge(loja.pAte)}</td><td class="n">${pct(loja.pMes)}</td><td class="n">${brl0(loja.falta)}</td><td class="n">${brl0(loja.necDia)}</td><td class="n">${brl0(loja.metaProx)}</td><td class="n">${brl0(loja.perda)}</td><td class="n">${pct(loja.pPerda,2)}</td></tr></tfoot>
    </table></div>
    <div class="mcards">${sorted.map(s=>`<div class="sc" data-s="${s.id}"><div class="t"><b>${esc(s.nome)}</b>${badge(s.pAte)}</div>${barH(s.pAte,1)}
      <div class="g"><div>Realizado<span>${brl0(s.real)}</span></div><div>Meta até data<span>${brl0(s.metaAte)}</span></div><div>Meta mês<span>${brl0(s.meta)}</span></div><div>% mês<span>${pct(s.pMes)}</span></div><div>Precisa/dia<span>${brl0(s.necDia)}</span></div><div>Perda<span>${s.perda?brl0(s.perda):'—'}</span></div></div></div>`).join('')}</div>
  </div>

  ${S.gerente?renderDiariasCard(doc):''}
  `;
  bindCutoff();
  app.querySelectorAll('[data-s]').forEach(el=>el.onclick=()=>{ S.setorSel=el.dataset.s; location.hash='#setor'; });
  app.querySelectorAll('th.sort').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; if(S.sortKey===k) S.sortDir=-(S.sortDir||-1); else {S.sortKey=k;S.sortDir=k==='nome'?1:-1;} render(); });
  $('#chTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.chMode=b.dataset.c; render();});
  $('#btnXlsx').onclick=()=>exportXlsx(doc);
  drawLojaChart(loja);
  drawRank(setores);
}

function renderDiariasCard(doc){
  const di=doc.diarias; if(!di) return '';
  const usado=sum((di.lancamentos||[]).map(l=>l.valor)); const sobra=(+di.orcamento||0)-usado;
  return `<div class="card" style="margin-top:12px"><div class="row"><h2 style="margin:0">Diárias</h2><div class="sp"></div><a class="small" href="#metas">editar</a></div>
  <div class="grid kpis" style="margin-top:10px"><div class="kpi"><div class="l">Orçamento</div><div class="v">${brl0(di.orcamento)}</div></div><div class="kpi"><div class="l">Utilizado</div><div class="v">${brl0(usado)}</div><div class="d">${(di.lancamentos||[]).length} lançamento(s)</div></div><div class="kpi"><div class="l">Sobrando</div><div class="v" style="color:${sobra<0?'var(--bad)':'inherit'}">${brl0(sobra)}</div></div></div></div>`;
}

const chartFont = {family:"'Barlow', sans-serif"};
function baseOpts(extra={}){
  return Object.assign({responsive:true,maintainAspectRatio:false,animation:{duration:250},interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{backgroundColor:'#161514',titleFont:{...chartFont,weight:'700'},bodyFont:chartFont,padding:10,callbacks:{label:c=>` ${c.dataset.label}: ${brl(c.parsed.y??c.parsed.x)}`}}},
    scales:{x:{grid:{display:false},ticks:{font:chartFont,color:'#8a867e',maxRotation:0,autoSkip:true}},y:{grid:{color:'#eeeae2'},border:{display:false},ticks:{font:chartFont,color:'#8a867e',callback:v=>v>=1000?(v/1000).toLocaleString('pt-BR')+' mil':v}}}},extra);
}
function drawLojaChart(loja, el='chLoja', mode=S.chMode||'dia'){
  const cv=document.getElementById(el); if(!cv||!window.Chart) return;
  const lab=loja.daily.map(d=>fDate(d.k).slice(0,2));
  let real, meta;
  if(mode==='acum'){ let a=0,b=0; real=loja.daily.map(d=>{a+=d.real; return d.ate||d.real?a:null;}); meta=loja.daily.map(d=>(b+=d.meta)); }
  else { real=loja.daily.map(d=>d.real||null); meta=loja.daily.map(d=>d.meta||null); }
  const colors = loja.daily.map(d=> d.real? (d.real>=d.meta?'#2f5d8a':'#9db6cf') : '#2f5d8a');
  const ch=new Chart(cv,{data:{labels:lab,datasets:[
    mode==='acum'? {type:'line',label:'Realizado',data:real,borderColor:'#2f5d8a',backgroundColor:'#2f5d8a22',fill:true,pointRadius:0,borderWidth:2,tension:.2,spanGaps:false}
                 : {type:'bar',label:'Realizado',data:real,backgroundColor:colors,borderRadius:4,maxBarThickness:22,order:2},
    {type:'line',label:'Meta',data:meta,borderColor:'#a39e94',borderDash:[5,4],borderWidth:2,pointRadius:0,tension:0,order:1,fill:false}
  ]},options:baseOpts({plugins:{legend:{display:false},tooltip:{backgroundColor:'#161514',padding:10,titleFont:{...chartFont,weight:'700'},bodyFont:chartFont,callbacks:{title:i=>fDateL(loja.daily[i[0].dataIndex].k),label:c=>` ${c.dataset.label}: ${brl(c.parsed.y)}`,afterBody:i=>{const d=loja.daily[i[0].dataIndex]; if(mode==='dia'&&d.real&&d.meta) return `Atingido: ${pct(d.real/d.meta)}`; return '';}}}}})});
  S.charts.push(ch);
}
function drawRank(setores){
  const cv=$('#chRank'); if(!cv||!window.Chart) return;
  const s=[...setores].filter(x=>x.pAte!=null).sort((a,b)=>b.pAte-a.pAte);
  const ch=new Chart(cv,{type:'bar',data:{labels:s.map(x=>x.nome),datasets:[{label:'% até a data',data:s.map(x=>+(x.pAte*100).toFixed(1)),backgroundColor:s.map(x=>({good:'#1f8a4c',warn:'#e0a100',bad:'#c62828'}[status(x.pAte)])),borderRadius:4,maxBarThickness:16}]},
    options:baseOpts({indexAxis:'y',interaction:{mode:'nearest',intersect:true,axis:'y'},plugins:{legend:{display:false},tooltip:{backgroundColor:'#161514',padding:10,bodyFont:chartFont,callbacks:{label:c=>{const x=s[c.dataIndex]; return [` ${STXT[status(x.pAte)]}: ${pct(x.pAte)}`,` Realizado ${brl0(x.real)} de ${brl0(x.metaAte)}`];}}}},
      scales:{x:{grid:{color:'#eeeae2'},border:{display:false},ticks:{font:chartFont,color:'#8a867e',callback:v=>v+'%'},suggestedMin:0,suggestedMax:120},y:{grid:{display:false},ticks:{font:{...chartFont,size:12},color:'#1b1a18'}}}})});
  S.charts.push(ch);
}

function compAnoAnterior(doc, cutoff){
  if(!cutoff) return null; const [y,m]=doc.mes.split('-'); const mp=`${+y-1}-${m}`; const ant=S.months[mp]; if(!ant) return null;
  const dia=+cutoff.slice(8); const lim=`${mp}-${String(dia).padStart(2,'0')}`;
  const real=sum(Object.entries(ant.dias||{}).filter(([k])=>k<=lim).map(([,d])=>vendaDia(d)));
  const atual=calc(doc,cutoff).loja.real; if(!real) return null;
  return {mes:mp, dia, real, cresc:atual/real-1};
}

/* ---------- HISTÓRICO ---------- */
function resumoMes(doc){ const ds=diasDoMes(doc.mes); const cut = doc.mes<todayIso().slice(0,7) ? ds[ds.length-1] : (lastSetorDay(doc)||lastDataDay(doc)); return calc(doc,cut); }
function renderHistorico(app){
  const ks=Object.keys(S.months).sort();
  const rows=ks.map(k=>{ const d=S.months[k]; const c=resumoMes(d); const [y,m]=k.split('-'); const ant=S.months[`${+y-1}-${m}`]; const fechado=k<todayIso().slice(0,7); const antReal=ant?resumoMes(ant).loja.real:null;
    let cresc = antReal? c.loja.real/antReal-1 : null; if(!fechado){ const cp=compAnoAnterior(d, lastSetorDay(d)||lastDataDay(d)); cresc=cp?cp.cresc:null; }
    return {k, d, c, metaMes:c.loja.metaMes, real:c.loja.real, pMes:c.loja.pMes, pAte:c.loja.pAte, perda:c.loja.perda, cresc, fechado}; });
  const anos=[...new Set(ks.map(k=>k.slice(0,4)))];
  const ids=['acougue','hortifruti','padaria','panif_terc','pereciveis','merc_seca','merc_salgada','merc_doce','bebidas','perfumaria','limpeza','bazar','leite_gas','eletro'];
  const nomes={}; ks.forEach(k=>S.months[k].setores.forEach(s=>nomes[s.id]=nomes[s.id]||s.nome));
  const modo=S.histModo||'pct';
  const cell=(r,id)=>{ const s=r.c.setores.find(x=>x.id===id); if(!s||!s.real) return '<td class="n muted">—</td>'; const p=r.fechado?s.pMes:s.pAte; if(modo==='pct'){ const st=status(p); return `<td class="n" style="background:${{good:'var(--good-bg)',warn:'var(--warn-bg)',bad:'var(--bad-bg)',none:''}[st]}" title="${esc(s.nome)} · ${brl0(s.real)} de ${brl0(r.fechado?s.meta:s.metaAte)}">${pct(p,0)}</td>`; } return `<td class="n">${nf(s.real/1000,0)}</td>`; };
  app.innerHTML=`
  <div class="row" style="align-items:flex-end;margin-bottom:14px"><div><h1>Histórico</h1><p class="sub" style="margin:0">${ks.length} meses · ${mesLabel(ks[0])} a ${mesLabel(ks[ks.length-1])}</p></div></div>
  <div class="card"><div class="row"><h2 style="margin:0">Realizado × meta por mês</h2></div>
    <div class="legend"><span><i class="lg-bar"></i>Realizado</span><span><i class="lg-line"></i>Meta</span></div>
    <div class="chartbox" style="height:320px"><canvas id="chHist"></canvas></div></div>
  <div class="card" style="margin-top:12px"><h2>Meses</h2>
    <div class="tw dtable"><table><thead><tr><th>Mês</th><th class="n">Meta</th><th class="n">Realizado</th><th>% da meta</th><th class="n">Diferença</th><th class="n">vs. ano anterior</th><th class="n">Perdas</th><th></th></tr></thead>
    <tbody>${rows.slice().reverse().map(r=>`<tr><td><b>${mesLabel(r.k)}</b>${r.fechado?'':' <span class="badge b-none">em andamento</span>'}</td><td class="n">${brl0(r.metaMes)}</td><td class="n"><b>${brl0(r.real)}</b></td><td>${badge(r.fechado?r.pMes:r.pAte)}</td><td class="n">${r.fechado?brl0(r.real-r.metaMes):'—'}</td><td class="n" style="color:${r.cresc==null?'':r.cresc>=0?'var(--good)':'var(--bad)'}">${r.cresc==null?'—':(r.cresc>=0?'+':'')+pct(r.cresc)}</td><td class="n">${r.perda?brl0(r.perda):'—'}</td><td><button class="btn" data-open="${r.k}" style="padding:4px 10px">Abrir</button></td></tr>`).join('')}</tbody></table></div>
    <div class="mcards">${rows.slice().reverse().map(r=>`<div class="sc" data-open="${r.k}"><div class="t"><b>${mesLabel(r.k)}</b>${badge(r.fechado?r.pMes:r.pAte)}</div><div class="g"><div>Realizado<span>${brl0(r.real)}</span></div><div>Meta<span>${brl0(r.metaMes)}</span></div><div>vs. ano ant.<span>${r.cresc==null?'—':pct(r.cresc)}</span></div></div></div>`).join('')}</div>
    <p class="small muted">Meses fechados: % sobre a meta do mês. Mês em andamento: % sobre a meta até a data.</p>
  </div>
  <div class="card" style="margin-top:12px"><div class="row" style="margin-bottom:10px"><h2 style="margin:0">Setores mês a mês</h2><div class="sp"></div><div class="tabs2" id="hModo"><button data-m="pct" class="${modo==='pct'?'on':''}">% da meta</button><button data-m="val" class="${modo==='val'?'on':''}">Realizado (R$ mil)</button></div></div>
    <div class="tw" style="max-height:620px"><table><thead><tr><th>Mês</th>${ids.map(i=>`<th class="n" style="white-space:normal;min-width:74px">${esc(nomes[i]||i)}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice().reverse().map(r=>`<tr><td style="white-space:nowrap"><b>${mesLabel(r.k)}</b></td>${ids.map(i=>cell(r,i)).join('')}</tr>`).join('')}</tbody></table></div>
  </div>`;
  app.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ S.mes=b.dataset.open; S.cutoff=null; location.hash='#painel'; render(); });
  $('#hModo').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.histModo=b.dataset.m; render();});
  const cv=$('#chHist'); if(cv&&window.Chart){ const ch=new Chart(cv,{data:{labels:rows.map(r=>{const [y,m]=r.k.split('-'); return MESES[+m-1].slice(0,3)+'/'+y.slice(2);}),datasets:[
    {type:'bar',label:'Realizado',data:rows.map(r=>r.real),backgroundColor:rows.map(r=>r.real>=r.metaMes?'#2f5d8a':'#9db6cf'),borderRadius:4,maxBarThickness:26,order:2},
    {type:'line',label:'Meta',data:rows.map(r=>r.metaMes),borderColor:'#a39e94',borderDash:[5,4],borderWidth:2,pointRadius:2,pointBackgroundColor:'#a39e94',order:1}]},
    options:baseOpts({plugins:{legend:{display:false},tooltip:{backgroundColor:'#161514',padding:10,bodyFont:chartFont,titleFont:{...chartFont,weight:'700'},callbacks:{title:i=>mesLabel(rows[i[0].dataIndex].k),label:c=>` ${c.dataset.label}: ${brl0(c.parsed.y)}`,afterBody:i=>{const r=rows[i[0].dataIndex]; const o=[`Atingido: ${pct(r.fechado?r.pMes:r.pAte)}`]; if(r.cresc!=null) o.push(`vs. ano anterior: ${pct(r.cresc)}`); return o;}}}},scales:{x:{grid:{display:false},ticks:{font:chartFont,color:'#8a867e',maxRotation:0,autoSkip:true}},y:{grid:{color:'#eeeae2'},border:{display:false},ticks:{font:chartFont,color:'#8a867e',callback:v=>(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi'}}}})}); S.charts.push(ch); }
}

/* ---------- SETOR ---------- */
function renderSetor(app, doc){
  const {loja,setores} = calc(doc,S.cutoff);
  if(!S.setorSel || !setores.find(s=>s.id===S.setorSel)) S.setorSel = setores[0]?.id;
  const s = setores.find(x=>x.id===S.setorSel);
  app.innerHTML = `
  <div class="row" style="align-items:flex-end;margin-bottom:14px">
    <div><h1>${esc(s.nome)}</h1><p class="sub" style="margin:0">${mesLabel(doc.mes)} · representa ${pct(s.share)} da meta da loja</p></div>
    <div class="sp"></div>
    <label class="f">Setor<select id="selSetor">${setores.map(x=>`<option value="${x.id}" ${x.id===s.id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>
    ${cutoffSelect(doc)}
  </div>
  <div class="grid kpis">
    <div class="kpi hero"><div class="l">% até a data</div><div class="v">${pct(s.pAte)}</div><div class="d">${STXT[status(s.pAte)]} · ${s.real>=s.metaAte?'+':''}${brl0(s.real-s.metaAte)}</div></div>
    <div class="kpi"><div class="l">Realizado</div><div class="v">${brl0(s.real)}</div><div class="d">Meta até a data ${brl0(s.metaAte)}</div></div>
    <div class="kpi"><div class="l">Meta do mês</div><div class="v">${brl0(s.meta)}</div><div class="d">${pct(s.pMes)} · falta ${brl0(s.falta)}</div>${barH(s.pMes)}</div>
    <div class="kpi"><div class="l">Projeção</div><div class="v">${brl0(s.proj)}</div><div class="d">${pct(s.proj/s.meta)} da meta</div></div>
    <div class="kpi"><div class="l">Precisa vender/dia</div><div class="v">${brl0(s.necDia)}</div><div class="d">Meta de ${loja.proxDia?fDate(loja.proxDia):'—'}: ${brl0(s.metaProx)}</div></div>
    <div class="kpi"><div class="l">Perda</div><div class="v">${brl0(s.perda)}</div><div class="d">${pct(s.pPerda,2)} sobre a venda</div></div>
    <div class="kpi"><div class="l">Participação real</div><div class="v">${pct(s.partReal)}</div><div class="d">da venda dos setores (planejado ${pct(s.share)})</div></div>
  </div>
  <div class="card" style="margin-top:12px">
    <div class="row"><h2 style="margin:0">Dia a dia</h2><div class="sp"></div><div class="tabs2" id="chTabs"><button data-c="dia" class="${(S.chMode||'dia')==='dia'?'on':''}">Diário</button><button data-c="acum" class="${S.chMode==='acum'?'on':''}">Acumulado</button></div></div>
    <div class="legend"><span><i class="lg-bar"></i>Realizado</span><span><i class="lg-line"></i>Meta</span></div>
    <div class="chartbox"><canvas id="chSet"></canvas></div>
  </div>
  <div class="card" style="margin-top:12px">
    <div class="tw"><table><thead><tr><th>Dia</th><th class="n">Meta</th><th class="n">Realizado</th><th>% atingido</th><th class="n">Diferença</th><th class="n">Acum. meta</th><th class="n">Acum. real</th><th class="n">% acum.</th><th class="n">Perda</th><th class="n">% perda</th></tr></thead>
    <tbody>${(()=>{let am=0,ar=0; return s.daily.map(d=>{am+=d.meta; ar+=d.real; const p=d.real&&d.meta?d.real/d.meta:null; const fut=!d.real; return `<tr style="${fut?'color:#aaa':''}"><td>${fDateL(d.k)}</td><td class="n">${brl0(d.meta)}</td><td class="n">${d.real?brl(d.real):'—'}</td><td>${d.real?badge(p):''}</td><td class="n">${d.real?brl0(d.real-d.meta):'—'}</td><td class="n">${brl0(am)}</td><td class="n">${d.real||d.ate?brl0(ar):'—'}</td><td class="n">${d.real||d.ate?pct(ar/am):'—'}</td><td class="n">${d.perda?brl(d.perda):'—'}</td><td class="n">${d.perda&&d.real?pct(d.perda/d.real,2):'—'}</td></tr>`;}).join('');})()}</tbody>
    <tfoot><tr><td>Total</td><td class="n">${brl0(sum(s.daily.map(d=>d.meta)))}</td><td class="n">${brl0(s.real)}</td><td></td><td></td><td></td><td></td><td></td><td class="n">${brl0(s.perda)}</td><td class="n">${pct(s.pPerda,2)}</td></tr></tfoot></table></div>
  </div>`;
  $('#selSetor').onchange=e=>{S.setorSel=e.target.value; render();};
  bindCutoff();
  $('#chTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.chMode=b.dataset.c; render();});
  drawLojaChart({daily:s.daily},'chSet');
}

/* ---------- LANÇAR ---------- */
function renderLancar(app, doc){
  const dias=diasDoMes(doc.mes);
  if(!S.lancData || !S.lancData.startsWith(doc.mes)){ const lst=lastDataDay(doc); S.lancData = lst ? dias[Math.min(dias.indexOf(lst)+1,dias.length-1)] : dias[0]; }
  const k=S.lancData; const d=doc.dias?.[k]||{};
  const nSet=doc.setores.length;
  const chip = x => { const dd=doc.dias?.[x]; const n=dd?.vendas?Object.keys(dd.vendas).filter(i=>dd.vendas[i]).length:0; const cls = n>=nSet?'full':(n||dd?.total)?'part':''; const fut = x>todayIso()?'fut':''; return `<div class="dchip ${cls} ${fut} ${x===k?'sel':''}" data-d="${x}">${DSEM[pDate(x).getDay()]}<b>${x.slice(8)}</b></div>`; };
  const aiOk = false;
  app.innerHTML = `
  <h1>Lançar vendas</h1><p class="sub">Importe o relatório de vendas (Excel, CSV ou PDF), cole o texto ou digite os valores. Tudo é conferido antes de salvar.${S.gerente?'':' Você lança apenas: <b>'+esc(doc.setores.map(x=>x.nome).join(', '))+'</b>.'}</p>
  <div class="card">
    <div class="row" style="margin-bottom:8px"><b>Escolha o dia</b><div class="sp"></div><span class="small muted"><span class="sw" style="background:var(--good-bg);border:1px solid #a9d8b8"></span>completo <span class="sw" style="background:var(--warn-bg);border:1px solid #f1d98a;margin-left:8px"></span>parcial</span></div>
    <div class="daylist">${dias.map(chip).join('')}</div>
  </div>

  <div class="grid imp" style="margin-top:12px">
    <div class="drop" id="dropFile"><div class="ico">📊</div><h3>Relatório em arquivo</h3><p>Excel (.xlsx/.xls), CSV ou PDF do sistema · também aceita a planilha mensal antiga</p><div style="margin-top:10px"><button class="btn y" id="bFile">Escolher arquivo</button></div><input type="file" id="fFile" accept=".xlsx,.xls,.xlsm,.csv,.txt,.pdf" class="hide"></div>
    <div class="drop"><div class="ico">📋</div><h3>Colar texto</h3><p>Copie as linhas do relatório e cole aqui</p><div style="margin-top:10px"><button class="btn y" id="bPaste">Colar relatório</button></div></div>
  </div>

  <div class="card" style="margin-top:12px">
    <div class="row" style="margin-bottom:10px"><h2 style="margin:0">${fDateL(k)} · meta ${S.gerente?'da loja':'dos seus setores'} ${brl0(d.meta)}</h2><div class="sp"></div><span id="lTot" class="num" style="font-size:20px;font-weight:700"></span></div>
    <div class="tw"><table id="tLanc"><thead><tr><th>Setor</th><th class="n">Meta do dia</th><th class="n" style="width:170px">Venda (R$)</th><th class="hm" style="width:110px">% meta</th><th class="n" style="width:150px">Perda (R$)</th></tr></thead>
    <tbody>${doc.setores.map(s=>{const sm=(+d.meta||0)*(s.meta/(doc.metaLoja||1)); return `<tr><td><b>${esc(s.nome)}</b></td><td class="n">${brl0(sm)}</td><td><input class="in" inputmode="decimal" data-v="${s.id}" value="${d.vendas?.[s.id]!=null?nf(d.vendas[s.id]):''}" placeholder="0,00"></td><td class="hm" data-p="${s.id}" data-m="${sm}"></td><td><input class="in" inputmode="decimal" data-l="${s.id}" value="${d.perdas?.[s.id]!=null?nf(d.perdas[s.id]):''}" placeholder="0,00"></td></tr>`;}).join('')}</tbody>
    </table></div>
    <div class="row" style="margin-top:12px">
      <label class="f ${S.gerente?'':'hide'}" style="max-width:240px">Total do caixa (opcional — se preenchido, é o realizado da loja)<input class="in" inputmode="decimal" id="inTotal" value="${d.total!=null?nf(d.total):''}" placeholder="opcional"></label>
      <div class="sp"></div>
      <button class="btn" id="bLimpar">Limpar dia</button>
      <button class="btn p" id="bSalvar">💾 Salvar ${fDate(k)}</button>
    </div>
  </div>`;
  app.querySelectorAll('.dchip').forEach(c=>c.onclick=()=>{ S.lancData=c.dataset.d; render(); });
  const upd=()=>{ let t=0; app.querySelectorAll('[data-v]').forEach(i=>{ const v=parseNum(i.value)||0; t+=v; const td=app.querySelector(`[data-p="${i.dataset.v}"]`); const m=+td.dataset.m; td.innerHTML = v? badge(v/m):''; }); $('#lTot').innerHTML = `Total ${brl(t)} ${d.meta?badge(t/d.meta):''}`; };
  app.querySelectorAll('input.in').forEach(i=>i.addEventListener('input',()=>{i.classList.add('chg');upd();}));
  upd();
  $('#bSalvar').onclick=()=>{
    const nd=clone(doc); const day=nd.dias[k]=nd.dias[k]||{meta:d.meta||0};
    const vendas={}, perdas={};
    app.querySelectorAll('[data-v]').forEach(i=>{ const v=parseNum(i.value); if(i.value.trim()!==''&&!isNaN(v)) vendas[i.dataset.v]=round2(v); });
    app.querySelectorAll('[data-l]').forEach(i=>{ const v=parseNum(i.value); if(i.value.trim()!==''&&!isNaN(v)&&v) perdas[i.dataset.l]=round2(v); });
    if(Object.keys(vendas).length) day.vendas=vendas; else delete day.vendas;
    if(Object.keys(perdas).length) day.perdas=perdas; else delete day.perdas;
    const tv=parseNum($('#inTotal').value); if($('#inTotal').value.trim()&&!isNaN(tv)) day.total=round2(tv); else delete day.total;
    saveDoc(nd, `Vendas de ${fDate(k)} salvas ✔`).then(ok=>{ if(ok){ S.cutoff=null; } });
  };
  $('#bLimpar').onclick=()=>confirmBox(`Apagar vendas, perdas e total de ${fDateL(k)}? A meta do dia é mantida.`,()=>{ const nd=clone(doc); const day=nd.dias[k]||{}; nd.dias[k]={meta:day.meta||0}; saveDoc(nd,'Dia limpo'); });
  // importações
  const fImg=$('#fImg'), fFile=$('#fFile');
  $('#bFile').onclick=()=>fFile.click();
  fFile.onchange=()=>{ if(fFile.files[0]) importFile(fFile.files[0]); fFile.value=''; };
  $('#bPaste').onclick=pasteDialog;
  for(const [id,fn] of [['dropFile',f=>importFile(f[0])]]){
    const z=$('#'+id); z.ondragover=e=>{e.preventDefault();z.classList.add('over');}; z.ondragleave=()=>z.classList.remove('over');
    z.ondrop=e=>{e.preventDefault();z.classList.remove('over'); const fs=[...e.dataTransfer.files]; if(!fs.length) return; fn(fs); };
  }
}

/* ===================== modais ===================== */
function modal(html){ const r=$('#modalRoot'); r.innerHTML=`<div class="modal-bg"><div class="modal">${html}</div></div>`; return r.firstChild.firstChild; }
function closeModal(){ $('#modalRoot').innerHTML=''; }
function confirmBox(msg,ok){ const m=modal(`<h2>Confirmar</h2><p>${esc(msg)}</p><div class="row"><div class="sp"></div><button class="btn" id="mN">Cancelar</button><button class="btn p" id="mY">Confirmar</button></div>`); $('#mN',m).onclick=closeModal; $('#mY',m).onclick=()=>{closeModal();ok();}; }
function busy(msg){ modal(`<h2><span class="spin"></span> ${esc(msg)}</h2><p class="muted small">Isso pode levar alguns segundos.</p>`); }

function pasteDialog(){
  const m=modal(`<h2>Colar relatório</h2><p class="small muted">Cole as linhas do relatório (setor e valor). Pode colar direto do sistema, do WhatsApp ou do Excel.</p>
  <textarea id="ta" style="width:100%;height:220px;border:1px solid var(--line);border-radius:10px;padding:10px;font-family:monospace"></textarea>
  <div class="row" style="margin-top:10px"><div class="sp"></div><button class="btn" id="mN">Cancelar</button>${S.sample?'<button class="btn" id="mAI">Ler com IA</button>':''}<button class="btn p" id="mY">Ler valores</button></div>`);
  $('#mN',m).onclick=closeModal;
  $('#mY',m).onclick=()=>{ const t=$('#ta',m).value; const lines=t.split(/\r?\n/).map(l=>l.split('\t').join('  ')); const r=parseLines(lines.map(l=>({text:l,nums:null}))); r.fonte='texto colado'; r.rawText=t; if(Object.keys(r.vendas).length<3 && S.sample){ aiFromText(t,'texto colado'); } else reviewImport(r); };
  const ai=$('#mAI',m); if(ai) ai.onclick=()=>aiFromText($('#ta',m).value,'texto colado');
}

/* ===================== arquivos ===================== */
async function importFile(file){
  if(!file) return; const name=file.name.toLowerCase();
  try{
    if(name.endsWith('.pdf')) return await importPdf(file);
    if(name.endsWith('.csv')||name.endsWith('.txt')){ const t=await file.text(); const lines=t.split(/\r?\n/); const r=parseLines(lines.map(l=>({text:l.replace(/[;\t]/g,'  ')}))); r.fonte=file.name; if(Object.keys(r.vendas).length<3&&S.sample) return aiFromText(t,file.name); return reviewImport(r); }
    if(!window.XLSX) throw new Error('Leitor de Excel não carregou.');
    busy('Lendo planilha…');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    if(wb.SheetNames.includes('META DIARIA')) { closeModal(); return modeloDialog(wb,file.name); }
    const rows=[]; let allText='';
    for(const sn of wb.SheetNames){ const ws=wb.Sheets[sn]; const arr=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
      for(const row of arr){ const cells=row.filter(c=>c!=null&&c!==''); if(!cells.length) continue; const strs=cells.filter(c=>typeof c==='string'); const nums=cells.filter(c=>typeof c==='number'); const lab=strs.find(x=>matchSector(x));
        rows.push({text:cells.map(c=>c instanceof Date?isoOf(c):c).join(' | '), label:lab||strs.join(' '), nums: nums.length?nums:extractNums(strs.join(' ').replace(lab||'',''))});
        allText += cells.map(c=>c instanceof Date?isoOf(c):(typeof c==='number'?String(c).replace('.',','):c)).join('\t')+'\n'; } }
    const r=parseLines(rows); r.fonte=file.name;
    const ambig = r.avisos.length>0;
    if((Object.keys(r.vendas).length<3 || ambig) && S.sample){ return aiFromText(allText, file.name); }
    reviewImport(r);
  }catch(e){ console.error(e); closeModal(); toast('Não consegui ler o arquivo: '+(e.message||e),5000); }
}
async function importPdf(file){
  busy('Lendo PDF…');
  if(!window.pdfjsLib) throw new Error('Leitor de PDF não carregou.');
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  let lines=[];
  for(let p=1;p<=Math.min(pdf.numPages,15);p++){
    const pg=await pdf.getPage(p); const tc=await pg.getTextContent();
    const map=new Map(); for(const it of tc.items){ const y=Math.round(it.transform[5]/3); if(!map.has(y)) map.set(y,[]); map.get(y).push({x:it.transform[4],s:it.str}); }
    [...map.entries()].sort((a,b)=>b[0]-a[0]).forEach(([,its])=>lines.push(its.sort((a,b)=>a.x-b.x).map(i=>i.s).join('  ')));
  }
  const text=lines.join('\n');
  if(text.replace(/\s/g,'').length<30){ // PDF escaneado → imagens
    throw new Error('Este PDF é uma imagem escaneada, sem texto. Use o relatório em Excel/CSV ou digite os valores.');
    const imgs=[]; for(let p=1;p<=Math.min(pdf.numPages,4);p++){ const pg=await pdf.getPage(p); const vp=pg.getViewport({scale:2}); const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height; await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise; imgs.push(await new Promise(r=>c.toBlob(r,'image/jpeg',.85))); }
    const r=await aiCall(aiPrompt(curDoc(),'O relatório está nas imagens anexadas (PDF escaneado).'),imgs); r.fonte=file.name; return reviewImport(r);
  }
  if(S.sample) return aiFromText(text,file.name);
  const r=parseLines(lines.map(l=>({text:l}))); r.fonte=file.name; reviewImport(r);
}

/* ===================== revisão da importação ===================== */
function reviewImport(r){
  const doc=curDoc(); const dias=diasDoMes(doc.mes);
  let alvo = (r.data && dias.includes(r.data)) ? r.data : S.lancData;
  const dataFora = r.data && !dias.includes(r.data);
  const nV=Object.keys(r.vendas).length, nP=Object.keys(r.perdas||{}).length;
  const m=modal(`<h2>📥 Conferir importação</h2>
  <p class="small muted" style="margin-top:-6px">Fonte: ${esc(r.fonte||'')} · ${nV} setor(es) com venda${nP?` · ${nP} com perda`:''}</p>
  ${r.obs?`<div class="note small" style="margin-bottom:10px">${esc(r.obs)}</div>`:''}
  ${dataFora?`<div class="note err small" style="margin-bottom:10px">A data do relatório (${esc(r.data)}) não é deste mês. Escolha o dia correto abaixo.</div>`:''}
  ${!nV&&!nP?`<div class="note err" style="margin-bottom:10px">Nenhum valor de setor foi encontrado. ${S.sample?'Tente pela foto/IA ou ':''}digite manualmente.</div>`:''}
  <div class="row" style="margin-bottom:10px"><label class="f">Lançar no dia<select id="rDia">${dias.map(k=>`<option value="${k}" ${k===alvo?'selected':''}>${fDateL(k)}${temVenda(doc.dias?.[k])?' • já tem dados':''}</option>`).join('')}</select></label>
  <label class="small" style="display:flex;gap:6px;align-items:center;margin-top:18px"><input type="checkbox" id="rKeep" checked> manter setores que não vieram no relatório</label></div>
  <div class="tw" style="max-height:52vh"><table><thead><tr><th>Setor</th><th class="n">Atual</th><th class="n" style="width:160px">Importado</th><th class="n" style="width:140px">Perda</th></tr></thead>
  <tbody id="rBody"></tbody><tfoot><tr><td>Total</td><td class="n" id="rTA"></td><td class="n" id="rTI"></td><td class="n" id="rTP"></td></tr></tfoot></table></div>
  ${r.totalRel?`<p class="small muted">Total informado no relatório: <b>${brl(r.totalRel)}</b></p>`:''}
  <div class="row" style="margin-top:12px"><div class="sp"></div><button class="btn" id="mN">Cancelar</button><button class="btn p" id="mY">✔ Aplicar e salvar</button></div>`);
  const draw=()=>{
    const k=$('#rDia',m).value; const d=doc.dias?.[k]||{};
    $('#rBody',m).innerHTML = doc.setores.map(s=>{ const a=d.vendas?.[s.id]; const v=r.vendas[s.id]; const p=r.perdas?.[s.id]; const warn=(r.avisos||[]).includes(s.id);
      return `<tr><td><b>${esc(s.nome)}</b>${warn?' <span class="badge b-warn">conferir</span>':''}</td><td class="n muted">${a!=null?brl(a):'—'}</td><td><input class="in ${v!=null?'chg':''}" data-i="${s.id}" value="${v!=null?nf(v):''}" placeholder="—"></td><td><input class="in" data-pp="${s.id}" value="${p!=null?nf(p):''}" placeholder="—"></td></tr>`; }).join('');
    const tot=()=>{ let ti=0,tp=0; m.querySelectorAll('[data-i]').forEach(i=>ti+=parseNum(i.value)||0); m.querySelectorAll('[data-pp]').forEach(i=>tp+=parseNum(i.value)||0); $('#rTI',m).textContent=brl(ti); $('#rTP',m).textContent=tp?brl(tp):'—'; $('#rTA',m).textContent=brl(d.vendas?sum(Object.values(d.vendas)):0); };
    m.querySelectorAll('input.in').forEach(i=>i.oninput=tot); tot();
  };
  $('#rDia',m).onchange=draw; draw();
  $('#mN',m).onclick=closeModal;
  $('#mY',m).onclick=()=>{
    const k=$('#rDia',m).value; const keep=$('#rKeep',m).checked;
    const nd=clone(doc); const day=nd.dias[k]=nd.dias[k]||{meta:0};
    const vendas = keep? {...(day.vendas||{})} : {}; const perdas = keep? {...(day.perdas||{})} : {};
    m.querySelectorAll('[data-i]').forEach(i=>{ if(i.value.trim()!==''){ const v=parseNum(i.value); if(!isNaN(v)) vendas[i.dataset.i]=round2(v);} });
    m.querySelectorAll('[data-pp]').forEach(i=>{ if(i.value.trim()!==''){ const v=parseNum(i.value); if(!isNaN(v)&&v) perdas[i.dataset.pp]=round2(v);} });
    if(Object.keys(vendas).length) { day.vendas=vendas; delete day.total; } if(Object.keys(perdas).length) day.perdas=perdas;
    closeModal(); S.lancData=k; S.cutoff=null;
    saveDoc(nd, `Importado para ${fDate(k)} ✔`);
  };
}

/* ===================== METAS ===================== */
function renderMetas(app, doc){
  const host = doc? app : app.appendChild(document.createElement('div'));
  if(!doc){ host.innerHTML = novoMesCard(null)+cardImportarPlanilhas(); bindNovoMes(host,null); bindImportarPlanilhas(host); return; }
  const dias=diasDoMes(doc.mes);
  const somaDias=sum(dias.map(k=>+(doc.dias?.[k]?.meta)||0)); const somaSet=sum(doc.setores.map(s=>+s.meta||0));
  const di=doc.diarias||{orcamento:0,lancamentos:[]};
  host.innerHTML = `
  <h1>Metas — ${mesLabel(doc.mes)}</h1><p class="sub">Defina a meta da loja, quanto cada setor representa e a meta de cada dia. A meta diária de cada setor é calculada automaticamente: meta do dia × representação do setor.</p>
  <div class="grid two">
    <div class="card">
      <h2>Meta da loja e dos setores</h2>
      <label class="f" style="max-width:260px">Meta do mês (loja)<input class="in" id="mLoja" value="${nf(doc.metaLoja,0)}"></label>
      <div class="tw" style="margin-top:12px"><table><thead><tr><th>Setor</th><th class="n" style="width:160px">Meta mês (R$)</th><th class="n" style="width:110px">Repr. %</th></tr></thead>
      <tbody>${doc.setores.map((s,i)=>`<tr><td><input value="${esc(s.nome)}" data-nome="${i}" style="border:0;font-weight:700;width:100%;background:transparent"></td><td><input class="in" data-sm="${i}" value="${nf(s.meta,0)}"></td><td><input class="in" data-sp="${i}" value="${nf((s.meta/(doc.metaLoja||1))*100,2)}"></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Soma</td><td class="n" id="mSS">${brl0(somaSet)}</td><td class="n" id="mSP">${pct(somaSet/(doc.metaLoja||1),2)}</td></tr></tfoot></table></div>
      <p class="small muted">Altere o valor em R$ ou o %, o outro é recalculado. A soma deve dar 100%.</p>
      <div class="row"><div class="sp"></div><button class="btn p" id="mSaveSet">Salvar metas dos setores</button></div>
    </div>
    <div class="card">
      <h2>Meta de cada dia</h2>
      <div class="tw" style="max-height:560px"><table><thead><tr><th>Dia</th><th class="n" style="width:150px">Meta (R$)</th><th class="n">Peso</th></tr></thead>
      <tbody>${dias.map(k=>`<tr><td>${fDateL(k)}</td><td><input class="in" data-dm="${k}" value="${nf(+(doc.dias?.[k]?.meta)||0,0)}"></td><td class="n muted" data-dp="${k}">${pct((+(doc.dias?.[k]?.meta)||0)/(somaDias||1),1)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Soma</td><td class="n" id="mSD">${brl0(somaDias)}</td><td></td></tr></tfoot></table></div>
      <div class="row" style="margin-top:10px"><button class="btn" id="mAjust" title="Mantém o peso de cada dia e ajusta para fechar a meta do mês">Ajustar à meta do mês</button><div class="sp"></div><button class="btn p" id="mSaveDias">Salvar metas diárias</button></div>
    </div>
  </div>
  <div class="grid two" style="margin-top:12px">
    <div class="card"><h2>Diárias</h2>
      <label class="f" style="max-width:220px">Orçamento do mês<input class="in" id="dOrc" value="${nf(di.orcamento,0)}"></label>
      <div class="tw" style="margin-top:10px"><table><thead><tr><th>Data</th><th class="n">Valor</th><th></th></tr></thead><tbody>${(di.lancamentos||[]).map((l,i)=>`<tr><td>${fDateL(l.data)}</td><td class="n">${brl(l.valor)}</td><td style="width:40px"><button class="btn" data-dx="${i}" style="padding:4px 8px">✕</button></td></tr>`).join('')||'<tr><td colspan="3" class="muted">Nenhum lançamento</td></tr>'}</tbody></table></div>
      <div class="row" style="margin-top:10px"><label class="f">Data<input type="date" id="dData" value="${dias.includes(todayIso())?todayIso():dias[0]}" min="${dias[0]}" max="${dias[dias.length-1]}"></label><label class="f" style="width:140px">Valor<input class="in" id="dVal" placeholder="0,00"></label><button class="btn" id="dAdd" style="margin-top:18px">＋ Adicionar</button><div class="sp"></div><button class="btn p" id="dSave" style="margin-top:18px">Salvar</button></div>
    </div>
    ${novoMesCard(doc)}
  </div>
  ${cardImportarPlanilhas()}`;
  // setores
  const recalcSet=()=>{ const ml=parseNum($('#mLoja',host).value)||0; let s=0; host.querySelectorAll('[data-sm]').forEach(i=>s+=parseNum(i.value)||0); $('#mSS',host).textContent=brl0(s); $('#mSP',host).textContent=pct(s/(ml||1),2); $('#mSP',host).style.color=Math.abs(s-ml)>1?'var(--bad)':''; };
  host.querySelectorAll('[data-sm]').forEach(i=>i.oninput=()=>{ const ml=parseNum($('#mLoja',host).value)||1; host.querySelector(`[data-sp="${i.dataset.sm}"]`).value=nf((parseNum(i.value)||0)/ml*100,2); recalcSet(); });
  host.querySelectorAll('[data-sp]').forEach(i=>i.oninput=()=>{ const ml=parseNum($('#mLoja',host).value)||0; host.querySelector(`[data-sm="${i.dataset.sp}"]`).value=nf(Math.round((parseNum(i.value)||0)/100*ml),0); recalcSet(); });
  $('#mLoja',host).oninput=()=>{ const ml=parseNum($('#mLoja',host).value)||0; host.querySelectorAll('[data-sp]').forEach(i=>{ host.querySelector(`[data-sm="${i.dataset.sp}"]`).value=nf(Math.round((parseNum(i.value)||0)/100*ml),0); }); recalcSet(); };
  $('#mSaveSet',host).onclick=()=>{ const nd=clone(doc); nd.metaLoja=parseNum($('#mLoja',host).value)||0; nd.setores.forEach((s,i)=>{ s.meta=parseNum(host.querySelector(`[data-sm="${i}"]`).value)||0; s.nome=host.querySelector(`[data-nome="${i}"]`).value.trim()||s.nome; }); saveDoc(nd,'Metas dos setores salvas ✔'); };
  // dias
  const recalcD=()=>{ let s=0; host.querySelectorAll('[data-dm]').forEach(i=>s+=parseNum(i.value)||0); $('#mSD',host).textContent=brl0(s); $('#mSD',host).style.color=Math.abs(s-(parseNum($('#mLoja',host).value)||0))>1?'var(--bad)':''; host.querySelectorAll('[data-dm]').forEach(i=>host.querySelector(`[data-dp="${i.dataset.dm}"]`).textContent=pct((parseNum(i.value)||0)/(s||1),1)); };
  host.querySelectorAll('[data-dm]').forEach(i=>i.oninput=recalcD); recalcD();
  $('#mAjust',host).onclick=()=>{ const ml=parseNum($('#mLoja',host).value)||0; let s=0; host.querySelectorAll('[data-dm]').forEach(i=>s+=parseNum(i.value)||0); if(!s) return; let acc=0; const ins=[...host.querySelectorAll('[data-dm]')]; ins.forEach((i,ix)=>{ let v=Math.round((parseNum(i.value)||0)/s*ml/100)*100; if(ix===ins.length-1) v=ml-acc; acc+=v; i.value=nf(v,0); }); recalcD(); };
  $('#mSaveDias',host).onclick=()=>{ const nd=clone(doc); host.querySelectorAll('[data-dm]').forEach(i=>{ const k=i.dataset.dm; nd.dias[k]=nd.dias[k]||{}; nd.dias[k].meta=parseNum(i.value)||0; }); saveDoc(nd,'Metas diárias salvas ✔'); };
  // diárias
  let lanc=[...(di.lancamentos||[])];
  host.querySelectorAll('[data-dx]').forEach(b=>b.onclick=()=>{ const nd=clone(doc); nd.diarias=nd.diarias||{orcamento:0,lancamentos:[]}; nd.diarias.lancamentos.splice(+b.dataset.dx,1); saveDoc(nd,'Lançamento removido'); });
  $('#dAdd',host).onclick=()=>{ const v=parseNum($('#dVal',host).value); const dt=$('#dData',host).value; if(!v||!dt) return toast('Informe data e valor'); const nd=clone(doc); nd.diarias=nd.diarias||{orcamento:0,lancamentos:[]}; nd.diarias.orcamento=parseNum($('#dOrc',host).value)||0; nd.diarias.lancamentos.push({data:dt,valor:round2(v)}); nd.diarias.lancamentos.sort((a,b)=>a.data.localeCompare(b.data)); saveDoc(nd,'Diária lançada ✔'); };
  $('#dSave',host).onclick=()=>{ const nd=clone(doc); nd.diarias=nd.diarias||{orcamento:0,lancamentos:[]}; nd.diarias.orcamento=parseNum($('#dOrc',host).value)||0; saveDoc(nd,'Orçamento salvo ✔'); };
  bindNovoMes(host,doc); bindImportarPlanilhas(host);
}
function novoMesCard(doc){
  const prox = doc? (()=>{ const [y,m]=doc.mes.split('-').map(Number); const d=new Date(y,m,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })() : todayIso().slice(0,7);
  return `<div class="card"><h2>Criar novo mês</h2>
    <p class="small muted">Copia os setores e a representação de ${doc?mesLabel(doc.mes):'um modelo padrão'} e distribui a meta pelos dias com o mesmo peso de cada dia da semana.</p>
    <div class="row"><label class="f">Mês<input type="month" id="nMes" value="${prox}"></label><label class="f" style="width:180px">Meta da loja<input class="in" id="nMeta" placeholder="ex.: 2.500.000" value="${doc?nf(doc.metaLoja,0):''}"></label><button class="btn p" id="nCriar" style="margin-top:18px">Criar mês</button></div>
    </div>`;
}
function bindNovoMes(host, doc){
  const b=$('#nCriar',host); if(!b) return;
  b.onclick=()=>{
    const mes=$('#nMes',host).value; const meta=parseNum($('#nMeta',host).value);
    if(!/^\d{4}-\d{2}$/.test(mes)||!meta) return toast('Informe mês e meta.');
    const go=()=>{
      const base = doc || {metaLoja:1, setores:S.setoresAll.map(x=>({id:x.id,nome:x.nome,meta:1/S.setoresAll.length})), dias:{}};
      const setores = base.setores.map(s=>({id:s.id,nome:s.nome,meta:Math.round(meta*(s.meta/(base.metaLoja||1)))}));
      const dif = meta - sum(setores.map(s=>s.meta)); setores.sort((a,b)=>b.meta-a.meta)[0].meta += dif; setores.sort((a,b)=>base.setores.findIndex(x=>x.id===a.id)-base.setores.findIndex(x=>x.id===b.id));
      // peso por dia da semana (do mês base)
      const w=[0,0,0,0,0,0,0], c=[0,0,0,0,0,0,0];
      for(const [k,d] of Object.entries(base.dias||{})){ if(!d.meta) continue; const wd=pDate(k).getDay(); w[wd]+=d.meta; c[wd]++; }
      const avg=w.map((x,i)=>c[i]?x/c[i]:1);
      const ds=diasDoMes(mes); const pesos=ds.map(k=>avg[pDate(k).getDay()]); const tp=sum(pesos);
      const dias={}; let acc=0; ds.forEach((k,i)=>{ let v=Math.round(pesos[i]/tp*meta/1000)*1000; if(i===ds.length-1) v=meta-acc; acc+=v; dias[k]={meta:v}; });
      const nd={mes, metaLoja:meta, setores, dias, diarias:{orcamento:doc?.diarias?.orcamento||0, lancamentos:[]}};
      S.mes=mes; S.cutoff=null; S.lancData=null; saveDoc(nd, `${mesLabel(mes)} criado ✔ — revise as metas diárias`, {soMetas:true});
    };
    if(S.mesList.includes(mes)) confirmBox(`${mesLabel(mes)} já existe. Substituir as metas desse mês? (Os lançamentos de vendas são mantidos.)`, go); else go();
  };
}

/* ===================== exportar Excel ===================== */
async function exportXlsx(doc){
  if(!window.XLSX) return toast('Leitor de Excel não carregou.');
  const {loja,setores,dias}=calc(doc,S.cutoff);
  const wb=XLSX.utils.book_new();
  const res=[['Setor','Representação','Meta mês','Meta até '+fDate(S.cutoff),'Realizado','% até data','% mês','Falta','Precisa/dia','Perda','% perda']];
  setores.forEach(s=>res.push([s.nome,round2(s.share*100)/100,s.meta,round2(s.metaAte),round2(s.real),s.pAte!=null?Math.round(s.pAte*10000)/10000:null,Math.round(s.pMes*10000)/10000,round2(s.falta),round2(s.necDia),round2(s.perda),s.pPerda!=null?Math.round(s.pPerda*10000)/10000:null]));
  res.push([S.gerente?'LOJA':'TOTAL',1,loja.metaMes,round2(loja.metaAte),round2(loja.real),Math.round(loja.pAte*10000)/10000,Math.round(loja.pMes*10000)/10000,round2(loja.falta),round2(loja.necDia),round2(loja.perda),loja.pPerda]);
  const ws1=XLSX.utils.aoa_to_sheet(res); ws1['!cols']=[{wch:24},...Array(10).fill({wch:14})]; XLSX.utils.book_append_sheet(wb,ws1,'Resumo');
  const hv=['Dia','Meta loja','Realizado loja',...doc.setores.map(s=>s.nome)];
  const rv=[hv,...dias.map(k=>{const d=doc.dias?.[k]||{}; return [fDate(k),d.meta||0,round2(vendaDia(d)),...doc.setores.map(s=>d.vendas?.[s.id]??null)];})];
  const ws2=XLSX.utils.aoa_to_sheet(rv); ws2['!cols']=hv.map(()=>({wch:14})); XLSX.utils.book_append_sheet(wb,ws2,'Vendas diárias');
  const rp=[['Dia',...doc.setores.map(s=>s.nome)],...dias.map(k=>{const d=doc.dias?.[k]||{}; return [fDate(k),...doc.setores.map(s=>d.perdas?.[s.id]??null)];})];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rp),'Perdas');
  const rm=[['Dia','Meta loja',...doc.setores.map(s=>s.nome)],...dias.map(k=>{const m=+(doc.dias?.[k]?.meta)||0; return [fDate(k),m,...doc.setores.map(s=>round2(m*s.meta/(doc.metaLoja||1)))];})];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rm),'Metas diárias');
  const buf=XLSX.write(wb,{type:'array',bookType:'xlsx'});
  const url=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); const a=document.createElement('a'); a.href=url; a.download=`Metas_${doc.mes}${S.gerente?'':'_meus_setores'}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
}

/* ===================== Supabase: leitura ===================== */
const pad2 = n => String(n).padStart(2,'0');
function fimDoMes(m){ const ds=diasDoMes(m); return ds[ds.length-1]; }
async function q(promise){ const { data, error } = await promise; if(error) throw error; return data; }
async function todasLinhas(builder){ // paginação (o Supabase devolve no máximo 1000 linhas por vez)
  const out=[]; for(let i=0;;i+=1000){ const d=await q(builder().range(i,i+999)); out.push(...d); if(d.length<1000) break; } return out;
}
function nomeSetor(id){ return S.setoresAll.find(x=>x.id===id)?.nome || id; }
function ordemSetor(id){ const i=S.setoresAll.findIndex(x=>x.id===id); return i<0?99:i; }

async function carregarListaMeses(){
  if(S.gerente){ const d=await q(S.sb.from('meses').select('mes').order('mes')); S.mesList=d.map(r=>r.mes); }
  else { const d=await q(S.sb.from('metas_setor').select('mes')); S.mesList=[...new Set(d.map(r=>r.mes))].sort(); }
}
function montarDoc(mes, metaLoja, orc, metas, diasRows, lanc, diarias, metasDiaSetor){
  const setores=metas.map(m=>({id:m.setor_id,nome:nomeSetor(m.setor_id),meta:+m.meta})).sort((a,b)=>ordemSetor(a.id)-ordemSetor(b.id));
  const dias={}; diasDoMes(mes).forEach(k=>dias[k]={meta:0});
  if(diasRows) diasRows.forEach(r=>{ const k=r.data; if(!dias[k]) return; dias[k].meta=+r.meta||0; if(r.total_caixa!=null) dias[k].total=+r.total_caixa; });
  if(metasDiaSetor) metasDiaSetor.forEach(r=>{ if(dias[r.data]) dias[r.data].meta=round2((dias[r.data].meta||0)+(+r.meta||0)); });
  lanc.forEach(r=>{ const d=dias[r.data]; if(!d) return; if(r.venda!=null) (d.vendas=d.vendas||{})[r.setor_id]=+r.venda; if(r.perda!=null&&+r.perda) (d.perdas=d.perdas||{})[r.setor_id]=+r.perda; });
  const doc={mes, metaLoja: metaLoja!=null? +metaLoja : sum(setores.map(x=>x.meta)), setores, dias};
  if(diarias) doc.diarias={orcamento:+orc||0, lancamentos:diarias.map(r=>({id:r.id,data:r.data,valor:+r.valor})).sort((a,b)=>a.data.localeCompare(b.data))};
  return doc;
}
async function carregarMes(mes){
  const ini=`${mes}-01`, fim=fimDoMes(mes);
  const lanc=await q(S.sb.from('lancamentos').select('data,setor_id,venda,perda').gte('data',ini).lte('data',fim));
  const metas=await q(S.sb.from('metas_setor').select('setor_id,meta').eq('mes',mes));
  let doc;
  if(S.gerente){
    const m=(await q(S.sb.from('meses').select('*').eq('mes',mes)))[0]||{};
    const diasRows=await q(S.sb.from('dias').select('data,meta,total_caixa').eq('mes',mes));
    const diar=await q(S.sb.from('diarias').select('id,data,valor').eq('mes',mes));
    doc=montarDoc(mes, m.meta_loja, m.diarias_orcamento, metas, diasRows, lanc, diar, null);
  } else {
    const mds=await q(S.sb.rpc('metas_diarias_setor',{p_mes:mes}));
    doc=montarDoc(mes, null, 0, metas, null, lanc, null, mds);
  }
  S.months[mes]=doc; return doc;
}
async function garantirMes(mes){ if(!S.months[mes] && S.mesList.includes(mes)) await carregarMes(mes); return S.months[mes]; }
async function carregarTudo(){ // para o histórico
  if(S._tudo) return; 
  if(S.gerente){
    const meses=await q(S.sb.from('meses').select('*'));
    const metas=await todasLinhas(()=>S.sb.from('metas_setor').select('mes,setor_id,meta').order('mes').order('setor_id'));
    const dias=await todasLinhas(()=>S.sb.from('dias').select('data,mes,meta,total_caixa').order('data'));
    const lanc=await todasLinhas(()=>S.sb.from('lancamentos').select('data,setor_id,venda,perda').order('data').order('setor_id'));
    const diar=await todasLinhas(()=>S.sb.from('diarias').select('id,mes,data,valor').order('id'));
    for(const m of meses){ const mes=m.mes, ini=`${mes}-01`, fim=fimDoMes(mes);
      S.months[mes]=montarDoc(mes,m.meta_loja,m.diarias_orcamento,metas.filter(x=>x.mes===mes),dias.filter(x=>x.mes===mes),lanc.filter(x=>x.data>=ini&&x.data<=fim),diar.filter(x=>x.mes===mes),null); }
  } else { for(const m of S.mesList) if(!S.months[m]) await carregarMes(m); }
  S._tudo=true;
}
async function renderHistoricoAsync(app){
  if(!S._tudo){ app.innerHTML='<div class="empty"><span class="spin"></span> Carregando o histórico…</div>'; try{ await carregarTudo(); }catch(e){ app.innerHTML=`<div class="note err">Erro ao carregar: ${esc(e.message)}</div>`; return; } if(S.view!=='historico') return; }
  renderHistorico(app);
}

/* ===================== Supabase: gravação (compara com o que já estava salvo) ===================== */
function eqNum(a,b){ return (a==null&&b==null) || (a!=null&&b!=null&&Math.abs(a-b)<0.005); }
async function gravarDoc(nd, old, opts={}){
  const mes=nd.mes; const meus=new Set(nd.setores.map(x=>x.id));
  if(S.gerente){
    await q(S.sb.from('meses').upsert({mes, meta_loja:nd.metaLoja||0, diarias_orcamento:nd.diarias?.orcamento||0, atualizado_em:new Date().toISOString()}));
    const setoresMudaram = !old || JSON.stringify(old.setores.map(x=>[x.id,x.meta]))!==JSON.stringify(nd.setores.map(x=>[x.id,x.meta]));
    if(setoresMudaram){
      await q(S.sb.from('metas_setor').upsert(nd.setores.map(x=>({mes, setor_id:x.id, meta:x.meta||0}))));
      const sai = (old?.setores||[]).filter(x=>!meus.has(x.id)).map(x=>x.id);
      if(sai.length) await q(S.sb.from('metas_setor').delete().eq('mes',mes).in('setor_id',sai));
      // nomes dos setores
      for(const x of nd.setores){ const a=S.setoresAll.find(y=>y.id===x.id); if(a && x.nome && x.nome!==a.nome){ await q(S.sb.from('setores').update({nome:x.nome}).eq('id',x.id)); a.nome=x.nome; } }
    }
    const diasUp=[]; for(const k of diasDoMes(mes)){ const n=nd.dias[k]||{}, o=old?.dias?.[k]||{};
      if(!old || !eqNum(+n.meta||0,+o.meta||0) || (!opts.soMetas && !eqNum(n.total??null,o.total??null)))
        diasUp.push(opts.soMetas && old ? {data:k, mes, meta:+n.meta||0} : {data:k, mes, meta:+n.meta||0, total_caixa:n.total??null}); }
    if(diasUp.length) await q(S.sb.from('dias').upsert(diasUp));
    if(!opts.soMetas && JSON.stringify((old?.diarias?.lancamentos||[]).map(l=>[l.data,l.valor]))!==JSON.stringify((nd.diarias?.lancamentos||[]).map(l=>[l.data,l.valor]))){
      await q(S.sb.from('diarias').delete().eq('mes',mes));
      const ls=(nd.diarias?.lancamentos||[]).map(l=>({mes,data:l.data,valor:l.valor})); if(ls.length) await q(S.sb.from('diarias').insert(ls));
    }
  }
  if(opts.soMetas) return;
  const up=[], del=[];
  for(const k of diasDoMes(mes)){ const n=nd.dias[k]||{}, o=old?.dias?.[k]||{};
    for(const id of meus){ const nv=n.vendas?.[id]??null, np=n.perdas?.[id]??null, ov=o.vendas?.[id]??null, op=o.perdas?.[id]??null;
      if(eqNum(nv,ov)&&eqNum(np,op)) continue;
      if(nv==null&&np==null) del.push({k,id}); else up.push({data:k, setor_id:id, venda:nv, perda:np}); } }
  for(let i=0;i<up.length;i+=500) await q(S.sb.from('lancamentos').upsert(up.slice(i,i+500)));
  const porDia={}; del.forEach(x=>(porDia[x.k]=porDia[x.k]||[]).push(x.id));
  for(const [k,ids] of Object.entries(porDia)) await q(S.sb.from('lancamentos').delete().eq('data',k).in('setor_id',ids));
}
function saveDoc(nd, msg, opts={}){
  const old = S.months[nd.mes] ? clone(S.months[nd.mes]) : null;
  S.months[nd.mes]=nd; if(!S.mesList.includes(nd.mes)){ S.mesList.push(nd.mes); S.mesList.sort(); } S._tudo=false; render();
  S.writeChain = S.writeChain.then(async()=>{
    try{ await gravarDoc(nd, old, opts); await carregarMes(nd.mes); if(msg) toast(msg); render(); return true; }
    catch(e){ console.error(e); toast('Não foi possível salvar: '+(e.message||e)+'. Os dados foram recarregados.',6000); try{ await carregarListaMeses(); await carregarMes(nd.mes); }catch(_){} render(); return false; }
  });
  return S.writeChain;
}

/* ===================== importar planilhas mensais (gerente) ===================== */
async function importarMesCompleto(d){
  const mes=d.mes, ini=`${mes}-01`, fim=fimDoMes(mes);
  await q(S.sb.from('meses').upsert({mes, meta_loja:d.metaLoja, diarias_orcamento:d.diarias?.orcamento||0, atualizado_em:new Date().toISOString()}));
  await q(S.sb.from('metas_setor').delete().eq('mes',mes));
  if(d.setores.length) await q(S.sb.from('metas_setor').insert(d.setores.map(x=>({mes,setor_id:x.id,meta:x.meta}))));
  await q(S.sb.from('dias').upsert(Object.entries(d.dias).map(([k,v])=>({data:k,mes,meta:v.meta||0,total_caixa:v.total??null}))));
  await q(S.sb.from('lancamentos').delete().gte('data',ini).lte('data',fim));
  const rows=[]; for(const [k,v] of Object.entries(d.dias)){ const ids=new Set([...Object.keys(v.vendas||{}),...Object.keys(v.perdas||{})]); for(const id of ids) rows.push({data:k,setor_id:id,venda:v.vendas?.[id]??null,perda:v.perdas?.[id]??null}); }
  for(let i=0;i<rows.length;i+=500) await q(S.sb.from('lancamentos').insert(rows.slice(i,i+500)));
  await q(S.sb.from('diarias').delete().eq('mes',mes));
  const ls=(d.diarias?.lancamentos||[]).map(l=>({mes,data:l.data,valor:l.valor})); if(ls.length) await q(S.sb.from('diarias').insert(ls));
}
async function importarPlanilhas(files){
  if(!window.XLSX) return toast('Leitor de Excel não carregou. Verifique a internet.');
  files=files.filter(f=>/\.xls[xm]?$/i.test(f.name) && !f.name.startsWith('~$'));
  if(!files.length) return toast('Escolha arquivos .xlsx');
  busy(`Lendo ${files.length} planilha(s)…`);
  const lidos=[], erros=[];
  for(const f of files){ try{ const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true}); const d=Parser.parseModelo(wb,f.name); d.arquivo=f.name; lidos.push(d); }catch(e){ erros.push(`${f.name}: ${e.message}`); } }
  dialogoImportacao(lidos, erros);
}
function dialogoImportacao(lidos, erros){
  lidos.sort((a,b)=>a.mes.localeCompare(b.mes));
  const dup = lidos.filter((d,i)=>lidos.findIndex(x=>x.mes===d.mes)!==i);
  const m=modal(`<h2>📗 Importar planilhas mensais</h2>
   <p class="small muted">${lidos.length} mês(es) lidos${erros.length?` · ${erros.length} com erro`:''}. Meses que já existem no site serão <b>substituídos</b> pelos dados da planilha.</p>
   ${erros.length?`<div class="note err small" style="margin-bottom:8px">${erros.map(esc).join('<br>')}</div>`:''}
   ${dup.length?`<div class="note small" style="margin-bottom:8px">Arquivos repetidos para o mesmo mês: ${dup.map(d=>esc(d.arquivo)).join(', ')} — vale o último.</div>`:''}
   <div class="tw" style="max-height:46vh"><table><thead><tr><th>Mês</th><th>Arquivo</th><th class="n">Meta</th><th class="n">Setores</th><th class="n">Dias c/ venda</th><th>No site</th></tr></thead><tbody>
   ${lidos.map(d=>`<tr><td><b>${mesLabel(d.mes)}</b></td><td class="small">${esc(d.arquivo)}</td><td class="n">${brl0(d.metaLoja)}</td><td class="n">${d.setores.length}</td><td class="n">${Object.values(d.dias).filter(x=>x.vendas||x.total).length}</td><td>${S.mesList.includes(d.mes)?'<span class="badge b-warn">substituir</span>':'<span class="badge b-good">novo</span>'}</td></tr>`).join('')}
   </tbody></table></div>
   <div id="impProg" class="hide" style="margin-top:12px"><div class="prog"><i style="width:0%"></i></div><p class="small" id="impTxt"></p></div>
   <div class="row" style="margin-top:12px" id="impBtns"><div class="sp"></div><button class="btn" id="mN">Cancelar</button><button class="btn p" id="mY" ${lidos.length?'':'disabled'}>Importar ${lidos.length} mês(es)</button></div>`);
  $('#mN',m).onclick=closeModal;
  $('#mY',m).onclick=async()=>{
    $('#impBtns',m).classList.add('hide'); $('#impProg',m).classList.remove('hide');
    const unicos={}; lidos.forEach(d=>unicos[d.mes]=d); const lista=Object.values(unicos); let ok=0;
    for(const d of lista){ $('#impTxt',m).textContent=`Gravando ${mesLabel(d.mes)}… (${ok+1}/${lista.length})`; $('.prog i',m).style.width=(ok/lista.length*100)+'%';
      try{ await importarMesCompleto(d); ok++; }catch(e){ console.error(e); $('#impTxt',m).innerHTML=`<span style="color:var(--bad)">Parou em ${mesLabel(d.mes)}: ${esc(e.message)}</span> · ${ok} importado(s).`; $('#impBtns',m).classList.remove('hide'); $('#mY',m).classList.add('hide'); $('#mN',m).textContent='Fechar'; S.months={}; S._tudo=false; await carregarListaMeses(); return; } }
    $('.prog i',m).style.width='100%'; $('#impTxt',m).textContent=`${ok} mês(es) importado(s) ✔`;
    S.months={}; S._tudo=false; await carregarListaMeses(); const cur=todayIso().slice(0,7); S.mes=S.mesList.includes(cur)?cur:S.mesList[S.mesList.length-1]; await garantirMes(S.mes);
    setTimeout(()=>{ closeModal(); render(); toast(`${ok} mês(es) importado(s) ✔`); },700);
  };
}
function modeloDialog(wb, nome){
  if(!S.gerente) return toast('Só o gerente pode importar a planilha mensal.');
  try{ const d=Parser.parseModelo(wb,nome); d.arquivo=nome; dialogoImportacao([d],[]); }catch(e){ toast(e.message,5000); }
}
function cardImportarPlanilhas(){
  return `<div class="card" style="margin-top:12px"><h2>Importar planilhas mensais (Excel)</h2>
   <p class="small muted">Selecione uma ou várias planilhas no modelo antigo (abas META DIARIA, PERCA-VENDA SETORES e Planilha1…31) — por exemplo, todos os arquivos da pasta <b>Documentos › Gustavo › Metas</b>. O site lê metas, vendas por setor, perdas, total do caixa e diárias.</p>
   <div class="drop" id="dropPl"><div class="ico">📗</div><h3>Arraste as planilhas aqui</h3><p>ou</p><div style="margin-top:8px"><button class="btn y" id="bPl">Escolher planilhas</button></div><input type="file" id="fPl" accept=".xlsx,.xlsm,.xls" multiple class="hide"></div></div>`;
}
function bindImportarPlanilhas(host){
  const b=$('#bPl',host); if(!b) return; const f=$('#fPl',host), z=$('#dropPl',host);
  b.onclick=()=>f.click(); f.onchange=()=>{ const fs=[...f.files]; f.value=''; importarPlanilhas(fs); };
  z.ondragover=e=>{e.preventDefault();z.classList.add('over');}; z.ondragleave=()=>z.classList.remove('over');
  z.ondrop=e=>{e.preventDefault();z.classList.remove('over'); importarPlanilhas([...e.dataTransfer.files]); };
}

/* ===================== USUÁRIOS (gerente) ===================== */
async function chamarUsuarios(body){
  const { data, error } = await S.sb.functions.invoke('usuarios',{ body });
  if(error){ let msg=error.message; try{ const j=await error.context.json(); if(j?.erro) msg=j.erro; }catch(_){} throw new Error(msg); }
  if(data?.erro) throw new Error(data.erro); return data;
}
async function renderUsuarios(app){
  app.innerHTML='<div class="empty"><span class="spin"></span> Carregando usuários…</div>';
  let us=[]; try{ us=(await chamarUsuarios({acao:'listar'})).usuarios; }catch(e){ app.innerHTML=`<div class="note err">${esc(e.message)}</div>`; return; }
  if(S.view!=='usuarios') return;
  const nomeSet = ids => ids.map(nomeSetor).join(', ');
  app.innerHTML=`<div class="row" style="align-items:flex-end;margin-bottom:14px"><div><h1>Usuários</h1><p class="sub" style="margin:0">Cada encarregado vê e lança apenas os setores marcados. Só o gerente vê a loja inteira e mexe nas metas.</p></div><div class="sp"></div><button class="btn p" id="uNovo">＋ Novo usuário</button></div>
  <div class="card"><div class="tw"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Acesso</th><th>Setores</th><th>Último acesso</th><th></th></tr></thead><tbody>
  ${us.map(u=>`<tr><td><b>${esc(u.nome||'—')}</b>${u.id===S.user.id?' <span class="badge b-none">você</span>':''}</td><td class="small">${esc(u.email)}</td><td>${u.papel==='gerente'?'<span class="badge b-good">Gerente</span>':'<span class="badge b-none">Encarregado</span>'}</td><td class="small">${u.papel==='gerente'?'Todos':esc(nomeSet(u.setores||[]))}</td><td class="small muted">${u.ultimo_acesso?new Date(u.ultimo_acesso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'nunca entrou'}</td><td style="white-space:nowrap"><button class="btn" data-ed="${u.id}" style="padding:4px 10px">Editar</button></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="note small" style="margin-top:12px">Para mandar o acesso: passe ao encarregado o endereço deste site, o e-mail e a senha inicial. Ele pode trocar a senha em “Minha conta”.</div>`;
  $('#uNovo').onclick=()=>formUsuario(null);
  app.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>formUsuario(us.find(u=>u.id===b.dataset.ed)));
}
function formUsuario(u){
  const novo=!u; const sel=new Set(u?.setores||[]);
  const m=modal(`<h2>${novo?'Novo usuário':'Editar '+esc(u.nome||u.email)}</h2>
  <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
    <label class="f">Nome<input id="uNome" value="${esc(u?.nome||'')}" placeholder="Ex.: João do Açougue"></label>
    <label class="f">E-mail<input id="uEmail" type="email" value="${esc(u?.email||'')}" ${novo?'':'disabled'} placeholder="email@exemplo.com"></label>
    <label class="f">${novo?'Senha inicial':'Nova senha (deixe vazio para manter)'}<input id="uSenha" type="text" placeholder="mínimo 8 caracteres" value="${novo?gerarSenha():''}"></label>
    <label class="f">Acesso<select id="uPapel"><option value="encarregado" ${u?.papel!=='gerente'?'selected':''}>Encarregado (só os setores marcados)</option><option value="gerente" ${u?.papel==='gerente'?'selected':''}>Gerente (tudo)</option></select></label>
  </div>
  <div id="uSetBox" style="margin-top:12px"><div class="small" style="font-weight:600;color:var(--ink2);margin-bottom:6px">Setores que pode ver e lançar</div>
    <div class="chk">${S.setoresAll.map(x=>`<label><input type="checkbox" value="${x.id}" ${sel.has(x.id)?'checked':''}>${esc(x.nome)}</label>`).join('')}</div></div>
  <div id="uErr" class="note err small hide" style="margin-top:10px"></div>
  <div class="row" style="margin-top:14px">${novo||u.id===S.user.id?'':'<button class="btn" id="uDel" style="color:var(--bad)">Excluir</button>'}<div class="sp"></div><button class="btn" id="mN">Cancelar</button><button class="btn p" id="mY">${novo?'Criar usuário':'Salvar'}</button></div>`);
  const tog=()=>$('#uSetBox',m).classList.toggle('hide',$('#uPapel',m).value==='gerente'); $('#uPapel',m).onchange=tog; tog();
  $('#mN',m).onclick=closeModal;
  const err=t=>{ const e=$('#uErr',m); e.textContent=t; e.classList.remove('hide'); };
  $('#mY',m).onclick=async()=>{
    const body={ acao:novo?'criar':'atualizar', id:u?.id, nome:$('#uNome',m).value.trim(), email:$('#uEmail',m).value.trim(), papel:$('#uPapel',m).value,
      setores:[...m.querySelectorAll('.chk input:checked')].map(i=>i.value) };
    const senha=$('#uSenha',m).value.trim(); if(senha) body.senha=senha;
    $('#mY',m).disabled=true;
    try{ await chamarUsuarios(body); closeModal();
      if(novo) mostrarAcesso(body.nome, body.email, senha); else toast('Usuário salvo ✔');
      if(S.view==='usuarios') renderUsuarios($('#app')); }
    catch(e){ err(e.message); $('#mY',m).disabled=false; }
  };
  const d=$('#uDel',m); if(d) d.onclick=()=>{ closeModal(); confirmBox(`Excluir o acesso de ${u.nome||u.email}? Os lançamentos que ele fez continuam salvos.`, async()=>{ try{ await chamarUsuarios({acao:'excluir',id:u.id}); toast('Usuário excluído'); renderUsuarios($('#app')); }catch(e){ toast(e.message,5000); } }); };
}
function gerarSenha(){ const c='abcdefghjkmnpqrstuvwxyz23456789'; let s=''; const a=new Uint32Array(8); crypto.getRandomValues(a); a.forEach(x=>s+=c[x%c.length]); return 'Bd'+s; }
function mostrarAcesso(nome,email,senha){
  const url=location.href.split('#')[0];
  const txt=`Olá ${nome.split(' ')[0]}! Seu acesso ao painel de metas do Bom Dia São Luiz:\n\n🔗 ${url}\n📧 Usuário: ${email}\n🔑 Senha: ${senha}\n\nNo primeiro acesso, troque a senha em "Minha conta".`;
  const m=modal(`<h2>✔ Usuário criado</h2><p>Mande esta mensagem para <b>${esc(nome)}</b> (WhatsApp, por exemplo):</p>
   <textarea id="aTxt" style="width:100%;height:170px;border:1px solid var(--line);border-radius:10px;padding:10px">${esc(txt)}</textarea>
   <div class="row" style="margin-top:10px"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Abrir no WhatsApp</a><div class="sp"></div><button class="btn" id="aCp">Copiar</button><button class="btn p" id="mN">Fechar</button></div>`);
  $('#mN',m).onclick=closeModal;
  $('#aCp',m).onclick=async()=>{ try{ await navigator.clipboard.writeText(txt); toast('Mensagem copiada'); }catch(e){ $('#aTxt',m).select(); } };
}

/* ===================== conta, login e navegação ===================== */
function minhaConta(){
  const m=modal(`<h2>Minha conta</h2><p class="small muted">${esc(S.perfil.nome||'')} · ${esc(S.user.email)} · ${S.gerente?'Gerente':'Encarregado: '+esc((S.perfil.setores||[]).map(nomeSetor).join(', '))}</p>
   <label class="f">Nova senha<input id="cS1" type="password" placeholder="mínimo 8 caracteres"></label>
   <label class="f" style="margin-top:8px">Repita a nova senha<input id="cS2" type="password"></label>
   <div id="cErr" class="note err small hide" style="margin-top:10px"></div>
   <div class="row" style="margin-top:14px"><button class="btn" id="cSair">Sair</button><div class="sp"></div><button class="btn" id="mN">Fechar</button><button class="btn p" id="mY">Trocar senha</button></div>`);
  $('#mN',m).onclick=closeModal;
  $('#cSair',m).onclick=async()=>{ closeModal(); await S.sb.auth.signOut(); location.hash=''; location.reload(); };
  $('#mY',m).onclick=async()=>{ const a=$('#cS1',m).value, b=$('#cS2',m).value; const e=$('#cErr',m);
    if(a.length<8){ e.textContent='A senha precisa ter pelo menos 8 caracteres.'; e.classList.remove('hide'); return; }
    if(a!==b){ e.textContent='As senhas não conferem.'; e.classList.remove('hide'); return; }
    const { error } = await S.sb.auth.updateUser({ password:a }); if(error){ e.textContent=error.message; e.classList.remove('hide'); return; }
    closeModal(); toast('Senha alterada ✔'); };
}
const VIEWS_G=[['painel','Painel'],['setor','Setores'],['lancar','Lançar vendas'],['metas','Metas do mês'],['historico','Histórico'],['usuarios','Usuários']];
const VIEWS_E=[['painel','Painel'],['setor','Setores'],['lancar','Lançar vendas'],['historico','Histórico']];
function montarCabecalho(){
  const v=S.gerente?VIEWS_G:VIEWS_E;
  $('#nav').innerHTML=v.map(([k,t])=>`<a href="#${k}" data-v="${k}">${t}</a>`).join(''); $('#nav').classList.remove('hide');
  $('#hctl').classList.remove('hide');
  $('#userBox').innerHTML=`<button id="bConta" title="Minha conta">👤 ${esc((S.perfil.nome||S.user.email).split(' ')[0])}</button>`; $('#userBox').classList.remove('hide');
  $('#bConta').onclick=minhaConta;
}
function route(){
  const h=(location.hash||'#painel').slice(1); const v=(S.gerente?VIEWS_G:VIEWS_E).map(x=>x[0]);
  S.view=v.includes(h)?h:'painel';
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===S.view));
  render();
}
function fillMesSelect(){
  const sel=$('#selMes'); const ks=[...S.mesList].sort().reverse();
  sel.innerHTML = ks.map(k=>`<option value="${k}" ${k===S.mes?'selected':''}>${mesLabel(k)}</option>`).join('') || '<option>—</option>';
}
async function trocarMes(m){
  S.mes=m; S.cutoff=null; S.lancData=null;
  if(!S.months[m]){ $('#app').innerHTML='<div class="empty"><span class="spin"></span> Carregando…</div>'; try{ await carregarMes(m); }catch(e){ toast(e.message,5000); } }
  const [y,mm]=m.split('-'); garantirMes(`${+y-1}-${mm}`).then(()=>{ if(S.view==='painel') render(); }).catch(()=>{});
  render();
}

function telaLogin(msg){
  ['#nav','#hctl','#userBox'].forEach(x=>$(x).classList.add('hide'));
  $('#app').innerHTML=`<div class="login"><h1>Entrar</h1><p class="sub">Painel de metas da loja Bom Dia São Luiz — Araruna.</p>
   ${msg?`<div class="note err small" style="margin-bottom:12px">${esc(msg)}</div>`:''}
   <form id="fLogin"><label class="f">E-mail<input id="lEmail" type="email" autocomplete="username" required></label>
   <label class="f">Senha<input id="lSenha" type="password" autocomplete="current-password" required></label>
   <div id="lErr" class="note err small hide" style="margin-bottom:10px"></div>
   <button class="btn p" style="width:100%;justify-content:center" id="lBtn">Entrar</button></form>
   <p class="small muted" style="margin-top:16px">Esqueceu a senha? Peça ao gerente para cadastrar uma nova.<br><a href="#" id="lPrim">Primeiro acesso do gerente</a></p></div>`;
  $('#fLogin').onsubmit=async e=>{ e.preventDefault(); const er=$('#lErr'); er.classList.add('hide'); $('#lBtn').disabled=true;
    const { error } = await S.sb.auth.signInWithPassword({ email:$('#lEmail').value.trim(), password:$('#lSenha').value });
    if(error){ er.textContent = /invalid/i.test(error.message)?'E-mail ou senha incorretos.':error.message; er.classList.remove('hide'); $('#lBtn').disabled=false; return; }
    iniciarSessao(); };
  $('#lPrim').onclick=e=>{ e.preventDefault(); telaPrimeiroAcesso(); };
}
function telaPrimeiroAcesso(){
  $('#app').innerHTML=`<div class="login"><h1>Primeiro acesso do gerente</h1><p class="sub">Use o código de liberação que você recebeu. Ele só funciona uma vez.</p>
   <form id="fPrim"><label class="f">Código de liberação<input id="pCod" required placeholder="BD-XXXXXX-XXXXXX"></label>
   <label class="f">Seu nome<input id="pNome" required></label>
   <label class="f">E-mail<input id="pEmail" type="email" required></label>
   <label class="f">Senha (mínimo 8 caracteres)<input id="pSenha" type="password" required minlength="8"></label>
   <div id="pErr" class="note err small hide" style="margin-bottom:10px"></div>
   <button class="btn p" style="width:100%;justify-content:center" id="pBtn">Criar acesso de gerente</button></form>
   <p class="small" style="margin-top:14px"><a href="#" id="pVolta">← Voltar para o login</a></p></div>`;
  $('#pVolta').onclick=e=>{ e.preventDefault(); telaLogin(); };
  $('#fPrim').onsubmit=async e=>{ e.preventDefault(); const er=$('#pErr'); er.classList.add('hide'); $('#pBtn').disabled=true;
    try{ await chamarUsuarios({acao:'primeiro_gerente', codigo:$('#pCod').value, nome:$('#pNome').value, email:$('#pEmail').value, senha:$('#pSenha').value});
      const { error } = await S.sb.auth.signInWithPassword({ email:$('#pEmail').value.trim(), password:$('#pSenha').value }); if(error) throw error;
      iniciarSessao(); }
    catch(x){ er.textContent=x.message; er.classList.remove('hide'); $('#pBtn').disabled=false; } };
}
async function iniciarSessao(){
  const { data:{ session } } = await S.sb.auth.getSession();
  if(!session) return telaLogin();
  S.user=session.user;
  $('#app').innerHTML='<div class="empty"><span class="spin"></span> Carregando dados…</div>';
  try{
    const p=await q(S.sb.from('perfis').select('*').eq('id',S.user.id));
    if(!p.length){ await S.sb.auth.signOut(); return telaLogin('Seu usuário ainda não foi liberado pelo gerente.'); }
    S.perfil=p[0]; S.gerente=S.perfil.papel==='gerente';
    S.setoresAll=await q(S.sb.from('setores').select('*').order('ordem'));
    await carregarListaMeses();
    const cur=todayIso().slice(0,7); S.mes = S.mesList.includes(cur)?cur:(S.mesList[S.mesList.length-1]||null);
    if(S.mes) await carregarMes(S.mes);
    if(S.mes){ const [y,mm]=S.mes.split('-'); await garantirMes(`${+y-1}-${mm}`).catch(()=>{}); }
    S.loaded=true; document.body.classList.toggle('enc',!S.gerente); montarCabecalho(); route();
  }catch(e){ console.error(e); $('#app').innerHTML=`<div class="note err">Erro ao carregar: ${esc(e.message||e)}</div>`; }
}

(function init(){
  if(!window.supabase){ $('#app').innerHTML='<div class="note err">Não foi possível carregar o site. Verifique a internet e recarregue.</div>'; return; }
  S.sb = window.supabase.createClient(METAS_CONFIG.url, METAS_CONFIG.anonKey, { auth:{ persistSession:true, autoRefreshToken:true } });
  window.addEventListener('hashchange',()=>{ if(S.loaded) route(); });
  $('#selMes').addEventListener('change',e=>trocarMes(e.target.value));
  S.sb.auth.onAuthStateChange((ev)=>{ if(ev==='SIGNED_OUT'){ S.loaded=false; telaLogin(); } });
  iniciarSessao();
})();
