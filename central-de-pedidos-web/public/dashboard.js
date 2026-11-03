/* ===================== Estado ===================== */
const RAW = window.__REPORT_DATA__ || {};
const ORIGINAL = JSON.parse(JSON.stringify(RAW));
let ORIGINAL_SAVED = JSON.parse(JSON.stringify(RAW));
let DATA = JSON.parse(JSON.stringify(RAW));

// Los meses se arman solos a partir de lo que realmente haya guardado (no una lista fija a mano),
// así cualquier mes nuevo que subas (Agosto, Septiembre, etc.) aparece automáticamente.
const MES_ORDEN = { Enero:0, Febrero:1, Marzo:2, Abril:3, Mayo:4, Junio:5, Julio:6, Agosto:7, Septiembre:8, Octubre:9, Noviembre:10, Diciembre:11 };
function ordenarMeses(meses){
  return meses.slice().sort((a, b) => {
    const [ma, ya] = a.split(' ');
    const [mb, yb] = b.split(' ');
    if(ya !== yb) return parseInt(ya, 10) - parseInt(yb, 10);
    return (MES_ORDEN[ma] ?? 99) - (MES_ORDEN[mb] ?? 99);
  });
}

const AVAILABLE_MONTHS = ordenarMeses(Object.keys(DATA));
const MONTHS = AVAILABLE_MONTHS;
let currentMonth = AVAILABLE_MONTHS.length ? AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1] : null;

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

// Locales de TODOS los meses (un local nuevo, como Franklin, solo existe desde cierto mes)
const STORES = (() => {
  const seen = [];
  AVAILABLE_MONTHS.forEach(m => Object.keys(DATA[m]).forEach(s => { if(s !== 'General' && !seen.includes(s)) seen.push(s); }));
  return seen;
})();
function storesOf(month){ return Object.keys(DATA[month] || {}).filter(s => s !== 'General'); }
// Las pestañas dependen del mes: un local solo aparece en los meses donde tiene datos
function tabOrder(){ return ['General', ...storesOf(currentMonth), 'Histórico']; }
let currentTab = 'General';

/* ===================== Filtro por fechas ===================== */
// Cada local guarda su desglose por día (store.days). Con eso se recalculan todos los totales para
// cualquier rango Desde–Hasta (ambos incluidos), sin volver a cargar el Excel. Los meses cargados con
// una versión anterior no tienen ese desglose: para ellos el filtro queda deshabilitado.
let RANGE = { month: null, from: '', to: '' };
function monthHasDays(month){
  const list = storesOf(month);
  return list.length > 0 && list.every(s => DATA[month][s].days);
}
function rangeInvalid(){ return !!(RANGE.from && RANGE.to && RANGE.from > RANGE.to); }
function rangeActive(){
  return RANGE.month === currentMonth && !!(RANGE.from || RANGE.to) && !rangeInvalid() && monthHasDays(currentMonth);
}
function dmShort(iso){ return iso ? iso.split('-').reverse().slice(0,2).join('/') : ''; }

