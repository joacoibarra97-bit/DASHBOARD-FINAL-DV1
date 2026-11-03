import * as XLSX from "xlsx";

export { BASE_STORES as STORE_NAMES, storesForMonth } from "./stores";

type ChannelBlock = { count: number; revenue: number };
export type StoreData = {
  total_valid: number;
  abandoned: number;
  cancelled: number;
  channels: {
    Rappi: ChannelBlock;
    PedidosYa: ChannelBlock;
    CAT: ChannelBlock & { sub: { D: ChannelBlock; MD: ChannelBlock; PO: ChannelBlock } };
  };
  payment: { SI: ChannelBlock; NO: ChannelBlock };
  hourly_avg: number[];
  daily: { date: string; count: number; revenue: number }[];
  best_day_revenue: { date: string; count: number; revenue: number };
  best_day_count: { date: string; count: number; revenue: number };
  num_days: number;
  manual: { whatsapp: number; telefono: number; online: number };
  yearAgo: { total: number; rappi: number; py: number; cat: number };
  days?: Record<string, DayRec>; // desglose por día (para filtrar por fechas en el dashboard)
};

// Un día de un local: pedidos, facturación, por canal, por forma de pago, por hora, abandonos y cancelados.
export type DayRec = {
  n: number;
  rev: number;
  ch: Record<string, [number, number]>; // canal -> [pedidos, facturación]
  pay: { SI: [number, number]; NO: [number, number] };
  h: number[]; // pedidos por hora (24)
  ab: number;
  ca: number;
};

function normalizeChannel(raw: any): string | null {
  if (raw == null) return null;
  const c = String(raw).trim();
  if (c === "Ra" || c === "RAPPI") return "Rappi";
  if (c === "Ra/PY") return "Rappi"; // confirmado contra la columna Usuario en datos reales
  if (c === "PY") return "PedidosYa";
  if (c === "D" || c === "Delivery") return "D";
  if (c === "MD") return "MD";
  if (c === "PO") return "PO";
  return c;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "Servicio" = columna "Punto de acceso" de Waitry. "M" = Mostrador.
// Esos pedidos NO cuentan como delivery: van a la pestaña Mostrador.
function isMostrador(raw: any): boolean {
  if (raw == null) return false;
  const c = String(raw).trim().toUpperCase();
  return c === "M" || c === "MOSTRADOR";
}

// La columna "Hora" puede venir como fecha real de Excel o como texto ("2026-10-1 10:35",
// con día SIN cero adelante). Aceptamos las dos formas.
function parseHora(v: any): { date: string; hour: number } | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return { date: isoDate(v), hour: v.getHours() };
  }
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/);
    if (m) {
      const date = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      return { date, hour: parseInt(m[4], 10) };
    }
  }
  return null;
}

// Pedidos de mostrador de un local en un mes (para la pestaña /mostrador)
export type MostradorData = {
  total_valid: number;
  revenue: number;
  abandoned: number;
  cancelled: number;
  payment: { SI: ChannelBlock; NO: ChannelBlock };
  hourly_avg: number[];
  daily: { date: string; count: number; revenue: number }[];
  best_day_revenue: { date: string; count: number; revenue: number };
  best_day_count: { date: string; count: number; revenue: number };
  num_days: number;
  days?: Record<string, DayRec>;
};

export function parseStoreWorkbook(buffer: ArrayBuffer): StoreData {
  return parseStoreWorkbookFull(buffer).delivery;
}


