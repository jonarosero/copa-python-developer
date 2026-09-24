import { competitionSchema, initialCompetition } from "@/lib/competition";

const path = "data/competition.json";
const repository = process.env.GITHUB_REPOSITORY || "soporteticslg/copa-python-developer";
const branch = process.env.GITHUB_BRANCH || "main";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}

async function readCompetition() {
  const response = await fetch(`https://api.github.com/repos/${repository}/contents/${path}?ref=${branch}`, { headers: githubHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  const file = await response.json() as { content: string; sha: string };
  const data = competitionSchema.parse(JSON.parse(Buffer.from(file.content, "base64").toString("utf8")));
  return { data, sha: file.sha };
}

export async function GET() {
  try {
    const file = await readCompetition();
    return json({ data: file.data, version: 1, canEdit: false, sha: file.sha });
  } catch (error) {
    console.error("Read competition failed", error);
    return json({ data: initialCompetition, version: 1, canEdit: false, error: "No se pudo leer el marcador remoto." }, 503);
  }
}

export async function PUT(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Solicitud no permitida." }, 403);
    const body = await request.json() as { data?: unknown; sha?: string; password?: string };
    if (body.password !== (process.env.ADMIN_PASSWORD || "1729")) return json({ error: "Contraseña incorrecta." }, 401);
    if (!body.sha) return json({ error: "Actualiza el marcador antes de guardar." }, 409);
    const parsed = competitionSchema.safeParse(body.data);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Revisa los datos." }, 400);
    const content = Buffer.from(`${JSON.stringify(parsed.data, null, 2)}\n`).toString("base64");
    const response = await fetch(`https://api.github.com/repos/${repository}/contents/${path}`, {
      method: "PUT",
      headers: { ...githubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Update championship data", content, sha: body.sha, branch }),
    });
    if (response.status === 409) return json({ error: "El marcador cambió en otra ventana. Actualiza antes de guardar." }, 409);
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const result = await response.json() as { content: { sha: string } };
    return json({ data: parsed.data, version: 1, canEdit: true, sha: result.content.sha });
  } catch (error) {
    console.error("Save competition failed", error);
    return json({ error: "No se pudo guardar el marcador remoto." }, 503);
  }
}