function emptyStoreView(){
  return {
    total_valid:0, abandoned:0, cancelled:0,
    channels:{ Rappi:{count:0,revenue:0}, PedidosYa:{count:0,revenue:0},
      CAT:{count:0,revenue:0,sub:{ D:{count:0,revenue:0}, MD:{count:0,revenue:0}, PO:{count:0,revenue:0} }} },
    payment:{ SI:{count:0,revenue:0}, NO:{count:0,revenue:0} },
    hourly_avg:new Array(24).fill(0), daily:[],
    best_day_revenue:{date:'',count:0,revenue:0}, best_day_count:{date:'',count:0,revenue:0},
    num_days:0, manual:{whatsapp:0,telefono:0,online:0}, yearAgo:{total:0,rappi:0,py:0,cat:0},
    _hourly:new Array(24).fill(0)
  };
}
function pickBestDays(v){
  const empty = {date:'',count:0,revenue:0};
  v.best_day_revenue = v.daily.reduce((a,b) => b.revenue > a.revenue ? b : a, v.daily[0] || empty);
  v.best_day_count = v.daily.reduce((a,b) => b.count > a.count ? b : a, v.daily[0] || empty);
}
// Totales de UN local para el rango (misma lógica que el parser del servidor)
function deriveStore(st, from, to){
  const v = emptyStoreView();
  let nd = 0;
  Object.keys(st.days || {}).sort().forEach(date => {
    if((from && date < from) || (to && date > to)) return;
    const d = st.days[date];
    v.abandoned += d.ab || 0;
    v.cancelled += d.ca || 0;
    if(!d.n) return;
    v.total_valid += d.n;
    ['Rappi','PedidosYa'].forEach(k => { const c = d.ch[k]; if(c){ v.channels[k].count += c[0]; v.channels[k].revenue += c[1]; } });
    ['D','MD','PO'].forEach(k => {
      const c = d.ch[k];
      if(c){
        v.channels.CAT.sub[k].count += c[0]; v.channels.CAT.sub[k].revenue += c[1];
        v.channels.CAT.count += c[0]; v.channels.CAT.revenue += c[1];
      }
    });
    ['SI','NO'].forEach(p => { v.payment[p].count += d.pay[p][0]; v.payment[p].revenue += d.pay[p][1]; });
    for(let h = 0; h < 24; h++) v._hourly[h] += d.h[h] || 0;
    v.daily.push({ date, count: d.n, revenue: d.rev });
    nd++;
  });
  v.num_days = nd || 1; // igual que el parser
  v.hourly_avg = v._hourly.map(h => Math.round(h / v.num_days * 100) / 100);
  pickBestDays(v);
  return v;
}
// Suma de locales (misma fórmula que buildGeneral del servidor)
function aggregateGeneral(list){
  const g = emptyStoreView();
  const hourlySum = new Array(24).fill(0);
  const dailyAgg = {};
  let daysAccum = 0;
  list.forEach(s => {
    g.total_valid += s.total_valid; g.abandoned += s.abandoned; g.cancelled += s.cancelled;
    ['Rappi','PedidosYa'].forEach(k => { g.channels[k].count += s.channels[k].count; g.channels[k].revenue += s.channels[k].revenue; });
    g.channels.CAT.count += s.channels.CAT.count; g.channels.CAT.revenue += s.channels.CAT.revenue;
    ['D','MD','PO'].forEach(k => { g.channels.CAT.sub[k].count += s.channels.CAT.sub[k].count; g.channels.CAT.sub[k].revenue += s.channels.CAT.sub[k].revenue; });
    ['SI','NO'].forEach(p => { g.payment[p].count += s.payment[p].count; g.payment[p].revenue += s.payment[p].revenue; });
    for(let h = 0; h < 24; h++) hourlySum[h] += s._hourly ? s._hourly[h] : s.hourly_avg[h] * s.num_days;
    s.daily.forEach(r => {
      if(!dailyAgg[r.date]) dailyAgg[r.date] = { count:0, revenue:0 };
      dailyAgg[r.date].count += r.count; dailyAgg[r.date].revenue += r.revenue;
    });
    daysAccum += s.num_days;
  });
  const avgDays = list.length ? daysAccum / list.length : 30;
  g.hourly_avg = hourlySum.map(h => Math.round(h / avgDays * 100) / 100);
  g.daily = Object.keys(dailyAgg).sort().map(d => ({ date:d, count:dailyAgg[d].count, revenue:dailyAgg[d].revenue }));
  pickBestDays(g);
  g.num_days = Math.round(avgDays * 10) / 10;
  return g;
}
// Lo que se MUESTRA: el total guardado (con tus ediciones) o, si hay filtro de fechas, lo recalculado por día
function viewOf(month, key){
  if(!(month === currentMonth && rangeActive())) return DATA[month][key];
  if(key === 'General') return aggregateGeneral(storesOf(month).map(s => deriveStore(DATA[month][s], RANGE.from, RANGE.to)));
  return deriveStore(DATA[month][key], RANGE.from, RANGE.to);
}

