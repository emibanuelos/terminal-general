/* ============================================================
   Terminal General — App Core + Strategies + Compare
   ============================================================ */
const App = {
  state: { view:'dashboard', sort:{col:'name',asc:true}, filters:{search:'',platform:'',status:'',timeframe:''}, selected:new Set(), editingId:null },
  $: id => document.getElementById(id),
  $$: sel => document.querySelectorAll(sel),

  init() {
    this.populateFilters();
    this.populateStrategyForm();
    this.bindCoreEvents();
    if (typeof Modules !== 'undefined' && Modules.init) Modules.init();
    this.render();
  },

  /* ---- Helpers ---- */
  esc(str) { const d=document.createElement('div'); d.textContent=str; return d.innerHTML; },
  toast(msg, type='info') { const el=document.createElement('div'); el.className=`toast ${type}`; const icons={success:'✓',error:'✕',info:'ℹ'}; el.innerHTML=`<span>${icons[type]||'ℹ'}</span> ${msg}`; this.$('toast-container').appendChild(el); setTimeout(()=>el.remove(),3200); },
  fmtUSD(v) { return v!=null ? '$'+Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'; },

  openModal(id) { this.$(id).classList.add('open'); },
  closeModal(id) { this.$(id).classList.remove('open'); },

  /* ---- Navigation ---- */
  switchView(view) {
    this.state.view = view;
    this.$$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view===view));
    this.$$('.view').forEach(v => v.classList.remove('active'));
    this.$('view-'+view).classList.add('active');
    if (view==='compare') this.renderCompare();
    if (view==='portfolios' && typeof Modules!=='undefined') Modules.renderPortfolios();
    if (view==='accounts' && typeof Modules!=='undefined') Modules.renderAccounts();
    if (view==='weekly' && typeof Modules!=='undefined') Modules.renderWeekly();
  },

  render() {
    this.renderSummary(); this.renderTable(); this.updateSortHeaders(); this.updateHeader();
    if (this.state.view==='compare') this.renderCompare();
    if (this.state.view==='portfolios' && typeof Modules!=='undefined') Modules.renderPortfolios();
    if (this.state.view==='accounts' && typeof Modules!=='undefined') Modules.renderAccounts();
    if (this.state.view==='weekly' && typeof Modules!=='undefined') Modules.renderWeekly();
  },

  updateHeader() {
    this.$('global-aum').textContent = this.fmtUSD(DataManager.getAuM());
    this.$('global-retirable').textContent = this.fmtUSD(DataManager.getRetirable());
  },

  /* ---- Populate ---- */
  populateFilters() {
    DataManager.PLATFORMS.forEach(p => this.$('filter-platform').insertAdjacentHTML('beforeend',`<option value="${p}">${p}</option>`));
    DataManager.STRATEGY_STATUSES.forEach(s => this.$('filter-status').insertAdjacentHTML('beforeend',`<option value="${s.value}">${s.label}</option>`));
    DataManager.TIMEFRAMES.forEach(t => this.$('filter-timeframe').insertAdjacentHTML('beforeend',`<option value="${t}">${t}</option>`));
  },

  populateStrategyForm() {
    const fp=this.$('f-platform'); fp.innerHTML='<option value="">— Seleccionar —</option>'; DataManager.PLATFORMS.forEach(p => fp.insertAdjacentHTML('beforeend',`<option value="${p}">${p}</option>`));
    const ft=this.$('f-timeframe'); ft.innerHTML='<option value="">— Seleccionar —</option>'; DataManager.TIMEFRAMES.forEach(t => ft.insertAdjacentHTML('beforeend',`<option value="${t}">${t}</option>`));
    const fs=this.$('f-status'); fs.innerHTML=''; DataManager.STRATEGY_STATUSES.forEach(s => fs.insertAdjacentHTML('beforeend',`<option value="${s.value}">${s.label}</option>`));
    const tg=this.$('tags-grid'); tg.innerHTML=''; DataManager.TAGS.forEach(tag => tg.insertAdjacentHTML('beforeend',`<button type="button" class="tag-toggle" data-tag="${tag}">${tag}</button>`));
  },

  /* ---- Events ---- */
  bindCoreEvents() {
    // Nav
    this.$$('.nav-btn').forEach(btn => btn.addEventListener('click', () => this.switchView(btn.dataset.view)));
    // Filters
    this.$('filter-search').addEventListener('input', e => { this.state.filters.search=e.target.value.toLowerCase(); this.render(); });
    this.$('filter-platform').addEventListener('change', e => { this.state.filters.platform=e.target.value; this.render(); });
    this.$('filter-status').addEventListener('change', e => { this.state.filters.status=e.target.value; this.render(); });
    this.$('filter-timeframe').addEventListener('change', e => { this.state.filters.timeframe=e.target.value; this.render(); });
    // Sort
    this.$$('.sortable').forEach(th => th.addEventListener('click', () => { const c=th.dataset.sort; if(this.state.sort.col===c) this.state.sort.asc=!this.state.sort.asc; else {this.state.sort.col=c;this.state.sort.asc=true;} this.render(); }));
    // Select all
    this.$('select-all').addEventListener('change', e => { const rows=this.getFilteredSorted(); if(e.target.checked) rows.forEach(s=>this.state.selected.add(s.id)); else this.state.selected.clear(); this.render(); });
    // Add
    this.$('btn-add').addEventListener('click', () => this.openStrategyModal());
    this.$('btn-add-empty')?.addEventListener('click', () => this.openStrategyModal());
    this.$('btn-load-sample')?.addEventListener('click', () => { DataManager.loadSampleData(); this.toast('Datos de ejemplo cargados','success'); this.render(); });
    // Form
    this.$('strategy-form').addEventListener('submit', e => this.handleStrategySave(e));
    this.$('tags-grid').addEventListener('click', e => { if(e.target.classList.contains('tag-toggle')) e.target.classList.toggle('selected'); });
    // Table delegation
    this.$('strategies-tbody').addEventListener('click', e => this.handleTableClick(e));
    // Export/Import
    this.$('btn-export-csv').addEventListener('click', () => { DataManager.exportCSV(); this.toast('CSV exportado','success'); });
    this.$('btn-export-json').addEventListener('click', () => { DataManager.exportJSON(); this.toast('JSON exportado','success'); });
    this.$('btn-import').addEventListener('click', () => this.$('import-file').click());
    this.$('import-file').addEventListener('change', e => { const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{if(DataManager.importJSON(r.result)){this.toast('Datos importados','success');this.render();}else this.toast('Error al importar','error');}; r.readAsText(f); e.target.value=''; });
    // Keyboard
    document.addEventListener('keydown', e => { if(e.key==='Escape') this.$$('.modal-overlay.open').forEach(m=>m.classList.remove('open')); });
  },

  /* ---- Summary ---- */
  renderSummary() {
    const all=DataManager.Strategies.getAll();
    this.$('stat-total').textContent=all.length;
    this.$('stat-live').textContent=all.filter(s=>s.status==='live').length;
    const pfs=all.map(s=>s.profitFactor).filter(v=>v!=null&&!isNaN(v));
    this.$('stat-best-pf').textContent=pfs.length?Math.max(...pfs).toFixed(2):'—';
    const wrs=all.map(s=>s.winRate).filter(v=>v!=null&&!isNaN(v));
    this.$('stat-avg-wr').textContent=wrs.length?(wrs.reduce((a,b)=>a+b,0)/wrs.length).toFixed(1)+'%':'—';
  },

  /* ---- Table ---- */
  getFilteredSorted() {
    let data=DataManager.Strategies.getAll(); const f=this.state.filters;
    if(f.search) data=data.filter(s=>(s.name||'').toLowerCase().includes(f.search)||(s.instrument||'').toLowerCase().includes(f.search)||(s.platform||'').toLowerCase().includes(f.search)||(s.magicNumber||'').toLowerCase().includes(f.search));
    if(f.platform) data=data.filter(s=>s.platform===f.platform);
    if(f.status) data=data.filter(s=>s.status===f.status);
    if(f.timeframe) data=data.filter(s=>s.timeframe===f.timeframe);
    const {col,asc}=this.state.sort;
    data.sort((a,b)=>{let va=a[col],vb=b[col];if(va==null)return 1;if(vb==null)return -1;if(typeof va==='string'){va=va.toLowerCase();vb=(vb||'').toLowerCase();}if(va<vb)return asc?-1:1;if(va>vb)return asc?1:-1;return 0;});
    return data;
  },

  renderTable() {
    const data=this.getFilteredSorted(), tbody=this.$('strategies-tbody'), empty=this.$('empty-state');
    if(!data.length&&!DataManager.Strategies.getAll().length){tbody.innerHTML='';empty.style.display='block';return;}
    empty.style.display='none';
    if(!data.length){tbody.innerHTML='<tr><td colspan="12" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Sin resultados.</td></tr>';return;}
    tbody.innerHTML=data.map(s=>{
      const st=DataManager.STRATEGY_STATUSES.find(x=>x.value===s.status)||DataManager.STRATEGY_STATUSES[0];
      const ck=this.state.selected.has(s.id)?'checked':'';
      const pf=s.profitFactor!=null?Number(s.profitFactor).toFixed(2):'—';
      const dd=s.maxDrawdown!=null?Number(s.maxDrawdown).toFixed(1)+'%':'—';
      const wr=s.winRate!=null?Number(s.winRate).toFixed(1)+'%':'—';
      const np=s.netProfit!=null?this.fmtUSD(s.netProfit):'—';
      const ar=s.annualReturn!=null?Number(s.annualReturn).toFixed(1)+'%':'—';
      const npC=s.netProfit>0?'positive':s.netProfit<0?'negative':'';
      const pfC=s.profitFactor>=1.5?'positive':s.profitFactor<1?'negative':'';
      const dot=s.status==='live'?'pulse':'';
      return `<tr><td class="td-check"><input type="checkbox" class="row-check" data-id="${s.id}" ${ck}></td>
        <td><strong style="cursor:pointer" class="sname" data-id="${s.id}">${this.esc(s.name)}</strong></td>
        <td>${this.esc(s.platform||'—')}</td><td class="mono">${this.esc(s.instrument||'—')}</td><td class="mono">${this.esc(s.timeframe||'—')}</td>
        <td><span class="status-badge" style="--status-color:${st.color}"><span class="status-dot ${dot}"></span>${st.label}</span></td>
        <td class="mono ${pfC}">${pf}</td><td class="mono">${dd}</td><td class="mono">${wr}</td><td class="mono ${npC}">${np}</td><td class="mono">${ar}</td>
        <td class="actions-cell">
          <button class="btn-icon" data-action="detail" data-id="${s.id}" title="Ver"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="btn-icon" data-action="edit" data-id="${s.id}" title="Editar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon danger" data-action="delete" data-id="${s.id}" title="Eliminar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </td></tr>`;
    }).join('');
  },

  updateSortHeaders() { this.$$('.sortable').forEach(th=>{const a=th.dataset.sort===this.state.sort.col;th.classList.toggle('sort-active',a);const ar=th.querySelector('.sort-arrow');if(ar)ar.textContent=a?(this.state.sort.asc?'↑':'↓'):'↕';}); },

  handleTableClick(e) {
    const btn=e.target.closest('[data-action]'), nm=e.target.closest('.sname'), ck=e.target.closest('.row-check');
    if(btn){const id=btn.dataset.id,act=btn.dataset.action;if(act==='edit')this.openStrategyModal(id);if(act==='delete')this.confirmDelete(id);if(act==='detail')this.openDetail(id);}
    else if(nm) this.openDetail(nm.dataset.id);
    else if(ck){if(ck.checked)this.state.selected.add(ck.dataset.id);else this.state.selected.delete(ck.dataset.id);}
  },

  /* ---- Strategy Modal ---- */
  openStrategyModal(id) {
    this.state.editingId=id||null;
    this.$('modal-strategy-title').textContent=id?'Editar Estrategia':'Nueva Estrategia';
    this.$('strategy-form').reset(); this.$$('.tag-toggle').forEach(t=>t.classList.remove('selected'));
    if(id){
      const s=DataManager.Strategies.getById(id); if(!s) return;
      const fields=['name','platform','instrument','timeframe','status','createdAt','magicNumber','activeLocation','profitFactor','maxDrawdown','drawdownMonteCarlo','returnDdRatio','winRate','avgTrade','totalTrades','netProfit','stability','annualReturn','notes'];
      fields.forEach(f=>{const el=this.$('f-'+f);if(el)el.value=s[f]??'';});
      (s.tags||[]).forEach(tag=>{const el=document.querySelector(`.tag-toggle[data-tag="${tag}"]`);if(el)el.classList.add('selected');});
    }
    this.openModal('modal-strategy');
    setTimeout(()=>this.$('f-name').focus(),200);
  },

  handleStrategySave(e) {
    e.preventDefault();
    const n=v=>v===''?null:Number(v);
    const data={
      name:this.$('f-name').value.trim(), platform:this.$('f-platform').value, instrument:this.$('f-instrument').value.trim().toUpperCase(),
      timeframe:this.$('f-timeframe').value, status:this.$('f-status').value, createdAt:this.$('f-createdAt').value||new Date().toISOString().slice(0,10),
      magicNumber:this.$('f-magicNumber').value.trim(), activeLocation:this.$('f-activeLocation').value.trim(),
      profitFactor:n(this.$('f-profitFactor').value), maxDrawdown:n(this.$('f-maxDrawdown').value), drawdownMonteCarlo:n(this.$('f-drawdownMonteCarlo').value),
      returnDdRatio:n(this.$('f-returnDdRatio').value), winRate:n(this.$('f-winRate').value), avgTrade:n(this.$('f-avgTrade').value),
      totalTrades:n(this.$('f-totalTrades').value), netProfit:n(this.$('f-netProfit').value), stability:n(this.$('f-stability').value),
      annualReturn:n(this.$('f-annualReturn').value), notes:this.$('f-notes').value.trim(),
      tags:[...this.$$('.tag-toggle.selected')].map(t=>t.dataset.tag),
    };
    if(!data.name){this.toast('Nombre obligatorio','error');return;}
    if(this.state.editingId){DataManager.Strategies.update(this.state.editingId,data);this.toast('Estrategia actualizada','success');}
    else{DataManager.Strategies.create(data);this.toast('Estrategia creada','success');}
    this.closeModal('modal-strategy'); this.render();
  },

  confirmDelete(id) {
    const s=DataManager.Strategies.getById(id); if(!s) return;
    const ov=document.createElement('div'); ov.className='confirm-overlay';
    ov.innerHTML=`<div class="confirm-box"><h3>¿Eliminar?</h3><p>Se eliminará <strong>${this.esc(s.name)}</strong>.</p><div class="confirm-actions"><button class="btn btn-secondary" id="cn">Cancelar</button><button class="btn btn-danger" id="cy">Eliminar</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#cn').addEventListener('click',()=>ov.remove());
    ov.querySelector('#cy').addEventListener('click',()=>{DataManager.Strategies.remove(id);this.state.selected.delete(id);ov.remove();this.toast('Eliminada','info');this.render();});
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  },

  /* ---- Detail ---- */
  openDetail(id) {
    const s=DataManager.Strategies.getById(id); if(!s) return;
    const st=DataManager.STRATEGY_STATUSES.find(x=>x.value===s.status)||DataManager.STRATEGY_STATUSES[0];
    const mHTML=DataManager.METRICS.map(m=>`<div class="detail-item"><div class="detail-label">${m.label}</div><div class="detail-value">${m.fmt(s[m.key])}</div></div>`).join('');
    const tags=(s.tags||[]).map(t=>`<span class="tag-pill">${t}</span>`).join('');
    this.$('detail-title').textContent=s.name;
    this.$('detail-content').innerHTML=`<div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Plataforma</div><div class="detail-value">${this.esc(s.platform||'—')}</div></div>
      <div class="detail-item"><div class="detail-label">Instrumento</div><div class="detail-value">${this.esc(s.instrument||'—')}</div></div>
      <div class="detail-item"><div class="detail-label">Timeframe</div><div class="detail-value">${this.esc(s.timeframe||'—')}</div></div>
      <div class="detail-item"><div class="detail-label">Estado</div><div class="detail-value"><span class="status-badge" style="--status-color:${st.color}"><span class="status-dot"></span>${st.label}</span></div></div>
      <div class="detail-item"><div class="detail-label">Magic Number</div><div class="detail-value mono">${this.esc(s.magicNumber||'—')}</div></div>
      <div class="detail-item"><div class="detail-label">Fecha</div><div class="detail-value">${s.createdAt||'—'}</div></div>
      ${s.activeLocation?`<div class="detail-item detail-full"><div class="detail-label">Ubicación</div><div class="detail-value">${this.esc(s.activeLocation)}</div></div>`:''}
    </div><div style="padding:.4rem 1.25rem .6rem"><div class="detail-label" style="margin-bottom:.4rem">Métricas</div></div><div class="detail-grid">${mHTML}</div>
    ${tags?`<div class="detail-tags" style="padding:.4rem 1.25rem">${tags}</div>`:''}
    ${s.notes?`<div class="detail-notes">${this.esc(s.notes)}</div>`:''}`;
    this.openModal('modal-detail');
  },

  /* ---- Compare ---- */
  renderCompare() {
    const all=DataManager.Strategies.getAll(), sel=this.$('compare-selector');
    sel.innerHTML=all.length?all.map(s=>{const st=DataManager.STRATEGY_STATUSES.find(x=>x.value===s.status)||DataManager.STRATEGY_STATUSES[0];return `<button class="compare-chip ${this.state.selected.has(s.id)?'selected':''}" data-id="${s.id}"><span class="chip-status" style="background:${st.color}"></span>${this.esc(s.name)} <span class="mono" style="font-size:.65rem;opacity:.5">${s.timeframe||''}</span></button>`;}).join(''):'<div style="color:var(--text-muted);font-size:.82rem">No hay estrategias.</div>';
    sel.querySelectorAll('.compare-chip').forEach(c=>c.addEventListener('click',()=>{const id=c.dataset.id;if(this.state.selected.has(id))this.state.selected.delete(id);else if(this.state.selected.size<10)this.state.selected.add(id);else{this.toast('Máximo 10','error');return;}this.renderCompare();this.renderTable();}));

    const ct=this.$('compare-table-container'), sa=all.filter(s=>this.state.selected.has(s.id));
    if(sa.length<2){ct.innerHTML=`<div class="compare-empty">Selecciona al menos 2 estrategias. (${this.state.selected.size}/10)</div>`;return;}
    const info=[{l:'Plataforma',g:s=>this.esc(s.platform||'—')},{l:'Instrumento',g:s=>`<span class="mono">${this.esc(s.instrument||'—')}</span>`},{l:'TF',g:s=>s.timeframe||'—'},{l:'Estado',g:s=>{const st=DataManager.STRATEGY_STATUSES.find(x=>x.value===s.status)||DataManager.STRATEGY_STATUSES[0];return `<span class="status-badge" style="--status-color:${st.color}"><span class="status-dot"></span>${st.label}</span>`;}},,{l:'Magic#',g:s=>`<span class="mono">${this.esc(s.magicNumber||'—')}</span>`},{l:'Ubicación',g:s=>this.esc(s.activeLocation||'—')}].filter(Boolean);
    let h='<table class="compare-table"><thead><tr><th>Métrica</th>';sa.forEach(s=>h+=`<th>${this.esc(s.name)}</th>`);h+='</tr></thead><tbody>';
    info.forEach(r=>{h+=`<tr><td><strong>${r.l}</strong></td>`;sa.forEach(s=>h+=`<td>${r.g(s)}</td>`);h+='</tr>';});
    DataManager.METRICS.forEach(m=>{const vs=sa.map(s=>s[m.key]!=null?Number(s[m.key]):null),ns=vs.filter(v=>v!==null);const best=ns.length?(m.higher?Math.max(...ns):Math.min(...ns)):null;const worst=ns.length>1?(m.higher?Math.min(...ns):Math.max(...ns)):null;const rng=ns.length?Math.max(...ns)-Math.min(...ns):0;const mn=ns.length?Math.min(...ns):0;
      h+=`<tr><td><strong>${m.label}</strong></td>`;sa.forEach((s,i)=>{const v=vs[i],fmt=m.fmt(v);let c='';if(v!==null&&ns.length>1){if(v===best)c='best-val';if(v===worst)c='worst-val';}const bw=(v!==null&&rng>0)?((v-mn)/rng*100):(v!==null?100:0);h+=`<td class="metric-bar-cell ${c}"><div class="mono">${fmt}</div><div class="metric-bar" style="width:${bw}%;background:${c==='best-val'?'var(--green)':c==='worst-val'?'var(--red)':'var(--accent)'}"></div></td>`;});h+='</tr>';});
    h+='<tr><td><strong>Tags</strong></td>';sa.forEach(s=>h+='<td>'+(s.tags||[]).map(t=>`<span class="tag-pill">${t}</span>`).join(' ')+'</td>');h+='</tr></tbody></table>';
    ct.innerHTML=h;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
