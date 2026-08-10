import { NextRequest, NextResponse } from "next/server";
import { STORE_NAMES, parseStoreWorkbook, buildGeneral, StoreData } from "@/lib/parseExcel";
import { getReportData, saveReportData } from "@/lib/blob";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const mesIdx = parseInt(String(form.get("mes")), 10);
    const anio = String(form.get("anio") || "").trim();

    if (isNaN(mesIdx) || mesIdx < 0 || mesIdx > 11 || !/^\d{4}$/.test(anio)) {
      return NextResponse.json({ ok: false, error: "Mes o año inválido" }, { status: 400 });
    }

    const stores: Record<string, StoreData> = {};
    const faltantes: string[] = [];

    for (const storeName of STORE_NAMES) {
      const field = storeName.toLowerCase();
      const file = form.get(field);
      if (!(file instanceof File)) {
        faltantes.push(storeName);
        continue;
      }
      const buffer = await file.arrayBuffer();
      stores[storeName] = parseStoreWorkbook(buffer);
    }

    if (faltantes.length > 0) {
      return NextResponse.json(
        { ok: false, error: `Faltan los archivos de: ${faltantes.join(", ")}` },
        { status: 400 }
      );
    }

    const general = buildGeneral(stores);
    const monthLabel = `${MESES[mesIdx]} ${anio}`;

    const current = await getReportData();
    current[monthLabel] = { ...stores, General: general };
    await saveReportData(current);

    return NextResponse.json({ ok: true, monthLabel });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message || "Error inesperado" }, { status: 500 });
  }
}
