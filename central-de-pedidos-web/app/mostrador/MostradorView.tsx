"use client";

import { useState } from "react";

type Block = { count: number; revenue: number };
type Day = { date: string; count: number; revenue: number };
type Data = {
  total_valid: number; revenue: number; abandoned: number; cancelled: number;
  payment: { SI: Block; NO: Block };
  hourly_avg: number[]; daily: Day[];
  best_day_revenue: Day; best_day_count: Day; num_days: number;
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const monthOrder = (k: string) => { const [m, y] = k.split(" "); return parseInt(y, 10) * 12 + MESES.indexOf(m); };

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
const num = (n: number) => Math.round(n).toLocaleString("es-AR");
const dec = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
const dayLabel = (iso: string) => { const [, m, d] = iso.split("-"); return `${parseInt(d, 10)}/${parseInt(m, 10)}`; };

function delta(cur: number, prev: number) {
  if (!prev) return null;
  const p = ((cur - prev) / prev) * 100;
  return { p, text: `${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`, up: p >= 0 };
}

export default function MostradorView({ data }: { data: Record<string, Record<string, Data>> }) {
  const months = Object.keys(data).sort((a, b) => monthOrder(a) - monthOrder(b));
  const [month, setMonth] = useState(months[months.length - 1]);
  const [tab, setTab] = useState("General");

  const stores = Object.keys(data[month] || {}).filter((s) => s !== "General");
  const key = data[month]?.[tab] ? tab : "General"; // si el local no existe en ese mes, volvemos a General
  const d = data[month][key];
  const prevMonth = months[months.indexOf(month) - 1];
  const prev = prevMonth ? data[prevMonth]?.[key] : undefined;
  const sameStores = prevMonth ? Object.keys(data[prevMonth]).length === Object.keys(data[month]).length : true;

  const ticket = d.total_valid ? d.revenue / d.total_valid : 0;
  const perDay = d.num_days ? d.total_valid / d.num_days : 0;
  const paidPct = d.total_valid ? (d.payment.SI.count / d.total_valid) * 100 : 0;
  const dOrders = prev ? delta(d.total_valid, prev.total_valid) : null;
  const dRev = prev ? delta(d.revenue, prev.revenue) : null;

  const maxH = Math.max(...d.hourly_avg, 0.0001);
  const maxD = Math.max(...d.daily.map((x) => x.revenue), 1);

  const kpis: { label: string; value: string; sub?: React.ReactNode }[] = [
    { label: "Pedidos", value: num(d.total_valid), sub: dOrders && <Delta d={dOrders} prevMonth={prevMonth} /> },
    { label: "Facturación", value: money(d.revenue), sub: dRev && <Delta d={dRev} prevMonth={prevMonth} /> },
    { label: "Ticket promedio", value: money(ticket) },
    { label: "Pedidos por día", value: dec(perDay), sub: `${dec(d.num_days)} días con ventas` },
    { label: "Mejor día", value: money(d.best_day_revenue.revenue), sub: d.best_day_revenue.date ? dayLabel(d.best_day_revenue.date) : "—" },
    { label: "Pagados", value: `${dec(paidPct)}%`, sub: `${num(d.payment.NO.count)} sin pagar` },
    { label: "Cancelados", value: num(d.cancelled), sub: `${num(d.abandoned)} sin comanda` },
  ];

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={S.topbarInner}>
          <div>
            <p style={S.eyebrow}>Panel de control</p>
            <h1 style={S.title}>Mostrador</h1>
          </div>
          <a href="/" style={S.back}>← Portal</a>
        </div>
      </div>

      <div style={S.wrap}>
        <div style={S.row}>
          {months.map((m) => (
            <button key={m} onClick={() => setMonth(m)} style={m === month ? S.chipOn : S.chip}>{m}</button>
          ))}
        </div>

        <div style={S.row}>
          {["General", ...stores].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={t === key ? S.tabOn : S.tab}>{t === "General" ? "Todos los locales" : t}</button>
          ))}
        </div>

        {key === "General" && prevMonth && !sameStores && (
          <p style={S.warn}><b>Ojo:</b> {month} suma {stores.length} locales y {prevMonth} sumó {Object.keys(data[prevMonth]).length - 1}. La variación incluye el aporte de los locales nuevos.</p>
        )}
        {!prev && prevMonth === undefined && <p style={S.note}>Primer mes cargado: todavía no hay con qué comparar.</p>}

        <div style={S.grid}>
          {kpis.map((k) => (
            <div key={k.label} style={S.kpi}>
              <p style={S.kpiLabel}>{k.label}</p>
              <p style={S.kpiValue}>{k.value}</p>
              {k.sub && <p style={S.kpiSub}>{k.sub}</p>}
            </div>
          ))}
        </div>

        <div style={S.card}>
          <p style={S.cardTitle}>Pedidos promedio por hora</p>
          <div style={S.bars}>
            {d.hourly_avg.map((v, h) => (
              <div key={h} style={S.barCol} title={`${h}:00 — ${dec(v)} pedidos por día`}>
                <div style={{ ...S.bar, height: `${(v / maxH) * 100}%`, background: v === maxH ? "#EE9D2B" : "#14213D" }} />
                <span style={S.barLabel}>{h}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <p style={S.cardTitle}>Facturación por día</p>
          <div style={S.bars}>
            {d.daily.map((x) => (
              <div key={x.date} style={S.barCol} title={`${dayLabel(x.date)} — ${money(x.revenue)} (${x.count} pedidos)`}>
                <div style={{ ...S.bar, height: `${(x.revenue / maxD) * 100}%`, background: x.date === d.best_day_revenue.date ? "#EE9D2B" : "#14213D" }} />
                <span style={S.barLabel}>{parseInt(x.date.split("-")[2], 10)}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={S.foot}>Solo pedidos con servicio Mostrador. No incluye cancelados ni pedidos sin número de comanda (se muestran aparte arriba).</p>
      </div>
    </div>
  );
}

function Delta({ d, prevMonth }: { d: { text: string; up: boolean }; prevMonth: string }) {
  return <span style={{ color: d.up ? "#1E8E5A" : "#C0392B", fontWeight: 700 }}>{d.text} <span style={{ color: "#5C6478", fontWeight: 400 }}>vs {prevMonth}</span></span>;
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#EFEDE6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#14213D" },
  topbar: { background: "#14213D", color: "#fff", padding: "20px 28px" },
  topbarInner: { maxWidth: 1040, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#EE9D2B", margin: "0 0 4px" },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  back: { color: "#B9C0D4", fontSize: 13, textDecoration: "none" },
  wrap: { maxWidth: 1040, margin: "0 auto", padding: "24px 28px 60px" },
  row: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { padding: "7px 14px", borderRadius: 999, border: "1px solid #DCD8CC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#14213D" },
  chipOn: { padding: "7px 14px", borderRadius: 999, border: "1px solid #14213D", background: "#14213D", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 700 },
  tab: { padding: "8px 14px", borderRadius: 8, border: "1px solid #DCD8CC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#14213D" },
  tabOn: { padding: "8px 14px", borderRadius: 8, border: "1px solid #EE9D2B", background: "#EE9D2B", fontSize: 13, cursor: "pointer", color: "#14213D", fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, margin: "6px 0 18px" },
  kpi: { background: "#fff", border: "1px solid #DCD8CC", borderRadius: 12, padding: "16px 18px" },
  kpiLabel: { fontFamily: "monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5C6478", margin: "0 0 6px" },
  kpiValue: { fontSize: 26, fontWeight: 800, margin: 0 },
  kpiSub: { fontSize: 12, color: "#5C6478", margin: "6px 0 0" },
  card: { background: "#fff", border: "1px solid #DCD8CC", borderRadius: 12, padding: "18px 20px", marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: 800, margin: "0 0 14px" },
  bars: { display: "flex", alignItems: "flex-end", gap: 3, height: 150 },
  barCol: { flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", minWidth: 0 },
  bar: { width: "100%", borderRadius: "3px 3px 0 0", minHeight: 1 },
  barLabel: { fontSize: 9.5, color: "#5C6478", marginTop: 4, fontFamily: "monospace" },
  warn: { fontSize: 12.5, color: "#B9760F", margin: "0 0 12px" },
  note: { fontSize: 12.5, color: "#5C6478", margin: "0 0 12px" },
  foot: { fontSize: 12, color: "#5C6478", margin: "6px 0 0" },
};
