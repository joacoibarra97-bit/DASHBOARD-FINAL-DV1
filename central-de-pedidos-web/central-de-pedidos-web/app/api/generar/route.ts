import { NextRequest, NextResponse } from "next/server";
import { parseStoreWorkbookFull, buildGeneral, buildMostradorGeneral, StoreData, MostradorData } from "../../../lib/parseExcel";
import { storesForMonth } from "../../../lib/stores";
import { getReportData, saveReportData, getMostradorData, saveMostradorData } from "../../../lib/blob";

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
    const mostrador: Record<string, MostradorData> = {};
    const faltantes: string[] = [];

    // Solo se piden los locales que existen en ese mes (Franklin recién desde Octubre 2026)
    for (const storeName of storesForMonth(mesIdx, parseInt(anio, 10))) {
      const field = storeName.toLowerCase();
      const file = form.get(field);
      if (!(file instanceof File)) {
        faltantes.push(storeName);
        continue;
      }
      const buffer = await file.arrayBuffer();
      // Un solo Excel alimenta los dos dashboards: servicio "M" (mostrador) va a /mostrador,
      // el resto (delivery) va a Central de Pedidos.
      const parsed = parseStoreWorkbookFull(buffer);
      stores[storeName] = parsed.delivery;
      mostrador[storeName] = parsed.mostrador;
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

    const currentMostrador = await getMostradorData();
    currentMostrador[monthLabel] = { ...mostrador, General: buildMostradorGeneral(mostrador) };
    await saveMostradorData(currentMostrador);

    return NextResponse.json({ ok: true, monthLabel });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message || "Error inesperado" }, { status: 500 });
  }
}
