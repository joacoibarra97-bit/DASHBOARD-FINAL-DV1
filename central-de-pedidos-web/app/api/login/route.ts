import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));

  if (password && process.env.SITE_PASSWORD && password === process.env.SITE_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("site_auth", password, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
}
