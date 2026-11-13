/* Recepção e Fiscal: as colaboradoras do mesmo posto não podem folgar no mesmo dia */
const NO_SAME_OFF=['recepcao','fiscal'];
const POST_NAMES={pacote:'Pacote',fiscal:'Fiscal',recepcao:'Recepção',caixa:'Operadora Caixa',equipe:'Equipe',acougue:'Açougue',frios:'Frios',repositorfrios:'Repositor de Frios',trocaetiqueta:'Troca de Etiqueta',cartaz:'Cartaz',limpeza:'Limpeza',deposito:'Depósito',reposicao:'Reposição',producao:'Produção',atendimento:'Atendimento'};
/* postos de cada setor (o posto é fixo da colaboradora; o rodízio é de turnos) e postos que precisam ter alguém no domingo */
const SECTOR_POSTS={'frente-caixa':['caixa','pacote','fiscal','recepcao'],'horti-fruit':['equipe'],'acougue-frios':['acougue','frios','repositorfrios','limpeza'],'loja-deposito':['deposito','reposicao','trocaetiqueta','cartaz','limpeza'],padaria:['producao','atendimento','limpeza']};
const SUNDAY_POSTS={'frente-caixa':['fiscal','recepcao'],'horti-fruit':[],'acougue-frios':['acougue','frios'],'loja-deposito':['deposito','reposicao'],padaria:['producao','atendimento']};
const postKeys=()=>SECTOR_POSTS[state.selectedSector]||[],sundayPosts=()=>SUNDAY_POSTS[state.selectedSector]||[],hasPosts=()=>postKeys().length>0;
const STORE='bom-dia-escalas-v9',OLD='bom-dia-escalas-v8';
const DEFAULTS={earlyBefore:'09:00',weekClose:'19:30',sundayClose:'18:00',alternateSundays:true,extraText:'',v10:1},EXTRA_MAX=90;
const SECTORS={'frente-caixa':'Frente de Caixa','acougue-frios':'Açougue e Frios','loja-deposito':'Loja e Depósito',padaria:'Padaria','horti-fruit':'Horti Fruit'};
const SUNDAY_MIN={'frente-caixa':4,'acougue-frios':4,'loja-deposito':2,padaria:3,'horti-fruit':1};
const DAYS=[['segunda','Seg.',0],['terça','Ter.',1],['quarta','Qua.',2],['quinta','Qui.',3],['sexta','Sex.',4],['sábado','Sáb.',5],['domingo','Dom.',6]];
const PRESETS=[['07:00','11:00'],['09:30','12:00'],['10:10','13:00']],COLORS=['#d12d32','#f0a919','#245da8','#7d4db0','#14845a'];
const TRAFFIC=[['Manhã','08:00','10:00',3],['Almoço','12:00','15:00',4],['Tarde','15:00','18:00',6],['Fechamento','18:00','19:30',6]];
const pad=n=>String(n).padStart(2,'0'),mins=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
const time=n=>{n=((n%1440)+1440)%1440;return pad(Math.floor(n/60))+':'+pad(n%60)};
const plus=(t,n)=>time(mins(t)+n),iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function monday(value){const d=value instanceof Date?new Date(value):new Date(value+'T12:00:00');d.setDate(d.getDate()-((d.getDay()||7)-1));return iso(d)}
const LAW_42=new Date('2026-12-16T12:00:00'),LAW_40=new Date('2027-12-16T12:00:00');
function weeklyLimit(idx=(state?state.selectedWeek:0)){if(!state||!state.baseMonday)return 44;const d=date('domingo',idx);return d>=LAW_40?40:d>=LAW_42?42:44}
function workDuration(model,idx=(state?state.selectedWeek:0)){const l=weeklyLimit(idx);return model==='6x1'?l*10:Math.min(500,l*12)}
function shift(index,model='5x2'){const [start,lunchStart]=PRESETS[index]||[plus('10:10',(index-2)*40),plus('13:00',(index-2)*40)],work=workDuration(model);return{name:(index+1)+'º turno',start,lunchStart,lunchEnd:plus(lunchStart,120),end:plus(start,work+120),color:COLORS[index%COLORS.length]}}
function worker(id,shifts=3){return{id,name:'Colaboradora '+id,shift:(id-1)%shifts,pdv:(id-1)%10+1,station:'caixa',offDays:id%2?['sexta']:['segunda'],sundayWork:false,restricted:false}}
function distribute(total,count){const base=Math.floor(total/count),extra=total%count;return Array.from({length:count},(_,i)=>base+(i<extra?1:0))}
function rotation(active=12,shifts=3){return{enabled:false,counts:distribute(active,shifts),message:''}}
function newWeek(){return{model:'5x2',activeCount:12,pdvCount:10,shifts:[0,1,2].map(i=>shift(i)),employees:Array.from({length:12},(_,i)=>worker(i+1)),sortField:'start',sortDirection:'asc',rotation:rotation()}}
function newSector(){return{weeks:[0,1,2,3].map(newWeek)}}
function newState(){return{selectedSector:'frente-caixa',selectedWeek:0,baseMonday:monday(new Date()),sectors:Object.fromEntries(Object.keys(SECTORS).map(k=>[k,newSector()]))}}
function load(){for(const key of [STORE,OLD,'bom-dia-escalas-v7'])try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.sectors)return saved}catch(_){ }return newState()}
var state;state=load();if(state.settings&&!state.settings.v10)state.settings.sundayClose='18:00';state.settings={...DEFAULTS,...state.settings};
const clone=value=>JSON.parse(JSON.stringify(value));
function sector(){if(!state.sectors[state.selectedSector])state.sectors[state.selectedSector]=newSector();return state.sectors[state.selectedSector]}
function week(){if(!sector().weeks)sector().weeks=[0,1,2,3].map(newWeek);return sector().weeks[state.selectedWeek]||(sector().weeks[state.selectedWeek]=newWeek())}
const hasPdv=()=>state.selectedSector==='frente-caixa',neededOff=()=>week().model==='6x1'?1:2;
function date(key,index=state.selectedWeek){const day=DAYS.find(d=>d[0]===key),d=new Date(state.baseMonday+'T12:00:00');d.setDate(d.getDate()+day[2]+index*7);return d}
const short=d=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d),range=i=>short(date('segunda',i))+' a '+short(date('sábado',i));
function escape(v){const e=document.createElement('div');e.textContent=v;return e.innerHTML}
function sync(s,model=week().model,idx=state.selectedWeek){s.lunchEnd=plus(s.lunchStart,120);s.end=plus(s.start,workDuration(model,idx)+120)}
function stationOk(s,id){const k=postKeys();if(!k.length)return 'pdv';if(k.includes(s))return s;if(s==='pdv'&&k.includes('caixa'))return 'caixa';return hasPdv()?'caixa':k[(id-1)%k.length]}
function normalizeWeek(w){w.model=w.model==='6x1'?'6x1':'5x2';w.activeCount=Math.min(50,Math.max(1,+w.activeCount||12));w.pdvCount=Math.min(30,Math.max(1,+w.pdvCount||10));w.shifts=(w.shifts||[]).map((s,i)=>({...shift(i,w.model),...s}));const wi=Math.max(0,sector().weeks.indexOf(w));w.shifts.forEach(s=>sync(s,w.model,wi));w.sunday=normSunday(w.sunday,w.model,wi);w.rotation=w.rotation||rotation(w.activeCount,w.shifts.length);w.rotation.enabled=!!w.rotation.enabled;w.rotation.counts=Array.from({length:w.shifts.length},(_,i)=>Math.max(0,+w.rotation.counts?.[i]||0));w.rotation.message=w.rotation.message||'';w.employees=Array.from({length:w.activeCount},(_,i)=>{const e=w.employees?.[i]||worker(i+1,w.shifts.length),off=Array.isArray(e.offDays)?e.offDays:e.off==='domingo e segunda'?['domingo','segunda']:['sábado','domingo'];return{...e,id:i+1,name:e.name||('Colaboradora '+(i+1)),offDays:[...new Set(off)].filter(x=>x!=='domingo'),shift:Math.min(+e.shift||0,w.shifts.length-1),pdv:Math.min(Math.max(1,+e.pdv||1),w.pdvCount),station:stationOk(e.station,e.id),sundayWork:off.includes('domingo')?false:!!e.sundayWork,restricted:!!e.restricted,postRotation:!!e.postRotation}});w.sortField=w.sortField||'start';w.sortDirection=w.sortDirection||'asc';return w}
function sortShifts(w=week()){const items=w.shifts.map((s,i)=>({s,i})).sort((a,b)=>mins(a.s.start)-mins(b.s.start)),map=new Map(items.map((x,i)=>[x.i,i]));w.shifts=items.map(x=>x.s);w.employees=w.employees.map(e=>({...e,shift:map.get(+e.shift)??0}))}
function normalize(){state.settings={...DEFAULTS,...state.settings};sector().weeks.forEach(x=>{normalizeWeek(x);sortShifts(x)});const r=roster();sector().weeks.forEach(w=>w.employees.forEach((e,i)=>{e.name=r[i].name;e.restricted=r[i].restricted;if(hasPosts())e.station=stationOk(r[i].station,e.id)}))}
/* nome e restrição de cada colaboradora, por setor: alterados na ficha, valem nas 4 semanas */
function roster(){
  const all=(state.roster=state.roster||{}),s=state.selectedSector;if(!all[s])all[s]=[];
  const arr=all[s],w0=sector().weeks[0];
  for(let i=0;i<50;i++)if(!arr[i]){const e=w0&&w0.employees&&w0.employees[i];arr[i]={name:(e&&e.name)||('Colaboradora '+(i+1)),restricted:!!(e&&e.restricted),station:e&&e.station}}
  for(let i=0;i<50;i++)if(!arr[i].station){const e=w0&&w0.employees&&w0.employees[i];arr[i].station=e&&e.station}
  return arr;
}
/* ===== geração automática (opcional): só roda quando o botão é clicado; guarda cópia para desfazer ===== */
/* estudante/mãe: CCT protege contra escala após 18h; troca de turno com quem não tem restrição (preferindo quem não trabalha no domingo) */
function swapRestricted(w){
  const ok=e=>mins(w.shifts[e.shift].end)<=1080,bad=w.employees.filter(e=>e.restricted&&!ok(e));
  const pool=w.employees.filter(e=>!e.restricted&&ok(e)).sort((a,b)=>(a.sundayWork?1:0)-(b.sundayWork?1:0));
  let done=0;
  bad.forEach(e=>{const f=pool.shift();if(!f)return;const t=e.shift;e.shift=f.shift;f.shift=t;done++});
  return bad.length-done;
}
function swapSundayShifts(w){
  const close=sc(),late=e=>mins(w.shifts[e.shift].end)>close;
  const sun=w.employees.filter(e=>e.sundayWork&&late(e)),pool=w.employees.filter(e=>!e.sundayWork&&!e.restricted&&!late(e));
  let done=0;
  sun.forEach(e=>{const f=pool.shift();if(!f)return;const t=e.shift;e.shift=f.shift;f.shift=t;done++});
  return sun.length-done;
}
/* PDV: ninguém divide o mesmo PDV com quem trabalha no mesmo dia e horário; mantém o número atual quando está livre */
function assignPdvs(w,wi,fresh){
  const emps=w.employees.filter(e=>e.station==='caixa'),days=e=>DAYS.filter(d=>worksOn(e,d[0],wi)).map(d=>d[0]);
  const iv=e=>[mins(w.shifts[e.shift].start),mins(w.shifts[e.shift].end)];
  const clash=(a,b)=>{const x=iv(a),y=iv(b);if(!(x[0]<y[1]&&y[0]<x[1]))return false;const da=days(a);return days(b).some(d=>da.includes(d))};
  const done=[];let short=0;
  /* fresh: quem entra mais cedo (1º turno) pega os PDVs mais baixos, 1 a 4 primeiro */
  if(fresh)emps.sort((a,b)=>mins(w.shifts[a.shift].start)-mins(w.shifts[b.shift].start)||a.id-b.id);
  emps.forEach(e=>{
    const used=new Set(done.filter(o=>clash(e,o)).map(o=>o.pdv));
    let pick=(!fresh&&e.pdv>=1&&e.pdv<=w.pdvCount&&!used.has(e.pdv))?e.pdv:0;
    if(!pick)for(let n=1;n<=w.pdvCount;n++)if(!used.has(n)){pick=n;break}
    if(!pick){pick=((e.id-1)%w.pdvCount)+1;short++}
    e.pdv=pick;done.push(e);
  });
  return short;
}
async function generateAll(){
  if(!baseOk()){needBase();return}
  const g=state.gen||{},sel=state.selectedSector;
  if(!await askConfirm('Gerar a escala de '+SECTORS[sel]+' nas 4 semanas?\n\nSerá refeito: folgas'+(g.posts?', turnos dos postos':'')+(hasPdv()&&g.pdv?', números de PDV':'')+'. Serão mantidos: nomes e os domingos que você já definiu. Você pode desfazer depois.'))return;
  state.undo={...(state.undo||{}),[sel]:{at:new Date().toISOString(),weeks:clone(sector().weeks)}};
  state.selectedWeek=0;const weeks=sector().weeks;weeks.forEach(w=>{normalizeWeek(w);sortShifts(w)});
  const r=fillSundays();let late=0,shortPdv=0,restr=0,postNotes=[];
  if(hasPosts()&&g.posts){const rp=applyPostPlan(true);if(rp&&rp.notes.length)postNotes=rp.notes}
  weeks.forEach(w=>{restr+=swapRestricted(w)});
  weeks.forEach(w=>balanceOffs(w,true));
  if(hasPdv()){
    if(g.pdv)weeks.forEach((w,wi)=>{shortPdv+=assignPdvs(w,wi,true)});
  }
  state.selectedWeek=0;
  const list=compliance(),er=list.filter(x=>x.level==='erro').length,at=list.filter(x=>x.level==='atenção').length;
  state.notice='Escala gerada para '+SECTORS[sel]+'. '+sundayNote(r)+MOVE_NOTE+(shortPdv?' '+shortPdv+' colaboradora(s) ficaram sem PDV exclusivo: há mais pessoas simultâneas do que PDVs.':'')+(postNotes.length?' Rodízio de turnos dos postos: '+postNotes.join('; ')+'.':'')+(restr?' '+restr+' colaboradora(s) com restrição após 18h não couberam em turno que termina até 18h.':'')+(late?' '+late+' colaboradora(s) de domingo ficaram com turno que termina depois do fechamento.':'')+' Conformidade: '+(er?er+' erro(s)':'sem erros')+(at?', '+at+' atenção(ões)':'')+'. Use "Desfazer última geração" para voltar.';
  render();toast('Escala gerada. '+(er?er+' erro(s) de conformidade — veja o painel.':'Sem erros de conformidade.'),!er);
}
async function undoGenerate(){
  const sel=state.selectedSector,u=state.undo&&state.undo[sel];if(!u)return;
  if(!await askConfirm('Desfazer a última geração de '+SECTORS[sel]+'? As 4 semanas voltam ao que estava antes.'))return;
  sector().weeks=u.weeks;if(u.roster){state.roster=state.roster||{};state.roster[sel]=u.roster}delete state.undo[sel];state.notice='';render();toast('Geração desfeita.',true);
}
function renderGen(){
  state.gen={shifts:'girar',pdv:true,posts:true,...(state.gen||{})};
  const g=state.gen,u=state.undo&&state.undo[state.selectedSector];
  document.getElementById('genPanel').innerHTML=`<div class="setting-block"><label>Geração automática (opcional)</label><p class="helper">Nada é gerado sozinho: a escala só muda quando você clicar em "Gerar". Antes, escolha na Semana 1 quem trabalha no domingo. O app monta as 4 semanas deste setor respeitando CLT, EC 141/2026 e CCT.</p></div>
  ${hasPosts()?`<div class="setting-block">${hasPdv()?`<label class="check-row"><input type="checkbox" id="genPdv" ${g.pdv?'checked':''} /> Distribuir PDVs sem repetir no mesmo dia e horário</label>`:''}<label class="check-row"><input type="checkbox" id="genPosts" ${g.posts?'checked':''} /> Aplicar o rodízio de turnos dos postos (vagas cedo/tarde da aba Rodízio)</label></div>`:''}
  <div class="setting-block"><label>Movimento esperado por dia</label><p class="helper">Como o gerente: dias de mais movimento ficam com menos folgas e a equipe maior. O app distribui as folgas por turno pelo movimento, mantém ao menos metade de cada turno presente e nunca deixa um posto (Fiscal, Recepção, Pacote…) sem ninguém. Vale também para "Sugerir folgas".</p>
  <div class="mov-grid">${DAYS.map(d=>`<label>${d[1]}<select data-mov="${d[0]}">${MOV_LEVELS.map(l=>`<option value="${l[0]}" ${movement()[d[0]]===l[0]?'selected':''}>${l[1]}</option>`).join('')}</select></label>`).join('')}</div></div>
  <button class="button full" id="genRun" type="button">Gerar escala do setor</button>
  <button class="button outline full" id="genUndo" type="button" ${u?'':'disabled'}>Desfazer última geração${u?' ('+short(new Date(u.at))+' '+pad(new Date(u.at).getHours())+':'+pad(new Date(u.at).getMinutes())+')':''}</button>
  <p class="helper">Substitui as folgas${g.posts?', os turnos dos postos':''}${hasPdv()?' e os números de PDV':''}. Mantém nomes e os domingos de semanas que você já preencheu.</p>`;
}
/* backup em arquivo */
function exportBackup(){
  state.lastBackup=new Date().toISOString();save();
  const data={app:'bom-dia-escalas',version:9,exportedAt:state.lastBackup,state:(({undo,...r})=>r)(state)},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='bom-dia-escalas-backup-'+iso(new Date())+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  render();toast('Backup exportado. Guarde o arquivo em local seguro (nuvem ou pen drive).',true);
}
function importBackup(file){
  const rd=new FileReader();
  rd.onload=async()=>{
    const old=state;
    try{
      const data=JSON.parse(rd.result),st=data&&data.state?data.state:data;
      if(!st||typeof st!=='object'||!st.sectors||typeof st.sectors!=='object')throw new Error('estrutura');
      if(!await askConfirm('Importar este backup vai SUBSTITUIR todos os dados atuais deste navegador. Continuar?'))return;
      const base=newState();
      state={...base,...st,sectors:{...base.sectors,...st.sectors}};
      state.settings={...DEFAULTS,...state.settings};
      if(!SECTORS[state.selectedSector])state.selectedSector='frente-caixa';
      state.selectedWeek=Math.min(3,Math.max(0,+state.selectedWeek||0));state.baseMonday=monday(state.baseMonday||new Date());state.notice='';state.roster=state.roster||{};
      render();toast('Backup importado com sucesso.',true);
    }catch(err){state=old;try{render()}catch(_){}toast('Arquivo inválido: não é um backup do Bom Dia.')}
  };
  rd.readAsText(file);
}
function renderBackupStatus(){
  const el=document.getElementById('statusText'),box=el.parentElement,t=state.lastBackup?new Date(state.lastBackup):null,days=t?Math.floor((Date.now()-t)/864e5):null;
  el.textContent=t?'Dados salvos neste dispositivo · último backup em '+short(t)+' '+pad(t.getHours())+':'+pad(t.getMinutes()):'Dados salvos só neste dispositivo · faça um backup';
  box.classList.toggle('warn',days===null||days>=7);
}
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function activateTab(name){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.toggle('active',x.dataset.panel===name))}
const effOff=e=>e.sundayWork?e.offDays:[...e.offDays,'domingo'],offLimit=(e,model=week().model)=>Math.max(0,2-(e.sundayWork?0:1)),sc=()=>sundayPlan(week()).en;
function offText(e){const picked=DAYS.filter(d=>effOff(e).includes(d[0])||closedDay(d[0]));return picked.length?picked.map(d=>d[1]+' '+short(date(d[0]))+(closedDay(d[0])&&!effOff(e).includes(d[0])?' (feriado)':'')).join(' e '):'Definir'}
function stationText(e){return e.station==='caixa'?'Operadora Caixa · PDV '+e.pdv:(POST_NAMES[e.station]||'PDV '+e.pdv)}
function sundayWorkers(){return week().employees.filter(e=>!closedDay('domingo')&&e.sundayWork)}
function issues(){const bad=week().employees.filter(e=>(week().model==='6x1'?effOff(e).length<1:effOff(e).length!==2)),list=[];if(bad.length)list.push(bad.length+' colaboradora'+(bad.length===1?' está':'s estão')+' sem '+neededOff()+' folga'+(neededOff()===1?'':'s')+' obrigatória'+(neededOff()===1?'':'s')+'.');const minimum=SUNDAY_MIN[state.selectedSector],count=sundayWorkers().length;if(!closedDay('domingo')&&count<minimum)list.push('Domingo: mínimo de '+minimum+' colaboradoras; há '+count+'.');compliance().filter(x=>x.level==='erro'&&x.weeks.includes(state.selectedWeek)).forEach(x=>list.push(x.text));return list}
function sortValue(e){const s=week().shifts[e.shift],f=week().sortField;if(f==='name')return e.name.toLocaleLowerCase('pt-BR');if(f==='off')return e.offDays.map(k=>DAYS.find(d=>d[0]===k)[2]).join(',');if(f==='hours')return mins(s.end);return f==='lunch'?mins(s.lunchStart):f==='end'?mins(s.end):mins(s.start)}
function staff(){const dir=week().sortDirection==='asc'?1:-1;return [...week().employees].sort((a,b)=>typeof sortValue(a)==='number'?dir*(sortValue(a)-sortValue(b)):dir*String(sortValue(a)).localeCompare(String(sortValue(b)),'pt-BR'))}
const mark=f=>week().sortField===f?(week().sortDirection==='asc'?'↑':'↓'):'↕';
function render(){normalize();const w=week(),name=SECTORS[state.selectedSector];document.getElementById('sectorSelect').value=state.selectedSector;document.getElementById('weekStart').value=monday(state.baseMonday);document.getElementById('sectorLabel').textContent='PAINEL GERENCIAL · '+name.toUpperCase();document.getElementById('mainTitle').textContent='Escala semanal · '+name;document.getElementById('settingsTitle').textContent='Semana '+(state.selectedWeek+1);document.getElementById('weekTitle').textContent=range()+' · Semana '+(state.selectedWeek+1);document.getElementById('activeEmployees').value=w.activeCount;document.getElementById('pdvCount').value=w.pdvCount;document.getElementById('shiftCount').value=w.shifts.length;document.getElementById('weekClose').value=state.settings.weekClose;document.getElementById('sundayClose').value=state.settings.sundayClose;document.getElementById('extraHolidays').value=state.settings.extraText||'';document.getElementById('activeMetric').textContent=w.activeCount;document.getElementById('shiftMetric').textContent=w.shifts.length;document.getElementById('modelMetric').textContent=w.model;document.getElementById('pdvMetric').textContent=w.pdvCount;document.getElementById('pdvMetricCard').hidden=!hasPdv();document.querySelector('[data-tab="pdvs"]').hidden=!hasPdv();document.querySelector('[data-panel="pdvs"]').hidden=!hasPdv();if(!hasPdv()&&document.querySelector('.tab.active').dataset.tab==='pdvs')activateTab('team');document.querySelectorAll('.model-button').forEach(x=>x.classList.toggle('active',x.dataset.model===w.model));document.getElementById('operatorsTag').textContent=w.activeCount+' ativas';renderWeekTabs();renderShifts();renderRotation();renderCoverage();renderSchedule();renderSunday();renderOperators();renderBoard();renderAlerts();renderWarning();renderCompliance();renderOffAnalysis();renderGen();renderBackupStatus();save()}
function renderWeekTabs(){document.getElementById('periodTabs').innerHTML=[0,1,2,3].map(i=>`<button class="period-tab ${i===state.selectedWeek?'active':''}" data-week="${i}" type="button">Semana ${i+1}<small>${range(i)}</small></button>`).join('')}
function renderShifts(){document.getElementById('shiftsEditor').innerHTML=loadInfo()+week().shifts.map((s,i)=>`<div class="shift-card"><h3>${escape(s.name)}</h3><div class="time-grid"><label>Entrada<input data-shift="${i}" data-field="start" type="time" value="${s.start}" /></label><label>Saída calculada<input type="time" value="${s.end}" disabled /></label><label>Saída para almoço<input data-shift="${i}" data-field="lunchStart" type="time" value="${s.lunchStart}" /></label><label>Retorno automático (+2h)<input type="time" value="${s.lunchEnd}" disabled /></label></div><p class="helper">Limite com hora extra (máx. 1h30): até ${plus(s.end,EXTRA_MAX)}.</p></div>`).join('')+sundayCard()}
function renderRotation(){document.getElementById('rotationPanel').innerHTML=postsPanel()}
function renderCoverage(){document.getElementById('coverageCards').innerHTML=week().shifts.map((s,i)=>{const n=week().employees.filter(e=>e.shift===i).length;return `<div class="coverage-card"><strong><i class="shift-pill" style="background:${s.color}"></i>${escape(s.name)}</strong><span>${s.start}–${s.end} · ${n} colaboradora${n===1?'':'s'}</span></div>`}).join('')}
function heading(){const fields=[['name','Colaboradora'],['shift','Turno'],...(hasPosts()?[['station','Posto']]:[]),['start','Entrada'],['lunch','Almoço'],['end','Saída'],['off','Folgas com data'],['hours','Limite c/ extras (máx. 1h30)']];return `<thead><tr>${fields.map(([f,n])=>f==='station'?`<th>${n}</th>`:`<th><button class="sort-button" data-sort="${f}" type="button">${n} <span>${mark(f)}</span></button></th>`).join('')}</tr></thead>`}
function row(e){const s=week().shifts[e.shift];return `<tr><td class="c-name"><button class="employee-link" data-jump="${e.id}" type="button">${escape(e.name)}</button></td><td data-label="Turno"><i class="shift-pill" style="background:${s.color}"></i>${escape(s.name)}</td>${hasPosts()?`<td data-label="Posto">${stationText(e)}</td>`:''}<td data-label="Entrada">${s.start}</td><td data-label="Almoço">${s.lunchStart}–${s.lunchEnd}</td><td data-label="Saída">${s.end}</td><td data-label="Folgas" class="c-off">${offText(e)}</td><td data-label="Limite c/ extras">${plus(s.end,EXTRA_MAX)}</td></tr>`}
function renderSchedule(){document.getElementById('scheduleTable').innerHTML=`${heading()}<tbody>${staff().map(row).join('')}</tbody>`}
function renderSunday(){const list=sundayWorkers(),minimum=SUNDAY_MIN[state.selectedSector],head=hasPosts()?'<th>Posto</th>':'',rows=list.map(e=>{const pl=sundayPlan(week()),end=time(pl.en),lunch=pl.brk?time(pl.brk[0])+'–'+time(pl.brk[1])+' ('+(pl.brk[1]-pl.brk[0])+' min)':'—';return `<tr><td>${escape(e.name)}</td><td>Domingo</td>${hasPosts()?`<td>${stationText(e)}</td>`:''}<td>${time(pl.st)}</td><td>${lunch}</td><td>${end}</td></tr>`}).join('');const columns=hasPdv()?6:5;document.getElementById('sundaySchedule').innerHTML=`<div class="print-brand"><img src="logo.png" alt="" /><b>${escape(SECTORS[state.selectedSector])}</b><span>Escala de domingo · ${short(date('domingo'))}</span></div><div class="section-heading"><div><p class="eyebrow">ESCALA DE DOMINGO</p><h2>Domingo · ${short(date('domingo'))}</h2><p>${SECTORS[state.selectedSector]} · mínimo de ${minimum} colaboradora${minimum===1?'':'s'}.</p></div><span class="tag">${list.length} programada${list.length===1?'':'s'}</span></div><div class="table-wrap"><table><thead><tr><th>Colaboradora</th><th>Turno</th>${head}<th>Entrada</th><th>Intervalo</th><th>Saída</th></tr></thead><tbody>${rows||`<tr><td colspan="${columns}">Nenhuma colaboradora programada para este domingo.</td></tr>`}</tbody></table></div><p class="table-note">${week().sunday.mode==='dia'?'Domingo dia todo, com almoço de 2h':'Domingo até '+week().sunday.end+', direto e sem intervalo'}. CCT de mercados: abono de R$ 94,00 por domingo trabalhado, além da folga semanal (confirme o valor vigente).</p>`}
function renderOperators(){const w=week(),options=w.shifts.map((s,i)=>`<option value="${i}">${escape(s.name)} · ${s.start}–${s.end}</option>`).join(''),pdv=Array.from({length:w.pdvCount},(_,i)=>`<option value="${i+1}">PDV ${i+1}</option>`).join(''),stations=postKeys().map(k=>`<option value="${k}">${POST_NAMES[k]}</option>`).join(''),label=neededOff()===1?'obrigatório marcar 1':'obrigatório marcar 2';document.getElementById('operatorsList').innerHTML=w.employees.map((e,i)=>`<article class="operator-card" id="operator-${e.id}"><h3>Colaboradora ${e.id} <button type="button" class="remove-btn" data-remove="${i}">Excluir</button></h3><div class="operator-fields"><label>Nome<input data-employee="${i}" data-field="name" value="${escape(e.name)}" /></label><label>Turno<select data-employee="${i}" data-field="shift">${options}</select></label>${hasPosts()?`<label>Posto<select data-employee="${i}" data-field="station">${stations}</select></label>`:''}${hasPdv()&&e.station==='caixa'?`<label class="pdv-pick">PDV da semana<select data-employee="${i}" data-field="pdv">${pdv}</select></label>`:''}<fieldset class="off-days"><legend>Dias de folga <small>(${week().model==='6x1'?'até ':'marcar '}${offLimit(e)}${e.sundayWork?'':' + domingo'})</small></legend><div class="days-list">${DAYS.filter(d=>d[0]!=='domingo').map(d=>`<label><input type="checkbox" data-employee="${i}" data-off="${d[0]}" ${e.offDays.includes(d[0])?'checked':''} />${d[0]}</label>`).join('')}${e.sundayWork?'':'<label><input type="checkbox" checked disabled />domingo (folga)</label>'}</div></fieldset><label>Trabalha no domingo <small>(${short(date('domingo'))})</small><select data-employee="${i}" data-field="sundayWork"><option value="false">Não</option><option value="true">Sim</option></select></label><label class="check-row restricted"><input type="checkbox" data-employee="${i}" data-field="restricted" ${e.restricted?'checked':''} /> Estudante/mãe: sem escala após 18h <small>(CCT)</small></label></div></article>`).join('');document.querySelectorAll('[data-employee]:not([data-off])').forEach(el=>{const e=w.employees[+el.dataset.employee],f=el.dataset.field;el.value=String(e[f])})}
function active(e,d,at){const s=week().shifts[e.shift],point=mins(at),end=d[0]==='domingo'?Math.min(mins(s.end),sc()):Math.min(mins(s.end),mins(state.settings.weekClose));if(closedDay(d[0]))return false;if(d[0]==='domingo'){if(!e.sundayWork)return false;const pl=sundayPlan(week());return point>=pl.st&&point<pl.en&&!(pl.brk&&point>=pl.brk[0]&&point<pl.brk[1])}else if(e.offDays.includes(d[0]))return false;const brk=[mins(s.lunchStart),Math.min(mins(s.lunchEnd),end)];return point>=mins(s.start)&&point<end&&!(brk&&point>=brk[0]&&point<brk[1])}
function cover(d,start,end){const values=[];for(let n=mins(start);n<mins(end);n+=30)values.push(week().employees.filter(e=>active(e,d,time(n))).length);return values.length?Math.min(...values):0}
function renderBoard(){const bands=[],close=mins(state.settings.weekClose);for(let start=420;start<close;start+=60){const stop=Math.min(start+60,close);bands.push([time(start)+'–'+time(stop),time(start),time(stop)])}document.getElementById('boardNote').textContent='Segunda a sábado até '+state.settings.weekClose+'; domingo até '+state.settings.sundayClose+'. Verde indica maior cobertura e vermelho a menor.';const rows=bands.map(([label,start,end])=>({label,counts:DAYS.map(d=>closedDay(d[0])||(d[0]==='domingo'&&mins(start)>=sc())?null:cover(d,start,d[0]==='domingo'&&mins(end)>sc()?state.settings.sundayClose:end))})),all=rows.flatMap(r=>r.counts.filter(Number.isFinite)),low=Math.min(...all),high=Math.max(...all),cls=n=>n===null?'coverage-none':high===low?'coverage-mid':n===high?'coverage-high':n===low?'coverage-low':'coverage-mid';document.getElementById('coverageBoardHead').innerHTML=`<tr><th>Período</th>${DAYS.map(d=>`<th>${d[1]}<br>${short(date(d[0]))}${holidayTag(d[0])}</th>`).join('')}</tr>`;document.getElementById('coverageBoardBody').innerHTML=rows.map(r=>`<tr><td>${r.label}</td>${r.counts.map(n=>`<td class="${cls(n)}">${n===null?'—':n}</td>`).join('')}</tr>`).join('')}
function renderAlerts(){const box=document.getElementById('trafficAlerts');const panel=box.closest('.alerts-panel');if(panel)panel.hidden=!hasPdv();if(!hasPdv()){box.innerHTML='<p class="empty-alert">Alertas de fluxo são usados somente na Frente de Caixa.</p>';return}box.innerHTML=TRAFFIC.map(([label,start,end,min])=>{const days=DAYS.filter(d=>d[0]!=='domingo'&&!closedDay(d[0])&&cover(d,start,end)<min);return `<article class="alert-card ${days.length?'critical':'ok'}"><strong>${label} · ${start}–${end}</strong><span>${days.length?'Atenção: '+days.map(d=>d[1]).join(', ')+'.':'Cobertura atende o mínimo de '+min+'.'}</span><small>Mínimo planejado: ${min} operadoras.</small></article>`}).join('')}
function renderWarning(){const list=issues(),el=document.getElementById('scheduleWarning');el.hidden=!list.length;el.innerHTML=list.map(t=>'• '+escape(t)).join('<br>')}
function setActive(n){week().activeCount=Math.min(50,Math.max(1,+n||1));render()}
function setPdv(n){week().pdvCount=Math.min(30,Math.max(1,+n||1));render()}
function setModel(m){week().model=m;week().employees.forEach(e=>e.offDays=e.offDays.slice(0,offLimit(e)));week().shifts.forEach(s=>sync(s,m));render()}
function setShiftCount(n){const w=week(),count=+n,items=w.shifts.slice(0,count);while(items.length<count)items.push(shift(items.length,w.model));w.shifts=items;w.rotation.counts=distribute(w.activeCount,count);render()}
function setSort(f){if(week().sortField===f)week().sortDirection=week().sortDirection==='asc'?'desc':'asc';else{week().sortField=f;week().sortDirection='asc'}render()}
function fittedCounts(counts,total,slots){const sourceTotal=counts.reduce((a,b)=>a+b,0)||slots,raw=Array.from({length:slots},(_,i)=>(counts[i]||0)*total/sourceTotal),base=raw.map(Math.floor),remainders=raw.map((v,i)=>({i,v:v-Math.floor(v)})).sort((a,b)=>b.v-a.v),remaining=total-base.reduce((a,b)=>a+b,0);remainders.slice(0,remaining).forEach(x=>base[x.i]++);return base}
function shiftForSlot(counts,slot){let sum=0;for(let i=0;i<counts.length;i++){sum+=counts[i];if(slot<sum)return i}return counts.length-1}
function applyRotation(){const source=week(),sum=source.rotation.counts.reduce((a,b)=>a+b,0);if(sum!==source.activeCount){source.rotation.message=`A soma dos turnos deve ser ${source.activeCount}; ajuste antes de aplicar.`;render();return}source.rotation.message='Rodízio aplicado nas quatro semanas deste setor.';sector().weeks.forEach((target,targetIndex)=>{normalizeWeek(target);const counts=fittedCounts(source.rotation.counts,target.activeCount,target.shifts.length),offset=(((targetIndex-state.selectedWeek)*counts[0])%target.activeCount+target.activeCount)%target.activeCount;target.rotation={enabled:true,counts,message:targetIndex===state.selectedWeek?source.rotation.message:''};target.employees.forEach((e,index)=>e.shift=shiftForSlot(counts,(index-offset+target.activeCount)%target.activeCount));sortShifts(target)});render()}
function replicate(kind){const source=clone(week());sector().weeks.forEach((target,index)=>{if(index===state.selectedWeek)return;normalizeWeek(target);if(kind==='all'){sector().weeks[index]=clone(source);normalizeWeek(sector().weeks[index]);sortShifts(sector().weeks[index]);fixSundays(sector().weeks[index],source,index);return}if(kind==='team'){target.activeCount=source.activeCount;target.model=source.model;target.employees=clone(source.employees);target.shifts.forEach(s=>sync(s,target.model));fixSundays(target,source,index)}if(kind==='shifts'){target.shifts=clone(source.shifts);target.sunday=clone(source.sunday)}if(kind==='rotation'){target.rotation=clone(source.rotation)}if(kind==='pdvs'&&hasPdv())target.pdvCount=source.pdvCount;normalizeWeek(target);sortShifts(target)});render()}
/* Folgas equilibradas: escolhe os dias de folga de cada colaboradora para que cada turno (cedo, meio, tarde) fique com
   a quantidade de pessoas o mais parecida possível em todos os dias, sem sábado sempre que der, sem repetir o dia de folga
   de Recepção/Fiscal e sem passar de 6 dias seguidos de trabalho entre uma semana e outra (art. 67 da CLT). */
