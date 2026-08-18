import { put, get } from "@vercel/blob";

// Un único archivo que guarda todos los meses cargados hasta ahora,
// igual que veníamos haciendo a mano: { "Julio 2026": {...}, "Junio 2026": {...}, ... }
const KEY = "data/central-de-pedidos.json";

// No pasamos "token" a mano: el SDK se autentica solo usando OIDC + BLOB_STORE_ID,
// que Vercel agrega automáticamente al conectar el store al proyecto. Pasar un token
// armado con un nombre de variable adivinado puede confundir la autenticación.
export async function getReportData(): Promise<Record<string, any>> {
  try {
    const result = await get(KEY, { access: "private", useCache: false });
    if (!result || !result.stream) return {};
    const text = await new Response(result.stream).text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (err: any) {
    // Si todavía no se generó ningún reporte, get() tira 404 — lo tratamos como "vacío".
    if (err?.status === 404 || /not.?found/i.test(String(err?.message))) return {};
    console.error("getReportData error", err);
    return {};
  }
}

export async function saveReportData(data: Record<string, any>): Promise<void> {
  await put(KEY, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
