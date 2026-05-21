/* Terminal General — Accounts Module */
const Modules = window.Modules || {};

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

// Init events
document.addEventListener('DOMContentLoaded', () => {
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
    if (data.type === 'funded') {
      data.totalPhases = n(App.$('acc-totalPhases').value);
      data.currentPhase = n(App.$('acc-currentPhase').value);
      data.rules = { maxDailyDD: n(App.$('acc-maxDailyDD').value), maxTotalDD: n(App.$('acc-maxTotalDD').value), profitTarget: n(App.$('acc-profitTarget').value), minTradingDays: n(App.$('acc-minTradingDays').value) };
      data.challengeCost = n(App.$('acc-challengeCost').value);
    }
    if (data.type === 'darwinex') {
      data.darwinName = App.$('acc-darwinName').value.trim();
      data.dScore = n(App.$('acc-dScore').value);
      data.investorAllocation = n(App.$('acc-investorAllocation').value);
    }
    if (!data.name) { App.toast('Nombre obligatorio', 'error'); return; }
    if (App.state._accEditId) { DataManager.Accounts.update(App.state._accEditId, data); App.toast('Cuenta actualizada', 'success'); }
    else { DataManager.Accounts.create(data); App.toast('Cuenta creada', 'success'); }
    App.closeModal('modal-account'); App.render();
  });

  App.$('payout-form').addEventListener('submit', e => {
    e.preventDefault();
    const date = App.$('po-date').value;
    const amount = Number(App.$('po-amount').value);
    if (!date || !amount) { App.toast('Completa los campos', 'error'); return; }
    DataManager.Accounts.addPayout(App.state._payoutAccId, { date, amount });
    App.closeModal('modal-payout'); App.toast('Payout registrado', 'success'); App.render();
  });
});

window.Modules = Modules;