function ensureRangeBar(){
  if(!document.getElementById('rangeStyle')){
    const st = document.createElement('style');
    st.id = 'rangeStyle';
    st.textContent =
      '.range-bar{display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:#fff;border:1px solid #DCD8CC;border-radius:10px;padding:10px 14px;margin:0 0 16px;font-size:13px;color:#14213D}' +
      '.range-bar b{font-weight:800}.range-bar label{display:flex;align-items:center;gap:6px;color:#5C6478}' +
      '.range-bar input[type=date]{padding:6px 8px;border:1px solid #DCD8CC;border-radius:6px;font-size:13px;color:#14213D;background:#fff}' +
      '.range-bar button{padding:6px 12px;border:1px solid #14213D;border-radius:6px;background:#14213D;color:#fff;font-size:12.5px;cursor:pointer}' +
      '.range-bar .rb-warn{color:#B9760F;font-size:12px}.range-bar .rb-err{color:#C0392B;font-weight:700;font-size:12px}.range-bar .rb-note{color:#5C6478;font-size:12px}' +
      '.range-banner{background:#FFF6E0;border:1px solid #EE9D2B;border-radius:10px;padding:10px 14px;margin:0 0 16px;font-size:13px;color:#14213D}' +
      '.range-on .edit-hint{display:none !important}.range-on [contenteditable]{cursor:default}';
    document.head.appendChild(st);
  }
  let el = document.getElementById('rangeBar');
  if(!el){
    el = document.createElement('div');
    el.id = 'rangeBar';
    const mw = document.getElementById('mainWrap');
    mw.parentNode.insertBefore(el, mw);
  }
  return el;
}
function renderRangeBar(){
  const el = ensureRangeBar();
  if(RANGE.month !== currentMonth) RANGE = { month: currentMonth, from: '', to: '' };
  if(currentTab === 'Histórico'){ el.style.display = 'none'; return; }
  el.style.display = '';
  const [mName, yStr] = currentMonth.split(' ');
  const mi = MES_ORDEN[mName], y = parseInt(yStr, 10);
  const pad = n => String(n).padStart(2, '0');
  const min = `${y}-${pad(mi+1)}-01`;
  const max = `${y}-${pad(mi+1)}-${pad(new Date(y, mi+1, 0).getDate())}`;
  const ok = monthHasDays(currentMonth);
  el.className = 'range-bar';
  el.innerHTML =
    `<b>📅 Filtrar por fechas</b>` +
    `<label>Desde <input type="date" id="rangeFrom" min="${min}" max="${max}" value="${RANGE.from}" ${ok ? '' : 'disabled'}></label>` +
    `<label>Hasta <input type="date" id="rangeTo" min="${min}" max="${max}" value="${RANGE.to}" ${ok ? '' : 'disabled'}></label>` +
    ((RANGE.from || RANGE.to) ? `<button id="rangeClear">Quitar filtro</button>` : '') +
    (!ok ? `<span class="rb-warn">Este mes se cargó con una versión anterior: volvé a cargarlo para poder filtrar por día.</span>` : '') +
    (rangeInvalid() ? `<span class="rb-err">"Desde" es posterior a "Hasta".</span>` : '') +
    (rangeActive() ? `<span class="rb-note">Vista de solo lectura · sin comparación con el mes anterior.</span>` : '');
  const f = el.querySelector('#rangeFrom'), t = el.querySelector('#rangeTo'), c = el.querySelector('#rangeClear');
  if(f) f.addEventListener('change', e => { RANGE.from = e.target.value; renderMain(); });
  if(t) t.addEventListener('change', e => { RANGE.to = e.target.value; renderMain(); });
  if(c) c.addEventListener('click', () => { RANGE.from = ''; RANGE.to = ''; renderMain(); });
}

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
  tabOrder().forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (t === currentTab ? ' active' : '');
    btn.textContent = t === 'General' ? '📍 General' : t === 'Histórico' ? '📈 Histórico' : t;
    btn.addEventListener('click', () => { currentTab = t; tableMetric='count'; renderMain(); });
    el.appendChild(btn);
  });
}

