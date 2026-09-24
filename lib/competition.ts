import { z } from "zod";

export const teamSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1, "Escribe el nombre del equipo.").max(150),
  shortName: z.string().trim().max(40),
  color: z.enum(["mint", "violet", "orange", "blue"]),
  members: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  description: z.string().trim().max(2000).default(""),
});
const activitySchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1, "Escribe el nombre de la actividad.").max(100),
  description: z.string().trim().max(20000),
  points: z.number().int().min(1).max(1000),
  bonus: z.boolean(),
  icon: z.enum(["zap", "search", "spiral", "blocks", "crown", "star", "flame", "queen", "coins", "route", "calculator", "code"]),
  scores: z.record(z.number().int().min(0).max(1000)),
});
export const competitionSchema = z.object({
  teams: z.array(teamSchema).length(4),
  weeks: z.array(z.object({
    number: z.number().int().min(1).max(8),
    title: z.string().trim().min(1).max(100),
    closesAt: z.string().datetime().nullable().optional(),
    status: z.enum(["closed", "active", "upcoming"]),
    activities: z.array(activitySchema).max(60),
  })).length(8),
}).superRefine((data, context) => {
  const error = (message: string) => context.addIssue({ code: "custom", message });
  const teams = new Set(data.teams.map(t => t.id));
  if (teams.size !== 4) error("Los equipos deben tener identificadores diferentes.");
  if (new Set(data.teams.map(t => t.name.toLowerCase())).size !== 4) error("Usa un nombre diferente para cada equipo.");
  if (data.weeks.some((w, i) => w.number !== i + 1)) error("El campeonato debe tener las semanas 1 a 8 en orden.");
  if (data.weeks.filter(w => w.status === "active").length > 1) error("Solo puede haber una semana en juego.");
  for (const week of data.weeks) {
    if (new Set(week.activities.map(a => a.id)).size !== week.activities.length) error("Las actividades deben ser únicas.");
    for (const activity of week.activities) {
      for (const [teamId, points] of Object.entries(activity.scores)) {
        if (!teams.has(teamId)) error("El puntaje corresponde a un equipo desconocido.");
        if (points > activity.points) error(`Los puntos de ${activity.title} no pueden superar ${activity.points}.`);
      }
    }
  }
});

export type Team = z.infer<typeof teamSchema>;
export type Competition = z.infer<typeof competitionSchema>;
export type Week = Competition["weeks"][number];
export type Activity = Week["activities"][number];
export type Snapshot = { data: Competition; version: number; canEdit: boolean; sha?: string };
export const teamName = (team: Team) => team.shortName || team.name;
export const weekScore = (week: Week, teamId: string) => week.activities.reduce((sum, a) => sum + (a.scores[teamId] || 0), 0);
export const totalScore = (data: Competition, teamId: string) => data.weeks.reduce((sum, week) => sum + weekScore(week, teamId), 0);
export function leaders(data: Competition, week?: Week) {
  const scored = data.teams.map(team => ({ team, points: week ? weekScore(week, team.id) : totalScore(data, team.id) }));
  const top = Math.max(...scored.map(t => t.points));
  return top > 0 ? scored.filter(t => t.points === top) : [];
}
export function ranking(data: Competition, week?: Week) {
  return data.teams.map(team => ({ team, points: week ? weekScore(week, team.id) : totalScore(data, team.id) }))
    .sort((a, b) => b.points - a.points || teamName(a.team).localeCompare(teamName(b.team), "es"))
    .map((row, _, rows) => ({ ...row, rank: 1 + rows.filter(other => other.points > row.points).length }));
}
export function cupCount(data: Competition, teamId: string) {
  return data.weeks.filter(week => week.status === "closed" && leaders(data, week).length === 1 && leaders(data, week)[0].team.id === teamId).length;
}

export const initialCompetition: Competition = {
  teams: [
    { id: "canela", name: "Grupo Canela", shortName: "", color: "orange", members: [], description: "" },
    { id: "booleanos", name: "Los Booleanos", shortName: "", color: "mint", members: [], description: "" },
    { id: "dinamita", name: "Equipo Alfa Buena Maravilla Onda Dinamita Escuadrón Lobo", shortName: "Triple Dinamita", color: "violet", members: [], description: "" },
    { id: "otro", name: "Grupo Otro", shortName: "", color: "blue", members: [], description: "" },
  ],
  weeks: [
    { number: 1, title: "Lógica y primeros programas", status: "closed", activities: [
      { id: "reinas", title: "4 Reinas", description: "Resolver el tablero sin que las reinas se ataquen.", points: 5, bonus: false, icon: "queen", scores: { canela: 5, dinamita: 5 } },
      { id: "monedas", title: "Reto de las Monedas", description: "Encontrar la combinación de monedas del reto.", points: 5, bonus: false, icon: "coins", scores: { dinamita: 5 } },
      { id: "camino", title: "El camino más corto", description: "Encontrar la mejor solución al recorrido.", points: 5, bonus: false, icon: "route", scores: { canela: 5 } },
      { id: "iva", title: "Calculadora de productos con IVA", description: "Crear una calculadora del total de productos con IVA.", points: 15, bonus: false, icon: "calculator", scores: { booleanos: 15 } },
    ] },
    { number: 2, title: "Retos de programación", status: "active", activities: [
      { id: "fizzbuzz", title: "FizzBuzz", description: "Condicionales y múltiplos en acción.", points: 5, bonus: false, icon: "zap", scores: {} },
      { id: "primo", title: "Número primo", description: "Comprueba si un número es primo.", points: 10, bonus: false, icon: "search", scores: {} },
      { id: "fibonacci", title: "Fibonacci", description: "Construye la secuencia con Python.", points: 15, bonus: false, icon: "spiral", scores: {} },
      { id: "dibujando", title: "Dibujando con Python", description: "Convierte tus bucles en figuras.", points: 20, bonus: false, icon: "blocks", scores: {} },
      { id: "pokemon", title: "Batalla Pokémon", description: "Agua, fuego y planta: programa la batalla.", points: 50, bonus: false, icon: "crown", scores: {} },
      { id: "figura", title: "Figura adicional", description: "Un dibujo extra para sumar al marcador.", points: 5, bonus: true, icon: "star", scores: {} },
      { id: "repetible", title: "Batalla repetible", description: "Permite volver a jugar sin reiniciar el programa.", points: 10, bonus: true, icon: "flame", scores: {} },
    ] },
    ...Array.from({ length: 6 }, (_, i): Week => ({ number: i + 3, title: "Próximos retos", status: "upcoming", activities: [] })),
  ],
};
