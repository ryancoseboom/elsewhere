export function siteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
}
