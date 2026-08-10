export default function MostradorPage() {
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
          <p style={styles.cardTitle}>En construcción</p>
          <p style={styles.cardText}>
            Este dashboard todavía no está armado — tiene su propia estructura de archivos y requisitos,
            distintos a Central de Pedidos. En cuanto definamos eso, esta pestaña queda lista para usarse.
          </p>
        </div>
      </div>
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
  wrap: { maxWidth: 780, margin: "0 auto", padding: "60px 28px" },
  card: { background: "#fff", border: "1px solid #DCD8CC", borderRadius: 12, padding: "40px 32px", textAlign: "center" },
  icon: { fontSize: 34, margin: "0 0 10px" },
  cardTitle: { fontSize: 18, fontWeight: 800, color: "#14213D", margin: "0 0 10px" },
  cardText: { fontSize: 13.5, color: "#5C6478", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" },
};
