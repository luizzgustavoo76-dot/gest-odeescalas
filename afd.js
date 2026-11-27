/* Conferência do ponto: importa o arquivo AFD do relógio (Portaria 1510 ou 671) e compara com a escala aberta.
   Tudo é lido no navegador; o arquivo não é enviado a lugar nenhum. */
(function () {
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const hh = (n) => pad(Math.floor(n / 60)) + ':' + pad(n % 60);
  const dur = (n) => (n < 0 ? '-' : '') + Math.floor(Math.abs(n) / 60) + 'h' + pad(Math.abs(n) % 60);
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const TOL = 10; /* tolerância CLT de 10 min por dia */

  let nomesPonto = []; /* nomes (normalizados) do último arquivo lido */
  const lev = (a, b) => {
    let p = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const c = [i];
      for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      p = c;
    }
    return p[b.length];
  };
  /* nomes do ponto que já foram ligados a esta pessoa (guardados na ficha dela) */
  function aliasDe(e) {
    const r = state.roster && state.roster[state.selectedSector];
    if (!r) return [];
    for (const w of sector().weeks || []) {
      const i = w.employees.indexOf(e);
      if (i >= 0) return (r[i] && r[i].afdNome) || [];
    }
    return [];
  }
  function parseAfd(text) {
    const names = {},
      punches = {}; /* iso -> pis -> [min] */
    let empresa = '';
    String(text)
      .split(/\r?\n/)
      .forEach((l) => {
        if (l.length < 10) return;
        const t = l[9],
          novo = l.length > 14 && l[14] === '-' && l.slice(10, 12) === '20';
        if (t === '1' && !empresa) empresa = l.slice(37, 187).trim();
        else if (t === '5') {
          if (novo) names[l.slice(35, 47)] = l.slice(47, 99).trim();
          else names[l.slice(23, 35)] = l.slice(35, 87).trim();
        } else if (t === '3') {
          let d, hr, pis;
          if (novo) {
            d = l.slice(10, 20);
            hr = +l.slice(21, 23) * 60 + +l.slice(24, 26);
            pis = l.slice(34, 46);
          } else {
            d = l.slice(14, 18) + '-' + l.slice(12, 14) + '-' + l.slice(10, 12);
            hr = +l.slice(18, 20) * 60 + +l.slice(20, 22);
            pis = l.slice(22, 34);
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(hr)) return;
          ((punches[d] = punches[d] || {})[pis] = punches[d][pis] || []).push(hr);
        }
      });
    Object.values(punches).forEach((o) => Object.keys(o).forEach((k) => (o[k] = [...new Set(o[k])].sort((a, b) => a - b))));
    nomesPonto = [...new Set(Object.values(names).map(norm))];
    return { names, punches, empresa, dias: Object.keys(punches).sort() };
  }

  /* acha o nome do AFD na equipe: igual; já ligado na ficha; primeiro + último nome iguais; nome do relógio cortado (30 letras);
     erro de digitação (até 2 letras) quando só há um candidato; ou nome curto na escala (ex.: "Elian") quando só um nome do ponto começa assim */
  function acha(nome, emps) {
    const n = norm(nome);
    let e = emps.find((x) => norm(x.name) === n) || emps.find((x) => aliasDe(x).includes(n));
    if (e) return e;
    const tk = n.split(' '),
      f = tk[0],
      u = tk[tk.length - 1];
    const c = emps.filter((x) => {
      const t = norm(x.name).split(' ');
      return t[0] === f && t[t.length - 1] === u;
    });
    if (c.length === 1) return c[0];
    /* quem já tem nome igual no ponto não entra nas aproximações (evita confundir pessoas parecidas) */
    const livre = (x) => !nomesPonto.includes(norm(x.name)) && !aliasDe(x).length;
    if (n.length >= 26) {
      const t = emps.filter((x) => livre(x) && norm(x.name).startsWith(n));
      if (t.length === 1) return t[0];
    }
    if (n.length >= 12) {
      const t = emps.filter((x) => {
        const m = norm(x.name);
        return livre(x) && Math.abs(m.length - n.length) <= 2 && lev(m, n) <= 2;
      });
      if (t.length === 1) return t[0];
    }
    if (nomesPonto.length) {
      const t = emps.filter((x) => {
        const m = norm(x.name).split(' ');
        return livre(x) && m.length < tk.length && m.every((p, k) => p === tk[k]) && nomesPonto.filter((o) => o.split(' ').slice(0, m.length).join(' ') === m.join(' ')).length === 1;
      });
      if (t.length === 1) return t[0];
    }
    return null;
  }

  /* data (aaaa-mm-dd) -> {wi, key} dentro do ciclo de 4 semanas */
  function diaNaEscala(isoD) {
    for (let wi = 0; wi < 4; wi++) {
      const d = DAYS.find((x) => iso(date(x[0], wi)) === isoD);
      if (d) return { wi, key: d[0] };
    }
    return null;
  }

  function analisa(afd, isoD) {
    const pos = diaNaEscala(isoD),
      dia = afd.punches[isoD] || {},
      res = { iso: isoD, pos, linhas: [], fora: [] };
    if (!pos) return res;
    const w = sector().weeks[pos.wi],
      emps = w.employees,
      ultimaData = afd.dias[afd.dias.length - 1],
      todas = Object.values(dia).flat(),
      corte = todas.length ? Math.max(...todas) : 0,
      diaCompleto = isoD < ultimaData;
    const usados = new Set();
    Object.entries(dia).forEach(([pis, v]) => {
      const e = acha(afd.names[pis] || '', emps);
      if (!e) {
        res.fora.push({ nome: afd.names[pis] || 'PIS ' + pis, v });
        return;
      }
      usados.add(e);
      res.linhas.push(linha(e, w, pos, v, corte, diaCompleto));
    });
    emps.forEach((e) => {
      if (usados.has(e)) return;
      const l = linha(e, w, pos, [], corte, diaCompleto);
      res.linhas.push(l);
    });
    const peso = { erro: 0, atenção: 1, ok: 2, info: 3 };
    res.linhas.sort((a, b) => peso[a.nivel] - peso[b.nivel] || a.nome.localeCompare(b.nome));
    return res;
  }

  function linha(e, w, pos, v, corte, diaCompleto) {
    const key = pos.key,
      out = { nome: e.name, batidas: v, prev: '', alertas: [], nivel: 'ok', saldo: null };
    const aus = ausente(e, key, pos.wi);
    let st = null,
      en = null,
      ls = null,
      le = null,
      carga = workDuration(w.model, pos.wi);
    const folga = closedDay(key, pos.wi) || (key === 'domingo' ? !e.sundayWork : effOff(e).includes(key));
    if (aus) {
      out.prev = AUS_TIPOS[aus.tipo] || 'Afastamento';
      if (v.length) out.alertas.push(['atenção', 'Bateu ponto durante ' + out.prev.toLowerCase()]);
    } else if (folga) {
      out.prev = closedDay(key, pos.wi) ? 'Loja fechada (feriado)' : 'Folga';
      if (v.length) out.alertas.push(['atenção', 'Bateu ponto no dia de folga']);
    } else if (key === 'domingo') {
      const pl = sundayPlan(w);
      st = pl.st;
      en = pl.en;
      if (pl.brk) [ls, le] = pl.brk;
      carga = pl.work;
      out.prev = hh(st) + '–' + hh(en) + (pl.brk ? ' (almoço ' + hh(ls) + '–' + hh(le) + ')' : '');
    } else {
      const s = w.shifts[e.shift];
      st = mins(s.start);
      en = mins(s.end);
      ls = mins(s.lunchStart);
      le = mins(s.lunchEnd);
      out.prev = s.start + '–' + s.end + ' (almoço ' + s.lunchStart + '–' + s.lunchEnd + ')';
    }
    if (st !== null) {
      if (!v.length) {
        if (diaCompleto || corte > st + 60) out.alertas.push(['erro', 'Sem nenhuma batida (faltou ou não bateu o ponto)']);
      } else {
        if (v[0] > st + TOL) out.alertas.push(['atenção', 'Chegou ' + hh(v[0]) + ' (' + (v[0] - st) + ' min depois das ' + hh(st) + ')']);
        const pares = [];
        for (let i = 0; i + 1 < v.length; i += 2) pares.push([v[i], v[i + 1]]);
        const ints = [];
        for (let i = 1; i + 1 < v.length; i += 2) ints.push(v[i + 1] - v[i]);
        const aberto = v.length % 2 === 1;
        pares.forEach(([a, b]) => b - a > 360 && out.alertas.push(['erro', 'Mais de 6h seguidas sem pausa (' + hh(a) + '–' + hh(b) + ')']));
        if (ints.length) {
          const a = Math.max(...ints);
          if (a > 120) out.alertas.push(['erro', 'Almoço de ' + dur(a) + ' (' + (a - 120) + ' min acima de 2h)']);
          else if (a < 110 && carga > 360) out.alertas.push(['atenção', 'Almoço de ' + dur(a) + ' (abaixo de 1h50)']);
          ints.filter((x) => x !== a).forEach((x) => out.alertas.push(['info', 'Pausa extra de ' + dur(x)]));
        }
        if (aberto) {
          if (diaCompleto) out.alertas.push(['atenção', 'Batida ímpar: falta a saída (última ' + hh(v[v.length - 1]) + ')']);
          else if (!ints.length && v[0] + 360 < corte) out.alertas.push(['erro', 'Desde ' + hh(v[0]) + ' sem pausa registrada']);
        } else {
          const trab = pares.reduce((t, [a, b]) => t + (b - a), 0);
          out.saldo = trab - carga;
          if (v.length === 2 && carga > 360 && trab < carga - 60 && !diaCompleto) out.alertas.push(['info', 'Em intervalo desde ' + hh(v[1])]);
          else {
            if (trab > 360 && !ints.length) out.alertas.push(['erro', 'Trabalhou ' + dur(trab) + ' sem intervalo']);
            if (out.saldo > 90) out.alertas.push(['erro', 'Hora extra de ' + dur(out.saldo) + ' (máx. 1h30)']);
            else if (out.saldo > TOL) out.alertas.push(['info', 'Hora extra de ' + dur(out.saldo)]);
            else if (out.saldo < -TOL) out.alertas.push(['atenção', 'Ficou ' + dur(-out.saldo) + ' abaixo da jornada']);
            if (v[v.length - 1] < en - TOL - 15 && out.saldo < -TOL) out.alertas.push(['atenção', 'Saiu ' + hh(v[v.length - 1]) + ', antes das ' + hh(en)]);
          }
        }
      }
    }
    const peso = { erro: 0, atenção: 1, info: 2 };
    out.alertas.sort((a, b) => peso[a[0]] - peso[b[0]]);
    out.nivel = out.alertas.some((a) => a[0] === 'erro') ? 'erro' : out.alertas.some((a) => a[0] === 'atenção') ? 'atenção' : out.alertas.length ? 'info' : 'ok';
    return out;
  }

  let afdAtual = null,
    soProblemas = true;
  function fecha() {
    const o = document.getElementById('afdOv');
    if (o) o.remove();
  }
  function desenha(isoD) {
    fecha();
    const r = analisa(afdAtual, isoD),
      n = (nv) => r.linhas.filter((x) => x.nivel === nv).length;
    const dBr = isoD.split('-').reverse().join('/');
    const opts = afdAtual.dias.map((d) => `<option value="${d}" ${d === isoD ? 'selected' : ''}>${d.split('-').reverse().join('/')}</option>`).join('');
    let corpo;
    if (!r.pos) corpo = `<p class="adm-vazio">O dia ${dBr} está fora das 4 semanas desta escala (${range(0).split(' a ')[0]} a ${range(3).split(' a ')[1]}). Ajuste a data inicial ou escolha outro dia.</p>`;
    else {
      const ls = r.linhas.filter((x) => !soProblemas || x.nivel !== 'ok');
      corpo =
        `<p class="helper">Semana ${r.pos.wi + 1} · ${esc(r.pos.key)} · <b>${n('erro')}</b> erro(s), <b>${n('atenção')}</b> atenção(ões), ${n('ok')} sem problema.</p>` +
        (ls.length
          ? `<div class="afd-scroll"><table class="afd-tbl"><thead><tr><th>Colaboradora</th><th>Escala</th><th>Batidas</th><th>Conferência</th></tr></thead><tbody>${ls
              .map(
                (x) =>
                  `<tr class="afd-${x.nivel}"><td>${esc(x.nome)}</td><td>${esc(x.prev)}</td><td>${x.batidas.map(hh).join(' ') || '—'}${x.saldo !== null ? '<br><small>saldo ' + dur(x.saldo) + '</small>' : ''}</td><td>${x.alertas.map((a) => `<div class="afd-a afd-a-${a[0]}">${esc(a[1])}</div>`).join('') || '✓'}</td></tr>`,
              )
              .join('')}</tbody></table></div>`
          : '<p class="adm-vazio">Nenhum problema encontrado neste dia.</p>') +
        (r.fora.length
          ? `<p class="helper"><b>Bateram ponto e não estão nesta escala (outro setor ou nome diferente):</b> ${r.fora.map((x) => esc(x.nome) + ' (' + x.v.map(hh).join(' ') + ')').join('; ')}</p>`
          : '');
    }
    const o = document.createElement('div');
    o.id = 'afdOv';
    o.className = 'afd-ov';
    o.innerHTML = `<div class="afd-box" role="dialog" aria-label="Conferência do ponto"><div class="afd-top"><h3>Conferir ponto${afdAtual.empresa ? ' · ' + esc(afdAtual.empresa) : ''}</h3><button type="button" class="button outline" id="afdFecha">Fechar</button></div><div class="afd-filtros"><label>Dia <select id="afdDia">${opts}</select></label><label class="check-row"><input type="checkbox" id="afdSo" ${soProblemas ? 'checked' : ''}/> Só quem tem problema</label></div>${corpo}</div>`;
    document.body.appendChild(o);
    o.querySelector('#afdFecha').onclick = fecha;
    o.addEventListener('click', (ev) => ev.target === o && fecha());
    o.querySelector('#afdDia').onchange = (ev) => desenha(ev.target.value);
    o.querySelector('#afdSo').onchange = (ev) => {
      soProblemas = ev.target.checked;
      desenha(isoD);
    };
  }

  window.afdConferir = { parseAfd, analisa, desenha };
  document.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (!t || t.id !== 'afdFile' || !t.files || !t.files[0]) return;
    try {
      const txt = await t.files[0].text();
      afdAtual = parseAfd(txt);
      t.value = '';
      if (!afdAtual.dias.length) return toast('Não encontrei batidas nesse arquivo. Use o AFD do relógio (arquivo .txt).');
      /* abre no último dia que está dentro do ciclo */
      const dentro = afdAtual.dias.filter((d) => diaNaEscala(d));
      desenha(dentro.length ? dentro[dentro.length - 1] : afdAtual.dias[afdAtual.dias.length - 1]);
    } catch (e) {
      toast('Não consegui ler o arquivo: ' + e.message);
    }
  });

  /* ===== importar o AFD para a escala: preenche turno, domingo e folgas das semanas e guarda histórico ===== */
  const HIST_MAX_DIAS = 90;
  const ABR = { domingo: 'dom', segunda: 'seg', terça: 'ter', quarta: 'qua', quinta: 'qui', sexta: 'sex', sábado: 'sáb' };
  const mediana = (a) => {
    const b = [...a].sort((x, y) => x - y);
    return b[Math.floor(b.length / 2)];
  };

  function planejar(afd) {
    const sec = sector(),
      plano = { semanas: [], naoAchados: [], ignoradas: [], dias: afd.dias.filter((d) => diaNaEscala(d)).length };
    const nomesEscala = new Set();
    for (let wi = 0; wi < 4; wi++) {
      const w = sec.weeks[wi];
      if (!w) continue;
      const mudancas = [];
      const diasComDado = DAYS.filter((d) => afd.punches[iso(date(d[0], wi))]);
      if (!diasComDado.length) continue;
      w.employees.forEach((e) => {
        nomesEscala.add(e.name);
        const pisDe = Object.keys(afd.names).filter((pis) => acha(afd.names[pis], [e]));
        const m = { nome: e.name, wi, e, shift: null, dom: null, offs: null, nota: [] };
        const firsts = [],
          sem = {};
        DAYS.forEach((d) => {
          const di = iso(date(d[0], wi)),
            dia = afd.punches[di];
          if (!dia) return;
          const v = pisDe.map((p) => dia[p]).find(Boolean) || [];
          sem[d[0]] = v;
          if (v.length && d[0] !== 'domingo') firsts.push(v[0]);
        });
        if (!pisDe.length) return;
        /* turno: o mais próximo da entrada típica */
        if (firsts.length && e.fixo === undefined && !ausente(e, 'segunda', wi)) {
          const f = mediana(firsts);
          let best = 0,
            bd = 1e9;
          w.shifts.forEach((s, j) => {
            const dd = Math.abs(mins(s.start) - f);
            if (dd < bd) ((bd = dd), (best = j));
          });
          if (bd <= 90 && best !== e.shift) m.shift = best;
        }
        /* domingo */
        if (sem.domingo !== undefined && !ausente(e, 'domingo', wi) && !closedDay('domingo', wi)) {
          const trab = sem.domingo.length > 0;
          if (trab !== !!e.sundayWork) m.dom = trab;
        }
        /* folgas: dia com movimento na loja em que a pessoa não bateu nada */
        if (!e.folgaFixa) {
          const dom = m.dom !== null ? m.dom : !!e.sundayWork;
          const offs = DAYS.filter((d) => d[0] !== 'domingo' && sem[d[0]] !== undefined && !sem[d[0]].length && !ausente(e, d[0], wi) && !closedDay(d[0], wi)).map((d) => d[0]);
          const lim = offLimit({ ...e, sundayWork: dom }, w.model);
          const atual = [...e.offDays].sort().join();
          if (offs.length && offs.length <= lim && offs.sort().join() !== atual) m.offs = offs;
          else if (offs.length > lim) m.nota.push('faltou/folgou em ' + offs.length + ' dias (limite ' + lim + ')');
        }
        if (m.shift !== null || m.dom !== null || m.offs || m.nota.length) mudancas.push(m);
      });
      plano.semanas.push({ wi, mudancas });
    }
    /* quem bateu e não está em nenhuma semana */
    const vistos = new Set();
    Object.values(afd.punches).forEach((o) => Object.keys(o).forEach((p) => vistos.add(p)));
    const emps = sec.weeks[0].employees;
    vistos.forEach((p) => {
      const n = afd.names[p] || 'PIS ' + p;
      if (!acha(n, emps)) plano.naoAchados.push(n);
    });
    plano.naoAchados = [...new Set(plano.naoAchados)].sort();
    return plano;
  }

  function guardaHistorico(afd) {
    const sec = sector(),
      emps = sec.weeks[0].employees,
      h = sec.ponto && typeof sec.ponto === 'object' ? sec.ponto : {};
    Object.entries(afd.punches).forEach(([d, o]) => {
      Object.entries(o).forEach(([pis, v]) => {
        const e = acha(afd.names[pis] || '', emps);
        if (!e) return;
        (h[d] = h[d] || {})[e.name] = v;
      });
    });
    const dias = Object.keys(h).sort();
    dias.slice(0, Math.max(0, dias.length - HIST_MAX_DIAS)).forEach((d) => delete h[d]);
    sec.ponto = h;
    return Object.keys(h).length;
  }

  /* ===== conferir nomes: liga quem está sem par no ponto e adiciona quem bateu e não está na escala ===== */
  const PLACEHOLDER = /^colaboradora \d+$/i;
  function conferirNomes(afd) {
    return new Promise((resolve) => {
      const sec = sector(),
        emps = sec.weeks[0].employees,
        sel = state.selectedSector;
      const idxDe = (e) => emps.indexOf(e);
      /* quem do ponto já tem par; quem sobra */
      const usados = new Set(),
        parDe = {};
      Object.keys(afd.names).forEach((pis) => {
        const e = acha(afd.names[pis], emps);
        if (e) {
          usados.add(e);
          parDe[pis] = e;
        }
      });
      const semPar = emps.filter((e) => !usados.has(e));
      const ultimo = afd.dias[afd.dias.length - 1],
        corte = new Date(new Date(ultimo + 'T12:00:00').getTime() - 45 * 864e5).toISOString().slice(0, 10);
      const outros = new Set();
      Object.keys(state.roster || {}).forEach((k) => {
        if (k !== sel) (state.roster[k] || []).forEach((r) => r && r.name && !PLACEHOLDER.test(r.name) && outros.add(norm(r.name)));
      });
      const dias = {},
        ultimoBate = {};
      const corteInativo = new Date(new Date(ultimo + 'T12:00:00').getTime() - 15 * 864e5).toISOString().slice(0, 10);
      Object.entries(afd.punches).forEach(([d, o]) => {
        if (d < corte) return;
        Object.keys(o).forEach((p) => {
          dias[p] = (dias[p] || 0) + 1;
          if (!ultimoBate[p] || d > ultimoBate[p]) ultimoBate[p] = d;
        });
      });
      const vistos = new Set(),
        sobras = [];
      let deOutros = 0;
      Object.keys(dias).forEach((pis) => {
        if (parDe[pis]) return;
        const nome = afd.names[pis] || 'PIS ' + pis,
          k = norm(nome);
        if (vistos.has(k)) return;
        vistos.add(k);
        if (outros.has(k)) {
          deOutros++;
          return;
        }
        sobras.push({ nome, k, dias: dias[pis], inativo: ultimoBate[pis] < corteInativo });
      });
      sobras.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
      const lista = [...new Set(Object.values(afd.names))].sort((x, y) => x.localeCompare(y, 'pt-BR'));
      const postos = hasPosts() ? postKeys() : [];
      const marcados = new Map(); /* norm -> {nome, posto} */
      const similares = (nome) => {
        const t = norm(nome).split(' ');
        return sobras.filter((s) => { const u = s.k.split(' '); return u[0] === t[0] || (t.length > 1 && u.length > 1 && u[u.length - 1] === t[t.length - 1]); }).slice(0, 5);
      };
      let ignoraInativos = true;
      try {
        ignoraInativos = localStorage.getItem('afdIgnoraInativos') !== '0';
      } catch (e) {}
      const o = document.createElement('div');
      o.id = 'afdNomesOv';
      o.className = 'afd-ov';
      const linhasPar = semPar
        .map((e) => {
          const i = idxDe(e),
            ph = PLACEHOLDER.test(e.name);
          const sug = ph ? [] : similares(e.name);
          return `<div class="nm-row" data-i="${i}"><b>${esc(e.name)}</b><input type="text" list="nmLista" data-nm-par="${i}" placeholder="nome no ponto (digite para buscar)" autocomplete="off" />${
            sug.length ? `<span class="nm-sug">${sug.map((s) => `<button type="button" class="chip-sug" data-nm-sug="${i}" data-v="${esc(s.nome)}">${esc(s.nome)}</button>`).join('')}</span>` : ''
          }</div>`;
        })
        .join('');
      o.innerHTML = `<div class="afd-box" role="dialog" aria-label="Conferir nomes do ponto"><div class="afd-top"><h3>Conferir nomes do ponto · ${esc(SECTORS[sel])}</h3><button type="button" class="button outline" id="nmCancela">Cancelar</button></div>
        <p class="helper">O arquivo tem ${lista.length} pessoas; <b>${usados.size}</b> da equipe deste setor foram reconhecidas. O app liga pelo nome (aceita nome cortado, 1–2 letras trocadas e nome curto).</p>
        ${
          semPar.length
            ? `<h4 class="nm-h">Da escala, sem par no ponto (${semPar.length})</h4><p class="helper">Digite o nome dela como aparece no relógio. Quem ainda se chama "Colaboradora N" passa a ter o nome do ponto. Se a pessoa não bateu ponto nesse período, deixe em branco.</p><div class="nm-par">${linhasPar}</div>`
            : '<p class="helper">Todas as pessoas da escala foram encontradas no ponto. ✔</p>'
        }
        <h4 class="nm-h">Bateram ponto e não estão na escala</h4>
        <p class="helper">Marque só quem é <b>deste setor</b> para adicionar na equipe (nas 4 semanas)${deOutros ? ` · ${deOutros} já estão na equipe de outros setores e não aparecem aqui` : ''}. Mostra quem bateu ponto nos últimos 45 dias do arquivo.</p>
        <label class="nm-inativos"><input type="checkbox" id="nmIgnoraInativos" ${ignoraInativos ? 'checked' : ''} /> Ignorar quem não bate ponto há mais de 15 dias <small id="nmInativosQtd"></small></label>
        <input type="search" id="nmBusca" placeholder="Buscar nome…" autocomplete="off" />
        <div class="nm-sobras" id="nmSobras"></div>
        <datalist id="nmLista">${lista.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>
        <div class="nm-acoes"><span id="nmResumo" class="helper"></span><button type="button" class="button" id="nmOk">Continuar a importação</button></div></div>`;
      document.body.appendChild(o);
      const box = o.querySelector('.afd-box');
      const fim = (r) => {
        o.remove();
        resolve(r);
      };
      const desenhaSobras = () => {
        const q = norm(o.querySelector('#nmBusca').value),
          nInat = sobras.filter((s) => s.inativo && !marcados.has(s.k)).length,
          fil = sobras.filter((s) => (!q || s.k.includes(q)) && !(ignoraInativos && s.inativo && !marcados.has(s.k))),
          mostra = fil.slice(0, 60);
        o.querySelector('#nmSobras').innerHTML =
          (mostra
            .map((s) => {
              const m = marcados.get(s.k);
              return `<div class="nm-item"><label><input type="checkbox" data-nm-add="${esc(s.k)}" ${m ? 'checked' : ''} /> ${esc(s.nome)} <small>${s.dias} dia(s)</small></label>${
                postos.length ? `<select data-nm-post="${esc(s.k)}" aria-label="Posto de ${esc(s.nome)}">${postos.map((k) => `<option value="${k}" ${(m ? m.posto : postos[0]) === k ? 'selected' : ''}>${esc(POST_NAMES[k] || k)}</option>`).join('')}</select>` : ''
              }</div>`;
            })
            .join('') || '<p class="adm-vazio">Ninguém encontrado.</p>') + (fil.length > mostra.length ? `<p class="helper">Mostrando ${mostra.length} de ${fil.length}; use a busca para achar o resto.</p>` : '');
        o.querySelector('#nmInativosQtd').textContent = nInat ? (ignoraInativos ? `(${nInat} escondido${nInat > 1 ? 's' : ''})` : `(${nInat} inativo${nInat > 1 ? 's' : ''} na lista)`) : '';
        o.querySelector('#nmResumo').textContent = marcados.size ? marcados.size + ' para adicionar' : '';
      };
      desenhaSobras();
      o.querySelector('#nmBusca').oninput = desenhaSobras;
      o.querySelector('#nmIgnoraInativos').onchange = (ev) => {
        ignoraInativos = ev.target.checked;
        try {
          localStorage.setItem('afdIgnoraInativos', ignoraInativos ? '1' : '0');
        } catch (e) {}
        desenhaSobras();
      };
      box.addEventListener('change', (ev) => {
        const t = ev.target;
        if (t.dataset.nmAdd !== undefined) {
          const s = sobras.find((x) => x.k === t.dataset.nmAdd),
            sp = box.querySelector(`[data-nm-post="${CSS.escape(t.dataset.nmAdd)}"]`);
          t.checked ? marcados.set(s.k, { nome: s.nome, posto: sp ? sp.value : postos[0] }) : marcados.delete(s.k);
          o.querySelector('#nmResumo').textContent = marcados.size ? marcados.size + ' para adicionar' : '';
        } else if (t.dataset.nmPost !== undefined && marcados.has(t.dataset.nmPost)) marcados.get(t.dataset.nmPost).posto = t.value;
      });
      box.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-nm-sug]');
        if (b) {
          const inp = box.querySelector(`[data-nm-par="${b.dataset.nmSug}"]`);
          inp.value = b.dataset.v;
          inp.classList.remove('nm-erro');
        }
      });
      o.querySelector('#nmCancela').onclick = () => fim('cancela');
      o.querySelector('#nmOk').onclick = () => {
        /* valida os nomes digitados */
        const pares = [];
        let erro = false;
        box.querySelectorAll('[data-nm-par]').forEach((inp) => {
          inp.classList.remove('nm-erro');
          const v = inp.value.trim();
          if (!v) return;
          const nome = lista.find((x) => norm(x) === norm(v));
          if (!nome) {
            inp.classList.add('nm-erro');
            erro = true;
          } else pares.push({ i: +inp.dataset.nmPar, nome });
        });
        if (erro) return toast('Algum nome não está no arquivo do ponto: escolha um da lista.');
        const mudou = pares.length || marcados.size;
        if (!mudou) return fim('ok');
        const snap = { at: new Date().toISOString(), weeks: clone(sec.weeks), roster: clone((state.roster && state.roster[sel]) || []) };
        const r = roster();
        pares.forEach(({ i, nome }) => {
          const ph = PLACEHOLDER.test(r[i].name);
          if (ph) r[i].name = nomeBonito(nome);
          r[i].afdNome = [...new Set([...(r[i].afdNome || []), norm(nome)])];
        });
        normalize();
        marcados.forEach((m) => {
          const antes = sector().weeks[0].employees.length;
          addEmployee(m.posto, m.nome);
          const n = sector().weeks[0].employees.length - 1;
          if (n >= antes) {
            roster()[n].name = nomeBonito(m.nome);
            roster()[n].afdNome = [norm(m.nome)];
          }
        });
        normalize();
        state.undo = { ...(state.undo || {}), [sel]: snap };
        fim('mudou');
      };
    });
  }

  async function importarAfd(file) {
    try {
      const afd = parseAfd(await file.text());
      if (!afd.dias.length) return toast('Não encontrei batidas nesse arquivo. Use o AFD do relógio (arquivo .txt).');
      const nomes = await conferirNomes(afd);
      if (nomes === 'cancela') return;
      const plano = planejar(afd),
        nMud = plano.semanas.reduce((t, s) => t + s.mudancas.filter((m) => m.shift !== null || m.dom !== null || m.offs).length, 0);
      const linhas = plano.semanas
        .map((s) => s.mudancas.filter((m) => m.shift !== null || m.dom !== null || m.offs).map((m) => 'S' + (s.wi + 1) + ' ' + m.nome))
        .flat();
      const avisos = plano.semanas.flatMap((s) => s.mudancas.filter((m) => m.nota.length).map((m) => 'S' + (s.wi + 1) + ' ' + m.nome + ': ' + m.nota.join('; ')));
      let msg = 'Arquivo do ponto: ' + afd.dias.length + ' dia(s) (' + afd.dias[0].split('-').reverse().join('/') + ' a ' + afd.dias[afd.dias.length - 1].split('-').reverse().join('/') + '). ';
      msg += nMud ? 'Vou atualizar turno, domingo e folgas de ' + nMud + ' registro(s) nas semanas (' + linhas.slice(0, 6).join(', ') + (linhas.length > 6 ? '…' : '') + ') ' : 'Nenhuma semana precisa mudar ';
      msg += 'e guardar o histórico do ponto desta equipe. ';
      if (plano.naoAchados.length) msg += 'Fora da equipe deste setor (não importados; abra o setor certo para eles): ' + plano.naoAchados.slice(0, 8).join(', ') + (plano.naoAchados.length > 8 ? '…' : '') + '. ';
      if (avisos.length) msg += 'Atenção: ' + avisos.slice(0, 3).join(' | ') + '. ';
      msg += 'Dá para desfazer depois.';
      if (!(await askConfirm(msg))) {
        if (nomes === 'mudou') {
          render();
          toast('Nomes ajustados, mas a importação foi cancelada. Dá para desfazer em "Desfazer em lote".');
        }
        return;
      }
      if (nomes !== 'mudou') snapDesfazer();
      const n = guardaHistorico(afd);
      guardaRealizado(afd);
      sector().weeks.forEach(normalizeWeek);
      aplicaRealizado();
      render();
      toast('Ponto importado: ' + nMud + ' ajuste(s) na escala · histórico com ' + n + ' dia(s).', true);
    } catch (e) {
      toast('Não consegui ler o arquivo: ' + e.message);
    }
  }

  function historico() {
    fecha();
    const h = sector().ponto || {},
      dias = Object.keys(h).sort().slice(-31),
      nomes = [...new Set(dias.flatMap((d) => Object.keys(h[d])))].sort();
    const o = document.createElement('div');
    o.id = 'afdOv';
    o.className = 'afd-ov';
    const cab = dias.map((d) => `<th>${d.slice(8)}/${d.slice(5, 7)}</th>`).join('');
    const lin = nomes
      .map((n) => `<tr><td>${esc(n)}</td>${dias.map((d) => { const v = h[d][n]; return `<td>${v && v.length ? hh(v[0]) + '<br><small>' + hh(v[v.length - 1]) + '</small>' : '—'}</td>`; }).join('')}</tr>`)
      .join('');
    o.innerHTML = `<div class="afd-box" role="dialog" aria-label="Histórico do ponto"><div class="afd-top"><h3>Histórico do ponto</h3><button type="button" class="button outline" id="afdFecha">Fechar</button></div>${
      dias.length ? `<p class="helper">Primeira e última batida de cada dia (últimos ${dias.length} dias guardados).</p><div class="afd-scroll"><table class="afd-tbl"><thead><tr><th>Colaboradora</th>${cab}</tr></thead><tbody>${lin}</tbody></table></div>` : '<p class="adm-vazio">Ainda não há histórico. Importe o AFD em “Importar planilha…”.</p>'
    }</div>`;
    document.body.appendChild(o);
    o.querySelector('#afdFecha').onclick = fecha;
    o.addEventListener('click', (ev) => ev.target === o && fecha());
  }

  window.afdImportar = importarAfd;
  window.afdHistorico = historico;
  window.afdPlanejar = planejar;
  document.addEventListener('click', (ev) => ev.target.closest && ev.target.closest('#histPontoBtn') && historico());

  /* ===== semanas realizadas: o que o ponto mostra substitui o plano naquela data; o plano fica guardado ===== */
  const REAL_MAX_DIAS = 120;
  const diaKey = (S, d) => {
    const diff = Math.round((new Date(d + 'T12:00:00') - new Date(S + 'T12:00:00')) / 864e5);
    const x = DAYS.find((k) => k[2] === diff);
    return x ? x[0] : null;
  };
  function guardaRealizado(afd) {
    const sec = sector(),
      emps = sec.weeks[0].employees,
      R = sec.realizado && typeof sec.realizado === 'object' ? sec.realizado : {},
      pisPorNome = {};
    Object.keys(afd.names).forEach((pis) => {
      const e = acha(afd.names[pis], emps);
      if (e) (pisPorNome[e.name] = pisPorNome[e.name] || []).push(pis);
    });
    const comPonto = new Set();
    Object.values(afd.punches).forEach((o) => Object.keys(o).forEach((p) => comPonto.add(p)));
    afd.dias.forEach((d) => {
      const S = monday(d),
        r = (R[S] = R[S] || { cobertos: [], pessoas: {} });
      if (!r.cobertos.includes(d)) r.cobertos.push(d);
      Object.entries(pisPorNome).forEach(([nome, pl]) => {
        if (!pl.some((p) => comPonto.has(p))) return;
        const v = pl.map((p) => (afd.punches[d] || {})[p]).find(Boolean) || [];
        (r.pessoas[nome] = r.pessoas[nome] || {})[d] = v;
      });
    });
    const ks = Object.keys(R).sort();
    ks.slice(0, Math.max(0, ks.length - Math.ceil(REAL_MAX_DIAS / 7))).forEach((k) => delete R[k]);
    sec.realizado = R;
  }
  function restauraPlano(w) {
    if (w.realizada && w.planoAntes) w.employees.forEach((e, i) => w.planoAntes[i] && Object.assign(e, { shift: w.planoAntes[i].shift, sundayWork: w.planoAntes[i].sundayWork, offDays: [...w.planoAntes[i].offDays] }));
    delete w.planoAntes;
    delete w.realizada;
    delete w.realizadaLiberada;
  }
  function aplicaRealizado() {
    const sec = sector();
    sec.weeks.forEach((w, wi) => {
      const S = iso(date('domingo', wi)),
        r = sec.realizado && sec.realizado[S];
      if (!r) {
        if (w.realizada) restauraPlano(w);
        return;
      }
      if (!w.realizada) {
        w.planoAntes = w.employees.map((e) => ({ shift: e.shift, sundayWork: !!e.sundayWork, offDays: [...e.offDays] }));
        w.realizada = true;
      }
      w.employees.forEach((e) => {
        const p = r.pessoas[e.name];
        if (!p) return;
        const dias = Object.keys(p);
        const firsts = dias.filter((d) => d !== S && p[d].length).map((d) => p[d][0]);
        if (firsts.length && e.fixo === undefined && !ausente(e, 'segunda', wi)) {
          const f = mediana(firsts);
          let best = e.shift,
            bd = 1e9;
          w.shifts.forEach((sh, j) => {
            const dd = Math.abs(mins(sh.start) - f);
            if (dd < bd) ((bd = dd), (best = j));
          });
          if (bd <= 90) e.shift = best;
        }
        if (p[S] !== undefined && !ausente(e, 'domingo', wi) && !closedDay('domingo', wi)) e.sundayWork = p[S].length > 0;
        if (!e.folgaFixa) {
          const cov = [],
            offs = [];
          dias.forEach((d) => {
            const k = diaKey(S, d);
            if (!k || k === 'domingo') return;
            cov.push(k);
            if (!p[d].length && !ausente(e, k, wi) && !closedDay(k, wi)) offs.push(k);
          });
          const lim = offLimit(e, w.model);
          e.offDays = [...new Set([...offs, ...e.offDays.filter((x) => !cov.includes(x))])].slice(0, Math.max(lim, 0));
        }
      });
    });
  }
  function restauraTodos() {
    Object.values(state.sectors).forEach((sec) => sec && sec.weeks && sec.weeks.forEach(restauraPlano));
  }
  function troca(novo) {
    const velho = state.baseMonday;
    if (novo === velho) return;
    const tem = Object.values(state.sectors).some((x) => x && x.realizado && Object.keys(x.realizado).length);
    if (!tem) {
      state.baseMonday = novo;
      return;
    }
    const orig = state.selectedSector;
    Object.keys(state.sectors).forEach((k) => {
      const sec = state.sectors[k];
      if (!sec || !sec.weeks) return;
      sec.weeks.forEach(restauraPlano);
      sec.planos = sec.planos || {};
      sec.planos[velho] = clone(sec.weeks);
      if (sec.planos[novo]) sec.weeks = clone(sec.planos[novo]);
      const ks = Object.keys(sec.planos).sort();
      ks.slice(0, Math.max(0, ks.length - 8)).forEach((x) => delete sec.planos[x]);
    });
    state.baseMonday = novo;
    Object.keys(state.sectors).forEach((k) => {
      if (!state.sectors[k] || !state.sectors[k].weeks) return;
      state.selectedSector = k;
      state.sectors[k].weeks.forEach(normalizeWeek);
      aplicaRealizado();
    });
    state.selectedSector = orig;
  }
  function aplicaTodos() {
    const orig = state.selectedSector;
    Object.keys(state.sectors).forEach((k) => {
      if (!state.sectors[k] || !state.sectors[k].weeks) return;
      state.selectedSector = k;
      state.sectors[k].weeks.forEach(normalizeWeek);
      aplicaRealizado();
    });
    state.selectedSector = orig;
  }
  window.afdRealizado = { guardaRealizado, aplicaRealizado, restauraTodos, troca, restauraPlano, aplicaTodos };
})();
