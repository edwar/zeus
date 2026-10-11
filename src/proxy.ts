import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { locales, defaultLocale } from "@/i18n/config";

function pickLocale(request: NextRequest) {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if ((locales as readonly string[]).includes(code)) return code;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lang = locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (lang) {
    // Revisión optimista (solo existencia de la cookie). La validación real está en el layout y en guardApi.
    const signedIn = Boolean(getSessionCookie(request));
    if (!signedIn && (pathname === `/${lang}/app` || pathname.startsWith(`/${lang}/app/`))) {
      request.nextUrl.pathname = `/${lang}/login`;
      return NextResponse.redirect(request.nextUrl);
    }
    return;
  }
  request.nextUrl.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
