export default function MarcaPage() {
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <div>
            <p style={styles.eyebrow}>Panel de control</p>
            <h1 style={styles.title}>Identidad de marca</h1>
          </div>
          <a href="/" style={styles.backLink}>← Portal</a>
        </div>
      </div>

      <div style={styles.wrap}>
        <div style={styles.pendingCard}>
          <p style={styles.pendingTitle}>Todavía no tengo tus assets de marca cargados acá.</p>
          <p style={styles.pendingText}>
            Mandame el logo (PNG/SVG idealmente), los colores oficiales (en hex si los tenés) y cualquier
            lineamiento que ya exista (tipografías, tono de voz, usos permitidos/prohibidos del logo) y te
            armo esta pantalla con todo eso.
          </p>
        </div>

        <div style={styles.sectionGrid}>
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Logo</p>
            <div style={styles.placeholder}>Esperando archivo</div>
          </div>
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Paleta de colores</p>
            <div style={styles.placeholder}>Esperando colores</div>
          </div>
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Tipografía</p>
            <div style={styles.placeholder}>Esperando lineamientos</div>
          </div>
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Tono de voz</p>
            <div style={styles.placeholder}>Esperando lineamientos</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#EFEDE6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
  topbar: { background: "#14213D", color: "#fff", padding: "20px 28px" },
  topbarInner: { maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#EE9D2B", margin: "0 0 4px" },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  backLink: { color: "#B9C0D4", fontSize: 13, textDecoration: "none" },
  wrap: { maxWidth: 900, margin: "0 auto", padding: "28px" },
  pendingCard: { background: "#fff3de", border: "1px solid #f0d9a8", borderRadius: 10, padding: 20, marginBottom: 24 },
  pendingTitle: { fontWeight: 700, fontSize: 14, color: "#B9760F", margin: "0 0 6px" },
  pendingText: { fontSize: 13, color: "#5C6478", lineHeight: 1.6, margin: 0 },
  sectionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 },
  section: { background: "#fff", border: "1px solid #DCD8CC", borderRadius: 10, padding: 18 },
  sectionLabel: { fontFamily: "monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5C6478", margin: "0 0 12px" },
  placeholder: { border: "1px dashed #DCD8CC", borderRadius: 8, padding: "24px 12px", textAlign: "center", fontSize: 12.5, color: "#9aa3bc" },
};
