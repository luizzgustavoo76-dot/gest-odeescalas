// Leitura de números, nomes de setores, relatórios de venda e da planilha mensal antiga (META DIARIA).
(function (root) {
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const round2 = v => Math.round((+v || 0) * 100) / 100;

  function parseNum(str) {
    if (typeof str === 'number') return str;
    let s = String(str ?? '').replace(/R\$|\s/g, '').trim(); if (!s) return NaN;
    let neg = false; if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); } if (s.startsWith('-')) { neg = true; s = s.slice(1); }
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc > -1 && ld > -1) { s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''); }
    else if (lc > -1) { s = (s.split(',').length > 2) ? s.replace(/,/g, '') : s.replace(',', '.'); }
    else if (ld > -1) { const p = s.split('.'); if (p.length > 2 || p[p.length - 1].length === 3) s = s.replace(/\./g, ''); }
    const v = parseFloat(s); return isNaN(v) ? NaN : (neg ? -v : v);
  }
  const NUMRE = /\(?-?(?:R\$\s?)?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?\)?|\(?-?(?:R\$\s?)?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\)?|\(?-?(?:R\$\s?)?\d+(?:[.,]\d{1,2})?\)?/g;
  function extractNums(str) { const out = []; (String(str).match(NUMRE) || []).forEach(t => { const v = parseNum(t.replace(/[()]/g, '')); if (!isNaN(v)) out.push(t.startsWith('(') ? -v : v); }); return out; }

  // sinônimos usados em relatórios e planilhas
  const ALIASES = {
    acougue: ['ACOUGUE', 'ACOUGE', 'CARNES', 'CARNE'],
    hortifruti: ['HORTIFRUTI', 'HORTIFRUTTI', 'HORTI FRUTI', 'HORTI FRUIT', 'HORTIFRUIT', 'HORT', 'HORTI', 'FLV', 'FRUTAS', 'VERDURAS'],
    panif_terc: ['PANIFICADORA TERCEIRO', 'PANIFICADORA TERCEIROS', 'PANIFICADORA TERCER', 'PANIFICADORA TERC', 'PADARIA TERCEIRO', 'PADARIA TERCEIROS', 'PADARIA TERC', 'PANIF TERC', 'PAES TERCEIROS'],
    padaria: ['PADARIA', 'PANIFICADORA', 'PANIFICACAO', 'PAES'],
    pereciveis: ['PERECIVEIS', 'PERECIVES', 'PERECIVEL', 'FRIOS', 'FRIOS E LATICINIOS', 'LATICINIOS'],
    merc_seca: ['MERCEARIA SECA', 'MERC SECA', 'MERC SEC'],
    merc_salgada: ['MERCEARIA SALGADA', 'MERC SALGADA', 'MERC SALG'],
    merc_doce: ['MERCEARIA DOCE', 'MERC DOCE', 'DOCES'],
    bebidas: ['BEBIDAS', 'BEBIDA'],
    perfumaria: ['PERFUMARIA', 'HIGIENE', 'HIGIENE E BELEZA'],
    limpeza: ['LIMPEZA', 'PRODUTOS DE LIMPEZA'],
    bazar: ['BAZAR', 'UTILIDADES'],
    leite_gas: ['LEITE GAS', 'LEITE E GAS', 'LEITE', 'GAS'],
    eletro: ['ELETRO TEXT OUTROS', 'ELETRO TEXTIL OUTROS', 'ELETRO', 'TEXTIL', 'ELETRONICOS', 'OUTROS']
  };
  const ALIAS_LIST = Object.entries(ALIASES).flatMap(([id, arr]) => arr.map(a => ({ id, a: norm(a) }))).sort((x, y) => y.a.length - x.a.length);
  function matchSector(text) {
    const n = ' ' + norm(text) + ' ';
    for (const { id, a } of ALIAS_LIST) { if (n.includes(' ' + a + ' ')) return id; }
    return null;
  }
  // nome de setor como cabeçalho de planilha (precisa começar pelo nome)
  function sectorHeader(text) {
    const n = norm(text); if (!n) return null;
    for (const { id, a } of ALIAS_LIST) { if (n === a || n.startsWith(a + ' ')) return id; }
    return null;
  }

  function parseLines(rows) {
    const vendas = {}, avisos = []; let data = null;
    for (const r of rows) {
      const text = r.text || '';
      if (!data) { const dm = text.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{2,4})/); if (dm) { const y = dm[3].length === 2 ? '20' + dm[3] : dm[3]; data = `${y}-${dm[2]}-${dm[1]}`; } }
      const id = matchSector(r.label ?? text); if (!id || vendas[id] != null) continue;
      let nums = r.nums ?? extractNums(text.replace(/^\s*\d{1,6}\s*[-–.]?\s+(?=[A-Za-zÀ-ú])/, ''));
      nums = nums.filter(v => !(Number.isInteger(v) && v >= 0 && v < 100 && nums.length > 1));
      if (!nums.length) continue;
      const v = nums.length === 1 ? nums[0] : Math.max(...nums);
      if (nums.length > 1) avisos.push(id);
      vendas[id] = round2(v);
    }
    return { vendas, perdas: {}, data, avisos, obs: avisos.length ? 'Algumas linhas tinham mais de um número — foi usado o maior valor. Confira os destacados.' : '' };
  }

  /* ---------- planilha mensal (modelo antigo, abas META DIARIA / PERCA-VENDA SETORES / Planilha1..31) ---------- */
  const MESES_N = { JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6, JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12 };
  const ORDER = ['acougue', 'hortifruti', 'padaria', 'panif_terc', 'pereciveis', 'merc_seca', 'merc_salgada', 'merc_doce', 'bebidas', 'perfumaria', 'limpeza', 'bazar', 'leite_gas', 'eletro'];
  const pad = n => String(n).padStart(2, '0');

  // ws: objeto de células no formato SheetJS ({A1:{t,v}}); devolve a célula (linha e coluna começando em 1)
  function colName(c) { let s = ''; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
  const cell = (ws, r, c) => ws ? ws[colName(c) + r] : undefined;
  const val = (ws, r, c) => { const x = cell(ws, r, c); return x ? x.v : null; };
  const num = (ws, r, c) => { const x = cell(ws, r, c); return x && x.t === 'n' && isFinite(x.v) ? x.v : null; };
  const dt = (ws, r, c) => { const x = cell(ws, r, c); if (!x) return null; if (x.v instanceof Date) { const d = new Date(x.v.getTime() + 12 * 3600e3); return d; } return null; };

  function parseModelo(wb, fileName) {
    const md = wb.Sheets['META DIARIA'], pv = wb.Sheets['PERCA-VENDA SETORES'];
    if (!md || !pv) throw new Error('Não é a planilha mensal (faltam as abas META DIARIA / PERCA-VENDA SETORES).');
    // mês: pelo nome do arquivo ("NOVEMBRO 2026.xlsx") ou pelas datas
    let yr = null, mon = null;
    const parts = norm(String(fileName || '').replace(/\.[^.]+$/, '')).split(' ');
    for (let i = 0; i < parts.length - 1; i++) if (MESES_N[parts[i]] && /^\d{4}$/.test(parts[i + 1])) { mon = MESES_N[parts[i]]; yr = +parts[i + 1]; }
    if (!mon) { const d = dt(md, 1, 1) || dt(pv, 9, 1); if (d) { mon = d.getMonth() + 1; yr = d.getFullYear(); } }
    if (!mon) throw new Error('Não consegui descobrir o mês. Renomeie o arquivo como "MÊS ANO.xlsx".');
    const mes = `${yr}-${pad(mon)}`, nd = new Date(yr, mon, 0).getDate();
    const avisos = [];
    // metas mensais da loja e dos setores
    let metaLoja = null; const smeta = {};
    for (let r = 1; r <= 7; r++) for (let c = 4; c <= 10; c++) {
      const v = val(md, r, c);
      if (typeof v === 'string') {
        const below = num(md, r + 1, c);
        if (norm(v) === 'META LOJA') { if (below != null) metaLoja = below; }
        else { const i = sectorHeader(v); if (i && below != null && smeta[i] == null) smeta[i] = below; }
      }
    }
    // meta e total do caixa por dia
    const dias = {};
    if (dt(md, 1, 1)) {
      for (let r = 1; r < 40; r++) {
        const d = dt(md, r, 1); if (!d || d.getMonth() + 1 !== mon || d.getFullYear() !== yr) continue;
        const k = `${mes}-${pad(d.getDate())}`; const m = num(md, r, 2), t = num(md, r, 3);
        dias[k] = { meta: m != null ? round2(m) : 0 }; if (t) dias[k].total = round2(t);
      }
    } else {
      for (let day = 1; day <= nd; day++) {
        const m = num(md, day, 1), t = num(md, day, 2), k = `${mes}-${pad(day)}`;
        dias[k] = { meta: m != null ? round2(m) : 0 }; if (t) dias[k].total = round2(t);
      }
    }
    for (let day = 1; day <= nd; day++) { const k = `${mes}-${pad(day)}`; if (!dias[k]) dias[k] = { meta: 0 }; }
    // vendas e perdas por setor (blocos da aba PERCA-VENDA SETORES)
    const blockMeta = {};
    for (const r0 of [1, 42, 83, 124]) for (const c0 of [1, 7, 13, 19]) {
      const i = sectorHeader(val(pv, r0, c0)); if (!i) continue;
      let bm = 0;
      for (let day = 1; day <= nd; day++) {
        const r = r0 + 8 + day - 1, k = `${mes}-${pad(day)}`;
        const m = num(pv, r, c0 + 1), v = num(pv, r, c0 + 2), p = num(pv, r, c0 + 4);
        if (m != null) bm += m;
        if (v) (dias[k].vendas = dias[k].vendas || {})[i] = round2(v);
        if (p) (dias[k].perdas = dias[k].perdas || {})[i] = round2(p);
      }
      blockMeta[i] = bm;
    }
    // vendas direto das abas Planilha1..31 (evita erros de fórmula)
    let usadas = 0;
    for (let day = 1; day <= nd; day++) {
      const ws = wb.Sheets['Planilha' + day]; if (!ws) continue;
      const got = {};
      for (let r = 1; r <= 20; r++) { const i = sectorHeader(val(ws, r, 1)); if (i && !(i in got)) got[i] = num(ws, r, 2); }
      if (Object.keys(got).length >= 10) {
        const k = `${mes}-${pad(day)}`; const vend = {};
        for (const [i, v] of Object.entries(got)) if (v) vend[i] = round2(v);
        if (Object.keys(vend).length) { const old = dias[k].vendas || {}; for (const i in old) if (!(i in vend)) vend[i] = old[i]; dias[k].vendas = vend; usadas++; }
      }
    }
    const ids = ORDER.filter(i => i in smeta || i in blockMeta);
    const setores = ids.map(i => { let m = smeta[i]; if (!m) { m = blockMeta[i] || 0; avisos.push(`meta de ${i} calculada pela soma diária`); } return { id: i, meta: round2(m) }; });
    const somaDias = Object.values(dias).reduce((a, d) => a + d.meta, 0);
    if (!metaLoja) metaLoja = somaDias;
    // diárias
    let diarias = null;
    for (let r = 1; r < 12; r++) if (norm(val(md, r, 12)) === 'DIARIAS') {
      const lanc = [];
      for (let rr = r + 1; rr < r + 20; rr++) { const a = dt(md, rr, 12), b = num(md, rr, 13); if (a && b) lanc.push({ data: `${a.getFullYear()}-${pad(a.getMonth() + 1)}-${pad(a.getDate())}`, valor: b }); }
      const orc = num(md, 4, 13); diarias = { orcamento: orc || 0, lancamentos: lanc };
    }
    return { mes, metaLoja: round2(metaLoja), setores, dias, diarias, avisos, diasComSetor: usadas };
  }

  const api = { norm, round2, parseNum, extractNums, ALIASES, matchSector, sectorHeader, parseLines, parseModelo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Parser = api;
})(typeof window !== 'undefined' ? window : globalThis);
