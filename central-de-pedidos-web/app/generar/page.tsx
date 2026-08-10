"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STORES = ["Arenales", "Bulnes", "Echeverria", "Guayaquil", "Olazabal", "Uriarte", "Uruguay", "Vidal"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function GenerarPage() {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();

  const allSelected = STORES.every((s) => files[s]);

  function handleFile(store: string, f: FileList | null) {
    setFiles((prev) => ({ ...prev, [store]: f && f[0] ? f[0] : null }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allSelected) {
      setError("Te falta subir el Excel de alguno de los 8 locales.");
      return;
    }
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.set("mes", String(mes));
    fd.set("anio", anio);
    STORES.forEach((s) => fd.set(s.toLowerCase(), files[s] as File));

    try {
      const res = await fetch("/api/generar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Error al generar el reporte");
      setDone(json.monthLabel);
      setTimeout(() => {
        router.push("/pedidos");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <div>
            <p style={styles.eyebrow}>Panel de control · 8 locales</p>
            <h1 style={styles.title}>Cargar un mes nuevo</h1>
          </div>
          <a href="/pedidos" style={styles.backLink}>← Volver al dashboard</a>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.wrap}>
        <div style={styles.card}>
          <p style={styles.label}>Mes que estás cargando</p>
          <div style={styles.row}>
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value, 10))} style={styles.select}>
              {MESES.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              placeholder="Año"
              style={{ ...styles.select, width: 100 }}
            />
          </div>
          <p style={styles.note}>
            Si ese mes ya existía, se reemplaza con esta carga nueva.
          </p>
        </div>

        <div style={styles.card}>
          <p style={styles.label}>Los 8 Excel de Waitry (uno por local)</p>
          <div style={styles.grid}>
            {STORES.map((s) => (
              <label key={s} style={styles.fileBox}>
                <span style={styles.fileLabel}>{s}</span>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => handleFile(s, e.target.files)}
                  style={styles.fileInput}
                />
                <span style={{ ...styles.fileStatus, color: files[s] ? "#1f6b3a" : "#5C6478" }}>
                  {files[s] ? `✓ ${files[s]!.name}` : "sin archivo"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {done && <p style={styles.success}>✓ {done} generado y guardado. Volviendo al dashboard...</p>}

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? "Procesando los 8 archivos..." : "Generar y guardar reporte"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#EFEDE6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
  topbar: { background: "#14213D", color: "#fff", padding: "20px 28px" },
  topbarInner: { maxWidth: 780, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#EE9D2B", margin: "0 0 4px" },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  backLink: { color: "#B9C0D4", fontSize: 13, textDecoration: "none" },
  wrap: { maxWidth: 780, margin: "0 auto", padding: "28px" },
  card: { background: "#fff", border: "1px solid #DCD8CC", borderRadius: 10, padding: 20, marginBottom: 16 },
  label: { fontFamily: "monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5C6478", margin: "0 0 10px" },
  row: { display: "flex", gap: 10 },
  select: { padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD8CC", fontSize: 14 },
  note: { fontSize: 12, color: "#5C6478", margin: "10px 0 0" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  fileBox: { border: "1px dashed #DCD8CC", borderRadius: 8, padding: "10px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 },
  fileLabel: { fontWeight: 700, fontSize: 13.5, color: "#14213D" },
  fileInput: { fontSize: 12 },
  fileStatus: { fontSize: 11.5, fontFamily: "monospace" },
  error: { color: "#DE5B45", fontSize: 13.5, marginBottom: 12 },
  success: { color: "#1f6b3a", fontSize: 13.5, marginBottom: 12 },
  submitBtn: { width: "100%", padding: "13px", borderRadius: 8, border: "none", background: "#14213D", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" },
};