export function parseStoreWorkbookFull(buffer: ArrayBuffer): { delivery: StoreData; mostrador: MostradorData } {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  // Cada pedido va a UNO de los dos grupos según el servicio; los filtros
  // (sin comanda / cancelado) se aplican dentro de cada grupo.
  type Acc = {
    valid: number; abandoned: number; cancelled: number;
    chanCount: Record<string, number>; chanRev: Record<string, number>;
    payCount: Record<string, number>; payRev: Record<string, number>;
    hourly: number[]; dailyCount: Record<string, number>; dailyRev: Record<string, number>;
    days: Set<string>; revenue: number;
    dayRecs: Record<string, DayRec>;
  };
  const newAcc = (): Acc => ({
    valid: 0, abandoned: 0, cancelled: 0, chanCount: {}, chanRev: {},
    payCount: { SI: 0, NO: 0 }, payRev: { SI: 0, NO: 0 },
    hourly: new Array(24).fill(0), dailyCount: {}, dailyRev: {}, days: new Set<string>(), revenue: 0,
    dayRecs: {},
  });
  const dayOf = (acc: Acc, date: string): DayRec =>
    acc.dayRecs[date] || (acc.dayRecs[date] = { n: 0, rev: 0, ch: {}, pay: { SI: [0, 0], NO: [0, 0] }, h: new Array(24).fill(0), ab: 0, ca: 0 });
  const del = newAcc();
  const mos = newAcc();

  // los datos arrancan en la fila 3 (índice 2), igual que en las planillas de Waitry
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const nrEntrega = row[1];
    const canalRaw = row[2]; // "Punto de acceso" = servicio
    const hora = row[3];
    const totalDesc = row[11];
    const cancelada = row[12];
    const pagado = row[13];

    const acc = isMostrador(canalRaw) ? mos : del;
    const h = parseHora(hora);

    const isAbandoned = nrEntrega == null || String(nrEntrega).trim() === "";
    const isCancelled = cancelada != null && String(cancelada).toLowerCase().includes("cancel");

    if (isAbandoned) { acc.abandoned++; if (h) dayOf(acc, h.date).ab++; continue; }
    if (isCancelled) { acc.cancelled++; if (h) dayOf(acc, h.date).ca++; continue; }

    acc.valid++;
    const chan = normalizeChannel(canalRaw) || "?";
    const rev = typeof totalDesc === "number" ? totalDesc : 0;
    acc.revenue += rev;
    acc.chanCount[chan] = (acc.chanCount[chan] || 0) + 1;
    acc.chanRev[chan] = (acc.chanRev[chan] || 0) + rev;

    const pay = pagado ? String(pagado).trim().toUpperCase() : "NO";
    acc.payCount[pay] = (acc.payCount[pay] || 0) + 1;
    acc.payRev[pay] = (acc.payRev[pay] || 0) + rev;

    if (h) {
      // desglose por día: permite filtrar por fechas en el dashboard sin volver a cargar el Excel
      const dr = dayOf(acc, h.date);
      dr.n++; dr.rev += rev; dr.h[h.hour]++;
      if (!dr.ch[chan]) dr.ch[chan] = [0, 0];
      dr.ch[chan][0]++; dr.ch[chan][1] += rev;
      if (pay === "SI" || pay === "NO") { dr.pay[pay][0]++; dr.pay[pay][1] += rev; }
      acc.hourly[h.hour]++;
      acc.dailyCount[h.date] = (acc.dailyCount[h.date] || 0) + 1;
      acc.dailyRev[h.date] = (acc.dailyRev[h.date] || 0) + rev;
      acc.days.add(h.date);
    }
  }

  function summarize(acc: Acc) {
    const numDays = acc.days.size || 1;
    const hourlyAvg = acc.hourly.map((h) => Math.round((h / numDays) * 100) / 100);
    const daily = Object.keys(acc.dailyCount).sort().map((d) => ({ date: d, count: acc.dailyCount[d], revenue: acc.dailyRev[d] }));
    const empty = { date: "", count: 0, revenue: 0 };
    const bestRev = daily.reduce((a, b) => (b.revenue > a.revenue ? b : a), daily[0] || empty);
    const bestCnt = daily.reduce((a, b) => (b.count > a.count ? b : a), daily[0] || empty);
    return { numDays, hourlyAvg, daily, bestRev, bestCnt };
  }

  const d = summarize(del);
  const catCount = (del.chanCount["D"] || 0) + (del.chanCount["MD"] || 0) + (del.chanCount["PO"] || 0);
  const catRev = (del.chanRev["D"] || 0) + (del.chanRev["MD"] || 0) + (del.chanRev["PO"] || 0);

  const delivery: StoreData = {
    total_valid: del.valid,
    abandoned: del.abandoned,
    cancelled: del.cancelled,
    channels: {
      Rappi: { count: del.chanCount["Rappi"] || 0, revenue: del.chanRev["Rappi"] || 0 },
      PedidosYa: { count: del.chanCount["PedidosYa"] || 0, revenue: del.chanRev["PedidosYa"] || 0 },
      CAT: {
        count: catCount,
        revenue: catRev,
        sub: {
          D: { count: del.chanCount["D"] || 0, revenue: del.chanRev["D"] || 0 },
          MD: { count: del.chanCount["MD"] || 0, revenue: del.chanRev["MD"] || 0 },
          PO: { count: del.chanCount["PO"] || 0, revenue: del.chanRev["PO"] || 0 },
        },
      },
    },
    payment: {
      SI: { count: del.payCount["SI"] || 0, revenue: del.payRev["SI"] || 0 },
      NO: { count: del.payCount["NO"] || 0, revenue: del.payRev["NO"] || 0 },
    },
    hourly_avg: d.hourlyAvg,
    daily: d.daily,
    best_day_revenue: d.bestRev,
    best_day_count: d.bestCnt,
    num_days: d.numDays,
    manual: { whatsapp: 0, telefono: 0, online: 0 },
    yearAgo: { total: 0, rappi: 0, py: 0, cat: 0 },
    days: del.dayRecs,
  };

  const m = summarize(mos);
  const mostrador: MostradorData = {
    total_valid: mos.valid,
    revenue: mos.revenue,
    abandoned: mos.abandoned,
    cancelled: mos.cancelled,
    payment: {
      SI: { count: mos.payCount["SI"] || 0, revenue: mos.payRev["SI"] || 0 },
      NO: { count: mos.payCount["NO"] || 0, revenue: mos.payRev["NO"] || 0 },
    },
    hourly_avg: m.hourlyAvg,
    daily: m.daily,
    best_day_revenue: m.bestRev,
    best_day_count: m.bestCnt,
    num_days: m.numDays,
    days: mos.dayRecs,
  };

  return { delivery, mostrador };
}

