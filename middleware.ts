import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/api/auth/login",
  "/api/auth/demo",
  "/api/auth/signup",
];

function getSecret() {
  const raw =
    process.env.AUTH_SECRET ||
    "dev-only-secret-change-me-32-bytes-minimum-please";
  return new TextEncoder().encode(raw);
}

function unauthorized(req: NextRequest, isApi: boolean) {
  if (isApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  const isStaticAsset = /\.(?:png|jpe?g|gif|webp|svg|ico|avif|woff2?|ttf|otf|map|css|js)$/i.test(
    pathname,
  );

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/uploadthing") ||
    pathname.startsWith("/share/") ||
    PUBLIC_PATHS.includes(pathname) ||
    pathname === "/favicon.ico" ||
    isStaticAsset
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return unauthorized(req, isApi);

  try {
    await jwtVerify(token, getSecret());
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  } catch {
    return unauthorized(req, isApi);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
