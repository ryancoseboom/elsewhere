import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { siteUrl } from "@/lib/site";
import BackroomSessionKeepAlive from "@/components/BackroomSessionKeepAlive";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "Elsewhere",
    template: "%s / Elsewhere",
  },
  description:
    "Over 25 years of Halou recordings, photos, fragments, false starts, and things we thought were gone.",
  openGraph: {
    title: "Elsewhere",
    description:
      "Over 25 years of Halou recordings, photos, fragments, false starts, and things we thought were gone.",
    type: "website",
  },
};

function AdminSessionReminder() {
  return (
    <aside className="fixed bottom-3 right-3 z-[100] flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-2 border border-amber-800/70 bg-black/85 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-amber-300 shadow-2xl shadow-black/50 backdrop-blur">
      <span>Admin session active</span>
      <Link
        href="/backroom"
        className="border-l border-amber-900/70 pl-2 text-amber-100 transition hover:text-white"
      >
        Backroom
      </Link>
      <form action="/backroom/logout" method="post">
        <button
          type="submit"
          className="text-amber-500 transition hover:text-amber-100"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAdmin = (await cookies()).get("elsewhere_backroom")?.value === "yes";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {isAdmin && (
          <>
            <BackroomSessionKeepAlive />
            <AdminSessionReminder />
          </>
        )}
      </body>
    </html>
  );
}
