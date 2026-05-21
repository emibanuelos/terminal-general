/* ============================================================
   Terminal General — Data Manager
   Persistence, CRUD, calculations for all modules
   ============================================================ */
const DataManager = (() => {
  /* ---- Storage Keys ---- */
  const KEYS = {
    strategies: 'tg_strategies',
    portfolios: 'tg_portfolios',
    accounts:   'tg_accounts',
    weeklyLogs: 'tg_weekly_logs',
  };

  /* ---- Constants ---- */
  const PLATFORMS  = ['StrategyQuant','NinjaTrader','MT4','MT5','Freqtrade','TradingView','Otro'];
  const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1','W1'];
  const TAGS       = ['Tendencia','Breakout','Scalping','Swing','Reversión','Grid','Arbitraje','Mean Reversion'];

  const STRATEGY_STATUSES = [
    { value:'backtesting', label:'🧪 Backtesting', color:'#3b82f6' },
    { value:'paper',       label:'📋 Paper Trading',color:'#f59e0b' },
    { value:'live',        label:'🟢 Live',         color:'#10b981' },
    { value:'paused',      label:'⏸️ Pausada',      color:'#6b7280' },
    { value:'retired',     label:'🔴 Retirada',     color:'#ef4444' },
  ];

  const ACCOUNT_TYPES = [
    { value:'funded',   label:'💰 Fondeo / Prop Firm' },
    { value:'broker',   label:'🏦 Broker Live' },
    { value:'darwinex', label:'🦎 Darwinex Zero' },
    { value:'demo',     label:'📋 Demo' },
  ];

  const ACCOUNT_STATUSES = {
    funded:   [
      { value:'phase1',  label:'Fase 1',  color:'#f59e0b' },
      { value:'phase2',  label:'Fase 2',  color:'#f59e0b' },
      { value:'phase3',  label:'Fase 3',  color:'#f59e0b' },
      { value:'funded',  label:'Funded',  color:'#10b981' },
      { value:'lost',    label:'Perdida', color:'#ef4444' },
      { value:'paused',  label:'Pausada', color:'#6b7280' },
    ],
    broker:   [
      { value:'active', label:'Activa',  color:'#10b981' },
      { value:'paused', label:'Pausada', color:'#6b7280' },
      { value:'closed', label:'Cerrada', color:'#ef4444' },
    ],
    darwinex: [
      { value:'active', label:'Activa',  color:'#10b981' },
      { value:'paused', label:'Pausada', color:'#6b7280' },
      { value:'closed', label:'Cerrada', color:'#ef4444' },
    ],
    demo:     [
      { value:'active', label:'Activa',  color:'#10b981' },
      { value:'paused', label:'Pausada', color:'#6b7280' },
    ],
  };

  const METRICS = [
    { key:'profitFactor',       label:'Profit Factor',    higher:true,  fmt: v => v!=null ? Number(v).toFixed(2) : '—' },
    { key:'maxDrawdown',        label:'Max Drawdown %',   higher:false, fmt: v => v!=null ? Number(v).toFixed(2)+'%' : '—' },
    { key:'drawdownMonteCarlo', label:'DD Monte Carlo %', higher:false, fmt: v => v!=null ? Number(v).toFixed(2)+'%' : '—' },
    { key:'returnDdRatio',      label:'Retorno / DD',     higher:true,  fmt: v => v!=null ? Number(v).toFixed(2) : '—' },
    { key:'winRate',            label:'Win Rate %',       higher:true,  fmt: v => v!=null ? Number(v).toFixed(1)+'%' : '—' },
    { key:'avgTrade',           label:'Avg Trade $',      higher:true,  fmt: v => v!=null ? '$'+Number(v).toFixed(2) : '—' },
    { key:'totalTrades',        label:'Total Trades',     higher:true,  fmt: v => v!=null ? Number(v).toLocaleString() : '—' },
    { key:'netProfit',          label:'Net Profit $',     higher:true,  fmt: v => v!=null ? '$'+Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—' },
    { key:'stability',          label:'Stability',        higher:true,  fmt: v => v!=null ? Number(v).toFixed(2) : '—' },
    { key:'annualReturn',       label:'Retorno Anual %',  higher:true,  fmt: v => v!=null ? Number(v).toFixed(1)+'%' : '—' },
  ];

  const PROP_FIRMS = ['FTMO','MyFundedFX','TopStep','The5ers','Funded Next','E8 Funding','True Forex Funds','Otro'];

  /* ---- Helpers ---- */
  function uid(prefix) { return (prefix||'id') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,9); }
  function load(key)   { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
  function save(key, d){ localStorage.setItem(key, JSON.stringify(d)); }

  /* ---- Migration ---- */
  function migrate() {
    const old = localStorage.getItem('algotracker_strategies');
    if (old && !localStorage.getItem(KEYS.strategies)) {
      localStorage.setItem(KEYS.strategies, old);
    }
  }

  /* ============ STRATEGIES ============ */
  const Strategies = {
    getAll()       { return load(KEYS.strategies); },
    getById(id)    { return this.getAll().find(s => s.id === id); },
    create(data)   { const all = this.getAll(); const s = { id: uid('str'), ...data, createdAt: data.createdAt || new Date().toISOString().slice(0,10) }; all.push(s); save(KEYS.strategies, all); return s; },
    update(id, d)  { const all = this.getAll(); const i = all.findIndex(s=>s.id===id); if(i===-1) return null; all[i]={...all[i],...d}; save(KEYS.strategies, all); return all[i]; },
    remove(id)     { save(KEYS.strategies, this.getAll().filter(s=>s.id!==id)); },
  };

  /* ============ PORTFOLIOS ============ */
  const Portfolios = {
    getAll()       { return load(KEYS.portfolios); },
    getById(id)    { return this.getAll().find(p => p.id === id); },
    create(data)   { const all = this.getAll(); const p = { id: uid('pf'), ...data, createdAt: data.createdAt || new Date().toISOString().slice(0,10) }; all.push(p); save(KEYS.portfolios, all); return p; },
    update(id, d)  { const all = this.getAll(); const i = all.findIndex(p=>p.id===id); if(i===-1) return null; all[i]={...all[i],...d}; save(KEYS.portfolios, all); return all[i]; },
    remove(id)     { save(KEYS.portfolios, this.getAll().filter(p=>p.id!==id)); Accounts.unlinkPortfolio(id); },

    computeMetrics(portfolio) {
      const items = (portfolio.strategies||[]).map(ps => {
        const s = Strategies.getById(ps.strategyId);
        return s ? { ...s, alloc: ps.allocation } : null;
      }).filter(Boolean);
      if (!items.length) return { combinedPF:null, combinedWR:null, maxDD:null, maxDDMC:null, expectedDD:null, totalNetProfit:0, avgAvgTrade:null, annualReturn:null, monthlyReturn:null, strategyCount:0 };

      const totalAlloc = items.reduce((s,i) => s + i.alloc, 0) || 1;
      const wAvg = (key) => { const vals = items.filter(i=>i[key]!=null); if(!vals.length) return null; return vals.reduce((s,i)=>s + (i[key]*(i.alloc/totalAlloc)), 0); };

      return {
        combinedPF:     wAvg('profitFactor'),
        combinedWR:     wAvg('winRate'),
        maxDD:          Math.max(...items.map(i=>i.maxDrawdown||0)),
        maxDDMC:        Math.max(...items.map(i=>i.drawdownMonteCarlo||0)),
        expectedDD:     wAvg('maxDrawdown'),
        totalNetProfit: items.reduce((s,i) => s + (i.netProfit||0), 0),
        avgAvgTrade:    wAvg('avgTrade'),
        annualReturn:   wAvg('annualReturn'),
        monthlyReturn:  wAvg('annualReturn') != null ? wAvg('annualReturn') / 12 : null,
        strategyCount:  items.length,
      };
    },
  };

  /* ============ ACCOUNTS ============ */
  const Accounts = {
    getAll()       { return load(KEYS.accounts); },
    getById(id)    { return this.getAll().find(a => a.id === id); },
    create(data)   { const all = this.getAll(); const a = { id: uid('acc'), payouts:[], ...data, createdAt: data.createdAt || new Date().toISOString().slice(0,10) }; all.push(a); save(KEYS.accounts, all); return a; },
    update(id, d)  { const all = this.getAll(); const i = all.findIndex(a=>a.id===id); if(i===-1) return null; all[i]={...all[i],...d}; save(KEYS.accounts, all); return all[i]; },
    remove(id)     { save(KEYS.accounts, this.getAll().filter(a=>a.id!==id)); WeeklyLogs.removeByAccount(id); },
    unlinkPortfolio(pfId) { const all = this.getAll(); all.forEach(a => { a.portfolioIds = (a.portfolioIds||[]).filter(id=>id!==pfId); }); save(KEYS.accounts, all); },

    addPayout(accId, payout) {
      const all = this.getAll(); const i = all.findIndex(a=>a.id===accId);
      if (i===-1) return; all[i].payouts = all[i].payouts||[]; all[i].payouts.push(payout);
      save(KEYS.accounts, all);
    },
    removePayout(accId, payoutIdx) {
      const all = this.getAll(); const i = all.findIndex(a=>a.id===accId);
      if (i===-1) return; all[i].payouts.splice(payoutIdx, 1);
      save(KEYS.accounts, all);
    },

    getAccountProfit(acc) {
      return (acc.currentBalance||0) - (acc.initialBalance||0);
    },
    getMyProfit(acc) {
      const profit = this.getAccountProfit(acc);
      return profit > 0 ? profit * (acc.profitSharePercent||100) / 100 : 0;
    },
    getTotalPayouts(acc) {
      return (acc.payouts||[]).reduce((s,p) => s + (p.amount||0), 0);
    },
    getStatusInfo(acc) {
      const statuses = ACCOUNT_STATUSES[acc.type] || ACCOUNT_STATUSES.broker;
      return statuses.find(s => s.value === acc.status) || statuses[0];
    },
  };

  /* ============ WEEKLY LOGS ============ */
  const WeeklyLogs = {
    getAll()              { return load(KEYS.weeklyLogs); },
    getByAccount(accId)   { return this.getAll().filter(w => w.accountId === accId).sort((a,b) => b.weekEnding.localeCompare(a.weekEnding)); },
    removeByAccount(accId){ save(KEYS.weeklyLogs, this.getAll().filter(w => w.accountId !== accId)); },

    create(data) {
      const all = this.getAll();
      const profit = (data.endBalance||0) - (data.startBalance||0) - (data.deposits||0) + (data.withdrawals||0);
      const profitPct = data.startBalance ? (profit / data.startBalance * 100) : 0;
      const acc = Accounts.getById(data.accountId);
      const myProfit = profit > 0 ? profit * ((acc?.profitSharePercent||100) / 100) : 0;

      const entry = {
        id: uid('wl'), ...data, profit, profitPercent: profitPct, myProfit,
      };
      all.push(entry);
      save(KEYS.weeklyLogs, all);

      // Auto-update account balance
      if (acc) {
        Accounts.update(acc.id, { currentBalance: data.endBalance, equity: data.endBalance });
      }
      return entry;
    },
    remove(id) { save(KEYS.weeklyLogs, this.getAll().filter(w => w.id !== id)); },
  };

  /* ============ GLOBAL CALCULATIONS ============ */
  function getAuM() {
    const active = ['active','funded','phase1','phase2','phase3'];
    return Accounts.getAll().filter(a => active.includes(a.status)).reduce((s,a) => s + (a.currentBalance||0), 0);
  }

  function getRetirable() {
    return Accounts.getAll()
      .filter(a => ['funded','active'].includes(a.status))
      .reduce((sum, a) => {
        const myProfit = Accounts.getMyProfit(a);
        const paid = Accounts.getTotalPayouts(a);
        return sum + Math.max(0, myProfit - paid);
      }, 0);
  }

  /* ============ EXPORT / IMPORT ============ */
  function download(content, filename, mime) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: mime+';charset=utf-8' }));
    a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
  }

  function exportJSON() {
    const data = { strategies: Strategies.getAll(), portfolios: Portfolios.getAll(), accounts: Accounts.getAll(), weeklyLogs: WeeklyLogs.getAll() };
    download(JSON.stringify(data, null, 2), 'terminal_general_backup.json', 'application/json');
  }

  function importJSON(text) {
    try {
      const data = JSON.parse(text);
      if (data.strategies) { const cur = Strategies.getAll(); const ids = new Set(cur.map(s=>s.id)); const merged = [...cur, ...data.strategies.filter(s=>!ids.has(s.id))]; save(KEYS.strategies, merged); }
      if (data.portfolios) { const cur = Portfolios.getAll(); const ids = new Set(cur.map(p=>p.id)); save(KEYS.portfolios, [...cur, ...data.portfolios.filter(p=>!ids.has(p.id))]); }
      if (data.accounts)   { const cur = Accounts.getAll(); const ids = new Set(cur.map(a=>a.id)); save(KEYS.accounts, [...cur, ...data.accounts.filter(a=>!ids.has(a.id))]); }
      if (data.weeklyLogs) { const cur = WeeklyLogs.getAll(); const ids = new Set(cur.map(w=>w.id)); save(KEYS.weeklyLogs, [...cur, ...data.weeklyLogs.filter(w=>!ids.has(w.id))]); }
      // Legacy: plain array = strategies only
      if (Array.isArray(data)) { const cur = Strategies.getAll(); const ids = new Set(cur.map(s=>s.id)); save(KEYS.strategies, [...cur, ...data.filter(s=>!ids.has(s.id))]); }
      return true;
    } catch { return false; }
  }

  function exportCSV() {
    const all = Strategies.getAll(); if (!all.length) return;
    const h = ['Nombre','Plataforma','Instrumento','TF','Estado','Magic Number','Ubicación','PF','Max DD%','DD MC%','Ret/DD','WR%','Avg Trade','Trades','Net Profit','Stability','Ret Anual%','Fecha','Tags','Notas'];
    const esc = v => '"'+String(v??'').replace(/"/g,'""')+'"';
    const rows = all.map(s => [s.name,s.platform,s.instrument,s.timeframe,s.status,s.magicNumber,s.activeLocation,s.profitFactor,s.maxDrawdown,s.drawdownMonteCarlo,s.returnDdRatio,s.winRate,s.avgTrade,s.totalTrades,s.netProfit,s.stability,s.annualReturn,s.createdAt,(s.tags||[]).join('; '),s.notes].map(esc).join(','));
    download('\uFEFF'+[h.join(','),...rows].join('\n'), 'terminal_general_strategies.csv', 'text/csv');
  }

  /* ============ SAMPLE DATA ============ */
  function loadSampleData() {
    const strats = [
      { id:uid('str'), name:'EMA Crossover Pro', platform:'StrategyQuant', instrument:'USATECHIDXUSD', timeframe:'H1', status:'live', magicNumber:'100234', activeLocation:'VPS Windows - ICMarkets', profitFactor:1.85, maxDrawdown:12.3, drawdownMonteCarlo:18.5, returnDdRatio:3.2, winRate:58.4, avgTrade:45.20, totalTrades:342, netProfit:15458.40, stability:0.87, annualReturn:38.5, createdAt:'2025-08-15', tags:['Tendencia'], notes:'Estrategia base con 3 EMAs.' },
      { id:uid('str'), name:'Breakout Nasdaq V2', platform:'StrategyQuant', instrument:'USATECHIDXUSD', timeframe:'M15', status:'backtesting', magicNumber:'', activeLocation:'', profitFactor:2.10, maxDrawdown:8.7, drawdownMonteCarlo:14.2, returnDdRatio:4.1, winRate:52.1, avgTrade:62.30, totalTrades:189, netProfit:11774.70, stability:0.91, annualReturn:42.0, createdAt:'2025-11-20', tags:['Breakout'], notes:'Nueva versión con filtro de volatilidad.' },
      { id:uid('str'), name:'Patient Trend MT4', platform:'MT4', instrument:'EURUSD', timeframe:'H4', status:'paper', magicNumber:'200456', activeLocation:'VPS Linux - Paper', profitFactor:1.62, maxDrawdown:15.8, drawdownMonteCarlo:22.4, returnDdRatio:2.1, winRate:61.3, avgTrade:28.50, totalTrades:456, netProfit:12996, stability:0.78, annualReturn:28.0, createdAt:'2026-01-10', tags:['Tendencia','Swing'], notes:'Conversión de Pine Script.' },
      { id:uid('str'), name:'Scalper BTCUSDT', platform:'Freqtrade', instrument:'BTC/USDT', timeframe:'M5', status:'paused', magicNumber:'', activeLocation:'', profitFactor:1.45, maxDrawdown:18.2, drawdownMonteCarlo:25.1, returnDdRatio:1.8, winRate:65.7, avgTrade:12.80, totalTrades:1203, netProfit:15398.40, stability:0.72, annualReturn:52.0, createdAt:'2025-06-03', tags:['Scalping'], notes:'Pausada por alta volatilidad.' },
      { id:uid('str'), name:'Mean Rev Gold', platform:'NinjaTrader', instrument:'XAUUSD', timeframe:'H1', status:'live', magicNumber:'300789', activeLocation:'VPS Windows - Pepperstone', profitFactor:1.93, maxDrawdown:10.5, drawdownMonteCarlo:16.8, returnDdRatio:3.8, winRate:55.2, avgTrade:78.90, totalTrades:267, netProfit:21066.30, stability:0.89, annualReturn:45.0, createdAt:'2025-09-28', tags:['Mean Reversion'], notes:'Mejor rendimiento sesión London-NY.' },
      { id:uid('str'), name:'Grid EUR/JPY', platform:'MT5', instrument:'EURJPY', timeframe:'M30', status:'retired', magicNumber:'', activeLocation:'', profitFactor:1.22, maxDrawdown:24.5, drawdownMonteCarlo:35.2, returnDdRatio:1.2, winRate:71.4, avgTrade:8.40, totalTrades:892, netProfit:7492.80, stability:0.55, annualReturn:15.0, createdAt:'2025-03-14', tags:['Grid'], notes:'DD demasiado alto.' },
      { id:uid('str'), name:'Momentum RSI Dax', platform:'StrategyQuant', instrument:'GER40', timeframe:'H1', status:'backtesting', magicNumber:'', activeLocation:'', profitFactor:1.78, maxDrawdown:11.2, drawdownMonteCarlo:17.9, returnDdRatio:3.0, winRate:54.8, avgTrade:52.10, totalTrades:315, netProfit:16411.50, stability:0.84, annualReturn:35.0, createdAt:'2026-03-01', tags:['Tendencia','Breakout'], notes:'Probando en DAX.' },
    ];
    save(KEYS.strategies, strats);

    const s = strats;
    const portfolios = [
      { id:uid('pf'), name:'Nasdaq Combo', description:'Estrategias de tendencia y breakout en Nasdaq', maxRisk:8, strategies:[{strategyId:s[0].id,allocation:5},{strategyId:s[1].id,allocation:3}], createdAt:'2025-12-01', notes:'Portfolio principal.' },
      { id:uid('pf'), name:'Multi-Asset', description:'Diversificación en varios instrumentos', maxRisk:12, strategies:[{strategyId:s[0].id,allocation:4},{strategyId:s[4].id,allocation:5},{strategyId:s[6].id,allocation:3}], createdAt:'2026-02-01', notes:'Diversificación global.' },
    ];
    save(KEYS.portfolios, portfolios);

    const accounts = [
      { id:uid('acc'), name:'FTMO Challenge #1', type:'funded', firm:'FTMO', accountNumber:'90012345', server:'FTMO-Server3', status:'funded', portfolioIds:[portfolios[0].id], initialBalance:100000, currentBalance:108500, equity:108200, profitSharePercent:80, currency:'USD', totalPhases:2, currentPhase:0, rules:{maxDailyDD:5,maxTotalDD:10,profitTarget:10,minTradingDays:5}, challengeCost:500, payouts:[{date:'2026-03-15',amount:3200},{date:'2026-04-15',amount:2800}], createdAt:'2025-10-01', notes:'Primera cuenta funded.' },
      { id:uid('acc'), name:'ICMarkets Live', type:'broker', firm:'ICMarkets', accountNumber:'2048576', server:'ICMarkets-Live07', status:'active', portfolioIds:[portfolios[1].id], initialBalance:5000, currentBalance:7250, equity:7180, profitSharePercent:100, currency:'USD', totalPhases:0, currentPhase:0, rules:{}, challengeCost:0, payouts:[], createdAt:'2025-06-15', notes:'Cuenta personal.' },
      { id:uid('acc'), name:'Darwinex Zero #1', type:'darwinex', firm:'Darwinex', accountNumber:'DWZ.4.12', server:'', status:'active', portfolioIds:[portfolios[0].id], initialBalance:100000, currentBalance:112000, equity:111800, profitSharePercent:15, currency:'USD', totalPhases:0, currentPhase:0, rules:{}, challengeCost:0, payouts:[], darwinName:'DWZ.4.12', dScore:65, investorAllocation:50000, createdAt:'2026-01-20', notes:'Darwin activo.' },
    ];
    save(KEYS.accounts, accounts);

    const wl = [
      { id:uid('wl'), accountId:accounts[0].id, weekEnding:'2026-05-02', startBalance:106000, endBalance:107200, profit:1200, profitPercent:1.13, myProfit:960, deposits:0, withdrawals:0, notes:'Buena semana en Nasdaq.' },
      { id:uid('wl'), accountId:accounts[0].id, weekEnding:'2026-05-09', startBalance:107200, endBalance:108500, profit:1300, profitPercent:1.21, myProfit:1040, deposits:0, withdrawals:0, notes:'Momentum alcista continuó.' },
      { id:uid('wl'), accountId:accounts[1].id, weekEnding:'2026-05-09', startBalance:7000, endBalance:7250, profit:250, profitPercent:3.57, myProfit:250, deposits:0, withdrawals:0, notes:'Gold strategy performing well.' },
    ];
    save(KEYS.weeklyLogs, wl);
  }

  /* ---- Init ---- */
  migrate();

  /* ---- Public API ---- */
  return {
    PLATFORMS, TIMEFRAMES, TAGS, STRATEGY_STATUSES, ACCOUNT_TYPES, ACCOUNT_STATUSES, METRICS, PROP_FIRMS,
    Strategies, Portfolios, Accounts, WeeklyLogs,
    getAuM, getRetirable, exportJSON, importJSON, exportCSV, loadSampleData,
  };
})();
