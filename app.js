/* Recepção e Fiscal: as colaboradoras do mesmo posto não podem folgar no mesmo dia */
const NO_SAME_OFF = ['recepcao', 'fiscal'];
const POST_NAMES = {
  pacote: 'Pacote',
  fiscal: 'Fiscal',
  recepcao: 'Recepção',
  caixa: 'Operadora Caixa',
  equipe: 'Equipe',
  acougue: 'Açougue',
  frios: 'Frios',
  repositorfrios: 'Repositor de Frios',
  trocaetiqueta: 'Troca de Etiqueta',
  cartaz: 'Cartaz',
  limpeza: 'Limpeza',
  deposito: 'Depósito',
  reposicao: 'Reposição',
  producao: 'Produção',
  atendimento: 'Atendimento',
};
/* postos de cada setor (o posto é fixo da colaboradora; o rodízio é de turnos) e postos que precisam ter alguém no domingo */
const SECTOR_POSTS = {
  'frente-caixa': ['caixa', 'pacote', 'fiscal', 'recepcao'],
  'horti-fruit': ['equipe'],
  'acougue-frios': ['acougue', 'frios', 'repositorfrios', 'limpeza'],
  'loja-deposito': ['deposito', 'reposicao', 'trocaetiqueta', 'cartaz', 'limpeza'],
  padaria: ['producao', 'atendimento', 'limpeza'],
};
const SUNDAY_POSTS = {
  'frente-caixa': ['fiscal', 'recepcao'],
  'horti-fruit': [],
  'acougue-frios': ['acougue', 'frios'],
  'loja-deposito': ['deposito', 'reposicao'],
  padaria: ['producao', 'atendimento'],
};
const SUNDAY_POST_MIN = {
  'frente-caixa': { caixa: 2, pacote: 0, fiscal: 1, recepcao: 1 },
  'acougue-frios': { acougue: 2, frios: 2, repositorfrios: 0, limpeza: 0 },
  'loja-deposito': { deposito: 1, reposicao: 1, trocaetiqueta: 0, cartaz: 0, limpeza: 0 },
  padaria: { producao: 1, atendimento: 2, limpeza: 0 },
  'horti-fruit': { equipe: 1 },
};
/* Regras que o gestor pode mudar na aba "Regras" (ficam em state.settings, valem para a conta toda):
   - rules[setor].posts: postos ativos do setor; rules[setor].custom: postos criados pelo gestor;
   - rules[setor].noSameOff: postos cujas pessoas não devem folgar no mesmo dia;
   - avoidSaturday: as sugestões evitam folga no sábado (padrão: sim). */
const regras = (s = state.selectedSector) => (state.settings && state.settings.rules && state.settings.rules[s]) || {};
function todosPostos(s = state.selectedSector) {
  return [...(SECTOR_POSTS[s] || []), ...(regras(s).custom || []).map((c) => c.k)];
}
function postosDoSetor(s = state.selectedSector) {
  const todos = todosPostos(s),
    r = regras(s),
    ativos = Array.isArray(r.posts) ? todos.filter((k) => r.posts.includes(k)) : todos;
  return ativos.length ? ativos : todos;
}
function registraPostos() {
  const rs = (state.settings && state.settings.rules) || {};
  Object.keys(rs).forEach((s) => (rs[s].custom || []).forEach((c) => (POST_NAMES[c.k] = c.name)));
}
const noSameOff = () => {
  const r = regras().noSameOff;
  return (Array.isArray(r) ? r : NO_SAME_OFF).filter((k) => postKeys().includes(k));
};
const evitaSabado = () => !(state.settings && state.settings.avoidSaturday === false);
/* dias em que cada posto deve evitar folga (aba Regras): rules[setor].avoidDays[posto] = ['sábado', ...];
   posto sem lista própria segue o padrão (sábado, se "Evitar folga no sábado" estiver marcado) */
const diasEvitar = (k) => {
  const l = regras().avoidDays && regras().avoidDays[k];
  return Array.isArray(l) ? l : evitaSabado() ? ['sábado'] : [];
};
const evitaDia = (k, dia) => dia !== 'domingo' && diasEvitar(k).includes(dia);
const postKeys = () => postosDoSetor(state.selectedSector),
  hasPosts = () => postKeys().length > 0;
/* mínimo por posto no domingo: o que o gestor definiu ou o padrão do setor (soma = mínimo anterior do setor) */
function sundayPostMin(k) {
  const st = state.sectors && state.sectors[state.selectedSector],
    v = st && st.sundayPostMin && st.sundayPostMin[k];
  return Number.isFinite(v) ? v : (SUNDAY_POST_MIN[state.selectedSector] || {})[k] || 0;
}
const sundayPosts = () => postKeys().filter((k) => sundayPostMin(k) > 0);
const DEFAULTS = {
    earlyBefore: '09:00',
    weekClose: '19:30',
    sundayClose: '18:00',
    alternateSundays: true,
    extraText: '',
    v10: 1,
  },
  EXTRA_MAX = 90;
const SECTORS = {
  'frente-caixa': 'Frente de Caixa',
  'acougue-frios': 'Açougue e Frios',
  'loja-deposito': 'Loja e Depósito',
  padaria: 'Padaria',
  'horti-fruit': 'Horti Fruit',
};
const SUNDAY_MIN = { 'frente-caixa': 4, 'acougue-frios': 4, 'loja-deposito': 2, padaria: 3, 'horti-fruit': 1 };
function sundayMin() {
  return hasPosts() ? postKeys().reduce((t, k) => t + sundayPostMin(k), 0) : SUNDAY_MIN[state.selectedSector] || 0;
}
/* a semana começa no DOMINGO e termina no sábado (o número é o deslocamento a partir do domingo de referência) */
const DAYS = [
  ['domingo', 'Dom.', 0],
  ['segunda', 'Seg.', 1],
  ['terça', 'Ter.', 2],
  ['quarta', 'Qua.', 3],
  ['quinta', 'Qui.', 4],
  ['sexta', 'Sex.', 5],
  ['sábado', 'Sáb.', 6],
];
const WD = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']; /* dias úteis em ordem (índices 0 a 5) */
const PRESETS = [
    ['07:00', '11:00'],
    ['09:30', '12:00'],
    ['10:10', '13:00'],
  ],
  COLORS = ['#d12d32', '#f0a919', '#245da8', '#7d4db0', '#14845a'];
const TRAFFIC = [
  ['Manhã', '08:00', '10:00', 3],
  ['Almoço', '12:00', '15:00', 4],
  ['Tarde', '15:00', '18:00', 6],
  ['Fechamento', '18:00', '19:30', 6],
];
const pad = (n) => String(n).padStart(2, '0'),
  mins = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
const time = (n) => {
  n = ((n % 1440) + 1440) % 1440;
  return pad(Math.floor(n / 60)) + ':' + pad(n % 60);
};
const plus = (t, n) => time(mins(t) + n),
  iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
/* início da semana = o DOMINGO em ou antes da data (o nome "baseMonday" ficou só no que é gravado na nuvem) */
function monday(value) {
  const d = value instanceof Date ? new Date(value) : new Date(value + 'T12:00:00');
  d.setDate(d.getDate() - d.getDay());
  return iso(d);
}
const LAW_42 = new Date('2026-12-16T12:00:00'),
  LAW_40 = new Date('2027-12-16T12:00:00');
function weeklyLimit(idx = state ? state.selectedWeek : 0) {
  if (!state || !state.baseMonday) return 44;
  const d = date('domingo', idx);
  return d >= LAW_40 ? 40 : d >= LAW_42 ? 42 : 44;
}
function workDuration(model, idx = state ? state.selectedWeek : 0) {
  const l = weeklyLimit(idx);
  return model === '6x1' ? l * 10 : Math.min(504, l * 12); /* 5x2: 42h semanais = 8h24 por dia (40h = 8h por dia) */
}
/* fechamento de segunda a sábado (a configuração só existe depois que o estado é carregado) */
const closeMin = () => mins((typeof state !== 'undefined' && state && state.settings && state.settings.weekClose) || '19:30');
/* a jornada (carga + 2h de almoço) tem que caber até o fechamento: esta é a entrada mais tarde permitida */
const maxStart = (model, wi) => closeMin() - (workDuration(model, wi) + 120);
/* tolerância: a jornada pode terminar até 15 min depois do fechamento (atendimento de quem ainda está na loja) */
const TOL_FECH = 15;
const maxStartTol = (model, wi) => maxStart(model, wi) + TOL_FECH;
/* faixa permitida para o início do almoço: até 6h seguidas antes e depois, sempre cumprindo a carga */
function lunchWin(startM, model, wi) {
  const dur = workDuration(model, wi);
  return [startM + Math.max(60, dur - 360), startM + 360];
}
function shift(index, model = '5x2') {
  const [start0, lunch0] = PRESETS[index] || [plus('10:10', (index - 2) * 40), plus('13:00', (index - 2) * 40)],
    work = workDuration(model),
    start = time(Math.min(mins(start0), maxStart(model, 0))),
    [lo, hi] = lunchWin(mins(start), model, 0),
    lunchStart = time(Math.min(hi, Math.max(lo, mins(lunch0) + mins(start) - mins(start0))));
  return {
    name: index + 1 + 'º turno',
    start,
    lunchStart,
    lunchEnd: plus(lunchStart, 120),
    end: plus(start, work + 120),
    color: COLORS[index % COLORS.length],
  };
}
function worker(id, shifts = 3) {
  return {
    id,
    name: 'Colaboradora ' + id,
    shift: (id - 1) % shifts,
    pdv: ((id - 1) % 10) + 1,
    station: 'caixa',
    offDays: id % 2 ? ['sexta'] : ['segunda'],
    sundayWork: false,
    restricted: false,
  };
}
function distribute(total, count) {
  const base = Math.floor(total / count),
    extra = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}
function rotation(active = 12, shifts = 3) {
  return { enabled: false, counts: distribute(active, shifts), message: '' };
}
function newWeek() {
  const w = {
    model: '5x2',
    activeCount: 12,
    pdvCount: 10,
    shifts: [0, 1, 2].map((i) => shift(i)),
    employees: Array.from({ length: 12 }, (_, i) => worker(i + 1)),
    sortField: 'start',
    sortDirection: 'asc',
    rotation: rotation(),
  };
  autoLunch(w, 0, 0);
  return w;
}
/* Almoços em cascata, sempre com alguém trabalhando: com 2 turnos o 2º almoça quando o 1º volta;
   com 3 ou mais, cada almoço começa 1h depois do anterior. A partir do turno "from" (0 = todos depois do 1º). */
function autoLunch(w, wi, from = 0) {
  if (!autoAlmoco(w)) return;
  const n = w.shifts.length;
  for (let j = Math.max(1, from + 1); j < n; j++) {
    const prev = w.shifts[j - 1],
      s = w.shifts[j],
      target = n === 2 ? mins(prev.lunchStart) + 120 : mins(prev.lunchStart) + 60,
      [lo, hi] = lunchWin(mins(s.start), w.model, wi);
    s.lunchStart = time(Math.min(hi, Math.max(lo, target)));
    s.lunchEnd = plus(s.lunchStart, 120);
  }
}
/* Leva a entrada para dentro do horário de fechamento e acerta o almoço dentro da faixa permitida.
   Devolve os nomes dos turnos cuja entrada mudou. */
function fitShifts(w, wi) {
  const mudou = [],
    mx = maxStart(w.model, wi);
  w.shifts.forEach((s) => {
    const old = mins(s.start);
    if (old > mx) {
      const d = mx - old;
      s.start = time(mx);
      s.lunchStart = plus(s.lunchStart, d);
      mudou.push(s.name);
    }
    const [lo, hi] = lunchWin(mins(s.start), w.model, wi);
    s.lunchStart = time(Math.min(hi, Math.max(lo, mins(s.lunchStart))));
    sync(s, w.model, wi, w);
  });
  return mudou;
}
/* primeiro intervalo do dia em que nenhum turno (com gente escalada) está trabalhando; null = sem buraco */
function gapOf(w) {
  const on = w.shifts;
  if (on.length < 1) return null;
  const a = Math.min(...on.map((s) => mins(s.start))),
    b = Math.max(...on.map((s) => mins(s.start) + (mins(s.end) - mins(s.start) + 1440) % 1440));
  let ini = null;
  for (let t = a; t <= b; t++) {
    const cov = t < b && on.some((s) => {
      const st = mins(s.start),
        en = st + ((mins(s.end) - st + 1440) % 1440),
        ls = mins(s.lunchStart),
        le = mins(s.lunchEnd);
      return t >= st && t < en && !(t >= ls && t < le);
    });
    if (!cov && t < b && ini === null) ini = t;
    if ((cov || t === b) && ini !== null) {
      if (t - ini > 5) return [ini, t]; /* tolerância de 5 min na troca de almoços */
      ini = null;
    }
  }
  return null;
}
function newSector() {
  return { weeks: [0, 1, 2, 3].map(newWeek) };
}
function newState() {
  return {
    selectedSector: 'frente-caixa',
    selectedWeek: 0,
    baseMonday: monday(new Date()),
    sectors: Object.fromEntries(Object.keys(SECTORS).map((k) => [k, newSector()])),
  };
}
function load() {
  return newState();
} /* dados só da nuvem: nada é lido do aparelho (veja sync.js) */
var state;
state = load();
if (state.settings && !state.settings.v10) state.settings.sundayClose = '18:00';
state.settings = { ...DEFAULTS, ...state.settings };
const clone = (value) => JSON.parse(JSON.stringify(value));
function sector() {
  if (!state.sectors[state.selectedSector]) state.sectors[state.selectedSector] = newSector();
  return state.sectors[state.selectedSector];
}
function week() {
  if (!sector().weeks) sector().weeks = [0, 1, 2, 3].map(newWeek);
  return sector().weeks[state.selectedWeek] || (sector().weeks[state.selectedWeek] = newWeek());
}
const hasPdv = () => state.selectedSector === 'frente-caixa',
  neededOff = () => (week().model === '6x1' ? 1 : 2);
function date(key, index = state.selectedWeek) {
  const day = DAYS.find((d) => d[0] === key),
    d = new Date(state.baseMonday + 'T12:00:00');
  d.setDate(d.getDate() + day[2] + index * 7);
  return d;
}
const short = (d) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d),
  range = (i) => short(date('domingo', i)) + ' a ' + short(date('sábado', i));
