/* Visão geral: todas as setores de uma vez (escala da semana, pendências e resumo do ciclo de cada setor).
   Abre pela opção "Todos os setores" do seletor de setor. Clicar em "Abrir setor" ou trocar o setor aqui muda o setor ativo. */
(function () {
  const sel = document.getElementById('sectorSelect');
  if (!sel) return;
  const OPT = '__todos';
  const o = document.createElement('option');
  o.value = OPT;
  o.textContent = '★ Todos os setores (visão geral)';
  sel.insertBefore(o, sel.firstChild);
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let semana = null;

  /* roda fn com o setor k como ativo e volta ao setor de antes */
  function como(k, fn) {
    const orig = state.selectedSector;
    state.selectedSector = k;
    try {
      return fn();
    } catch (e) {
      return null;
    } finally {
      state.selectedSector = orig;
    }
  }

  function bloco(k) {
    const r = como(k, () => {
      sector();
      const w = week(),
        wi = state.selectedWeek;
      let pend = { erro: 0, atenção: 0 };
      try {
        compliance().forEach((x) => {
          if (pend[x.level] !== undefined) pend[x.level]++;
        });
      } catch (e) {}
      const emps = [...w.employees].sort((a, b) => a.shift - b.shift || a.name.localeCompare(b.name, 'pt-BR'));
      const linhas = emps
        .map((e) => {
          const s = w.shifts[e.shift] || {};
          const aus = ausente(e, 'segunda', wi);
          return `<tr><td>${esc(e.name)}${cadTurno(e)}</td><td>${esc(s.name || '')}</td><td>${s.start || ''}–${s.end || ''}</td><td>${esc(offText(e))}</td></tr>`;
        })
        .join('');
      let ciclo = '';
      try {
        ciclo = resumoCiclo()
          .map((c) => `<tr><td>${esc(c.name)}</td><td>${c.domT}</td><td>${c.domF}</td><td>${c.folgas}</td><td>${c.dias}</td><td>${hm(c.min)}</td></tr>`)
          .join('');
      } catch (e) {}
      const cob = w.shifts.map((s, i) => `${esc(s.name)} ${s.start}: ${w.employees.filter((e) => e.shift === i).length}`).join(' · ');
      return { n: w.employees.length, pend, linhas, ciclo, cob, modelo: w.model };
    });
    if (!r) return '';
    const tag = r.pend.erro ? `<span class="vg-tag erro">${r.pend.erro} erro(s)</span>` : '';
    const tag2 = r.pend['atenção'] ? `<span class="vg-tag aten">${r.pend['atenção']} atenção</span>` : '';
    const ok = !r.pend.erro && !r.pend['atenção'] ? '<span class="vg-tag ok">sem pendências</span>' : '';
    return `<section class="vg-bloco"><div class="vg-cab"><h3>${esc(SECTORS[k])}</h3><span class="vg-meta">${r.n} colaboradoras · ${r.modelo}</span>${tag}${tag2}${ok}<button type="button" class="button outline" data-vg-abrir="${k}">Abrir setor</button></div>
      <p class="helper">${r.cob}</p>
      <div class="afd-scroll"><table class="afd-tbl"><thead><tr><th>Colaboradora</th><th>Turno</th><th>Horário</th><th>Folgas</th></tr></thead><tbody>${r.linhas}</tbody></table></div>
      <details><summary>Análise individual do ciclo (4 semanas)</summary><div class="afd-scroll"><table class="afd-tbl"><thead><tr><th>Colaboradora</th><th>Dom. trab.</th><th>Dom. folga</th><th>Folgas</th><th>Dias</th><th>Horas</th></tr></thead><tbody>${r.ciclo}</tbody></table></div></details></section>`;
  }

  function fecha() {
    const x = document.getElementById('vgOv');
    if (x) x.remove();
  }
  function abre() {
    fecha();
    if (semana === null) semana = state.selectedWeek;
    state.selectedWeek = semana;
    const ks = Object.keys(SECTORS);
    const tabs = [0, 1, 2, 3].map((i) => `<button type="button" class="period-tab ${i === semana ? 'active' : ''}" data-vg-sem="${i}">Semana ${i + 1}<small>${range(i)}</small></button>`).join('');
    const el = document.createElement('div');
    el.id = 'vgOv';
    el.className = 'afd-ov vg-ov';
    el.innerHTML = `<div class="afd-box vg-box" role="dialog" aria-label="Todos os setores"><div class="afd-top"><h3>Todos os setores</h3><button type="button" class="button outline" id="vgFecha">Fechar</button></div><div class="period-tabs vg-tabs">${tabs}</div>${ks.map(bloco).join('')}</div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (ev) => {
      const t = ev.target;
      if (t === el || t.id === 'vgFecha') return fecha();
      const s = t.closest && t.closest('[data-vg-sem]');
      if (s) {
        semana = +s.dataset.vgSem;
        return abre();
      }
      const a = t.closest && t.closest('[data-vg-abrir]');
      if (a) {
        state.selectedSector = a.dataset.vgAbrir;
        state.selectedWeek = semana;
        fecha();
        render();
        window.scrollTo(0, 0);
      }
    });
  }
  /* captura antes do app.js, que trataria "__todos" como se fosse um setor */
  document.addEventListener(
    'change',
    (ev) => {
      if (ev.target.id !== 'sectorSelect' || ev.target.value !== OPT) return;
      ev.stopImmediatePropagation();
      ev.target.value = state.selectedSector;
      semana = null;
      abre();
    },
    true,
  );
  window.visaoGeral = { abre, fecha };
})();
