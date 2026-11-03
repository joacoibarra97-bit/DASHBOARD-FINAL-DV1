// Cálculo de totales a partir del desglose por día (sin dependencias: lo usa el navegador).
// Misma lógica que el parser, así un filtro con el mes completo da exactamente lo mismo que el total guardado.

export type Block = { count: number; revenue: number };
export type Day = { date: string; count: number; revenue: number };
export type DayRec = {
  n: number;
  rev: number;
  ch: Record<string, [number, number]>;
  pay: { SI: [number, number]; NO: [number, number] };
  h: number[];
  ab: number;
  ca: number;
};
export type MostradorStats = {
  total_valid: number;
  revenue: number;
  abandoned: number;
  cancelled: number;
  payment: { SI: Block; NO: Block };
  hourly_avg: number[];
  daily: Day[];
  best_day_revenue: Day;
  best_day_count: Day;
  num_days: number;
  hourly_raw?: number[]; // pedidos por hora SIN promediar (para sumar locales)
};

const EMPTY_DAY: Day = { date: "", count: 0, revenue: 0 };

// Totales de UN local para el rango from..to (ambos incluidos, "YYYY-MM-DD"; vacío = sin límite)
export function deriveMostrador(days: Record<string, DayRec>, from?: string, to?: string): MostradorStats {
  const out: MostradorStats = {
    total_valid: 0, revenue: 0, abandoned: 0, cancelled: 0,
    payment: { SI: { count: 0, revenue: 0 }, NO: { count: 0, revenue: 0 } },
    hourly_avg: new Array(24).fill(0), daily: [], best_day_revenue: EMPTY_DAY, best_day_count: EMPTY_DAY,
    num_days: 0, hourly_raw: new Array(24).fill(0),
  };
  let numDays = 0;
  Object.keys(days).sort().forEach((date) => {
    if ((from && date < from) || (to && date > to)) return;
    const d = days[date];
    out.abandoned += d.ab || 0;
    out.cancelled += d.ca || 0;
    if (!d.n) return;
    out.total_valid += d.n;
    out.revenue += d.rev;
    (["SI", "NO"] as const).forEach((p) => { out.payment[p].count += d.pay[p][0]; out.payment[p].revenue += d.pay[p][1]; });
    for (let h = 0; h < 24; h++) out.hourly_raw![h] += d.h[h] || 0;
    out.daily.push({ date, count: d.n, revenue: d.rev });
    numDays++;
  });
  const nd = numDays || 1; // igual que el parser
  out.num_days = nd;
  out.hourly_avg = out.hourly_raw!.map((h) => Math.round((h / nd) * 100) / 100);
  out.best_day_revenue = out.daily.reduce((a, b) => (b.revenue > a.revenue ? b : a), out.daily[0] || EMPTY_DAY);
  out.best_day_count = out.daily.reduce((a, b) => (b.count > a.count ? b : a), out.daily[0] || EMPTY_DAY);
  return out;
}

// Suma de locales (misma fórmula que buildMostradorGeneral del parser)
export function aggregateMostrador(list: MostradorStats[]): MostradorStats {
  const g: MostradorStats = {
    total_valid: 0, revenue: 0, abandoned: 0, cancelled: 0,
    payment: { SI: { count: 0, revenue: 0 }, NO: { count: 0, revenue: 0 } },
    hourly_avg: new Array(24).fill(0), daily: [], best_day_revenue: EMPTY_DAY, best_day_count: EMPTY_DAY, num_days: 0,
  };
  const hourlySum = new Array(24).fill(0);
  const dailyAgg: Record<string, { count: number; revenue: number }> = {};
  let daysAccum = 0;
  list.forEach((s) => {
    g.total_valid += s.total_valid; g.revenue += s.revenue; g.abandoned += s.abandoned; g.cancelled += s.cancelled;
    (["SI", "NO"] as const).forEach((p) => { g.payment[p].count += s.payment[p].count; g.payment[p].revenue += s.payment[p].revenue; });
    for (let h = 0; h < 24; h++) hourlySum[h] += s.hourly_raw ? s.hourly_raw[h] : s.hourly_avg[h] * s.num_days;
    s.daily.forEach((r) => {
      if (!dailyAgg[r.date]) dailyAgg[r.date] = { count: 0, revenue: 0 };
      dailyAgg[r.date].count += r.count; dailyAgg[r.date].revenue += r.revenue;
    });
    daysAccum += s.num_days;
  });
  const avgDays = list.length ? daysAccum / list.length : 0;
  g.hourly_avg = hourlySum.map((h) => (avgDays ? Math.round((h / avgDays) * 100) / 100 : 0));
  g.daily = Object.keys(dailyAgg).sort().map((d) => ({ date: d, count: dailyAgg[d].count, revenue: dailyAgg[d].revenue }));
  g.best_day_revenue = g.daily.reduce((a, b) => (b.revenue > a.revenue ? b : a), g.daily[0] || EMPTY_DAY);
  g.best_day_count = g.daily.reduce((a, b) => (b.count > a.count ? b : a), g.daily[0] || EMPTY_DAY);
  g.num_days = Math.round(avgDays * 10) / 10;
  return g;
}