function escape(v) {
  const e = document.createElement('div');
  e.textContent = v;
  return e.innerHTML;
}
function autoAlmoco(w) {
  return !w || w.autoAlmoco !== false;
}
function autoSaida(w) {
  return !w || w.autoSaida !== false;
}
function sync(s, model = week().model, idx = state.selectedWeek, w = week()) {
  s.lunchEnd = plus(s.lunchStart, 120);
  if (autoSaida(w) || !s.end) s.end = plus(s.start, workDuration(model, idx) + 120);
}
function stationOk(s, id) {
  const k = postKeys();
  if (!k.length) return 'pdv';
  if (k.includes(s)) return s;
  if (s === 'pdv' && k.includes('caixa')) return 'caixa';
  return hasPdv() ? 'caixa' : k[(id - 1) % k.length];
}
function normalizeWeek(w) {
  w.model = w.model === '6x1' ? '6x1' : '5x2';
  w.activeCount = Math.min(50, Math.max(1, +w.activeCount || 12));
  w.pdvCount = Math.min(30, Math.max(1, +w.pdvCount || 10));
  w.shifts = (w.shifts || []).map((s, i) => ({ ...shift(i, w.model), ...s }));
  const wi = Math.max(0, sector().weeks.indexOf(w));
  w.shifts.forEach((s) => sync(s, w.model, wi, w));
  w.sunday = normSunday(w.sunday, w.model, wi);
  w.rotation = w.rotation || rotation(w.activeCount, w.shifts.length);
  w.rotation.enabled = !!w.rotation.enabled;
  w.rotation.counts = Array.from({ length: w.shifts.length }, (_, i) => Math.max(0, +w.rotation.counts?.[i] || 0));
  w.rotation.message = w.rotation.message || '';
  w.employees = Array.from({ length: w.activeCount }, (_, i) => {
    const e = w.employees?.[i] || worker(i + 1, w.shifts.length),
      off = Array.isArray(e.offDays)
        ? e.offDays
        : e.off === 'domingo e segunda'
          ? ['domingo', 'segunda']
          : ['sábado', 'domingo'];
    return {
      ...e,
      id: i + 1,
      name: e.name || 'Colaboradora ' + (i + 1),
      offDays: [...new Set(off)].filter((x) => x !== 'domingo'),
      shift: Math.min(+e.shift || 0, w.shifts.length - 1),
      pdv: Math.min(Math.max(1, +e.pdv || 1), w.pdvCount),
      station: stationOk(e.station, e.id),
      sundayWork: off.includes('domingo') ? false : !!e.sundayWork,
      restricted: !!e.restricted,
      postRotation: !!e.postRotation,
    };
  });
  w.sortField = w.sortField || 'start';
  w.sortDirection = w.sortDirection || 'asc';
  return w;
}
/* nomes "Nº turno" seguem a ordem das entradas (nomes personalizados ficam como estão) */
function renameShifts(w) {
  const padrao = (n) => /^\d+º turno$/.test(n);
  if (w.shifts.every((s) => padrao(s.name))) w.shifts.forEach((s, i) => (s.name = i + 1 + 'º turno'));
}
function sortShifts(w = week()) {
  const items = w.shifts.map((s, i) => ({ s, i })).sort((a, b) => mins(a.s.start) - mins(b.s.start)),
    map = new Map(items.map((x, i) => [x.i, i]));
  w.shifts = items.map((x) => x.s);
  w.employees = w.employees.map((e) => ({ ...e, shift: map.get(+e.shift) ?? 0 }));
  renameShifts(w);
}
function normalize() {
  registraPostos();
  state.settings = { ...DEFAULTS, ...state.settings };
  sector().weeks.forEach((x, k) => {
    normalizeWeek(x);
    sortShifts(x);
    /* almoços coincidentes (dados antigos ou edição): refaz a cascata para sempre haver alguém trabalhando */
    if (gapOf(x)) autoLunch(x, k, 0);
  });
  const r = roster();
  sector().weeks.forEach((w, wk) =>
    w.employees.forEach((e, i) => {
      e.name = r[i].name;
      e.restricted = r[i].restricted;
      /* folga fixa: os dias marcados ficam travados em todas as semanas (o gerador só completa o que faltar) */
      if (Array.isArray(r[i].folgaFixa) && r[i].folgaFixa.length) {
        e.folgaFixa = r[i].folgaFixa.slice();
        const travados = e.folgaFixa.filter((d) => !closedDay(d, wk)).slice(0, offLimit(e, w.model));
        e.offDays = [...travados, ...e.offDays.filter((d) => !travados.includes(d))]
          .slice(0, offLimit(e, w.model))
          .sort((a, b) => DAYS.findIndex((x) => x[0] === a) - DAYS.findIndex((x) => x[0] === b));
      } else delete e.folgaFixa;
      if (hasPosts()) e.station = stationOk(r[i].station, e.id);
      /* turno fixo: a posição do turno (1º, 2º...) fica travada em todas as semanas */
      if (Number.isInteger(r[i].fixo)) {
        e.fixo = Math.min(r[i].fixo, w.shifts.length - 1);
        e.shift = e.fixo;
      } else delete e.fixo;
    }),
  );
}
/* nome e restrição de cada colaboradora, por setor: alterados na ficha, valem nas 4 semanas */
function roster() {
  const all = (state.roster = state.roster || {}),
    s = state.selectedSector;
  if (!all[s]) all[s] = [];
  const arr = all[s],
    w0 = sector().weeks[0];
  for (let i = 0; i < 50; i++)
    if (!arr[i]) {
      const e = w0 && w0.employees && w0.employees[i];
      arr[i] = {
        name: (e && e.name) || 'Colaboradora ' + (i + 1),
        restricted: !!(e && e.restricted),
        station: e && e.station,
      };
    }
  for (let i = 0; i < 50; i++)
    if (!arr[i].station) {
      const e = w0 && w0.employees && w0.employees[i];
      arr[i].station = e && e.station;
    }
  return arr;
}
/* ===== férias, atestados e afastamentos: ficam na ficha da pessoa (roster), por data, e valem em todas as semanas ===== */
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const AUS_TIPOS = { ferias: 'Férias', atestado: 'Atestado', outro: 'Afastamento' };
function ausente(e, key, wi = state.selectedWeek) {
  const w = sector().weeks && sector().weeks[wi];
  if (!w) return null;
  const rs = state.roster && state.roster[state.selectedSector];
  if (!rs) return null;
  const i = w.employees.indexOf(e);
  const a = i >= 0 && rs[i] && rs[i].aus;
  if (!a || !a.length) return null;
  const t = ymd(date(key, wi));
  return a.find((x) => x.de <= t && t <= x.ate) || null;
}
const ausSemana = (e, wi = state.selectedWeek) => DAYS.some((d) => ausente(e, d[0], wi));
/* fora a semana inteira (férias/atestado em todos os dias): não recebe turno, posto, PDV, folga nem domingo nessa semana */
const foraSemana = (e, wi = state.selectedWeek) => DAYS.every((d) => ausente(e, d[0], wi));
/* recalcula as semanas atingidas por uma ausência: tira a pessoa do domingo (e tenta repor por alguém do mesmo posto) e refaz as folgas */
function recalcAus(de, ate) {
  const weeks = sector().weeks,
    feitas = [];
  feitas.semSub = [];
  weeks.forEach((w, wi) => {
    const ini = ymd(date('domingo', wi)),
      fim = ymd(date('sábado', wi));
    if (ate < ini || de > fim) return;
    normalizeWeek(w);
    w.employees.forEach((e, i) => {
      if (e.sundayWork && ausente(e, 'domingo', wi)) {
        e.sundayWork = false;
        const livre = (x, k) =>
          !x.sundayWork &&
          !ausente(x, 'domingo', wi) &&
          !(weeks[wi - 1] && weeks[wi - 1].employees[k] && weeks[wi - 1].employees[k].sundayWork) &&
          !(weeks[wi + 1] && weeks[wi + 1].employees[k] && weeks[wi + 1].employees[k].sundayWork);
        const sub =
          w.employees.find((x, k) => x.station === e.station && x.shift === e.shift && livre(x, k)) ||
          w.employees.find((x, k) => x.station === e.station && livre(x, k));
        if (sub) sub.sundayWork = true;
        else feitas.semSub.push(wi + 1);
      }
    });
    balanceOffs(w, true);
    if (hasPdv()) assignPdvs(w, wi);
    feitas.push(wi + 1);
  });
  return feitas;
}
function addAusencia(i, tipo, de, ate) {
  if (!de || !ate) return toast('Erro: informe a data de início e a data de fim.');
  if (ate < de) return toast('Erro: a data de fim é antes da data de início.');
  const r = roster()[i];
  if (!r) return;
  r.aus = r.aus || [];
  if (r.aus.some((x) => !(ate < x.de || de > x.ate))) return toast('Erro: essa pessoa já tem uma ausência registrada nesse período.');
  r.aus.push({ tipo: AUS_TIPOS[tipo] ? tipo : 'outro', de, ate });
  r.aus.sort((a, b) => (a.de < b.de ? -1 : 1));
  const f = recalcAus(de, ate);
  render();
  toast(
    AUS_TIPOS[tipo] +
      ' de ' +
      r.name +
      ' registrado(a): ' +
      brData(de) +
      ' a ' +
      brData(ate) +
      '. ' +
      (f.length ? 'Folgas e domingos recalculados na(s) semana(s) ' + f.join(', ') + '.' : 'O período fica fora das 4 semanas abertas; vale quando o ciclo chegar nessas datas.') +
      (f.semSub.length
        ? ' Atenção: no domingo da(s) semana(s) ' + f.semSub.join(', ') + ' não havia ninguém livre do mesmo posto para substituir (sem repetir domingo); escolha a substituta na escala de domingo.'
        : ''),
    !f.semSub.length,
  );
}
function delAusencia(i, k) {
  const r = roster()[i];
  if (!r || !r.aus || !r.aus[k]) return;
  const x = r.aus.splice(k, 1)[0];
  const f = recalcAus(x.de, x.ate);
  render();
  toast('Ausência removida.' + (f.length ? ' Folgas recalculadas na(s) semana(s) ' + f.join(', ') + '. Confira os domingos.' : ''), true);
}
document.addEventListener('click', (ev) => {
  const a = ev.target.closest && ev.target.closest('[data-aus-add]'),
    d = ev.target.closest && ev.target.closest('[data-aus-del]');
  if (a) {
    const box = a.closest('.aus-box');
    addAusencia(+a.dataset.ausAdd, box.querySelector('[data-aus-tipo]').value, box.querySelector('[data-aus-de]').value, box.querySelector('[data-aus-ate]').value);
  }
  if (d) delAusencia(+d.dataset.ausDel, +d.dataset.k);
});
/* ===== geração automática (opcional): só roda quando o botão é clicado; guarda cópia para desfazer ===== */
/* estudante/mãe: CCT protege contra escala após 18h; troca de turno com quem não tem restrição (preferindo quem não trabalha no domingo) */
function swapRestricted(w) {
  const ok = (e) => mins(w.shifts[e.shift].end) <= 1080,
    bad = w.employees.filter((e) => e.restricted && !ok(e));
  const pool = w.employees
    .filter((e) => !e.restricted && ok(e))
    .sort((a, b) => (a.sundayWork ? 1 : 0) - (b.sundayWork ? 1 : 0));
  let done = 0;
  bad.forEach((e) => {
    const f = pool.shift();
    if (!f) return;
    const t = e.shift;
    e.shift = f.shift;
    f.shift = t;
    done++;
  });
  return bad.length - done;
}
function swapSundayShifts(w) {
  const close = sc(),
    late = (e) => mins(w.shifts[e.shift].end) > close;
  const sun = w.employees.filter((e) => e.sundayWork && late(e)),
    pool = w.employees.filter((e) => !e.sundayWork && !e.restricted && !late(e));
  let done = 0;
  sun.forEach((e) => {
    const f = pool.shift();
    if (!f) return;
    const t = e.shift;
    e.shift = f.shift;
    f.shift = t;
    done++;
  });
  return sun.length - done;
}
/* PDV: ninguém divide o mesmo PDV com quem trabalha no mesmo dia e horário; mantém o número atual quando está livre */
function assignPdvs(w, wi, fresh) {
  const emps = w.employees.filter((e) => e.station === 'caixa' && !foraSemana(e, wi)),
    days = (e) => DAYS.filter((d) => worksOn(e, d[0], wi)).map((d) => d[0]);
  const iv = (e) => [mins(w.shifts[e.shift].start), mins(w.shifts[e.shift].end)];
  const clash = (a, b) => {
    const x = iv(a),
      y = iv(b);
    if (!(x[0] < y[1] && y[0] < x[1])) return false;
    const da = days(a);
    return days(b).some((d) => da.includes(d));
  };
  const act = activePdvs(w);
  const done = [];
  let short = 0;
  /* fresh: quem entra mais cedo (1º turno) pega os PDVs mais baixos, 1 a 4 primeiro */
  if (fresh) emps.sort((a, b) => mins(w.shifts[a.shift].start) - mins(w.shifts[b.shift].start) || a.id - b.id);
  const plan = (fresh && sector().pdvPlan) || {},
    reserved = new Set(Object.values(plan).flat());
  emps.forEach((e) => {
    const used = new Set(done.filter((o) => clash(e, o)).map((o) => o.pdv));
    let pick = !fresh && act.includes(e.pdv) && !used.has(e.pdv) ? e.pdv : 0;
    /* PDVs escolhidos para este turno; sem escolha, usa os que não foram reservados a outro turno */
    const mine = (plan[e.shift] || []).filter((n) => act.includes(n)).sort((x, y) => x - y);
    if (!pick && mine.length) pick = mine.find((n) => !used.has(n)) || 0;
    /* revezamento: sem PDV livre entre os marcados, assume o PDV de quem é de outro turno e sai antes (troca de operadora) */
    const share = (list) => {
      const ok = list.filter((n) => {
          const h = done.filter((o) => o.pdv === n && clash(e, o));
          return (
            h.length >= 1 && h.every((o) => o.shift !== e.shift) && new Set(h.map((o) => o.shift)).size === h.length
          );
        }),
        cnt = (n) => done.filter((o) => o.pdv === n && clash(e, o)).length,
        endOf = (n) =>
          Math.max(...done.filter((o) => o.pdv === n && clash(e, o)).map((o) => mins(w.shifts[o.shift].end)));
      return ok.sort((x, y) => cnt(x) - cnt(y) || endOf(x) - endOf(y) || x - y)[0] || 0;
    };
    if (!pick && fresh && mine.length) pick = share(mine);
    if (!pick && fresh && !mine.length)
      for (const n of act)
        if (!used.has(n) && !reserved.has(n)) {
          pick = n;
          break;
        }
    if (!pick && fresh)
      for (const n of act)
        if (!used.has(n) && !reserved.has(n)) {
          pick = n;
          break;
        }
    if (!pick)
      for (const n of act)
        if (!used.has(n)) {
          pick = n;
          break;
        }
    if (!pick && fresh) pick = share(act);
    if (!pick) {
      pick = act[(e.id - 1) % act.length];
      short++;
    }
    e.pdv = pick;
    done.push(e);
  });
  return short;
}
async function generateAll() {
  if (!baseOk()) {
    needBase();
    return;
  }
  const g = state.gen || {},
    sel = state.selectedSector;
  if (
    !(await askConfirm(
      'Gerar a escala de ' +
        SECTORS[sel] +
        ' nas 4 semanas?\n\nSerá refeito: folgas' +
        (g.posts ? ', turnos dos postos' : '') +
        (hasPdv() && g.pdv ? ', números de PDV' : '') +
        '. Serão mantidos: nomes e os domingos que você já definiu. Você pode desfazer depois.',
    ))
  )
    return;
  state.undo = { ...(state.undo || {}), [sel]: { at: new Date().toISOString(), weeks: clone(sector().weeks) } };
  state.selectedWeek = 0;
  const weeks = sector().weeks;
  weeks.forEach((w) => {
    normalizeWeek(w);
    sortShifts(w);
  });
  const r = fillSundays();
  let late = 0,
    shortPdv = 0,
    restr = 0,
    postNotes = [];
  if (hasPosts() && g.posts) {
    const rp = applyPostPlan(true);
    if (rp && rp.notes.length) postNotes = rp.notes;
  }
  weeks.forEach((w) => {
    restr += swapRestricted(w);
  });
  weeks.forEach((w) => balanceOffs(w, true));
  if (hasPdv()) {
    if (g.pdv)
      weeks.forEach((w, wi) => {
        shortPdv += assignPdvs(w, wi, true);
      });
  }
  state.selectedWeek = 0;
  const list = compliance(),
    er = list.filter((x) => x.level === 'erro').length,
    at = list.filter((x) => x.level === 'atenção').length;
  state.notice =
    'Escala gerada para ' +
    SECTORS[sel] +
    '. ' +
    sundayNote(r) +
    MOVE_NOTE +
    (shortPdv
      ? ' ' + shortPdv + ' colaboradora(s) ficaram sem PDV exclusivo: há mais pessoas simultâneas do que PDVs.'
      : '') +
    (postNotes.length ? ' Rodízio de turnos dos postos: ' + postNotes.join('; ') + '.' : '') +
    (restr ? ' ' + restr + ' colaboradora(s) com restrição após 18h não couberam em turno que termina até 18h.' : '') +
    (late ? ' ' + late + ' colaboradora(s) de domingo ficaram com turno que termina depois do fechamento.' : '') +
    ' Conformidade: ' +
    (er ? er + ' erro(s)' : 'sem erros') +
    (at ? ', ' + at + ' atenção(ões)' : '') +
    '. Use "Desfazer última geração" para voltar.';
  render();
  toast(
    'Escala gerada. ' + (er ? er + ' erro(s) de conformidade — veja o painel.' : 'Sem erros de conformidade.'),
    !er,
  );
}
async function undoGenerate() {
  const sel = state.selectedSector,
    u = state.undo && state.undo[sel];
  if (!u) return;
  if (
    !(await askConfirm('Desfazer a última alteração grande de ' + SECTORS[sel] + '? O setor volta ao que estava antes dela.'))
  )
    return;
  sector().weeks = u.weeks;
  if (u.roster) {
    state.roster = state.roster || {};
    state.roster[sel] = u.roster;
  }
  delete state.undo[sel];
  state.notice = '';
  render();
  toast('Alteração desfeita.', true);
}
function renderGen() {
  state.gen = { shifts: 'girar', pdv: true, posts: true, ...(state.gen || {}) };
  const g = state.gen,
    u = state.undo && state.undo[state.selectedSector];
  document.getElementById('genPanel').innerHTML =
    `<div class="gen-col"><div class="setting-block"><label>Geração automática (opcional)</label><p class="helper">Nada é gerado sozinho: a escala só muda quando você clicar em "Gerar". Antes, escolha na Semana 1 quem trabalha no domingo. O app monta as 4 semanas deste setor respeitando CLT, EC 141/2026 e CCT.</p></div>
  <button class="button full" id="genRun" type="button">Gerar escala do setor</button>
  <button class="button outline full" id="genUndo" type="button" ${u ? '' : 'disabled'}>Desfazer última geração${u ? ' (' + short(new Date(u.at)) + ' ' + pad(new Date(u.at).getHours()) + ':' + pad(new Date(u.at).getMinutes()) + ')' : ''}</button>
  <p class="helper">Substitui as folgas${g.posts ? ', os turnos dos postos' : ''}${hasPdv() ? ' e os números de PDV' : ''}. Mantém nomes e os domingos de semanas que você já preencheu.</p></div>
  ${hasPosts() ? `<div class="gen-col">` : ''}${hasPosts() ? `<div class="setting-block">${hasPdv() ? `<label class="check-row"><input type="checkbox" id="genPdv" ${g.pdv ? 'checked' : ''} /> Distribuir PDVs sem repetir no mesmo dia e horário</label>` : ''}<label class="check-row"><input type="checkbox" id="genPosts" ${g.posts ? 'checked' : ''} /> Aplicar o rodízio de turnos dos postos (vagas cedo/tarde da aba Rodízio)</label></div>` : ''}${hasPosts() ? '</div>' : ''}
  <div class="gen-col"><div class="setting-block"><label>Movimento esperado por dia</label><p class="helper">Como o gerente: dias de mais movimento ficam com menos folgas e a equipe maior. O app distribui as folgas por turno pelo movimento, mantém ao menos metade de cada turno presente e nunca deixa um posto (Fiscal, Recepção, Pacote…) sem ninguém. Vale também para "Sugerir folgas".</p>
  <div class="mov-grid">${DAYS.map((d) => `<label>${d[1]}<select data-mov="${d[0]}">${MOV_LEVELS.map((l) => `<option value="${l[0]}" ${movement()[d[0]] === l[0] ? 'selected' : ''}>${l[1]}</option>`).join('')}</select></label>`).join('')}</div></div>
  ${ciclosPanel()}</div>`;
}
/* ===== continuidade: avançar para o próximo ciclo de 4 semanas (vale para todos os setores, que usam a mesma data) ===== */
const addDias = (isoStr, n) => {
  const d = new Date(isoStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};
const brData = (isoStr) => short(new Date(isoStr + 'T12:00:00'));
const cicloTxt = (ini) => brData(ini) + ' a ' + brData(addDias(ini, 27));
function ciclosPanel() {
  const cs = sector().ciclos || [];
  return `<div class="setting-block ciclos-block"><label>Ciclo de 4 semanas</label><p class="helper">Ciclo atual: <b>${cicloTxt(state.baseMonday)}</b>. Ao chegar na Semana 4, avance para o próximo ciclo: equipe, turnos, postos e rodízio continuam, os domingos seguem a sequência (quem trabalhou no último domingo folga no primeiro do novo ciclo) e o ciclo atual fica guardado. Vale para todos os setores.</p>
  <button class="button secondary full" id="cicloAvancar" type="button">Avançar para o próximo ciclo (${cicloTxt(addDias(state.baseMonday, 28))})</button>
  ${cs.length ? `<p class="helper"><b>Ciclos anteriores</b> (${SECTORS[state.selectedSector]})</p><ul class="ciclos-lista">${cs.map((c) => `<li><span>${cicloTxt(c.inicio)}</span><button type="button" class="button outline" data-ciclo="${c.inicio}">Voltar a este ciclo</button></li>`).join('')}</ul>` : '<p class="helper">Nenhum ciclo anterior guardado ainda.</p>'}</div>`;
}
function avancaDomingos(velhas, novas, reais = velhas) {
  /* continua a sequência: quem trabalhou no último domingo do ciclo anterior não trabalha no primeiro do novo; mantém a quantidade de cada semana */
  const works = (w, i) => !!(w && w.employees[i] && w.employees[i].sundayWork),
    feitos = {},
    curtas = [];
  const count = (i) => reais.reduce((t, w) => t + (works(w, i) ? 1 : 0), 0) + (feitos[i] || 0);
  novas.forEach((w, wi) => {
    const k = velhas[wi].employees.filter((e) => e.sundayWork).length,
      ant = wi === 0 ? reais[reais.length - 1] : novas[wi - 1];
    w.employees.forEach((e) => (e.sundayWork = false));
    const cand = w.employees
        .map((e, i) => i)
        .filter((i) => !works(ant, i))
        .sort((a, b) => count(a) - count(b) || a - b),
      pick = [],
      take = (i) => {
        if (i !== undefined && !pick.includes(i) && pick.length < k) pick.push(i);
      };
    if (hasPosts())
      sundayPosts().forEach((p) => {
        for (let n = 0; n < sundayPostMin(p); n++) take(cand.find((i) => w.employees[i].station === p && !pick.includes(i)));
      });
    cand.forEach(take);
    pick.forEach((i) => {
      w.employees[i].sundayWork = true;
      feitos[i] = (feitos[i] || 0) + 1;
    });
    if (pick.length < k) curtas.push(wi + 1);
  });
  return curtas;
}
/* semanas do ciclo atual que já passaram e não têm ponto (AFD) importado; só avisa quem já usa o ponto em algum setor */
function semPontoPassado() {
  const hoje = iso(new Date()),
    usa = Object.values(state.sectors).some((x) => x && x.realizado && Object.keys(x.realizado).length),
    lista = [];
  if (!usa) return lista;
  const orig = state.selectedSector;
  Object.keys(state.sectors).forEach((k) => {
    if (!state.sectors[k] || !state.sectors[k].weeks) return;
    state.selectedSector = k;
    for (let wi = 0; wi < 4; wi++) if (iso(date('sábado', wi)) < hoje && !semanaReal(wi)) lista.push(SECTORS[k] + ' (semana ' + (wi + 1) + ')');
  });
  state.selectedSector = orig;
  return lista;
}
async function pedeAvancarCiclo() {
  const sem = semPontoPassado();
  const txt =
    'Avançar para o ciclo ' + cicloTxt(addDias(state.baseMonday, 28)) + '? O ciclo atual (' + cicloTxt(state.baseMonday) + ') fica guardado em todos os setores e os domingos seguem a sequência.' +
    (sem.length ? '\n\nAtenção: estas semanas já passaram e não têm ponto (AFD) importado: ' + sem.slice(0, 6).join(', ') + (sem.length > 6 ? '…' : '') + '. Sem o ponto, o rodízio de domingo usa o plano e não o que realmente aconteceu. Cancele para importar o AFD antes (Importar planilha…).' : '');
  if (await askConfirm(txt)) avancaCiclo();
}
/* setas do ciclo: ◀ volta (ciclo guardado ou data anterior); ▶ vai a um ciclo guardado ou avança para o próximo */
async function cicloVai(dir) {
  const alvo = addDias(state.baseMonday, 28 * dir),
    guardado = (sector().ciclos || []).find((c) => c.inicio === alvo);
  if (guardado) return voltaCiclo(alvo);
  if (dir > 0 && !(sector().planos && sector().planos[alvo])) return pedeAvancarCiclo();
  if (window.afdRealizado) window.afdRealizado.troca(alvo);
  else state.baseMonday = alvo;
  state.selectedWeek = 0;
  render();
}
function avancaCiclo() {
  if (window.afdRealizado) window.afdRealizado.restauraTodos();
  const velho = state.baseMonday,
    sel = state.selectedSector,
    avisos = [];
  Object.keys(state.sectors).forEach((sk) => {
    const sec = state.sectors[sk];
    if (!sec || !sec.weeks) return;
    state.selectedSector = sk;
    sec.weeks.forEach(normalizeWeek);
    const velhas = JSON.parse(JSON.stringify(sec.weeks));
    sec.ciclos = [{ inicio: velho, guardado: new Date().toISOString(), semanas: velhas }, ...(sec.ciclos || [])].slice(0, 6);
    const novas = JSON.parse(JSON.stringify(sec.weeks));
    /* domingos realmente trabalhados (ponto/AFD) valem mais que o plano para continuar o rodízio */
    const reais = JSON.parse(JSON.stringify(velhas));
    reais.forEach((rw, rwi) => {
      const S = addDias(velho, 7 * rwi),
        rr = sec.realizado && sec.realizado[S];
      if (!rr) return;
      rw.employees.forEach((e) => {
        const p = rr.pessoas[e.name];
        if (p && p[S] !== undefined) e.sundayWork = p[S].length > 0;
      });
    });
    const curtas = avancaDomingos(velhas, novas, reais);
    /* rodízio mensal/quinzenal: ao virar o ciclo, a equipe gira para o(s) turno(s) seguinte(s) (sem mexer em turno fixo) */
    const per = RODIZIO[sec.rodizio] || 1;
    if (per > 1)
      novas.forEach((w) => {
        const S = w.shifts.length,
          passo = per === 4 ? 1 : 2;
        w.employees.forEach((e) => {
          if (e.fixo === undefined && S > 1) e.shift = (e.shift + passo) % S;
        });
      });
    novas.forEach((w, wi) =>
      w.employees.forEach((e, i) => {
        const antes = (velhas[wi].employees[i] || {}).sundayWork;
        if (!!antes !== !!e.sundayWork) e.offDays = offForEmp(w, e, i);
      }),
    );
    sec.weeks = novas;
    if (curtas.length) avisos.push(SECTORS[sk] + ' (semanas ' + curtas.join(', ') + ')');
  });
  state.selectedSector = sel;
  state.baseMonday = addDias(velho, 28);
  if (window.afdRealizado) window.afdRealizado.aplicaTodos();
  state.selectedWeek = 0;
  state.notice = 'Novo ciclo: ' + cicloTxt(state.baseMonday) + '. O ciclo anterior ficou guardado em Gerar → Ciclo de 4 semanas.';
  render();
  toast(
    avisos.length
      ? 'Ciclo avançado, mas faltam colaboradoras sem domingo na semana vizinha em: ' + avisos.join('; ') + '. Confira os domingos.'
      : 'Novo ciclo ' + cicloTxt(state.baseMonday) + ' criado. O anterior ficou guardado.',
    !avisos.length,
  );
}
function voltaCiclo(ini) {
  if (window.afdRealizado) window.afdRealizado.restauraTodos();
  const atual = state.baseMonday;
  Object.keys(state.sectors).forEach((sk) => {
    const sec = state.sectors[sk],
      lista = (sec && sec.ciclos) || [],
      i = lista.findIndex((c) => c.inicio === ini);
    if (i < 0) return;
    const alvo = lista[i];
    lista.splice(i, 1);
    lista.unshift({ inicio: atual, guardado: new Date().toISOString(), semanas: JSON.parse(JSON.stringify(sec.weeks)) });
    sec.weeks = alvo.semanas;
    sec.ciclos = lista.slice(0, 6);
  });
  state.baseMonday = ini;
  if (window.afdRealizado) window.afdRealizado.aplicaTodos();
  state.selectedWeek = 0;
  state.notice = 'Ciclo ' + cicloTxt(ini) + ' aberto. O ciclo que estava na tela ficou guardado.';
  render();
  toast('Ciclo ' + cicloTxt(ini) + ' aberto.', true);
}
document.addEventListener('click', async (e) => {
  const av = e.target.closest && e.target.closest('#cicloAvancar'),
    vo = e.target.closest && e.target.closest('[data-ciclo]');
  if (av) await pedeAvancarCiclo();
  else if (e.target.closest && e.target.closest('#cicloPrev')) await cicloVai(-1);
  else if (e.target.closest && e.target.closest('#cicloNext')) await cicloVai(1);
  else if (vo) {
    if (await askConfirm('Voltar ao ciclo ' + cicloTxt(vo.dataset.ciclo) + '? O ciclo que está na tela fica guardado.')) voltaCiclo(vo.dataset.ciclo);
  }
});
/* backup em arquivo */
function exportBackup() {
  state.lastBackup = new Date().toISOString();
  save();
  const data = {
      app: 'bom-dia-escalas',
      version: 9,
      exportedAt: state.lastBackup,
      state: (({ undo, ...r }) => r)(state),
    },
    blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bom-dia-escalas-backup-' + iso(new Date()) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  render();
  toast('Backup exportado. Guarde o arquivo em local seguro (nuvem ou pen drive).', true);
}
function importBackup(file) {
  const rd = new FileReader();
  rd.onload = async () => {
    const old = state;
    try {
      const data = JSON.parse(rd.result),
        st = data && data.state ? data.state : data;
      if (!st || typeof st !== 'object' || !st.sectors || typeof st.sectors !== 'object') throw new Error('estrutura');
      if (!(await askConfirm('Importar este backup vai SUBSTITUIR todos os dados atuais deste navegador. Continuar?')))
        return;
      const base = newState();
      state = { ...base, ...st, sectors: { ...base.sectors, ...st.sectors } };
      state.settings = { ...DEFAULTS, ...state.settings };
      if (!SECTORS[state.selectedSector]) state.selectedSector = 'frente-caixa';
      state.selectedWeek = Math.min(3, Math.max(0, +state.selectedWeek || 0));
      state.baseMonday = monday(state.baseMonday || new Date());
      state.notice = '';
      state.roster = state.roster || {};
      const migrou = migraSemanaDomingo();
      render();
      toast(migrou ? 'Backup antigo importado: a semana agora vai de domingo a sábado, então os domingos e folgas foram limpos.' : 'Backup importado com sucesso.', true);
    } catch (err) {
      state = old;
      try {
        render();
      } catch (_) {}
      toast('Arquivo inválido: não é um backup do Bom Dia.');
    }
  };
  rd.readAsText(file);
}
function renderBackupStatus() {
  const el = document.getElementById('statusText'),
    box = el.parentElement,
    t = state.lastBackup ? new Date(state.lastBackup) : null,
    days = t ? Math.floor((Date.now() - t) / 864e5) : null;
  el.textContent = t
    ? 'Dados salvos neste dispositivo · último backup em ' +
      short(t) +
      ' ' +
      pad(t.getHours()) +
      ':' +
      pad(t.getMinutes())
    : 'Dados salvos só neste dispositivo · faça um backup';
  box.classList.toggle('warn', days === null || days >= 7);
}
function save() {} /* sem gravação no aparelho: sync.js envia para a nuvem */
function activateTab(name) {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach((x) => x.classList.toggle('active', x.dataset.panel === name));
}
const effOff = (e) => (e.sundayWork ? e.offDays : [...e.offDays, 'domingo']),
  offLimit = (e, model = week().model) => (model === '6x1' ? (e.sundayWork ? 1 : 0) : Math.max(0, 2 - (e.sundayWork ? 0 : 1))),
  sc = () => sundayPlan(week()).en;
/* dia de folga travado pela caixinha "Folga fixa" (vale para os primeiros dias marcados, até o limite da semana) */
function travada(e, dia, model = week().model) {
  return !!(e.folgaFixa && e.folgaFixa.filter((d) => !closedDay(d, state.selectedWeek)).slice(0, offLimit(e, model)).includes(dia));
}
function offText(e) {
  const t = offTextBase(e);
  return e.folgaFixa && e.folgaFixa.length && !/^(Férias|Atestado|Afastamento|Definir)/i.test(t) ? t + ' 🔒' : t;
}
const cadTurno = (e) => (e.fixo !== undefined ? '<span class="cad" title="Turno fixo: não trocar">🔒</span>' : '');
function offTextBase(e) {
  /* férias/atestado na semana: aparece na impressão e no WhatsApp no lugar das folgas desses dias */
  const aus = DAYS.map((d) => ausente(e, d[0])).filter(Boolean);
  if (aus.length === 7) return AUS_TIPOS[aus[0].tipo] + ' (' + brData(aus[0].de) + ' a ' + brData(aus[0].ate) + ')';
  const nota = aus.length ? ' · ' + AUS_TIPOS[aus[0].tipo] + ': ' + DAYS.filter((d) => ausente(e, d[0])).map((d) => d[1] + ' ' + short(date(d[0])).slice(0, 5)).join(', ') : '';
  const picked = DAYS.filter((d) => !ausente(e, d[0]) && (effOff(e).includes(d[0]) || closedDay(d[0])));
  if (nota)
    return (
      (picked.length ? picked.map((d) => d[1] + ' ' + short(date(d[0]))).join(' e ') : 'sem folga nos dias de trabalho') + nota
    );
  return picked.length
    ? picked
        .map((d) => d[1] + ' ' + short(date(d[0])) + (closedDay(d[0]) && !effOff(e).includes(d[0]) ? ' (feriado)' : ''))
        .join(' e ')
    : 'Definir';
}
/* dias da semana para a impressão: folga em vermelho, domingo de folga em vermelho, domingo trabalhado em amarelo */
function chipsPrint(e, compacto) {
  return (
    '<div class="pcs">' +
    DAYS.map((d) => {
      const dd = short(date(d[0])).slice(0, 5);
      let cls = '';
      if (ausente(e, d[0])) cls = 'aus';
      else if (closedDay(d[0])) cls = 'fer';
      else if (d[0] === 'domingo') cls = e.sundayWork ? 'dom-work' : 'dom-off';
      else if (e.offDays.includes(d[0])) cls = 'off';
      return '<span class="pc ' + cls + '">' + d[1].replace('.', '') + ' ' + (compacto ? dd.slice(0, 2) : dd) + '</span>';
    }).join('') +
    '</div>'
  );
}
function stationText(e) {
  return e.station === 'caixa' ? 'Operadora Caixa · PDV ' + e.pdv : POST_NAMES[e.station] || 'PDV ' + e.pdv;
}
function sundayWorkers() {
  return week().employees.filter((e) => !closedDay('domingo') && e.sundayWork && !ausente(e, 'domingo'));
}
function issues() {
  const fixes = [];
  const list = issues0(fixes);
  list.fix = fixes;
  return list;
}
function issues0(fixes) {
  const bad = week().employees.filter((e) => !ausSemana(e) && (week().model === '6x1' ? effOff(e).length < 1 : effOff(e).length !== 2)),
    list = [];
  if (bad.length)
    list.push(
      bad.length +
        ' colaboradora' +
        (bad.length === 1 ? ' está' : 's estão') +
        ' sem ' +
        neededOff() +
        ' folga' +
        (neededOff() === 1 ? '' : 's') +
        ' obrigatória' +
        (neededOff() === 1 ? '' : 's') +
        ': ' +
        bad.map((e) => e.name).join(', ') +
        '.',
    ),
      fixes[list.length - 1] = { k: 'folgas', wi: state.selectedWeek };
  const minimum = sundayMin(),
    count = sundayWorkers().length;
  if (!closedDay('domingo') && count < minimum)
    list.push('Domingo: mínimo de ' + minimum + ' colaboradoras; há ' + count + '.');
  compliance()
    .filter((x) => x.level === 'erro' && x.weeks.includes(state.selectedWeek))
    .forEach((x) => {
      list.push(x.text);
      if (x.fix) fixes[list.length - 1] = { k: x.fix, wi: state.selectedWeek };
    });
  return list;
}
function sortValue(e) {
  const s = week().shifts[e.shift],
    f = week().sortField;
  if (f === 'name') return e.name.toLocaleLowerCase('pt-BR');
  if (f === 'off') return e.offDays.map((k) => DAYS.find((d) => d[0] === k)[2]).join(',');
  if (f === 'hours') return mins(s.end);
  return f === 'lunch' ? mins(s.lunchStart) : f === 'end' ? mins(s.end) : mins(s.start);
}
/* Ao trocar turno/posto direto na tabela, as linhas ficam onde estão (ordemFixa) até o gestor pedir para reordenar. */
let ordemFixa = null;
const chaveOrdem = () => state.selectedSector + '/' + state.selectedWeek;
function congelaOrdem() {
  ordemFixa = { chave: chaveOrdem(), ids: staff().map((e) => e.id) };
}
function soltaOrdem() {
  ordemFixa = null;
}
function staff() {
  const emps = week().employees;
  if (ordemFixa && ordemFixa.chave === chaveOrdem() && ordemFixa.ids.length === emps.length) {
    const pos = new Map(ordemFixa.ids.map((id, i) => [id, i]));
    if (emps.every((e) => pos.has(e.id))) return [...emps].sort((x, y) => pos.get(x.id) - pos.get(y.id));
  }
  ordemFixa = null;
  const dir = week().sortDirection === 'asc' ? 1 : -1;
  return [...emps].sort((a, b) =>
    typeof sortValue(a) === 'number'
      ? dir * (sortValue(a) - sortValue(b))
      : dir * String(sortValue(a)).localeCompare(String(sortValue(b)), 'pt-BR'),
  );
}
const mark = (f) => (week().sortField === f ? (week().sortDirection === 'asc' ? '↑' : '↓') : '↕');
/* usuário com setor definido: o seletor de setor some e o app fica nesse setor */
window.travaSetor = (k) => {
  const p = document.querySelector('.sector-picker');
  if (p) p.hidden = !!k;
  if (k && SECTORS[k]) {
    state.selectedSector = k;
    render();
  }
};
/* semana "realizada" = existe ponto (AFD) guardado para essa data. O que é copiado de outra semana (Copiar, Gerar) não herda a marca. */
function semanaReal(wi = state.selectedWeek) {
  const sec = sector(),
    r = sec.realizado && sec.realizado[iso(date('domingo', wi))];
  return !!(r && r.cobertos && r.cobertos.length);
}
function render() {
  normalize();
  {
    const sec = sector();
    if (sec.weeks) sec.weeks.forEach((x, k) => x.realizada && !semanaReal(k) && window.afdRealizado && window.afdRealizado.restauraPlano(x));
  }
  const w = week(),
    name = SECTORS[state.selectedSector];
  document.getElementById('sectorSelect').value = state.selectedSector;
  atualizaDesfazer();
  document.getElementById('weekStart').value = monday(state.baseMonday);
  {
    const nt = document.getElementById('cicloNavTxt');
    if (nt) nt.innerHTML = '<b>Ciclo ' + cicloTxt(state.baseMonday) + '</b><small>4 semanas · domingo a sábado</small>';
  }
  document.getElementById('sectorLabel').textContent = 'PAINEL GERENCIAL · ' + name.toUpperCase();
  document.getElementById('mainTitle').textContent = 'Escala semanal · ' + name;
  document.getElementById('settingsTitle').textContent = 'Semana ' + (state.selectedWeek + 1);
  document.getElementById('weekTitle').textContent = range() + ' · Semana ' + (state.selectedWeek + 1) + (semanaReal() ? ' · 🔒 realizada (conforme o ponto)' : '');
  document.getElementById('activeEmployees').value = w.activeCount;
  document.getElementById('pdvCount').value = w.pdvCount;
  document.getElementById('shiftCount').value = w.shifts.length;
  document.getElementById('weekClose').value = state.settings.weekClose;
  document.getElementById('sundayClose').value = state.settings.sundayClose;
  document.getElementById('extraHolidays').value = state.settings.extraText || '';
  document.getElementById('activeMetric').textContent = w.activeCount;
  {
    const card = document.getElementById('activeMetric').closest('.metric'),
      ks = hasPosts() ? postKeys() : [];
    let bd = document.getElementById('postBreakdown');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'postBreakdown';
      bd.className = 'post-breakdown';
      card.appendChild(bd);
    }
    card.classList.toggle('com-postos', ks.length > 0);
    bd.hidden = !ks.length;
    bd.innerHTML = ks.map((k) => '<span><b>' + w.employees.filter((e) => e.station === k).length + '</b> ' + POST_NAMES[k] + '</span>').join('');
  }
  document.getElementById('shiftMetric').textContent = w.shifts.length;
  document.getElementById('modelMetric').textContent = w.model;
  document.getElementById('pdvMetric').textContent = w.pdvCount;
  document.getElementById('pdvMetricCard').hidden = !hasPdv();
  document.getElementById('pdvGroup').hidden = !hasPdv();
  const cb = document.querySelector('[data-complete]');
  if (cb) {
    const l = rotuloCompletar(state.selectedWeek);
    cb.innerHTML = escape(l[0]) + ' <small>' + escape(l[1]) + '</small>';
    cb.disabled = state.selectedWeek >= 3;
    const hp = document.getElementById('compHelp');
    if (hp) hp.textContent = l[2];
  }
  document.querySelectorAll('.model-button').forEach((x) => {
    x.classList.toggle('active', x.dataset.model === w.model);
    const sm = x.querySelector('small');
    if (sm) sm.textContent = hm(workDuration(x.dataset.model)) + ' trabalhadas · ' + hm(workDuration(x.dataset.model) * (x.dataset.model === '6x1' ? 6 : 5)) + '/sem';
  });
  document.getElementById('operatorsTag').textContent = w.activeCount + ' ativas';
  renderWeekTabs();
  renderShifts();
  renderRotation();
  renderCoverage();
  renderSchedule();
  renderSunday();
  renderOperators();
  renderBoard();
  renderAlerts();
  renderWarning();
  renderCompliance();
  renderOffAnalysis();
  renderResumo();
  renderGen();
  renderBackupStatus();
  save();
}
/* etiqueta de cada semana: realizada (tem ponto), passada sem ponto, em andamento ou planejada */
function estadoSemana(i) {
  const hoje = iso(new Date()),
    ini = iso(date('domingo', i)),
    fim = iso(date('sábado', i));
  if (semanaReal(i)) return '<em class="st st-real">Realizada</em>';
  if (fim < hoje) return '<em class="st st-sem">Passada · sem ponto</em>';
  if (ini <= hoje) return '<em class="st st-and">Em andamento</em>';
  return '<em class="st st-plan">Planejada</em>';
}
function renderWeekTabs() {
  document.getElementById('periodTabs').innerHTML = [0, 1, 2, 3]
    .map(
      (i) =>
        `<button class="period-tab ${i === state.selectedWeek ? 'active' : ''}" data-week="${i}" type="button">Semana ${i + 1}${semanaReal(i) ? ' 🔒' : ''}<small>${range(i)}</small>${estadoSemana(i)}</button>`,
    )
    .join('');
}
function renderShifts() {
  document.getElementById('shiftsEditor').innerHTML =
    loadInfo() +
    `<div class="auto-flags"><label class="check-row"><input type="checkbox" data-autoflag="autoAlmoco" ${autoAlmoco(week()) ? 'checked' : ''} /> Calcular horário de almoço automático <small>(os almoços dos turnos se encaixam em cascata, sempre com alguém na loja; tolerância de 5 min)</small></label><label class="check-row"><input type="checkbox" data-autoflag="autoSaida" ${autoSaida(week()) ? 'checked' : ''} /> Calcular saída automática <small>(entrada + jornada + 2h de almoço)</small></label></div>` +
    week()
      .shifts.map(
        (s, i) =>
          `<div class="shift-card"><h3>${escape(s.name)}</h3><div class="time-grid"><label>Entrada<input data-shift="${i}" data-field="start" type="time" value="${s.start}" max="${time(maxStartTol(week().model, state.selectedWeek))}" /></label><label>${autoSaida(week()) ? 'Saída calculada' : 'Saída'}<input type="time" value="${s.end}" ${autoSaida(week()) ? 'disabled' : `data-shift="${i}" data-field="end" max="${plus(state.settings.weekClose, TOL_FECH)}"`} /></label><label>Saída para almoço<input data-shift="${i}" data-field="lunchStart" type="time" value="${s.lunchStart}" /></label>${autoAlmoco(week()) ? `<label>Retorno automático (+2h)<input type="time" value="${s.lunchEnd}" disabled /></label>` : ''}</div><p class="helper">Limite com hora extra (máx. 1h30): até ${plus(s.end, EXTRA_MAX)}.</p></div>`,
      )
      .join('') +
    sundayCard();
}
function renderRotation() {
  document.getElementById('rotationPanel').innerHTML = periodoPanel() + postsPanel();
  const ap = document.getElementById('pdvActivePanel');
  if (ap) ap.innerHTML = pdvActivePanel();
  const pp = document.getElementById('pdvPlanPanel');
  if (pp) pp.innerHTML = pdvPlanPanel();
  const sp = document.getElementById('pdvSundayPanel');
  if (sp) sp.innerHTML = pdvSundayPanel();
  const mp = document.getElementById('sundayMinPanel');
  if (mp) mp.innerHTML = sundayMinPanel();
}
function renderCoverage() {
  document.getElementById('coverageCards').innerHTML = week()
    .shifts.map((s, i) => {
      const n = week().employees.filter((e) => e.shift === i).length;
      return `<div class="coverage-card"><strong><i class="shift-pill" style="background:${s.color}"></i>${escape(s.name)}</strong><span>${s.start}–${s.end} · ${n} colaboradora${n === 1 ? '' : 's'}</span></div>`;
    })
    .join('');
}
function heading() {
  const fields = [
    ['name', 'Colaboradora'],
    ['shift', 'Turno'],
    ...(hasPosts() ? [['station', 'Posto']] : []),
    ['start', 'Entrada'],
    ['lunch', 'Almoço'],
    ['end', 'Saída'],
    ['off', 'Folgas com data'],
    ['hours', 'Limite c/ extras (máx. 1h30)'],
  ];
  return `<thead><tr>${fields.map(([f, n]) => (f === 'station' ? `<th>${n}</th>` : `<th><button class="sort-button" data-sort="${f}" type="button">${n} <span>${mark(f)}</span></button></th>`)).join('')}</tr></thead>`;
}
function row(e) {
  const w = week(),
    s = w.shifts[e.shift],
    i = w.employees.indexOf(e),
    ae = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const shiftSel = `<select class="tbl-sel" data-employee="${i}" data-field="shift" ${e.fixo !== undefined ? 'disabled title="Turno fixo: desmarque \'Turno fixo\' na ficha para trocar"' : ''} aria-label="Turno de ${ae(e.name)}">${w.shifts.map((sh, k) => `<option value="${k}" ${k === e.shift ? 'selected' : ''}>${escape(sh.name)} · ${sh.start}</option>`).join('')}</select><label class="fixa-tbl" title="Mantém a colaboradora neste turno em todas as semanas e no gerador"><input type="checkbox" data-employee="${i}" data-field="fixo" ${e.fixo !== undefined ? 'checked' : ''} /> Turno fixo</label>`;
  const stSel = hasPosts()
    ? `<select class="tbl-sel" data-employee="${i}" data-field="station" aria-label="Posto de ${ae(e.name)}">${postKeys()
        .map((k) => `<option value="${k}" ${k === e.station ? 'selected' : ''}>${POST_NAMES[k]}</option>`)
        .join('')}</select>`
    : '';
  const pdvSel =
    hasPdv() && e.station === 'caixa'
      ? `<select class="tbl-sel tbl-pdv" data-employee="${i}" data-field="pdv" aria-label="PDV de ${ae(e.name)}">${Array.from({ length: w.pdvCount }, (_, k) => `<option value="${k + 1}" ${k + 1 === e.pdv ? 'selected' : ''}>PDV ${k + 1}</option>`).join('')}</select>`
      : '';
  const dd = (k) => short(date(k)).slice(0, 5),
    ausChip = (k, rot, cls) => {
      const a = ausente(e, k);
      return a
        ? `<label class="off-chip aus ${cls}" title="${AUS_TIPOS[a.tipo]}: ${brData(a.de)} a ${brData(a.ate)}"><input type="checkbox" disabled /><span>${rot} <i>${dd(k)}</i>${cls ? `<b>${AUS_TIPOS[a.tipo].toLowerCase()}</b>` : ''}</span></label>`
        : '';
    },
    domChip = ausChip('domingo', 'Dom', 'dom')
      ? ausChip('domingo', 'Dom', 'dom')
      : e.sundayWork
      ? `<label class="off-chip dom works" title="Trabalha no domingo: desmarque a caixa para ele virar folga"><input type="checkbox" data-sun-toggle="${i}" /><span>Dom <i>${dd('domingo')}</i><b>trabalha</b></span></label>`
      : `<label class="off-chip dom${e.folgaFixa ? ' travada' : ''}" title="${e.folgaFixa ? 'Domingo é folga (fixa)' : 'Domingo é folga: desmarque a caixa para ele trabalhar'}"><input type="checkbox" checked ${e.folgaFixa ? 'disabled' : `data-sun-toggle="${i}"`} /><span>Dom <i>${dd('domingo')}</i><b>folga</b></span></label>`,
    chips =
      domChip +
      DAYS.filter((d) => d[0] !== 'domingo')
        .map(
          (d) =>
            ausChip(d[0], d[1].replace('.', ''), '') ||
            `<label class="off-chip${travada(e, d[0]) ? ' travada' : ''}" title="${travada(e, d[0]) ? 'Folga fixa' : 'Folga'} na ${d[0]} (${dd(d[0])})"><input type="checkbox" data-employee="${i}" data-off="${d[0]}" ${e.offDays.includes(d[0]) ? 'checked' : ''} ${travada(e, d[0]) ? 'disabled' : ''} /><span>${d[1].replace('.', '')} <i>${dd(d[0])}</i></span></label>`,
        )
        .join('');
  const fora = foraSemana(e),
    aus1 = fora || ausSemana(e),
    nomeBtn = `<button class="employee-link${aus1 ? ' aus-nome' : ''}" data-jump="${e.id}" type="button"${aus1 ? ' title="Em férias / atestado nesta semana"' : ''}>${escape(e.name)}</button>`;
  /* férias/atestado a semana inteira: sem turno, posto, PDV nem horários */
  if (fora)
    return `<tr class="aus-row fora"><td class="c-name">${nomeBtn}${cadTurno(e)}</td><td data-label="Turno">—</td>${hasPosts() ? '<td data-label="Posto" data-print="—">—</td>' : ''}<td data-label="Entrada">—</td><td data-label="Almoço">—</td><td data-label="Saída">—</td><td data-label="Folgas" class="c-off" data-ei="${i}" data-print="${ae(offText(e))}"><div class="off-chips">${chips}</div><small class="off-count">${ausNota(e).replace(/^ · /, '')}</small></td><td data-label="Limite c/ extras">—</td></tr>`;
  return `<tr${aus1 ? ' class="aus-row"' : ''}><td class="c-name">${nomeBtn}${cadTurno(e)}</td><td data-label="Turno"><i class="shift-pill" style="background:${s.color}"></i>${shiftSel}</td>${hasPosts() ? `<td data-label="Posto" data-print="${ae(stationText(e) + swapNote(e))}">${stSel}${pdvSel}${swapNote(e)}</td>` : ''}<td data-label="Entrada">${s.start}</td><td data-label="Almoço">${s.lunchStart}–${s.lunchEnd}</td><td data-label="Saída">${s.end}</td><td data-label="Folgas" class="c-off" data-ei="${i}" data-print="${ae(offText(e))}"><div class="off-chips">${chips}</div><small class="off-count">${e.offDays.length}/${offLimit(e)} folga${offLimit(e) === 1 ? '' : 's'}${ausNota(e)}</small><label class="fixa-tbl" title="Trava os dias de folga marcados em todas as semanas"><input type="checkbox" data-employee="${i}" data-field="folgaFixa" ${e.folgaFixa ? 'checked' : ''} /> Folga fixa</label></td><td data-label="Limite c/ extras">${plus(s.end, EXTRA_MAX)}</td></tr>`;
}
function renderSchedule() {
  /* quem está fora a semana inteira (férias/atestado) vai para o fim da tabela */
  const L = staff(),
    ordem = [...L.filter((e) => !foraSemana(e)), ...L.filter((e) => foraSemana(e))];
  document.getElementById('scheduleTable').innerHTML = `${heading()}<tbody>${ordem.map(row).join('')}</tbody>`;
}
function renderSunday() {
  const list = sundayWorkers(),
    minimum = sundayMin(),
    head = hasPosts() ? '<th>Posto</th>' : '',
    rows = list
      .map((e) => {
        const pl = sundayPlan(week()),
          end = time(pl.en),
          lunch = pl.brk ? time(pl.brk[0]) + '–' + time(pl.brk[1]) + ' (' + (pl.brk[1] - pl.brk[0]) + ' min)' : '—';
        return `<tr data-ei="${week().employees.indexOf(e)}"><td>${escape(e.name)}</td><td>Domingo</td>${hasPosts() ? `<td>${sundayStationText(e)}</td>` : ''}<td>${time(pl.st)}</td><td>${lunch}</td><td>${end}</td><td class="sun-rem"><button type="button" class="remove-btn" data-sun-rem="${week().employees.indexOf(e)}" title="Tirar ${escape(e.name)} deste domingo">Remover</button></td></tr>`;
      })
      .join('');
  const columns = (hasPdv() ? 6 : 5) + 1;
  document.getElementById('sundaySchedule').innerHTML =
    `<div class="print-brand"><img src="logo.png" alt="" /><b>${escape(SECTORS[state.selectedSector])}</b><span>Escala de domingo · ${short(date('domingo'))}</span></div><div class="section-heading"><div><p class="eyebrow">ESCALA DE DOMINGO</p><h2>Domingo · ${short(date('domingo'))}</h2><p>${SECTORS[state.selectedSector]} · mínimo de ${minimum} colaboradora${minimum === 1 ? '' : 's'}.</p></div><span class="tag">${list.length} programada${list.length === 1 ? '' : 's'}</span></div><div class="table-wrap"><table><thead><tr><th>Colaboradora</th><th>Turno</th>${head}<th>Entrada</th><th>Intervalo</th><th>Saída</th><th class="sun-rem"></th></tr></thead><tbody>${rows || `<tr><td colspan="${columns}">Nenhuma colaboradora programada para este domingo.</td></tr>`}</tbody></table></div><p class="table-note">${week().sunday.mode === 'dia' ? 'Domingo dia todo, com almoço de 2h' : 'Domingo até ' + week().sunday.end + ', direto e sem intervalo'}. CCT de mercados: abono de R$ 94,00 por domingo trabalhado, além da folga semanal (confirme o valor vigente).</p>`;
}
function ausNota(e) {
  const vistos = [];
  DAYS.forEach((d) => {
    const a = ausente(e, d[0]);
    if (a && !vistos.includes(a)) vistos.push(a);
  });
  return vistos.map((a) => ` · <b class="aus-nota">${AUS_TIPOS[a.tipo]} ${brData(a.de).slice(0, 5)} a ${brData(a.ate).slice(0, 5)}</b>`).join('');
}
const ausAbertos = new Set();
function ausBox(i) {
  const r = roster()[i] || {},
    l = r.aus || [],
    chave = state.selectedSector + ':' + i;
  return `<details class="aus-box" data-aus-i="${i}" ${ausAbertos.has(chave) ? 'open' : ''}><summary><span>Férias / atestado</span>${l.length ? `<b class="aus-qtd">${l.length} registrada${l.length === 1 ? '' : 's'}</b>` : '<small>nenhuma</small>'}</summary>${
    l.length
      ? '<ul class="aus-list">' +
        l
          .map(
            (x, k) =>
              `<li><b>${AUS_TIPOS[x.tipo] || 'Afastamento'}</b> ${brData(x.de)} a ${brData(x.ate)} <button type="button" class="remove-btn" data-aus-del="${i}" data-k="${k}">Remover</button></li>`,
          )
          .join('') +
        '</ul>'
      : ''
  }<div class="aus-form"><select data-aus-tipo aria-label="Tipo de ausência"><option value="ferias">Férias</option><option value="atestado">Atestado</option><option value="outro">Afastamento</option></select><label>De <input type="date" data-aus-de /></label><label>Até <input type="date" data-aus-ate /></label><button type="button" class="button outline" data-aus-add="${i}">Adicionar</button></div><p class="helper">Vale pelas datas, em qualquer semana. Nesses dias a pessoa sai da escala, da cobertura e do domingo, e as folgas da semana são recalculadas.</p></details>`;
}
/* lembra quais blocos estão abertos, para não fecharem quando a tela é redesenhada */
document.addEventListener(
  'toggle',
  (ev) => {
    const d = ev.target;
    if (!d.classList || !d.classList.contains('aus-box')) return;
    const chave = state.selectedSector + ':' + d.dataset.ausI;
    d.open ? ausAbertos.add(chave) : ausAbertos.delete(chave);
  },
  true,
);
function renderOperators() {
  const w = week(),
    options = w.shifts.map((s, i) => `<option value="${i}">${escape(s.name)} · ${s.start}–${s.end}</option>`).join(''),
    pdv = Array.from({ length: w.pdvCount }, (_, i) => `<option value="${i + 1}">PDV ${i + 1}</option>`).join(''),
    stations = postKeys()
      .map((k) => `<option value="${k}">${POST_NAMES[k]}</option>`)
      .join(''),
    label = neededOff() === 1 ? 'obrigatório marcar 1' : 'obrigatório marcar 2';
  document.getElementById('operatorsList').innerHTML = w.employees
    .map(
      (e, i) =>
        `<article class="operator-card" id="operator-${e.id}"><h3>Colaboradora ${e.id} <button type="button" class="remove-btn" data-remove="${i}">Excluir</button></h3><div class="operator-fields"><label>Nome<input data-employee="${i}" data-field="name" value="${escape(e.name)}" /></label><label>Turno<select data-employee="${i}" data-field="shift" ${e.fixo !== undefined ? 'disabled' : ''}>${options}</select></label><label class="check-row fixo-row"><input type="checkbox" data-employee="${i}" data-field="fixo" ${e.fixo !== undefined ? 'checked' : ''} /> Turno fixo <small>${e.fixo !== undefined ? '(travado nas 4 semanas)' : '(sempre neste turno)'}</small></label>${hasPosts() ? `<label>Posto<select data-employee="${i}" data-field="station">${stations}</select></label>` : ''}${hasPdv() && e.station === 'caixa' ? `<label class="pdv-pick">PDV da semana<select data-employee="${i}" data-field="pdv">${pdv}</select></label>` : ''}<fieldset class="off-days"><legend>Dias de folga <small>(${week().model === '6x1' ? 'até ' : 'marcar '}${offLimit(e)}${e.sundayWork ? '' : ' + domingo'})</small></legend><div class="days-list">${e.sundayWork ? '' : `<label><input type="checkbox" checked disabled />domingo <small>${short(date('domingo')).slice(0, 5)}</small> (folga)</label>`}${DAYS.filter(
          (d) => d[0] !== 'domingo',
        )
          .map(
            (d) =>
              `<label><input type="checkbox" data-employee="${i}" data-off="${d[0]}" ${e.offDays.includes(d[0]) ? 'checked' : ''} ${travada(e, d[0]) ? 'disabled' : ''} />${d[0]} <small>${short(date(d[0])).slice(0, 5)}</small></label>`,
          )
          .join('')}</div><label class="check-row fixo-folga"><input type="checkbox" data-employee="${i}" data-field="folgaFixa" ${e.folgaFixa ? 'checked' : ''} /> Folga fixa <small>${e.folgaFixa ? '(travada nas 4 semanas)' : '(sempre nestes dias)'}</small></label></fieldset><label>Trabalha no domingo <small>(${short(date('domingo'))})</small><select data-employee="${i}" data-field="sundayWork"><option value="false">Não</option><option value="true">Sim</option></select></label><label class="check-row restricted"><input type="checkbox" data-employee="${i}" data-field="restricted" ${e.restricted ? 'checked' : ''} /> Estudante/mãe: sem escala após 18h <small>(CCT)</small></label>${ausBox(i)}</div></article>`,
    )
    .join('');
  document.querySelectorAll('[data-employee]:not([data-off])').forEach((el) => {
    const e = w.employees[+el.dataset.employee],
      f = el.dataset.field;
    el.value = String(e[f]);
  });
}
function active(e, d, at) {
  const s = week().shifts[e.shift],
    point = mins(at),
    end = d[0] === 'domingo' ? Math.min(mins(s.end), sc()) : Math.min(mins(s.end), mins(state.settings.weekClose));
  if (closedDay(d[0]) || ausente(e, d[0])) return false;
  if (d[0] === 'domingo') {
    if (!e.sundayWork) return false;
    const pl = sundayPlan(week());
    return point >= pl.st && point < pl.en && !(pl.brk && point >= pl.brk[0] && point < pl.brk[1]);
  } else if (e.offDays.includes(d[0])) return false;
  const brk = [mins(s.lunchStart), Math.min(mins(s.lunchEnd), end)];
  return point >= mins(s.start) && point < end && !(brk && point >= brk[0] && point < brk[1]);
}
function cover(d, start, end, emps) {
  const values = [],
    list = emps || week().employees;
  for (let n = mins(start); n < mins(end); n += 30) values.push(list.filter((e) => active(e, d, time(n))).length);
  return values.length ? Math.min(...values) : 0;
}
let modoAjuste = false,
  boardPosto = '';
