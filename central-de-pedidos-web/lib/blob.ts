import { put, get } from "@vercel/blob";

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
    const result = await get(KEY, { access: "private", token: TOKEN, useCache: false });
    if (!result || !result.stream) return {};
    const text = await new Response(result.stream).text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (err) {
    console.error("getReportData error", err);
    return {};
  }
}

export async function saveReportData(data: Record<string, any>): Promise<void> {
  await put(KEY, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    token: TOKEN,
  });
}
