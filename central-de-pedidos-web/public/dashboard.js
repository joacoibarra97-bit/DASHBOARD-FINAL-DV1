/* ===================== Estado ===================== */
const RAW = window.__REPORT_DATA__ || {};
const ORIGINAL = JSON.parse(JSON.stringify(RAW));
let ORIGINAL_SAVED = JSON.parse(JSON.stringify(RAW));
let DATA = JSON.parse(JSON.stringify(RAW));

const MONTHS = ['Abril 2026','Mayo 2026','Junio 2026','Julio 2026'];
const AVAILABLE_MONTHS = Object.keys(DATA);
let currentMonth = AVAILABLE_MONTHS.includes('Julio 2026') ? 'Julio 2026' : (AVAILABLE_MONTHS.includes('Junio 2026') ? 'Junio 2026' : AVAILABLE_MONTHS[0]);

function ensureManual(obj){
  Object.keys(obj).forEach(month => {
    Object.keys(obj[month]).forEach(store => {
      if(!obj[month][store].manual){
        obj[month][store].manual = { whatsapp:0, telefono:0, online:0 };
      }
      if(!obj[month][store].yearAgo){
        obj[month][store].yearAgo = { total:0, rappi:0, py:0, cat:0 };
      }
    });
  });
}
ensureManual(DATA);
ensureManual(ORIGINAL);

const STORES = Object.keys(DATA[currentMonth]).filter(s => s !== 'General');
const TAB_ORDER = ['General', ...STORES, 'Histórico'];
let currentTab = 'General';
let tableMetric = 'count'; // 'count' | 'revenue'
let historicoStore = 'Todos los locales';
let historicoMetric = 'count'; // 'count' | 'revenue'

const CHANNEL_COLORS = { Rappi:'#EE9D2B', PedidosYa:'#DE5B45', CAT:'#2F7B6E' };

/* ===================== Helpers de formato ===================== */
function fmtInt(n){ return Math.round(n).toLocaleString('es-AR'); }
function fmtMoney(n){ return '$' + Math.round(n).toLocaleString('es-AR'); }
function fmtPct(n){ return (n*100).toFixed(1) + '%'; }
function parseEditedNumber(text){
  const cleaned = String(text).replace(/[^\d.,-]/g,'').replace(/\./g,'').replace(',', '.');
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
function fmtDateShort(iso){
  const d = new Date(iso + 'T12:00:00');
  return d.getDate() + ' ' + ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()];
}
function weekday(iso){
  const d = new Date(iso + 'T12:00:00');
  return DIAS_SEMANA[d.getDay()];
}

/* ===================== Derivaciones ===================== */
function totalPedidos(store){
  const c = store.channels;
  return c.Rappi.count + c.PedidosYa.count + c.CAT.count;
}
function totalRevenue(store){
  const c = store.channels;
  return c.Rappi.revenue + c.PedidosYa.revenue + c.CAT.revenue;
}

/* ===================== Render: barra de meses y tabs ===================== */
function renderMonthSelect(){
  const el = document.getElementById('monthSelect');
  el.innerHTML = '';
  MONTHS.forEach(m => {
    const btn = document.createElement('div');
    const available = AVAILABLE_MONTHS.includes(m);
    btn.className = 'month-chip' + (m === currentMonth ? ' active' : '') + (!available ? ' disabled' : '');
    btn.textContent = m.split(' ')[0];
    if(available){
      btn.addEventListener('click', () => { currentMonth = m; renderAll(); });
    }
    el.appendChild(btn);
  });
}

function renderTabs(){
  const el = document.getElementById('tabBar');
  el.innerHTML = '';
  TAB_ORDER.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (t === currentTab ? ' active' : '');
    btn.textContent = t === 'General' ? '📍 General' : t === 'Histórico' ? '📈 Histórico' : t;
    btn.addEventListener('click', () => { currentTab = t; tableMetric='count'; renderMain(); });
    el.appendChild(btn);
  });
}

/* ===================== Render principal ===================== */
function renderAll(){
  renderMonthSelect();
  renderTabs();
  renderMain();
}

