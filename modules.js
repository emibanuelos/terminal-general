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
    const maxRisk = p.maxRisk || 1;
    const allocBar = strats.map(s => `<div class="pf-alloc-segment" style="width:${s.alloc/maxRisk*100}%;background:${s.color}" title="${s.name}: ${s.alloc}% riesgo"></div>`).join('');
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
    return `<div class="sp-item"><input type="checkbox" class="sp-check" data-sid="${s.id}" ${ps ? 'checked' : ''}><span class="sp-name">${App.esc(s.name)}</span><div class="sp-alloc"><input type="number" min="0" max="100" step="0.5" class="sp-alloc-input" data-sid="${s.id}" value="${ps ? ps.allocation : ''}" placeholder="%"></div></div>`;
  }).join('') || '<div style="padding:.75rem;color:var(--text-muted);font-size:.8rem">No hay estrategias creadas.</div>';
  // Update total vs maxRisk
  const updateTotal = () => { const maxRisk = Number(App.$('pf-maxRisk').value) || 0; const total = [...picker.querySelectorAll('.sp-check:checked')].reduce((s,c) => { const inp = picker.querySelector(`.sp-alloc-input[data-sid="${c.dataset.sid}"]`); return s + (Number(inp?.value) || 0); }, 0); App.$('pf-total-alloc').textContent = total + '% / ' + maxRisk + '%'; App.$('pf-total-alloc').style.color = Math.abs(total - maxRisk) < 0.01 ? 'var(--green)' : total > maxRisk ? 'var(--red)' : 'var(--yellow)'; };
  picker.querySelectorAll('input').forEach(i => i.addEventListener('input', updateTotal));
  App.$('pf-maxRisk').addEventListener('input', updateTotal);
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



/* ---- Accounts Module ---- */