/* a colaboradora cobre a faixa se o turno dela cobre todos os horários dela (fora do almoço), independente de folga */
function cobreFaixa(e, start, end) {
  const s = week().shifts[e.shift],
    fim = Math.min(mins(s.end), mins(state.settings.weekClose));
  for (let n = mins(start); n < mins(end); n += 30) {
    if (n < mins(s.start) || n >= fim || (n >= mins(s.lunchStart) && n < Math.min(mins(s.lunchEnd), fim))) return false;
  }
  return true;
}
const ctlBtns = (attrs, folga) =>
  `<span class="oa-ctl"><button type="button" class="oa-b" ${attrs} data-dl="-1" aria-label="menos 1" title="${folga ? 'Tirar 1 folga deste dia' : 'Tirar 1 pessoa deste dia'}">−</button><button type="button" class="oa-b" ${attrs} data-dl="1" aria-label="mais 1" title="${folga ? 'Colocar mais 1 folga neste dia' : 'Colocar mais 1 pessoa neste dia'}">+</button></span>`;
function renderBoard() {
  const bands = [],
    close = mins(state.settings.weekClose);
  for (let start = 420; start < close; start += 60) {
    const stop = Math.min(start + 60, close);
    bands.push([time(start) + '–' + time(stop), time(start), time(stop)]);
  }
  const keys = hasPosts() ? postKeys().filter((k) => week().employees.some((e) => e.station === k)) : [];
  if (boardPosto && !keys.includes(boardPosto)) boardPosto = '';
  const emps = week().employees.filter((e) => !boardPosto || e.station === boardPosto);
  document.getElementById('boardNote').textContent =
    'Segunda a sábado até ' +
    state.settings.weekClose +
    '; domingo até ' +
    state.settings.sundayClose +
    '. Verde indica maior cobertura e vermelho a menor.' +
    (boardPosto ? ' Mostrando só: ' + POST_NAMES[boardPosto] + '.' : '');
  const table = document.getElementById('coverageBoard'),
    wrap = table.closest('.table-wrap');
  let bar = document.getElementById('boardBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'boardBar';
    bar.className = 'board-bar';
    wrap.parentNode.insertBefore(bar, wrap);
  }
  bar.innerHTML =
    (keys.length
      ? `<div class="board-chips" role="group" aria-label="Posto"><button type="button" class="chip${boardPosto ? '' : ' on'}" data-bpost="">Todos</button>${keys.map((k) => `<button type="button" class="chip${boardPosto === k ? ' on' : ''}" data-bpost="${k}">${POST_NAMES[k]}</button>`).join('')}</div>`
      : '') +
    `<button type="button" class="button ${modoAjuste ? 'secondary' : 'outline'} adj-toggle" data-ajuste>${modoAjuste ? 'Ajuste ligado: use + e − nas células' : 'Ajustar escala por aqui'}</button>`;
  const rows = bands.map(([label, start, end]) => ({
      label,
      start,
      end,
      counts: DAYS.map((d) =>
        closedDay(d[0]) || (d[0] === 'domingo' && mins(start) >= sc())
          ? null
          : cover(d, start, d[0] === 'domingo' && mins(end) > sc() ? state.settings.sundayClose : end, emps),
      ),
    })),
    all = rows.flatMap((r) => r.counts.filter(Number.isFinite)),
    low = Math.min(...all),
    high = Math.max(...all),
    cls = (n) =>
      n === null
        ? 'coverage-none'
        : high === low
          ? 'coverage-mid'
          : n === high
            ? 'coverage-high'
            : n === low
              ? 'coverage-low'
              : 'coverage-mid';
  document.getElementById('coverageBoardHead').innerHTML =
    `<tr><th>Período</th>${DAYS.map((d) => `<th>${d[1]}<br>${short(date(d[0]))}${holidayTag(d[0])}</th>`).join('')}</tr>`;
  document.getElementById('coverageBoardBody').innerHTML = rows
    .map(
      (r) =>
        `<tr><td>${r.label}</td>${r.counts
          .map((n, i) => {
            const d = DAYS[i];
            return `<td class="${cls(n)}">${n === null ? '—' : n}${modoAjuste && n !== null && d[0] !== 'domingo' ? ctlBtns(`data-oa="faixa" data-day="${d[0]}" data-ini="${r.start}" data-fim="${r.end}" data-post="${boardPosto}"`) : ''}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');
}
function renderAlerts() {
  const box = document.getElementById('trafficAlerts');
  const panel = box.closest('.alerts-panel');
  if (panel) panel.hidden = !hasPdv();
  if (!hasPdv()) {
    box.innerHTML = '<p class="empty-alert">Alertas de fluxo são usados somente na Frente de Caixa.</p>';
    return;
  }
  box.innerHTML = TRAFFIC.map(([label, start, end, min]) => {
    const days = DAYS.filter((d) => d[0] !== 'domingo' && !closedDay(d[0]) && cover(d, start, end) < min);
    return `<article class="alert-card ${days.length ? 'critical' : 'ok'}"><strong>${label} · ${start}–${end}</strong><span>${days.length ? 'Atenção: ' + days.map((d) => d[1]).join(', ') + '.' : 'Cobertura atende o mínimo de ' + min + '.'}</span><small>Mínimo planejado: ${min} operadoras.</small></article>`;
  }).join('');
}
function renderWarning() {
  const list = issues(),
    el = document.getElementById('scheduleWarning');
  el.hidden = !list.length;
  el.innerHTML = list.map((t, i) => '<div class="warn-line">• ' + escape(t) + fixBtn(list.fix && list.fix[i], t) + '</div>').join('');
}
/* guarda o estado do setor antes de uma ação grande: o botão Desfazer (topo da página) volta a ele */
function snapDesfazer() {
  const sel = state.selectedSector;
  state.undo = { ...(state.undo || {}), [sel]: { at: new Date().toISOString(), weeks: clone(sector().weeks), roster: clone((state.roster && state.roster[sel]) || []) } };
}
function atualizaDesfazer() {
  const b = document.getElementById('undoTopBtn'),
    u = state.undo && state.undo[state.selectedSector];
  if (!b) return;
  b.disabled = !u;
  b.title = u ? 'Volta a última alteração grande deste setor (' + pad(new Date(u.at).getHours()) + ':' + pad(new Date(u.at).getMinutes()) + ')' : 'Nada para desfazer';
}
/* ===== botão "Corrigir": conserto automático dos erros que o app sabe resolver sozinho ===== */
const FIXES = {};
let fixSeq = 0;
function fixBtn(f, text) {
  if (!f) return '';
  const id = 'f' + ++fixSeq;
  FIXES[id] = { ...f, text };
  const dica = { restritas: 'Move quem tem restrição para o turno mais cedo', domingoHora: 'Ajusta o horário do domingo para o limite', folgas: 'Recalcula as folgas desta semana', almoco: 'Refaz os horários de almoço em cascata', fechamento: 'Antecipa a entrada para a jornada terminar no fechamento', domingo: 'Escala no domingo quem pode, até cada posto chegar ao mínimo' }[f.k] || '';
  return ` <button type="button" class="fix-btn" data-fix="${id}" title="${escape(dica)}">Corrigir</button>`;
}
function aplicaCorrecao(id) {
  const f = FIXES[id];
  if (!f) return;
  const sel = state.selectedSector,
    w = sector().weeks[f.wi];
  if (!w) return;
  state.undo = {
    ...(state.undo || {}),
    [sel]: { at: new Date().toISOString(), weeks: clone(sector().weeks), roster: clone((state.roster && state.roster[sel]) || []) },
  };
  normalizeWeek(w);
  if (f.k === 'folgas') balanceOffs(w, false);
  else if (f.k === 'almoco') autoLunch(w, f.wi, 0);
  else if (f.k === 'domingo') {
    /* escala no domingo quem pode (ninguém repete domingo) até cada posto chegar ao mínimo */
    const keep = state.selectedWeek;
    state.selectedWeek = f.wi;
    sundayPosts().forEach((p) => {
      let c = w.employees.filter((e) => e.station === p && e.sundayWork).length;
      const mn = sundayPostMin(p);
      w.employees.forEach((e, i) => {
        if (c < mn && e.station === p && !e.sundayWork && !sundayEligible(i)) {
          e.sundayWork = true;
          c++;
        }
      });
    });
    balanceOffs(w, true);
    state.selectedWeek = keep;
  }
  else if (f.k === 'restritas') {
    /* estudante/mãe com restrição vai para o turno mais cedo (a CCT protege contra escala após 18h) */
    w.employees.forEach((e) => {
      if (e.restricted && e.fixo === undefined && mins(w.shifts[e.shift].start) + workDuration(w.model, f.wi) + 120 > 1080) e.shift = 0;
    });
  } else if (f.k === 'domingoHora') {
    const pl = sundayPlan(w),
      fim = mins(state.settings.sundayClose);
    if (pl.len > 0 && pl.en > fim && (!pl.brk || pl.work <= 600)) w.sunday.end = time(fim);
    else w.sunday = normSunday(null, w.model, f.wi);
  } else if (f.k === 'fechamento') {
    fitShifts(w, f.wi);
    if (gapOf(w)) autoLunch(w, f.wi, 0);
  }
  render();
  const resta = compliance().some((x) => x.text === f.text) || issues().includes(f.text);
  if (resta)
    toast('Não consegui corrigir esse sozinho: ' + f.text + ' Ajuste à mão (ou use Desfazer para voltar).');
  else toast('Corrigido (Semana ' + (f.wi + 1) + '). Se não gostou, use Desfazer.', true);
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-fix]');
  if (b) aplicaCorrecao(b.dataset.fix);
});
function setActive(n) {
  week().activeCount = Math.min(50, Math.max(1, +n || 1));
  render();
}
function setPdv(n) {
  week().pdvCount = Math.min(30, Math.max(1, +n || 1));
  render();
}
function setModel(m) {
  snapDesfazer();
  const w = week(),
    wi = state.selectedWeek,
    antes = w.model,
    durAntes = workDuration(antes, wi),
    /* turnos que terminam justo no fechamento continuam terminando nele no outro modelo (a entrada sobe ou desce) */
    ancorado = w.shifts.map((s) => Math.abs(mins(s.start) + durAntes + 120 - closeMin()) <= 1);
  w.model = m;
  w.employees.forEach((e) => (e.offDays = e.offDays.slice(0, offLimit(e))));
  const mudou = [];
  if (antes !== m)
    w.shifts.forEach((s, k) => {
      if (!ancorado[k]) return;
      const novo = closeMin() - (workDuration(m, wi) + 120),
        d = novo - mins(s.start);
      if (d) {
        s.start = time(novo);
        s.lunchStart = plus(s.lunchStart, d);
        mudou.push(s.name);
      }
    });
  w.shifts.forEach((s) => sync(s, m, wi, w));
  /* o que ainda passar do fechamento é antecipado (continua editável) */
  fitShifts(w, wi).forEach((nm) => !mudou.includes(nm) && mudou.push(nm));
  sortShifts(w);
  autoLunch(w, wi, 0);
  render();
  if (antes !== m && mudou.length)
    toast(
      'Entrada ajustada em ' + mudou.join(', ') + ' para a jornada do ' + m + ' (' + hm(workDuration(m, wi)) + ' + 2h de almoço) terminar no fechamento, ' + state.settings.weekClose + '. Você pode alterar.',
      true,
    );
}
function setShiftCount(n) {
  snapDesfazer();
  const w = week(),
    count = +n,
    items = w.shifts.slice(0, count);
  const antes = items.length;
  while (items.length < count) items.push(shift(items.length, w.model));
  /* turnos novos: entradas espalhadas entre o último turno e a entrada mais tarde permitida (não empilhadas) */
  if (count > antes && antes > 0) {
    const ult = mins(items[antes - 1].start),
      mx = Math.max(ult, maxStart(w.model, state.selectedWeek)),
      m = count - antes;
    for (let k = 1; k <= m; k++) {
      const st = Math.round((ult + ((mx - ult) * k) / m) / 5) * 5,
        it = items[antes - 1 + k];
      it.start = time(Math.min(mx, st));
      it.lunchStart = plus(items[antes - 2 + k].lunchStart, 60);
    }
  }
  /* entradas iguais (jornada longa e pouca folga até o fechamento): espalha todas entre a 1ª e a mais tarde permitida */
  if (count > antes && new Set(items.map((x) => x.start)).size < items.length) {
    const p0 = mins(items[0].start),
      mx = Math.max(p0, maxStart(w.model, state.selectedWeek));
    items.forEach((it, k) => {
      if (k > 0) it.start = time(Math.min(mx, Math.round((p0 + ((mx - p0) * k) / (count - 1)) / 5) * 5));
    });
    items.forEach((it, k) => k > 0 && (it.lunchStart = plus(items[k - 1].lunchStart, 60)));
  }
  w.shifts = items;
  w.rotation.counts = distribute(w.activeCount, count);
  /* almoços em cascata: com 2 turnos o 2º almoça quando o 1º volta; com 3 ou mais, 1h de diferença */
  fitShifts(w, state.selectedWeek);
  sortShifts(w);
  autoLunch(w, state.selectedWeek, 0);
  render();
}
function setSort(f) {
  soltaOrdem();
  if (week().sortField === f) week().sortDirection = week().sortDirection === 'asc' ? 'desc' : 'asc';
  else {
    week().sortField = f;
    week().sortDirection = 'asc';
  }
  render();
}
function fittedCounts(counts, total, slots) {
  const sourceTotal = counts.reduce((a, b) => a + b, 0) || slots,
    raw = Array.from({ length: slots }, (_, i) => ((counts[i] || 0) * total) / sourceTotal),
    base = raw.map(Math.floor),
    remainders = raw.map((v, i) => ({ i, v: v - Math.floor(v) })).sort((a, b) => b.v - a.v),
    remaining = total - base.reduce((a, b) => a + b, 0);
  remainders.slice(0, remaining).forEach((x) => base[x.i]++);
  return base;
}
function shiftForSlot(counts, slot) {
  let sum = 0;
  for (let i = 0; i < counts.length; i++) {
    sum += counts[i];
    if (slot < sum) return i;
  }
  return counts.length - 1;
}
/* período do rodízio de turnos: a cada semana, a cada 2 semanas (quinzenal) ou a cada ciclo de 4 semanas (mensal) */
const RODIZIO = { semanal: 1, quinzenal: 2, mensal: 4 };
const rodizioPeriodo = () => (RODIZIO[sector().rodizio] ? sector().rodizio : 'semanal');
const passoRod = (wi) => Math.floor(wi / RODIZIO[rodizioPeriodo()]);
function periodoPanel() {
  const p = rodizioPeriodo();
  return `<div class="setting-block rodizio-periodo"><label for="rodizioPeriodo">Modelo do rodízio de turnos</label><select id="rodizioPeriodo">${[['semanal', 'Semanal: troca de turno toda semana'], ['quinzenal', 'Quinzenal: troca a cada 2 semanas'], ['mensal', 'Mensal: troca a cada ciclo de 4 semanas']].map(([v, n]) => `<option value="${v}" ${p === v ? 'selected' : ''}>${n}</option>`).join('')}</select><p class="helper">Vale para este setor. ${p === 'semanal' ? 'Cada semana a equipe passa para outro turno.' : p === 'quinzenal' ? 'As semanas 1-2 têm os mesmos turnos e as semanas 3-4 trocam. Ao avançar o ciclo, os turnos giram de novo.' : 'As 4 semanas têm os mesmos turnos; a troca acontece ao avançar para o próximo ciclo.'} Depois de mudar, clique em "Gerar" (aba Gerar) para refazer as 4 semanas.</p></div>`;
}
function applyRotation() {
  const source = week(),
    sum = source.rotation.counts.reduce((a, b) => a + b, 0);
  if (sum !== source.activeCount) {
    source.rotation.message = `A soma dos turnos deve ser ${source.activeCount}; ajuste antes de aplicar.`;
    render();
    return;
  }
  source.rotation.message = 'Rodízio aplicado nas quatro semanas deste setor.';
  sector().weeks.forEach((target, targetIndex) => {
    normalizeWeek(target);
    const counts = fittedCounts(source.rotation.counts, target.activeCount, target.shifts.length),
      offset =
        ((((passoRod(targetIndex) - passoRod(state.selectedWeek)) * counts[0]) % target.activeCount) + target.activeCount) %
        target.activeCount;
    target.rotation = {
      enabled: true,
      counts,
      message: targetIndex === state.selectedWeek ? source.rotation.message : '',
    };
    /* quem está de férias/atestado a semana inteira fica fora do rodízio de turnos dessa semana */
    const pres = target.employees.filter((e) => !foraSemana(e, targetIndex) && e.fixo === undefined),
      fx = target.shifts.map((_, k) => target.employees.filter((e) => e.fixo === k && !foraSemana(e, targetIndex)).length);
    if (pres.length === target.employees.length)
      target.employees.forEach(
        (e, index) => (e.shift = shiftForSlot(counts, (index - offset + target.activeCount) % target.activeCount)),
      );
    else if (pres.length) {
      const n = pres.length,
        cP = fittedCounts(
          source.rotation.counts.map((c, k) => Math.max(0, c - (fx[k] || 0))),
          n,
          target.shifts.length,
        ),
        off = ((((passoRod(targetIndex) - passoRod(state.selectedWeek)) * cP[0]) % n) + n) % n;
      pres.forEach((e, index) => (e.shift = shiftForSlot(cP, (index - off + n) % n)));
    }
    sortShifts(target);
  });
  render();
}
async function replicate(kind) {
  const origem = state.selectedWeek,
    soSeguintes = kind === 'all'; /* preenchimento completo: só as semanas depois desta */
  if (soSeguintes) {
    const dest = sector().weeks.map((_, i) => i).filter((i) => i > origem);
    if (!dest.length) return toast('Esta é a última semana do ciclo: não há semanas depois dela para receber a cópia.', true);
    const nm = dest.map((i) => i + 1).join(', ');
    if (!(await askConfirm('Copiar o preenchimento completo da Semana ' + (origem + 1) + ' para a(s) semana(s) ' + nm + '?\n\nO que está nelas será substituído. As semanas anteriores não mudam. Dá para voltar com o botão Desfazer.')))
      return toast('Nada foi alterado.', true);
  }
  snapDesfazer();
  const source = clone(week());
  sector().weeks.forEach((target, index) => {
    if (index === state.selectedWeek) return;
    if (soSeguintes && index < origem) return;
    normalizeWeek(target);
    if (kind === 'all') {
      sector().weeks[index] = clone(source);
      normalizeWeek(sector().weeks[index]);
      sortShifts(sector().weeks[index]);
      fixSundays(sector().weeks[index], source, index);
      return;
    }
    if (kind === 'team') {
      target.activeCount = source.activeCount;
      target.model = source.model;
      target.employees = clone(source.employees);
      target.shifts.forEach((s) => sync(s, target.model, undefined, target));
      fixSundays(target, source, index);
    }
    if (kind === 'shifts') {
      target.shifts = clone(source.shifts);
      target.sunday = clone(source.sunday);
    }
    if (kind === 'rotation') {
      target.rotation = clone(source.rotation);
    }
    if (kind === 'pdvs' && hasPdv()) target.pdvCount = source.pdvCount;
    normalizeWeek(target);
    sortShifts(target);
  });
  render();
}
/* Folgas equilibradas: escolhe os dias de folga de cada colaboradora para que cada turno (cedo, meio, tarde) fique com
   a quantidade de pessoas o mais parecida possível em todos os dias, sem sábado sempre que der, sem repetir o dia de folga
   de Recepção/Fiscal e sem passar de 6 dias seguidos de trabalho entre uma semana e outra (art. 67 da CLT). */