function renderMain(){
  renderTabs();

  if(currentTab === 'Histórico'){
    document.getElementById('resetBtn').style.display = 'none';
    renderHistoricoView();
    return;
  }
  document.getElementById('resetBtn').style.display = '';

  const store = DATA[currentMonth][currentTab];
  const wrap = document.getElementById('mainWrap');
  const isGeneral = currentTab === 'General';
  const tp = totalPedidos(store);
  const trv = totalRevenue(store);
  const ticketProm = tp > 0 ? trv / tp : 0;
  const payTotal = store.payment.SI.count + store.payment.NO.count;
  const pctTarjeta = payTotal > 0 ? store.payment.SI.count / payTotal : 0;

  let html = '';
  let sectionCounter = 1;
  const nextIdx = () => String(sectionCounter++).padStart(2,'0');

  /* ---- KPIs ---- */
  html += `<div class="section-title"><span class="idx">${nextIdx()}</span> Resumen ${isGeneral ? 'general' : '— ' + currentTab}<span class="edit-hint">✎ editable</span></div>`;
  html += `<div class="kpi-row">
    <div class="kpi-card">
      <p class="kpi-label">Pedidos válidos</p>
      <p class="kpi-value">${fmtInt(tp)}</p>
      <p class="kpi-sub">excl. abandonos y cancelados</p>
    </div>
    <div class="kpi-card">
      <p class="kpi-label">Facturación total</p>
      <p class="kpi-value">${fmtMoney(trv)}</p>
      <p class="kpi-sub">suma de los 3 canales</p>
    </div>
    <div class="kpi-card">
      <p class="kpi-label">Ticket promedio</p>
      <p class="kpi-value">${fmtMoney(ticketProm)}</p>
      <p class="kpi-sub">facturación / pedidos</p>
    </div>
    <div class="kpi-card">
      <p class="kpi-label">Pago con tarjeta</p>
      <p class="kpi-value">${fmtPct(pctTarjeta)}</p>
      <p class="kpi-sub">${fmtInt(store.payment.SI.count)} de ${fmtInt(payTotal)} pedidos</p>
    </div>
    <div class="kpi-card warn">
      <p class="kpi-label">Pedidos perdidos</p>
      <p class="kpi-value">${fmtInt(store.abandoned + store.cancelled)}</p>
      <p class="kpi-sub">${fmtInt(store.abandoned)} abandonos + ${fmtInt(store.cancelled)} cancelados</p>
    </div>
  </div>`;

  /* ---- Comparación vs mes anterior ---- */
  html += `<div class="section-title"><span class="idx">${nextIdx()}</span> Comparación vs. mes anterior</div>`;
  const prevMonth = previousMonthOf(currentMonth);
  if(prevMonth && DATA[prevMonth][currentTab]){
    html += `<p class="section-note">Si editás algún número a mano, esta comparación se recalcula sola con el valor nuevo.</p>`;
    html += comparisonTableHTML(store, DATA[prevMonth][currentTab], prevMonth, currentMonth);
  } else {
    html += `<p class="section-note">Todavía no hay datos del mes anterior a ${currentMonth} cargados para comparar.</p>`;
  }

  /* ---- Canales ---- */
  html += `<div class="section-title"><span class="idx">${nextIdx()}</span> Pedidos por canal<span class="edit-hint">✎ editable</span></div>`;
  html += `<p class="section-note">C.A.T. agrupa Delivery (salón), Menú Día y PO (pedido online). Tocá un número para corregirlo manualmente.</p>`;
  html += `<div class="channel-row">`;
  [['Rappi','rappi'],['PedidosYa','py'],['CAT','cat']].forEach(([key,cls]) => {
    const ch = store.channels[key];
    const share = tp > 0 ? ch.count / tp : 0;
    html += `<div class="channel-card ${cls}">
      <div class="channel-head">
        <span class="channel-name">${key === 'CAT' ? 'C.A.T.' : key === 'PedidosYa' ? 'PedidosYa' : 'Rappi'}</span>
        <span class="channel-share">${fmtPct(share)} del total</span>
      </div>
      <div class="channel-count" contenteditable="true" data-field="channels.${key}.count">${fmtInt(ch.count)}</div>
      <div class="channel-rev">Facturación: <b contenteditable="true" data-field="channels.${key}.revenue">${fmtMoney(ch.revenue)}</b></div>`;
    if(key === 'CAT'){
      html += `<div class="sub-list">`;
      [['D','Delivery'],['MD','Menú Día'],['PO','Pedido Online']].forEach(([sk,label]) => {
        const s = ch.sub[sk];
        html += `<div class="sub-item"><span>${label}</span><span contenteditable="true" data-field="channels.CAT.sub.${sk}.count">${fmtInt(s.count)}</span> &nbsp;·&nbsp; <span contenteditable="true" data-field="channels.CAT.sub.${sk}.revenue">${fmtMoney(s.revenue)}</span></div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });
  html += `</div>`;

  /* ---- Otros canales (carga manual) ---- */
  const manual = store.manual;
  const manualTotal = (manual.whatsapp||0) + (manual.telefono||0) + (manual.online||0);
  html += `<div class="section-title"><span class="idx">${nextIdx()}</span> Otros canales (carga manual)<span class="edit-hint">✎ editable</span></div>`;
  html += `<p class="section-note">Estos pedidos no están en las planillas de Waitry — cargalos a mano acá para sumarlos al panorama general.</p>`;
  html += `<div class="manual-row">
    <div class="manual-card">
      <span class="m-icon">💬</span>
      <p class="m-label">WhatsApp</p>
      <input class="manual-input" type="number" min="0" inputmode="numeric" data-manual="whatsapp" value="${manual.whatsapp||0}">
    </div>
    <div class="manual-card">
      <span class="m-icon">📞</span>
      <p class="m-label">Teléfono</p>
      <input class="manual-input" type="number" min="0" inputmode="numeric" data-manual="telefono" value="${manual.telefono||0}">
    </div>
    <div class="manual-card">
      <span class="m-icon">🌐</span>
      <p class="m-label">Pedidos Online</p>
      <input class="manual-input" type="number" min="0" inputmode="numeric" data-manual="online" value="${manual.online||0}">
    </div>
  </div>`;
  html += `<div class="manual-total-bar"><span>Total pedidos (canales de planilla + carga manual)</span><b>${fmtInt(tp + manualTotal)}</b></div>`;

  /* ---- Año anterior (carga manual) ---- */
  const ya = store.yearAgo;
  const hasYearAgo = (ya.total || 0) > 0;
  html += `<div class="section-title"><span class="idx">${nextIdx()}</span> Año anterior (carga manual)<span class="edit-hint">✎ editable</span></div>`;
  html += `<p class="section-note">Esto tampoco está en las planillas — cargalo a mano para comparar contra el mismo mes del año pasado.</p>`;
  html += `<div class="manual-row" style="grid-template-columns:repeat(4,1fr);">
    <div class="manual-card">
      <span class="m-icon">📦</span>
      <p class="m-label">Total pedidos</p>
      <input class="manual-input" type="number" min="0" inputmode="numeric" data-yearago="total" value="${ya.total || 0}">
    </div>
    <div class="manual-card">
      <span class="m-icon">🟠</span>
      <p class="m-label">Rappi</p>
      <input class="manual-input" type="number" min="0" inputmode="numeric" data-yearago="rappi" value="${ya.rappi || 0}">
    </div>
    <div class="manual-card">
      <span class="m-icon">🔴</span>
      <p class="m-label">PedidosYa</p>
      <input class="manual-input" type="number" min="0" inputmode="numeric" data-yearago="py" value="${ya.py || 0}">
    </div>
    <div class="manual-card">
      <span class="m-icon">🟢</span>
      <p class="m-label">C.A.T.</p>
      <input class="manual-input" type="number" min="0" inputmode="numeric" data-yearago="cat" value="${ya.cat || 0}">
    </div>
  </div>`;
  if(hasYearAgo){
    const dTotal = fmtDeltaValue(tp, ya.total);
    const dRappi = fmtDeltaValue(store.channels.Rappi.count, ya.rappi);
    const dPY = fmtDeltaValue(store.channels.PedidosYa.count, ya.py);
    const dCat = fmtDeltaValue(store.channels.CAT.count, ya.cat);
    html += `<div class="kpi-row" style="grid-template-columns:repeat(4,1fr);margin-top:12px;">
      <div class="kpi-card"><p class="kpi-label">Total vs. año ant.</p><p class="kpi-value">${fmtInt(tp)}</p><p class="kpi-sub"><span class="delta-badge ${dTotal.cls}">${dTotal.text}</span> · antes ${fmtInt(ya.total)}</p></div>
      <div class="kpi-card"><p class="kpi-label">Rappi vs. año ant.</p><p class="kpi-value">${fmtInt(store.channels.Rappi.count)}</p><p class="kpi-sub"><span class="delta-badge ${dRappi.cls}">${dRappi.text}</span> · antes ${fmtInt(ya.rappi)}</p></div>
      <div class="kpi-card"><p class="kpi-label">PedidosYa vs. año ant.</p><p class="kpi-value">${fmtInt(store.channels.PedidosYa.count)}</p><p class="kpi-sub"><span class="delta-badge ${dPY.cls}">${dPY.text}</span> · antes ${fmtInt(ya.py)}</p></div>
      <div class="kpi-card"><p class="kpi-label">C.A.T. vs. año ant.</p><p class="kpi-value">${fmtInt(store.channels.CAT.count)}</p><p class="kpi-sub"><span class="delta-badge ${dCat.cls}">${dCat.text}</span> · antes ${fmtInt(ya.cat)}</p></div>
    </div>`;
  } else {
    html += `<p class="section-note">Todavía no cargaste el total del año pasado para esta vista — en cuanto pongas un número en "Total pedidos" aparece la comparación.</p>`;
  }


  /* ---- Tabla comparativa (solo General) ---- */
  if(isGeneral){
    html += `<div class="section-title"><span class="idx">${nextIdx()}</span> Rendimiento por local y canal<span class="edit-hint">✎ editable</span></div>`;
    html += `<div class="table-toggle">
      <button class="toggle-btn ${tableMetric==='count'?'active':''}" data-metric="count">Pedidos</button>
      <button class="toggle-btn ${tableMetric==='revenue'?'active':''}" data-metric="revenue">Facturación</button>
    </div>`;
    html += renderPerfTable();
  }

  /* ---- Charts hora / día ---- */
  html += `<div class="section-title"><span class="idx">${nextIdx()}</span> Pedidos por hora y por día</div>`;
  html += `<div class="chart-row">
    <div class="chart-card">
      <h4>Pedidos por día del mes</h4>
      <p class="chart-note">Barra destacada = día de mayor facturación</p>
      <div class="chart-holder">${dailyChartSVG(store)}</div>
      <div class="best-day-flag">🏆 Mejor día: ${fmtDateShort(store.best_day_revenue.date)} (${weekday(store.best_day_revenue.date)}) — ${fmtMoney(store.best_day_revenue.revenue)} · ${fmtInt(store.best_day_revenue.count)} pedidos</div>
    </div>
    <div class="chart-card">
      <h4>Promedio de pedidos por hora</h4>
      <p class="chart-note">Promedio diario, franja 0–23 h</p>
      <div class="chart-holder">${hourlyChartSVG(store)}</div>
    </div>
  </div>`;

  /* ---- Pagos + pérdidas ---- */
  html += `<div class="section-title"><span class="idx">${nextIdx()}</span> Forma de pago y pedidos perdidos<span class="edit-hint">✎ editable</span></div>`;
  html += `<div class="bottom-row">
    <div class="pay-card">
      <div class="pay-chart-holder donut-holder">${payDonutSVG(store)}<div class="donut-center-label">${fmtPct(pctTarjeta)}<small>tarjeta</small></div></div>
      <div class="pay-legend">
        <div class="pay-item"><span>💳 Tarjeta</span><b>${fmtInt(store.payment.SI.count)} · ${fmtMoney(store.payment.SI.revenue)}</b></div>
        <div class="pay-item"><span>💵 Efectivo</span><b>${fmtInt(store.payment.NO.count)} · ${fmtMoney(store.payment.NO.revenue)}</b></div>
      </div>
    </div>
    <div class="loss-card">
      <div class="loss-row">
        <span class="loss-label">Abandonos (sin nº de entrega)</span>
        <span class="loss-value" contenteditable="true" data-field="abandoned">${fmtInt(store.abandoned)}</span>
      </div>
      <div class="loss-row">
        <span class="loss-label">Cancelados (columna M)</span>
        <span class="loss-value" contenteditable="true" data-field="cancelled">${fmtInt(store.cancelled)}</span>
      </div>
    </div>
  </div>`;

  wrap.innerHTML = html;

  attachEditableHandlers();
  if(isGeneral) attachTableToggle();

  document.getElementById('footerNote').textContent =
    `${currentMonth} · ${isGeneral ? 'los 8 locales' : currentTab} · ${fmtInt(store.num_days || 30)} días con datos`;
}

function previousMonthOf(m){
  const idx = MONTHS.indexOf(m);
  if(idx <= 0) return null;
  const prev = MONTHS[idx-1];
  return AVAILABLE_MONTHS.includes(prev) ? prev : null;
}
function fmtDeltaValue(curr, prev, inverse){
  if(prev === 0 && curr === 0) return { text:'—', cls:'flat' };
  if(prev === 0) return { text:'nuevo', cls: inverse ? 'down' : 'up' };
  const pct = (curr - prev) / Math.abs(prev);
  let cls = Math.abs(pct) < 0.001 ? 'flat' : (pct > 0 ? 'up' : 'down');
  if(inverse && cls !== 'flat') cls = (cls === 'up') ? 'down' : 'up';
  const arrow = cls === 'up' ? '▲' : cls === 'down' ? '▼' : '▬';
  return { text: `${arrow} ${pct >= 0 ? '+' : ''}${(pct*100).toFixed(1)}%`, cls };
}
function comparisonTableHTML(store, prevStore, prevMonthLabel, currMonthLabel){
  const tp = totalPedidos(store), prevTp = totalPedidos(prevStore);
  const trv = totalRevenue(store), prevTrv = totalRevenue(prevStore);
  const ticket = tp > 0 ? trv/tp : 0, prevTicket = prevTp > 0 ? prevTrv/prevTp : 0;
  const payTotal = store.payment.SI.count + store.payment.NO.count;
  const prevPayTotal = prevStore.payment.SI.count + prevStore.payment.NO.count;
  const pctTarjeta = payTotal > 0 ? store.payment.SI.count/payTotal : 0;
  const prevPctTarjeta = prevPayTotal > 0 ? prevStore.payment.SI.count/prevPayTotal : 0;
  const lost = store.abandoned + store.cancelled, prevLost = prevStore.abandoned + prevStore.cancelled;

  const rows = [
    { label:'Pedidos válidos', curr:tp, prev:prevTp, fmt:fmtInt },
    { label:'Facturación total', curr:trv, prev:prevTrv, fmt:fmtMoney },
    { label:'Ticket promedio', curr:ticket, prev:prevTicket, fmt:fmtMoney },
    { label:'% pago con tarjeta', curr:pctTarjeta, prev:prevPctTarjeta, fmt:fmtPct },
    { label:'Pedidos perdidos (aband. + cancel.)', curr:lost, prev:prevLost, fmt:fmtInt, inverse:true },
  ];

  let html = `<div class="perf-table-wrap"><table class="perf"><thead><tr><th>Métrica</th><th>${prevMonthLabel}</th><th>${currMonthLabel}</th><th>Variación</th></tr></thead><tbody>`;
  rows.forEach(r => {
    const d = fmtDeltaValue(r.curr, r.prev, r.inverse);
    html += `<tr><td>${r.label}</td><td>${r.fmt(r.prev)}</td><td>${r.fmt(r.curr)}</td><td><span class="delta-badge ${d.cls}">${d.text}</span></td></tr>`;
  });
  html += `<tr><td colspan="4" style="padding:2px 0;border-bottom:2px solid var(--ink);"></td></tr>`;
  [['Rappi','Rappi'],['PedidosYa','PedidosYa'],['CAT','C.A.T.']].forEach(([key,label]) => {
    const cCount = store.channels[key].count, pCount = prevStore.channels[key].count;
    const cRev = store.channels[key].revenue, pRev = prevStore.channels[key].revenue;
    const dCount = fmtDeltaValue(cCount, pCount);
    const dRev = fmtDeltaValue(cRev, pRev);
    html += `<tr><td>${label} — pedidos</td><td>${fmtInt(pCount)}</td><td>${fmtInt(cCount)}</td><td><span class="delta-badge ${dCount.cls}">${dCount.text}</span></td></tr>`;
    html += `<tr><td>${label} — facturación</td><td>${fmtMoney(pRev)}</td><td>${fmtMoney(cRev)}</td><td><span class="delta-badge ${dRev.cls}">${dRev.text}</span></td></tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}

/* ===================== Tabla de rendimiento ===================== */
function renderPerfTable(){
  const channels = [['Rappi','Rappi'],['PedidosYa','PedidosYa'],['CAT','C.A.T.']];
  const rows = STORES.map(s => {
    const st = DATA[currentMonth][s];
    return { name: s, channels: st.channels };
  });

  // encontrar mejor/peor y total por columna (para el % del canal)
  const colStats = {};
  channels.forEach(([key]) => {
    const vals = rows.map(r => tableMetric === 'count' ? r.channels[key].count : r.channels[key].revenue);
    const sum = vals.reduce((a,b) => a+b, 0);
    colStats[key] = { max: Math.max(...vals), min: Math.min(...vals), sum };
  });

  let html = `<div class="perf-table-wrap"><table class="perf"><thead><tr><th>Local</th>`;
  channels.forEach(([,label]) => { html += `<th>${label}</th>`; });
  html += `<th>Total</th></tr></thead><tbody>`;

  rows.forEach(r => {
    html += `<tr><td>${r.name}</td>`;
    let rowTotal = 0;
    channels.forEach(([key]) => {
      const val = tableMetric === 'count' ? r.channels[key].count : r.channels[key].revenue;
      rowTotal += val;
      let cls = '';
      if(val === colStats[key].max && colStats[key].max !== colStats[key].min) cls = 'best';
      else if(val === colStats[key].min && colStats[key].max !== colStats[key].min) cls = 'worst';
      const display = tableMetric === 'count' ? fmtInt(val) : fmtMoney(val);
      const pct = colStats[key].sum > 0 ? (val / colStats[key].sum * 100) : 0;
      html += `<td class="${cls}"><span class="cell-val" contenteditable="true" data-store="${r.name}" data-field="channels.${key}.${tableMetric}">${display}</span><span class="cell-pct">(${pct.toFixed(1)}%)</span></td>`;
    });
    html += `<td>${tableMetric === 'count' ? fmtInt(rowTotal) : fmtMoney(rowTotal)}</td></tr>`;
  });

  html += `</tbody></table></div>`;
  html += `<div class="legend-row">
    <span><span class="legend-dot" style="background:var(--good-text)"></span>Mejor local del canal</span>
    <span><span class="legend-dot" style="background:var(--bad-text)"></span>Peor local del canal</span>
    <span>El % es la participación de ese local sobre el total del canal (recalcula solo al editar)</span>
  </div>`;
  return html;
}

function attachTableToggle(){
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tableMetric = btn.dataset.metric;
      renderMain();
    });
  });
  // los spans editables de la tabla (valor crudo, sin el %) usan data-store, manejarlos aparte
  document.querySelectorAll('table.perf .cell-val[contenteditable="true"]').forEach(el => {
    el.addEventListener('blur', () => {
      const storeName = el.dataset.store;
      const field = el.dataset.field; // channels.KEY.count|revenue
      const val = parseEditedNumber(el.textContent);
      setByPath(DATA[currentMonth][storeName], field, val);
      renderMain();
    });
    el.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); el.blur(); } });
  });
}

