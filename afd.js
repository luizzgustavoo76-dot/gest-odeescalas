/* Conferência do ponto: importa o arquivo AFD do relógio (Portaria 1510 ou 671) e compara com a escala aberta.
   Tudo é lido no navegador; o arquivo não é enviado a lugar nenhum. */
(function () {
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const hh = (n) => pad(Math.floor(n / 60)) + ':' + pad(n % 60);
  const dur = (n) => (n < 0 ? '-' : '') + Math.floor(Math.abs(n) / 60) + 'h' + pad(Math.abs(n) % 60);
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const TOL = 10; /* tolerância CLT de 10 min por dia */

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
    return { names, punches, empresa, dias: Object.keys(punches).sort() };
  }

  /* acha o nome do AFD na equipe: igual, ou primeiro + último nome iguais */
  function acha(nome, emps) {
    const n = norm(nome);
    let e = emps.find((x) => norm(x.name) === n);
    if (e) return e;
    const tk = n.split(' '),
      f = tk[0],
      u = tk[tk.length - 1];
    const c = emps.filter((x) => {
      const t = norm(x.name).split(' ');
      return t[0] === f && t[t.length - 1] === u;
    });
    return c.length === 1 ? c[0] : null;
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

  async function importarAfd(file) {
    try {
      const afd = parseAfd(await file.text());
      if (!afd.dias.length) return toast('Não encontrei batidas nesse arquivo. Use o AFD do relógio (arquivo .txt).');
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
      if (!(await askConfirm(msg))) return;
      snapDesfazer();
      plano.semanas.forEach((s) =>
        s.mudancas.forEach((m) => {
          if (m.shift !== null) m.e.shift = m.shift;
          if (m.dom !== null) m.e.sundayWork = m.dom;
          if (m.offs) m.e.offDays = m.offs;
        }),
      );
      const n = guardaHistorico(afd);
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
})();
