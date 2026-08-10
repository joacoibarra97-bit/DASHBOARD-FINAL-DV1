import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  const res = NextResponse.redirect(url);
  res.cookies.set("site_auth", "", { maxAge: 0, path: "/" });
  return res;
}