/* movimento esperado de atendimento por dia da semana (editável na aba Gerar): quanto maior o movimento, menos folgas naquele dia */
const MOVE_NOTE=' As folgas seguem o movimento esperado de cada dia (aba Gerar): mais folgas nos dias fracos e menos nos de pico, sempre com ao menos metade de cada turno e alguém em cada posto.';
const MOV_LEVELS=[['baixo','Baixo',4],['medio','Médio',3],['alto','Alto',2],['muito','Muito alto',1]];
const MOV_DEFAULT={segunda:'baixo',terça:'baixo',quarta:'medio',quinta:'medio',sexta:'alto',sábado:'muito',domingo:'alto'};
function movement(){const s=sector(),m=s.movement||{},out={};Object.keys(MOV_DEFAULT).forEach(k=>{out[k]=MOV_LEVELS.some(l=>l[0]===m[k])?m[k]:MOV_DEFAULT[k]});return out}
const movLabel=k=>MOV_LEVELS.find(l=>l[0]===movement()[k])[1],movWeight=k=>MOV_LEVELS.find(l=>l[0]===movement()[k])[2];
function balanceOffs(w,chain){
  const weeks=sector().weeks,wi=weeks.indexOf(w),prev=wi>0?weeks[wi-1]:null,next=!chain&&wi>=0&&wi<weeks.length-1?weeks[wi+1]:null;
  const dayKeys=DAYS.filter(d=>d[0]!=='domingo').map(d=>d[0]),idx=k=>dayKeys.indexOf(k);
  const emps=w.employees,six=w.model==='6x1';
  const cnt={},tot=dayKeys.map(()=>0),used={};
  const get=(s,d)=>cnt[s+'-'+d]||0,put=(s,d)=>{cnt[s+'-'+d]=get(s,d)+1;tot[d]++};
  const need=e=>six?1:(e.sundayWork?2:1);
  const wts=dayKeys.map((k,d)=>closedDay(k,wi)?0:movWeight(k)),wsum=wts.reduce((a,b)=>a+b,0)||1;
  const totNeed=emps.reduce((t,e)=>t+need(e),0),shiftNeed={},shiftMem={},postMem={};
  emps.forEach(e=>{shiftNeed[e.shift]=(shiftNeed[e.shift]||0)+need(e);shiftMem[e.shift]=(shiftMem[e.shift]||0)+1;if(hasPosts())postMem[e.station]=(postMem[e.station]||0)+1});
  const tgt=(s,d)=>(shiftNeed[s]||0)*wts[d]/wsum,tgtTot=d=>totNeed*wts[d]/wsum,postCnt={};
  const lastOff=(x)=>Math.max(-1,...x.offDays.map(idx));
  const lims=emps.map((e,i)=>{
    let ub=5,lb=0;
    const pe=prev&&prev.employees[i];
    if(!e.sundayWork&&pe&&pe.sundayWork){const m=lastOff(pe);if(m>=0)ub=m}   // semana seguinte à de domingo: folga até a última folga da anterior
    const ne=next&&next.employees[i];
    if(e.sundayWork&&ne&&!ne.sundayWork){const c=lastOff(ne);if(c>=0)lb=c}   // semana anterior à sem domingo: última folga não pode ser antes da folga seguinte
    return{ub,lb};
  });
  const closedIdx=dayKeys.map(k=>closedDay(k,wi));
  const allowed=i=>dayKeys.map((k,d)=>d).filter(d=>!closedIdx[d]);
  const order=emps.map((e,i)=>i).sort((a,b)=>{
    const ga=NO_SAME_OFF.includes(emps[a].station)?0:1,gb=NO_SAME_OFF.includes(emps[b].station)?0:1;
    if(ga!==gb)return ga-gb;
    const ta=(lims[a].ub<5?0:1)+(lims[a].lb>0?0:1),tb=(lims[b].ub<5?0:1)+(lims[b].lb>0?0:1);
    return ta-tb||emps[a].shift-emps[b].shift||a-b;
  });
  const dayCost=(e,d,picked)=>{
    const cs=get(e.shift,d)+picked.filter(x=>x===d).length;
    let c=(2*(cs-tgt(e.shift,d))+1)*100+(2*(tot[d]-tgtTot(d))+1)*30;   // segue o movimento esperado do dia
    if(d===5)c+=400;                                   // evita sábado
    const M=shiftMem[e.shift]||0;if(M>=2&&M-(cs+1)<Math.ceil(M/2))c+=8000;  // pelo menos metade do turno presente
    if(NO_SAME_OFF.includes(e.station)&&(used[e.station+'-'+d]))c+=5000;  // Recepção/Fiscal: mesmo dia só se não houver saída
    if(hasPosts()&&(postMem[e.station]||0)>=2&&(postCnt[e.station+'-'+d]||0)+1>=postMem[e.station])c+=8000;  // nunca deixar o posto sem ninguém
    return c+picked.filter(x=>x===d).length*9999;
  };
  order.forEach(i=>{
    const e=emps[i],n=need(e),{ub,lb}=lims[i];
    let cand=allowed(i);
    if(!e.sundayWork)cand=cand.filter(d=>d<=ub);
    if(!cand.length)cand=allowed(i).filter(d=>d<=Math.max(ub,0));
    if(!cand.length)cand=[0];
    let best=null;
    const tryPick=picks=>{
      if(e.sundayWork&&Math.max(...picks)<lb)return;
      // custo acumulado considerando as escolhas já feitas nesta combinação
      const t={};let c=0;picks.forEach((d,k)=>{c+=dayCost(e,d,picks.slice(0,k))+(t[d]||0)*0;t[d]=1});
      // custo de desequilíbrio: soma dos quadrados das contagens depois de aplicar

      if(best===null||c<best.c)best={c,picks};
    };
    if(n===1)cand.forEach(d=>tryPick([d]));
    else for(let a=0;a<cand.length;a++)for(let b=a+1;b<cand.length;b++)tryPick([cand[a],cand[b]]);
    if(!best){const f=(e.sundayWork&&lb>0?cand.filter(d=>d>=lb):cand)[0]??cand[0];best={picks:n===1?[f]:[cand[0],cand[1]??cand[0]]}}
    best.picks.sort((a,b)=>a-b);
    e.offDays=best.picks.map(d=>dayKeys[d]);
    best.picks.forEach(d=>{put(e.shift,d);postCnt[e.station+'-'+d]=(postCnt[e.station+'-'+d]||0)+1;if(NO_SAME_OFF.includes(e.station))used[e.station+'-'+d]=1});
  });
}
function suggestOffFor(w){balanceOffs(w,false)}
function offForEmp(w,e,i){const g=NO_SAME_OFF.includes(e.station)?w.employees.filter(x=>x.station===e.station):null;return g?offFor(e,g.indexOf(e),w.model,true):offFor(e,i,w.model)}
function offFor(e,i,model,grp){
  const g=i%3;
  if(model==='6x1'){
    /* 6x1 com domingos alternados: semana COM domingo = 1 folga (qua/qui/sex); semana SEM domingo = domingo + 1 folga extra (seg/ter/qua).
       A folga extra é necessária: com uma só folga por semana a pessoa passaria de 6 dias seguidos (art. 67 CLT). A extra vem sempre antes da folga da semana com domingo. */
    return e.sundayWork?[DAYS[2+g][0]]:[grp?['segunda','terça','sexta'][g]:DAYS[g][0]];
  }
  if(grp){const G=[[0,3],[1,4],[2,5]][i%3],gp=[DAYS[G[0]][0],DAYS[G[1]][0]];return e.sundayWork?gp:[gp[0]]}
  const P=[[0,2],[1,3],[2,4],[0,3],[1,4]],pr=P[i%5],pair=[DAYS[pr[0]][0],DAYS[pr[1]][0]];return e.sundayWork?pair:[pair[Math.floor(i/5)%2]];
}
/* ao copiar uma semana, as semanas a distância ímpar recebem o domingo de quem NÃO trabalhou na origem (mesma quantidade) */
function fixSundays(target,source,idx){
  if(Math.abs(idx-state.selectedWeek)%2===0)return;
  const k=source.employees.filter(e=>e.sundayWork).length,non=source.employees.map((e,i)=>i).filter(i=>!source.employees[i].sundayWork),pick=new Set(non.slice(0,k));
  target.employees.forEach((e,i)=>{const was=e.sundayWork;e.sundayWork=pick.has(i);if(was!==e.sundayWork)e.offDays=offForEmp(target,e,i)});
}
/* ===== domingo com turno próprio: "Até o meio-dia" (direto, sem intervalo) ou "Dia todo" (com almoço, como nos dias normais) ===== */
function normSunday(sd,model,wi){
  sd=sd&&typeof sd==='object'?sd:{};const ok=v=>/^\d{2}:\d{2}$/.test(v||''),mode=sd.mode==='dia'?'dia':'meio';
  const out={mode,start:ok(sd.start)?sd.start:(mode==='dia'?'07:00':'07:40'),end:ok(sd.end)?sd.end:'12:00',lunchStart:ok(sd.lunchStart)?sd.lunchStart:'11:00'};
  if(mode==='dia'){out.lunchEnd=plus(out.lunchStart,120);if(!ok(sd.end))out.end=plus(out.start,workDuration(model,wi)+120)}
  return out;
}
function sundayPlan(w){
  const sd=w.sunday||normSunday(null,w.model,0),st=mins(sd.start),en=mins(sd.end);
  if(sd.mode==='dia'){const ls=mins(sd.lunchStart),le=mins(sd.lunchEnd);return{st,en,len:en-st,brk:[ls,le],work:en-st-(le-ls)}}
  return{st,en,len:en-st,brk:null,work:Math.max(0,en-st)};
}
function sundayCard(){
  const w=week(),sd=w.sunday,full=sd.mode==='dia';
  return `<div class="shift-card sunday-card"><h3>Domingo</h3><div class="time-grid"><label style="grid-column:1/-1">Tipo de domingo<select data-sunday="mode"><option value="meio" ${full?'':'selected'}>Até o meio-dia (direto, sem intervalo)</option><option value="dia" ${full?'selected':''}>Dia todo (com almoço)</option></select></label>`+
  (full?`<label>Entrada<input data-sunday="start" type="time" value="${sd.start}" /></label><label>Saída<input data-sunday="end" type="time" value="${sd.end}" /></label><label>Saída para almoço<input data-sunday="lunchStart" type="time" value="${sd.lunchStart}" /></label><label>Retorno automático (+2h)<input type="time" value="${sd.lunchEnd}" disabled /></label>`
        :`<label>Entrada<input data-sunday="start" type="time" value="${sd.start}" /></label><label>Saída<input data-sunday="end" type="time" value="${sd.end}" /></label>`)+
  `</div><p class="helper">${full?'Sugestão inicial pela carga do modelo (${hm(workDuration(w.model,state.selectedWeek))} + 2h de almoço), mas você pode alterar a saída livremente.':'Trabalho direto até '+sd.end+', sem intervalo. Se passar de 6h seguidas, use "Dia todo".'}</p></div>`;
}
function weekMin(e,w=week(),wi=state.selectedWeek){return DAYS.reduce((t,d)=>!worksOn(e,d[0],wi)?t:t+(d[0]==='domingo'?sundayPlan(w).work:workDuration(w.model,wi)),0)}
function needBase(){state.selectedWeek=0;toast(hasPosts()?'Escolha primeiro, na Semana 1, quem trabalha no domingo ("Trabalha no domingo = Sim"), incluindo pelo menos 1 colaboradora em cada posto obrigatório: '+sundayPosts().map(p=>POST_NAMES[p]).join(' e ')+'. Depois o app faz o revezamento das outras semanas.':'Escolha primeiro, na Semana 1, quais colaboradoras trabalham no domingo ("Trabalha no domingo = Sim"). Depois o app faz o revezamento das outras semanas.');render()}
const baseOk=()=>{const w0=sector().weeks[0];normalizeWeek(w0);const s=w0.employees.filter(e=>e.sundayWork);if(!s.length)return false;return sundayPosts().every(p=>s.some(e=>e.station===p))};
/* Preenche os domingos das semanas 2-4 a partir da Semana 1, sem substituir semanas que já tenham domingo definido. */
function fillSundays(){
  const weeks=sector().weeks;weeks.forEach(w=>{normalizeWeek(w);sortShifts(w)});
  const k=weeks[0].employees.filter(e=>e.sundayWork).length,filled=[],short=[],noPost=[];
  const worked=i=>weeks.reduce((t,w)=>t+(w.employees[i]&&w.employees[i].sundayWork?1:0),0);
  const works=(w,i)=>!!(w&&w.employees[i]&&w.employees[i].sundayWork);
  weeks.forEach((w,wi)=>{
    if(wi===0||w.employees.some(e=>e.sundayWork))return;
    /* o posto é da colaboradora: nas semanas vazias, quem estiver no PDV herda o posto Pacote/Fiscal/Recepção da Semana 1 */
    const cand=w.employees.map((e,i)=>i).filter(i=>!works(weeks[wi-1],i)&&!works(weeks[wi+1],i)).sort((a,b)=>worked(a)-worked(b)||a-b);
    const pick=[],take=i=>{if(i!==undefined&&!pick.includes(i)&&pick.length<k)pick.push(i)};
    if(hasPosts())sundayPosts().forEach(p=>{const c=cand.find(i=>w.employees[i].station===p);if(c===undefined)noPost.push((wi+1)+' ('+POST_NAMES[p]+')');else take(c)});
    cand.forEach(take);
    pick.forEach(i=>{w.employees[i].sundayWork=true});
    filled.push(wi);if(pick.length<k)short.push(wi+1);
  });
  return{k,filled,short,noPost};
}
function sundayNote(r){return (r.filled.length?'Domingos preenchidos nas semanas '+r.filled.map(x=>x+1).join(', ')+' a partir da Semana 1 (ninguém repete domingo). ':'Nenhuma semana vazia para preencher; os domingos que você definiu foram mantidos. ')+(r.short.length?'Atenção: nas semanas '+r.short.join(', ')+' não há colaboradoras suficientes sem domingo na semana vizinha para repetir a quantidade da Semana 1. ':'')+(r.noPost&&r.noPost.length?'Atenção: faltou colaboradora disponível em '+r.noPost.join(', ')+' para o domingo; defina o posto dessas semanas. ':'')+'Quem não trabalha no domingo ficou com o domingo de folga.'}
function suggestOffDays(){
  if(!baseOk()){needBase();return}
  const r=fillSundays();r.filled.forEach(wi=>suggestOffFor(sector().weeks[wi]));suggestOffFor(week());
  state.notice='Folgas sugeridas nesta semana. '+sundayNote(r)+MOVE_NOTE;render();
}
const SIX_NOTE=' No 6x1, a semana sem domingo recebe uma folga extra no meio da semana: com só 1 folga por semana e domingos alternados a pessoa passaria de 6 dias seguidos de trabalho (art. 67 da CLT).';
function suggestOffAll(){
  if(!baseOk()){needBase();return}
  const r=fillSundays();sector().weeks.forEach(w=>balanceOffs(w,true));
  state.notice='Folgas sugeridas nas 4 semanas. '+sundayNote(r)+MOVE_NOTE;render();
}
function suggestSundays(){
  if(!baseOk()){needBase();return}
  const r=fillSundays();r.filled.forEach(wi=>suggestOffFor(sector().weeks[wi]));
  const counts=sector().weeks.map(w=>w.employees.filter(e=>e.sundayWork).length),min=SUNDAY_MIN[state.selectedSector];
  state.notice=sundayNote(r)+' Colaboradoras por domingo: '+counts.join(' / ')+'.'+(Math.min(...counts)<min?' O mínimo do setor é '+min+' por domingo.':'');render();
}
/* ===== rodízio de TURNOS (cedo/tarde) por posto: Pacote, Fiscal e Recepção. O posto da colaboradora não muda. ===== */

