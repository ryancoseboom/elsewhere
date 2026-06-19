import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  (await cookies()).set("elsewhere_backroom", "", {
    maxAge: 0,
    path: "/",
  });
  redirect("/backroom/login?loggedOut=1");
}
