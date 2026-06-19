import { cookies } from "next/headers";

const BACKROOM_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  priority: "high" as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function POST() {
  const cookieStore = await cookies();

  if (cookieStore.get("elsewhere_backroom")?.value !== "yes") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  cookieStore.set("elsewhere_backroom", "yes", BACKROOM_COOKIE_OPTIONS);

  return Response.json({ ok: true });
}