/* ===================== Render principal ===================== */
function renderAll(){
  // si cambiás a un mes donde el local de la pestaña actual no existe, volvemos a General
  if(currentTab !== 'Histórico' && currentTab !== 'General' && !(DATA[currentMonth] && DATA[currentMonth][currentTab])){
    currentTab = 'General';
  }
  renderMonthSelect();
  renderTabs();
  renderMain();
}

function renderMain(){
  renderTabs();
  renderRangeBar();

  if(currentTab === 'Histórico'){
    document.getElementById('resetBtn').style.display = 'none';
    renderHistoricoView();
    return;
  }
  document.getElementById('resetBtn').style.display = rangeActive() ? 'none' : '';

  const rangeOn = rangeActive();
  document.body.classList.toggle('range-on', rangeOn);
  const store = viewOf(currentMonth, currentTab);
  const wrap = document.getElementById('mainWrap');
  const isGeneral = currentTab === 'General';
  const tp = totalPedidos(store);
  const trv = totalRevenue(store);
  const ticketProm = tp > 0 ? trv / tp : 0;
  const payTotal = store.payment.SI.count + store.payment.NO.count;
  const pctTarjeta = payTotal > 0 ? store.payment.SI.count / payTotal : 0;

  let html = '';
  if(rangeOn){
    html += `<div class="range-banner">📅 Vista filtrada: <b>${RANGE.from ? dmShort(RANGE.from) : 'inicio del mes'}</b> al <b>${RANGE.to ? dmShort(RANGE.to) : 'fin del mes'}</b>. Es solo lectura: los números editados a mano y la carga manual (otros canales, año anterior) no se aplican a esta vista.</div>`;
  }
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
  if(rangeOn){
    html += `<p class="section-note">Con un filtro de fechas activo no se compara contra el mes anterior (compararías un tramo del mes contra un mes completo). Quitá el filtro para ver la comparación.</p>`;
  } else if(prevMonth && DATA[prevMonth][currentTab]){
    html += `<p class="section-note">Si editás algún número a mano, esta comparación se recalcula sola con el valor nuevo.</p>`;
    if(currentTab === 'General' && storesOf(currentMonth).length !== storesOf(prevMonth).length){
      html += `<p class="section-note" style="color:#B9760F;"><b>Ojo:</b> ${currentMonth} suma ${storesOf(currentMonth).length} locales y ${prevMonth} sumó ${storesOf(prevMonth).length}. La variación incluye el aporte de los locales nuevos; para comparar igual contra igual, mirá cada local por separado.</p>`;
    }
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

  if(!rangeOn){
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
  if(rangeOn){
    // vista filtrada = solo lectura
    wrap.querySelectorAll('[contenteditable]').forEach(el => el.setAttribute('contenteditable', 'false'));
    wrap.querySelectorAll('input[type=number]').forEach(i => { i.disabled = true; });
  }

  attachEditableHandlers();
  if(isGeneral) attachTableToggle();

  document.getElementById('footerNote').textContent =
    `${currentMonth} · ${isGeneral ? 'los ' + storesOf(currentMonth).length + ' locales' : currentTab} · ${fmtInt(store.num_days || 30)} días con datos` +
    (rangeOn ? ` · filtrado del ${RANGE.from ? dmShort(RANGE.from) : 'inicio'} al ${RANGE.to ? dmShort(RANGE.to) : 'fin'}` : '');
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
  const rows = storesOf(currentMonth).map(s => {
    const st = viewOf(currentMonth, s);
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
  const storeOptions = ['Todos los locales', ...STORES];
  if(historicoStore !== 'Todos los locales' && !STORES.includes(historicoStore)){
    historicoStore = 'Todos los locales';
  }
  // un local nuevo solo muestra los meses donde existe (sin ceros falsos en los meses anteriores)
  const histKey = historicoStore === 'Todos los locales' ? 'General' : historicoStore;
  const months = MONTHS.filter(m => AVAILABLE_MONTHS.includes(m) && DATA[m][histKey]);

  function valueFor(month, metric){
    const key = historicoStore === 'Todos los locales' ? 'General' : historicoStore;
    const st = DATA[month][key];
    return metric === 'count' ? totalPedidos(st) : totalRevenue(st);
  }

  const values = months.map(m => valueFor(m, historicoMetric));

  let html = `<div class="section-title"><span class="idx">01</span> Histórico de pedidos por mes</div>`;
  html += `<p class="section-note">Elegí un local o mirá la suma de todos. Los locales nuevos solo muestran los meses desde que abrieron. Si más adelante cargás más meses o editás algún dato, este gráfico se actualiza solo.</p>`;

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

document.getElementById('exportBtn').addEventListener('click', async () => {
  // Genera un .html AUTOCONTENIDO (CSS + JS + datos adentro) que funciona abierto desde la compu,
  // sin internet y sin Vercel. Incluye todas las ediciones manuales actuales.
  const btn = document.getElementById('exportBtn');
  const original = btn.textContent;
  btn.textContent = 'Generando...';
  btn.disabled = true;
  try {
    // 1) Traemos el CSS y el JS del propio sitio para pegarlos DENTRO del archivo
    const [css, js] = await Promise.all([
      fetch('/dashboard.css').then(r => { if(!r.ok) throw new Error('No se pudo leer dashboard.css'); return r.text(); }),
      fetch('/dashboard.js').then(r => { if(!r.ok) throw new Error('No se pudo leer dashboard.js'); return r.text(); })
    ]);

    // 2) Esqueleto del dashboard: copiamos el contenedor y vaciamos lo que dibuja el JS al cargar
    const skeleton = document.getElementById('mainWrap').parentElement.cloneNode(true);
    ['monthSelect', 'tabBar', 'rangeBar', 'mainWrap', 'footerNote'].forEach(id => {
      const el = skeleton.querySelector('#' + id);
      if(el) el.innerHTML = '';
    });
    // el cartel "Usá este botón para guardar..." no aplica al archivo descargado
    skeleton.querySelectorAll('.reset-bar span.footer-note:not(#footerNote)').forEach(el => el.remove());

    // 3) Datos actuales (con ediciones). Se escapa "<" para que nunca cierre el <script> por error.
    //    Se guardan en <script id="raw-data"> para que /importar pueda volver a leer este archivo.
    const json = JSON.stringify(DATA).replace(/</g, '\\u003c');
    const safeJs = js.replace(/<\/script/gi, '<\\/script');

    // En el archivo descargado no hay servidor: ocultamos lo que depende de él
    const standaloneCss = 'a[href^="/"], #saveBtn, #exportBtn { display: none !important; }';

    const html =
      '<!DOCTYPE html>\n<html lang="es">\n<head>\n' +
      '<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>Central de Pedidos</title>\n' +
      '<style>\n' + css + '\n' + standaloneCss + '\n</style>\n' +
      '</head>\n<body style="margin:0;padding:0">\n' +
      skeleton.innerHTML + '\n' +
      '<script id="raw-data" type="application/json">' + json + '</script>\n' +
      '<script>window.__REPORT_DATA__ = JSON.parse(document.getElementById("raw-data").textContent);</script>\n' +
      '<script>\n' + safeJs + '\n</script>\n' +
      '</body>\n</html>';

    // 4) Descarga
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `dashboard_pedidos_${stamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    btn.textContent = '✓ Descargado';
  } catch(e){
    console.error('Error al exportar:', e);
    btn.textContent = '✕ Error al descargar';
  } finally {
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1800);
  }
});

/* ===================== Init ===================== */
renderAll();
