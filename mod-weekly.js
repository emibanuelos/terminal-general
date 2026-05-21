/* Terminal General — Weekly Log Module */
const Modules = window.Modules || {};

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

// Init events
document.addEventListener('DOMContentLoaded', () => {
  App.$('weekly-account-select')?.addEventListener('change', () => Modules.renderWeekly());
  App.$('btn-add-weekly')?.addEventListener('click', () => Modules.openWeeklyModal());

  App.$('weekly-form').addEventListener('submit', e => {
    e.preventDefault();
    const n = v => v === '' ? null : Number(v);
    const data = {
      accountId: App.$('wl-accountId').value,
      weekEnding: App.$('wl-weekEnding').value,
      startBalance: n(App.$('wl-startBalance').value),
      endBalance: n(App.$('wl-endBalance').value),
      deposits: n(App.$('wl-deposits').value) || 0,
      withdrawals: n(App.$('wl-withdrawals').value) || 0,
      notes: App.$('wl-notes').value.trim(),
    };
    if (!data.accountId || !data.weekEnding || data.startBalance == null || data.endBalance == null) {
      App.toast('Completa los campos requeridos', 'error'); return;
    }
    DataManager.WeeklyLogs.create(data);
    App.closeModal('modal-weekly');
    // Set main selector to this account
    App.$('weekly-account-select').value = data.accountId;
    App.toast('Semana registrada — balance actualizado', 'success');
    App.render();
  });
});

window.Modules = Modules;
