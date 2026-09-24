import { getDatabase, getOrganizerEmail } from "@/db";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { competitionSchema, initialCompetition, type Competition, type Snapshot } from "./competition";
type Row = { data: string; version: number; owner_id: string | null };
export async function loadCompetition(user: ChatGPTUser | null): Promise<Snapshot> {
  const db = getDatabase();
  const organizerEmail = getOrganizerEmail();
  const isOrganizer = !!user && !!organizerEmail && user.email.trim().toLowerCase() === organizerEmail;
  const userId = isOrganizer ? user.userId : null;
  await db.prepare("INSERT INTO competitions (id, data, version, owner_id) VALUES (?, ?, 1, ?) ON CONFLICT(id) DO NOTHING")
    .bind("main", JSON.stringify(initialCompetition), userId).run();
  if (userId) await db.prepare("UPDATE competitions SET owner_id = ? WHERE id = ? AND (owner_id IS NULL OR owner_id != ?)").bind(userId, "main", userId).run();
  const row = await db.prepare("SELECT data, version, owner_id FROM competitions WHERE id = ?").bind("main").first<Row>();
  if (!row) throw new Error("Competition not found");
  return { data: competitionSchema.parse(JSON.parse(row.data)), version: row.version, canEdit: !!userId && row.owner_id === userId };
}
export async function saveCompetition(data: Competition, version: number, userId: string) {
  const result = await getDatabase().prepare("UPDATE competitions SET data = ?, version = version + 1 WHERE id = ? AND version = ? AND owner_id = ?")
    .bind(JSON.stringify(data), "main", version, userId).run();
  return result.meta.changes === 1;
}
