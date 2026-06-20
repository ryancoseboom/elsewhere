import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  return new Response(null, { status: 204 });
}

export async function POST() {
  (await cookies()).set("elsewhere_backroom", "", {
    maxAge: 0,
    path: "/",
  });
  redirect("/backroom/login?loggedOut=1");
}