/* movimento esperado de atendimento por dia da semana (editável na aba Gerar): quanto maior o movimento, menos folgas naquele dia */
const MOVE_NOTE =
  ' As folgas seguem o movimento esperado de cada dia (aba Gerar): mais folgas nos dias fracos e menos nos de pico, sempre com ao menos metade de cada turno e alguém em cada posto.';
const MOV_LEVELS = [
  ['baixo', 'Baixo', 4],
  ['medio', 'Médio', 3],
  ['alto', 'Alto', 2],
  ['muito', 'Muito alto', 1],
];
const MOV_DEFAULT = {
  segunda: 'baixo',
  terça: 'baixo',
  quarta: 'medio',
  quinta: 'medio',
  sexta: 'alto',
  sábado: 'muito',
  domingo: 'alto',
};
function movement() {
  const s = sector(),
    m = s.movement || {},
    out = {};
  Object.keys(MOV_DEFAULT).forEach((k) => {
    out[k] = MOV_LEVELS.some((l) => l[0] === m[k]) ? m[k] : MOV_DEFAULT[k];
  });
  return out;
}
const movLabel = (k) => MOV_LEVELS.find((l) => l[0] === movement()[k])[1],
  movWeight = (k) => MOV_LEVELS.find((l) => l[0] === movement()[k])[2];
function balanceOffs(w, chain) {
  const weeks = sector().weeks,
    wi = weeks.indexOf(w),
    prev = wi > 0 ? weeks[wi - 1] : null,
    next = !chain && wi >= 0 && wi < weeks.length - 1 ? weeks[wi + 1] : null;
  const dayKeys = DAYS.filter((d) => d[0] !== 'domingo').map((d) => d[0]),
    idx = (k) => dayKeys.indexOf(k);
  const emps = w.employees,
    six = w.model === '6x1';
  const cnt = {},
    tot = dayKeys.map(() => 0),
    used = {};
  const get = (s, d) => cnt[s + '-' + d] || 0,
    put = (s, d) => {
      cnt[s + '-' + d] = get(s, d) + 1;
      tot[d]++;
    };
  const need = (e) => (six ? (e.sundayWork ? 1 : 0) : e.sundayWork ? 2 : 1);
  const wts = dayKeys.map((k, d) => (closedDay(k, wi) ? 0 : movWeight(k))),
    wsum = wts.reduce((a, b) => a + b, 0) || 1;
  const totNeed = emps.reduce((t, e) => t + need(e), 0),
    shiftNeed = {},
    shiftMem = {},
    postMem = {};
  emps.forEach((e) => {
    shiftNeed[e.shift] = (shiftNeed[e.shift] || 0) + need(e);
    shiftMem[e.shift] = (shiftMem[e.shift] || 0) + 1;
    if (hasPosts()) postMem[e.station] = (postMem[e.station] || 0) + 1;
  });
  const tgt = (s, d) => ((shiftNeed[s] || 0) * wts[d]) / wsum,
    tgtTot = (d) => (totNeed * wts[d]) / wsum,
    postCnt = {};
  const lastOff = (x) => Math.max(-1, ...x.offDays.map(idx));
  const lims = emps.map((e, i) => {
    /* com a semana começando no domingo não há mais amarra entre semanas: cada semana tem a sua folga (o app avisa se passar de 6 dias seguidos) */
    return { ub: 5, lb: 0 };
  });
  const closedIdx = dayKeys.map((k) => closedDay(k, wi));
  /* férias/atestado: nesses dias a pessoa já está fora; não recebe folga neles e conta como ausente na cobertura */
  const ausD = emps.map((e) => dayKeys.map((k) => wi >= 0 && !!ausente(e, k, wi)));
  const allowed = (i) => dayKeys.map((k, d) => d).filter((d) => !closedIdx[d] && !ausD[i][d]);
  const order = emps
    .map((e, i) => i)
    .sort((a, b) => {
      const ga = noSameOff().includes(emps[a].station) ? 0 : 1,
        gb = noSameOff().includes(emps[b].station) ? 0 : 1;
      if (ga !== gb) return ga - gb;
      const ta = (lims[a].ub < 5 ? 0 : 1) + (lims[a].lb > 0 ? 0 : 1),
        tb = (lims[b].ub < 5 ? 0 : 1) + (lims[b].lb > 0 ? 0 : 1);
      return ta - tb || emps[a].shift - emps[b].shift || a - b;
    });
  /* descanso a cada 6 dias: depois de uma semana com domingo de folga, quem trabalha o domingo seguinte deve folgar cedo na semana (senão passa de 6 dias seguidos);
     e na semana do domingo de folga (5x2) a folga fica mais para o fim da semana */
  const seqCost = (e, d) => {
    let c = 0;
    const pe = prev && prev.employees[emps.indexOf(e)];
    if (e.sundayWork && pe && !pe.sundayWork) {
      const p2 = Math.max(0, ...pe.offDays.map((k) => idx(k) + 1));
      c += Math.max(0, d + 1 - p2 - 1) * 600;
    } else if (!e.sundayWork && !six) c += (5 - d) * 120;
    return c;
  };
  const dayCost = (e, d, picked) => {
    const cs = get(e.shift, d) + picked.filter((x) => x === d).length;
    let c = (2 * (cs - tgt(e.shift, d)) + 1) * 100 + (2 * (tot[d] - tgtTot(d)) + 1) * 30; // segue o movimento esperado do dia
    if (!picked.length) c += seqCost(e, d);
    if (evitaDia(e.station, dayKeys[d])) c += 400; // evita os dias marcados para o posto (regra configurável; padrão: sábado)
    const M = shiftMem[e.shift] || 0;
    if (M >= 2 && M - (cs + 1) < Math.ceil(M / 2)) c += 8000; // pelo menos metade do turno presente
    if (noSameOff().includes(e.station) && used['nso-' + d]) c += 5000; // Fiscal/Recepção (todos os postos marcados formam um grupo): mesmo dia só se não houver saída
    if (hasPosts() && (postMem[e.station] || 0) >= 2 && (postCnt[e.station + '-' + d] || 0) + 1 >= postMem[e.station])
      c += 8000; // nunca deixar o posto sem ninguém
    return c + picked.filter((x) => x === d).length * 9999;
  };
  emps.forEach((e, i) =>
    ausD[i].forEach((a, d) => {
      if (a && !closedIdx[d]) {
        put(e.shift, d);
        postCnt[e.station + '-' + d] = (postCnt[e.station + '-' + d] || 0) + 1;
      }
    }),
  );
  order.forEach((i) => {
    const e = emps[i],
      n = Math.min(need(e), allowed(i).length),
      { ub, lb } = lims[i];
    let cand = allowed(i);
    if (!e.sundayWork) cand = cand.filter((d) => d <= ub);
    if (!cand.length) cand = allowed(i).filter((d) => d <= Math.max(ub, 0));
    if (!cand.length) cand = [0];
    let best = null;
    const tryPick = (picks) => {
      if (e.sundayWork && Math.max(...picks) < lb) return;
      // custo acumulado considerando as escolhas já feitas nesta combinação
      const t = {};
      let c = 0;
      picks.forEach((d, k) => {
        c += dayCost(e, d, picks.slice(0, k)) + (t[d] || 0) * 0;
        t[d] = 1;
      });
      // custo de desequilíbrio: soma dos quadrados das contagens depois de aplicar

      if (best === null || c < best.c) best = { c, picks };
    };
    if (n === 0) {
      e.offDays = [];
      return;
    }
    /* folga fixa: os dias travados entram primeiro; o gerador só escolhe o que faltar */
    const lock = (e.folgaFixa || []).map(idx).filter((d) => d >= 0 && allowed(i).includes(d)).slice(0, n);
    if (lock.length >= n) best = { c: 0, picks: lock.slice(0, n) };
    else if (lock.length) cand.filter((d) => !lock.includes(d)).forEach((d) => tryPick([...lock, d]));
    else if (n === 1) cand.forEach((d) => tryPick([d]));
    else for (let a = 0; a < cand.length; a++) for (let b = a + 1; b < cand.length; b++) tryPick([cand[a], cand[b]]);
    if (!best) {
      const f = (e.sundayWork && lb > 0 ? cand.filter((d) => d >= lb) : cand)[0] ?? cand[0];
      best = { picks: n === 1 ? [f] : [cand[0], cand[1] ?? cand[0]] };
    }
    best.picks.sort((a, b) => a - b);
    e.offDays = best.picks.map((d) => dayKeys[d]);
    best.picks.forEach((d) => {
      put(e.shift, d);
      postCnt[e.station + '-' + d] = (postCnt[e.station + '-' + d] || 0) + 1;
      if (noSameOff().includes(e.station)) used['nso-' + d] = 1;
    });
  });
}
function suggestOffFor(w) {
  balanceOffs(w, false);
}
function offForEmp(w, e, i) {
  const g = noSameOff().includes(e.station) ? w.employees.filter((x) => noSameOff().includes(x.station)) : null;
  return g ? offFor(e, g.indexOf(e), w.model, true) : offFor(e, i, w.model);
}
function offFor(e, i, model, grp) {
  const g = i % 3;
  if (model === '6x1') {
    /* 6x1 com a semana começando no domingo: 1 folga por semana. Semana COM domingo trabalhado = 1 folga em dia útil (qua/qui/sex);
       semana SEM domingo = só o domingo (que já é a folga). Sem folga extra. */
    return e.sundayWork ? [WD[2 + g]] : [];
  }
  if (grp) {
    const G = [
        [0, 3],
        [1, 4],
        [2, 5],
      ][i % 3],
      gp = [WD[G[0]], WD[G[1]]];
    return e.sundayWork ? gp : [gp[0]];
  }
  const P = [
      [0, 2],
      [1, 3],
      [2, 4],
      [0, 3],
      [1, 4],
    ],
    pr = P[i % 5],
    pair = [WD[pr[0]], WD[pr[1]]];
  return e.sundayWork ? pair : [pair[Math.floor(i / 5) % 2]];
}
/* ao copiar uma semana, as semanas a distância ímpar recebem o domingo de quem NÃO trabalhou na origem (mesma quantidade) */
function fixSundays(target, source, idx) {
  if (Math.abs(idx - state.selectedWeek) % 2 === 0) return;
  const k = source.employees.filter((e) => e.sundayWork).length,
    non = source.employees.map((e, i) => i).filter((i) => !source.employees[i].sundayWork),
    pick = new Set(non.slice(0, k));
  target.employees.forEach((e, i) => {
    const was = e.sundayWork;
    e.sundayWork = pick.has(i);
    if (was !== e.sundayWork) e.offDays = offForEmp(target, e, i);
  });
}
/* ===== domingo com turno próprio: "Até o meio-dia" (direto, sem intervalo) ou "Dia todo" (com almoço, como nos dias normais) ===== */
function normSunday(sd, model, wi) {
  sd = sd && typeof sd === 'object' ? sd : {};
  const ok = (v) => /^\d{2}:\d{2}$/.test(v || ''),
    mode = sd.mode === 'dia' ? 'dia' : 'meio';
  const out = {
    mode,
    start: ok(sd.start) ? sd.start : mode === 'dia' ? '07:00' : '07:40',
    end: ok(sd.end) ? sd.end : '12:00',
    lunchStart: ok(sd.lunchStart) ? sd.lunchStart : '11:00',
  };
  if (mode === 'dia') {
    out.lunchEnd = plus(out.lunchStart, 120);
    if (!ok(sd.end)) out.end = plus(out.start, workDuration(model, wi) + 120);
  }
  return out;
}
function sundayPlan(w) {
  const sd = w.sunday || normSunday(null, w.model, 0),
    st = mins(sd.start),
    en = mins(sd.end);
  if (sd.mode === 'dia') {
    const ls = mins(sd.lunchStart),
      le = mins(sd.lunchEnd);
    return { st, en, len: en - st, brk: [ls, le], work: en - st - (le - ls) };
  }
  return { st, en, len: en - st, brk: null, work: Math.max(0, en - st) };
}
function sundayCard() {
  const w = week(),
    sd = w.sunday,
    full = sd.mode === 'dia';
  return (
    `<div class="shift-card sunday-card"><h3>Domingo</h3><div class="time-grid"><label style="grid-column:1/-1">Tipo de domingo<select data-sunday="mode"><option value="meio" ${full ? '' : 'selected'}>Até o meio-dia (direto, sem intervalo)</option><option value="dia" ${full ? 'selected' : ''}>Dia todo (com almoço)</option></select></label>` +
    (full
      ? `<label>Entrada<input data-sunday="start" type="time" value="${sd.start}" /></label><label>Saída<input data-sunday="end" type="time" value="${sd.end}" /></label><label>Saída para almoço<input data-sunday="lunchStart" type="time" value="${sd.lunchStart}" /></label><label>Retorno automático (+2h)<input type="time" value="${sd.lunchEnd}" disabled /></label>`
      : `<label>Entrada<input data-sunday="start" type="time" value="${sd.start}" /></label><label>Saída<input data-sunday="end" type="time" value="${sd.end}" /></label>`) +
    `</div><p class="helper">${full ? 'Sugestão inicial pela carga do modelo (${hm(workDuration(w.model,state.selectedWeek))} + 2h de almoço), mas você pode alterar a saída livremente.' : 'Trabalho direto até ' + sd.end + ', sem intervalo. Se passar de 6h seguidas, use "Dia todo".'}</p></div>`
  );
}
function weekMin(e, w = week(), wi = state.selectedWeek) {
  return DAYS.reduce(
    (t, d) => (!worksOn(e, d[0], wi) ? t : t + (d[0] === 'domingo' ? sundayPlan(w).work : workDuration(w.model, wi))),
    0,
  );
}
function needBase(b = 0) {
  state.selectedWeek = b;
  toast(
    hasPosts()
      ? 'Escolha primeiro, na Semana 1, quem trabalha no domingo ("Trabalha no domingo = Sim"), incluindo pelo menos 1 colaboradora em cada posto obrigatório: ' +
          sundayPosts()
            .map((p) => POST_NAMES[p])
            .join(' e ') +
          '. Depois o app faz o revezamento das outras semanas.'
      : 'Escolha primeiro, na Semana 1, quais colaboradoras trabalham no domingo ("Trabalha no domingo = Sim"). Depois o app faz o revezamento das outras semanas.',
  );
  render();
}
const baseOk = (b = 0) => {
  const w0 = sector().weeks[b];
  normalizeWeek(w0);
  const s = w0.employees.filter((e) => e.sundayWork);
  if (!s.length) return false;
  return sundayPosts().every((p) => s.some((e) => e.station === p));
};
/* Preenche os domingos das semanas 2-4 a partir da Semana 1, sem substituir semanas que já tenham domingo definido. */
function fillSundays(base = 0) {
  const weeks = sector().weeks;
  weeks.forEach((w) => {
    normalizeWeek(w);
    sortShifts(w);
  });
  const k = weeks[base].employees.filter((e) => e.sundayWork).length,
    filled = [],
    short = [],
    noPost = [];
  const worked = (i) => weeks.reduce((t, w) => t + (w.employees[i] && w.employees[i].sundayWork ? 1 : 0), 0);
  const works = (w, i) => !!(w && w.employees[i] && w.employees[i].sundayWork);
  weeks.forEach((w, wi) => {
    if (wi <= base || w.employees.some((e) => e.sundayWork)) return;
    /* o posto é da colaboradora: nas semanas vazias, quem estiver no PDV herda o posto Pacote/Fiscal/Recepção da Semana 1 */
    const cand = w.employees
      .map((e, i) => i)
      .filter((i) => !works(weeks[wi - 1], i) && !works(weeks[wi + 1], i) && !ausente(w.employees[i], 'domingo', wi))
      .sort((a, b) => worked(a) - worked(b) || a - b);
    const pick = [],
      take = (i) => {
        if (i !== undefined && !pick.includes(i) && pick.length < k) pick.push(i);
      };
    if (hasPosts())
      sundayPosts().forEach((p) => {
        for (let n = 0; n < sundayPostMin(p); n++) {
          const c = cand.find((i) => w.employees[i].station === p && !pick.includes(i));
          if (c === undefined) {
            if (n === 0) noPost.push(wi + 1 + ' (' + POST_NAMES[p] + ')');
            break;
          }
          take(c);
        }
      });
    cand.forEach(take);
    pick.forEach((i) => {
      w.employees[i].sundayWork = true;
    });
    filled.push(wi);
    if (pick.length < k) short.push(wi + 1);
  });
  return { k, filled, short, noPost };
}
function sundayNote(r) {
  return (
    (r.filled.length
      ? 'Domingos preenchidos nas semanas ' +
        r.filled.map((x) => x + 1).join(', ') +
        ' a partir da Semana 1 (ninguém repete domingo). '
      : 'Nenhuma semana vazia para preencher; os domingos que você definiu foram mantidos. ') +
    (r.short.length
      ? 'Atenção: nas semanas ' +
        r.short.join(', ') +
        ' não há colaboradoras suficientes sem domingo na semana vizinha para repetir a quantidade da Semana 1. '
      : '') +
    (r.noPost && r.noPost.length
      ? 'Atenção: faltou colaboradora disponível em ' +
        r.noPost.join(', ') +
        ' para o domingo; defina o posto dessas semanas. '
      : '') +
    'Quem não trabalha no domingo ficou com o domingo de folga.'
  );
}
function suggestOffDays() {
  if (!baseOk()) {
    needBase();
    return;
  }
  const r = fillSundays();
  r.filled.forEach((wi) => suggestOffFor(sector().weeks[wi]));
  suggestOffFor(week());
  state.notice = 'Folgas sugeridas nesta semana. ' + sundayNote(r) + MOVE_NOTE;
  render();
}
const SIX_NOTE =
  ' No 6x1, a semana (domingo a sábado) tem 1 folga: quem trabalha no domingo folga 1 dia útil e quem não trabalha tem o domingo como folga. Confira em Conformidade se alguém passa de 6 dias seguidos na emenda entre semanas.';
function suggestOffAll() {
  if (!baseOk()) {
    needBase();
    return;
  }
  const r = fillSundays();
  sector().weeks.forEach((w) => balanceOffs(w, true));
  state.notice = 'Folgas sugeridas nas 4 semanas. ' + sundayNote(r) + MOVE_NOTE;
  render();
}
/* "Completar as 4 semanas": a Semana 1 é sempre a base. Copia equipe, modelo, PDVs e turnos para as semanas 2-4, escolhe os domingos
   (se a Semana 1 ainda não tem domingos definidos, o app escolhe; se já tem, mantém os seus) e calcula as folgas das 4 semanas. */
const sigOutras = (b = 0) =>
  JSON.stringify([b, ...sector().weeks.slice(b + 1).map((w) => w.employees.map((e) => [e.shift, e.station, e.pdv, !!e.sundayWork, e.offDays]))]);
/* texto do botão: a semana aberta é a base; só as semanas depois dela são refeitas */
function rotuloCompletar(b = state.selectedWeek) {
  const resta = 3 - b;
  if (b === 0) return ['Completar as 4 semanas', '(equipe, modelo, PDVs, domingos e folgas)', 'A Semana 1 é a base: preencha ela primeiro. Ela não é alterada além das folgas.'];
  if (resta <= 0) return ['Última semana', '(não há semanas depois para completar)', 'Esta é a última semana do ciclo. Abra uma semana anterior para completar as seguintes.'];
  const lista = Array.from({ length: resta }, (_, k) => b + 2 + k);
  return [
    'Completar ' + (resta === 1 ? 'a Semana ' + lista[0] : 'as Semanas ' + lista.join(' e ')),
    '(a partir da Semana ' + (b + 1) + ')',
    'A Semana ' + (b + 1) + ' é a base. ' + (b === 1 ? 'A Semana 1 não é alterada.' : 'As semanas 1 a ' + b + ' não são alteradas.'),
  ];
}
/* "Completar": a semana aberta é a base. Copia equipe, modelo, PDVs e turnos para as semanas SEGUINTES, escolhe os domingos
   (ninguém repete domingo) e recalcula as folgas delas. As semanas anteriores à base ficam como estão. */
async function completarSemanas() {
  const weeks = sector().weeks,
    b = state.selectedWeek,
    wb = weeks[b],
    depois = weeks.map((_, i) => i).filter((i) => i > b),
    nums = depois.map((i) => i + 1),
    nomes = nums.length > 1 ? nums.slice(0, -1).join(', ') + ' e ' + nums[nums.length - 1] : String(nums[0] || '');
  if (!depois.length) return toast('Esta é a última semana do ciclo: não há semanas depois dela para completar.', true);
  /* pergunta antes de substituir semanas que já têm conteúdo (e avisa o que NÃO muda) */
  const temConteudo = depois.some((i) => weeks[i].employees.some((e) => e.sundayWork));
  if (temConteudo && sector().sigCompletar !== sigOutras(b)) {
    const ok = await askConfirm(
      (nums.length > 1 ? 'As semanas ' : 'A semana ') + nomes + (nums.length > 1 ? ' têm' : ' tem') + ' alterações feitas depois do último preenchimento automático.\n\n' +
        'Completar vai substituir ' + (nums.length > 1 ? 'as semanas ' : 'a semana ') + nomes + ' pelo cálculo a partir da Semana ' + (b + 1) + '.' +
        (b === 1 ? ' A Semana 1 não será alterada.' : b > 1 ? ' As semanas 1 a ' + b + ' não serão alteradas.' : '') +
        '\n\nContinuar?\n\n(Se precisar, dá para voltar com o botão Desfazer.)',
    );
    if (!ok) return toast('Nada foi alterado.', true);
  }
  normalizeWeek(wb);
  if (!wb.employees.length || wb.activeCount < 1) {
    render();
    toast('Erro: preencha primeiro a Semana ' + (b + 1) + ' (colaboradoras, turnos e modelo). As semanas seguintes são calculadas a partir dela.');
    return;
  }
  let auto = false;
  if (!baseOk(b)) {
    /* domingos da semana base: mantém quem já foi marcado, garante o mínimo de cada posto e completa até metade da equipe no máximo */
    auto = true;
    const n = wb.employees.length,
      /* com postos que têm mínimo de domingo, o total é exatamente a soma dos mínimos (ex.: Produção 1 = uma vaga, que roda entre as 4 pessoas); sem isso, 40% da equipe */
      alvo = hasPosts() && sundayPosts().length ? Math.max(1, sundayMin() || 0) : Math.max(1, Math.min(Math.max(sundayMin() || 0, Math.ceil(n * 0.4)), Math.floor(n / 2) || 1));
    const marca = (e) => {
      if (e && !e.sundayWork) e.sundayWork = true;
    };
    if (hasPosts())
      sundayPosts().forEach((p) => {
        for (let k = wb.employees.filter((e) => e.station === p && e.sundayWork).length; k < sundayPostMin(p); k++) {
          const c = wb.employees.find((e) => e.station === p && !e.sundayWork && !ausente(e, 'domingo', b));
          if (!c) break;
          marca(c);
        }
      });
    const falta = () => alvo - wb.employees.filter((e) => e.sundayWork).length;
    /* completa distribuindo entre os turnos (quem tem menos domingos no turno primeiro) */
    while (falta() > 0) {
      const livres = wb.employees.filter((e) => !e.sundayWork && !ausente(e, 'domingo', b));
      if (!livres.length) break;
      const porTurno = (s) => wb.employees.filter((e) => e.shift === s && e.sundayWork).length;
      livres.sort((a, c) => porTurno(a.shift) - porTurno(c.shift) || wb.employees.indexOf(a) - wb.employees.indexOf(c));
      marca(livres[0]);
    }
  }
  snapDesfazer();
  /* copia a semana base (equipe, modelo, PDVs, turnos) para as seguintes e recalcula domingos e folgas */
  const antes = state.selectedWeek;
  state.selectedWeek = b;
  const base = clone(wb);
  depois.forEach((index) => {
    weeks[index] = clone(base);
    normalizeWeek(weeks[index]);
    sortShifts(weeks[index]);
    weeks[index].employees.forEach((e) => {
      e.sundayWork = false;
    });
  });
  const r = fillSundays(b);
  weeks.forEach((w, i) => {
    if (i > b || b === 0) balanceOffs(w, true);
  });
  state.selectedWeek = antes;
  sector().sigCompletar = sigOutras(b);
  const aviso = r.short.length || (r.noPost && r.noPost.length);
  state.notice =
    (depois.length === 1 ? 'Semana ' : 'Semanas ') + nomes + ' completada' + (depois.length === 1 ? '' : 's') + ' a partir da Semana ' + (b + 1) + '. ' +
    (b > 0 ? 'As semanas anteriores não foram alteradas. ' : '') +
    (auto ? 'Os domingos da Semana ' + (b + 1) + ' foram escolhidos pelo app (você pode trocar e clicar de novo). ' : 'Os domingos que você marcou na Semana ' + (b + 1) + ' foram mantidos. ') +
    sundayNote(r) +
    MOVE_NOTE;
  render();
  toast(
    aviso
      ? 'Semanas completadas, mas com atenção: confira os avisos de domingo na tela.'
      : 'Pronto: equipe, modelo, PDVs, domingos e folgas ' + (b === 0 ? 'das 4 semanas' : 'das semanas ' + nomes) + ' calculados a partir da Semana ' + (b + 1) + '.',
    !aviso,
  );
}
function suggestSundays() {
  if (!baseOk()) {
    needBase();
    return;
  }
  const r = fillSundays();
  r.filled.forEach((wi) => suggestOffFor(sector().weeks[wi]));
  const counts = sector().weeks.map((w) => w.employees.filter((e) => e.sundayWork).length),
    min = sundayMin();
  state.notice =
    sundayNote(r) +
    ' Colaboradoras por domingo: ' +
    counts.join(' / ') +
    '.' +
    (Math.min(...counts) < min ? ' O mínimo do setor é ' + min + ' por domingo.' : '');
  render();
}
/* ===== rodízio de TURNOS (cedo/tarde) por posto: Pacote, Fiscal e Recepção. O posto da colaboradora não muda. ===== */

function postCfg() {
  /* vagas cedo/tarde por posto: sem ajuste manual, metade cedo e metade tarde das colaboradoras que estão no posto na semana aberta */
  const s = sector();
  s.posts = s.posts || {};
  const out = {};
  postKeys().forEach((k) => {
    const c = s.posts[k],
      n = week().employees.filter((e) => e.station === k).length;
    out[k] =
      c && c.custom
        ? {
            cedo: Math.min(20, Math.max(0, Math.floor(+c.cedo) || 0)),
            tarde: Math.min(20, Math.max(0, Math.floor(+c.tarde) || 0)),
          }
        : { cedo: Math.ceil(n / 2), tarde: Math.floor(n / 2) };
  });
  return out;
}
function setPostCfg(k, per, v) {
  const s = sector(),
    cur = postCfg()[k];
  s.posts = s.posts || {};
  s.posts[k] = { ...cur, [per]: Math.max(0, Math.floor(+v) || 0), custom: true };
}
const postSlots = (k) => {
  const c = postCfg()[k],
    a = [];
  for (let i = 0; i < c.cedo; i++) a.push('cedo');
  for (let i = 0; i < c.tarde; i++) a.push('tarde');
  return a;
};
/* Rodízio por turno: s.postShifts[posto] = [quantas pessoas do posto em cada turno]. Sem isso, vale o cedo/tarde automático. */
function postShiftsCustom(k) {
  const a = (sector().postShifts || {})[k];
  return Array.isArray(a) && a.some((n) => n > 0) ? a : null;
}
function autoShiftCounts(k, w) {
  /* o cedo/tarde automático distribuído pelos turnos (1º, 2º…) em sequência */
  const c = postCfg()[k],
    ix = periodIdx(w),
    out = w.shifts.map(() => 0);
  [
    ['cedo', c.cedo],
    ['tarde', c.tarde],
  ].forEach(([p, n]) => {
    for (let i = 0; i < n && ix[p].length; i++) out[ix[p][i % ix[p].length]]++;
  });
  return out;
}
function shiftCounts(k, w) {
  /* posto sem ninguém na semana: tudo zerado, mesmo que haja valores guardados */
  if (!w.employees.some((e) => e.station === k)) return w.shifts.map(() => 0);
  const cu = postShiftsCustom(k);
  return w.shifts.map((_, i) => (cu ? Math.max(0, Math.floor(+cu[i]) || 0) : autoShiftCounts(k, w)[i]));
}
function setPostShift(k, i, v) {
  const s = sector(),
    w = week();
  s.postShifts = s.postShifts || {};
  const cur = postShiftsCustom(k) ? shiftCounts(k, w) : autoShiftCounts(k, w);
  cur[i] = Math.min(30, Math.max(0, Math.floor(+v) || 0));
  s.postShifts[k] = cur;
}
/* reparte as vagas escolhidas entre as M pessoas do posto (maior resto), mantendo a proporção entre os turnos */
function scaleCounts(counts, M) {
  const S = counts.reduce((a, b) => a + b, 0);
  if (!S || S === M) return counts.slice();
  const raw = counts.map((n) => (n * M) / S),
    out = raw.map(Math.floor);
  let left = M - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .forEach(([, i]) => {
      if (left > 0 && counts[i] > 0) {
        out[i]++;
        left--;
      }
    });
  return out;
}
function periodIdx(w) {
  const early = mins(state.settings.earlyBefore || '09:00'),
    all = w.shifts.map((s, i) => i);
  return {
    cedo: all.filter((i) => mins(w.shifts[i].start) < early),
    tarde: all.filter((i) => mins(w.shifts[i].start) >= early),
  };
}
/* Para cada posto, as colaboradoras daquele posto (ordem do número) ocupam as vagas cedo/tarde e na semana seguinte avançam uma vaga:
   todas alternam entre cedo e tarde. Cada posto tem a sua própria contagem; o posto de ninguém muda. */
