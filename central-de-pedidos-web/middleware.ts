const COOKIE = "site_auth";
const PUBLIC_PATHS = ["/login", "/api/login", "/dashboard.css", "/dashboard.js", "/favicon.ico"];

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

// Middleware sin depender de "next/server": Next.js soporta devolver un Response
// (o nada, para dejar pasar la request) directamente, evitando un bug conocido
// de Next.js donde importar next/server rompe el middleware en el runtime Edge.
export function middleware(req: Request) {
  // Si no configuraste SITE_PASSWORD en Vercel, el sitio queda abierto sin pedir nada.
  if (!process.env.SITE_PASSWORD) {
    return;
  }

  const url = new URL(req.url);
  const { pathname } = url;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return;
  }

  const cookie = getCookie(req, COOKIE);
  if (cookie !== process.env.SITE_PASSWORD) {
    const loginUrl = new URL("/login", url);
    loginUrl.searchParams.set("next", pathname);
    return Response.redirect(loginUrl, 307);
  }

  return;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
