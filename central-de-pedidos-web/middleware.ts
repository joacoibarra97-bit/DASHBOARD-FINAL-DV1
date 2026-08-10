import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "site_auth";
const PUBLIC_PATHS = ["/login", "/api/login", "/dashboard.css", "/dashboard.js", "/favicon.ico"];

export function middleware(req: NextRequest) {
  // Si no configuraste SITE_PASSWORD en Vercel, el sitio queda abierto sin pedir nada.
  // Apenas cargues esa variable (Settings > Environment Variables) se activa el login solo.
  if (!process.env.SITE_PASSWORD) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie !== process.env.SITE_PASSWORD) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

