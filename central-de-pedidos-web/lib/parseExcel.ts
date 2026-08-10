import * as XLSX from "xlsx";

export const STORE_NAMES = [
  "Arenales",
  "Bulnes",
  "Echeverria",
  "Guayaquil",
  "Olazabal",
  "Uriarte",
  "Uruguay",
  "Vidal",
] as const;

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

export function parseStoreWorkbook(buffer: ArrayBuffer): StoreData {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  let total_valid = 0,
    abandoned = 0,
    cancelled = 0;
  const chanCount: Record<string, number> = {};
  const chanRev: Record<string, number> = {};
  const payCount: Record<string, number> = { SI: 0, NO: 0 };
  const payRev: Record<string, number> = { SI: 0, NO: 0 };
  const hourly = new Array(24).fill(0);
  const dailyCount: Record<string, number> = {};
  const dailyRev: Record<string, number> = {};
  const daysSet = new Set<string>();

  // los datos arrancan en la fila 3 (índice 2), igual que en las planillas de Waitry
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const nrEntrega = row[1];
    const hora = row[3];
    const canalRaw = row[2];
    const totalDesc = row[11];
    const cancelada = row[12];
    const pagado = row[13];

    const isAbandoned = nrEntrega == null || String(nrEntrega).trim() === "";
    const isCancelled = cancelada != null && String(cancelada).toLowerCase().includes("cancel");

    if (isAbandoned) {
      abandoned++;
      continue;
    }
    if (isCancelled) {
      cancelled++;
      continue;
    }

    total_valid++;
    const chan = normalizeChannel(canalRaw) || "?";
    const rev = typeof totalDesc === "number" ? totalDesc : 0;
    chanCount[chan] = (chanCount[chan] || 0) + 1;
    chanRev[chan] = (chanRev[chan] || 0) + rev;

    const pay = pagado ? String(pagado).trim().toUpperCase() : "NO";
    payCount[pay] = (payCount[pay] || 0) + 1;
    payRev[pay] = (payRev[pay] || 0) + rev;

    if (hora instanceof Date && !isNaN(hora.getTime())) {
      const h = hora.getHours();
      hourly[h]++;
      const d = isoDate(hora);
      dailyCount[d] = (dailyCount[d] || 0) + 1;
      dailyRev[d] = (dailyRev[d] || 0) + rev;
      daysSet.add(d);
    }
  }

  const numDays = daysSet.size || 1;
  const hourlyAvg = hourly.map((h) => Math.round((h / numDays) * 100) / 100);

  const dailyDates = Object.keys(dailyCount).sort();
  const daily = dailyDates.map((d) => ({ date: d, count: dailyCount[d], revenue: dailyRev[d] }));
  const bestDayRevenue = daily.reduce((a, b) => (b.revenue > a.revenue ? b : a), daily[0] || { date: "", count: 0, revenue: 0 });
  const bestDayCount = daily.reduce((a, b) => (b.count > a.count ? b : a), daily[0] || { date: "", count: 0, revenue: 0 });

  const catCount = (chanCount["D"] || 0) + (chanCount["MD"] || 0) + (chanCount["PO"] || 0);
  const catRev = (chanRev["D"] || 0) + (chanRev["MD"] || 0) + (chanRev["PO"] || 0);

  return {
    total_valid,
    abandoned,
    cancelled,
    channels: {
      Rappi: { count: chanCount["Rappi"] || 0, revenue: chanRev["Rappi"] || 0 },
      PedidosYa: { count: chanCount["PedidosYa"] || 0, revenue: chanRev["PedidosYa"] || 0 },
      CAT: {
        count: catCount,
        revenue: catRev,
        sub: {
          D: { count: chanCount["D"] || 0, revenue: chanRev["D"] || 0 },
          MD: { count: chanCount["MD"] || 0, revenue: chanRev["MD"] || 0 },
          PO: { count: chanCount["PO"] || 0, revenue: chanRev["PO"] || 0 },
        },
      },
    },
    payment: {
      SI: { count: payCount["SI"] || 0, revenue: payRev["SI"] || 0 },
      NO: { count: payCount["NO"] || 0, revenue: payRev["NO"] || 0 },
    },
    hourly_avg: hourlyAvg,
    daily,
    best_day_revenue: bestDayRevenue,
    best_day_count: bestDayCount,
    num_days: numDays,
    manual: { whatsapp: 0, telefono: 0, online: 0 },
    yearAgo: { total: 0, rappi: 0, py: 0, cat: 0 },
  };
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
