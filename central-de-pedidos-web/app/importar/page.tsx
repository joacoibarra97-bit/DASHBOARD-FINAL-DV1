"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ nuevos: string[]; reemplazados: string[] } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Elegí el archivo .html del dashboard viejo primero.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    const fd = new FormData();
    fd.set("archivo", file);

    try {
      const res = await fetch("/api/importar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Error al importar");
      setResult({ nuevos: json.nuevos, reemplazados: json.reemplazados });
      setTimeout(() => {
        router.push("/pedidos");
        router.refresh();
      }, 2200);
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
            <h1 style={styles.title}>Importar un dashboard anterior</h1>
          </div>
          <a href="/pedidos" style={styles.backLink}>← Volver al dashboard</a>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.wrap}>
        <div style={styles.card}>
          <p style={styles.label}>Archivo .html descargado desde el chat o desde acá mismo</p>
          <p style={styles.note}>
            Sirve cualquier HTML que hayas generado con este dashboard antes — el de mayo/junio/julio del chat,
            o una copia que hayas descargado con "Descargar copia (.html)". Va a tomar todos los meses que tenga
            adentro y los va a sumar (o reemplazar si ya existían) a lo que ya está guardado acá.
          </p>
          <label style={styles.fileBox}>
            <input
              type="file"
              accept=".html,.htm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={styles.fileInput}
            />
            <span style={{ ...styles.fileStatus, color: file ? "#1f6b3a" : "#5C6478" }}>
              {file ? `✓ ${file.name}` : "sin archivo"}
            </span>
          </label>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {result && (
          <p style={styles.success}>
            ✓ Listo.
            {result.nuevos.length > 0 && <> Meses nuevos: {result.nuevos.join(", ")}.</>}
            {result.reemplazados.length > 0 && <> Meses reemplazados: {result.reemplazados.join(", ")}.</>}
            {" "}Volviendo al dashboard...
          </p>
        )}

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? "Importando..." : "Importar datos"}
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
  note: { fontSize: 12.5, color: "#5C6478", margin: "0 0 14px", lineHeight: 1.5 },
  fileBox: { border: "1px dashed #DCD8CC", borderRadius: 8, padding: "14px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 },
  fileInput: { fontSize: 13 },
  fileStatus: { fontSize: 12, fontFamily: "monospace" },
  error: { color: "#DE5B45", fontSize: 13.5, marginBottom: 12 },
  success: { color: "#1f6b3a", fontSize: 13.5, marginBottom: 12, lineHeight: 1.5 },
  submitBtn: { width: "100%", padding: "13px", borderRadius: 8, border: "none", background: "#14213D", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" },
};
