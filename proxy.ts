import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const has = req.cookies.has("oc_session");
  const { pathname } = req.nextUrl;
  const isAuthPage = ["/welcome", "/login", "/signup"].includes(pathname);
  if (!has && !isAuthPage) return NextResponse.redirect(new URL("/welcome", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