function postCfg(){
  /* vagas cedo/tarde por posto: sem ajuste manual, metade cedo e metade tarde das colaboradoras que estão no posto na semana aberta */
  const s=sector();s.posts=s.posts||{};const out={};
  postKeys().forEach(k=>{
    const c=s.posts[k],n=week().employees.filter(e=>e.station===k).length;
    out[k]=c&&c.custom?{cedo:Math.min(20,Math.max(0,Math.floor(+c.cedo)||0)),tarde:Math.min(20,Math.max(0,Math.floor(+c.tarde)||0))}:{cedo:Math.ceil(n/2),tarde:Math.floor(n/2)};
  });
  return out;
}
function setPostCfg(k,per,v){const s=sector(),cur=postCfg()[k];s.posts=s.posts||{};s.posts[k]={...cur,[per]:Math.max(0,Math.floor(+v)||0),custom:true}}
const postSlots=k=>{const c=postCfg()[k],a=[];for(let i=0;i<c.cedo;i++)a.push('cedo');for(let i=0;i<c.tarde;i++)a.push('tarde');return a};
function periodIdx(w){const early=mins(state.settings.earlyBefore||'09:00'),all=w.shifts.map((s,i)=>i);return{cedo:all.filter(i=>mins(w.shifts[i].start)<early),tarde:all.filter(i=>mins(w.shifts[i].start)>=early)}}
/* Para cada posto, as colaboradoras daquele posto (ordem do número) ocupam as vagas cedo/tarde e na semana seguinte avançam uma vaga:
   todas alternam entre cedo e tarde. Cada posto tem a sua própria contagem; o posto de ninguém muda. */