/* ===================== Edición genérica (KPI / canales / pérdidas) ===================== */
function setByPath(obj, path, value){
  const parts = path.split('.');
  let cur = obj;
  for(let i=0;i<parts.length-1;i++) cur = cur[parts[i]];
  cur[parts[parts.length-1]] = value;
}
function attachEditableHandlers(){
  document.querySelectorAll('[data-field]:not(table.perf [data-field])').forEach(el => {
    el.addEventListener('blur', () => {
      const field = el.dataset.field;
      const val = parseEditedNumber(el.textContent);
      const store = DATA[currentMonth][currentTab];
      setByPath(store, field, val);
      renderMain();
    });
    el.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); el.blur(); } });
  });
  document.querySelectorAll('input[data-manual]').forEach(inp => {
    inp.addEventListener('change', () => {
      const key = inp.dataset.manual;
      const val = Math.max(0, parseInt(inp.value, 10) || 0);
      DATA[currentMonth][currentTab].manual[key] = val;
      renderMain();
    });
  });
  document.querySelectorAll('input[data-yearago]').forEach(inp => {
    inp.addEventListener('change', () => {
      const key = inp.dataset.yearago;
      const val = Math.max(0, parseInt(inp.value, 10) || 0);
      DATA[currentMonth][currentTab].yearAgo[key] = val;
      renderMain();
    });
  });
}

