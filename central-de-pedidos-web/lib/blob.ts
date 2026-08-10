import { put, list } from "@vercel/blob";

// Un único archivo que guarda todos los meses cargados hasta ahora,
// igual que veníamos haciendo a mano: { "Julio 2026": {...}, "Junio 2026": {...}, ... }
const KEY = "data/central-de-pedidos.json";

// Vercel a veces nombra el token de otra forma según cómo se conectó el Blob store
// (BLOB_READ_WRITE_TOKEN, o con un prefijo extra como BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN).
// Probamos varios nombres posibles en vez de depender de uno solo.
const TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN ||
  undefined;

export async function getReportData(): Promise<Record<string, any>> {
  try {
    const { blobs } = await list({ prefix: KEY, token: TOKEN });
    const found = blobs.find((b) => b.pathname === KEY);
    if (!found) return {};
    const res = await fetch(found.url, { cache: "no-store" });
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.error("getReportData error", err);
    return {};
  }
}

export async function saveReportData(data: Record<string, any>): Promise<void> {
  await put(KEY, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    token: TOKEN,
  });
}