function applyPostPlan(silent) {
  const cfg = postCfg(),
    weeks = sector().weeks;
  weeks.forEach((w) => normalizeWeek(w));
  const fail = (m) => {
      toast(m);
      return false;
    },
    total = postKeys().reduce((t, k) => t + (postShiftsCustom(k) ? 1 : postSlots(k).length), 0);
  if (!total) return fail('Defina em "Rodízio" quantas colaboradoras de cada posto ficam em cada turno.');
  const ix0 = periodIdx(weeks[0]);
  if (postKeys().some((k) => !postShiftsCustom(k) && cfg[k].cedo > 0) && !ix0.cedo.length)
    return fail(
      'Nenhum turno entra antes de ' +
        state.settings.earlyBefore +
        ': não há horário "cedo". Ajuste os turnos ou o horário limite de "cedo".',
    );
  if (postKeys().some((k) => !postShiftsCustom(k) && cfg[k].tarde > 0) && !ix0.tarde.length)
    return fail(
      'Todos os turnos entram antes de ' +
        state.settings.earlyBefore +
        ': não há horário "tarde". Ajuste os turnos ou o horário limite.',
    );
  const notes = [];
  weeks.forEach((w, wi) => {
    const ix = periodIdx(w),
      cnt = { cedo: 0, tarde: 0 };
    postKeys().forEach((k) => {
      if (postShiftsCustom(k)) {
        const allP = w.employees.filter((e) => e.station === k && !foraSemana(e, wi)).sort((a, b) => a.id - b.id),
          all = allP.filter((e) => e.fixo === undefined),
          M = all.length;
        if (!M) return;
        const raw = shiftCounts(k, w),
          S = raw.reduce((a, b) => a + b, 0),
          cAll = scaleCounts(raw, allP.length),
          cSem = cAll.map((n, q) => Math.max(0, n - allP.filter((e) => e.fixo === q).length)),
          counts = cSem.reduce((a, b) => a + b, 0) > 0 ? scaleCounts(cSem, M) : scaleCounts(raw, M);
        if (wi === 0 && S !== M)
          notes.push(
            POST_NAMES[k] + ': ' + M + ' colaboradora(s) para ' + S + ' vaga(s) (mantive a proporção entre os turnos para todas entrarem)',
          );
        const slots = [];
        counts.forEach((n, i) => {
          for (let q = 0; q < n; q++) slots.push(i);
        });
        const first = counts.find((n) => n > 0) || 0,
          step = M === 1 ? 0 : first > 0 && first < M ? first : 1,
          early = mins(state.settings.earlyBefore || '09:00'),
          isLate = (i) => mins(w.shifts[i].start) >= early,
          assign = all.map((e, j) => ({ e, sh: slots[(j + passoRod(wi) * step) % M] }));
        assign.forEach((a) => {
          if (a.e.restricted && isLate(a.sh)) {
            const o = assign.find((b) => !b.e.restricted && !isLate(b.sh));
            if (o) [a.sh, o.sh] = [o.sh, a.sh];
          }
        });
        assign.forEach((a) => (a.e.shift = a.sh));
        return;
      }
      const slots = postSlots(k);
      if (!slots.length) return;
      const allP = w.employees.filter((e) => e.station === k && !foraSemana(e, wi)).sort((a, b) => a.id - b.id),
        all = allP.filter((e) => e.fixo === undefined);
      if (wi === 0 && allP.length !== slots.length)
        notes.push(
          POST_NAMES[k] +
            ': ' +
            allP.length +
            ' colaboradora(s) para ' +
            slots.length +
            ' vaga(s) (mantive a proporção cedo/tarde para todas entrarem)',
        );
      /* todas as colaboradoras do posto entram no rodízio: se o número de vagas não bate com o de colaboradoras, mantém a proporção cedo/tarde.
         A cada semana o grupo avança o número de vagas "cedo", então quem estava cedo vai para a tarde e vice-versa. */
      const M = all.length,
        C = Math.max(0, cfg[k].cedo - allP.filter((e) => e.fixo !== undefined && ix.cedo.includes(e.fixo)).length),
        T = Math.max(0, cfg[k].tarde - allP.filter((e) => e.fixo !== undefined && ix.tarde.includes(e.fixo)).length);
      if (!M) return;
      const c =
          M === 1
            ? C > 0 && T > 0
              ? passoRod(wi) % 2 === 0
                ? 1
                : 0
              : C > 0
                ? 1
                : 0
            : T === 0
              ? M
              : C === 0
                ? 0
                : Math.min(M - 1, Math.max(1, Math.round((M * C) / (C + T)))),
        step = M === 1 ? 0 : c > 0 && c < M ? c : 0;
      const mine = [...Array(c).fill('cedo'), ...Array(M - c).fill('tarde')];
      const assign = all.map((e, j) => ({ e, per: mine[(j + passoRod(wi) * step) % M] }));
      assign.forEach((a) => {
        if (a.e.restricted && a.per === 'tarde') {
          const o = assign.find((b) => !b.e.restricted && b.per === 'cedo');
          if (o) {
            o.per = 'tarde';
            a.per = 'cedo';
          }
        }
      });
      assign.forEach((a) => {
        const list = ix[a.per];
        if (list.length) a.e.shift = list[cnt[a.per]++ % list.length];
      });
    });
  });
  if (!silent && hasPdv()) weeks.forEach((w, wi) => assignPdvs(w, wi, true));
  if (!silent) {
    state.notice =
      'Rodízio de turnos aplicado nas 4 semanas: ' +
      postKeys()
        .filter((k) => postShiftsCustom(k) || cfg[k].cedo + cfg[k].tarde > 0)
        .map((k) =>
          postShiftsCustom(k)
            ? POST_NAMES[k] +
              ' ' +
              shiftCounts(k, weeks[0])
                .map((n, i) => (n ? n + ' no ' + (i + 1) + 'º' : ''))
                .filter(Boolean)
                .join(', ')
            : POST_NAMES[k] + ' ' + cfg[k].cedo + ' cedo / ' + cfg[k].tarde + ' tarde',
        )
        .join('; ') +
      '. O posto de cada colaboradora não muda: ela passa para outro turno a cada semana.' +
      (notes.length ? ' Atenção: ' + notes.join('; ') + '.' : '');
    render();
    toast('Rodízio de turnos dos postos aplicado.', true);
  }
  return { ok: true, notes };
}
function postsPanel() {
  if (!hasPosts()) return '';
  const w = week(),
    keys = postKeys(),
    cnt = Object.fromEntries(keys.map((k) => [k, shiftCounts(k, w)])),
    head = keys
      .map((k) => {
        const n = w.employees.filter((e) => e.station === k).length,
          s = cnt[k].reduce((a, b) => a + b, 0);
        return `<span class="post-col"><b>${POST_NAMES[k]}</b><small class="${n === s || !s ? '' : 'post-warn'}">${n} colaboradora${n === 1 ? '' : 's'}${n !== s && s ? ' · ' + s + ' vaga' + (s === 1 ? '' : 's') : ''}</small></span>`;
      })
      .join(''),
    rows = w.shifts
      .map(
        (sh, i) =>
          `<span class="post-name">${escape(sh.name)}<small>${sh.start}</small></span>` +
          keys
            .map(
              (k) =>
                `<input type="number" min="0" max="30" data-pshift="${i}" data-ppost="${k}" value="${cnt[k][i]}" ${w.employees.some((e) => e.station === k) ? '' : 'disabled title="Nenhuma colaboradora neste posto"'} aria-label="${POST_NAMES[k]} no ${escape(sh.name)}" />`,
            )
            .join(''),
      )
      .join('');
  return `<div class="setting-block rotation-block post-plan"><label>Rodízio de turnos dos postos</label><p class="helper">O posto de cada colaboradora é o da ficha e não muda; no posto Operadora Caixa, o PDV é escolhido no painel "PDVs de cada turno" (aba Regras). Em cada turno, informe quantas colaboradoras de cada posto trabalham nele; elas passam para outro turno a cada semana. Sem alteração, o sistema divide automaticamente entre cedo e tarde.</p>
  <div class="post-shift-wrap"><div class="post-shift-grid" style="--cols:${keys.length}"><span></span>${head}${rows}</div></div>
  <p class="helper">Dica: a soma de cada coluna deve ser igual ao número de colaboradoras daquele posto nesta semana. Quem tem restrição de horário fica nos turnos cedo.</p>
  <button class="button secondary full" id="applyPosts" type="button">Aplicar rodízio de turnos dos postos nas 4 semanas</button>
  <button class="button outline full" id="clearPosts" type="button">Limpar escolha (automático)</button>
  <p class="helper">Muda o turno de todas as colaboradoras que estão em algum posto; as demais não são alteradas.</p></div>`;
}
/* ===== excluir colaboradora (recalcula numeração, rodízio, folgas e PDVs) ===== */
async function removeEmployee(i) {
  const sel = state.selectedSector,
    weeks = sector().weeks;
  weeks.forEach((w) => normalizeWeek(w));
  const w0 = weeks[0];
  if (!w0.employees[i]) return;
  if (w0.employees.length <= 1) {
    toast('O setor precisa ter pelo menos 1 colaboradora.');
    return;
  }
  const name = w0.employees[i].name;
  if (
    !(await askConfirm(
      'Excluir ' +
        name +
        ' de ' +
        SECTORS[sel] +
        '?\n\nEla sai das 4 semanas, a numeração é refeita e as folgas' +
        (hasPdv() ? ' e os números de PDV' : '') +
        ' são recalculados. Domingos e turnos das demais ficam como estão. Você pode desfazer depois na aba Gerar.',
    ))
  )
    return;
  state.undo = {
    ...(state.undo || {}),
    [sel]: {
      at: new Date().toISOString(),
      weeks: clone(weeks),
      roster: clone((state.roster && state.roster[sel]) || []),
    },
  };
  const r = roster();
  r.splice(i, 1);
  weeks.forEach((w) => {
    if (w.employees.length > i) {
      w.employees.splice(i, 1);
      w.activeCount = w.employees.length;
      w.rotation = rotation(w.activeCount, w.shifts.length);
    }
  });
  normalize();
  weeks.forEach((w) => balanceOffs(w, true));
  if (hasPdv()) weeks.forEach((w, wi) => assignPdvs(w, wi));
  state.notice =
    name +
    ' foi excluída. Numeração refeita, folgas' +
    (hasPdv() ? ' e PDVs' : '') +
    ' recalculados nas 4 semanas. Se algum posto obrigatório do domingo ficou sem ninguém, o painel de conformidade avisa.';
  render();
  toast(name + ' excluída. Dá para desfazer na aba Gerar.', true);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-remove]');
  if (b) removeEmployee(+b.dataset.remove);
});

/* ===== importar planilha (.xlsx ou .csv): Nome, Setor, Posto (e, se houver, Restrição) ===== */
const normTxt = (s) =>
  String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
function mapSector(t) {
  const n = normTxt(t);
  if (!n) return null;
  if (SECTORS[t]) return t;
  if (/caixa|frente|pdv/.test(n)) return 'frente-caixa';
  if (/acougue|frios/.test(n)) return 'acougue-frios';
  if (/horti|fruit|hortifruti/.test(n)) return 'horti-fruit';
  if (/padaria/.test(n)) return 'padaria';
  if (/loja|deposito|reposicao/.test(n)) return 'loja-deposito';
  return null;
}
function mapPost(sec, t) {
  const n = normTxt(t),
    keys = postosDoSetor(sec);
  if (sec === 'frente-caixa' && (!n || /^(pdv|caixa|operador)/.test(n)))
    return { station: 'caixa', pdv: +(n.match(/\d+/) || [0])[0] || 0 };
  if (!n) return null;
  const k = keys.find((k) => normTxt(POST_NAMES[k]) === n) || keys.find((k) => n.includes(normTxt(POST_NAMES[k])));
  return k ? { station: k } : null;
}
function parseCsv(text) {
  const first = text.split(/\r?\n/)[0] || '',
    d = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',',
    rows = [];
  let row = [],
    cell = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === d) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