/* ===================== Vista Histórico (todos los meses) ===================== */
function renderHistoricoView(){
  const months = MONTHS.filter(m => AVAILABLE_MONTHS.includes(m));
  const storeOptions = ['Todos los locales', ...STORES];
  if(historicoStore !== 'Todos los locales' && !STORES.includes(historicoStore)){
    historicoStore = 'Todos los locales';
  }

  function valueFor(month, metric){
    const key = historicoStore === 'Todos los locales' ? 'General' : historicoStore;
    const st = DATA[month][key];
    return metric === 'count' ? totalPedidos(st) : totalRevenue(st);
  }

  const values = months.map(m => valueFor(m, historicoMetric));

  let html = `<div class="section-title"><span class="idx">01</span> Histórico de pedidos por mes</div>`;
  html += `<p class="section-note">Elegí un local o mirá la suma de los 8. Si más adelante cargás más meses o editás algún dato, este gráfico se actualiza solo.</p>`;

  html += `<div class="table-toggle">`;
  storeOptions.forEach(s => {
    html += `<button class="toggle-btn ${s === historicoStore ? 'active' : ''}" data-store-opt="${s}">${s === 'Todos los locales' ? '📍 Todos los locales' : s}</button>`;
  });
  html += `</div>`;
  html += `<div class="table-toggle" style="margin-top:6px;">
    <button class="toggle-btn ${historicoMetric === 'count' ? 'active' : ''}" data-metric-opt="count">Pedidos</button>
    <button class="toggle-btn ${historicoMetric === 'revenue' ? 'active' : ''}" data-metric-opt="revenue">Facturación</button>
  </div>`;

  html += `<div class="chart-card" style="margin-top:16px;">
    <h4>${historicoStore} — ${historicoMetric === 'count' ? 'pedidos válidos' : 'facturación'} por mes</h4>
    <p class="chart-note">${months.length < 2 ? 'Cargá al menos 2 meses para ver la evolución.' : 'Comparación mes a mes'}</p>
    <div class="chart-holder" style="height:280px;">${historicoChartSVG(months, values, historicoMetric)}</div>
  </div>`;

  html += `<div class="kpi-row" style="grid-template-columns:repeat(${Math.max(months.length,1)},1fr);margin-top:14px;">`;
  months.forEach((m, i) => {
    const v = values[i];
    let sub = 'mes base';
    if(i > 0){
      const d = fmtDeltaValue(v, values[i-1]);
      sub = `<span class="delta-badge ${d.cls}">${d.text}</span> vs. mes ant.`;
    }
    html += `<div class="kpi-card"><p class="kpi-label">${m}</p><p class="kpi-value">${historicoMetric === 'count' ? fmtInt(v) : fmtMoney(v)}</p><p class="kpi-sub">${sub}</p></div>`;
  });
  html += `</div>`;

  const wrap = document.getElementById('mainWrap');
  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-store-opt]').forEach(btn => {
    btn.addEventListener('click', () => { historicoStore = btn.dataset.storeOpt; renderMain(); });
  });
  wrap.querySelectorAll('[data-metric-opt]').forEach(btn => {
    btn.addEventListener('click', () => { historicoMetric = btn.dataset.metricOpt; renderMain(); });
  });

  document.getElementById('footerNote').textContent = `Histórico · ${months.length} mes(es) con datos cargados`;
}

