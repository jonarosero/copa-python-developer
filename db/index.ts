import { env } from "cloudflare:workers";
export function getDatabase(): D1Database {
  if (!env.DB) throw new Error("Competition database is unavailable");
  return env.DB;
}
export function getOrganizerEmail(): string | null {
  return env.ORGANIZER_EMAIL?.trim().toLowerCase() || null;
}
