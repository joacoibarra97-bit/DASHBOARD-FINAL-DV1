"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      setError("Contraseña incorrecta.");
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <p style={styles.eyebrow}>Panel de control · 8 locales</p>
        <h1 style={styles.title}>Central de Pedidos</h1>
        <p style={styles.sub}>Ingresá la contraseña para ver los reportes.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          style={styles.input}
          autoFocus
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    padding: "36px 32px",
    borderRadius: 12,
    border: "1px solid #DCD8CC",
    width: 340,
    boxShadow: "0 8px 30px rgba(20,33,61,0.08)",
  },
  eyebrow: {
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#EE9D2B",
    margin: "0 0 6px",
  },
  title: { fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: "#14213D" },
  sub: { fontSize: 13, color: "#5C6478", margin: "0 0 20px" },
  input: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 8,
    border: "1px solid #DCD8CC",
    fontSize: 15,
    marginBottom: 10,
    boxSizing: "border-box",
  },
  error: { color: "#DE5B45", fontSize: 13, margin: "0 0 10px" },
  button: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 8,
    border: "none",
    background: "#14213D",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
};