function historicoChartSVG(months, values, metric){
  const W = 640, H = 260;
  const padL = 54, padR = 20, padT = 34, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = Math.max(values.length, 1);
  const max = Math.max(...values, 1) * 1.18;
  const slot = plotW / n;
  const barW = Math.min(84, slot * 0.55);

  let bars = '', labels = '';
  months.forEach((m, i) => {
    const v = values[i];
    const x = padL + i * slot + (slot - barW) / 2;
    const h = (v / max) * plotH;
    const y = padT + plotH - h;
    const disp = metric === 'count' ? fmtInt(v) : fmtMoney(v);
    bars += `<rect class="bar-rect" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" rx="5" fill="#1F2E52"><title>${m}: ${disp}</title></rect>`;
    labels += `<text x="${(x+barW/2).toFixed(1)}" y="${(y-10).toFixed(1)}" text-anchor="middle" style="font-family:var(--font-display);font-size:14px;font-weight:800;fill:var(--ink);">${disp}</text>`;
    labels += `<text x="${(x+barW/2).toFixed(1)}" y="${H-12}" text-anchor="middle" class="axis-label" style="font-size:12px;">${m.split(' ')[0]}</text>`;
  });
  const baseline = `<line class="grid-line" x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${baseline}${bars}${labels}</svg>`;
}

