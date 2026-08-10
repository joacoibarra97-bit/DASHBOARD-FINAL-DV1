import { NextRequest, NextResponse } from "next/server";
import { getReportData, saveReportData } from "@/lib/blob";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getReportData();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    await saveReportData(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "No se pudo guardar" }, { status: 500 });
  }
}
