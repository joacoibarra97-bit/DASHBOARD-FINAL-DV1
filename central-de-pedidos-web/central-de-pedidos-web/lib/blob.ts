import { put, get } from "@vercel/blob";

// Un único archivo que guarda todos los meses cargados hasta ahora,
// igual que veníamos haciendo a mano: { "Julio 2026": {...}, "Junio 2026": {...}, ... }
const KEY = "data/central-de-pedidos.json";
// Pedidos de MOSTRADOR (servicio "M"): archivo aparte, misma estructura por mes/local
const KEY_MOSTRADOR = "data/central-de-pedidos-mostrador.json";

// No pasamos "token" a mano: el SDK se autentica solo usando OIDC + BLOB_STORE_ID,
// que Vercel agrega automáticamente al conectar el store al proyecto. Pasar un token
// armado con un nombre de variable adivinado puede confundir la autenticación.
export async function getReportData(): Promise<Record<string, any>> {
  return readJson(KEY);
}

export async function getMostradorData(): Promise<Record<string, any>> {
  return readJson(KEY_MOSTRADOR);
}

async function readJson(key: string): Promise<Record<string, any>> {
  try {
    const result = await get(key, { access: "private", useCache: false });
    if (!result || !result.stream) return {};
    const text = await new Response(result.stream).text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (err: any) {
    // Si todavía no se generó ningún reporte, get() tira 404 — lo tratamos como "vacío".
    if (err?.status === 404 || /not.?found/i.test(String(err?.message))) return {};
    console.error("readJson error", key, err);
    return {};
  }
}

export async function saveReportData(data: Record<string, any>): Promise<void> {
  await writeJson(KEY, data);
}

export async function saveMostradorData(data: Record<string, any>): Promise<void> {
  await writeJson(KEY_MOSTRADOR, data);
}

async function writeJson(key: string, data: Record<string, any>): Promise<void> {
  await put(key, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
