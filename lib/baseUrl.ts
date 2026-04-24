/**
 * Absolute origin for server-side fetches (e.g. RSC → Route Handlers).
 * Set `NEXT_PUBLIC_SITE_URL` in production; Vercel provides `VERCEL_URL`.
 */
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