Modules.renderAccounts = function() {
  const all = DataManager.Accounts.getAll();
  const container = App.$('accounts-container');
  const empty = App.$('accounts-empty');
  if (!all.length) { container.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const grouped = {};
  DataManager.ACCOUNT_TYPES.forEach(t => { grouped[t.value] = { label: t.label, items: all.filter(a => a.type === t.value) }; });

  container.innerHTML = Object.entries(grouped).filter(([,g]) => g.items.length).map(([type, g]) => {
    const cards = g.items.map(a => {
      const si = DataManager.Accounts.getStatusInfo(a);
      const profit = DataManager.Accounts.getAccountProfit(a);
      const myProfit = DataManager.Accounts.getMyProfit(a);
      const totalPaid = DataManager.Accounts.getTotalPayouts(a);
      const pClass = profit >= 0 ? 'positive' : 'negative';
      const portfolios = (a.portfolioIds || []).map(id => DataManager.Portfolios.getById(id)).filter(Boolean);
      const pfPills = portfolios.map(p => `<span class="acc-pf-pill">${App.esc(p.name)}</span>`).join('');

      let extra = '';
      if (a.type === 'funded' && a.rules) {
        const r = a.rules;
        extra = `<div class="rules-mini">
          ${r.maxDailyDD ? `<span class="rule-tag">DD Diario: ${r.maxDailyDD}%</span>` : ''}
          ${r.maxTotalDD ? `<span class="rule-tag">DD Total: ${r.maxTotalDD}%</span>` : ''}
          ${r.profitTarget ? `<span class="rule-tag">Target: ${r.profitTarget}%</span>` : ''}
          ${r.minTradingDays ? `<span class="rule-tag">Min días: ${r.minTradingDays}</span>` : ''}
        </div>
        ${a.totalPhases ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:.4rem">Fase ${a.currentPhase === 0 ? 'Funded ✓' : a.currentPhase + '/' + a.totalPhases}</div>` : ''}
        ${totalPaid > 0 ? `<div style="font-size:.72rem;margin-top:.3rem;color:var(--green)">Payouts: ${App.fmtUSD(totalPaid)}</div>` : ''}`;
      }
      if (a.type === 'darwinex') {
        extra = `<div class="rules-mini">
          ${a.darwinName ? `<span class="rule-tag">Darwin: ${a.darwinName}</span>` : ''}
          ${a.dScore ? `<span class="rule-tag">D-Score: ${a.dScore}</span>` : ''}
          ${a.investorAllocation ? `<span class="rule-tag">Alloc: ${App.fmtUSD(a.investorAllocation)}</span>` : ''}
        </div>`;
      }

      return `<div class="acc-card" data-acc-id="${a.id}">
        <div class="acc-card-header"><div><div class="acc-card-name">${App.esc(a.name)}</div><div style="font-size:.7rem;color:var(--text-muted)">${App.esc(a.firm || '')} · ${App.esc(a.accountNumber || '')}</div></div>
          <div style="display:flex;gap:.2rem;align-items:center">
            <span class="status-badge" style="--status-color:${si.color}"><span class="status-dot"></span>${si.label}</span>
            <button class="btn-icon" data-acc-edit="${a.id}" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn-icon danger" data-acc-del="${a.id}" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </div>
        <div class="acc-card-balance">${App.fmtUSD(a.currentBalance)}</div>
        <div class="acc-card-profit">Profit: <span class="${pClass} mono">${App.fmtUSD(profit)}</span> · Mi parte: <span class="positive mono">${App.fmtUSD(myProfit)}</span> (${a.profitSharePercent||100}%)</div>
        <div class="acc-card-info"><span><span class="info-label">Balance Inicial</span><span class="info-value">${App.fmtUSD(a.initialBalance)}</span></span><span><span class="info-label">Equity</span><span class="info-value">${App.fmtUSD(a.equity)}</span></span></div>
        ${extra}
        ${pfPills ? `<div class="acc-portfolios">${pfPills}</div>` : ''}
        ${a.type === 'funded' ? `<button class="btn btn-sm btn-secondary" data-acc-payout="${a.id}" style="margin-top:.5rem">+ Payout</button>` : ''}
      </div>`;
    }).join('');
    return `<div class="acc-section"><div class="acc-section-title">${g.label} (${g.items.length})</div><div class="cards-grid">${cards}</div></div>`;
  }).join('');

  // Events
  container.querySelectorAll('[data-acc-edit]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); Modules.openAccountModal(b.dataset.accEdit); }));
  container.querySelectorAll('[data-acc-del]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); Modules.deleteAccount(b.dataset.accDel); }));
  container.querySelectorAll('[data-acc-payout]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); Modules.openPayoutModal(b.dataset.accPayout); }));
};

Modules.openAccountModal = function(id) {
  App.state._accEditId = id || null;
  App.$('modal-acc-title').textContent = id ? 'Editar Cuenta' : 'Nueva Cuenta';
  App.$('account-form').reset();
  // Populate type select
  const typeEl = App.$('acc-type');
  typeEl.innerHTML = DataManager.ACCOUNT_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
  // Populate portfolio picker
  const ppk = App.$('portfolio-picker');
  const portfolios = DataManager.Portfolios.getAll();
  const linkedIds = id ? (DataManager.Accounts.getById(id)?.portfolioIds || []) : [];
  ppk.innerHTML = portfolios.length ? portfolios.map(p => `<button type="button" class="pp-toggle ${linkedIds.includes(p.id)?'selected':''}" data-pfid="${p.id}">${App.esc(p.name)}</button>`).join('') : '<span style="font-size:.78rem;color:var(--text-muted)">No hay portfolios.</span>';
  ppk.querySelectorAll('.pp-toggle').forEach(b => b.addEventListener('click', () => b.classList.toggle('selected')));
  // Type change handler
  const showSections = (type) => {
    App.$('acc-funded-section').style.display = type === 'funded' ? '' : 'none';
    App.$('acc-darwinex-section').style.display = type === 'darwinex' ? '' : 'none';
    // Update status options
    const stEl = App.$('acc-status');
    const statuses = DataManager.ACCOUNT_STATUSES[type] || DataManager.ACCOUNT_STATUSES.broker;
    stEl.innerHTML = statuses.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
  };
  typeEl.addEventListener('change', () => showSections(typeEl.value));
  showSections(typeEl.value);
  // Fill if editing
  if (id) {
    const a = DataManager.Accounts.getById(id); if (!a) return;
    typeEl.value = a.type || 'broker'; showSections(a.type);
    App.$('acc-name').value = a.name || '';
    App.$('acc-firm').value = a.firm || '';
    App.$('acc-accountNumber').value = a.accountNumber || '';
    App.$('acc-server').value = a.server || '';
    App.$('acc-status').value = a.status || '';
    App.$('acc-initialBalance').value = a.initialBalance ?? '';
    App.$('acc-currentBalance').value = a.currentBalance ?? '';
    App.$('acc-equity').value = a.equity ?? '';
    App.$('acc-profitSharePercent').value = a.profitSharePercent ?? '';
    App.$('acc-notes').value = a.notes || '';
    if (a.type === 'funded') {
      App.$('acc-totalPhases').value = a.totalPhases ?? '';
      App.$('acc-currentPhase').value = a.currentPhase ?? '';
      App.$('acc-maxDailyDD').value = a.rules?.maxDailyDD ?? '';
      App.$('acc-maxTotalDD').value = a.rules?.maxTotalDD ?? '';
      App.$('acc-profitTarget').value = a.rules?.profitTarget ?? '';
      App.$('acc-minTradingDays').value = a.rules?.minTradingDays ?? '';
      App.$('acc-challengeCost').value = a.challengeCost ?? '';
    }
    if (a.type === 'darwinex') {
      App.$('acc-darwinName').value = a.darwinName || '';
      App.$('acc-dScore').value = a.dScore ?? '';
      App.$('acc-investorAllocation').value = a.investorAllocation ?? '';
    }
  }
  App.openModal('modal-account');
};

Modules.deleteAccount = function(id) {
  const a = DataManager.Accounts.getById(id); if (!a) return;
  const ov = document.createElement('div'); ov.className = 'confirm-overlay';
  ov.innerHTML = `<div class="confirm-box"><h3>¿Eliminar cuenta?</h3><p><strong>${App.esc(a.name)}</strong></p><div class="confirm-actions"><button class="btn btn-secondary" id="cn">Cancelar</button><button class="btn btn-danger" id="cy">Eliminar</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#cn').addEventListener('click', () => ov.remove());
  ov.querySelector('#cy').addEventListener('click', () => { DataManager.Accounts.remove(id); ov.remove(); App.toast('Cuenta eliminada', 'info'); App.render(); });
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
};

Modules.openPayoutModal = function(accId) {
  App.state._payoutAccId = accId;
  App.$('payout-form').reset();
  App.$('po-date').value = new Date().toISOString().slice(0, 10);
  App.openModal('modal-payout');
};



/* ---- Weekly Log Module ---- */

Modules.renderWeekly = function() {
  // Populate account selector
  const sel = App.$('weekly-account-select');
  const accounts = DataManager.Accounts.getAll();
  const current = sel.value;
  sel.innerHTML = '<option value="">— Selecciona Cuenta —</option>' + accounts.map(a => `<option value="${a.id}">${App.esc(a.name)} (${App.esc(a.firm||'')})</option>`).join('');
  if (current) sel.value = current;

  const accId = sel.value;
  const chart = App.$('weekly-chart');
  const tw = App.$('weekly-table-wrapper');

  if (!accId) {
    chart.innerHTML = '<div class="compare-empty">Selecciona una cuenta para ver su historial semanal.</div>';
    tw.style.display = 'none';
    return;
  }

  const logs = DataManager.WeeklyLogs.getByAccount(accId).reverse(); // chronological
  if (!logs.length) {
    chart.innerHTML = '<div class="compare-empty">No hay registros semanales para esta cuenta.</div>';
    tw.style.display = 'none';
    return;
  }

  // Chart
  const maxProfit = Math.max(...logs.map(l => Math.abs(l.profit || 0)), 1);
  chart.innerHTML = `<div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.5rem">Evolución de Profit Semanal</div>
    <div class="chart-bars">${logs.map(l => {
      const h = Math.max(5, Math.abs(l.profit || 0) / maxProfit * 90);
      const color = (l.profit || 0) >= 0 ? 'var(--green)' : 'var(--red)';
      return `<div class="chart-bar" style="height:${h}px;background:${color}" data-label="${l.weekEnding}: ${App.fmtUSD(l.profit)}"></div>`;
    }).join('')}</div>
    <div class="chart-labels">${logs.map(l => `<div class="chart-label">${l.weekEnding.slice(5)}</div>`).join('')}</div>`;

  // Table
  tw.style.display = '';
  const tbody = App.$('weekly-tbody');
  tbody.innerHTML = logs.slice().reverse().map(l => {
    const pClass = (l.profit || 0) >= 0 ? 'positive' : 'negative';
    const depRet = [];
    if (l.deposits) depRet.push(`+${App.fmtUSD(l.deposits)}`);
    if (l.withdrawals) depRet.push(`-${App.fmtUSD(l.withdrawals)}`);
    return `<tr>
      <td class="mono">${l.weekEnding}</td>
      <td class="mono">${App.fmtUSD(l.startBalance)}</td>
      <td class="mono">${App.fmtUSD(l.endBalance)}</td>
      <td class="mono ${pClass}">${App.fmtUSD(l.profit)}</td>
      <td class="mono ${pClass}">${(l.profitPercent || 0).toFixed(2)}%</td>
      <td class="mono positive">${App.fmtUSD(l.myProfit)}</td>
      <td class="mono">${depRet.join(' / ') || '—'}</td>
      <td style="white-space:normal;max-width:200px;font-size:.75rem">${App.esc(l.notes || '—')}</td>
      <td><button class="btn-icon danger" data-wl-del="${l.id}" title="Eliminar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
    </tr>`;
  }).join('');

  // Delete events
  tbody.querySelectorAll('[data-wl-del]').forEach(b => b.addEventListener('click', () => {
    DataManager.WeeklyLogs.remove(b.dataset.wlDel);
    App.toast('Registro eliminado', 'info');
    App.render();
  }));
};

Modules.openWeeklyModal = function() {
  App.$('weekly-form').reset();
  // Populate account select in modal
  const sel = App.$('wl-accountId');
  const accounts = DataManager.Accounts.getAll();
  sel.innerHTML = '<option value="">— Selecciona —</option>' + accounts.map(a => `<option value="${a.id}">${App.esc(a.name)}</option>`).join('');
  // Default to currently selected account
  const mainSel = App.$('weekly-account-select').value;
  if (mainSel) sel.value = mainSel;
  // Set date to last Friday
  const today = new Date();
  const day = today.getDay();
  const diff = day >= 5 ? day - 5 : day + 2;
  const friday = new Date(today);
  friday.setDate(today.getDate() - diff);
  App.$('wl-weekEnding').value = friday.toISOString().slice(0, 10);
  // Auto-fill start balance from last log or account balance
  sel.addEventListener('change', () => {
    const accId = sel.value;
    if (!accId) return;
    const logs = DataManager.WeeklyLogs.getByAccount(accId);
    const acc = DataManager.Accounts.getById(accId);
    if (logs.length) {
      App.$('wl-startBalance').value = logs[0].endBalance || '';
    } else if (acc) {
      App.$('wl-startBalance').value = acc.initialBalance || '';
    }
  });
  // Trigger for pre-selected
  if (sel.value) sel.dispatchEvent(new Event('change'));
  App.openModal('modal-weekly');
};

/* ---- Init: bind all module events ---- */
Modules.init = function() {
  // Portfolio events
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
  // Account events
  App.$('btn-add-account')?.addEventListener('click', () => Modules.openAccountModal());
  App.$('btn-add-acc-empty')?.addEventListener('click', () => Modules.openAccountModal());
  App.$('account-form').addEventListener('submit', e => {
    e.preventDefault();
    const n = v => v === '' ? null : Number(v);
    const ppk = App.$('portfolio-picker');
    const data = {
      name: App.$('acc-name').value.trim(), type: App.$('acc-type').value, firm: App.$('acc-firm').value.trim(),
      accountNumber: App.$('acc-accountNumber').value.trim(), server: App.$('acc-server').value.trim(), status: App.$('acc-status').value,
      initialBalance: n(App.$('acc-initialBalance').value), currentBalance: n(App.$('acc-currentBalance').value),
      equity: n(App.$('acc-equity').value), profitSharePercent: n(App.$('acc-profitSharePercent').value) ?? 100,
      portfolioIds: [...ppk.querySelectorAll('.pp-toggle.selected')].map(b => b.dataset.pfid),
      notes: App.$('acc-notes').value.trim(),
    };
    if (data.type === 'funded') { data.totalPhases = n(App.$('acc-totalPhases').value); data.currentPhase = n(App.$('acc-currentPhase').value); data.rules = { maxDailyDD: n(App.$('acc-maxDailyDD').value), maxTotalDD: n(App.$('acc-maxTotalDD').value), profitTarget: n(App.$('acc-profitTarget').value), minTradingDays: n(App.$('acc-minTradingDays').value) }; data.challengeCost = n(App.$('acc-challengeCost').value); }
    if (data.type === 'darwinex') { data.darwinName = App.$('acc-darwinName').value.trim(); data.dScore = n(App.$('acc-dScore').value); data.investorAllocation = n(App.$('acc-investorAllocation').value); }
    if (!data.name) { App.toast('Nombre obligatorio', 'error'); return; }
    if (App.state._accEditId) { DataManager.Accounts.update(App.state._accEditId, data); App.toast('Cuenta actualizada', 'success'); }
    else { DataManager.Accounts.create(data); App.toast('Cuenta creada', 'success'); }
    App.closeModal('modal-account'); App.render();
  });
  App.$('payout-form').addEventListener('submit', e => {
    e.preventDefault();
    const date = App.$('po-date').value; const amount = Number(App.$('po-amount').value);
    if (!date || !amount) { App.toast('Completa los campos', 'error'); return; }
    DataManager.Accounts.addPayout(App.state._payoutAccId, { date, amount });
    App.closeModal('modal-payout'); App.toast('Payout registrado', 'success'); App.render();
  });
  // Weekly events
  App.$('weekly-account-select')?.addEventListener('change', () => Modules.renderWeekly());
  App.$('btn-add-weekly')?.addEventListener('click', () => Modules.openWeeklyModal());
  App.$('weekly-form').addEventListener('submit', e => {
    e.preventDefault();
    const n = v => v === '' ? null : Number(v);
    const data = { accountId: App.$('wl-accountId').value, weekEnding: App.$('wl-weekEnding').value, startBalance: n(App.$('wl-startBalance').value), endBalance: n(App.$('wl-endBalance').value), deposits: n(App.$('wl-deposits').value) || 0, withdrawals: n(App.$('wl-withdrawals').value) || 0, notes: App.$('wl-notes').value.trim() };
    if (!data.accountId || !data.weekEnding || data.startBalance == null || data.endBalance == null) { App.toast('Completa los campos requeridos', 'error'); return; }
    DataManager.WeeklyLogs.create(data);
    App.closeModal('modal-weekly');
    App.$('weekly-account-select').value = data.accountId;
    App.toast('Semana registrada — balance actualizado', 'success');
    App.render();
  });
};
