/* Terminal General — Portfolios Module */
const Modules = window.Modules || {};

Modules.renderPortfolios = function() {
  const all = DataManager.Portfolios.getAll();
  const grid = App.$('portfolios-grid');
  const empty = App.$('portfolios-empty');
  if (!all.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#00d4aa','#ec4899','#8b5cf6'];
  grid.innerHTML = all.map(p => {
    const m = DataManager.Portfolios.computeMetrics(p);
    const strats = (p.strategies||[]).map((ps,i) => {
      const s = DataManager.Strategies.getById(ps.strategyId);
      return s ? { name: s.name, alloc: ps.allocation, color: colors[i % colors.length] } : null;
    }).filter(Boolean);
    const allocBar = strats.map(s => `<div class="pf-alloc-segment" style="width:${s.alloc}%;background:${s.color}" title="${s.name}: ${s.alloc}%"></div>`).join('');
    const stratList = strats.map(s => `<div class="pf-strategy-item"><span>${App.esc(s.name)}</span><span class="mono">${s.alloc}%</span></div>`).join('');
    return `<div class="pf-card" data-id="${p.id}">
      <div class="pf-card-header"><div><div class="pf-card-name">${App.esc(p.name)}</div><div style="font-size:.7rem;color:var(--text-muted)">${m.strategyCount} estrategias · Max Risk: ${p.maxRisk||0}%</div></div>
        <div class="actions-cell"><button class="btn-icon" data-pf-edit="${p.id}" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn-icon danger" data-pf-del="${p.id}" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div>
      ${p.description ? `<div class="pf-card-desc">${App.esc(p.description)}</div>` : ''}
      <div class="pf-metrics">
        <div class="pf-metric"><div class="pf-metric-label">PF</div><div class="pf-metric-value">${m.combinedPF!=null?m.combinedPF.toFixed(2):'—'}</div></div>
        <div class="pf-metric"><div class="pf-metric-label">DD Esp.</div><div class="pf-metric-value">${m.expectedDD!=null?m.expectedDD.toFixed(1)+'%':'—'}</div></div>
        <div class="pf-metric"><div class="pf-metric-label">Win Rate</div><div class="pf-metric-value">${m.combinedWR!=null?m.combinedWR.toFixed(1)+'%':'—'}</div></div>
        <div class="pf-metric"><div class="pf-metric-label">Ret. Mensual</div><div class="pf-metric-value positive">${m.monthlyReturn!=null?m.monthlyReturn.toFixed(1)+'%':'—'}</div></div>
        <div class="pf-metric"><div class="pf-metric-label">Ret. Anual</div><div class="pf-metric-value">${m.annualReturn!=null?m.annualReturn.toFixed(1)+'%':'—'}</div></div>
        <div class="pf-metric"><div class="pf-metric-label">Net Profit</div><div class="pf-metric-value">${App.fmtUSD(m.totalNetProfit)}</div></div>
      </div>
      <div class="pf-alloc-bar">${allocBar}</div>
      <div class="pf-strategies-list">${stratList}</div>
    </div>`;
  }).join('');
  // Events
  grid.querySelectorAll('[data-pf-edit]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); Modules.openPortfolioModal(b.dataset.pfEdit); }));
  grid.querySelectorAll('[data-pf-del]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); Modules.deletePortfolio(b.dataset.pfDel); }));
};

Modules.openPortfolioModal = function(id) {
  App.state._pfEditId = id || null;
  App.$('modal-pf-title').textContent = id ? 'Editar Portfolio' : 'Nuevo Portfolio';
  App.$('portfolio-form').reset();
  // Build strategy picker
  const strats = DataManager.Strategies.getAll();
  const existing = id ? (DataManager.Portfolios.getById(id)?.strategies || []) : [];
  const picker = App.$('strategy-picker');
  picker.innerHTML = strats.map(s => {
    const ps = existing.find(x => x.strategyId === s.id);
    return `<div class="sp-item"><input type="checkbox" class="sp-check" data-sid="${s.id}" ${ps ? 'checked' : ''}><span class="sp-name">${App.esc(s.name)}</span><div class="sp-alloc"><input type="number" min="0" max="100" step="1" class="sp-alloc-input" data-sid="${s.id}" value="${ps ? ps.allocation : ''}" placeholder="%"></div></div>`;
  }).join('') || '<div style="padding:.75rem;color:var(--text-muted);font-size:.8rem">No hay estrategias creadas.</div>';
  // Update total
  const updateTotal = () => { const total = [...picker.querySelectorAll('.sp-check:checked')].reduce((s,c) => { const inp = picker.querySelector(`.sp-alloc-input[data-sid="${c.dataset.sid}"]`); return s + (Number(inp?.value) || 0); }, 0); App.$('pf-total-alloc').textContent = total + '%'; App.$('pf-total-alloc').style.color = total === 100 ? 'var(--green)' : 'var(--red)'; };
  picker.querySelectorAll('input').forEach(i => i.addEventListener('input', updateTotal));
  // Fill form
  if (id) {
    const p = DataManager.Portfolios.getById(id); if (!p) return;
    App.$('pf-name').value = p.name || '';
    App.$('pf-description').value = p.description || '';
    App.$('pf-maxRisk').value = p.maxRisk ?? '';
    App.$('pf-notes').value = p.notes || '';
  }
  updateTotal();
  App.openModal('modal-portfolio');
};

Modules.deletePortfolio = function(id) {
  const p = DataManager.Portfolios.getById(id); if (!p) return;
  const ov = document.createElement('div'); ov.className = 'confirm-overlay';
  ov.innerHTML = `<div class="confirm-box"><h3>¿Eliminar portfolio?</h3><p><strong>${App.esc(p.name)}</strong></p><div class="confirm-actions"><button class="btn btn-secondary" id="cn">Cancelar</button><button class="btn btn-danger" id="cy">Eliminar</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#cn').addEventListener('click', () => ov.remove());
  ov.querySelector('#cy').addEventListener('click', () => { DataManager.Portfolios.remove(id); ov.remove(); App.toast('Portfolio eliminado', 'info'); App.render(); });
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
};

// Init events
document.addEventListener('DOMContentLoaded', () => {
  App.$('btn-add-portfolio')?.addEventListener('click', () => Modules.openPortfolioModal());
  App.$('btn-add-pf-empty')?.addEventListener('click', () => Modules.openPortfolioModal());
  App.$('portfolio-form').addEventListener('submit', e => {
    e.preventDefault();
    const picker = App.$('strategy-picker');
    const strategies = [...picker.querySelectorAll('.sp-check:checked')].map(c => {
      const inp = picker.querySelector(`.sp-alloc-input[data-sid="${c.dataset.sid}"]`);
      return { strategyId: c.dataset.sid, allocation: Number(inp?.value) || 0 };
    });
    const data = { name: App.$('pf-name').value.trim(), description: App.$('pf-description').value.trim(), maxRisk: Number(App.$('pf-maxRisk').value) || 0, strategies, notes: App.$('pf-notes').value.trim() };
    if (!data.name) { App.toast('Nombre obligatorio', 'error'); return; }
    if (App.state._pfEditId) { DataManager.Portfolios.update(App.state._pfEditId, data); App.toast('Portfolio actualizado', 'success'); }
    else { DataManager.Portfolios.create(data); App.toast('Portfolio creado', 'success'); }
    App.closeModal('modal-portfolio'); App.render();
  });
});

window.Modules = Modules;
