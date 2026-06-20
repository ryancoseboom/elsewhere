import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const basicAuth = request.headers.get("authorization");

  if (request.nextUrl.pathname.startsWith("/backroom")) {
    if (request.nextUrl.pathname === "/backroom/login") {
      return NextResponse.next();
    }

    if (request.nextUrl.pathname === "/backroom/logout") {
      if (request.method !== "POST") {
        return new Response(null, { status: 204 });
      }

      return NextResponse.next();
    }

    if (request.cookies.get("elsewhere_backroom")?.value === "yes") {
      return NextResponse.next();
    }

    if (basicAuth?.startsWith("Basic ")) {
      try {
        const authValue = basicAuth.slice(6);
        const [user, password] = atob(authValue).split(":");

        if (
          user === process.env.BACKROOM_USER &&
          password === process.env.BACKROOM_PASSWORD
        ) {
          const response = NextResponse.next();
          response.cookies.set("elsewhere_backroom", "yes", {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 8,
          });
          return response;
        }
      } catch {
        // Fall through to the in-site login.
      }
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/backroom/login";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/backroom/:path*"],
};
