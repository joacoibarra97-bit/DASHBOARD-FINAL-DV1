export const metadata = {
  title: "Central de Pedidos",
  description: "Dashboard de pedidos — 8 locales",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
