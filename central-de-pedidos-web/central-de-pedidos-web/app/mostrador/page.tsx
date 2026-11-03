import { getMostradorData } from "../../lib/blob";
import MostradorView from "./MostradorView";

export const dynamic = "force-dynamic"; // siempre traer los datos más recientes del Blob

export default async function MostradorPage() {
  const data = await getMostradorData();
  const hasData = Object.keys(data).length > 0;

  if (!hasData) {
    return (
      <div style={styles.page}>
        <div style={styles.topbar}>
          <div style={styles.topbarInner}>
            <div>
              <p style={styles.eyebrow}>Panel de control</p>
              <h1 style={styles.title}>Mostrador</h1>
            </div>
            <a href="/" style={styles.backLink}>← Portal</a>
          </div>
        </div>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <p style={styles.icon}>🛎️</p>
            <p style={styles.cardTitle}>Todavía no hay pedidos de mostrador cargados</p>
            <p style={styles.cardText}>
              Se llena solo al cargar un mes en Central de Pedidos: los pedidos con servicio Mostrador de cada Excel
              de Waitry se guardan acá. Cargá (o volvé a cargar) un mes para ver los datos.
            </p>
            <a href="/generar" style={styles.button}>+ Cargar un mes</a>
          </div>
        </div>
      </div>
    );
  }

  return <MostradorView data={data} />;
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#EFEDE6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
  topbar: { background: "#14213D", color: "#fff", padding: "20px 28px" },
  topbarInner: { maxWidth: 780, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#EE9D2B", margin: "0 0 4px" },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  backLink: { color: "#B9C0D4", fontSize: 13, textDecoration: "none" },
  wrap: { maxWidth: 780, margin: "0 auto", padding: "60px 28px" },
  card: { background: "#fff", border: "1px solid #DCD8CC", borderRadius: 12, padding: "40px 32px", textAlign: "center" },
  icon: { fontSize: 34, margin: "0 0 10px" },
  cardTitle: { fontSize: 18, fontWeight: 800, color: "#14213D", margin: "0 0 10px" },
  cardText: { fontSize: 13.5, color: "#5C6478", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 18px" },
  button: { display: "inline-block", background: "#14213D", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 700, textDecoration: "none" },
};