function applyPostPlan(silent){
  const cfg=postCfg(),weeks=sector().weeks;weeks.forEach(w=>normalizeWeek(w));
  const fail=m=>{toast(m);return false},total=postKeys().reduce((t,k)=>t+postSlots(k).length,0);
  if(!total)return fail('Defina em "Rodízio" quantas colaboradoras de cada posto ficam cedo e à tarde.');
  const ix0=periodIdx(weeks[0]);
  if(postKeys().some(k=>cfg[k].cedo>0)&&!ix0.cedo.length)return fail('Nenhum turno entra antes de '+state.settings.earlyBefore+': não há horário "cedo". Ajuste os turnos ou o horário limite de "cedo".');
  if(postKeys().some(k=>cfg[k].tarde>0)&&!ix0.tarde.length)return fail('Todos os turnos entram antes de '+state.settings.earlyBefore+': não há horário "tarde". Ajuste os turnos ou o horário limite.');
  const notes=[];
  weeks.forEach((w,wi)=>{
    const ix=periodIdx(w),cnt={cedo:0,tarde:0};
    postKeys().forEach(k=>{
      const slots=postSlots(k);if(!slots.length)return;
      const all=w.employees.filter(e=>e.station===k).sort((a,b)=>a.id-b.id);
      if(wi===0&&all.length!==slots.length)notes.push(POST_NAMES[k]+': '+all.length+' colaboradora(s) para '+slots.length+' vaga(s) (mantive a proporção cedo/tarde para todas entrarem)');
      /* todas as colaboradoras do posto entram no rodízio: se o número de vagas não bate com o de colaboradoras, mantém a proporção cedo/tarde.
         A cada semana o grupo avança o número de vagas "cedo", então quem estava cedo vai para a tarde e vice-versa. */
      const M=all.length,C=cfg[k].cedo,T=cfg[k].tarde;if(!M)return;
      const c=M===1?((C>0&&T>0)?(wi%2===0?1:0):(C>0?1:0)):T===0?M:C===0?0:Math.min(M-1,Math.max(1,Math.round(M*C/(C+T)))),step=M===1?0:c>0&&c<M?c:0;
      const mine=[...Array(c).fill('cedo'),...Array(M-c).fill('tarde')];
      const assign=all.map((e,j)=>({e,per:mine[(j+wi*step)%M]}));
      assign.forEach(a=>{if(a.e.restricted&&a.per==='tarde'){const o=assign.find(b=>!b.e.restricted&&b.per==='cedo');if(o){o.per='tarde';a.per='cedo'}}});
      assign.forEach(a=>{const list=ix[a.per];if(list.length)a.e.shift=list[cnt[a.per]++%list.length]});
    });
  });
  if(!silent&&hasPdv())weeks.forEach((w,wi)=>assignPdvs(w,wi,true));
  if(!silent){
    state.notice='Rodízio de turnos aplicado nas 4 semanas: '+postKeys().filter(k=>cfg[k].cedo+cfg[k].tarde>0).map(k=>POST_NAMES[k]+' '+cfg[k].cedo+' cedo / '+cfg[k].tarde+' tarde').join('; ')+'. O posto de cada colaboradora não muda: ela alterna entre cedo e tarde a cada semana.'+(notes.length?' Atenção: '+notes.join('; ')+'.':'');
    render();toast('Rodízio de turnos dos postos aplicado.',true);
  }
  return{ok:true,notes};
}
function postsPanel(){
  if(!hasPosts())return '';
  const c=postCfg(),w=week();
  const row=k=>{const n=w.employees.filter(e=>e.station===k).length,s=postSlots(k).length;return `<span class="post-name">${POST_NAMES[k]}<small class="${n===s||!s?'':'post-warn'}">${n} colaboradora${n===1?'':'s'}</small></span><input type="number" min="0" max="20" data-post="${k}" data-per="cedo" value="${c[k].cedo}" aria-label="${POST_NAMES[k]} cedo" /><input type="number" min="0" max="20" data-post="${k}" data-per="tarde" value="${c[k].tarde}" aria-label="${POST_NAMES[k]} tarde" />`};
  return `<div class="setting-block rotation-block post-plan"><label>Rodízio de turnos dos postos (${postKeys().map(k=>POST_NAMES[k]).join(', ')})</label><p class="helper">O posto de cada colaboradora é o da ficha e não muda; no posto Operadora Caixa, o PDV é escolhido na ficha, semana a semana. Aqui você define, para cada posto, quantas ficam no turno cedo e quantas no turno tarde; elas alternam entre cedo e tarde a cada semana.</p>
  <div class="post-grid"><span></span><b>Cedo</b><b>Tarde</b>${postKeys().map(row).join('')}</div>
  <label class="early-row">Cedo = entrada antes de <input type="time" id="postEarly" value="${state.settings.earlyBefore||'09:00'}" /></label>
  <p class="helper">Dica: a soma de cedo + tarde de cada posto deve ser igual ao número de colaboradoras daquele posto nesta semana.</p>
  <button class="button secondary full" id="applyPosts" type="button">Aplicar rodízio de turnos dos postos nas 4 semanas</button>
  <p class="helper">Só muda o turno de quem está em Pacote, Fiscal ou Recepção; PDVs e demais colaboradoras não são alterados.</p></div>`;
}
/* ===== excluir colaboradora (recalcula numeração, rodízio, folgas e PDVs) ===== */
async function removeEmployee(i){
  const sel=state.selectedSector,weeks=sector().weeks;weeks.forEach(w=>normalizeWeek(w));
  const w0=weeks[0];if(!w0.employees[i])return;
  if(w0.employees.length<=1){toast('O setor precisa ter pelo menos 1 colaboradora.');return}
  const name=w0.employees[i].name;
  if(!await askConfirm('Excluir '+name+' de '+SECTORS[sel]+'?\n\nEla sai das 4 semanas, a numeração é refeita e as folgas'+(hasPdv()?' e os números de PDV':'')+' são recalculados. Domingos e turnos das demais ficam como estão. Você pode desfazer depois na aba Gerar.'))return;
  state.undo={...(state.undo||{}),[sel]:{at:new Date().toISOString(),weeks:clone(weeks),roster:clone(state.roster&&state.roster[sel]||[])}};
  const r=roster();r.splice(i,1);
  weeks.forEach(w=>{if(w.employees.length>i){w.employees.splice(i,1);w.activeCount=w.employees.length;w.rotation=rotation(w.activeCount,w.shifts.length)}});
  normalize();
  weeks.forEach(w=>balanceOffs(w,true));
  if(hasPdv())weeks.forEach((w,wi)=>assignPdvs(w,wi));
  state.notice=name+' foi excluída. Numeração refeita, folgas'+(hasPdv()?' e PDVs':'')+' recalculados nas 4 semanas. Se algum posto obrigatório do domingo ficou sem ninguém, o painel de conformidade avisa.';
  render();toast(name+' excluída. Dá para desfazer na aba Gerar.',true);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b)removeEmployee(+b.dataset.remove)});

