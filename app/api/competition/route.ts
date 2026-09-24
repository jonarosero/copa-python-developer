import { initialCompetition } from "@/lib/competition";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  return json({ data: initialCompetition, version: 1, canEdit: false });
}