/* leitor mínimo de .xlsx (zip + XML) sem bibliotecas externas */
async function unzip(buf) {
  const dv = new DataView(buf),
    u8 = new Uint8Array(buf),
    td = new TextDecoder();
  let e = u8.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const out = {};
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true),
      csize = dv.getUint32(p + 20, true),
      nl = dv.getUint16(p + 28, true),
      xl = dv.getUint16(p + 30, true),
      cl = dv.getUint16(p + 32, true),
      off = dv.getUint32(p + 42, true),
      name = td.decode(u8.slice(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name))
      continue;
    const ls = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true),
      data = u8.slice(ls, ls + csize);
    out[name] = td.decode(
      method === 0
        ? data
        : await new Response(
            new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
          ).arrayBuffer(),
    );
  }
  return out;
}
async function readXlsx(buf) {
  const f = await unzip(buf),
    dp = new DOMParser(),
    xml = (s) => dp.parseFromString(s, 'application/xml'),
    all = (d, t) => [...d.getElementsByTagNameNS('*', t)];
  const ss = f['xl/sharedStrings.xml']
    ? all(xml(f['xl/sharedStrings.xml']), 'si').map((si) =>
        all(si, 't')
          .map((t) => t.textContent)
          .join(''),
      )
    : [];
  const wb = xml(f['xl/workbook.xml'] || '<a/>'),
    rels = xml(f['xl/_rels/workbook.xml.rels'] || '<a/>'),
    relMap = {};
  all(rels, 'Relationship').forEach((r) => {
    relMap[r.getAttribute('Id')] = r.getAttribute('Target');
  });
  let sheets = all(wb, 'sheet')
    .map((s) => {
      const id =
          s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ||
          s.getAttribute('r:id'),
        t = (relMap[id] || '').replace(/^\/?(xl\/)?/, '');
      return { name: s.getAttribute('name'), path: 'xl/' + t };
    })
    .filter((s) => f[s.path]);
  if (!sheets.length)
    sheets = Object.keys(f)
      .filter((k) => k.startsWith('xl/worksheets/'))
      .sort()
      .map((k, i) => ({ name: 'Planilha ' + (i + 1), path: k }));
  const col = (r) => {
    let n = 0;
    for (const ch of r.replace(/\d/g, '')) n = n * 26 + ch.charCodeAt(0) - 64;
    return n - 1;
  };
  return sheets.map((s) => {
    const rows = [];
    all(xml(f[s.path]), 'row').forEach((r) => {
      const arr = [];
      all(r, 'c').forEach((c) => {
        const t = c.getAttribute('t'),
          v = all(c, 'v')[0],
          val =
            t === 's'
              ? ss[+(v && v.textContent)]
              : t === 'inlineStr'
                ? all(c, 't')
                    .map((x) => x.textContent)
                    .join('')
                : v
                  ? v.textContent
                  : '';
        arr[col(c.getAttribute('r'))] = val == null ? '' : val;
      });
      rows.push([...arr].map((x) => (x == null ? '' : x)));
    });
    return { name: s.name, rows };
  });
}
/* departamento (ex.: da folha de pagamento) -> setor + posto */
const DEPT_MAP = [
  [/frente|caixa/, 'frente-caixa', 'caixa'],
  [/pacote/, 'frente-caixa', 'pacote'],
  [/fiscal/, 'frente-caixa', 'fiscal'],
  [/recepc/, 'frente-caixa', 'recepcao'],
  [/repositor.*frios/, 'acougue-frios', 'repositorfrios'],
  [/acougue/, 'acougue-frios', 'acougue'],
  [/frios/, 'acougue-frios', 'frios'],
  [/producao/, 'padaria', 'producao'],
  [/atendimento/, 'padaria', 'atendimento'],
  [/padaria/, 'padaria', null],
  [/etiqueta/, 'loja-deposito', 'trocaetiqueta'],
  [/cartaz/, 'loja-deposito', 'cartaz'],
  [/reposic/, 'loja-deposito', 'reposicao'],
  [/deposito/, 'loja-deposito', 'deposito'],
  [/limpeza/, 'loja-deposito', 'limpeza'],
  [/flv|horti|fruit|hortifruti/, 'horti-fruit', 'equipe'],
  [/administrativ|geral|escritorio|loja/, 'loja-deposito', null],
];
function mapDept(t) {
  const n = normTxt(t);
  if (!n) return null;
  const m = DEPT_MAP.find((d) => d[0].test(n));
  return m ? { sec: m[1], post: m[2] } : null;
}
function nomeBonito(n) {
  n = String(n).trim().replace(/\s+/g, ' ');
  if (n !== n.toUpperCase()) return n;
  return n
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && /^(de|da|do|das|dos|e)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
function planilhaParaLista(sheets) {
  const bySector = {},
    warn = [],
    cur = state.selectedSector;
  sheets.forEach((sh) => {
    let rows = sh.rows.filter((r) => r.some((c) => String(c).trim()));
    if (!rows.length) return;
    /* o cabeçalho pode não estar na 1ª linha (ex.: "Empresa: ..." no topo) */
    const hi = rows
      .slice(0, 10)
      .findIndex((r) => r.some((c) => /^(nome|colaborador|colaboradora|funcionario|funcionaria)s?$/.test(normTxt(c))));
    const hasHead = hi >= 0 || rows[0].some((c) => /setor|posto|departamento/.test(normTxt(c)));
    const hr = Math.max(0, hi),
      head = (rows[hr] || []).map(normTxt),
      find = (re) => head.findIndex((h) => re.test(h));
    const ci = {
      name: hasHead ? find(/^(nome|colaborador|funcionario)/) : 0,
      sector: hasHead ? find(/setor|secao|departamento/) : 1,
      post: hasHead ? find(/posto|funcao|cargo/) : 2,
      restr: hasHead ? find(/restri|estudante|mae/) : -1,
    };
    if (hasHead && ci.name < 0) ci.name = 0;
    const fallback = mapSector(sh.name) || cur;
    rows.slice(hasHead ? hr + 1 : 0).forEach((r) => {
      const name = nomeBonito(r[ci.name] || '');
      if (!name || /^\d/.test(name) || /^(total|empresa)\b/i.test(name)) return;
      const secTxt = ci.sector >= 0 ? String(r[ci.sector] || '').trim() : '',
        postTxt = ci.post >= 0 ? String(r[ci.post] || '').trim() : '';
      let sec = null,
        post = null;
      const dep = secTxt ? mapDept(secTxt) : null;
      if (dep) {
        sec = dep.sec;
        if (dep.post && postosDoSetor(sec).includes(dep.post)) post = { station: dep.post };
      } else if (secTxt) {
        sec = mapSector(secTxt);
        if (!sec) {
          warn.push(name + ': setor "' + secTxt + '" não reconhecido (ignorada)');
          return;
        }
      } else sec = fallback;
      if (postTxt) {
        const m = mapPost(sec, postTxt);
        if (m) post = m;
        else warn.push(name + ': posto "' + postTxt + '" não existe em ' + SECTORS[sec] + ' (usei o padrão)');
      } else if (!post && sec === 'frente-caixa') post = { station: 'caixa', pdv: 0 };
      const rs = ci.restr >= 0 ? /^(s|sim|x|1|estudante|mae|true)/.test(normTxt(r[ci.restr])) : false;
      if (!secTxt && ci.sector >= 0) warn.push(name + ': sem departamento (colocada em ' + SECTORS[sec] + ')');
      (bySector[sec] = bySector[sec] || []).push({ name, post, restricted: rs });
    });
  });
  return { bySector, warn };
}
function aplicarPlanilha(res) {
  const orig = state.selectedSector,
    secs = Object.keys(res.bySector);
  secs.forEach((sec) => {
    state.selectedSector = sec;
    const L = res.bySector[sec].slice(0, 50),
      weeks = sector().weeks,
      n = L.length;
    state.undo = {
      ...(state.undo || {}),
      [sec]: {
        at: new Date().toISOString(),
        weeks: clone(weeks),
        roster: clone((state.roster && state.roster[sec]) || []),
      },
    };
    weeks.forEach((w) => {
      w.activeCount = n;
      w.employees = (w.employees || []).slice(0, n);
      normalizeWeek(w);
      w.rotation = rotation(n, w.shifts.length);
    });
    state.roster = state.roster || {};
    state.roster[sec] = L.map((x, i) => ({
      name: x.name,
      restricted: x.restricted,
      station: x.post ? x.post.station : stationOk(null, i + 1),
    }));
    weeks.forEach((w) =>
      w.employees.forEach((e, i) => {
        const x = L[i];
        e.name = x.name;
        e.restricted = x.restricted;
        if (x.post) {
          e.station = x.post.station;
          if (x.post.station === 'caixa' && x.post.pdv) e.pdv = Math.min(w.pdvCount, x.post.pdv);
        }
      }),
    );
    normalize();
  });
  state.selectedSector = secs.includes(orig) ? orig : secs[0];
  state.selectedWeek = 0;
  const msg =
    'Planilha importada: ' +
    secs.map((s) => SECTORS[s] + ' (' + res.bySector[s].length + ')').join(', ') +
    '. Nomes, setor, posto e restrição foram aplicados nas 4 semanas. Use "Sugerir folgas" ou "Gerar" para montar a escala; dá para desfazer na aba Gerar.' +
    (res.warn.length ? ' Avisos: ' + res.warn.slice(0, 5).join('; ') + (res.warn.length > 5 ? '…' : '') + '.' : '');
  state.notice = msg;
  render();
  toast('Planilha importada.', true);
}
async function importarPlanilha(file) {
  try {
    let sheets;
    if (/\.csv$/i.test(file.name)) {
      const b = await file.arrayBuffer();
      let t;
      try {
        t = new TextDecoder('utf-8', { fatal: true }).decode(b);
      } catch (_) {
        t = new TextDecoder('windows-1252').decode(b);
      }
      sheets = [{ name: '', rows: parseCsv(t.replace(/^﻿/, '')) }];
    } else if (/\.xlsx$/i.test(file.name)) sheets = await readXlsx(await file.arrayBuffer());
    else {
      toast('Use um arquivo .xlsx ou .csv (se for .xls, salve como .xlsx).');
      return;
    }
    const res = planilhaParaLista(sheets),
      secs = Object.keys(res.bySector);
    if (!secs.length) {
      toast('Não encontrei colaboradoras na planilha. Use as colunas Nome, Setor e Posto.');
      return;
    }
    if (
      !(await askConfirm(
        'Importar ' +
          secs.map((s) => res.bySector[s].length + ' em ' + SECTORS[s]).join(', ') +
          '?\n\nIsso substitui nomes, quantidade, postos e restrições desses setores nas 4 semanas (turnos, folgas e domingos de quem já existe ficam por ordem). Você pode desfazer depois na aba Gerar.' +
          (res.warn.length ? '\n\nAvisos:\n- ' + res.warn.slice(0, 6).join('\n- ') : ''),
      ))
    )
      return;
    aplicarPlanilha(res);
  } catch (err) {
    console.error(err);
    toast('Não consegui ler a planilha. Confira se é um .xlsx ou .csv válido.');
  }
}
async function baixarModelo() {
  const rows = [
      ['Nome', 'Setor', 'Posto', 'Estudante/Mãe (sim ou vazio)'],
      ['Maria Souza', 'Frente de Caixa', 'Operadora Caixa', ''],
      ['Ana Lima', 'Frente de Caixa', 'Fiscal', ''],
      ['João Silva', 'Açougue e Frios', 'Frios', ''],
      ['Paula Reis', 'Padaria', 'Limpeza', 'sim'],
    ],
    text = '\uFEFF' + rows.map((r) => r.join(';')).join('\r\n');
  try {
    const d = window.claude && claude.use ? await claude.use('downloads') : null;
    if (d) {
      await d.save({ filename: 'modelo-colaboradoras.csv', data: text });
      return;
    }
  } catch (err) {
    if (err && err.code === 'declined') return;
  }
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' }),
    a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'modelo-colaboradoras.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
document.addEventListener('change', (e) => {
  if (e.target.id === 'xlsxFile' && e.target.files[0]) {
    if (/\.(txt|afd)$/i.test(e.target.files[0].name) && window.afdImportar) window.afdImportar(e.target.files[0]);
    else importarPlanilha(e.target.files[0]);
    e.target.value = '';
  }
});
document.addEventListener('click', (e) => {
  if (e.target.closest('#modelButton')) baixarModelo();
});
/* ===== análise de folgas: cobertura por dia, turno e posto, e o que acontece se mais 1 folgar ===== */
/* ===== resumo do ciclo (4 semanas) por colaboradora: domingos, folgas, dias e horas ===== */
function resumoCiclo() {
  const weeks = sector().weeks,
    n = weeks[0].employees.length;
  return Array.from({ length: n }, (_, i) => {
    const r = { name: weeks[0].employees[i].name, domT: 0, domF: 0, folgas: 0, dias: 0, min: 0, aus: 0, ausDom: 0, seq: 0 };
    let run = 0;
    weeks.forEach((w, wi) => {
      const e = w.employees[i];
      if (!e) return;
      DAYS.forEach((d) => {
        const a = ausente(e, d[0], wi),
          t = worksOn(e, d[0], wi);
        if (a) {
          r.aus++;
          if (d[0] === 'domingo') r.ausDom++;
        }
        else if (d[0] === 'domingo') t ? r.domT++ : closedDay('domingo', wi) || r.domF++;
        else if (e.offDays.includes(d[0]) && !closedDay(d[0], wi)) r.folgas++;
        if (t) {
          r.dias++;
          run++;
          r.seq = Math.max(r.seq, run);
        } else run = 0;
      });
      r.min += weekMin(e, w, wi);
    });
    return r;
  });
}
function renderResumo() {
  const el = document.getElementById('resumoCiclo');
  if (!el) return;
  const L = resumoCiclo(),
    six = week().model === '6x1',
    lim = six ? 7 : 6;
  const rows = L.map(
    (r) =>
      `<tr><th class="oa-row">${escape(r.name)}</th><td data-label="Domingos trabalhados">${r.domT}</td><td data-label="Domingos de folga" class="${r.domF + r.ausDom < 2 ? 'oa-bad' : ''}">${r.domF}</td><td data-label="Folgas na semana">${r.folgas}</td><td data-label="Dias trabalhados">${r.dias}</td><td data-label="Horas no ciclo">${hm(r.min)}</td><td data-label="Média por semana">${hm(Math.round(r.min / 4))}</td><td data-label="Maior sequência (dias)" class="${r.seq > lim ? 'oa-bad' : ''}">${r.seq}</td><td data-label="Férias / atestado">${r.aus || '—'}</td></tr>`,
  ).join('');
  el.innerHTML = `<div class="section-heading"><div><p class="eyebrow">RESUMO DO CICLO</p><h2>Resumo por colaboradora</h2><p>${short(date('domingo', 0))} a ${short(date('sábado', 3))} · 4 semanas de ${SECTORS[state.selectedSector]}. Em vermelho: menos de 2 domingos de folga no mês ou mais de ${lim} dias seguidos de trabalho.</p></div></div><div class="table-wrap"><table class="oa-table resumo-table"><thead><tr><th>Colaboradora</th><th>Domingos trabalhados</th><th>Domingos de folga</th><th>Folgas na semana</th><th>Dias trabalhados</th><th>Horas no ciclo</th><th>Média por semana</th><th>Maior sequência (dias)</th><th>Dias de férias / atestado</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderOffAnalysis() {
  const el = document.getElementById('offAnalysis');
  if (!el) return;
  const w = week(),
    wi = state.selectedWeek,
    emps = w.employees.filter((e) => !foraSemana(e, wi)),
    N = emps.length;
  const works = (e, d) => worksOn(e, d[0], wi),
    closed = (d) => closedDay(d[0], wi);
  const cls = (n) => (n <= 1 ? 'crit' : n === 2 ? 'warn' : 'ok');
  /* a célula mostra a QUANTIDADE DE FOLGAS do grupo naquele dia (e quantas trabalham); a cor segue quem trabalha */
  const cell = (mem, d, attrs) => {
    if (closed(d)) return '<td class="oa-closed">Fechado</td>';
    if (!mem.length) return '<td class="oa-closed">—</td>';
    const trab = mem.filter((e) => works(e, d)).length,
      off = mem.length - trab;
    return `<td class="oa-${cls(trab)}"><b>${off}</b><small>${trab} trabalhando</small>${modoAjuste && attrs && d[0] !== 'domingo' ? ctlBtns(attrs, true) : ''}</td>`;
  };
  const dayHead = '<th></th>' + DAYS.map((d) => `<th>${d[1]}<small>${short(date(d[0]))}</small></th>`).join('');
  const total = DAYS.map((d) => (closed(d) ? null : emps.filter((e) => works(e, d)).length));
  const offN = DAYS.map((d, i) => (total[i] === null ? null : N - total[i]));
  const movRow = `<tr><th class="oa-row">Movimento esperado<small>editável em Gerar</small></th>${DAYS.map((d) => `<td class="oa-mov oa-mov-${movement()[d[0]]}">${movLabel(d[0])}</td>`).join('')}</tr>`;
  const totalRow = `<tr class="oa-total"><th class="oa-row">Total<small>${N} colab.</small></th>${DAYS.map((d, i) => (closed(d) ? '<td class="oa-closed">Fechado</td>' : `<td class="oa-${total[i] < Math.ceil(N * 0.5) ? 'warn' : 'ok'}"><b>${total[i]}</b><small>${offN[i]} de folga</small></td>`)).join('')}</tr>`;
  // por posto
  const posts = hasPosts()
    ? postKeys()
        .map((k) => ({ k, mem: emps.filter((e) => e.station === k) }))
        .filter((p) => p.mem.length)
    : [];
  const grpAttrs = (g, d) => `data-oa="dia" data-g="${g}" data-day="${d[0]}"`;
  const linhaTurno = (mem, s, i, rotulo, g) =>
    `<tr><th class="oa-row"><i class="shift-pill" style="background:${s.color}"></i>${rotulo}<small>${s.name} · ${s.start}–${s.end} · ${mem.length} colab.</small></th>${DAYS.map((d) => cell(mem, d, grpAttrs(g, d))).join('')}</tr>`;
  const unified = posts.length
    ? posts
        .map((q) => {
          const rows = w.shifts.map((s, i) => linhaTurno(q.mem.filter((e) => e.shift === i), s, i, escape(POST_NAMES[q.k]), 'pt:' + q.k + ':' + i)).join('');
          const tot = `<tr class="oa-subtotal"><th class="oa-row">${escape(POST_NAMES[q.k])} · todos os turnos<small>${q.mem.length} colab.</small></th>${DAYS.map((d) => cell(q.mem, d, grpAttrs('p:' + q.k, d))).join('')}</tr>`;
          return `<tr class="oa-grp"><th colspan="8">${escape(POST_NAMES[q.k])}</th></tr>` + rows + tot;
        })
        .join('')
    : w.shifts.map((s, i) => linhaTurno(emps.filter((e) => e.shift === i), s, i, escape(s.name), 't:' + i)).join('');
  // quem folga
  const whoRows = DAYS.map((d, i) => {
    if (closed(d)) return `<tr><th class="oa-row">${d[1]} ${short(date(d[0]))}</th><td>Fechado (feriado)</td></tr>`;
    const off = emps.filter((e) => !works(e, d));
    return `<tr><th class="oa-row">${d[1]} ${short(date(d[0]))}<small>${off.length} de folga</small></th><td>${off.length ? off.map((e) => escape(e.name) + (hasPosts() ? ' <small>(' + escape(POST_NAMES[e.station] || '') + ')</small>' : '')).join(', ') : '—'}</td></tr>`;
  }).join('');
  // observações
  const obs = [],
    weekdays = DAYS.map((d, i) => ({ d, i })).filter((x) => x.d[0] !== 'domingo' && total[x.i] !== null);
  if (weekdays.length) {
    const mn = weekdays.reduce((a, b) => (total[b.i] < total[a.i] ? b : a)),
      mx = weekdays.reduce((a, b) => (total[b.i] > total[a.i] ? b : a));
    obs.push(
      `Dia com menos gente: <b>${mn.d[0]}</b> (${total[mn.i]} trabalhando, ${offN[mn.i]} de folga). Dia com mais gente: <b>${mx.d[0]}</b> (${total[mx.i]}).`,
    );
    if (total[mx.i] - total[mn.i] > 2)
      obs.push(
        `As folgas estão desiguais: <b>${mn.d[0]}</b> tem ${total[mx.i] - total[mn.i]} pessoas a menos que <b>${mx.d[0]}</b>. Mover uma folga de ${mn.d[0]} para ${mx.d[0]} equilibra a semana.`,
      );
    const lowShare = weekdays.filter((x) => offN[x.i] > N / 3);
    if (lowShare.length)
      obs.push(
        `Mais de um terço da equipe folga em: ${lowShare.map((x) => x.d[0] + ' (' + offN[x.i] + ')').join(', ')}.`,
      );
  }
  const SAB = DAYS.find((d) => d[0] === 'sábado'),
    sat = emps.filter((e) => !works(e, SAB));
  if (!closed(SAB)) obs.push(`Folgas no sábado: <b>${sat.length}</b> de ${N}${evitaSabado() ? ' (o ideal é evitar o sábado)' : ''}.`);
  const si = DAYS.findIndex((d) => d[0] === "domingo");
  if (total[si] !== null) {
    const mn = sundayMin() || 0;
    obs.push(
      `Domingo: <b>${total[si]}</b> colaboradora(s) trabalhando` +
        (mn ? ` (mínimo sugerido ${mn})` : '') +
        `.${total[si] < mn ? ' <b>Abaixo do mínimo.</b>' : ''}`,
    );
  }
  posts.forEach((p) => {
    if (p.mem.length === 1)
      obs.push(`<b>${POST_NAMES[p.k]}</b> tem só 1 colaboradora: na folga dela o posto fica sem ninguém.`);
    else {
      const low = DAYS.filter(
        (d) => !closed(d) && d[0] !== 'domingo' && p.mem.filter((e) => works(e, d)).length <= 1,
      ).map((d) => d[0]);
      if (low.length) obs.push(`<b>${POST_NAMES[p.k]}</b> fica com 1 ou nenhuma pessoa em: ${low.join(', ')}.`);
    }
  });
  w.shifts.forEach((s, i) => {
    const mem = emps.filter((e) => e.shift === i),
      low = DAYS.filter(
        (d) => !closed(d) && d[0] !== 'domingo' && mem.length && mem.filter((e) => works(e, d)).length <= 1,
      ).map((d) => d[0]);
    if (low.length) obs.push(`${escape(s.name)} fica com 1 ou nenhuma pessoa em: ${low.join(', ')}.`);
  });
  const perPerson = emps.filter((e) => !ausSemana(e, wi) && (w.model === '5x2' ? effOff(e).length !== 2 : effOff(e).length < 1)).length;
  if (perPerson) obs.push(`${perPerson} colaboradora(s) sem a quantidade de folgas do modelo ${w.model}.`);
  // conferência: cada colaboradora tem 2 folgas por semana no 5x2 (o domingo não trabalhado conta como folga)
  const per = emps.map((e) => ({
    e,
    n: DAYS.filter((d) => !closed(d) && !works(e, d)).length,
    hol: DAYS.filter((d) => closed(d)).length,
  }));
  const sumOff = per.reduce((t, x) => t + x.n, 0),
    expected = w.model === '5x2' ? 2 : null;
  const holN = DAYS.filter((d) => closed(d)).length;
  if (expected) {
    const bad = per.filter((x) => x.n !== expected);
    obs.push(
      `Conferência: ${N} colaboradoras × 2 folgas = <b>${2 * N}</b>; a soma das folgas da semana é <b>${sumOff}</b>.` +
        (sumOff === 2 * N && !bad.length ? ' Está certo (o domingo não trabalhado conta como uma das 2 folgas).' : '') +
        (bad.length ? ' Fora do padrão: ' + bad.map((x) => escape(x.e.name) + ' (' + x.n + ')').join(', ') + '.' : '') +
        (holN ? ' Feriado com loja fechada não entra nessa conta.' : ''),
    );
  } else {
    const bad = per.filter((x) => x.n !== 1);
    obs.push(
      `Conferência (6x1): cada semana (domingo a sábado) tem 1 folga por colaboradora; a soma das folgas desta semana é <b>${sumOff}</b> de ${N} esperadas (quem trabalha no domingo folga 1 dia útil; quem não trabalha tem o domingo como folga) .`.replace(' .', '.') +
        (bad.length ? ' Fora do padrão: ' + bad.map((x) => escape(x.e.name) + ' (' + x.n + ')').join(', ') + '.' : ''),
    );
  }
  if (w.model === '6x1')
    obs.push(
      '6x1 com a semana de domingo a sábado: cada semana tem 1 folga. Quem trabalha o domingo folga 1 dia útil; quem não trabalha, o domingo já é a folga. Na emenda entre semanas pode passar de 6 dias seguidos de trabalho; quando acontecer, o aviso aparece em Conformidade.',
    );
  if (!obs.length) obs.push('Sem pontos de atenção nesta semana.');
  el.innerHTML = `<div class="section-heading"><div><p class="eyebrow">ANÁLISE DE FOLGAS · SEMANA ${wi + 1}</p><h2>Quantidade de folgas por turno e posto</h2><p>Cada linha é um posto em um turno e mostra quantas colaboradoras estão de <b>folga</b> em cada dia (embaixo, quantas trabalham). Verde: 3 ou mais trabalhando; amarelo: 2; vermelho: 0 ou 1.</p></div><div class="op-head-actions"><button type="button" class="button ${modoAjuste ? 'secondary' : 'outline'} adj-toggle" data-ajuste>${modoAjuste ? 'Ajuste ligado: use + e − nas células' : 'Ajustar escala por aqui'}</button><button class="button outline" id="toggleOff" type="button" aria-expanded="true">Recolher configuração ▴</button></div></div>
  ${modoAjuste ? '<p class="oa-dica">Modo ajuste: <b>+</b> coloca mais 1 folga naquele dia (uma pessoa que trabalhava passa a folgar e vai trabalhar no dia mais vazio) e <b>−</b> tira 1 folga (uma pessoa que folgava passa a trabalhar e a folga dela vai para o dia com mais gente). Em "Pessoas por posto e turno" o mesmo vale para os turnos e refaz o rodízio das 4 semanas. Se a mudança quebrar uma regra, ela não é aplicada e aparece um erro em vermelho.</p>' : ''}
  <div class="oa-obs"><h3>Pontos de atenção</h3><ul>${obs.map((o) => '<li>' + o + '</li>').join('')}</ul></div>
  <h3 class="oa-title">Folgas por dia, posto e turno</h3><div class="table-wrap"><table class="oa-table oa-unif"><thead><tr>${dayHead}</tr></thead><tbody>${movRow}${unified}${totalRow}</tbody></table></div>
  ${posts.length ? `<h3 class="oa-title">Pessoas por posto e turno</h3><div class="table-wrap"><table class="oa-table oa-turnos"><thead><tr><th></th>${w.shifts.map((s) => `<th>${escape(s.name)}<small>${s.start}</small></th>`).join('')}<th>Total</th></tr></thead><tbody>${posts.map((q) => `<tr><th class="oa-row">${POST_NAMES[q.k]}<small>${q.mem.length} colab.</small></th>${w.shifts.map((s, i) => { const n = q.mem.filter((e) => e.shift === i).length; return `<td class="oa-${n ? 'ok' : 'warn'}"><b>${n}</b>${q.k === 'caixa' && hasPdv() ? `<small>máx. ${activePdvs(w).length} (PDVs)</small>` : ''}${modoAjuste ? ctlBtns(`data-oa="turno" data-post="${q.k}" data-turno="${i}"`) : ''}</td>`; }).join('')}<td><b>${q.mem.length}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
  <h3 class="oa-title">Quem está de folga em cada dia</h3><div class="table-wrap"><table class="oa-table oa-who"><tbody>${whoRows}</tbody></table></div>`;
}
function loadInfo() {
  const row = (m) =>
    `<li${week().model === m ? ' class="current"' : ''}><strong>${m}</strong>: ${hm(workDuration(m))} por dia · ${hm(workDuration(m) * (m === '6x1' ? 6 : 5))} por semana</li>`;
  return `<div class="load-info"><strong>Carga horária obrigatória (limite semanal hoje: ${weeklyLimit()}h)</strong><ul>${row('5x2')}${row('6x1')}</ul><p class="helper">${autoSaida(week()) ? 'A saída é calculada (entrada + carga' + (autoAlmoco(week()) ? ' + 2h de almoço' : '') + ') para nunca ficar abaixo da carga. ' : ''}Hora extra: no máximo 1h30 por dia, em qualquer modelo.</p></div>`;
}
function sundayConflict(e) {
  const ws = sector().weeks,
    i = state.selectedWeek;
  for (const k of [i - 1, i + 1]) {
    const o = ws[k] && ws[k].employees[e.id - 1];
    if (o && o.sundayWork) return k;
  }
  return -1;
}
let toastTimer,
  toastEm = 0,
  toastErroEm = 0;
function toast(msg, ok) {
  /* o balão vermelho de erro prevalece: uma confirmação verde que chegue logo depois não o substitui */
  if (ok && Date.now() - toastErroEm < 1500) return;
  toastEm = Date.now();
  if (!ok) toastErroEm = toastEm;
  const t = document.getElementById('toast');
  t.style.background = ok ? '#14845a' : '';
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => {
      t.hidden = true;
    },
    ok ? 7000 : 10000,
  );
}
/* ===== v9: conformidade CLT, EC 141/2026 e CCT dos mercados de Campo Mourão ===== */
const HOL = {};
function easterDate(y) {
  const a = y % 19,
    b = Math.floor(y / 100),
    c = y % 100,
    dd = Math.floor(b / 4),
    ee = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - dd - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * ee + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day, 12);
}
function holidays(y) {
  if (HOL[y]) return HOL[y];
  const m = {},
    add = (mo, d, name, closed) => {
      m[y + '-' + pad(mo) + '-' + pad(d)] = { name, closed: !!closed };
    };
  add(1, 1, 'Ano-Novo', 1);
  add(4, 21, 'Tiradentes');
  add(5, 1, 'Dia do Trabalhador', 1);
  add(9, 7, 'Independência');
  add(10, 12, 'N. Sra. Aparecida');
  add(11, 2, 'Finados');
  add(11, 15, 'Proclamação da República');
  add(11, 20, 'Consciência Negra');
  add(12, 19, 'Emancipação do Paraná');
  add(12, 25, 'Natal', 1);
  const easter = easterDate(y),
    shiftDate = (n) => {
      const t = new Date(easter);
      t.setDate(t.getDate() + n);
      return t;
    };
  m[iso(shiftDate(-2))] = { name: 'Sexta-feira Santa', closed: false };
  m[iso(easter)] = { name: 'Páscoa', closed: true };
  return (HOL[y] = m);
}
function extraHoliday(d) {
  for (const l of String(state.settings.extraText || '')
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean)) {
    const m = l.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!m) continue;
    let y = m[3] ? +m[3] : 0;
    if (y && y < 100) y += 2000;
    if (+m[1] === d.getDate() && +m[2] === d.getMonth() + 1 && (!y || y === d.getFullYear()))
      return { name: 'Feriado cadastrado', closed: false };
  }
  return null;
}
const holiday = (d) => holidays(d.getFullYear())[iso(d)] || extraHoliday(d);
const closedDay = (key, idx = state.selectedWeek) => !!holiday(date(key, idx))?.closed;
const holidayTag = (key, idx = state.selectedWeek) => {
  const h = holiday(date(key, idx));
  return h ? `<small class="holiday-tag">${escape(h.name)}${h.closed ? ' · fechado' : ''}</small>` : '';
};
const hm = (n) => Math.floor(n / 60) + 'h' + (n % 60 ? pad(n % 60) : '');
const worksOn = (e, key, wi = state.selectedWeek) =>
  !closedDay(key, wi) && !ausente(e, key, wi) && (key === 'domingo' ? e.sundayWork : !e.offDays.includes(key));
const NATAL_COMP = ['2026-12-26', '2027-01-02', '2027-02-08', '2027-02-09'];

function compliance() {
  const out = [],
    S = state.settings,
    weeks = sector().weeks,
    all = weeks.map((_, i) => i);
  const add = (level, text, wk, fix) => out.push({ level, text, weeks: wk, fix });
  if (mins(S.weekClose) > 1320)
    add(
      'atenção',
      'Fechamento de segunda a sábado após 22h: acima do horário permitido aos mercados pela CCT (8h às 22h).',
      [],
    );
  if (mins(S.sundayClose) > 1080)
    add(
      'atenção',
      'Fechamento aos domingos após 18h: acima do horário permitido aos mercados pela CCT (8h às 18h).',
      [],
    );
  weeks.forEach((w, wi) => {
    const L = 'Semana ' + (wi + 1) + ': ',
      dur = workDuration(w.model, wi),
      limit = weeklyLimit(wi);
    if (w.model === '6x1' && limit < 44)
      add(
        'atenção',
        L +
          'o modelo 6x1 não garante os 2 dias de descanso semanal da EC 141/2026 (em vigor desde 16/12/2026); só é admitido com compensação prevista em norma coletiva. Prefira 5x2.',
        [wi],
      );
    w.employees.forEach((e) => {
      const m = weekMin(e, w, wi);
      if (m > limit * 60)
        add('erro', L + e.name + ': carga semanal de ' + hm(m) + ' acima do limite de ' + limit + 'h.', [wi]);
    });
    const buraco = gapOf(w);
    if (buraco)
      add('erro', L + 'das ' + time(buraco[0]) + ' às ' + time(buraco[1]) + ' nenhum turno está trabalhando (almoços coincidem). Deixe o almoço de um turno quando o outro voltar.', [wi], 'almoco');
    w.shifts.forEach((s) => {
      const startM = mins(s.start),
        before = mins(s.lunchStart) - startM,
        after = dur - before,
        endAbs = startM + dur + 120,
        nm = s.name + ' (' + s.start + ')';
      if (before <= 0 || after <= 0)
        add('erro', L + nm + ': o horário de almoço precisa ficar entre a entrada e a saída.', [wi], 'almoco');
      else {
        if (before > 360)
          add('erro', L + nm + ': mais de 6h seguidas de trabalho antes do almoço (art. 71 da CLT exige intervalo).', [
            wi,
          ], 'almoco');
        if (after > 360)
          add('erro', L + nm + ': mais de 6h seguidas de trabalho depois do almoço (art. 71 da CLT).', [wi], 'almoco');
      }
      if (endAbs > closeMin() + TOL_FECH)
        add(
          'erro',
          L + nm + ': a jornada termina às ' + s.end + ', depois do fechamento (' + S.weekClose + '); a colaboradora ficaria devendo ' + hm(endAbs - closeMin()) + ' de carga. Entrada máxima: ' + time(maxStart(w.model, wi)) + '.',
          [wi],
          'fechamento',
        );
      if (endAbs > 1320)
        add(
          'atenção',
          L +
            nm +
            ': a jornada termina às ' +
            s.end +
            ', após 22h — há adicional noturno (art. 73 da CLT) e o horário excede o limite dos mercados na CCT.',
          [wi],
        );
      if (startM < 300)
        add('atenção', L + nm + ': a jornada começa antes das 5h — há adicional noturno (art. 73 da CLT).', [wi]);
      const names = w.employees.filter((e) => e.restricted && e.shift === w.shifts.indexOf(s)).map((e) => e.name);
      if (endAbs > 1080 && names.length)
        add(
          'erro',
          L +
            names.join(', ') +
            ' (estudante/mãe com restrição) escalada até ' +
            s.end +
            '; a CCT protege contra escala após 18h.',
          [wi],
          'restritas',
        );
    });
    DAYS.forEach((d) => {
      const h = holiday(date(d[0], wi));
      if (!h) return;
      const when = short(date(d[0], wi));
      if (h.closed) {
        add(
          'info',
          L +
            h.name +
            ' (' +
            when +
            '): comércio fechado (CCT dos mercados) — folga automática para todas, sem descontar das folgas obrigatórias.',
          [wi],
        );
        return;
      }
      const n = w.employees.filter((e) => worksOn(e, d[0], wi)).length;
      if (!n) return;
      add(
        'info',
        L +
          h.name +
          ' (' +
          when +
          '): ' +
          n +
          ' escalada' +
          (n === 1 ? '' : 's') +
          '. Trabalho em feriado nos mercados: horas com acréscimo de 100% (CCT).',
        [wi],
      );
    });
    if (noSameOff().length) {
      const grp = w.employees.filter((e) => noSameOff().includes(e.station));
      const clash = [];
      if (grp.length >= 2)
        DAYS.forEach((d) => {
          if (d[0] === 'domingo' || closedDay(d[0], wi)) return;
          const off = grp.filter((e) => e.offDays.includes(d[0]));
          if (off.length > 1) clash.push(d[0] + ' (' + off.map((e) => e.name + ' · ' + POST_NAMES[e.station] + (travada(e, d[0], w.model) ? ' 🔒 folga fixa' : '')).join(' e ') + ')');
        });
      if (clash.length)
        add(
          grp.length <= 3 ? 'erro' : 'atenção',
          L +
            noSameOff().map((k) => POST_NAMES[k]).join(' e ') +
            ': mais de uma colaboradora de folga no mesmo dia: ' +
            clash.join('; ') +
            '.' +
            (grp.length > 3 ? ' Com mais de 3 colaboradoras nesses postos, isso pode ser inevitável.' : '')
            + (clash.some((c) => c.includes('🔒')) ? ' Há folga fixa envolvida: desmarque a "Folga fixa" de uma delas para o app poder trocar o dia.' : ''),
          [wi],
          'folgas',
        );
    }
    const sunW = w.employees.filter((e) => e.sundayWork && !closedDay('domingo', wi));
    if (sunW.length) {
      const pl = sundayPlan(w);
      if (pl.len <= 0) add('erro', L + 'domingo: a saída precisa ser depois da entrada.', [wi], 'domingoHora');
      if (pl.brk && pl.work > 600)
        add(
          'erro',
          L + 'domingo: jornada de ' + hm(pl.work) + ' trabalhadas passa do limite de 10h por dia (art. 59 da CLT).',
          [wi],
          'domingoHora',
        );
      if (pl.brk && pl.work > 0 && pl.work < workDuration(w.model, wi))
        add(
          'atenção',
          L +
            'domingo dia todo: ' +
            hm(pl.work) +
            ' trabalhadas, abaixo da carga diária do modelo (' +
            hm(workDuration(w.model, wi)) +
            ').',
          [wi],
        );
      if (!pl.brk && pl.len > 360)
        add('erro', L + 'domingo: mais de 6h seguidas sem intervalo; use o tipo "Dia todo (com almoço)".', [wi], 'domingoHora');
      if (pl.en > mins(S.sundayClose))
        add(
          'atenção',
          L + 'domingo: a jornada termina às ' + time(pl.en) + ', depois do limite de domingo (' + S.sundayClose + ').',
          [wi],
          'domingoHora',
        );
      sundayPosts().forEach((p) => {
        const c = sunW.filter((e) => e.station === p).length,
          mn = sundayPostMin(p);
        if (c === 0)
          add(
            'erro',
            L +
              'domingo sem ' +
              POST_NAMES[p] +
              ': escale pelo menos ' +
              mn +
              ' colaboradora' +
              (mn === 1 ? '' : 's') +
              ' no posto ' +
              POST_NAMES[p] +
              '.',
            [wi],
            'domingo',
          );
        else if (c < mn) add('atenção', L + 'domingo: ' + POST_NAMES[p] + ' com ' + c + ' (mínimo ' + mn + ').', [wi], 'domingo');
      });
      const rs = sunW.filter((e) => e.restricted).map((e) => e.name);
      if (rs.length && pl.en > 1080)
        add(
          'erro',
          L +
            rs.join(', ') +
            ' (estudante/mãe com restrição) escalada no domingo até ' +
            time(pl.en) +
            '; a CCT protege contra escala após 18h.',
          [wi],
        );
    }
    NATAL_COMP.forEach((iso0) => {
      const day = DAYS.find((d) => iso(date(d[0], wi)) === iso0);
      if (day)
        add(
          'info',
          L +
            short(date(day[0], wi)) +
            ': folga integral de compensação natalina para quem trabalhou nas datas natalinas (resumo da CCT na imprensa — confirme no texto assinado).',
          [wi],
        );
    });
  });
  const n = Math.min(...weeks.map((w) => w.employees.length));
  for (let i = 0; i < n; i++) {
    const emps = weeks.map((w) => w.employees[i]),
      name = emps[0].name,
      flags = emps.map((e) => e.sundayWork);
    const offs = flags.filter((f) => !f).length;
    if (offs < 2)
      add(
        'erro',
        name +
          ': só tem ' +
          offs +
          ' domingo' +
          (offs === 1 ? '' : 's') +
          ' de folga nas 4 semanas; a CCT exige no mínimo 2 por mês.',
        all,
      );
    for (let k = 0; k < flags.length - 1; k++)
      if (flags[k] && flags[k + 1])
        add(
          'erro',
          'ALERTA — ' +
            name +
            ' está escalada em dois domingos seguidos (semanas ' +
            (k + 1) +
            ' e ' +
            (k + 2) +
            ', ' +
            short(date('domingo', k)) +
            ' e ' +
            short(date('domingo', k + 1)) +
            '). Não é permitido repetir domingo: a CCT e o art. 386 da CLT pedem revezamento.',
          [k, k + 1],
        );
    let run = 0,
      startDay = 0;
    const seq = [];
    emps.forEach((e, wi) => DAYS.forEach((d) => seq.push(worksOn(e, d[0], wi))));
    seq.forEach((v, di) => {
      if (v) {
        if (!run) startDay = di;
        run++;
      }
      if ((!v || di === seq.length - 1) && run > 6) {
        const endDay = v ? di : di - 1,
          ws = [];
        for (let x = Math.floor(startDay / 7); x <= Math.floor(endDay / 7); x++) ws.push(x);
        add(
          'atenção',
          name +
            ': ' +
            run +
            ' dias seguidos sem descanso (semanas ' +
            (ws[0] + 1) +
            (ws.length > 1 ? ' a ' + (ws[ws.length - 1] + 1) : '') +
            '); o descanso de 24h deve ocorrer ao menos a cada 6 dias (art. 67 da CLT).',
          ws,
        );
      }
      if (!v) run = 0;
    });
  }
  return out;
}
function renderCompliance() {
  const w = week(),
    limit = weeklyLimit(),
    dur = workDuration(w.model),
    days = w.model === '6x1' ? 6 : 5,
    list = compliance(),
    order = { erro: 0, atenção: 1, info: 2 },
    label = { erro: 'Erro', atenção: 'Atenção', info: 'Informação' };
  const phase =
    limit === 44
      ? 'Hoje: 44h semanais e 1 dia de descanso. A partir de 16/12/2026 (EC 141/2026): 42h e 2 dias de descanso; a partir de 16/12/2027: 40h.'
      : limit === 42
        ? 'EC 141/2026 em vigor: limite de 42h semanais e 2 dias de descanso (um, preferencialmente, no domingo). Em 16/12/2027 o limite cai para 40h.'
        : 'EC 141/2026 na fase final: limite de 40h semanais e 2 dias de descanso.';
  const sorted = [...list].sort((a, b) => order[a.level] - order[b.level]),
    errors = list.filter((x) => x.level === 'erro').length;
  const items = sorted.length
    ? sorted
        .map(
          (x) =>
            `<article class="finding ${x.level === 'atenção' ? 'atencao' : x.level}"><span class="finding-level">${label[x.level]}</span><p>${escape(x.text)}</p>${fixBtn(x.fix && { k: x.fix, wi: x.weeks[0] }, x.text)}</article>`,
        )
        .join('')
    : '<p class="empty-alert">Nenhuma pendência encontrada nas quatro semanas deste setor.</p>';
  document.getElementById('compliancePanel').innerHTML =
    `<div class="section-heading"><div><p class="eyebrow">CONFORMIDADE TRABALHISTA</p><h2>CLT, EC 141/2026 e CCT de Campo Mourão</h2><p>${phase}</p></div><span class="tag ${errors ? 'tag-error' : ''}">${errors ? errors + ' erro' + (errors === 1 ? '' : 's') : 'Sem erros'}</span></div>
  <div class="legal-cards"><div><strong>${hm(dur * days)}</strong><span>Jornada semanal do modelo ${w.model} (limite ${limit}h)</span></div><div><strong>${hm(dur)}</strong><span>Jornada diária${dur > 480 ? ' — acima de 8h, exige compensação em norma coletiva (art. 59 da CLT)' : ''}</span></div><div><strong>${neededOff()}</strong><span>Dia${neededOff() === 1 ? '' : 's'} de folga por semana neste modelo</span></div><div><strong>${hm(dur + EXTRA_MAX)}</strong><span>Jornada máxima por dia com até 1h30 de hora extra (limite legal: 10h)</span></div></div>
  ${state.notice ? `<p class="notice-line">${escape(state.notice + (sector().weeks.some((x) => x.model === '6x1') ? SIX_NOTE : ''))}</p>` : ''}
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

document.addEventListener('change', async (event) => {
  const t = event.target,
    w = week();
  /* semana já realizada (conforme o ponto): só altera com confirmação */
  if (w.realizada && semanaReal() && !w.realizadaLiberada && t.closest && t.closest('#scheduleTable,.operator-card,#shiftsEditor') && (t.dataset.employee !== undefined || t.dataset.shift !== undefined || t.dataset.sunday !== undefined || t.dataset.sunToggle !== undefined) && t.dataset.field !== 'name') {
    if (!(await askConfirm('Esta semana já aconteceu (conforme o ponto do relógio). Alterar mesmo assim? O que foi realizado deixa de valer nesta semana.'))) {
      render();
      return;
    }
    w.realizadaLiberada = true;
  }
  if (t.dataset.sunToggle !== undefined) {
    /* chip do domingo: marcada = folga; desmarcar = trabalha (respeita as regras de domingo e recalcula as folgas) */
    const i = +t.dataset.sunToggle;
    if (t.checked) removeSundayWorker(i);
    else addSundayWorker(i);
    render();
    return;
  }
  if (t.id === 'sectorSelect') {
    state.selectedSector = t.value;
    render();
    return;
  }
  if (t.id === 'weekClose' || t.id === 'sundayClose') {
    if (t.value) state.settings[t.id] = t.value;
    let mudou = [];
    if (t.id === 'weekClose' && t.value)
      /* fechamento mais cedo: a entrada dos turnos que passariam do horário é antecipada nas 4 semanas */
      sector().weeks.forEach((x, k) => {
        const m = fitShifts(x, k);
        if (m.length && gapOf(x)) autoLunch(x, k, 0);
        m.forEach((nm) => !mudou.includes(nm) && mudou.push(nm));
      });
    render();
    if (mudou.length)
      toast('Fechamento às ' + state.settings.weekClose + ': entrada antecipada em ' + mudou.join(', ') + ' para ninguém ficar devendo horas. Você pode alterar.', true);
    return;
  }
  if (t.id === 'extraHolidays') {
    state.settings.extraText = t.value;
    render();
    return;
  }
  if (t.dataset.post !== undefined) {
    setPostCfg(t.dataset.post, t.dataset.per, t.value);
    render();
    return;
  }
  if (t.dataset.pshift !== undefined) {
    setPostShift(t.dataset.ppost, +t.dataset.pshift, t.value);
    setTimeout(render, 0);
    return;
  }
  if (t.id === 'postEarly') {
    if (t.value) state.settings.earlyBefore = t.value;
    render();
    return;
  }
  if (t.id === 'rodizioPeriodo') {
    sector().rodizio = t.value;
    render();
    toast('Rodízio ' + t.value + '. Use "Gerar" para refazer as 4 semanas com esse modelo.', true);
    return;
  }
  if (t.id === 'genShifts') {
    state.gen.shifts = t.value;
    render();
    return;
  }
  if (t.id === 'genPdv') {
    state.gen.pdv = t.checked;
    return;
  }
  if (t.id === 'genPosts') {
    state.gen.posts = t.checked;
    return;
  }
  if (t.id === 'weekStart') {
    if (window.afdRealizado) window.afdRealizado.troca(monday(t.value));
    else state.baseMonday = monday(t.value);
    render();
    return;
  }
  if (t.id === 'activeEmployees') {
    setActive(t.value);
    return;
  }
  if (t.id === 'pdvCount') {
    setPdv(t.value);
    return;
  }
  if (t.id === 'shiftCount') {
    setShiftCount(t.value);
    return;
  }
  if (t.id === 'rotationEnabled') {
    w.rotation.enabled = t.checked;
    w.rotation.message = t.checked
      ? 'Rodízio ativado. Configure as quantidades e aplique quando desejar.'
      : 'Rodízio desativado; a escala permanece manual.';
    render();
    return;
  }
  if (t.dataset.rotationCount !== undefined) {
    w.rotation.counts[+t.dataset.rotationCount] = Math.max(0, +t.value || 0);
    w.rotation.message = '';
    render();
    return;
  }
  if (t.dataset.mov !== undefined) {
    const s = sector();
    s.movement = { ...movement(), [t.dataset.mov]: t.value };
    render();
    return;
  }
  if (t.dataset.sunday !== undefined) {
    const sd = w.sunday,
      f = t.dataset.sunday;
    if (f === 'mode') {
      sd.mode = t.value;
      if (t.value === 'meio') {
        sd.start = '07:40';
        sd.end = '12:00';
      } else {
        sd.start = '07:00';
        sd.lunchStart = '11:00';
        sd.end = plus('07:00', workDuration(w.model, state.selectedWeek) + 120);
      }
    } else if (t.value) {
      if (f === 'start' && sd.mode === 'dia') {
        const delta = mins(t.value) - mins(sd.start);
        sd.end = time((mins(sd.end) + delta + 1440) % 1440);
      }
      sd[f] = t.value;
    }
    if (sd.mode === 'dia') {
      const st = mins(sd.start),
        ls = mins(sd.lunchStart),
        c = Math.min(st + 360, Math.max(st + 60, ls));
      if (c !== ls) {
        toast('Almoço do domingo ajustado para ' + time(c) + ': não pode haver mais de 6h seguidas sem intervalo.');
        sd.lunchStart = time(c);
      }
    }
    render();
    return;
  }
  if (t.dataset.autoflag) {
    const k = t.dataset.autoflag;
    snapDesfazer();
    sector().weeks.forEach((x, j) => {
      x[k] = t.checked;
      if (t.checked && k === 'autoSaida') x.shifts.forEach((sh) => sync(sh, x.model, j, x));
      if (t.checked && k === 'autoAlmoco') autoLunch(x, j, 0);
    });
    render();
    toast((k === 'autoAlmoco' ? 'Almoço' : 'Saída') + (t.checked ? ' automático ligado.' : ' automático desligado: edite à mão.'), true);
    return;
  }
  if (t.dataset.shift !== undefined && t.dataset.field === 'end') {
    const s = w.shifts[+t.dataset.shift];
    if (!t.value || mins(t.value) > closeMin() + TOL_FECH) {
      toast('Saída depois de ' + plus(state.settings.weekClose, TOL_FECH) + ' (fechamento + tolerância de ' + TOL_FECH + ' min) não é permitida.');
    } else s.end = t.value;
    render();
    return;
  }
  if (t.dataset.shift !== undefined) {
    const s = w.shifts[+t.dataset.shift],
      f = t.dataset.field,
      dur = workDuration(w.model),
      wi = state.selectedWeek,
      oldStart = s.start;
    if (!t.value) {
      render();
      return;
    }
    /* entrada tarde demais: a jornada passaria do fechamento e a pessoa ficaria devendo horas */
    if (f === 'start' && mins(t.value) > maxStartTol(w.model, wi)) {
      toast(
        'Entrada das ' + t.value + ' não é permitida: com a jornada do ' + w.model + ' (' + hm(dur) + ' + 2h de almoço) o ' + s.name + ' terminaria às ' + plus(t.value, dur + 120) + ', depois do fechamento (' + state.settings.weekClose + '), e a colaboradora ficaria devendo horas. Entrada máxima: ' + time(maxStartTol(w.model, wi)) + ' (já com a tolerância de ' + TOL_FECH + ' min após o fechamento).',
      );
      render();
      return;
    }
    const gap0 = gapOf(w),
      snap = clone({ shifts: w.shifts, employees: w.employees });
    s[f] = t.value;
    let ls = mins(s.lunchStart);
    if (f === 'start') ls += mins(s.start) - mins(oldStart);
    const [lo, hi] = lunchWin(mins(s.start), w.model, wi),
      c = Math.min(hi, Math.max(lo, ls));
    if (c !== ls && f === 'lunchStart')
      toast(
        'Almoço ajustado para ' +
          time(c) +
          ': não pode haver mais de 6h seguidas sem intervalo e a jornada deve cumprir a carga de ' +
          hm(dur) +
          '.',
      );
    s.lunchStart = time(c);
    const endAntes = s.end;
    sync(s, w.model, wi, w);
    if (!autoSaida(w) && f === 'start') s.end = plus(endAntes, mins(s.start) - mins(oldStart));
    if (w.shifts.length === 2 && f === 'lunchStart' && w.shifts.indexOf(s) === 1 && mins(s.lunchStart) < mins(w.shifts[0].lunchEnd) - 5) {
      s.lunchStart = w.shifts[0].lunchEnd;
      toast('Almoço do 2º turno ajustado para ' + s.lunchStart + ': ele só pode sair quando o 1º turno volta do almoço (' + w.shifts[0].lunchEnd + '), para a loja não ficar sem ninguém.');
    }
    s.lunchEnd = plus(s.lunchStart, 120);
    /* os turnos seguintes acompanham o almoço deste (1h de diferença; com 2 turnos, quando o 1º volta) */
    sortShifts(w);
    autoLunch(w, wi, w.shifts.indexOf(s));
    const gap = gapOf(w);
    if (gap && !gap0) {
      w.shifts = snap.shifts;
      w.employees = snap.employees;
      toast(
        'Não é permitido: das ' + time(gap[0]) + ' às ' + time(gap[1]) + ' ficaria sem nenhuma colaboradora trabalhando (todos os turnos em almoço ou sem cobertura). Ajuste o almoço de outro turno antes.',
      );
    }
    render();
    return;
  }
  if (t.dataset.off !== undefined) {
    const e = w.employees[+t.dataset.employee],
      day = t.dataset.off,
      need = offLimit(e);
    if (t.checked && !e.offDays.includes(day)) {
      if (e.offDays.length >= need) {
        t.checked = false;
        toast(
          'Limite de ' +
            need +
            ' folga' +
            (need === 1 ? '' : 's') +
            ' nesta semana (' +
            w.model +
            '). Desmarque outro dia antes.',
        );
        return;
      }
      if (noSameOff().includes(e.station)) {
        const grp = w.employees.filter((x) => noSameOff().includes(x.station)),
          other = grp.find((x) => x !== e && x.offDays.includes(day));
        if (other && grp.length <= 3) {
          t.checked = false;
          toast(
            'Não é permitido: ' +
              other.name +
              ' (' +
              POST_NAMES[other.station] +
              ') já folga ' +
              day +
              '. ' +
              noSameOff().map((k) => POST_NAMES[k]).join(' e ') +
              ' não podem folgar no mesmo dia.',
          );
          return;
        }
      }
      e.offDays = [...e.offDays, day];
    }
    if (!t.checked) e.offDays = e.offDays.filter((x) => x !== day);
    render();
    return;
  }
  if (t.dataset.employee !== undefined) {
    const e = w.employees[+t.dataset.employee],
      f = t.dataset.field;
    if (f === 'name') {
      roster()[+t.dataset.employee].name = t.value.trim() || 'Colaboradora ' + e.id;
      render();
      return;
    }
    if (f === 'restricted') {
      roster()[+t.dataset.employee].restricted = t.checked;
      render();
      return;
    }
    if (f === 'folgaFixa') {
      const rr = roster()[+t.dataset.employee],
        dias = e.offDays.filter((d) => !closedDay(d, state.selectedWeek));
      if (t.checked && !dias.length) {
        t.checked = false;
        toast('Erro: marque primeiro os dias de folga de ' + e.name + '; depois ative "Folga fixa" para travá-los em todas as semanas.');
        return;
      }
      if (t.checked) rr.folgaFixa = dias.slice();
      else delete rr.folgaFixa;
      render();
      toast(
        t.checked
          ? 'Folga de ' + e.name + ' fixada (' + dias.join(', ') + ') em todas as semanas. O gerador não mexe nela; para trocar, desmarque "Folga fixa".'
          : 'Folga de ' + e.name + ' liberada: o gerador pode trocar os dias se for preciso.',
        true,
      );
      return;
    }
    if (f === 'fixo') {
      const rr = roster()[+t.dataset.employee];
      if (t.checked) rr.fixo = e.shift;
      else delete rr.fixo;
      render();
      toast(
        t.checked
          ? e.name + ' ficou fixa no ' + (e.shift + 1) + 'º turno em todas as semanas. Para trocar, desmarque “Turno fixo”.'
          : e.name + ' voltou ao rodízio de turnos.',
        true,
      );
      return;
    }
    if ((f === 'shift' || f === 'station') && t.classList.contains('tbl-sel')) congelaOrdem();
    if (f === 'shift') e.shift = +t.value;
    else if (f === 'station') {
      if (POST_NAMES[t.value]) {
        e.station = t.value;
        roster()[+t.dataset.employee].station = t.value;
      }
    } else if (f === 'pdv') e.pdv = +t.value;
    else if (f === 'sundayWork' && t.value === 'true' && sundayConflict(e) >= 0) {
      const k = sundayConflict(e);
      toast(
        'Não é permitido: ' +
          e.name +
          ' já trabalha no domingo da semana ' +
          (k + 1) +
          ' (' +
          short(date('domingo', k)) +
          '). Ninguém pode trabalhar dois domingos seguidos.',
      );
      render();
      return;
    } else e[f] = f === 'sundayWork' ? t.value === 'true' : t.value;
    if (f === 'sundayWork') e.offDays = e.offDays.slice(0, offLimit(e));
    render();
  }
});
document.addEventListener('click', (event) => {
  const wb = event.target.closest('[data-week]'),
    sb = event.target.closest('[data-sort]'),
    jump = event.target.closest('[data-jump]'),
    tab = event.target.closest('.tab'),
    model = event.target.closest('[data-model]'),
    apply = event.target.closest('#applyRotation'),
    copy = event.target.closest('[data-replicate]'),
    suggest = event.target.closest('[data-suggest-off]'),
    sun = event.target.closest('[data-suggest-sundays]'),
    allOff = event.target.closest('[data-suggest-off-all]'),
    comp = event.target.closest('[data-complete]'),
    posts = event.target.closest('#applyPosts'),
    clearPosts = event.target.closest('#clearPosts'),
    gen = event.target.closest('#genRun'),
    und = event.target.closest('#genUndo');
  if (wb) {
    state.selectedWeek = +wb.dataset.week;
    render();
    return;
  }
  if (sb) {
    setSort(sb.dataset.sort);
    return;
  }
  if (jump) {
    document.getElementById('operator-' + jump.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (tab) {
    activateTab(tab.dataset.tab);
    return;
  }
  if (model) {
    setModel(model.dataset.model);
    return;
  }
  if (apply) {
    applyRotation();
    return;
  }
  if (copy) {
    replicate(copy.dataset.replicate);
    return;
  }
  if (suggest) suggestOffDays();
  if (sun) suggestSundays();
  if (allOff) suggestOffAll();
  if (comp) completarSemanas();
  if (posts) applyPostPlan(false);
  if (clearPosts) {
    const sec = sector();
    delete sec.postShifts;
    delete sec.posts;
    render();
    toast('Rodízio dos postos voltou ao automático.');
  }
  if (gen) generateAll();
  if (und || event.target.closest('#undoTopBtn')) undoGenerate();
});
document.getElementById('decreaseActive').addEventListener('click', () => setActive(week().activeCount - 1));
document.getElementById('increaseActive').addEventListener('click', () => setActive(week().activeCount + 1));
document.getElementById('decreasePdv').addEventListener('click', () => setPdv(week().pdvCount - 1));
document.getElementById('increasePdv').addEventListener('click', () => setPdv(week().pdvCount + 1));
const pb = document.getElementById('printButton');
if (pb) pb.addEventListener('click', printNow);
window.addEventListener('afterprint', () => delete document.body.dataset.printMode);
document.getElementById('resetAllButton').addEventListener('click', async () => {
  if (
    await await askConfirm(
      'Restaurar as 4 semanas de ' +
        SECTORS[state.selectedSector] +
        '? Toda a escala deste setor será apagada (os outros setores não mudam).',
    )
  ) {
    sector().weeks = [0, 1, 2, 3].map(newWeek);
    state.selectedWeek = 0;
    state.notice = '';
    render();
    toast('As 4 semanas de ' + SECTORS[state.selectedSector] + ' foram restauradas.', true);
  }
});
document.getElementById('resetButton').addEventListener('click', async () => {
  if (await await askConfirm('Restaurar somente a semana aberta? Esta ação não muda as outras semanas.')) {
    sector().weeks[state.selectedWeek] = newWeek();
    render();
    toast('A semana ' + (state.selectedWeek + 1) + ' foi restaurada.', true);
  }
});
render();
/* confirmação dentro do app (o navegador bloqueia confirm() em páginas incorporadas) */
function askConfirm(msg) {
  return new Promise((res) => {
    const ov = document.createElement('div');
    ov.className = 'ask-overlay';
    ov.innerHTML =
      '<div class="ask-box" role="dialog" aria-modal="true"><p></p><div class="ask-actions"><button type="button" class="button outline" data-a="0">Cancelar</button><button type="button" class="button" data-a="1">Confirmar</button></div></div>';
    ov.querySelector('p').textContent = msg;
    const done = (v) => {
      ov.remove();
      res(v);
    };
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (b) done(b.dataset.a === '1');
      else if (e.target === ov) done(false);
    });
    document.body.appendChild(ov);
    ov.querySelector('[data-a="1"]').focus();
  });
}

/* impressão resumida: 1 folha para a semana e 1 folha para o domingo */
window.addEventListener('beforeprint', () => {
  try {
    const n = week().employees.length;
    document.body.dataset.dense = n > 30 ? 'xs' : n > 22 ? 's' : n > 16 ? 'm' : 'l';
  } catch (e) {}
});
window.addEventListener('afterprint', () => {
  delete document.body.dataset.dense;
});
/* impressão: tudo em 1 linha por colaboradora (folgas sem o ano) */
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('#scheduleTable .c-off').forEach((td) => {
    td.dataset.full = td.innerHTML;
    td.innerHTML = td.innerHTML.replace(/(\d{1,2}\/\d{1,2})\/\d{2}(?!\d)/g, '$1');
  });
});
window.addEventListener('afterprint', () => {
  document.querySelectorAll('#scheduleTable .c-off[data-full]').forEach((td) => {
    td.innerHTML = td.dataset.full;
    delete td.dataset.full;
  });
});

/* ===== PDVs por turno (selecionável) ===== */
function pdvPlanPanel() {
  if (!hasPdv()) return '';
  const w = week(),
    plan = sector().pdvPlan || {};
  const rows = w.shifts
    .map((sh, i) => {
      const n = w.employees.filter((e) => e.station === 'caixa' && e.shift === i).length,
        sel = (plan[i] || []).filter((x) => x <= w.pdvCount).slice(0, n),
        warn = false;
      const chips = activePdvs(w)
        .map(
          (p) =>
            `<label class="pdv-chip"><input type="checkbox" data-pdvshift="${i}" value="${p}" ${sel.includes(p) ? 'checked' : ''} /><span>${p}</span></label>`,
        )
        .join('');
      return `<div class="pdv-shift"><b>${escape(sh.name)} · ${sh.start}</b><small class="${warn ? 'post-warn' : ''}">${n} operadora${n === 1 ? '' : 's'} neste horário · ${sel.length ? sel.length + ' de ' + n + ' PDV' + (n === 1 ? '' : 's') + ' marcado' + (sel.length === 1 ? '' : 's') : 'pode marcar até ' + n + ' PDV' + (n === 1 ? '' : 's') + ' (ou deixe automático)'}${warn ? ' (faltam PDVs marcados: o restante usa outros números livres ou faz troca)' : ''}</small><div class="pdv-chips">${chips}</div></div>`;
    })
    .join('');
  return `<div class="pdv-plan"><label>PDVs de cada turno (Operadora Caixa)</label><p class="helper">Marque quais PDVs cada turno usa, no máximo um por operadora do horário (4 operadoras cedo = até 4 PDVs); sem marcação, o sistema escolhe automático (1º turno nos números mais baixos). Vale ao aplicar o rodízio, ao gerar a escala e no botão abaixo. O mesmo PDV pode ser marcado em mais de um turno: quando não há PDV livre, a operadora do turno seguinte assume o PDV de quem sai antes (troca de operadora). Quem passar da quantidade marcada usa outro PDV livre.</p>${rows}${pdvSwaps()}<button class="button outline full" id="applyPdvPlan" type="button">Aplicar PDVs nas 4 semanas</button><button class="link-btn" id="clearPdvPlan" type="button">Limpar escolha (automático)</button></div>`;
}
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t.matches || !t.matches('[data-pdvshift]')) return;
  const sh = +t.dataset.pdvshift,
    sec = sector(),
    lim = week().employees.filter((x) => x.station === 'caixa' && x.shift === sh).length;
  sec.pdvPlan = sec.pdvPlan || {};
  const cur = new Set(sec.pdvPlan[sh] || []),
    v = +t.value;
  if (t.checked && cur.size >= lim) {
    render();
    const nome = (week().shifts[sh] || {}).name || 'Este turno';
    toast(
      lim
        ? 'Erro: o ' + nome + ' tem só ' + lim + ' operadora' + (lim === 1 ? '' : 's') + ' e você tentou marcar o PDV ' + v + '. Desmarque um PDV antes ou aumente as operadoras do turno.'
        : 'Erro: o ' + nome + ' não tem nenhuma operadora da Frente de Caixa, então não dá para marcar PDVs nele.',
    );
    return;
  }
  t.checked ? cur.add(v) : cur.delete(v);
  sec.pdvPlan[sh] = [...cur].sort((a, b) => a - b);
  render();
});
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('#applyPdvPlan,#clearPdvPlan,#applyPdvActive');
  if (!b) return;
  const sec = sector();
  if (b.id === 'clearPdvPlan') {
    sec.pdvPlan = {};
    render();
    toast('PDVs por turno voltaram ao automático.');
    return;
  }
  sector().weeks.forEach((w, wi) => assignPdvs(w, wi, true));
  render();
  toast('PDVs aplicados nas 4 semanas.', true);
});

