const STORE='bom-dia-escalas-v9',OLD='bom-dia-escalas-v8';
const DEFAULTS={weekClose:'19:30',sundayClose:'18:00',alternateSundays:true,extraText:'',v10:1},EXTRA_MAX=90;
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
function worker(id,shifts=3){return{id,name:'Colaboradora '+id,shift:(id-1)%shifts,pdv:(id-1)%10+1,station:'pdv',offDays:id%2?['sábado']:['segunda'],sundayWork:false,restricted:false}}
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
function normalizeWeek(w){w.model=w.model==='6x1'?'6x1':'5x2';w.activeCount=Math.min(50,Math.max(1,+w.activeCount||12));w.pdvCount=Math.min(30,Math.max(1,+w.pdvCount||10));w.shifts=(w.shifts||[]).map((s,i)=>({...shift(i,w.model),...s}));const wi=Math.max(0,sector().weeks.indexOf(w));w.shifts.forEach(s=>sync(s,w.model,wi));w.rotation=w.rotation||rotation(w.activeCount,w.shifts.length);w.rotation.enabled=!!w.rotation.enabled;w.rotation.counts=Array.from({length:w.shifts.length},(_,i)=>Math.max(0,+w.rotation.counts?.[i]||0));w.rotation.message=w.rotation.message||'';w.employees=Array.from({length:w.activeCount},(_,i)=>{const e=w.employees?.[i]||worker(i+1,w.shifts.length),off=Array.isArray(e.offDays)?e.offDays:e.off==='domingo e segunda'?['domingo','segunda']:['sábado','domingo'];return{...e,id:i+1,name:e.name||('Colaboradora '+(i+1)),offDays:[...new Set(off)].filter(x=>x!=='domingo'),shift:Math.min(+e.shift||0,w.shifts.length-1),pdv:Math.min(Math.max(1,+e.pdv||1),w.pdvCount),station:['pdv','pacote','fiscal'].includes(e.station)?e.station:'pdv',sundayWork:off.includes('domingo')?false:!!e.sundayWork,restricted:!!e.restricted,postRotation:!!e.postRotation}});w.sortField=w.sortField||'start';w.sortDirection=w.sortDirection||'asc';return w}
function sortShifts(w=week()){const items=w.shifts.map((s,i)=>({s,i})).sort((a,b)=>mins(a.s.start)-mins(b.s.start)),map=new Map(items.map((x,i)=>[x.i,i]));w.shifts=items.map(x=>x.s);w.employees=w.employees.map(e=>({...e,shift:map.get(+e.shift)??0}))}
function normalize(){state.settings={...DEFAULTS,...state.settings};sector().weeks.forEach(x=>{normalizeWeek(x);sortShifts(x)});const r=roster();sector().weeks.forEach(w=>w.employees.forEach((e,i)=>{e.name=r[i].name;e.restricted=r[i].restricted}))}
/* nome e restrição de cada colaboradora, por setor: alterados na ficha, valem nas 4 semanas */
function roster(){
  const all=(state.roster=state.roster||{}),s=state.selectedSector;if(!all[s])all[s]=[];
  const arr=all[s],w0=sector().weeks[0];
  for(let i=0;i<50;i++)if(!arr[i]){const e=w0&&w0.employees&&w0.employees[i];arr[i]={name:(e&&e.name)||('Colaboradora '+(i+1)),restricted:!!(e&&e.restricted)}}
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
function assignPdvs(w,wi){
  const emps=w.employees.filter(e=>e.station==='pdv'),days=e=>DAYS.filter(d=>worksOn(e,d[0],wi)).map(d=>d[0]);
  const iv=e=>[mins(w.shifts[e.shift].start),mins(w.shifts[e.shift].end)];
  const clash=(a,b)=>{const x=iv(a),y=iv(b);if(!(x[0]<y[1]&&y[0]<x[1]))return false;const da=days(a);return days(b).some(d=>da.includes(d))};
  const done=[];let short=0;
  emps.forEach(e=>{
    const used=new Set(done.filter(o=>clash(e,o)).map(o=>o.pdv));
    let pick=(e.pdv>=1&&e.pdv<=w.pdvCount&&!used.has(e.pdv))?e.pdv:0;
    if(!pick)for(let n=1;n<=w.pdvCount;n++)if(!used.has(n)){pick=n;break}
    if(!pick){pick=((e.id-1)%w.pdvCount)+1;short++}
    e.pdv=pick;done.push(e);
  });
  return short;
}
function generateAll(){
  if(!baseOk()){needBase();return}
  const g=state.gen||{},sel=state.selectedSector;
  if(!window.confirm('Gerar a escala de '+SECTORS[sel]+' nas 4 semanas?\n\nSerá refeito: folgas'+(g.shifts==='girar'?', turnos':'')+(hasPdv()&&g.pdv?', números de PDV':'')+'. Serão mantidos: nomes e os domingos que você já definiu. Você pode desfazer depois.'))return;
  state.undo={...(state.undo||{}),[sel]:{at:new Date().toISOString(),weeks:clone(sector().weeks)}};
  state.selectedWeek=0;const weeks=sector().weeks;weeks.forEach(w=>{normalizeWeek(w);sortShifts(w)});
  const r=fillSundays();let late=0,shortPdv=0,restr=0;
  if(g.shifts==='girar'){
    const w0=weeks[0],sum=w0.rotation.counts.reduce((a,b)=>a+b,0);
    if(sum!==w0.activeCount)w0.rotation.counts=distribute(w0.activeCount,w0.shifts.length);
    applyRotation();weeks.forEach(w=>{restr+=swapRestricted(w);late+=swapSundayShifts(w)});
  }
  weeks.forEach(suggestOffFor);
  if(hasPdv()){
    if(g.posts&&weeks[0].employees.filter(e=>e.station!=='pdv'&&e.postRotation).length>=2)applyPostRotation();
    if(g.pdv)weeks.forEach((w,wi)=>{shortPdv+=assignPdvs(w,wi)});
  }
  state.selectedWeek=0;
  const list=compliance(),er=list.filter(x=>x.level==='erro').length,at=list.filter(x=>x.level==='atenção').length;
  state.notice='Escala gerada para '+SECTORS[sel]+'. '+sundayNote(r)+(g.shifts==='girar'?' Turnos equilibrados e girados entre as semanas.':'')+(shortPdv?' '+shortPdv+' colaboradora(s) ficaram sem PDV exclusivo: há mais pessoas simultâneas do que PDVs.':'')+(restr?' '+restr+' colaboradora(s) com restrição após 18h não couberam em turno que termina até 18h.':'')+(late?' '+late+' colaboradora(s) de domingo ficaram com turno que termina depois do fechamento.':'')+' Conformidade: '+(er?er+' erro(s)':'sem erros')+(at?', '+at+' atenção(ões)':'')+'. Use "Desfazer última geração" para voltar.';
  render();toast('Escala gerada. '+(er?er+' erro(s) de conformidade — veja o painel.':'Sem erros de conformidade.'),!er);
}
function undoGenerate(){
  const sel=state.selectedSector,u=state.undo&&state.undo[sel];if(!u)return;
  if(!window.confirm('Desfazer a última geração de '+SECTORS[sel]+'? As 4 semanas voltam ao que estava antes.'))return;
  sector().weeks=u.weeks;delete state.undo[sel];state.notice='';render();toast('Geração desfeita.',true);
}
function renderGen(){
  state.gen={shifts:'girar',pdv:true,posts:true,...(state.gen||{})};
  const g=state.gen,u=state.undo&&state.undo[state.selectedSector];
  document.getElementById('genPanel').innerHTML=`<div class="setting-block"><label>Geração automática (opcional)</label><p class="helper">Nada é gerado sozinho: a escala só muda quando você clicar em "Gerar". Antes, escolha na Semana 1 quem trabalha no domingo. O app monta as 4 semanas deste setor respeitando CLT, EC 141/2026 e CCT.</p></div>
  <div class="setting-block"><label for="genShifts">Turnos</label><select id="genShifts"><option value="girar" ${g.shifts==='girar'?'selected':''}>Equilibrar e girar entre as semanas</option><option value="manter" ${g.shifts==='manter'?'selected':''}>Manter os turnos atuais</option></select><p class="helper">Ao girar, quem trabalha no domingo troca de turno com quem não trabalha para terminar antes do fechamento sempre que possível.</p></div>
  ${hasPdv()?`<div class="setting-block"><label class="check-row"><input type="checkbox" id="genPdv" ${g.pdv?'checked':''} /> Distribuir PDVs sem repetir no mesmo dia e horário</label><label class="check-row"><input type="checkbox" id="genPosts" ${g.posts?'checked':''} /> Aplicar rodízio de Pacote/Fiscal (marcadas na ficha)</label></div>`:''}
  <button class="button full" id="genRun" type="button">Gerar escala do setor</button>
  <button class="button outline full" id="genUndo" type="button" ${u?'':'disabled'}>Desfazer última geração${u?' ('+short(new Date(u.at))+' '+pad(new Date(u.at).getHours())+':'+pad(new Date(u.at).getMinutes())+')':''}</button>
  <p class="helper">Substitui as folgas${g.shifts==='girar'?', os turnos':''}${hasPdv()?' e os números de PDV':''}. Mantém nomes e os domingos de semanas que você já preencheu.</p>`;
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
  rd.onload=()=>{
    const old=state;
    try{
      const data=JSON.parse(rd.result),st=data&&data.state?data.state:data;
      if(!st||typeof st!=='object'||!st.sectors||typeof st.sectors!=='object')throw new Error('estrutura');
      if(!window.confirm('Importar este backup vai SUBSTITUIR todos os dados atuais deste navegador. Continuar?'))return;
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
const effOff=e=>e.sundayWork?e.offDays:[...e.offDays,'domingo'],offLimit=(e,model=week().model)=>Math.max(0,2-(e.sundayWork?0:1)),sc=()=>mins(state.settings.sundayClose);
function offText(e){const picked=DAYS.filter(d=>effOff(e).includes(d[0])||closedDay(d[0]));return picked.length?picked.map(d=>d[1]+' '+short(date(d[0]))+(closedDay(d[0])&&!effOff(e).includes(d[0])?' (feriado)':'')).join(' e '):'Definir'}
function stationText(e){return e.station==='pacote'?'Pacote':e.station==='fiscal'?'Fiscal':'PDV '+e.pdv}
function sundayWorkers(){return week().employees.filter(e=>!closedDay('domingo')&&e.sundayWork&&mins(week().shifts[e.shift].start)<sc())}
function issues(){const bad=week().employees.filter(e=>(week().model==='6x1'?effOff(e).length<1:effOff(e).length!==2)),list=[];if(bad.length)list.push(bad.length+' colaboradora'+(bad.length===1?' está':'s estão')+' sem '+neededOff()+' folga'+(neededOff()===1?'':'s')+' obrigatória'+(neededOff()===1?'':'s')+'.');const minimum=SUNDAY_MIN[state.selectedSector],count=sundayWorkers().length;if(!closedDay('domingo')&&count<minimum)list.push('Domingo: mínimo de '+minimum+' colaboradoras; há '+count+'.');compliance().filter(x=>x.level==='erro'&&x.weeks.includes(state.selectedWeek)).forEach(x=>list.push(x.text));return list}
function sortValue(e){const s=week().shifts[e.shift],f=week().sortField;if(f==='name')return e.name.toLocaleLowerCase('pt-BR');if(f==='off')return e.offDays.map(k=>DAYS.find(d=>d[0]===k)[2]).join(',');if(f==='hours')return mins(s.end);return f==='lunch'?mins(s.lunchStart):f==='end'?mins(s.end):mins(s.start)}
function staff(){const dir=week().sortDirection==='asc'?1:-1;return [...week().employees].sort((a,b)=>typeof sortValue(a)==='number'?dir*(sortValue(a)-sortValue(b)):dir*String(sortValue(a)).localeCompare(String(sortValue(b)),'pt-BR'))}
const mark=f=>week().sortField===f?(week().sortDirection==='asc'?'↑':'↓'):'↕';
function render(){normalize();const w=week(),name=SECTORS[state.selectedSector];document.getElementById('sectorSelect').value=state.selectedSector;document.getElementById('weekStart').value=monday(state.baseMonday);document.getElementById('sectorLabel').textContent='PAINEL GERENCIAL · '+name.toUpperCase();document.getElementById('mainTitle').textContent='Escala semanal · '+name;document.getElementById('settingsTitle').textContent='Semana '+(state.selectedWeek+1);document.getElementById('weekTitle').textContent=range()+' · Semana '+(state.selectedWeek+1);document.getElementById('activeEmployees').value=w.activeCount;document.getElementById('pdvCount').value=w.pdvCount;document.getElementById('shiftCount').value=w.shifts.length;document.getElementById('weekClose').value=state.settings.weekClose;document.getElementById('sundayClose').value=state.settings.sundayClose;document.getElementById('extraHolidays').value=state.settings.extraText||'';document.getElementById('activeMetric').textContent=w.activeCount;document.getElementById('shiftMetric').textContent=w.shifts.length;document.getElementById('modelMetric').textContent=w.model;document.getElementById('pdvMetric').textContent=w.pdvCount;document.getElementById('pdvMetricCard').hidden=!hasPdv();document.querySelector('[data-tab="pdvs"]').hidden=!hasPdv();document.querySelector('[data-panel="pdvs"]').hidden=!hasPdv();if(!hasPdv()&&document.querySelector('.tab.active').dataset.tab==='pdvs')activateTab('team');document.querySelectorAll('.model-button').forEach(x=>x.classList.toggle('active',x.dataset.model===w.model));document.getElementById('operatorsTag').textContent=w.activeCount+' ativas';renderWeekTabs();renderShifts();renderRotation();renderCoverage();renderSchedule();renderSunday();renderOperators();renderBoard();renderAlerts();renderWarning();renderCompliance();renderGen();renderBackupStatus();save()}
function renderWeekTabs(){document.getElementById('periodTabs').innerHTML=[0,1,2,3].map(i=>`<button class="period-tab ${i===state.selectedWeek?'active':''}" data-week="${i}" type="button">Semana ${i+1}<small>${range(i)}</small></button>`).join('')}
function renderShifts(){document.getElementById('shiftsEditor').innerHTML=loadInfo()+week().shifts.map((s,i)=>`<div class="shift-card"><h3>${escape(s.name)}</h3><div class="time-grid"><label>Entrada<input data-shift="${i}" data-field="start" type="time" value="${s.start}" /></label><label>Saída calculada<input type="time" value="${s.end}" disabled /></label><label>Saída para almoço<input data-shift="${i}" data-field="lunchStart" type="time" value="${s.lunchStart}" /></label><label>Retorno automático (+2h)<input type="time" value="${s.lunchEnd}" disabled /></label></div><p class="helper">Limite com hora extra (máx. 1h30): até ${plus(s.end,EXTRA_MAX)}.</p></div>`).join('')}
function renderRotation(){const w=week(),sum=w.rotation.counts.reduce((a,b)=>a+b,0),summary=sum===w.activeCount?'A quantidade está pronta para aplicar.':`Configure ${w.activeCount} vagas no total; há ${sum}.`;document.getElementById('rotationPanel').innerHTML=`<div class="setting-block rotation-block"><label class="check-row"><input id="rotationEnabled" type="checkbox" ${w.rotation.enabled?'checked':''} /> Usar rodízio automático</label><p class="helper">Opcional: se não aplicar, os turnos continuam totalmente manuais.</p><div class="rotation-counts">${w.shifts.map((s,i)=>`<label>${escape(s.name)}<input data-rotation-count="${i}" type="number" min="0" max="50" value="${w.rotation.counts[i]}" /><small>${s.start}–${s.end}</small></label>`).join('')}</div><p class="rotation-summary ${sum===w.activeCount?'ready':'needs'}">${summary}</p><button class="button secondary full" id="applyRotation" type="button">Aplicar rodízio nas outras semanas</button><button class="button outline full" data-replicate="rotation" type="button">Copiar somente esta configuração de rodízio</button><p class="helper">A semana aberta é a base: os números entram em ordem no primeiro turno e avançam para os demais na semana seguinte. Nomes, folgas, domingos e postos são preservados.</p>${w.rotation.message?`<p class="rotation-message">${escape(w.rotation.message)}</p>`:''}</div>${postsPanel()}`}
function renderCoverage(){document.getElementById('coverageCards').innerHTML=week().shifts.map((s,i)=>{const n=week().employees.filter(e=>e.shift===i).length;return `<div class="coverage-card"><strong><i class="shift-pill" style="background:${s.color}"></i>${escape(s.name)}</strong><span>${s.start}–${s.end} · ${n} colaboradora${n===1?'':'s'}</span></div>`}).join('')}
function heading(){const fields=[['name','Colaboradora'],['shift','Turno'],...(hasPdv()?[['station','Posto']]:[]),['start','Entrada'],['lunch','Almoço'],['end','Saída'],['off','Folgas com data'],['hours','Limite c/ extras (máx. 1h30)']];return `<thead><tr>${fields.map(([f,n])=>f==='station'?`<th>${n}</th>`:`<th><button class="sort-button" data-sort="${f}" type="button">${n} <span>${mark(f)}</span></button></th>`).join('')}</tr></thead>`}
function row(e){const s=week().shifts[e.shift];return `<tr><td><button class="employee-link" data-jump="${e.id}" type="button">${escape(e.name)}</button></td><td><i class="shift-pill" style="background:${s.color}"></i>${escape(s.name)}</td>${hasPdv()?`<td>${stationText(e)}</td>`:''}<td>${s.start}</td><td>${s.lunchStart}–${s.lunchEnd}</td><td>${s.end}</td><td>${offText(e)}</td><td>${plus(s.end,EXTRA_MAX)}</td></tr>`}
function renderSchedule(){document.getElementById('scheduleTable').innerHTML=`${heading()}<tbody>${staff().map(row).join('')}</tbody>`}
function renderSunday(){const list=sundayWorkers(),minimum=SUNDAY_MIN[state.selectedSector],head=hasPdv()?'<th>Posto</th>':'',rows=list.map(e=>{const s=week().shifts[e.shift],pl=sundayPlan(s),end=time(pl.en),lunch=pl.brk?time(pl.brk[0])+'–'+time(pl.brk[1])+' ('+(pl.brk[1]-pl.brk[0])+' min)':'—';return `<tr><td>${escape(e.name)}</td><td>${escape(s.name)}</td>${hasPdv()?`<td>${stationText(e)}</td>`:''}<td>${s.start}</td><td>${lunch}</td><td>${end}</td></tr>`}).join('');const columns=hasPdv()?6:5;document.getElementById('sundaySchedule').innerHTML=`<div class="section-heading"><div><p class="eyebrow">ESCALA DE DOMINGO</p><h2>Domingo · ${short(date('domingo'))}</h2><p>${SECTORS[state.selectedSector]} · mínimo de ${minimum} colaboradora${minimum===1?'':'s'}.</p></div><span class="tag">${list.length} programada${list.length===1?'':'s'}</span></div><div class="table-wrap"><table><thead><tr><th>Colaboradora</th><th>Turno</th>${head}<th>Entrada</th><th>Intervalo</th><th>Saída</th></tr></thead><tbody>${rows||`<tr><td colspan="${columns}">Nenhuma colaboradora programada para este domingo.</td></tr>`}</tbody></table></div><p class="table-note">Domingo funciona até ${state.settings.sundayClose}. o turno cumpre a carga horária completa do modelo e o intervalo só existe em jornada acima de 6h. CCT de mercados: abono de R$ 94,00 por domingo trabalhado, além da folga semanal (confirme o valor vigente).</p>`}
function renderOperators(){const w=week(),options=w.shifts.map((s,i)=>`<option value="${i}">${escape(s.name)} · ${s.start}–${s.end}</option>`).join(''),pdv=Array.from({length:w.pdvCount},(_,i)=>`<option value="${i+1}">PDV ${i+1}</option>`).join(''),stations=`${pdv}<option value="pacote">Pacote</option><option value="fiscal">Fiscal</option>`,label=neededOff()===1?'obrigatório marcar 1':'obrigatório marcar 2';document.getElementById('operatorsList').innerHTML=w.employees.map((e,i)=>`<article class="operator-card" id="operator-${e.id}"><h3>Colaboradora ${e.id}</h3><div class="operator-fields"><label>Nome<input data-employee="${i}" data-field="name" value="${escape(e.name)}" /></label><label>Turno<select data-employee="${i}" data-field="shift">${options}</select></label>${hasPdv()?`<label>Posto da semana<select data-employee="${i}" data-field="station">${stations}</select></label>`:''}${hasPdv()&&e.station!=='pdv'?`<label class="check-row"><input type="checkbox" data-employee="${i}" data-field="postRotation" ${e.postRotation?'checked':''} /> Rodízio ${e.station==='fiscal'?'Fiscal':'Pacote'} entre as semanas</label>`:''}<fieldset class="off-days"><legend>Dias de folga <small>(${week().model==='6x1'?'até ':'marcar '}${offLimit(e)}${e.sundayWork?'':' + domingo'})</small></legend><div class="days-list">${DAYS.filter(d=>d[0]!=='domingo').map(d=>`<label><input type="checkbox" data-employee="${i}" data-off="${d[0]}" ${e.offDays.includes(d[0])?'checked':''} />${d[0]}</label>`).join('')}${e.sundayWork?'':'<label><input type="checkbox" checked disabled />domingo (folga)</label>'}</div></fieldset><label>Trabalha no domingo <small>(${short(date('domingo'))})</small><select data-employee="${i}" data-field="sundayWork"><option value="false">Não</option><option value="true">Sim</option></select></label><label class="check-row restricted"><input type="checkbox" data-employee="${i}" data-field="restricted" ${e.restricted?'checked':''} /> Estudante/mãe: sem escala após 18h <small>(CCT)</small></label></div></article>`).join('');document.querySelectorAll('[data-employee]:not([data-off])').forEach(el=>{const e=w.employees[+el.dataset.employee],f=el.dataset.field;if(f==='station')el.value=e.station==='pdv'?String(e.pdv):e.station;else el.value=String(e[f])})}
function active(e,d,at){const s=week().shifts[e.shift],point=mins(at),end=d[0]==='domingo'?Math.min(mins(s.end),sc()):Math.min(mins(s.end),mins(state.settings.weekClose));if(closedDay(d[0]))return false;if(d[0]==='domingo'){if(!e.sundayWork)return false}else if(e.offDays.includes(d[0]))return false;const brk=d[0]==='domingo'?sundayPlan(s).brk:[mins(s.lunchStart),Math.min(mins(s.lunchEnd),end)];return point>=mins(s.start)&&point<end&&!(brk&&point>=brk[0]&&point<brk[1])}
function cover(d,start,end){const values=[];for(let n=mins(start);n<mins(end);n+=30)values.push(week().employees.filter(e=>active(e,d,time(n))).length);return values.length?Math.min(...values):0}
function renderBoard(){const bands=[],close=mins(state.settings.weekClose);for(let start=420;start<close;start+=60){const stop=Math.min(start+60,close);bands.push([time(start)+'–'+time(stop),time(start),time(stop)])}document.getElementById('boardNote').textContent='Segunda a sábado até '+state.settings.weekClose+'; domingo até '+state.settings.sundayClose+'. Verde indica maior cobertura e vermelho a menor.';const rows=bands.map(([label,start,end])=>({label,counts:DAYS.map(d=>closedDay(d[0])||(d[0]==='domingo'&&mins(start)>=sc())?null:cover(d,start,d[0]==='domingo'&&mins(end)>sc()?state.settings.sundayClose:end))})),all=rows.flatMap(r=>r.counts.filter(Number.isFinite)),low=Math.min(...all),high=Math.max(...all),cls=n=>n===null?'coverage-none':high===low?'coverage-mid':n===high?'coverage-high':n===low?'coverage-low':'coverage-mid';document.getElementById('coverageBoardHead').innerHTML=`<tr><th>Período</th>${DAYS.map(d=>`<th>${d[1]}<br>${short(date(d[0]))}${holidayTag(d[0])}</th>`).join('')}</tr>`;document.getElementById('coverageBoardBody').innerHTML=rows.map(r=>`<tr><td>${r.label}</td>${r.counts.map(n=>`<td class="${cls(n)}">${n===null?'—':n}</td>`).join('')}</tr>`).join('')}
function renderAlerts(){const box=document.getElementById('trafficAlerts');if(!hasPdv()){box.innerHTML='<p class="empty-alert">Alertas de fluxo são usados somente na Frente de Caixa.</p>';return}box.innerHTML=TRAFFIC.map(([label,start,end,min])=>{const days=DAYS.filter(d=>d[0]!=='domingo'&&!closedDay(d[0])&&cover(d,start,end)<min);return `<article class="alert-card ${days.length?'critical':'ok'}"><strong>${label} · ${start}–${end}</strong><span>${days.length?'Atenção: '+days.map(d=>d[1]).join(', ')+'.':'Cobertura atende o mínimo de '+min+'.'}</span><small>Mínimo planejado: ${min} operadoras.</small></article>`}).join('')}
function renderWarning(){const list=issues(),el=document.getElementById('scheduleWarning');el.hidden=!list.length;el.innerHTML=list.map(t=>'• '+escape(t)).join('<br>')}
function setActive(n){week().activeCount=Math.min(50,Math.max(1,+n||1));render()}
function setPdv(n){week().pdvCount=Math.min(30,Math.max(1,+n||1));render()}
function setModel(m){week().model=m;week().employees.forEach(e=>e.offDays=e.offDays.slice(0,offLimit(e)));week().shifts.forEach(s=>sync(s,m));render()}
function setShiftCount(n){const w=week(),count=+n,items=w.shifts.slice(0,count);while(items.length<count)items.push(shift(items.length,w.model));w.shifts=items;w.rotation.counts=distribute(w.activeCount,count);render()}
function setSort(f){if(week().sortField===f)week().sortDirection=week().sortDirection==='asc'?'desc':'asc';else{week().sortField=f;week().sortDirection='asc'}render()}
function fittedCounts(counts,total,slots){const sourceTotal=counts.reduce((a,b)=>a+b,0)||slots,raw=Array.from({length:slots},(_,i)=>(counts[i]||0)*total/sourceTotal),base=raw.map(Math.floor),remainders=raw.map((v,i)=>({i,v:v-Math.floor(v)})).sort((a,b)=>b.v-a.v),remaining=total-base.reduce((a,b)=>a+b,0);remainders.slice(0,remaining).forEach(x=>base[x.i]++);return base}
function shiftForSlot(counts,slot){let sum=0;for(let i=0;i<counts.length;i++){sum+=counts[i];if(slot<sum)return i}return counts.length-1}
function applyRotation(){const source=week(),sum=source.rotation.counts.reduce((a,b)=>a+b,0);if(sum!==source.activeCount){source.rotation.message=`A soma dos turnos deve ser ${source.activeCount}; ajuste antes de aplicar.`;render();return}source.rotation.message='Rodízio aplicado nas quatro semanas deste setor.';sector().weeks.forEach((target,targetIndex)=>{normalizeWeek(target);const counts=fittedCounts(source.rotation.counts,target.activeCount,target.shifts.length),offset=(((targetIndex-state.selectedWeek)*counts[0])%target.activeCount+target.activeCount)%target.activeCount;target.rotation={enabled:true,counts,message:targetIndex===state.selectedWeek?source.rotation.message:''};target.employees.forEach((e,index)=>e.shift=shiftForSlot(counts,(index-offset+target.activeCount)%target.activeCount));sortShifts(target)});render()}
function replicate(kind){const source=clone(week());sector().weeks.forEach((target,index)=>{if(index===state.selectedWeek)return;normalizeWeek(target);if(kind==='all'){sector().weeks[index]=clone(source);normalizeWeek(sector().weeks[index]);sortShifts(sector().weeks[index]);fixSundays(sector().weeks[index],source,index);return}if(kind==='team'){target.activeCount=source.activeCount;target.model=source.model;target.employees=clone(source.employees);target.shifts.forEach(s=>sync(s,target.model));fixSundays(target,source,index)}if(kind==='shifts'){target.shifts=clone(source.shifts)}if(kind==='rotation'){target.rotation=clone(source.rotation)}if(kind==='pdvs'&&hasPdv())target.pdvCount=source.pdvCount;normalizeWeek(target);sortShifts(target)});render()}
function suggestOffFor(w){
  /* Folgas fixas por colaboradora (grupos Seg/Qui, Ter/Sex, Qua/Sáb): quem trabalha no domingo recebe 2 folgas na semana;
     quem não trabalha no domingo já tem o domingo de folga e recebe só a primeira. Assim a primeira folga da semana seguinte
     nunca vem depois da última da anterior e não surgem mais de 6 dias seguidos de trabalho. */
  const need=w.model==='6x1'?1:2;
  w.employees.forEach((e,i)=>{e.offDays=offFor(e,i,w.model)});
}
function offFor(e,i,model){
  const g=i%3;
  if(model==='6x1'){
    /* 6x1 com domingos alternados: semana COM domingo = 1 folga (qua/qui/sex); semana SEM domingo = domingo + 1 folga extra (seg/ter/qua).
       A folga extra é necessária: com uma só folga por semana a pessoa passaria de 6 dias seguidos (art. 67 CLT). A extra vem sempre antes da folga da semana com domingo. */
    return e.sundayWork?[DAYS[2+g][0]]:[DAYS[g][0]];
  }
  const pair=[DAYS[g][0],DAYS[g+3][0]];return pair.slice(0,Math.max(0,2-(e.sundayWork?0:1)));
}
/* ao copiar uma semana, as semanas a distância ímpar recebem o domingo de quem NÃO trabalhou na origem (mesma quantidade) */
function fixSundays(target,source,idx){
  if(Math.abs(idx-state.selectedWeek)%2===0)return;
  const k=source.employees.filter(e=>e.sundayWork).length,non=source.employees.map((e,i)=>i).filter(i=>!source.employees[i].sundayWork),pick=new Set(non.slice(0,k));
  target.employees.forEach((e,i)=>{const was=e.sundayWork;e.sundayWork=pick.has(i);if(was!==e.sundayWork)e.offDays=offFor(e,i,target.model)});
}
/* turno de domingo: jornada real até o fechamento; 15 min de intervalo entre 4h e 6h (art. 71 §1º CLT); acima de 6h, almoço */
function sundayPlan(s){
  /* domingo cumpre a carga horária completa do modelo; intervalo só em jornada acima de 6h */
  const st=mins(s.start),len=(mins(s.end)-st+1440)%1440,en=st+len,brk=len>360?[mins(s.lunchStart),mins(s.lunchEnd)]:null;
  return{st,en,len,brk,work:len-(brk?brk[1]-brk[0]:0)};
}
function weekMin(e,w=week(),wi=state.selectedWeek){return DAYS.reduce((t,d)=>!worksOn(e,d[0],wi)?t:t+(d[0]==='domingo'?sundayPlan(w.shifts[e.shift]).work:workDuration(w.model,wi)),0)}
function needBase(){state.selectedWeek=0;toast('Escolha primeiro, na Semana 1, quais colaboradoras trabalham no domingo ("Trabalha no domingo = Sim"). Depois o app faz o revezamento das outras semanas.');render()}
const baseOk=()=>{const w0=sector().weeks[0];normalizeWeek(w0);return w0.employees.some(e=>e.sundayWork)};
/* Preenche os domingos das semanas 2-4 a partir da Semana 1, sem substituir semanas que já tenham domingo definido. */
function fillSundays(){
  const weeks=sector().weeks;weeks.forEach(w=>{normalizeWeek(w);sortShifts(w)});
  const k=weeks[0].employees.filter(e=>e.sundayWork).length,filled=[],short=[];
  const worked=i=>weeks.reduce((t,w)=>t+(w.employees[i]&&w.employees[i].sundayWork?1:0),0);
  const works=(w,i)=>!!(w&&w.employees[i]&&w.employees[i].sundayWork);
  weeks.forEach((w,wi)=>{
    if(wi===0||w.employees.some(e=>e.sundayWork))return;
    const cand=w.employees.map((e,i)=>i).filter(i=>!works(weeks[wi-1],i)&&!works(weeks[wi+1],i)).sort((a,b)=>worked(a)-worked(b)||a-b);
    cand.slice(0,k).forEach(i=>{w.employees[i].sundayWork=true});
    filled.push(wi);if(cand.length<k)short.push(wi+1);
  });
  return{k,filled,short};
}
function sundayNote(r){return (r.filled.length?'Domingos preenchidos nas semanas '+r.filled.map(x=>x+1).join(', ')+' a partir da Semana 1 (ninguém repete domingo). ':'Nenhuma semana vazia para preencher; os domingos que você definiu foram mantidos. ')+(r.short.length?'Atenção: nas semanas '+r.short.join(', ')+' não há colaboradoras suficientes sem domingo na semana vizinha para repetir a quantidade da Semana 1. ':'')+'Quem não trabalha no domingo ficou com o domingo de folga.'}
function suggestOffDays(){
  if(!baseOk()){needBase();return}
  const r=fillSundays();r.filled.forEach(wi=>suggestOffFor(sector().weeks[wi]));suggestOffFor(week());
  state.notice='Folgas sugeridas nesta semana. '+sundayNote(r);render();
}
const SIX_NOTE=' No 6x1, a semana sem domingo recebe uma folga extra no meio da semana: com só 1 folga por semana e domingos alternados a pessoa passaria de 6 dias seguidos de trabalho (art. 67 da CLT).';
function suggestOffAll(){
  if(!baseOk()){needBase();return}
  const r=fillSundays();sector().weeks.forEach(suggestOffFor);
  state.notice='Folgas sugeridas nas 4 semanas. '+sundayNote(r);render();
}
function suggestSundays(){
  if(!baseOk()){needBase();return}
  const r=fillSundays();r.filled.forEach(wi=>suggestOffFor(sector().weeks[wi]));
  const counts=sector().weeks.map(w=>w.employees.filter(e=>e.sundayWork).length),min=SUNDAY_MIN[state.selectedSector];
  state.notice=sundayNote(r)+' Colaboradoras por domingo: '+counts.join(' / ')+'.'+(Math.min(...counts)<min?' O mínimo do setor é '+min+' por domingo.':'');render();
}
function applyPostRotation(){
  const src=week(),group=src.employees.map((e,i)=>({e,i})).filter(x=>x.e.station!=='pdv'&&x.e.postRotation);
  if(group.length<2){toast('Marque "Rodízio" em pelo menos 2 colaboradoras com posto Pacote ou Fiscal nesta semana.');return}
  const posts=group.map(x=>x.e.station),m=group.length;
  sector().weeks.forEach((w,wi)=>{if(wi===state.selectedWeek)return;normalizeWeek(w);const d=(((wi-state.selectedWeek)%m)+m)%m;group.forEach((x,gi)=>{const t=w.employees[x.i];if(!t)return;t.station=posts[(gi+d)%m];t.postRotation=true})});
  toast('Rodízio de Pacote/Fiscal aplicado nas outras semanas. Os postos de PDV não foram alterados.');render();
}
function postsPanel(){
  if(!hasPdv())return '';
  const g=week().employees.filter(e=>e.station!=='pdv'&&e.postRotation);
  return `<div class="setting-block rotation-block"><label>Rodízio de Pacote e Fiscal</label><p class="helper">Marque "Rodízio" na ficha de cada pacoteira ou fiscal. Nesta semana: ${g.length?g.map(e=>escape(e.name)+' ('+(e.station==='fiscal'?'Fiscal':'Pacote')+')').join(', '):'ninguém marcado'}.</p><button class="button secondary full" id="applyPosts" type="button">Aplicar rodízio de postos nas outras semanas</button><p class="helper">Os postos do grupo marcado giram entre as colaboradoras a cada semana; os demais postos não mudam.</p></div>`;
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
      if(w.employees.some(e=>e.sundayWork&&e.shift===w.shifts.indexOf(s))&&endAbs>mins(S.sundayClose))add('atenção',L+nm+': no domingo o turno termina às '+s.end+', depois do fechamento de domingo ('+S.sundayClose+'). Ajuste o horário ou o fechamento.',[wi]);
    });
    DAYS.forEach(d=>{
      const h=holiday(date(d[0],wi));if(!h)return;const when=short(date(d[0],wi));
      if(h.closed){add('info',L+h.name+' ('+when+'): comércio fechado (CCT dos mercados) — folga automática para todas, sem descontar das folgas obrigatórias.',[wi]);return}
      const n=w.employees.filter(e=>worksOn(e,d[0],wi)).length;if(!n)return;
      add('info',L+h.name+' ('+when+'): '+n+' escalada'+(n===1?'':'s')+'. Trabalho em feriado nos mercados: horas com acréscimo de 100% (CCT).',[wi]);
    });
    const lateSun=w.employees.filter(e=>e.sundayWork&&!closedDay('domingo',wi)&&mins(w.shifts[e.shift].start)<mins(S.sundayClose)&&mins(w.shifts[e.shift].end)>mins(S.sundayClose)).map(e=>e.name);
    if(lateSun.length)add('atenção',L+'domingo: '+lateSun.length+' colaboradora'+(lateSun.length===1?'':'s')+' ('+lateSun.slice(0,4).join(', ')+(lateSun.length>4?' e mais '+(lateSun.length-4):'')+') com turno que termina depois do fechamento de domingo ('+S.sundayClose+'). Escolha um turno mais cedo para quem trabalha no domingo.',[wi]);
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

document.addEventListener('change',event=>{const t=event.target,w=week();if(t.id==='sectorSelect'){state.selectedSector=t.value;render();return}if(t.id==='weekClose'||t.id==='sundayClose'){if(t.value)state.settings[t.id]=t.value;render();return}if(t.id==='extraHolidays'){state.settings.extraText=t.value;render();return}if(t.id==='genShifts'){state.gen.shifts=t.value;render();return}if(t.id==='genPdv'){state.gen.pdv=t.checked;return}if(t.id==='genPosts'){state.gen.posts=t.checked;return}if(t.id==='weekStart'){state.baseMonday=monday(t.value);render();return}if(t.id==='activeEmployees'){setActive(t.value);return}if(t.id==='pdvCount'){setPdv(t.value);return}if(t.id==='shiftCount'){setShiftCount(t.value);return}if(t.id==='rotationEnabled'){w.rotation.enabled=t.checked;w.rotation.message=t.checked?'Rodízio ativado. Configure as quantidades e aplique quando desejar.':'Rodízio desativado; a escala permanece manual.';render();return}if(t.dataset.rotationCount!==undefined){w.rotation.counts[+t.dataset.rotationCount]=Math.max(0,+t.value||0);w.rotation.message='';render();return}if(t.dataset.shift!==undefined){const s=w.shifts[+t.dataset.shift],f=t.dataset.field,dur=workDuration(w.model),oldStart=s.start;if(!t.value){render();return}s[f]=t.value;let ls=mins(s.lunchStart);if(f==='start')ls+=mins(s.start)-mins(oldStart);const lo=mins(s.start)+Math.max(60,dur-360),hi=mins(s.start)+360,c=Math.min(hi,Math.max(lo,ls));if(c!==ls&&f==='lunchStart')toast('Almoço ajustado para '+time(c)+': não pode haver mais de 6h seguidas sem intervalo e a jornada deve cumprir a carga de '+hm(dur)+'.');s.lunchStart=time(c);sync(s);render();return}if(t.dataset.off!==undefined){const e=w.employees[+t.dataset.employee],day=t.dataset.off,need=offLimit(e);if(t.checked&&!e.offDays.includes(day)){if(e.offDays.length>=need){t.checked=false;return}e.offDays=[...e.offDays,day]}if(!t.checked)e.offDays=e.offDays.filter(x=>x!==day);render();return}if(t.dataset.employee!==undefined){const e=w.employees[+t.dataset.employee],f=t.dataset.field;if(f==='name'){roster()[+t.dataset.employee].name=t.value.trim()||('Colaboradora '+e.id);render();return}if(f==='restricted'){roster()[+t.dataset.employee].restricted=t.checked;render();return}if(f==='postRotation')e[f]=t.checked;else if(f==='shift')e.shift=+t.value;else if(f==='station'){if(t.value==='pacote'||t.value==='fiscal')e.station=t.value;else{e.station='pdv';e.pdv=+t.value}}else if(f==='sundayWork'&&t.value==='true'&&sundayConflict(e)>=0){const k=sundayConflict(e);toast('Não é permitido: '+e.name+' já trabalha no domingo da semana '+(k+1)+' ('+short(date('domingo',k))+'). Ninguém pode trabalhar dois domingos seguidos.');render();return}else e[f]=f==='sundayWork'?t.value==='true':t.value;if(f==='sundayWork')e.offDays=e.offDays.slice(0,offLimit(e));render()}});
document.addEventListener('click',event=>{const wb=event.target.closest('[data-week]'),sb=event.target.closest('[data-sort]'),jump=event.target.closest('[data-jump]'),tab=event.target.closest('.tab'),model=event.target.closest('[data-model]'),apply=event.target.closest('#applyRotation'),copy=event.target.closest('[data-replicate]'),suggest=event.target.closest('[data-suggest-off]'),sun=event.target.closest('[data-suggest-sundays]'),allOff=event.target.closest('[data-suggest-off-all]'),posts=event.target.closest('#applyPosts'),gen=event.target.closest('#genRun'),und=event.target.closest('#genUndo');if(wb){state.selectedWeek=+wb.dataset.week;render();return}if(sb){setSort(sb.dataset.sort);return}if(jump){document.getElementById('operator-'+jump.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'center'});return}if(tab){activateTab(tab.dataset.tab);return}if(model){setModel(model.dataset.model);return}if(apply){applyRotation();return}if(copy){replicate(copy.dataset.replicate);return}if(suggest)suggestOffDays();if(sun)suggestSundays();if(allOff)suggestOffAll();if(posts)applyPostRotation();if(gen)generateAll();if(und)undoGenerate()});
document.getElementById('decreaseActive').addEventListener('click',()=>setActive(week().activeCount-1));document.getElementById('increaseActive').addEventListener('click',()=>setActive(week().activeCount+1));document.getElementById('decreasePdv').addEventListener('click',()=>setPdv(week().pdvCount-1));document.getElementById('increasePdv').addEventListener('click',()=>setPdv(week().pdvCount+1));
document.getElementById('printButton').addEventListener('click',()=>{if(issues().length){renderWarning();document.getElementById('scheduleWarning').scrollIntoView({behavior:'smooth',block:'center'});return}document.body.dataset.printMode='complete';window.print()});window.addEventListener('afterprint',()=>delete document.body.dataset.printMode);
document.getElementById('resetAllButton').addEventListener('click',()=>{if(window.confirm('Restaurar as 4 semanas de '+SECTORS[state.selectedSector]+'? Toda a escala deste setor será apagada (os outros setores não mudam).')){sector().weeks=[0,1,2,3].map(newWeek);state.selectedWeek=0;state.notice='';render()}});document.getElementById('resetButton').addEventListener('click',()=>{if(window.confirm('Restaurar somente a semana aberta? Esta ação não muda as outras semanas.')){sector().weeks[state.selectedWeek]=newWeek();render()}});document.getElementById('exportButton').addEventListener('click',exportBackup);document.getElementById('importFile').addEventListener('change',e=>{const f=e.target.files[0];if(f)importBackup(f);e.target.value=''});render();