export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/pedidos",
    icon: "📦",
    title: "Central de Pedidos",
    desc: "Rappi, PedidosYa y C.A.T. — comparación mensual, histórico y edición manual, los 8 locales.",
    status: null as string | null,
  },
  {
    href: "/mostrador",
    icon: "🛎️",
    title: "Mostrador",
    desc: "Dashboard de mostrador — en construcción.",
    status: "Próximamente" as string | null,
  },
  {
    href: "/marca",
    icon: "🎨",
    title: "Identidad de marca",
    desc: "Logo, paleta de colores y lineamientos, para consulta rápida.",
    status: null as string | null,
  },
];

export default function PortalPage() {
  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <p style={styles.eyebrow}>Panel de control</p>
        <h1 style={styles.title}>¿Qué querés ver?</h1>
        <div style={styles.grid}>
          {SECTIONS.map((s) => (
            <a key={s.href} href={s.href} style={styles.card}>
              <span style={styles.icon}>{s.icon}</span>
              <span style={styles.cardTitle}>{s.title}</span>
              <span style={styles.cardDesc}>{s.desc}</span>
              {s.status && <span style={styles.badge}>{s.status}</span>}
            </a>
          ))}
        </div>
        <a href="/api/logout" style={styles.logout}>Salir</a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#EFEDE6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
  wrap: { maxWidth: 900, margin: "0 auto", padding: "56px 28px" },
  eyebrow: { fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#EE9D2B", margin: "0 0 6px", fontWeight: 700 },
  title: { fontSize: 32, fontWeight: 800, margin: "0 0 32px", color: "#14213D" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 },
  card: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "#fff",
    border: "1px solid #DCD8CC",
    borderRadius: 12,
    padding: "26px 22px",
    textDecoration: "none",
    transition: "border-color .15s ease",
  },
  icon: { fontSize: 28 },
  cardTitle: { fontSize: 17, fontWeight: 800, color: "#14213D" },
  cardDesc: { fontSize: 13, color: "#5C6478", lineHeight: 1.5 },
  badge: {
    position: "absolute",
    top: 18,
    right: 18,
    fontFamily: "monospace",
    fontSize: 10,
    background: "#fff3de",
    color: "#B9760F",
    padding: "3px 8px",
    borderRadius: 6,
    fontWeight: 700,
  },
  logout: { display: "inline-block", marginTop: 36, fontFamily: "monospace", fontSize: 12, color: "#9aa3bc", textDecoration: "none" },
};
