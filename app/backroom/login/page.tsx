import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Backroom Access",
};

type LoginSearchParams = Promise<{
  error?: string | string[];
  loggedOut?: string | string[];
  next?: string | string[];
}>;

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function safeBackroomPath(value: FormDataEntryValue | string | null) {
  const path = String(value || "/backroom");

  if (
    !path.startsWith("/backroom") ||
    path.startsWith("/backroom/login") ||
    path.startsWith("/backroom/logout")
  ) {
    return "/backroom";
  }

  return path;
}

export async function enterBackroomAction(formData: FormData) {
  "use server";

  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const nextPath = safeBackroomPath(formData.get("next"));

  if (
    username !== process.env.BACKROOM_USER ||
    password !== process.env.BACKROOM_PASSWORD
  ) {
    redirect(
      `/backroom/login?error=1&next=${encodeURIComponent(nextPath)}`
    );
  }

  (await cookies()).set("elsewhere_backroom", "yes", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  const separator = nextPath.includes("?") ? "&" : "?";
  redirect(`${nextPath}${separator}access=accepted`);
}

export default async function BackroomLoginPage({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const params = await searchParams;
  const hasError = one(params.error) === "1";
  const loggedOut = one(params.loggedOut) === "1";
  const nextPath = safeBackroomPath(one(params.next) || "/backroom");

  return (
    <main className="min-h-screen bg-[#090807] px-6 py-12 text-stone-200">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center">
        <section className="grid w-full gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(22rem,0.65fr)] lg:items-end">
          <div>
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.34em] text-stone-600 transition hover:text-stone-300"
            >
              ← Elsewhere
            </Link>
            <p className="mt-16 text-xs uppercase tracking-[0.48em] text-stone-600">
              Backroom / private threshold
            </p>
            <h1 className="mt-5 max-w-3xl font-serif text-6xl leading-none text-stone-100 md:text-8xl">
              Show your key.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-stone-500">
              The public rooms continue outside. This door opens onto drafts,
              source traces, unfinished artifacts, and other material still
              finding its shape.
            </p>
          </div>

          <form
            action={enterBackroomAction}
            className="relative border border-stone-800 bg-stone-950/70 p-6 shadow-2xl shadow-black/40"
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(231,229,228,0.06),transparent_38%),url('/textures/float/photocopy-noise.jpg')] bg-cover opacity-10 mix-blend-screen" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.32em] text-stone-600">
                Restricted archive
              </p>
              <h2 className="mt-3 font-serif text-3xl text-stone-100">
                Backroom access
              </h2>

              {hasError && (
                <p className="mt-5 border-l border-red-700/70 bg-red-950/10 px-4 py-3 text-sm leading-6 text-red-300">
                  That key did not open the room. Check the username and
                  password, then try again.
                </p>
              )}
              {loggedOut && (
                <p className="mt-5 border-l border-stone-700 bg-stone-900/40 px-4 py-3 text-sm leading-6 text-stone-400">
                  Backroom access closed.
                </p>
              )}

              <input type="hidden" name="next" value={nextPath} />

              <label className="mt-7 block text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Username
                <input
                  name="username"
                  autoComplete="username"
                  autoFocus
                  required
                  className="mt-2 w-full border-b border-stone-800 bg-transparent py-3 normal-case tracking-normal text-stone-100 outline-none transition focus:border-stone-400"
                />
              </label>

              <label className="mt-5 block text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-2 w-full border-b border-stone-800 bg-transparent py-3 normal-case tracking-normal text-stone-100 outline-none transition focus:border-stone-400"
                />
              </label>

              <button className="mt-7 w-full border border-stone-600 bg-stone-200 px-5 py-3 text-xs uppercase tracking-[0.24em] text-stone-950 transition hover:bg-white">
                Enter backroom
              </button>
              <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-stone-700">
                Accepted credentials will be remembered for this session.
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
