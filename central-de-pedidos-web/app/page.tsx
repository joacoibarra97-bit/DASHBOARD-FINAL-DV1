import fs from "fs";
import path from "path";
import { getReportData } from "@/lib/blob";

export const dynamic = "force-dynamic"; // siempre traer los datos más recientes del Blob

export default async function HomePage() {
  const data = await getReportData();
  const hasData = Object.keys(data).length > 0;

  if (!hasData) {
    return (
      <div style={emptyStyles.wrap}>
        <div style={emptyStyles.card}>
          <p style={emptyStyles.eyebrow}>Panel de control · 8 locales</p>
          <h1 style={emptyStyles.title}>Central de Pedidos</h1>
          <p style={emptyStyles.text}>
            Todavía no cargaste ningún mes. Subí los 8 Excel de Waitry para generar el primer reporte.
          </p>
          <a href="/generar" style={emptyStyles.button}>+ Cargar el primer mes</a>
        </div>
      </div>
    );
  }

  const bodyHtml = fs.readFileSync(path.join(process.cwd(), "content/dashboard-body.html"), "utf-8");

  return (
    <>
      <link rel="stylesheet" href="/dashboard.css" />
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__REPORT_DATA__ = ${JSON.stringify(data)};`,
        }}
      />
      <script src="/dashboard.js" />
    </>
  );
}

const emptyStyles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#EFEDE6",
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },
  card: {
    background: "#fff",
    padding: "40px 36px",
    borderRadius: 12,
    border: "1px solid #DCD8CC",
    maxWidth: 420,
    textAlign: "center",
  },
  eyebrow: {
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#EE9D2B",
    margin: "0 0 6px",
  },
  title: { fontSize: 26, fontWeight: 800, margin: "0 0 12px", color: "#14213D" },
  text: { fontSize: 14, color: "#5C6478", margin: "0 0 22px", lineHeight: 1.5 },
  button: {
    display: "inline-block",
    padding: "12px 22px",
    borderRadius: 8,
    background: "#14213D",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
  },
};