/* ===================== Charts (SVG puro, sin dependencias externas) ===================== */
function svgBar(x, w, y, h, fill, title){
  const r = Math.min(2.5, w/2);
  return `<rect class="bar-rect" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" rx="${r}" fill="${fill}"><title>${title}</title></rect>`;
}

function barChartSVG(values, labelFn, colorFn, opts){
  opts = opts || {};
  const W = 640, H = 220;
  const padL = 42, padR = 8, padT = 10, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(...values, 1);
  const n = values.length;
  const gap = opts.gap != null ? opts.gap : 3;
  const barW = Math.max(1.5, plotW / n - gap);

  let bars = '';
  values.forEach((v, i) => {
    const x = padL + i * (plotW / n) + ( (plotW/n) - barW )/2;
    const h = (v / max) * plotH;
    const y = padT + plotH - h;
    bars += svgBar(x, barW, y, h, colorFn(v, i), labelFn(v, i));
  });

  // gridlines (4 horizontal)
  let grid = '';
  const ticks = 4;
  for(let t = 0; t <= ticks; t++){
    const y = padT + plotH - (plotH * t / ticks);
    const val = (max * t / ticks);
    grid += `<line class="grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}"/>`;
    grid += `<text class="axis-label" x="${padL-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${opts.yFmt ? opts.yFmt(val) : Math.round(val)}</text>`;
  }

  // x labels (skip to avoid crowding)
  let xlabels = '';
  const maxLabels = opts.maxLabels || 8;
  const step = Math.max(1, Math.ceil(n / maxLabels));
  for(let i = 0; i < n; i += step){
    const x = padL + i * (plotW / n) + (plotW/n)/2;
    xlabels += `<text class="axis-label" x="${x.toFixed(1)}" y="${H-6}" text-anchor="middle">${opts.xLabel ? opts.xLabel(i) : ''}</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${grid}${bars}${xlabels}</svg>`;
}

function dailyChartSVG(store){
  const values = store.daily.map(d => d.revenue);
  const bestIdx = store.daily.findIndex(d => d.date === store.best_day_revenue.date);
  return barChartSVG(
    values,
    (v,i) => `${fmtDateShort(store.daily[i].date)}: ${fmtMoney(v)}`,
    (v,i) => i === bestIdx ? '#EE9D2B' : '#1F2E52',
    {
      yFmt: (v) => '$' + Math.round(v/1000) + 'k',
      maxLabels: 8,
      xLabel: (i) => fmtDateShort(store.daily[i].date).split(' ')[0],
      gap: 2
    }
  );
}

function hourlyChartSVG(store){
  const values = store.hourly_avg;
  return barChartSVG(
    values,
    (v,i) => `${i}h: ${v} pedidos prom.`,
    () => '#2F7B6E',
    {
      yFmt: (v) => v.toFixed(0),
      maxLabels: 12,
      xLabel: (i) => i + 'h',
      gap: 3
    }
  );
}

function payDonutSVG(store){
  const si = store.payment.SI.count, no = store.payment.NO.count;
  const total = si + no || 1;
  const r = 46, cx = 60, cy = 60, sw = 16;
  const circ = 2 * Math.PI * r;
  const siLen = circ * (si/total);
  const noLen = circ - siLen;
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#EE9D2B" stroke-width="${sw}"
      stroke-dasharray="${noLen.toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 ${cx} ${cy})">
      <title>Efectivo: ${fmtInt(no)} pedidos</title>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#2F7B6E" stroke-width="${sw}"
      stroke-dasharray="${siLen.toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="${-noLen.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})">
      <title>Tarjeta: ${fmtInt(si)} pedidos</title>
    </circle>
  </svg>`;
}

/* ===================== Reset ===================== */
document.getElementById('resetBtn').addEventListener('click', () => {
  DATA[currentMonth][currentTab] = JSON.parse(JSON.stringify(ORIGINAL[currentMonth][currentTab]));
  renderMain();
});


document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn');
  const original = btn.textContent;
  btn.textContent = 'Guardando...';
  btn.disabled = true;
  try {
    const res = await fetch('/api/reporte', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DATA)
    });
    if(!res.ok) throw new Error('save failed');
    ORIGINAL_SAVED = JSON.parse(JSON.stringify(DATA));
    btn.textContent = '✓ Guardado';
  } catch(e){
    btn.textContent = '✕ Error al guardar';
  } finally {
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1800);
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  // "Hornea" el estado actual (con todas las ediciones manuales, de todos los meses y locales)
  // como el nuevo contenido base del archivo, para que al reabrirlo se conserve todo tal cual quedó.
  const rawDataEl = document.getElementById('raw-data');
  rawDataEl.textContent = JSON.stringify(DATA);
  const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `dashboard_pedidos_actualizado_${stamp}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* ===================== Init ===================== */
renderAll();