// Suma de todos los locales para la pestaña Mostrador
export function buildMostradorGeneral(stores: Record<string, MostradorData>): MostradorData {
  const g: MostradorData = {
    total_valid: 0, revenue: 0, abandoned: 0, cancelled: 0,
    payment: { SI: { count: 0, revenue: 0 }, NO: { count: 0, revenue: 0 } },
    hourly_avg: new Array(24).fill(0), daily: [],
    best_day_revenue: { date: "", count: 0, revenue: 0 }, best_day_count: { date: "", count: 0, revenue: 0 },
    num_days: 0,
  };
  const hourlySum = new Array(24).fill(0);
  const dailyAgg: Record<string, { count: number; revenue: number }> = {};
  let daysAccum = 0;
  const list = Object.values(stores);
  list.forEach((s) => {
    g.total_valid += s.total_valid; g.revenue += s.revenue; g.abandoned += s.abandoned; g.cancelled += s.cancelled;
    (["SI", "NO"] as const).forEach((p) => { g.payment[p].count += s.payment[p].count; g.payment[p].revenue += s.payment[p].revenue; });
    for (let h = 0; h < 24; h++) hourlySum[h] += s.hourly_avg[h] * s.num_days;
    s.daily.forEach((r) => {
      if (!dailyAgg[r.date]) dailyAgg[r.date] = { count: 0, revenue: 0 };
      dailyAgg[r.date].count += r.count; dailyAgg[r.date].revenue += r.revenue;
    });
    daysAccum += s.num_days;
  });
  const avgDays = list.length ? daysAccum / list.length : 0;
  g.hourly_avg = hourlySum.map((h) => (avgDays ? Math.round((h / avgDays) * 100) / 100 : 0));
  g.daily = Object.keys(dailyAgg).sort().map((d) => ({ date: d, count: dailyAgg[d].count, revenue: dailyAgg[d].revenue }));
  const empty = { date: "", count: 0, revenue: 0 };
  g.best_day_revenue = g.daily.reduce((a, b) => (b.revenue > a.revenue ? b : a), g.daily[0] || empty);
  g.best_day_count = g.daily.reduce((a, b) => (b.count > a.count ? b : a), g.daily[0] || empty);
  g.num_days = Math.round(avgDays * 10) / 10;
  return g;
}

