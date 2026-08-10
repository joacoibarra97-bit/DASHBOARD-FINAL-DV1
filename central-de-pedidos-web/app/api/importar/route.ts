import { NextRequest, NextResponse } from "next/server";
import { getReportData, saveReportData } from "../../../lib/blob";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("archivo");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No se recibió ningún archivo" }, { status: 400 });
    }

    const html = await file.text();
    const match = html.match(/<script id="raw-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) {
      return NextResponse.json(
        { ok: false, error: "No encontré datos de reporte adentro de ese HTML. ¿Es un dashboard generado por acá?" },
        { status: 400 }
      );
    }

    let imported: Record<string, any>;
    try {
      imported = JSON.parse(match[1]);
    } catch {
      return NextResponse.json({ ok: false, error: "Los datos del archivo están corruptos o incompletos" }, { status: 400 });
    }

    const months = Object.keys(imported);
    if (months.length === 0) {
      return NextResponse.json({ ok: false, error: "El archivo no tiene ningún mes cargado" }, { status: 400 });
    }

    const current = await getReportData();
    const nuevos: string[] = [];
    const reemplazados: string[] = [];

    months.forEach((m) => {
      if (current[m]) reemplazados.push(m);
      else nuevos.push(m);
      current[m] = imported[m];
    });

    await saveReportData(current);

    return NextResponse.json({ ok: true, nuevos, reemplazados });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message || "Error inesperado" }, { status: 500 });
  }
}