/* ===== importar planilha (.xlsx ou .csv): Nome, Setor, Posto (e, se houver, Restrição) ===== */
const normTxt=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function mapSector(t){const n=normTxt(t);if(!n)return null;if(SECTORS[t])return t;if(/caixa|frente|pdv/.test(n))return 'frente-caixa';if(/acougue|frios/.test(n))return 'acougue-frios';if(/horti|fruit|hortifruti/.test(n))return 'horti-fruit';if(/padaria/.test(n))return 'padaria';if(/loja|deposito|reposicao/.test(n))return 'loja-deposito';return null}
function mapPost(sec,t){
  const n=normTxt(t),keys=SECTOR_POSTS[sec]||[];
  if(sec==='frente-caixa'&&(!n||/^(pdv|caixa|operador)/.test(n)))return{station:'caixa',pdv:+(n.match(/\d+/)||[0])[0]||0};
  if(!n)return null;
  const k=keys.find(k=>normTxt(POST_NAMES[k])===n)||keys.find(k=>n.includes(normTxt(POST_NAMES[k])));
  return k?{station:k}:null;
}
function parseCsv(text){
  const first=text.split(/\r?\n/)[0]||'',d=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',',rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}
    else if(c==='"')q=true;else if(c===d){row.push(cell);cell=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}
  if(cell!==''||row.length){row.push(cell);rows.push(row)}
  return rows;
}
/* leitor mínimo de .xlsx (zip + XML) sem bibliotecas externas */
async function unzip(buf){
  const dv=new DataView(buf),u8=new Uint8Array(buf),td=new TextDecoder();let e=u8.length-22;
  while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;
  if(e<0)throw new Error('zip');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out={};
  for(let k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true),name=td.decode(u8.slice(p+46,p+46+nl));
    p+=46+nl+xl+cl;
    if(!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name))continue;
    const ls=off+30+dv.getUint16(off+26,true)+dv.getUint16(off+28,true),data=u8.slice(ls,ls+csize);
    out[name]=td.decode(method===0?data:await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  }
  return out;
}
async function readXlsx(buf){
  const f=await unzip(buf),dp=new DOMParser(),xml=s=>dp.parseFromString(s,'application/xml'),all=(d,t)=>[...d.getElementsByTagNameNS('*',t)];
  const ss=f['xl/sharedStrings.xml']?all(xml(f['xl/sharedStrings.xml']),'si').map(si=>all(si,'t').map(t=>t.textContent).join('')):[];
  const wb=xml(f['xl/workbook.xml']||'<a/>'),rels=xml(f['xl/_rels/workbook.xml.rels']||'<a/>'),relMap={};
  all(rels,'Relationship').forEach(r=>{relMap[r.getAttribute('Id')]=r.getAttribute('Target')});
  let sheets=all(wb,'sheet').map(s=>{const id=s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||s.getAttribute('r:id'),t=(relMap[id]||'').replace(/^\/?(xl\/)?/,'');return{name:s.getAttribute('name'),path:'xl/'+t}}).filter(s=>f[s.path]);
  if(!sheets.length)sheets=Object.keys(f).filter(k=>k.startsWith('xl/worksheets/')).sort().map((k,i)=>({name:'Planilha '+(i+1),path:k}));
  const col=r=>{let n=0;for(const ch of r.replace(/\d/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1};
  return sheets.map(s=>{
    const rows=[];
    all(xml(f[s.path]),'row').forEach(r=>{const arr=[];all(r,'c').forEach(c=>{const t=c.getAttribute('t'),v=all(c,'v')[0],val=t==='s'?ss[+(v&&v.textContent)]:t==='inlineStr'?all(c,'t').map(x=>x.textContent).join(''):(v?v.textContent:'');arr[col(c.getAttribute('r'))]=val==null?'':val});rows.push([...arr].map(x=>x==null?'':x))});
    return{name:s.name,rows};
  });
}
/* departamento (ex.: da folha de pagamento) -> setor + posto */
const DEPT_MAP=[
  [/frente|caixa/,'frente-caixa','caixa'],[/pacote/,'frente-caixa','pacote'],[/fiscal/,'frente-caixa','fiscal'],[/recepc/,'frente-caixa','recepcao'],
  [/repositor.*frios/,'acougue-frios','repositorfrios'],[/acougue/,'acougue-frios','acougue'],[/frios/,'acougue-frios','frios'],
  [/producao/,'padaria','producao'],[/atendimento/,'padaria','atendimento'],[/padaria/,'padaria',null],
  [/etiqueta/,'loja-deposito','trocaetiqueta'],[/cartaz/,'loja-deposito','cartaz'],[/reposic/,'loja-deposito','reposicao'],[/deposito/,'loja-deposito','deposito'],[/limpeza/,'loja-deposito','limpeza'],
  [/flv|horti|fruit|hortifruti/,'horti-fruit','equipe'],
  [/administrativ|geral|escritorio|loja/,'loja-deposito',null]
];
function mapDept(t){const n=normTxt(t);if(!n)return null;const m=DEPT_MAP.find(d=>d[0].test(n));return m?{sec:m[1],post:m[2]}:null}
function nomeBonito(n){n=String(n).trim().replace(/\s+/g,' ');if(n!==n.toUpperCase())return n;return n.toLowerCase().split(' ').map((w,i)=>i>0&&/^(de|da|do|das|dos|e)$/.test(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}
function planilhaParaLista(sheets){
  const bySector={},warn=[],cur=state.selectedSector;
  sheets.forEach(sh=>{
    let rows=sh.rows.filter(r=>r.some(c=>String(c).trim()));if(!rows.length)return;
    /* o cabeçalho pode não estar na 1ª linha (ex.: "Empresa: ..." no topo) */
    const hi=rows.slice(0,10).findIndex(r=>r.some(c=>/^(nome|colaborador|colaboradora|funcionario|funcionaria)s?$/.test(normTxt(c))));
    const hasHead=hi>=0||rows[0].some(c=>/setor|posto|departamento/.test(normTxt(c)));
    const hr=Math.max(0,hi),head=(rows[hr]||[]).map(normTxt),find=re=>head.findIndex(h=>re.test(h));
    const ci={name:hasHead?find(/^(nome|colaborador|funcionario)/):0,sector:hasHead?find(/setor|secao|departamento/):1,post:hasHead?find(/posto|funcao|cargo/):2,restr:hasHead?find(/restri|estudante|mae/):-1};
    if(hasHead&&ci.name<0)ci.name=0;
    const fallback=mapSector(sh.name)||cur;
    rows.slice(hasHead?hr+1:0).forEach(r=>{
      const name=nomeBonito(r[ci.name]||'');if(!name||/^\d/.test(name)||/^(total|empresa)\b/i.test(name))return;
      const secTxt=ci.sector>=0?String(r[ci.sector]||'').trim():'',postTxt=ci.post>=0?String(r[ci.post]||'').trim():'';
      let sec=null,post=null;
      const dep=secTxt?mapDept(secTxt):null;
      if(dep){sec=dep.sec;if(dep.post&&(SECTOR_POSTS[sec]||[]).includes(dep.post))post={station:dep.post}}
      else if(secTxt){sec=mapSector(secTxt);if(!sec){warn.push(name+': setor "'+secTxt+'" não reconhecido (ignorada)');return}}
      else sec=fallback;
      if(postTxt){const m=mapPost(sec,postTxt);if(m)post=m;else warn.push(name+': posto "'+postTxt+'" não existe em '+SECTORS[sec]+' (usei o padrão)')}
      else if(!post&&sec==='frente-caixa')post={station:'caixa',pdv:0};
      const rs=ci.restr>=0?/^(s|sim|x|1|estudante|mae|true)/.test(normTxt(r[ci.restr])):false;
      if(!secTxt&&ci.sector>=0)warn.push(name+': sem departamento (colocada em '+SECTORS[sec]+')');
      (bySector[sec]=bySector[sec]||[]).push({name,post,restricted:rs});
    });
  });
  return{bySector,warn};
}
function aplicarPlanilha(res){
  const orig=state.selectedSector,secs=Object.keys(res.bySector);
  secs.forEach(sec=>{
    state.selectedSector=sec;const L=res.bySector[sec].slice(0,50),weeks=sector().weeks,n=L.length;
    state.undo={...(state.undo||{}),[sec]:{at:new Date().toISOString(),weeks:clone(weeks),roster:clone(state.roster&&state.roster[sec]||[])}};
    weeks.forEach(w=>{w.activeCount=n;w.employees=(w.employees||[]).slice(0,n);normalizeWeek(w);w.rotation=rotation(n,w.shifts.length)});
    state.roster=state.roster||{};state.roster[sec]=L.map((x,i)=>({name:x.name,restricted:x.restricted,station:x.post?x.post.station:stationOk(null,i+1)}));
    weeks.forEach(w=>w.employees.forEach((e,i)=>{const x=L[i];e.name=x.name;e.restricted=x.restricted;if(x.post){e.station=x.post.station;if(x.post.station==='caixa'&&x.post.pdv)e.pdv=Math.min(w.pdvCount,x.post.pdv)}}));
    normalize();
  });
  state.selectedSector=secs.includes(orig)?orig:secs[0];state.selectedWeek=0;
  const msg='Planilha importada: '+secs.map(s=>SECTORS[s]+' ('+res.bySector[s].length+')').join(', ')+'. Nomes, setor, posto e restrição foram aplicados nas 4 semanas. Use "Sugerir folgas" ou "Gerar" para montar a escala; dá para desfazer na aba Gerar.'+(res.warn.length?' Avisos: '+res.warn.slice(0,5).join('; ')+(res.warn.length>5?'…':'')+'.':'');
  state.notice=msg;render();toast('Planilha importada.',true);
}
async function importarPlanilha(file){
  try{
    let sheets;
    if(/\.csv$/i.test(file.name)){const b=await file.arrayBuffer();let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(_){t=new TextDecoder('windows-1252').decode(b)}sheets=[{name:'',rows:parseCsv(t.replace(/^﻿/,''))}]}
    else if(/\.xlsx$/i.test(file.name))sheets=await readXlsx(await file.arrayBuffer());
    else{toast('Use um arquivo .xlsx ou .csv (se for .xls, salve como .xlsx).');return}
    const res=planilhaParaLista(sheets),secs=Object.keys(res.bySector);
    if(!secs.length){toast('Não encontrei colaboradoras na planilha. Use as colunas Nome, Setor e Posto.');return}
    if(!await askConfirm('Importar '+secs.map(s=>res.bySector[s].length+' em '+SECTORS[s]).join(', ')+'?\n\nIsso substitui nomes, quantidade, postos e restrições desses setores nas 4 semanas (turnos, folgas e domingos de quem já existe ficam por ordem). Você pode desfazer depois na aba Gerar.'+(res.warn.length?'\n\nAvisos:\n- '+res.warn.slice(0,6).join('\n- '):'')))return;
    aplicarPlanilha(res);
  }catch(err){console.error(err);toast('Não consegui ler a planilha. Confira se é um .xlsx ou .csv válido.')}
}
async function baixarModelo(){
  const rows=[['Nome','Setor','Posto','Estudante/Mãe (sim ou vazio)'],['Maria Souza','Frente de Caixa','Operadora Caixa',''],['Ana Lima','Frente de Caixa','Fiscal',''],['João Silva','Açougue e Frios','Frios',''],['Paula Reis','Padaria','Limpeza','sim']],
    text='\uFEFF'+rows.map(r=>r.join(';')).join('\r\n');
  try{
    const d=window.claude&&claude.use?await claude.use('downloads'):null;
    if(d){await d.save({filename:'modelo-colaboradoras.csv',data:text});return}
  }catch(err){if(err&&err.code==='declined')return}
  const blob=new Blob([text],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='modelo-colaboradoras.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
document.addEventListener('change',e=>{if(e.target.id==='xlsxFile'&&e.target.files[0]){importarPlanilha(e.target.files[0]);e.target.value=''}});
document.addEventListener('click',e=>{if(e.target.closest('#modelButton'))baixarModelo()});
/* ===== análise de folgas: cobertura por dia, turno e posto, e o que acontece se mais 1 folgar ===== */
function renderOffAnalysis(){
  const el=document.getElementById('offAnalysis');if(!el)return;
  const w=week(),wi=state.selectedWeek,emps=w.employees,N=emps.length;
  const works=(e,d)=>worksOn(e,d[0],wi),closed=d=>closedDay(d[0],wi);
  const cls=n=>n<=1?'crit':n===2?'warn':'ok';
  const cell=(n,closedDay_)=>closedDay_?'<td class="oa-closed">Fechado</td>':`<td class="oa-${cls(n)}"><b>${n}</b><small>${n>0?'−1 → '+(n-1):'sem cobertura'}</small></td>`;
  const dayHead='<th></th>'+DAYS.map(d=>`<th>${d[1]}<small>${short(date(d[0]))}</small></th>`).join('');
  const total=DAYS.map(d=>closed(d)?null:emps.filter(e=>works(e,d)).length);
  const offN=DAYS.map((d,i)=>total[i]===null?null:N-total[i]);
  // por turno
  const shiftRows=w.shifts.map((s,i)=>{const mem=emps.filter(e=>e.shift===i);return `<tr><th class="oa-row"><i class="shift-pill" style="background:${s.color}"></i>${escape(s.name)}<small>${s.start}–${s.end} · ${mem.length} colab.</small></th>${DAYS.map(d=>d[0]==='domingo'?'<td class="oa-closed" title="Veja o quadro de domingo">—</td>':cell(mem.filter(e=>works(e,d)).length,closed(d))).join('')}</tr>`}).join('');
  const movRow=`<tr><th class="oa-row">Movimento esperado<small>editável em Gerar</small></th>${DAYS.map(d=>`<td class="oa-mov oa-mov-${movement()[d[0]]}">${movLabel(d[0])}</td>`).join('')}</tr>`;
  const totalRow=`<tr class="oa-total"><th class="oa-row">Total<small>${N} colab.</small></th>${DAYS.map((d,i)=>closed(d)?'<td class="oa-closed">Fechado</td>':`<td class="oa-${total[i]<Math.ceil(N*0.5)?'warn':'ok'}"><b>${total[i]}</b><small>${offN[i]} de folga</small></td>`).join('')}</tr>`;
  // por posto
  const posts=hasPosts()?postKeys().map(k=>({k,mem:emps.filter(e=>e.station===k)})).filter(p=>p.mem.length):[];
  const postRows=posts.map(p=>`<tr><th class="oa-row">${POST_NAMES[p.k]}<small>${p.mem.length} colab.</small></th>${DAYS.map(d=>cell(p.mem.filter(e=>works(e,d)).length,closed(d))).join('')}</tr>`).join('');
  // quem folga
  const whoRows=DAYS.map((d,i)=>{if(closed(d))return `<tr><th class="oa-row">${d[1]} ${short(date(d[0]))}</th><td>Fechado (feriado)</td></tr>`;const off=emps.filter(e=>!works(e,d));return `<tr><th class="oa-row">${d[1]} ${short(date(d[0]))}<small>${off.length} de folga</small></th><td>${off.length?off.map(e=>escape(e.name)+(hasPosts()?' <small>('+escape(POST_NAMES[e.station]||'')+')</small>':'')).join(', '):'—'}</td></tr>`}).join('');
  // observações
  const obs=[],weekdays=DAYS.map((d,i)=>({d,i})).filter(x=>x.d[0]!=='domingo'&&total[x.i]!==null);
  if(weekdays.length){
    const mn=weekdays.reduce((a,b)=>total[b.i]<total[a.i]?b:a),mx=weekdays.reduce((a,b)=>total[b.i]>total[a.i]?b:a);
    obs.push(`Dia com menos gente: <b>${mn.d[0]}</b> (${total[mn.i]} trabalhando, ${offN[mn.i]} de folga). Dia com mais gente: <b>${mx.d[0]}</b> (${total[mx.i]}).`);
    if(total[mx.i]-total[mn.i]>2)obs.push(`As folgas estão desiguais: <b>${mn.d[0]}</b> tem ${total[mx.i]-total[mn.i]} pessoas a menos que <b>${mx.d[0]}</b>. Mover uma folga de ${mn.d[0]} para ${mx.d[0]} equilibra a semana.`);
    const lowShare=weekdays.filter(x=>offN[x.i]>N/3);if(lowShare.length)obs.push(`Mais de um terço da equipe folga em: ${lowShare.map(x=>x.d[0]+' ('+offN[x.i]+')').join(', ')}.`);
  }
  const sat=emps.filter(e=>!works(e,DAYS[5]));if(!closed(DAYS[5]))obs.push(`Folgas no sábado: <b>${sat.length}</b> de ${N} (o ideal é evitar o sábado).`);
  const si=6;if(total[si]!==null){const mn=SUNDAY_MIN[state.selectedSector]||0;obs.push(`Domingo: <b>${total[si]}</b> colaboradora(s) trabalhando`+(mn?` (mínimo sugerido ${mn})`:'')+`.${total[si]<mn?' <b>Abaixo do mínimo.</b>':''}`)}
  posts.forEach(p=>{if(p.mem.length===1)obs.push(`<b>${POST_NAMES[p.k]}</b> tem só 1 colaboradora: na folga dela o posto fica sem ninguém.`);else{const low=DAYS.filter(d=>!closed(d)&&d[0]!=='domingo'&&p.mem.filter(e=>works(e,d)).length<=1).map(d=>d[0]);if(low.length)obs.push(`<b>${POST_NAMES[p.k]}</b> fica com 1 ou nenhuma pessoa em: ${low.join(', ')}.`)}});
  w.shifts.forEach((s,i)=>{const mem=emps.filter(e=>e.shift===i),low=DAYS.filter(d=>!closed(d)&&d[0]!=='domingo'&&mem.length&&mem.filter(e=>works(e,d)).length<=1).map(d=>d[0]);if(low.length)obs.push(`${escape(s.name)} fica com 1 ou nenhuma pessoa em: ${low.join(', ')}.`)});
  const perPerson=emps.filter(e=>w.model==='5x2'?effOff(e).length!==2:effOff(e).length<1).length;
  if(perPerson)obs.push(`${perPerson} colaboradora(s) sem a quantidade de folgas do modelo ${w.model}.`);
  // conferência: cada colaboradora tem 2 folgas por semana no 5x2 (o domingo não trabalhado conta como folga)
  const per=emps.map(e=>({e,n:DAYS.filter(d=>!closed(d)&&!works(e,d)).length,hol:DAYS.filter(d=>closed(d)).length}));
  const sumOff=per.reduce((t,x)=>t+x.n,0),expected=w.model==='5x2'?2:null;
  const holN=DAYS.filter(d=>closed(d)).length;
  if(expected){const bad=per.filter(x=>x.n!==expected);obs.push(`Conferência: ${N} colaboradoras × 2 folgas = <b>${2*N}</b>; a soma das folgas da semana é <b>${sumOff}</b>.`+(sumOff===2*N&&!bad.length?' Está certo (o domingo não trabalhado conta como uma das 2 folgas).':'')+(bad.length?' Fora do padrão: '+bad.map(x=>escape(x.e.name)+' ('+x.n+')').join(', ')+'.':'')+(holN?' Feriado com loja fechada não entra nessa conta.':''))}
  else{const bad=per.filter(x=>x.n<1||x.n>2);obs.push(`Conferência (6x1): a soma das folgas da semana é <b>${sumOff}</b> (quem trabalha no domingo tem 1 folga na semana; quem não trabalha tem o domingo mais 1 folga extra).`+(bad.length?' Fora do padrão: '+bad.map(x=>escape(x.e.name)+' ('+x.n+')').join(', ')+'.':''))}
  if(!obs.length)obs.push('Sem pontos de atenção nesta semana.');
  el.innerHTML=`<div class="section-heading"><div><p class="eyebrow">ANÁLISE DE FOLGAS · SEMANA ${wi+1}</p><h2>Quem folga e quanto sobra em cada turno</h2><p>Cada quadro mostra quantas colaboradoras trabalham e o que sobra se mais 1 folgar (ou faltar). Vermelho: ficaria com 0 ou 1; amarelo: ficaria com 1.</p></div></div>
  <div class="oa-obs"><h3>Pontos de atenção</h3><ul>${obs.map(o=>'<li>'+o+'</li>').join('')}</ul></div>
  <h3 class="oa-title">Por turno</h3><div class="table-wrap"><table class="oa-table"><thead><tr>${dayHead}</tr></thead><tbody>${movRow}${shiftRows}${totalRow}</tbody></table></div>
  ${posts.length?`<h3 class="oa-title">Por posto</h3><div class="table-wrap"><table class="oa-table"><thead><tr>${dayHead}</tr></thead><tbody>${postRows}</tbody></table></div>`:''}
  <h3 class="oa-title">Quem está de folga em cada dia</h3><div class="table-wrap"><table class="oa-table oa-who"><tbody>${whoRows}</tbody></table></div>`;
}
function loadInfo(){
  const row=(m)=>`<li${week().model===m?' class="current"':''}><strong>${m}</strong>: ${hm(workDuration(m))} por dia · ${hm(workDuration(m)*(m==='6x1'?6:5))} por semana</li>`;
  return `<div class="load-info"><strong>Carga horária obrigatória (limite semanal hoje: ${weeklyLimit()}h)</strong><ul>${row('5x2')}${row('6x1')}</ul><p class="helper">A saída é calculada (entrada + carga + 2h de almoço) para nunca ficar abaixo da carga. Hora extra: no máximo 1h30 por dia, em qualquer modelo.</p></div>`;
}
function sundayConflict(e){const ws=sector().weeks,i=state.selectedWeek;for(const k of [i-1,i+1]){const o=ws[k]&&ws[k].employees[e.id-1];if(o&&o.sundayWork)return k}return -1}
let toastTimer;function toast(msg,ok){const t=document.getElementById('toast');t.style.background=ok?'#14845a':'';t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.hidden=true},7000)}
/* ===== v9: conformidade CLT, EC 141/2026 e CCT dos mercados de Campo Mourão ===== */
const HOL={};
function easterDate(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,dd=Math.floor(b/4),ee=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-dd-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*ee+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(y,month-1,day,12);
}
function holidays(y){
  if(HOL[y])return HOL[y];
  const m={},add=(mo,d,name,closed)=>{m[y+'-'+pad(mo)+'-'+pad(d)]={name,closed:!!closed}};
  add(1,1,'Ano-Novo',1);add(4,21,'Tiradentes');add(5,1,'Dia do Trabalhador',1);add(9,7,'Independência');add(10,12,'N. Sra. Aparecida');add(11,2,'Finados');add(11,15,'Proclamação da República');add(11,20,'Consciência Negra');add(12,19,'Emancipação do Paraná');add(12,25,'Natal',1);
  const easter=easterDate(y),shiftDate=n=>{const t=new Date(easter);t.setDate(t.getDate()+n);return t};
  m[iso(shiftDate(-2))]={name:'Sexta-feira Santa',closed:false};m[iso(easter)]={name:'Páscoa',closed:true};
  return HOL[y]=m;
}
function extraHoliday(d){
  for(const l of String(state.settings.extraText||'').split(/\n|;/).map(x=>x.trim()).filter(Boolean)){
    const m=l.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);if(!m)continue;
    let y=m[3]?+m[3]:0;if(y&&y<100)y+=2000;
    if(+m[1]===d.getDate()&&+m[2]===d.getMonth()+1&&(!y||y===d.getFullYear()))return{name:'Feriado cadastrado',closed:false};
  }
  return null;
}
const holiday=d=>holidays(d.getFullYear())[iso(d)]||extraHoliday(d);
const closedDay=(key,idx=state.selectedWeek)=>!!holiday(date(key,idx))?.closed;
const holidayTag=(key,idx=state.selectedWeek)=>{const h=holiday(date(key,idx));return h?`<small class="holiday-tag">${escape(h.name)}${h.closed?' · fechado':''}</small>`:''};
const hm=n=>Math.floor(n/60)+'h'+(n%60?pad(n%60):'');
const worksOn=(e,key,wi=state.selectedWeek)=>!closedDay(key,wi)&&(key==='domingo'?e.sundayWork:!e.offDays.includes(key));
const NATAL_COMP=['2026-12-26','2027-01-02','2027-02-08','2027-02-09'];

function compliance(){
  const out=[],S=state.settings,weeks=sector().weeks,all=weeks.map((_,i)=>i);
  const add=(level,text,wk)=>out.push({level,text,weeks:wk});
  if(mins(S.weekClose)>1320)add('atenção','Fechamento de segunda a sábado após 22h: acima do horário permitido aos mercados pela CCT (8h às 22h).',[]);
  if(mins(S.sundayClose)>1080)add('atenção','Fechamento aos domingos após 18h: acima do horário permitido aos mercados pela CCT (8h às 18h).',[]);
  weeks.forEach((w,wi)=>{
    const L='Semana '+(wi+1)+': ',dur=workDuration(w.model,wi),limit=weeklyLimit(wi);
    if(w.model==='6x1'&&limit<44)add('atenção',L+'o modelo 6x1 não garante os 2 dias de descanso semanal da EC 141/2026 (em vigor desde 16/12/2026); só é admitido com compensação prevista em norma coletiva. Prefira 5x2.',[wi]);
    w.employees.forEach(e=>{const m=weekMin(e,w,wi);if(m>limit*60)add('erro',L+e.name+': carga semanal de '+hm(m)+' acima do limite de '+limit+'h.',[wi])});
    w.shifts.forEach(s=>{
      const startM=mins(s.start),before=mins(s.lunchStart)-startM,after=dur-before,endAbs=startM+dur+120,nm=s.name+' ('+s.start+')';
      if(before<=0||after<=0)add('erro',L+nm+': o horário de almoço precisa ficar entre a entrada e a saída.',[wi]);
      else{
        if(before>360)add('erro',L+nm+': mais de 6h seguidas de trabalho antes do almoço (art. 71 da CLT exige intervalo).',[wi]);
        if(after>360)add('erro',L+nm+': mais de 6h seguidas de trabalho depois do almoço (art. 71 da CLT).',[wi]);
      }
      if(endAbs>1320)add('atenção',L+nm+': a jornada termina às '+s.end+', após 22h — há adicional noturno (art. 73 da CLT) e o horário excede o limite dos mercados na CCT.',[wi]);
      if(startM<300)add('atenção',L+nm+': a jornada começa antes das 5h — há adicional noturno (art. 73 da CLT).',[wi]);
      const names=w.employees.filter(e=>e.restricted&&e.shift===w.shifts.indexOf(s)).map(e=>e.name);
      if(endAbs>1080&&names.length)add('erro',L+names.join(', ')+' (estudante/mãe com restrição) escalada até '+s.end+'; a CCT protege contra escala após 18h.',[wi]);
    });
    DAYS.forEach(d=>{
      const h=holiday(date(d[0],wi));if(!h)return;const when=short(date(d[0],wi));
      if(h.closed){add('info',L+h.name+' ('+when+'): comércio fechado (CCT dos mercados) — folga automática para todas, sem descontar das folgas obrigatórias.',[wi]);return}
      const n=w.employees.filter(e=>worksOn(e,d[0],wi)).length;if(!n)return;
      add('info',L+h.name+' ('+when+'): '+n+' escalada'+(n===1?'':'s')+'. Trabalho em feriado nos mercados: horas com acréscimo de 100% (CCT).',[wi]);
    });
    NO_SAME_OFF.forEach(k=>{const grp=w.employees.filter(e=>e.station===k);if(grp.length<2)return;const clash=[];DAYS.forEach(d=>{if(d[0]==='domingo'||closedDay(d[0],wi))return;const off=grp.filter(e=>e.offDays.includes(d[0]));if(off.length>1)clash.push(d[0]+' ('+off.map(e=>e.name).join(' e ')+')')});if(clash.length)add(grp.length<=3?'erro':'atenção',L+POST_NAMES[k]+': mais de uma colaboradora de folga no mesmo dia: '+clash.join('; ')+'.'+(grp.length>3?' Com mais de 3 colaboradoras no posto, isso pode ser inevitável.':''),[wi])});
    const sunW=w.employees.filter(e=>e.sundayWork&&!closedDay('domingo',wi));
    if(sunW.length){
      const pl=sundayPlan(w);
      if(pl.len<=0)add('erro',L+'domingo: a saída precisa ser depois da entrada.',[wi]);
      if(pl.brk&&pl.work>600)add('erro',L+'domingo: jornada de '+hm(pl.work)+' trabalhadas passa do limite de 10h por dia (art. 59 da CLT).',[wi]);
      if(pl.brk&&pl.work>0&&pl.work<workDuration(w.model,wi))add('atenção',L+'domingo dia todo: '+hm(pl.work)+' trabalhadas, abaixo da carga diária do modelo ('+hm(workDuration(w.model,wi))+').',[wi]);
      if(!pl.brk&&pl.len>360)add('erro',L+'domingo: mais de 6h seguidas sem intervalo; use o tipo "Dia todo (com almoço)".',[wi]);
      if(pl.en>mins(S.sundayClose))add('atenção',L+'domingo: a jornada termina às '+time(pl.en)+', depois do limite de domingo ('+S.sundayClose+').',[wi]);
      sundayPosts().forEach(p=>{if(!sunW.some(e=>e.station===p))add('erro',L+'domingo sem '+POST_NAMES[p]+': escale pelo menos 1 colaboradora no posto '+POST_NAMES[p]+'.',[wi])});
      const rs=sunW.filter(e=>e.restricted).map(e=>e.name);
      if(rs.length&&pl.en>1080)add('erro',L+rs.join(', ')+' (estudante/mãe com restrição) escalada no domingo até '+time(pl.en)+'; a CCT protege contra escala após 18h.',[wi]);
    }
    NATAL_COMP.forEach(iso0=>{
      const day=DAYS.find(d=>iso(date(d[0],wi))===iso0);
      if(day)add('info',L+short(date(day[0],wi))+': folga integral de compensação natalina para quem trabalhou nas datas natalinas (resumo da CCT na imprensa — confirme no texto assinado).',[wi]);
    });
  });
  const n=Math.min(...weeks.map(w=>w.employees.length));
  for(let i=0;i<n;i++){
    const emps=weeks.map(w=>w.employees[i]),name=emps[0].name,flags=emps.map(e=>e.sundayWork);
    const offs=flags.filter(f=>!f).length;
    if(offs<2)add('erro',name+': só tem '+offs+' domingo'+(offs===1?'':'s')+' de folga nas 4 semanas; a CCT exige no mínimo 2 por mês.',all);
    for(let k=0;k<flags.length-1;k++)if(flags[k]&&flags[k+1])add('erro','ALERTA — '+name+' está escalada em dois domingos seguidos (semanas '+(k+1)+' e '+(k+2)+', '+short(date('domingo',k))+' e '+short(date('domingo',k+1))+'). Não é permitido repetir domingo: a CCT e o art. 386 da CLT pedem revezamento.',[k,k+1]);
    let run=0,startDay=0;
    const seq=[];emps.forEach((e,wi)=>DAYS.forEach(d=>seq.push(worksOn(e,d[0],wi))));
    seq.forEach((v,di)=>{
      if(v){if(!run)startDay=di;run++}
      if((!v||di===seq.length-1)&&run>6){
        const endDay=v?di:di-1,ws=[];for(let x=Math.floor(startDay/7);x<=Math.floor(endDay/7);x++)ws.push(x);
        add('erro',name+': '+run+' dias seguidos sem descanso (semanas '+(ws[0]+1)+(ws.length>1?' a '+(ws[ws.length-1]+1):'')+'); o descanso de 24h deve ocorrer ao menos a cada 6 dias (art. 67 da CLT).',ws);
      }
      if(!v)run=0;
    });
  }
  return out;
}
function renderCompliance(){
  const w=week(),limit=weeklyLimit(),dur=workDuration(w.model),days=w.model==='6x1'?6:5,list=compliance(),order={erro:0,'atenção':1,info:2},label={erro:'Erro','atenção':'Atenção',info:'Informação'};
  const phase=limit===44?'Hoje: 44h semanais e 1 dia de descanso. A partir de 16/12/2026 (EC 141/2026): 42h e 2 dias de descanso; a partir de 16/12/2027: 40h.':limit===42?'EC 141/2026 em vigor: limite de 42h semanais e 2 dias de descanso (um, preferencialmente, no domingo). Em 16/12/2027 o limite cai para 40h.':'EC 141/2026 na fase final: limite de 40h semanais e 2 dias de descanso.';
  const sorted=[...list].sort((a,b)=>order[a.level]-order[b.level]),errors=list.filter(x=>x.level==='erro').length;
  const items=sorted.length?sorted.map(x=>`<article class="finding ${x.level==='atenção'?'atencao':x.level}"><span class="finding-level">${label[x.level]}</span><p>${escape(x.text)}</p></article>`).join(''):'<p class="empty-alert">Nenhuma pendência encontrada nas quatro semanas deste setor.</p>';
  document.getElementById('compliancePanel').innerHTML=`<div class="section-heading"><div><p class="eyebrow">CONFORMIDADE TRABALHISTA</p><h2>CLT, EC 141/2026 e CCT de Campo Mourão</h2><p>${phase}</p></div><span class="tag ${errors?'tag-error':''}">${errors?errors+' erro'+(errors===1?'':'s'):'Sem erros'}</span></div>
  <div class="legal-cards"><div><strong>${hm(dur*days)}</strong><span>Jornada semanal do modelo ${w.model} (limite ${limit}h)</span></div><div><strong>${hm(dur)}</strong><span>Jornada diária${dur>480?' — acima de 8h, exige compensação em norma coletiva (art. 59 da CLT)':''}</span></div><div><strong>${neededOff()}</strong><span>Dia${neededOff()===1?'':'s'} de folga por semana neste modelo</span></div><div><strong>${hm(dur+EXTRA_MAX)}</strong><span>Jornada máxima por dia com até 1h30 de hora extra (limite legal: 10h)</span></div></div>
  ${state.notice?`<p class="notice-line">${escape(state.notice+(sector().weeks.some(x=>x.model==='6x1')?SIX_NOTE:''))}</p>`:''}
  <div class="findings">${items}</div>
  <details class="rules"><summary>Regras consideradas e fontes</summary><ul>
  <li><strong>CLT art. 71:</strong> intervalo de 1h a 2h em jornadas acima de 6h; mais de 2h só por acordo escrito ou norma coletiva; sem trabalho contínuo acima de 6h.</li>
  <li><strong>CLT art. 67:</strong> descanso semanal de 24h consecutivas — o app aponta mais de 6 dias seguidos de trabalho, inclusive na virada de semana. O intervalo de 11h entre jornadas (art. 66) é respeitado porque o turno é fixo em cada semana.</li>
  <li><strong>CLT art. 73:</strong> trabalho entre 22h e 5h tem adicional noturno.</li>
  <li><strong>EC 141/2026:</strong> 44h e 1 dia de descanso até 15/12/2026; 42h e 2 dias a partir de 16/12/2026; 40h a partir de 16/12/2027. O app ajusta a saída calculada de cada semana pela data.</li>
  <li><strong>CCT dos mercados (Campo Mourão, 2026/2027):</strong> domingos alternados para as trabalhadoras e no mínimo 2 domingos de descanso por mês; abono de R$ 94 por domingo; feriado com 100% de acréscimo; sem atendimento em Natal, Ano-Novo, Páscoa e 1º de maio; mercados de 8h às 22h (domingo até 18h); estudantes e mães sem escala após 18h mediante comprovação.</li>
  <li><strong>Aviso:</strong> o texto integral da CCT (intervalos, banco de horas) não foi consultado; os pontos da CCT vêm de reportagens sobre a assinatura. O sindicato negocia um aditivo para a jornada 5x2. Use como apoio e confirme com o Sindiempresarial/Sindecam ou com o jurídico.</li>
  <li>Fontes: <a href="https://crn1.com.br/2026/10/sindiempresarial-fecha-convencoes-coletivas-com-reajuste-de-55-e-define-horarios-do-comercio-ate-2027" target="_blank" rel="noopener">CRN1</a>, <a href="https://www.tribunadointerior.com.br/campo-mourao/convencoes-do-comercio-definem-novos-salarios-e-horarios-de-fim-de-ano/" target="_blank" rel="noopener">Tribuna do Interior</a>, <a href="https://www12.senado.leg.br/noticias/materias/2026/10/16/congresso-promulga-o-fim-da-escala-6x1-e-aposentadoria-de-agentes-de-saude" target="_blank" rel="noopener">Agência Senado</a>.</li></ul></details>`;
}

document.addEventListener('change',event=>{const t=event.target,w=week();if(t.id==='sectorSelect'){state.selectedSector=t.value;render();return}if(t.id==='weekClose'||t.id==='sundayClose'){if(t.value)state.settings[t.id]=t.value;render();return}if(t.id==='extraHolidays'){state.settings.extraText=t.value;render();return}if(t.dataset.post!==undefined){setPostCfg(t.dataset.post,t.dataset.per,t.value);render();return}if(t.id==='postEarly'){if(t.value)state.settings.earlyBefore=t.value;render();return}if(t.id==='genShifts'){state.gen.shifts=t.value;render();return}if(t.id==='genPdv'){state.gen.pdv=t.checked;return}if(t.id==='genPosts'){state.gen.posts=t.checked;return}if(t.id==='weekStart'){state.baseMonday=monday(t.value);render();return}if(t.id==='activeEmployees'){setActive(t.value);return}if(t.id==='pdvCount'){setPdv(t.value);return}if(t.id==='shiftCount'){setShiftCount(t.value);return}if(t.id==='rotationEnabled'){w.rotation.enabled=t.checked;w.rotation.message=t.checked?'Rodízio ativado. Configure as quantidades e aplique quando desejar.':'Rodízio desativado; a escala permanece manual.';render();return}if(t.dataset.rotationCount!==undefined){w.rotation.counts[+t.dataset.rotationCount]=Math.max(0,+t.value||0);w.rotation.message='';render();return}if(t.dataset.mov!==undefined){const s=sector();s.movement={...movement(),[t.dataset.mov]:t.value};render();return}if(t.dataset.sunday!==undefined){const sd=w.sunday,f=t.dataset.sunday;if(f==='mode'){sd.mode=t.value;if(t.value==='meio'){sd.start='07:40';sd.end='12:00'}else{sd.start='07:00';sd.lunchStart='11:00';sd.end=plus('07:00',workDuration(w.model,state.selectedWeek)+120)}}else if(t.value){if(f==='start'&&sd.mode==='dia'){const delta=mins(t.value)-mins(sd.start);sd.end=time((mins(sd.end)+delta+1440)%1440)}sd[f]=t.value}if(sd.mode==='dia'){const st=mins(sd.start),ls=mins(sd.lunchStart),c=Math.min(st+360,Math.max(st+60,ls));if(c!==ls){toast('Almoço do domingo ajustado para '+time(c)+': não pode haver mais de 6h seguidas sem intervalo.');sd.lunchStart=time(c)}}render();return}if(t.dataset.shift!==undefined){const s=w.shifts[+t.dataset.shift],f=t.dataset.field,dur=workDuration(w.model),oldStart=s.start;if(!t.value){render();return}s[f]=t.value;let ls=mins(s.lunchStart);if(f==='start')ls+=mins(s.start)-mins(oldStart);const lo=mins(s.start)+Math.max(60,dur-360),hi=mins(s.start)+360,c=Math.min(hi,Math.max(lo,ls));if(c!==ls&&f==='lunchStart')toast('Almoço ajustado para '+time(c)+': não pode haver mais de 6h seguidas sem intervalo e a jornada deve cumprir a carga de '+hm(dur)+'.');s.lunchStart=time(c);sync(s);render();return}if(t.dataset.off!==undefined){const e=w.employees[+t.dataset.employee],day=t.dataset.off,need=offLimit(e);if(t.checked&&!e.offDays.includes(day)){if(e.offDays.length>=need){t.checked=false;return}if(NO_SAME_OFF.includes(e.station)){const grp=w.employees.filter(x=>x.station===e.station),other=grp.find(x=>x!==e&&x.offDays.includes(day));if(other&&grp.length<=3){t.checked=false;toast('Não é permitido: '+other.name+' ('+POST_NAMES[e.station]+') já folga '+day+'. Colaboradoras do posto '+POST_NAMES[e.station]+' não podem folgar no mesmo dia.');return}}e.offDays=[...e.offDays,day]}if(!t.checked)e.offDays=e.offDays.filter(x=>x!==day);render();return}if(t.dataset.employee!==undefined){const e=w.employees[+t.dataset.employee],f=t.dataset.field;if(f==='name'){roster()[+t.dataset.employee].name=t.value.trim()||('Colaboradora '+e.id);render();return}if(f==='restricted'){roster()[+t.dataset.employee].restricted=t.checked;render();return}if(f==='shift')e.shift=+t.value;else if(f==='station'){if(POST_NAMES[t.value]){e.station=t.value;roster()[+t.dataset.employee].station=t.value}}else if(f==='pdv')e.pdv=+t.value;else if(f==='sundayWork'&&t.value==='true'&&sundayConflict(e)>=0){const k=sundayConflict(e);toast('Não é permitido: '+e.name+' já trabalha no domingo da semana '+(k+1)+' ('+short(date('domingo',k))+'). Ninguém pode trabalhar dois domingos seguidos.');render();return}else e[f]=f==='sundayWork'?t.value==='true':t.value;if(f==='sundayWork')e.offDays=e.offDays.slice(0,offLimit(e));render()}});
document.addEventListener('click',event=>{const wb=event.target.closest('[data-week]'),sb=event.target.closest('[data-sort]'),jump=event.target.closest('[data-jump]'),tab=event.target.closest('.tab'),model=event.target.closest('[data-model]'),apply=event.target.closest('#applyRotation'),copy=event.target.closest('[data-replicate]'),suggest=event.target.closest('[data-suggest-off]'),sun=event.target.closest('[data-suggest-sundays]'),allOff=event.target.closest('[data-suggest-off-all]'),posts=event.target.closest('#applyPosts'),gen=event.target.closest('#genRun'),und=event.target.closest('#genUndo');if(wb){state.selectedWeek=+wb.dataset.week;render();return}if(sb){setSort(sb.dataset.sort);return}if(jump){document.getElementById('operator-'+jump.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'center'});return}if(tab){activateTab(tab.dataset.tab);return}if(model){setModel(model.dataset.model);return}if(apply){applyRotation();return}if(copy){replicate(copy.dataset.replicate);return}if(suggest)suggestOffDays();if(sun)suggestSundays();if(allOff)suggestOffAll();if(posts)applyPostPlan(false);if(gen)generateAll();if(und)undoGenerate()});
document.getElementById('decreaseActive').addEventListener('click',()=>setActive(week().activeCount-1));document.getElementById('increaseActive').addEventListener('click',()=>setActive(week().activeCount+1));document.getElementById('decreasePdv').addEventListener('click',()=>setPdv(week().pdvCount-1));document.getElementById('increasePdv').addEventListener('click',()=>setPdv(week().pdvCount+1));
document.getElementById('printButton').addEventListener('click',()=>{if(issues().length){renderWarning();document.getElementById('scheduleWarning').scrollIntoView({behavior:'smooth',block:'center'});return}document.body.dataset.printMode='complete';window.print()});window.addEventListener('afterprint',()=>delete document.body.dataset.printMode);
document.getElementById('resetAllButton').addEventListener('click',async()=>{if(await await askConfirm('Restaurar as 4 semanas de '+SECTORS[state.selectedSector]+'? Toda a escala deste setor será apagada (os outros setores não mudam).')){sector().weeks=[0,1,2,3].map(newWeek);state.selectedWeek=0;state.notice='';render()}});document.getElementById('resetButton').addEventListener('click',async()=>{if(await await askConfirm('Restaurar somente a semana aberta? Esta ação não muda as outras semanas.')){sector().weeks[state.selectedWeek]=newWeek();render()}});document.getElementById('exportButton').addEventListener('click',exportBackup);document.getElementById('importFile').addEventListener('change',e=>{const f=e.target.files[0];if(f)importBackup(f);e.target.value=''});render();
/* confirmação dentro do app (o navegador bloqueia confirm() em páginas incorporadas) */
function askConfirm(msg){
  return new Promise(res=>{
    const ov=document.createElement('div');ov.className='ask-overlay';
    ov.innerHTML='<div class="ask-box" role="dialog" aria-modal="true"><p></p><div class="ask-actions"><button type="button" class="button outline" data-a="0">Cancelar</button><button type="button" class="button" data-a="1">Confirmar</button></div></div>';
    ov.querySelector('p').textContent=msg;
    const done=v=>{ov.remove();res(v)};
    ov.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)done(b.dataset.a==='1');else if(e.target===ov)done(false)});
    document.body.appendChild(ov);ov.querySelector('[data-a="1"]').focus();
  });
}

/* impressão resumida: 1 folha para a semana e 1 folha para o domingo */
window.addEventListener('beforeprint',()=>{try{const n=week().employees.length;document.body.dataset.dense=n>30?'xs':n>22?'s':n>16?'m':'l'}catch(e){}});
window.addEventListener('afterprint',()=>{delete document.body.dataset.dense});
/* impressão: tudo em 1 linha por colaboradora (folgas sem o ano) */
window.addEventListener('beforeprint',()=>{document.querySelectorAll('#scheduleTable .c-off').forEach(td=>{td.dataset.full=td.innerHTML;td.innerHTML=td.innerHTML.replace(/\/\d{2}(?!\d)/g,'')})});
window.addEventListener('afterprint',()=>{document.querySelectorAll('#scheduleTable .c-off[data-full]').forEach(td=>{td.innerHTML=td.dataset.full;delete td.dataset.full})});