export function buildGeneral(stores: Record<string, StoreData>): StoreData {
  const general: StoreData = {
    total_valid: 0,
    abandoned: 0,
    cancelled: 0,
    channels: {
      Rappi: { count: 0, revenue: 0 },
      PedidosYa: { count: 0, revenue: 0 },
      CAT: { count: 0, revenue: 0, sub: { D: { count: 0, revenue: 0 }, MD: { count: 0, revenue: 0 }, PO: { count: 0, revenue: 0 } } },
    },
    payment: { SI: { count: 0, revenue: 0 }, NO: { count: 0, revenue: 0 } },
    hourly_avg: new Array(24).fill(0),
    daily: [],
    best_day_revenue: { date: "", count: 0, revenue: 0 },
    best_day_count: { date: "", count: 0, revenue: 0 },
    num_days: 30,
    manual: { whatsapp: 0, telefono: 0, online: 0 },
    yearAgo: { total: 0, rappi: 0, py: 0, cat: 0 },
  };

  const hourlySum = new Array(24).fill(0);
  const dailyAgg: Record<string, { count: number; revenue: number }> = {};
  let daysAccum = 0;
  const storeList = Object.values(stores);

  storeList.forEach((s) => {
    general.total_valid += s.total_valid;
    general.abandoned += s.abandoned;
    general.cancelled += s.cancelled;
    (["Rappi", "PedidosYa"] as const).forEach((ch) => {
      general.channels[ch].count += s.channels[ch].count;
      general.channels[ch].revenue += s.channels[ch].revenue;
    });
    general.channels.CAT.count += s.channels.CAT.count;
    general.channels.CAT.revenue += s.channels.CAT.revenue;
    (["D", "MD", "PO"] as const).forEach((sub) => {
      general.channels.CAT.sub[sub].count += s.channels.CAT.sub[sub].count;
      general.channels.CAT.sub[sub].revenue += s.channels.CAT.sub[sub].revenue;
    });
    (["SI", "NO"] as const).forEach((p) => {
      general.payment[p].count += s.payment[p].count;
      general.payment[p].revenue += s.payment[p].revenue;
    });
    for (let h = 0; h < 24; h++) hourlySum[h] += s.hourly_avg[h] * s.num_days;
    s.daily.forEach((rec) => {
      if (!dailyAgg[rec.date]) dailyAgg[rec.date] = { count: 0, revenue: 0 };
      dailyAgg[rec.date].count += rec.count;
      dailyAgg[rec.date].revenue += rec.revenue;
    });
    daysAccum += s.num_days;
  });

  const avgDays = storeList.length ? daysAccum / storeList.length : 30;
  general.hourly_avg = hourlySum.map((h) => Math.round((h / avgDays) * 100) / 100);
  const dates = Object.keys(dailyAgg).sort();
  general.daily = dates.map((d) => ({ date: d, count: dailyAgg[d].count, revenue: dailyAgg[d].revenue }));
  general.best_day_revenue = general.daily.reduce((a, b) => (b.revenue > a.revenue ? b : a), general.daily[0] || { date: "", count: 0, revenue: 0 });
  general.best_day_count = general.daily.reduce((a, b) => (b.count > a.count ? b : a), general.daily[0] || { date: "", count: 0, revenue: 0 });
  general.num_days = Math.round(avgDays * 10) / 10;

  return general;
}