/* resumo das trocas de operadora no mesmo PDV (semana selecionada) */
function pdvSwaps() {
  const w = week(),
    by = {};
  w.employees
    .filter((e) => e.station === 'caixa')
    .forEach((e) => {
      (by[e.pdv] = by[e.pdv] || []).push(e);
    });
  const list = Object.keys(by)
    .map(Number)
    .sort((a, b) => a - b)
    .map((p) => {
      const g = by[p]
        .filter((e) => w.shifts[e.shift])
        .sort((a, b) => mins(w.shifts[a.shift].end) - mins(w.shifts[b.shift].end));
      if (g.length < 2 || new Set(g.map((e) => e.shift)).size < 2) return '';
      return `<li><b>PDV ${p}</b>: ${g
        .map((e, i) => {
          const f = w.shifts[e.shift];
          return (
            escape(e.name) +
            ' (' +
            f.start +
            '–' +
            f.end +
            ')' +
            (i < g.length - 1 ? ' → troca às ' + f.end + ' →' : '')
          );
        })
        .join(' ')}</li>`;
    })
    .filter(Boolean);
  return list.length
    ? `<div class="pdv-swaps"><b>Trocas de operadora nesta semana</b><ul>${list.join('')}</ul></div>`
    : '';
}

/* ===== baixar a escala (semana + domingo) em arquivo para imprimir ===== */
/* ===== impressão: UM só documento (mesmo HTML/CSS) usado pelos dois botões; tela = papel ===== */
async function buildPrintHtml(autoPrint) {
  const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]),
    name = SECTORS[state.selectedSector],
    posts = hasPosts();
  let logo = '';
  try {
    const r = await fetch('logo.png'),
      b = await r.blob();
    logo = await new Promise((ok) => {
      const f = new FileReader();
      f.onload = () => ok(f.result);
      f.onerror = () => ok('');
      f.readAsDataURL(b);
    });
  } catch (e) {}
  const year = (h) => h.replace(/(\d{1,2}\/\d{1,2})\/\d{2}(?!\d)/g, '$1');
  const cells = (tr, drop) => [...tr.children].filter((c, k) => !drop.includes(k));
  /* semana: colaboradora, posto, entrada, almoço, saída, folgas (sem Turno e sem Limite c/ extras) */
  const nRows = week().employees.length;
  const wrowsRaw = [...document.querySelectorAll('#scheduleTable tbody tr')].map((tr) => {
    const c = [...tr.children];
    c.splice(c.length - 1, 1);
    c.splice(1, 1);
    const cells2 = c.map((td, k) => {
      const v = td.dataset.print !== undefined ? td.dataset.print : td.innerHTML;
      if (k === c.length - 1 && td.dataset.ei !== undefined && week().employees[+td.dataset.ei]) return chipsPrint(week().employees[+td.dataset.ei], nRows > 14);
      return k === c.length - 1 ? year(v) : k === 0 ? (tr.classList.contains('aus-row') ? '<span style="color:#b91c1c">' + esc(td.textContent.trim()) + '</span>' : esc(td.textContent.trim())) : v;
    });
    const last = c[c.length - 1];
    cells2.ei = last && last.dataset.ei !== undefined ? +last.dataset.ei : -1;
    return cells2;
  });
  /* ordem da impressão: 1º por posto (todo mundo do posto junto), 2º por horário de entrada, depois nome; cada posto com uma faixa de título */
  const postOrder = (k) => {
    const i = postKeys().indexOf(k);
    return i < 0 ? 99 : i;
  };
  const ordena = (rows, wk) => {
    const emps = week().employees,
      key = (r) => {
        const e = emps[r.ei];
        if (!e) return [99, 9999, ''];
        const s = week().shifts[e.shift];
        return [posts ? postOrder(e.station) : 0, s ? mins(s.start) * 2000 + mins(s.lunchStart || '00:00') : 9999 * 2000, e.name];
      };
    const out = [...rows].sort((x, y) => {
      const p = key(x),
        q = key(y);
      return p[0] - q[0] || p[1] - q[1] || String(p[2]).localeCompare(String(q[2]), 'pt-BR');
    });
    if (!posts) return out;
    const res = [];
    let atual = null;
    out.forEach((r) => {
      const e = emps[r.ei],
        k = e ? e.station : null;
      if (k !== atual) {
        atual = k;
        const n = out.filter((x) => (emps[x.ei] ? emps[x.ei].station : null) === k).length;
        res.push({ grupo: (k && POST_NAMES[k] ? POST_NAMES[k] : 'Sem posto') + ' · ' + n + (n === 1 ? ' pessoa' : ' pessoas') });
      }
      res.push(r);
    });
    return res;
  };
  const wrows = ordena(wrowsRaw);
  const whead = ['Colaboradora', posts ? 'Posto' : null, 'Entrada', 'Almoço', 'Saída', 'Folgas com data'].filter(
    Boolean,
  );
  const srowsN = sundayWorkers().length;
  const srowsRaw = [...document.querySelectorAll('#sundaySchedule tbody tr')]
    .map((tr) => {
      const c = [...tr.children].filter((td) => !td.classList.contains('sun-rem')); // o botão Remover não vai para o papel
      if (c.length < 3) return null;
      c.splice(1, 1);
      const row = c.map((td, k) => (k === 0 ? esc(td.textContent.trim()) : td.innerHTML)),
        ee = week().employees[+tr.dataset.ei];
      row.push(ee ? chipsPrint(ee, srowsN > 14) : '');
      row.ei = ee ? week().employees.indexOf(ee) : -1;
      return row;
    })
    .filter(Boolean);
  const srows = ordena(srowsRaw);
  const shead = ['Colaboradora', posts ? 'Posto' : null, 'Entrada', 'Intervalo', 'Saída', 'Folgas com data'].filter(Boolean);
  const wm = printMetrics(wrows.length, 126, 11, 14),
    sm = printMetrics(srows.length + 1, 150, 11, 14);
  const wid = posts ? [17, 21, 8, 12, 8, 34] : [24, 10, 15, 10, 41];
  const table = (head, rows, m, widths, cls) =>
    `<table class="${cls}" style="--f:${m.font}pt;--r:${m.row}mm"><thead><tr>${head.map((h, k) => `<th style="width:${widths[k] || 'auto'}%">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => (r.grupo ? `<tr class="grp"><td colspan="${head.length}">${esc(r.grupo)}</td></tr>` : `<tr>${r.map((v, k) => `<td${k === 0 ? ' class="n"' : ''}>${v}</td>`).join('')}</tr>`)).join('') || `<tr><td colspan="${head.length}">Nenhuma colaboradora programada para este domingo.</td></tr>`}</tbody></table>`;
  const img = logo ? `<img src="${logo}" alt="">` : '';
  const css = `@page{size:A4 landscape;margin:8mm}tr.grp td{background:#173766;color:#fff;font-weight:700;font-size:calc(var(--f) * .85);text-transform:uppercase;letter-spacing:.4px;padding:1mm 2mm;height:auto}*{box-sizing:border-box}html{background:#e9ecef}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111}.page{width:281mm;margin:0 auto 6mm;background:#fff;padding:0;break-after:page}.page:last-child{break-after:auto;margin-bottom:0}.top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;border-bottom:2px solid #f7c82c;padding:0 0 3mm;margin:0 0 3mm}.top img{height:11mm}.brand{display:flex;align-items:center;gap:8px}.brand b{display:block;color:#ba2025;font-size:15px;line-height:1.1}.brand small{display:block;color:#173766;font-size:8px;letter-spacing:.6px;font-weight:bold;margin-top:3px}.brand .s{color:#173766;font-size:15px}.mid{grid-column:2;text-align:center;font-weight:bold;font-size:15px}.title{text-align:center;color:#173766;font-weight:bold;font-size:15px;line-height:1.5;margin:6mm 0 3mm}table{width:100%;border-collapse:collapse;white-space:nowrap}th{background:#f3f5f8;color:#173766;text-align:left;font-size:calc(var(--f)*.75);text-transform:uppercase;letter-spacing:.3px;height:8mm;padding:0 8px}td{height:var(--r);font-size:var(--f);padding:0 8px;border-bottom:1px solid #d9dde3;vertical-align:middle}td.n{font-weight:bold}.sun td.n{font-weight:normal}.sun td{padding:0 12px}.sun th{padding:0 12px}.swap-note{font-weight:bold;color:#b00020}.pcs{display:flex;gap:.8mm}.pc{flex:1;text-align:center;border:.25mm solid #c5ccd6;border-radius:1mm;font-size:calc(var(--f)*.6);padding:.4mm 0;line-height:1.15;color:#444}.pc.off,.pc.dom-off{background:#ba2025;border-color:#ba2025;color:#fff;font-weight:bold}.pc.dom-work{background:#f7c82c;border-color:#e0ad00;color:#111;font-weight:bold}.pc.aus{background:#f3e8ff;border-color:#c4a5ea;color:#4c1d95}.pc.fer{background:#e6e9ee;color:#555}.pc{-webkit-print-color-adjust:exact;print-color-adjust:exact}.shift-pill{display:none}@media print{html{background:#fff}.page{margin:0}}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Escala ${esc(name)}</title><style>${css}</style></head><body><section class="page"><div class="top"><div class="brand">${img}<div><b>Gestão de Escalas</b><small>GRUPO SÃO LUIZ</small></div></div></div><div class="title">Escala semanal · ${esc(name)}<br>${esc(range())}</div>${table(whead, wrows, wm, wid, 'wk')}${week().employees.some((e) => e.fixo !== undefined || (e.folgaFixa && e.folgaFixa.length)) ? '<p style="font-size:9px;margin:4px 0 0;color:#444">🔒 = folga fixa ou turno fixo (a gerência não deve trocar).</p>' : ''}</section><section class="page"><div class="top"><div class="brand">${img}<span class="s"><b style="color:#173766">${esc(name)}</b></span></div><div class="mid">Escala de domingo · ${short(date('domingo'))}</div></div>${table(shead, srows, sm, posts ? [17, 20, 8, 14, 8, 33] : [22, 10, 14, 10, 44], 'sun')}</section>${autoPrint ? "<script>addEventListener('load',()=>setTimeout(()=>print(),400))<\/script>" : ''}</body></html>`;
}
async function printFile() {
  if (ordemFixa) {
    soltaOrdem();
    render();
  }
  if (issues().length) {
    renderWarning();
    document.getElementById('scheduleWarning').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const html = await buildPrintHtml(true),
    fname = 'escala-' + state.selectedSector + '.html';
  try {
    const d = window.claude && claude.use ? await claude.use('downloads') : null;
    if (d) {
      await d.save({ filename: fname, data: html });
      toast('Abra o arquivo baixado: ele já abre a impressão.', true);
      return;
    }
  } catch (e) {
    if (e && e.code === 'declined') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = fname;
  a.click();
}
async function printNow() {
  if (ordemFixa) {
    soltaOrdem();
    render();
  }
  if (issues().length) {
    renderWarning();
    document.getElementById('scheduleWarning').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const html = await buildPrintHtml(false),
    f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.onload = () =>
    setTimeout(() => {
      try {
        f.contentWindow.focus();
        f.contentWindow.print();
      } catch (e) {
        toast('Não deu para imprimir aqui. Use "Baixar para imprimir".');
      }
      setTimeout(() => f.remove(), 120000);
    }, 400);
  f.srcdoc = html;
}
document.getElementById('printFileButton').addEventListener('click', printFile);

/* troca de operadora no mesmo PDV: "até 17:20" / "após 17:20" (aparece só na impressão) */
function swapNote(e) {
  if (e.station !== 'caixa') return '';
  const w = week(),
    g = w.employees
      .filter((o) => o.station === 'caixa' && o.pdv === e.pdv && w.shifts[o.shift])
      .sort((a, b) => mins(w.shifts[a.shift].end) - mins(w.shifts[b.shift].end) || a.id - b.id);
  if (g.length < 2 || new Set(g.map((o) => o.shift)).size < 2) return '';
  const i = g.indexOf(e),
    part = [];
  if (i > 0) part.push('após ' + w.shifts[g[i - 1].shift].end);
  return part.length ? ` <small class="swap-note">(${part.join(' · ')})</small>` : '';
}

/* ===== PDVs em funcionamento (aba Regras) ===== */
function activePdvs(w) {
  const all = Array.from({ length: w.pdvCount }, (_, i) => i + 1),
    sel = [];
  return sel.length ? all.filter((n) => sel.includes(n)) : all;
}
function pdvActivePanel() {
  return ''; /* removido: só os PDVs de domingo são escolhidos na aba Regras */
  if (!hasPdv()) return '';
  const w = week(),
    act = activePdvs(w),
    chips = Array.from({ length: w.pdvCount }, (_, k) => k + 1)
      .map(
        (p) =>
          `<label class="pdv-chip"><input type="checkbox" data-pdvactive value="${p}" ${act.includes(p) ? 'checked' : ''} /><span>${p}</span></label>`,
      )
      .join('');
  return `<div class="setting-block pdv-plan"><label>PDVs em funcionamento (Frente de Caixa)</label><p class="helper">Marque quais PDVs vão funcionar. Só eles recebem operadoras (hoje: ${act.length} de ${w.pdvCount}). Sem nenhum marcado, todos funcionam. Depois de mudar, clique em aplicar para redistribuir nas 4 semanas.</p><div class="pdv-chips">${chips}</div><button class="button outline full" id="applyPdvActive" type="button">Aplicar PDVs nas 4 semanas</button></div>`;
}
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t.matches || !t.matches('[data-pdvactive]')) return;
  const sec = sector(),
    w = week(),
    cur = new Set(activePdvs(w)),
    v = +t.value;
  t.checked ? cur.add(v) : cur.delete(v);
  sec.pdvActive = cur.size === w.pdvCount ? [] : [...cur].sort((a, b) => a - b);
  render();
});

/* ===== PDVs de domingo (aba Regras): quais PDVs funcionam no domingo ===== */
function sundayCaixa() {
  return sundayWorkers()
    .filter((e) => e.station === 'caixa')
    .sort((a, b) => a.id - b.id);
}
function sundayPdvList() {
  const w = week(),
    act = activePdvs(w);
  return (sector().pdvSunday || []).filter((n) => act.includes(n)).sort((a, b) => a - b);
}
function sundayStationText(e) {
  if (e.station !== 'caixa') return stationText(e);
  const list = sundayPdvList(),
    i = sundayCaixa().indexOf(e);
  return list.length && i >= 0 && i < list.length ? 'Operadora Caixa · PDV ' + list[i] : stationText(e);
}
function pdvSundayPanel() {
  if (!hasPdv()) return '';
  const w = week(),
    act = activePdvs(w),
    n = sundayCaixa().length,
    sel = sundayPdvList().slice(0, n);
  const chips = act
    .map(
      (p) =>
        `<label class="pdv-chip"><input type="checkbox" data-pdvsunday value="${p}" ${sel.includes(p) ? 'checked' : ''} ${!sel.includes(p) && sel.length >= n ? 'disabled' : ''} /><span>${p}</span></label>`,
    )
    .join('');
  return `<div class="setting-block pdv-plan"><label>PDVs no domingo (Frente de Caixa)</label><p class="helper">${n} operadora${n === 1 ? '' : 's'} de caixa no domingo desta semana · ${sel.length ? sel.length + ' de ' + n + ' PDV' + (n === 1 ? '' : 's') + ' marcado' + (sel.length === 1 ? '' : 's') : 'pode marcar até ' + n + ' PDV' + (n === 1 ? '' : 's') + ' (ou deixe automático: usa o PDV da semana)'}. Marque quais PDVs funcionam no domingo; cada operadora de caixa escalada assume um deles, na ordem da numeração.</p><div class="pdv-chips">${chips}</div>${sel.length ? '<button class="link-btn" id="clearPdvSunday" type="button">Limpar escolha (automático)</button>' : ''}</div>`;
}
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t.matches || !t.matches('[data-pdvsunday]')) return;
  const sec = sector(),
    cur = new Set(sundayPdvList()),
    v = +t.value,
    lim = sundayCaixa().length;
  if (t.checked && cur.size >= lim) {
    render();
    toast('No domingo há ' + lim + ' operadora(s) de caixa: só pode marcar ' + lim + ' PDV(s).');
    return;
  }
  t.checked ? cur.add(v) : cur.delete(v);
  sec.pdvSunday = [...cur].sort((a, b) => a - b);
  render();
});
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('#clearPdvSunday')) {
    sector().pdvSunday = [];
    render();
    toast('PDVs de domingo voltaram ao automático.');
  }
});

/* impressão adaptável: a letra e a altura das linhas crescem para ocupar a folha toda */
function printMetrics(n, area, maxRow, maxFont) {
  const row = Math.min(maxRow, area / Math.max(1, n)),
    font = Math.min(maxFont, Math.max(7, row * 1.15));
  return { row: +row.toFixed(2), font: +font.toFixed(2) };
}
window.addEventListener('beforeprint', () => {
  try {
    const wk = printMetrics(week().employees.length, 126, 11, 14),
      sd = printMetrics(sundayWorkers().length + 1, 150, 11, 14),
      r = document.documentElement.style;
    r.setProperty('--pf', wk.font + 'pt');
    r.setProperty('--pr', wk.row + 'mm');
    r.setProperty('--sf', sd.font + 'pt');
    r.setProperty('--sr', sd.row + 'mm');
  } catch (e) {}
});
window.addEventListener('afterprint', () => {
  ['--pf', '--pr', '--sf', '--sr'].forEach((k) => document.documentElement.style.removeProperty(k));
});

/* ===== mínimo de colaboradoras por domingo (aba Regras) ===== */
/* controle do mínimo no domingo de um posto (usado no cartão do posto, na aba Regras) */
function postoMinimo(k) {
  const sw = sundayWorkers(),
    mn = sundayPostMin(k),
    n = sw.filter((e) => e.station === k).length,
    tem = week().employees.filter((e) => e.station === k).length,
    pouco = mn > 0 && tem < 2 * mn;
  return `<div class="number-row"><button class="stepper" data-spm="${k}" data-d="-1" type="button" aria-label="Diminuir mínimo de ${escape(POST_NAMES[k])}">−</button><input type="number" min="0" max="50" data-spm-in="${k}" value="${mn}" aria-label="Mínimo de ${escape(POST_NAMES[k])} no domingo" /><button class="stepper" data-spm="${k}" data-d="1" type="button" aria-label="Aumentar mínimo de ${escape(POST_NAMES[k])}">+</button></div><small class="${n < mn ? 'post-warn' : 'posto-hoje'}">hoje ${n} no domingo</small>${pouco ? `<small class="post-warn" data-pouco="${k}">Equipe pequena: para alternar os domingos este posto precisa de ${2 * mn} pessoas (tem ${tem}). Aumente a equipe ou baixe o mínimo para ${Math.floor(tem / 2)}.</small>` : ''}`;
}
function sundayMinResumo() {
  const custom = !!(sector().sundayPostMin && Object.keys(sector().sundayPostMin).length);
  return `<p class="helper">Total mínimo no domingo: <b>${sundayMin()}</b> (este domingo tem ${sundayWorkers().length}). O painel de conformidade avisa quando um posto fica abaixo e a sugestão de domingos tenta cumprir cada posto.</p>${custom ? '<button class="link-btn" id="spmReset" type="button">Voltar ao padrão do setor</button>' : ''}`;
}
function sundayMinPanel() {
  return ''; /* agora faz parte do cartão de cada posto (renderRegras) */
}
function setSundayPostMin(k, v) {
  const sec = sector();
  sec.sundayPostMin = sec.sundayPostMin || {};
  sec.sundayPostMin[k] = Math.max(0, Math.min(50, Math.floor(+v) || 0));
  render();
}
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.spmIn;
  if (k) setSundayPostMin(k, e.target.value);
});
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-spm],#spmReset');
  if (!t) return;
  if (t.id === 'spmReset') {
    delete sector().sundayPostMin;
    render();
    return;
  }
  setSundayPostMin(t.dataset.spm, sundayPostMin(t.dataset.spm) + +t.dataset.d);
});

