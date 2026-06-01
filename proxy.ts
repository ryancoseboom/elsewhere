import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const basicAuth = request.headers.get("authorization");

  if (request.nextUrl.pathname.startsWith("/backroom")) {
    if (basicAuth) {
      const authValue = basicAuth.split(" ")[1];
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
    }

    return new NextResponse("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Backroom"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/backroom/:path*"],
};