/* ===== adicionar colaboradora (semana) e escalar no domingo (domingo) na prévia ===== */
function addBars() {
  const eb = document.getElementById('addEmpBar');
  if (eb) {
    const opts = hasPosts()
      ? `<label>Posto <select id="addEmpPost">${postKeys()
          .map((k) => `<option value="${k}">${POST_NAMES[k]}</option>`)
          .join('')}</select></label>`
      : '';
    const keep = document.getElementById('addEmpName') ? document.getElementById('addEmpName').value : '';
    eb.innerHTML = `<label>Nome <input id="addEmpName" type="text" maxlength="60" placeholder="NOME DA NOVA COLABORADORA" style="text-transform:uppercase" value="${escape(keep)}" /></label>${opts}<button class="button outline" id="addEmpBtn" type="button">+ Adicionar colaboradora</button><small>Entra nas 4 semanas, com folgas, turno${hasPdv() ? ' e PDV' : ''} recalculados.</small>`;
  }
  const sd = document.getElementById('sundaySchedule');
  if (sd && !sd.querySelector('#addSunBar')) {
    const wi = state.selectedWeek,
      w = week(),
      list = w.employees.map((e, i) => ({ e, i, r: sundayEligible(i) })).filter((x) => !x.e.sundayWork);
    const ok = list.filter((x) => x.r === ''),
      no = list.filter((x) => x.r !== '');
    sd.insertAdjacentHTML(
      'beforeend',
      `<div class="add-bar" id="addSunBar"><label>Colaboradora <select id="addSunSel">${ok.map((x) => `<option value="${x.i}">${escape(x.e.name)}${hasPosts() ? ' · ' + (POST_NAMES[x.e.station] || '') : ''}</option>`).join('') || '<option value="">Nenhuma disponível</option>'}${no.length ? '<optgroup label="Não podem (regras de domingo)">' + no.map((x) => `<option disabled>${escape(x.e.name)} — ${x.r}</option>`).join('') + '</optgroup>' : ''}</select></label><button class="button outline" id="addSunBtn" type="button" ${ok.length ? '' : 'disabled'}>+ Adicionar ao domingo</button><small>Só colaboradoras já cadastradas, respeitando as regras de domingo.</small></div>`,
    );
  }
}
/* regras de domingo: nunca dois domingos seguidos, no máximo 2 domingos trabalhados no mês (2 de folga), restrita não vai além das 18h */
function sundayEligible(i) {
  const weeks = sector().weeks,
    wi = state.selectedWeek,
    w = weeks[wi],
    e = w.employees[i];
  if (closedDay('domingo')) return 'domingo fechado (feriado)';
  const au = ausente(e, 'domingo', wi);
  if (au) return 'de ' + (AUS_TIPOS[au.tipo] || 'afastamento').toLowerCase();
  const works = (x) => !!(weeks[x] && weeks[x].employees[i] && weeks[x].employees[i].sundayWork);
  if (works(wi - 1)) return 'trabalhou o domingo anterior';
  {
    const sec = sector(),
      ant = sec.realizado && sec.realizado[iso(date('domingo', wi - 1))],
      pp = ant && ant.pessoas[e.name];
    if (pp && pp[iso(date('domingo', wi - 1))] && pp[iso(date('domingo', wi - 1))].length) return 'trabalhou o domingo anterior (ponto)';
  }
  if (works(wi + 1)) return 'trabalha o próximo domingo';
  if (weeks.filter((_, x) => works(x)).length >= 2) return 'já tem 2 domingos no mês';
  if (e.restricted && sundayPlan(w).en > 1080) return 'restrição: domingo termina após as 18h';
  return '';
}
function addSundayWorker(i) {
  const w = week(),
    r = sundayEligible(i);
  if (r) {
    toast('Não pode: ' + r + '.');
    return;
  }
  const sel = state.selectedSector;
  state.undo = {
    ...(state.undo || {}),
    [sel]: {
      at: new Date().toISOString(),
      weeks: clone(sector().weeks),
      roster: clone((state.roster && state.roster[sel]) || []),
    },
  };
  w.employees[i].sundayWork = true;
  balanceOffs(w, true);
  state.notice =
    w.employees[i].name +
    ' foi escalada no domingo da Semana ' +
    (state.selectedWeek + 1) +
    '. Folgas da semana recalculadas. Você pode desfazer em "Gerar".';
  render();
  toast(w.employees[i].name + ' adicionada ao domingo.', true);
}
/* tira a colaboradora do domingo da semana aberta: o domingo vira folga e as folgas da semana são recalculadas */
function removeSundayWorker(i) {
  const w = week(),
    e = w.employees[i];
  if (!e || !e.sundayWork) return;
  const sel = state.selectedSector;
  state.undo = {
    ...(state.undo || {}),
    [sel]: {
      at: new Date().toISOString(),
      weeks: clone(sector().weeks),
      roster: clone((state.roster && state.roster[sel]) || []),
    },
  };
  e.sundayWork = false;
  balanceOffs(w, true);
  const resta = sundayWorkers(),
    min = sundayMin() || 0,
    semPosto = hasPosts() ? sundayPosts().filter((p) => resta.filter((x) => x.station === p).length < sundayPostMin(p)) : [],
    falta = resta.length < min || semPosto.length;
  state.notice =
    e.name + ' saiu do domingo da Semana ' + (state.selectedWeek + 1) + '. Folgas da semana recalculadas. Você pode desfazer em "Gerar".';
  render();
  toast(
    e.name +
      ' removida do domingo.' +
      (falta
        ? ' Atenção: o domingo ficou abaixo do mínimo' +
          (semPosto.length ? ' em ' + semPosto.map((p) => POST_NAMES[p]).join(', ') : ' (' + resta.length + ' de ' + min + ')') +
          '; adicione outra colaboradora.'
        : ''),
    !falta,
  );
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('[data-sun-rem]');
  if (b) removeSundayWorker(+b.dataset.sunRem);
});
function addEmployee(station, nameIn) {
  const sel = state.selectedSector,
    weeks = sector().weeks;
  weeks.forEach((w) => normalizeWeek(w));
  const n = weeks[0].employees.length;
  if (n >= 50) {
    toast('Limite de 50 colaboradoras por setor.');
    return;
  }
  state.undo = {
    ...(state.undo || {}),
    [sel]: {
      at: new Date().toISOString(),
      weeks: clone(weeks),
      roster: clone((state.roster && state.roster[sel]) || []),
    },
  };
  const r = roster();
  const nm = String(nameIn || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
  r[n] = {
    name: nm || 'Colaboradora ' + (n + 1),
    restricted: false,
    station: hasPosts() ? station || postKeys()[0] : undefined,
  };
  weeks.forEach((w) => {
    w.activeCount = n + 1;
    const e = worker(n + 1, w.shifts.length);
    if (hasPosts()) e.station = r[n].station;
    w.employees.push(e);
    w.rotation = rotation(w.activeCount, w.shifts.length);
  });
  normalize();
  /* turno: o que tiver menos gente do mesmo posto */
  weeks.forEach((w) => {
    const e = w.employees[n],
      c = w.shifts.map((_, i) => w.employees.filter((x) => x !== e && x.station === e.station && x.shift === i).length);
    e.shift = c.indexOf(Math.min(...c));
  });
  weeks.forEach((w) => balanceOffs(w, true));
  if (hasPdv()) weeks.forEach((w, wi) => assignPdvs(w, wi));
  state.notice =
    r[n].name +
    ' adicionada' +
    (hasPosts() ? ' no posto ' + POST_NAMES[r[n].station] : '') +
    ' nas 4 semanas. Turno, folgas' +
    (hasPdv() ? ' e PDV' : '') +
    ' foram recalculados; o domingo dela fica como "não trabalha" (use o botão do domingo). Você pode desfazer em "Gerar".';
  render();
  toast(r[n].name + ' adicionada.', true);
}
/* Ganchos pós-desenho: tudo o que precisa rodar depois de cada render() entra em afterRender
   (barras de adicionar, painéis recolhidos, sincronização com a nuvem em sync.js etc.). */
var afterRender = [];
(function () {
  const desenha = render;
  render = function () {
    const v = desenha.apply(this, arguments);
    for (const gancho of afterRender) {
      try {
        gancho();
      } catch (e) {
        console.warn(e);
      }
    }
    return v;
  };
})();
afterRender.push(addBars);
try {
  render();
} catch (e) {}
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('#addEmpBtn')) {
    const sel = document.getElementById('addEmpPost');
    const nm = document.getElementById('addEmpName');
    addEmployee(sel ? sel.value : undefined, nm ? nm.value : '');
    const n2 = document.getElementById('addEmpName');
    if (n2) n2.value = '';
    return;
  }
  if (e.target.closest && e.target.closest('#addSunBtn')) {
    const v = document.getElementById('addSunSel').value;
    if (v !== '') addSundayWorker(+v);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'addEmpName') {
    e.preventDefault();
    document.getElementById('addEmpBtn').click();
  }
});

/* Painéis que recolhem/expandem (a escolha é só visual e fica guardada no aparelho) */
function painelRecolhivel(secao, botao, chave) {
  if (!secao || !botao) return;
  const set = (c) => {
    secao.classList.toggle('collapsed', c);
    botao.textContent = c ? 'Expandir configuração ▾' : 'Recolher configuração ▴';
    botao.setAttribute('aria-expanded', String(!c));
    try {
      localStorage.setItem(chave, c ? '1' : '0');
    } catch (e) {}
  };
  let c = false;
  try {
    c = localStorage.getItem(chave) === '1';
  } catch (e) {}
  set(c);
  botao.addEventListener('click', () => set(!secao.classList.contains('collapsed')));
}
painelRecolhivel(document.querySelector('.settings'), document.getElementById('toggleSettings'), 'bom-dia-cfg-collapsed');
painelRecolhivel(document.querySelector('.operators'), document.getElementById('toggleOperators'), 'bom-dia-op-collapsed');
painelRecolhivel(
  document.getElementById('coverageBoard') && document.getElementById('coverageBoard').closest('.coverage-board'),
  document.getElementById('toggleBoard'),
  'bom-dia-board-collapsed',
);

/* análise de folgas: recolher / expandir (botão é redesenhado a cada render; clique delegado) */
(function () {
  const sec = () => document.getElementById('offAnalysis');
  const apply = (c) => {
    const s = sec();
    if (!s) return;
    s.classList.toggle('collapsed', c);
    const b = document.getElementById('toggleOff');
    if (b) {
      b.textContent = c ? 'Expandir configuração ▾' : 'Recolher configuração ▴';
      b.setAttribute('aria-expanded', String(!c));
    }
  };
  const get = () => {
    try {
      return localStorage.getItem('bom-dia-off-collapsed') === '1';
    } catch (e) {
      return false;
    }
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#toggleOff')) return;
    const c = !sec().classList.contains('collapsed');
    try {
      localStorage.setItem('bom-dia-off-collapsed', c ? '1' : '0');
    } catch (x) {}
    apply(c);
  });
  afterRender.push(() => apply(get()));
  try {
    apply(get());
  } catch (e) {}
})();

/* ===== Celular: modo "Resumo" (uma ficha curta por pessoa) ou "Editar" (ficha completa) ===== */
(function () {
  const barra = document.getElementById('mobView');
  if (!barra) return;
  const ler = () => {
    try {
      return localStorage.getItem('bom-dia-mob-view') || 'resumo';
    } catch (e) {
      return 'resumo';
    }
  };
  const aplica = (modo) => {
    document.body.classList.toggle('resumo-cel', modo === 'resumo');
    barra.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.mv === modo));
  };
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mv]');
    if (!b) return;
    try {
      localStorage.setItem('bom-dia-mob-view', b.dataset.mv);
    } catch (x) {}
    aplica(b.dataset.mv);
  });
  aplica(ler());
})();

/* ===== Enviar a escala da semana por WhatsApp (texto) ===== */
function textoWhats() {
  const w = week(),
    linhas = ['*Escala · ' + SECTORS[state.selectedSector] + '*', 'Semana ' + (state.selectedWeek + 1) + ' · ' + range()];
  w.shifts.forEach((s, si) => {
    const grupo = w.employees.filter((e) => e.shift === si && !foraSemana(e));
    if (!grupo.length) return;
    linhas.push('', '*' + s.name + '* · ' + s.start + ' às ' + s.end + ' (almoço ' + s.lunchStart + '–' + s.lunchEnd + ')');
    grupo.forEach((e) => {
      const posto = hasPosts() ? ' (' + stationText(e) + ')' : '';
      linhas.push('• ' + e.name + (e.fixo !== undefined ? ' 🔒' : '') + posto + ' — folgas: ' + offText(e));
    });
  });
  const fora = w.employees.filter((e) => foraSemana(e));
  if (fora.length) {
    linhas.push('', '*Férias / atestado*');
    fora.forEach((e) => linhas.push('• ' + e.name + ' — ' + offText(e)));
  }
  if (w.employees.some((e) => e.fixo !== undefined || (e.folgaFixa && e.folgaFixa.length))) linhas.push('', '🔒 = turno ou folga fixos (não trocar sem falar com a gerência)');
  const dom = sundayWorkers();
  linhas.push('', '*Domingo ' + short(date('domingo')).slice(0, 5) + '*: ' + (dom.length ? dom.map((e) => e.name).join(', ') : 'ninguém escalado'));
  return linhas.join('\n');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest || !e.target.closest('#whatsButton')) return;
  let txt;
  try {
    txt = textoWhats();
  } catch (x) {
    toast('Não foi possível montar o texto da escala.');
    return;
  }
  const url = 'https://wa.me/?text=' + encodeURIComponent(txt);
  const j = window.open(url, '_blank', 'noopener');
  if (!j && navigator.clipboard)
    navigator.clipboard.writeText(txt).then(
      () => toast('O navegador bloqueou a abertura do WhatsApp. O texto da escala foi copiado: cole na conversa.', true),
      () => toast('O navegador bloqueou a abertura do WhatsApp.'),
    );
});

/* ===== Regras configuráveis (aba Regras): sábado, postos do setor e quem não folga junto ===== */
function renderRegras() {
  const el = document.getElementById('offRulesPanel');
  if (!el) return;
  const ativos = postKeys(),
    nso = noSameOff(),
    custom = (regras().custom || []).map((c) => c.k),
    todos = todosPostos(),
    dias = DAYS.filter((d) => d[0] !== 'domingo');
  const cards = todos
    .map((k) => {
      const on = ativos.includes(k),
        nome = escape(POST_NAMES[k] || k);
      return `<div class="posto-card ${on ? '' : 'off'}"><div class="posto-top"><h4 class="posto-nome">${nome}${custom.includes(k) ? ' <small>(criado por você)</small>' : ''}</h4><label class="posto-uso"><input type="checkbox" data-rule-post="${k}" ${on ? 'checked' : ''} aria-label="Posto ${nome} em uso" /> Em uso</label></div>${
        on
          ? `<div class="posto-grid"><div class="posto-bloco"><span class="posto-rot">Mínimo no domingo</span>${postoMinimo(k)}</div><div class="posto-bloco"><span class="posto-rot">Folgas do posto</span><label class="posto-nso"><input type="checkbox" data-rule-nso="${k}" ${nso.includes(k) ? 'checked' : ''} aria-label="${nome} não folgam no mesmo dia" /> Não folgam no mesmo dia</label><span class="posto-rot sub">Evitar folga em</span><div class="rule-days">${dias
              .map((d) => `<label class="rule-day"><input type="checkbox" data-rule-avoid="${k}|${d[0]}" ${evitaDia(k, d[0]) ? 'checked' : ''} aria-label="${nome} evitar folga em ${d[0]}" />${d[1].replace('.', '')}</label>`)
              .join('')}</div></div></div>`
          : '<p class="helper">Posto fora de uso: some das listas até você reativar.</p>'
      }</div>`;
    })
    .join('');
  el.innerHTML = `<h3 class="regras-titulo">Postos de ${escape(SECTORS[state.selectedSector])}</h3>
    <div class="postos-grid">${cards}</div>
    <div class="rule-add"><input id="rulePostName" type="text" maxlength="30" placeholder="Novo posto (ex.: Balcão)" /><button type="button" class="button outline" id="rulePostAdd">Adicionar posto</button></div>
    <div class="regras-gerais"><label class="check-row"><input type="checkbox" id="ruleSat" ${evitaSabado() ? 'checked' : ''} /> Evitar folga no sábado nas sugestões automáticas <small>(vale para os postos sem dias próprios; soma-se ao “Movimento esperado por dia” da aba Gerar)</small></label>${ativos.length ? sundayMinResumo() : ''}</div>
    <p class="helper"><b>Evitar folga em</b> é uma preferência: se a equipe não permitir outra saída, o app ainda pode usar o dia. <b>Não folgam no mesmo dia</b> vale para o conjunto dos postos marcados (ex.: Fiscal e Recepção nunca folgam juntas), nas sugestões, na marcação manual e nos alertas. Desmarcar <b>Em uso</b> tira o posto das listas; quem estava nele passa para outro posto até você reativar.</p>`;
}
function regraDoSetor() {
  state.settings.rules = state.settings.rules || {};
  const s = state.selectedSector;
  return (state.settings.rules[s] = state.settings.rules[s] || {});
}
document.addEventListener(
  'change',
  (e) => {
    const t = e.target;
    if (!t || !t.closest || !t.closest('#offRulesPanel')) return;
    if (t.dataset.spmIn) return; /* mínimo do domingo: tratado pelo ouvinte próprio */
    e.stopImmediatePropagation();
    if (t.id === 'ruleSat') state.settings.avoidSaturday = t.checked;
    else if (t.dataset.rulePost) {
      const r = regraDoSetor(),
        atual = new Set(postKeys());
      t.checked ? atual.add(t.dataset.rulePost) : atual.delete(t.dataset.rulePost);
      if (!atual.size) {
        toast('O setor precisa ter pelo menos um posto em uso.');
        render();
        return;
      }
      r.posts = todosPostos().filter((k) => atual.has(k));
    } else if (t.dataset.ruleAvoid) {
      const [k, dia] = t.dataset.ruleAvoid.split('|'),
        r = regraDoSetor();
      const atual = new Set(diasEvitar(k));
      t.checked ? atual.add(dia) : atual.delete(dia);
      r.avoidDays = r.avoidDays || {};
      r.avoidDays[k] = WD.filter((x) => atual.has(x));
    } else if (t.dataset.ruleNso) {
      const r = regraDoSetor(),
        atual = new Set(noSameOff());
      t.checked ? atual.add(t.dataset.ruleNso) : atual.delete(t.dataset.ruleNso);
      r.noSameOff = [...atual];
    } else return;
    render();
  },
  true,
);
function adicionaPosto() {
  const inp = document.getElementById('rulePostName'),
    nome = String((inp && inp.value) || '')
      .trim()
      .replace(/\s+/g, ' ');
  if (!nome) {
    toast('Digite o nome do novo posto.');
    return;
  }
  if (todosPostos().some((k) => normTxt(POST_NAMES[k] || k) === normTxt(nome))) {
    toast('Já existe um posto com esse nome neste setor.');
    return;
  }
  const r = regraDoSetor(),
    ativos = postKeys(),
    k = 'x_' + Date.now().toString(36);
  r.custom = [...(r.custom || []), { k, name: nome }];
  r.posts = [...ativos, k];
  POST_NAMES[k] = nome;
  render();
  toast('Posto "' + nome + '" criado. Escolha quem trabalha nele na tabela ou na ficha da colaboradora.', true);
}
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('#rulePostAdd')) adicionaPosto();
  if (e.target.closest && e.target.closest('#reordenarBtn')) {
    soltaOrdem();
    render();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'rulePostName') {
    e.preventDefault();
    adicionaPosto();
  }
});
afterRender.push(renderRegras);
afterRender.push(() => {
  const n = document.querySelector('.dashboard .table-note');
  if (!n) return;
  let b = document.getElementById('ordemAviso');
  if (!ordemFixa) {
    if (b) b.remove();
    return;
  }
  if (!b) {
    b = document.createElement('p');
    b.id = 'ordemAviso';
    b.className = 'ordem-aviso';
    b.innerHTML = 'As linhas ficaram na mesma posição enquanto você edita. <button type="button" class="link-btn" id="reordenarBtn">Reordenar agora</button>';
    n.parentNode.insertBefore(b, n);
  }
});
try {
  render();
} catch (e) {}

/* Retorno em todo botão de ação: se a ação não mostrou nenhuma mensagem, mostra uma de confirmação (verde) */
(function () {
  const MSG = [
    ['[data-replicate="team"]', 'Equipe e modelo copiados para as outras semanas.'],
    ['[data-replicate="pdvs"]', 'Quantidade de PDVs copiada para as outras semanas.'],
    ['[data-replicate="all"]', 'Preenchimento completo copiado para as outras semanas.'],
    ['[data-replicate="shifts"]', 'Turnos replicados nas outras semanas.'],
    ['[data-suggest-off-all]', 'Folgas sugeridas nas 4 semanas.'],
    ['[data-suggest-off]', 'Folgas sugeridas para esta semana.'],
    ['[data-suggest-sundays]', 'Domingos alternados sugeridos nas 4 semanas.'],
    ['#applyPdvActive', 'PDVs em uso aplicados nas 4 semanas.'],
  ];
  let t0 = 0;
  document.addEventListener('click', () => (t0 = Date.now()), true); /* antes dos tratadores: se algum mostrar erro, não entra a confirmação verde */
  document.addEventListener('click', (e) => {
    const hit = MSG.find(([sel]) => e.target.closest && e.target.closest(sel));
    if (!hit) return;
    setTimeout(() => {
      if (toastEm < t0) toast(hit[1], true);
    }, 60);
  });
})();

/* ===== ajustes feitos direto na Análise de folgas e na Cobertura por hora ===== */
const errosAtuais = () => new Set(compliance().filter((x) => x.level === 'erro').map((x) => x.text));
function tentaVarias(opcoes, okMsg, semOpcaoMsg) {
  const antes = errosAtuais(),
    sec = sector(),
    snap = JSON.stringify(sec.weeks),
    ps = JSON.stringify(sec.postShifts || null),
    plano = JSON.stringify(sec.pdvPlan || null);
  let ultimo = '';
  const volta = () => {
    sec.weeks = JSON.parse(snap);
    const o = JSON.parse(ps);
    if (o) sec.postShifts = o;
    else delete sec.postShifts;
    const pl = JSON.parse(plano);
    if (pl) sec.pdvPlan = pl;
    else delete sec.pdvPlan;
  };
  for (const op of opcoes.slice(0, 40)) {
    const r = op();
    if (r && r.erro) {
      ultimo = r.erro;
      volta();
      continue;
    }
    const novos = [...errosAtuais()].filter((t) => !antes.has(t));
    if (!novos.length) {
      render();
      toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, true);
      return true;
    }
    ultimo = novos[0];
    volta();
  }
  render();
  toast('Erro: ' + (opcoes.length ? 'a mudança quebraria uma regra e não foi aplicada. ' + ultimo : semOpcaoMsg));
  return false;
}
/* mexe nas folgas da semana aberta: delta=+1 → mais uma pessoa do grupo trabalhando nesse dia; −1 → uma a menos */
function moveFolga(G, rotulo, dKey, delta) {
  const w = week(),
    wi = state.selectedWeek,
    D = DAYS.find((d) => d[0] === dKey),
    dias = DAYS.filter((d) => d[0] !== 'domingo' && !closedDay(d[0], wi)),
    trab = (e, d) => worksOn(e, d[0], wi),
    cov = (d) => G.filter((e) => trab(e, d)).length,
    livre = (e, d) =>
      !noSameOff().includes(e.station) || !w.employees.some((o) => o !== e && noSameOff().includes(o.station) && !trab(o, d));
  if (!D || D[0] === 'domingo') return toast('Erro: o domingo se ajusta pela lista de quem trabalha no domingo, não por aqui.');
  if (closedDay(D[0], wi)) return toast('Erro: a loja está fechada nesse dia.');
  const pares = [];
  if (delta > 0) {
    G.filter((e) => !trab(e, D) && e.offDays.includes(D[0]) && !travada(e, D[0])).forEach((e) =>
      dias.filter((y) => y !== D && trab(e, y) && cov(y) > 1 && livre(e, y)).forEach((y) => pares.push({ e, y, score: cov(y) - (evitaDia(e.station, y[0]) ? 100 : 0) })),
    );
    pares.sort((a, b) => b.score - a.score);
  } else {
    G.filter((e) => trab(e, D) && livre(e, D)).forEach((e) =>
      e.offDays.filter((x) => x !== D[0] && !travada(e, x)).forEach((x) => pares.push({ e, y: DAYS.find((d) => d[0] === x), score: cov(DAYS.find((d) => d[0] === x)) })),
    );
    pares.sort((a, b) => a.score - b.score);
    const so = G.filter((e) => trab(e, D)).length;
    if (so <= 1 && G.length > 1 && cov(D) <= 1) return toast('Erro: ' + rotulo + ' ficaria sem ninguém em ' + D[0] + '.');
  }
  if (!pares.length && delta > 0 && !G.some((e) => !trab(e, D)))
    return toast('Erro: todas (' + rotulo + ') já trabalham em ' + D[0] + ': não há folga nesse dia para trazer para cá.');
  if (!pares.length)
    return toast(
      delta > 0
        ? 'Erro: ninguém de folga em ' + D[0] + ' (' + rotulo + ') pode trocar de dia sem deixar o outro dia vazio ou repetir folga no mesmo posto.'
        : 'Erro: ninguém trabalhando em ' + D[0] + ' (' + rotulo + ') tem uma folga para trocar de dia.',
    );
  /* depois de desfazer uma tentativa, os objetos da semana são recriados: por isso cada tentativa busca a colaboradora de novo pelo número */
  const ops = pares.map((par) => () => {
    const idx = w.employees.indexOf(par.e),
      w2 = week(),
      e = w2.employees[idx];
    e.offDays = delta > 0 ? e.offDays.filter((x) => x !== D[0]).concat(par.y[0]) : e.offDays.filter((x) => x !== par.y[0]).concat(D[0]);
    e.offDays.sort((a, b) => DAYS.findIndex((d) => d[0] === a) - DAYS.findIndex((d) => d[0] === b));
    if (hasPdv()) assignPdvs(w2, wi, true);
    return { e, y: par.y };
  });
  tentaVarias(
    ops,
    (r) =>
      delta > 0
        ? 'Mais 1 em ' + D[0] + ' (' + rotulo + '): a folga de ' + r.e.name + ' passou de ' + D[0] + ' para ' + r.y[0] + '.'
        : 'Menos 1 em ' + D[0] + ' (' + rotulo + '): ' + r.e.name + ' folga em ' + D[0] + ' e passa a trabalhar em ' + r.y[0] + '.',
    'não encontrei troca possível.',
  );
}
function moveTurno(k, i, delta) {
  const w = week(),
    cur = w.shifts.map((_, j) => w.employees.filter((e) => e.station === k && e.shift === j).length),
    lim = k === 'caixa' && hasPdv() ? activePdvs(w).length : 99,
    nome = (j) => w.shifts[j].name;
  let j;
  if (delta > 0) {
    if (cur[i] + 1 > lim)
      return toast('Erro: o ' + nome(i) + ' já tem ' + cur[i] + ' operadora' + (cur[i] === 1 ? '' : 's') + ' e só há ' + lim + ' PDV' + (lim === 1 ? '' : 's') + ' em uso: não cabe mais 1.');
    const outros = cur.map((n, x) => [n, x]).filter(([n, x]) => x !== i && n > 0).sort((a, b) => b[0] - a[0]);
    if (!outros.length) return toast('Erro: ' + (POST_NAMES[k] || k) + ' não tem ninguém em outro turno para passar para o ' + nome(i) + '.');
    j = outros[0][1];
  } else {
    if (cur[i] < 1) return toast('Erro: o ' + nome(i) + ' não tem ninguém de ' + (POST_NAMES[k] || k) + ' para tirar.');
    const dest = cur.map((n, x) => [n, x]).filter(([n, x]) => x !== i && n + 1 <= lim).sort((a, b) => a[0] - b[0]);
    if (!dest.length) return toast('Erro: nenhum outro turno comporta mais 1 pessoa de ' + (POST_NAMES[k] || k) + ' (limite de ' + lim + ' por turno).');
    j = dest[0][1];
  }
  const novo = cur.slice();
  novo[i] += delta;
  novo[j] -= delta;
  tentaVarias(
    [
      () => {
        const s = sector();
        s.postShifts = s.postShifts || {};
        s.postShifts[k] = novo;
        const r = applyPostPlan(true);
        if (r === false) return { erro: 'não foi possível refazer o rodízio.' };
        sector().weeks.forEach((x, wi) => {
          swapRestricted(x);
          if (hasPdv()) assignPdvs(x, wi, true);
        });
        return {};
      },
    ],
    delta > 0
      ? (POST_NAMES[k] || k) + ': +1 no ' + nome(i) + ' e −1 no ' + nome(j) + '. O rodízio das 4 semanas foi refeito.'
      : (POST_NAMES[k] || k) + ': −1 no ' + nome(i) + ' e +1 no ' + nome(j) + '. O rodízio das 4 semanas foi refeito.',
    'não encontrei troca possível.',
  );
}
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-ajuste],[data-bpost],[data-oa]');
  if (!t) return;
  if (t.hasAttribute('data-ajuste')) {
    modoAjuste = !modoAjuste;
    render();
    toast(modoAjuste ? 'Ajuste ligado: use + e − nas células das tabelas.' : 'Ajuste desligado.', true);
    return;
  }
  if (t.hasAttribute('data-bpost')) {
    boardPosto = t.dataset.bpost;
    render();
    return;
  }
  const dl = +t.dataset.dl,
    w = week();
  if (t.dataset.oa === 'turno') return moveTurno(t.dataset.post, +t.dataset.turno, dl);
  if (t.dataset.oa === 'dia') {
    /* nas células de folga, + = mais 1 folga = menos 1 pessoa trabalhando */
    const [tp, id, tn] = t.dataset.g.split(':');
    if (tp === 'pt')
      return moveFolga(w.employees.filter((x) => x.station === id && x.shift === +tn), (POST_NAMES[id] || id) + ' · ' + w.shifts[+tn].name, t.dataset.day, -dl);
    if (tp === 'p') return moveFolga(w.employees.filter((x) => x.station === id), POST_NAMES[id] || 'colaboradoras', t.dataset.day, -dl);
    return moveFolga(w.employees.filter((x) => x.shift === +id), w.shifts[+id].name, t.dataset.day, -dl);
  }
  if (t.dataset.oa === 'faixa') {
    const G = w.employees.filter((x) => (!t.dataset.post || x.station === t.dataset.post) && cobreFaixa(x, t.dataset.ini, t.dataset.fim));
    if (!G.length) return toast('Erro: nenhuma colaboradora' + (t.dataset.post ? ' de ' + POST_NAMES[t.dataset.post] : '') + ' tem turno que cubra ' + t.dataset.ini + '–' + t.dataset.fim + '.');
    return moveFolga(G, (t.dataset.post ? POST_NAMES[t.dataset.post] + ' · ' : '') + t.dataset.ini + '–' + t.dataset.fim, t.dataset.day, dl);
  }
});

/* ===== migração: a semana passou a ir de domingo a sábado. Contas antigas (semana segunda a domingo) recomeçam a escala:
   mantém nomes, postos, turnos e restrições, e limpa domingos, folgas e ciclos guardados. A versão anterior continua no histórico de versões. ===== */
function migraSemanaDomingo() {
  state.settings = state.settings || {};
  if (state.settings.semanaDom) return false;
  state.settings.semanaDom = true;
  const antes = new Date((state.baseMonday || monday(new Date())) + 'T12:00:00');
  state.baseMonday = monday(antes); /* a segunda de antes passa a cair na semana que começa no domingo anterior */
  const sel = state.selectedSector;
  Object.keys(state.sectors).forEach((sk) => {
    const sec = state.sectors[sk];
    if (!sec || !sec.weeks) return;
    state.selectedSector = sk;
    delete sec.ciclos;
    delete sec.pdvSunday;
    sec.weeks.forEach((w) => {
      normalizeWeek(w);
      w.employees.forEach((e, i) => {
        e.sundayWork = false;
        e.offDays = offForEmp(w, e, i);
      });
    });
  });
  state.selectedSector = sel;
  state.selectedWeek = 0;
  state.notice = 'A semana agora vai de domingo a sábado. Os domingos e as folgas foram limpos: escolha quem trabalha no domingo da Semana 1 e use "Sugerir folgas" ou "Gerar".';
  return true;
}
