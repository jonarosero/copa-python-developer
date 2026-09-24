"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Code2, Trophy, ArrowUpRight, Plus, Pencil, Check, Zap, Search, Orbit, Blocks, Crown, Star, Flame, Coins, Route, Calculator, Users, Flag, LockKeyhole, Trash2, LoaderCircle, ChevronRight, Target, RefreshCw, Settings2, LogIn, BookOpen, Eye } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import MarkdownText, { markdownSummary } from "./markdown-text";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { competitionSchema, teamName, ranking, leaders, cupCount, weekScore, totalScore, type Snapshot, type Competition, type Team, type Activity, type Week } from "@/lib/competition";

const classroom = "https://classroom.google.com/c/Nzk3NjI5Mzk4NTMx";
const icons = { zap: Zap, search: Search, spiral: Orbit, blocks: Blocks, crown: Crown, star: Star, flame: Flame, queen: Crown, coins: Coins, route: Route, calculator: Calculator, code: Code2 };
const statusLabels = { closed: "Finalizada", active: "En juego", upcoming: "Próximamente" };
function TeamMark({ team, small = false }: { team: Team; small?: boolean }) {
  const Icon = team.color === "mint" ? Code2 : team.color === "orange" ? Flame : team.color === "violet" ? Zap : Users;
  return <span className={`team-mark ${team.color} ${small ? "small" : ""}`}><Icon size={small ? 17 : 22} /></span>;
}
function Status({ week }: { week: Week }) { return <span className={`status ${week.status}`}>{week.status === "closed" ? <Check size={12} /> : week.status === "active" ? <span className="live-dot" /> : null}{statusLabels[week.status]}</span>; }

function nextCompetitionDate(now: Date) {
  const next = new Date(now);
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(17, 0, 0, 0);
  return next;
}

export default function Championship({ initial, unavailable = false, initialView = "competition" }: { initial: Snapshot; unavailable?: boolean; initialView?: string }) {
  const [snapshot, setSnapshot] = useState(initial);
  const snapshotRef = useRef(initial);
  const [view, setView] = useState(initialView);
  const [selectedWeek, setSelectedWeek] = useState(initial.data.weeks.find(w => w.status === "active")?.number ?? 8);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [now, setNow] = useState(() => new Date());
  const busyRef = useRef(false);
  const [loadError, setLoadError] = useState(unavailable);
  const [activityDetails, setActivityDetails] = useState<{ week: number; activity: string } | null>(null);
  const [scoreEditor, setScoreEditor] = useState<{ week: number; activity: string; scores: Record<string, string> } | null>(null);
  const [activityEditor, setActivityEditor] = useState<{ week: number; activity: Activity; isNew: boolean } | null>(null);
  const [teamEditor, setTeamEditor] = useState<Team | null>(null);
  const [weekEditor, setWeekEditor] = useState<{ number: number; title: string; closesAt: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ kind: "delete" | "close" | "reopen" | "start"; week: number; activity?: string } | null>(null);
  const { data, canEdit } = snapshot;
  const isEditing = canEdit && view === "admin";
  const currentWeek = data.weeks[selectedWeek - 1];
  const generalRanking = ranking(data);
  const top = leaders(data);
  const completed = data.weeks.filter(w => w.status === "closed").length;
  const allFinished = completed === 8;
  const lastChampionWeek = [...data.weeks].reverse().find(w => w.status === "closed" && leaders(data, w).length === 1);
  const availablePoints = currentWeek.activities.reduce((sum, a) => sum + a.points, 0);
  const currentWinners = leaders(data, currentWeek);
  const assignedCount = currentWeek.activities.filter(a => Object.values(a.scores).some(p => p > 0)).length;

  const weekClosing = currentWeek.closesAt ? new Date(currentWeek.closesAt) : nextCompetitionDate(now);
  const countdown = Math.max(0, weekClosing.getTime() - now.getTime());
  const countdownText = `${Math.floor(countdown / 86400000)}d ${Math.floor((countdown % 86400000) / 3600000)}h ${Math.floor((countdown % 3600000) / 60000)}m`;
  async function save(next: Competition, message: string) {
    if (!snapshotRef.current.canEdit) throw new Error("Solo el organizador puede editar el campeonato.");
    if (busyRef.current) throw new Error("Espera a que termine el guardado actual.");
    const parsed = competitionSchema.safeParse(next);
    if (!parsed.success) { const error = parsed.error.issues[0]?.message || "Revisa los datos."; toast.error(error); throw new Error(error); }
    busyRef.current = true; setBusy(true);
    try {
      const response = await fetch("/api/competition", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: parsed.data, sha: snapshotRef.current.sha, password: adminPassword }) });
      const result = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      snapshotRef.current = result; setSnapshot(result); toast.success(message);
      return result;
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar."); throw error; }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function refresh() {
    try {
      const response = await fetch("/api/competition", { cache: "no-store" });
      const result = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar.");
      const next = { ...result, canEdit: snapshotRef.current.canEdit };
      snapshotRef.current = next; setSnapshot(next); setLoadError(false); toast.success("Marcador actualizado");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo leer el marcador remoto."); }
  }
  function clone() { return structuredClone(snapshotRef.current.data); }
  function editScores(week: Week, activity: Activity) {
    setScoreEditor({ week: week.number, activity: activity.id, scores: Object.fromEntries(data.teams.map(t => [t.id, String(activity.scores[t.id] || 0)])) });
  }
  function newActivity() {
    setActivityEditor({ week: selectedWeek, isNew: true, activity: { id: crypto.randomUUID(), title: "", description: "", points: 5, bonus: false, icon: "code", scores: {} } });
  }
  async function submitScores(event: React.FormEvent) {
    event.preventDefault(); if (!scoreEditor) return;
    const next = clone(); const activity = next.weeks[scoreEditor.week - 1].activities.find(a => a.id === scoreEditor.activity)!;
    activity.scores = Object.fromEntries(Object.entries(scoreEditor.scores).map(([id, value]) => [id, Number(value)]));
    try { await save(next, "Puntos guardados. El marcador está al día."); setScoreEditor(null); } catch {}
  }
  async function submitActivity(event: React.FormEvent) {
    event.preventDefault(); if (!activityEditor) return;
    const next = clone(); const week = next.weeks[activityEditor.week - 1];
    if (activityEditor.isNew) week.activities.push(activityEditor.activity);
    else week.activities = week.activities.map(a => a.id === activityEditor.activity.id ? activityEditor.activity : a);
    try { await save(next, activityEditor.isNew ? "Actividad añadida" : "Actividad actualizada"); setActivityEditor(null); } catch {}
  }
  async function submitTeam(event: React.FormEvent) {
    event.preventDefault(); if (!teamEditor) return;
    const next = clone(); next.teams = next.teams.map(t => t.id === teamEditor.id ? { ...teamEditor, members: teamEditor.members.map(name => name.trim()).filter(Boolean) } : t);
    try { await save(next, "Nombre del equipo actualizado"); setTeamEditor(null); } catch {}
  }
  async function submitWeek(event: React.FormEvent) {
    event.preventDefault(); if (!weekEditor) return;
    const next = clone(); const week = next.weeks[weekEditor.number - 1]; week.title = weekEditor.title; week.closesAt = weekEditor.closesAt ? new Date(weekEditor.closesAt).toISOString() : undefined;
    try { await save(next, "Semana actualizada"); setWeekEditor(null); } catch {}
  }
  async function confirmAction() {
    if (!confirmation) return;
    const next = clone(); const week = next.weeks[confirmation.week - 1];
    if (confirmation.kind === "delete") week.activities = week.activities.filter(a => a.id !== confirmation.activity);
    if (confirmation.kind === "close") {
      const winners = leaders(next, week);
      if (winners.length !== 1) { toast.error(winners.length ? "Hay un empate. Añade un reto de desempate antes de entregar la copa." : "Registra puntos antes de cerrar la semana."); return; }
      week.status = "closed";
      const upcoming = next.weeks.find(w => w.status === "upcoming");
      if (!next.weeks.some(w => w.status === "active") && upcoming) upcoming.status = "active";
    }
    if (confirmation.kind === "reopen" || confirmation.kind === "start") {
      next.weeks.forEach(w => { if (w.status === "active") w.status = "upcoming"; }); week.status = "active";
    }
    try { await save(next, confirmation.kind === "delete" ? "Actividad eliminada y puntos recalculados" : confirmation.kind === "close" ? "¡Copa semanal entregada!" : "Semana en juego"); setConfirmation(null); } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/competition", { cache: "no-store" }).then(async response => {
      const result = await response.json() as Snapshot;
      if (!response.ok || cancelled) return;
      snapshotRef.current = result;
      setSnapshot(result);
      setLoadError(false);
    }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    type ModelContext = { registerTool: (tool: object, options: { signal: AbortSignal }) => void | Promise<void> };
    const context = (document as unknown as { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const paint = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const register = (tool: object) => { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(console.error); } catch (error) { console.error(error); } };
    register({ name: "get_championship_standings", title: "Consultar clasificación", description: "Devuelve equipos, puntos acumulados y copas del campeonato de Python.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => ({ standings: ranking(snapshotRef.current.data).map(r => ({ teamId: r.team.id, name: teamName(r.team), points: r.points, rank: r.rank, cups: cupCount(snapshotRef.current.data, r.team.id) })) }) });
    register({ name: "show_competition_week", title: "Ver una semana", description: "Selecciona una semana y muestra sus actividades en pantalla. No modifica datos guardados.", inputSchema: { type: "object", properties: { week: { type: "integer", minimum: 1, maximum: 8 } }, required: ["week"], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input: unknown) => { const n = (input as { week?: number })?.week; if (!Number.isInteger(n) || n! < 1 || n! > 8) throw new Error("La semana debe estar entre 1 y 8."); setView("competition"); setSelectedWeek(n!); await paint(); return snapshotRef.current.data.weeks[n! - 1]; } });
    register({ name: "set_activity_scores", title: "Guardar puntos de una actividad", description: "Asigna valores absolutos a uno o varios equipos en una actividad y actualiza la clasificación. Requiere ser el organizador; volver a enviar los mismos valores no duplica puntos.", inputSchema: { type: "object", properties: { week: { type: "integer", minimum: 1, maximum: 8 }, activityId: { type: "string" }, scores: { type: "object", additionalProperties: { type: "integer", minimum: 0, maximum: 1000 } } }, required: ["week", "activityId", "scores"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async (input: unknown) => {
      const value = input as { week: number; activityId: string; scores: Record<string, number> };
      if (!value || !Number.isInteger(value.week) || value.week < 1 || value.week > 8 || !value.scores || typeof value.scores !== "object" || Array.isArray(value.scores)) throw new Error("Datos de puntuación no válidos.");
      const next = structuredClone(snapshotRef.current.data); const activity = next.weeks[value.week - 1].activities.find(a => a.id === value.activityId);
      if (!activity) throw new Error("La actividad no existe."); activity.scores = { ...activity.scores, ...value.scores };
      await save(next, "Puntos guardados"); setView("competition"); setSelectedWeek(value.week); await paint(); return { week: value.week, activityId: activity.id, scores: activity.scores };
    } });
    return () => lifecycle.abort();
  }, []);

  const viewedActivity = activityDetails ? data.weeks[activityDetails.week - 1].activities.find(a => a.id === activityDetails.activity) : null;
  const editorActivity = scoreEditor ? data.weeks[scoreEditor.week - 1].activities.find(a => a.id === scoreEditor.activity) : null;
  return <Tabs value={view} onValueChange={setView} className="site-shell">
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label="Copa Python Developer, inicio"><span className="brand-icon"><img src="/python-cup.png" alt="" width={56} height={56} /></span><span>PYTHON<span className="brand-sub">DEVELOPER CUP</span></span></Link>
      <TabsList className="main-nav" aria-label="Secciones del campeonato"><TabsTrigger value="competition">Competencia</TabsTrigger><TabsTrigger value="standings">Clasificación</TabsTrigger><TabsTrigger value="teams">Equipos</TabsTrigger><TabsTrigger value="admin" className="admin-nav"><Settings2 size={16} />Administrar campeonato</TabsTrigger></TabsList>
      <a className="classroom-link" href={classroom} target="_blank" rel="noreferrer">Ir a Classroom <ArrowUpRight size={17} /></a>
    </div></header>
    <main className="main-content">
      {loadError && <div className="error-banner" role="alert">No se pudo cargar el marcador guardado. Se muestran los datos iniciales.<button onClick={refresh}><RefreshCw size={16} /> Reintentar</button></div>}
      <div className="page-heading"><div><div className="eyebrow"><span className="tiny-line" /> CURSO PYTHON DEVELOPER</div><h1>El campeonato<span className="heading-dot">.</span></h1><p>8 semanas. 4 equipos. Una gran copa.</p></div><div className="season-summary"><span className="season-icon"><Trophy size={21} /></span><span><strong>{completed} de 8</strong><small>semanas finalizadas</small></span></div></div>
      <section className="championship-countdown"><div><span>CIERRE DE LA SEMANA {String(selectedWeek).padStart(2, "0")}</span><strong>{countdownText}</strong></div><small>{currentWeek.closesAt ? weekClosing.toLocaleString("es-EC", { dateStyle: "full", timeStyle: "short" }) : "Configura la fecha de cierre desde Administrar campeonato."}</small></section>
      <TabsContent value="competition" className="section-content">
        <Tabs value={String(selectedWeek)} onValueChange={v => setSelectedWeek(Number(v))}>
          <TabsList className="week-nav" aria-label="Semanas del campeonato">{data.weeks.map(week => <TabsTrigger key={week.number} value={String(week.number)} className="week-tab"><span className="week-tab-top">SEMANA {String(week.number).padStart(2, "0")}{week.status === "closed" ? <Trophy size={15} /> : week.number === 8 ? <Flag size={15} /> : null}</span><span className={`week-status ${week.status}`}>{week.status === "active" && <span className="live-dot" />}{statusLabels[week.status]}</span></TabsTrigger>)}</TabsList>
          <TabsContent value={String(selectedWeek)} className="competition-grid">
            <section className="challenges-panel">
              <div className="week-heading"><div><div className="title-row"><h2>Semana {String(selectedWeek).padStart(2, "0")}</h2><Status week={currentWeek} /></div><div className="subtitle-row"><span>{currentWeek.title}</span>{isEditing && <button className="icon-button" aria-label="Editar título de la semana" onClick={() => setWeekEditor({ number: selectedWeek, title: currentWeek.title, closesAt: currentWeek.closesAt ? new Date(currentWeek.closesAt).toISOString().slice(0, 16) : "" })}><Pencil size={14} /></button>}</div></div>
                {isEditing && <button className="button primary small-button" onClick={newActivity}><Plus size={16} /> Añadir reto</button>}
              </div>
              <div className="week-metrics"><span><Target size={16} /><strong>{currentWeek.activities.filter(a => !a.bonus).length}</strong> retos <span className="metric-separator">/</span> {currentWeek.activities.filter(a => a.bonus).length} bonus</span><span><Zap size={15} /><strong>{availablePoints}</strong> puntos posibles</span></div>
              {currentWeek.status === "closed" && currentWinners.length === 1 && <div className="weekly-result"><Trophy size={21} /><span>Copa de la semana: <strong>{teamName(currentWinners[0].team)}</strong></span><b>{currentWinners[0].points} pts</b></div>}
              {currentWinners.length > 1 && <div className="tie-note">Empate en el primer lugar. Un reto de desempate puede definir la copa.</div>}
              {currentWeek.activities.length === 0 ? <div className="empty-week"><span className="empty-icon"><Code2 size={31} /></span><h3>El próximo reto comienza aquí</h3><p>La semana {selectedWeek} está lista para sus actividades.</p>{isEditing && <button className="button primary" onClick={newActivity}><Plus size={17} /> Crear primera actividad</button>}</div> : <div className="activities-list">{currentWeek.activities.map((activity, index) => {
                const Icon = icons[activity.icon]; const recipients = data.teams.filter(t => (activity.scores[t.id] || 0) > 0);
                return <article key={activity.id} className={`activity-card ${activity.bonus ? "bonus-card" : ""} ${activity.icon === "crown" ? "big-challenge" : ""}`} onClick={() => setActivityDetails({ week: selectedWeek, activity: activity.id })} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") setActivityDetails({ week: selectedWeek, activity: activity.id }); }} role="button" tabIndex={0}>
                  <div className={`activity-icon ${activity.icon}`}><Icon size={22} strokeWidth={1.7} /></div>
                  <div className="activity-main"><div className="activity-kicker">{activity.bonus ? "BONUS" : `RETO ${String(currentWeek.activities.slice(0, index + 1).filter(a => !a.bonus).length).padStart(2, "0")}`}{activity.icon === "crown" && <span>EL GRAN RETO</span>}</div><h3><button className="activity-title-button" onClick={() => setActivityDetails({ week: selectedWeek, activity: activity.id })}>{activity.title}</button></h3><p>{markdownSummary(activity.description)}</p><div className="score-chips">{recipients.length ? recipients.map(team => <span key={team.id} className={`score-chip ${team.color}`}>{teamName(team)} <b>+{activity.scores[team.id]}</b></span>) : <span className="pending-score">Sin puntos asignados</span>}</div></div>
                   <div className="activity-actions" onClick={event => event.stopPropagation()}><span className="point-badge">{activity.bonus ? "+" : ""}{activity.points}<small>pts</small></span>{isEditing && <div className="activity-buttons"><button className="assign-button" onClick={() => editScores(currentWeek, activity)} aria-label={`Asignar puntos: ${activity.title}`}><Plus size={14} /><span>Puntos</span></button><button className="icon-button" aria-label={`Editar ${activity.title}`} onClick={() => setActivityEditor({ week: selectedWeek, activity: structuredClone(activity), isNew: false })}><Pencil size={15} /></button></div>}</div>
                </article>;
              })}</div>}
              <div className="week-footer"><span>{assignedCount} de {currentWeek.activities.length} actividades con puntos</span>{isEditing && <button className="button secondary small-button" onClick={() => setConfirmation({ kind: currentWeek.status === "closed" ? "reopen" : currentWeek.status === "upcoming" ? "start" : "close", week: selectedWeek })}>{currentWeek.status === "closed" ? <RefreshCw size={15} /> : currentWeek.status === "active" ? <Trophy size={15} /> : <Flag size={15} />}{currentWeek.status === "closed" ? "Reabrir semana" : currentWeek.status === "upcoming" ? "Poner en juego" : "Cerrar semana"}</button>}</div>
              <section className="weekly-ranking"><div className="panel-heading"><h3>Marcador de la semana</h3><span>SEMANA {String(selectedWeek).padStart(2, "0")}</span></div><div className="weekly-team-grid">{ranking(data, currentWeek).map(({ team, points }) => <div key={team.id}><TeamMark team={team} small /><span>{teamName(team)}</span><strong>{points}<small> pts</small></strong></div>)}</div></section>
            </section>
            <aside className="competition-aside">
              <div className="leader-card"><div className="leader-label"><Trophy size={17} />{allFinished && top.length === 1 ? "CAMPEÓN DEL CAMPEONATO" : top.length > 1 ? "LIDERATO COMPARTIDO" : "LÍDER DEL CAMPEONATO"}</div><h2>{top.length ? top.map(t => teamName(t.team)).join(" / ") : "La copa te espera"}</h2><div className="leader-number">{top[0]?.points ?? 0}<span>puntos<br />acumulados</span></div><div className="leader-bottom"><span>{allFinished ? "Las 8 semanas han finalizado" : "La carrera sigue en juego"}</span><Code2 size={22} /></div></div>
              <section className="standings-card"><div className="panel-heading"><h3>Clasificación general</h3><button className="icon-button" onClick={refresh} aria-label="Actualizar marcador" disabled={busy}><RefreshCw size={15} /></button></div><p className="panel-subtitle">Todos los puntos de las 8 semanas.</p><ol className="ranking-list">{generalRanking.map(({ team, points, rank }) => <li key={team.id}><span className={`rank-number ${rank === 1 && points > 0 ? "first" : ""}`}>{String(rank).padStart(2, "0")}</span><TeamMark team={team} small /><span className="rank-team">{teamName(team)}<small>{cupCount(data, team.id)} {cupCount(data, team.id) === 1 ? "copa" : "copas"}</small></span><strong>{points}<small>pts</small></strong></li>)}</ol><button className="detail-link" onClick={() => setView("standings")}>Ver detalle por semana <ChevronRight size={15} /></button></section>
              {lastChampionWeek && <div className="last-cup"><div className="cup-line"><span className="cup-icon"><Trophy size={26} strokeWidth={1.5} /></span><div><div className="eyebrow">ÚLTIMA COPA ENTREGADA</div><h3>{teamName(leaders(data, lastChampionWeek)[0].team)}</h3><p>Semana {lastChampionWeek.number} · {leaders(data, lastChampionWeek)[0].points} puntos</p></div></div><button onClick={() => setSelectedWeek(lastChampionWeek.number)}>Ver los retos ganados <ArrowUpRight size={14} /></button></div>}
              <div className="rules-note"><Flag size={19} /><div><h3>Así se gana el campeonato</h3><p>La copa semanal es para el equipo con más puntos de esa semana. La gran copa se gana con el total acumulado al finalizar las ocho.</p><span>Las copas no añaden puntos extra.</span></div></div>
            </aside>
          </TabsContent>
        </Tabs>
      </TabsContent>
      <TabsContent value="standings" className="section-content">
        <section className={`final-banner ${allFinished ? "finished" : ""}`}><div className="final-icon"><Trophy size={38} /></div><div><div className="eyebrow">LA GRAN COPA</div><h2>{allFinished ? top.length === 1 ? `¡${teamName(top[0].team)}, campeones!` : "Empate en el campeonato" : "Ocho semanas para llegar a la cima"}</h2><p>{allFinished ? top.length === 1 ? `${top[0].points} puntos acumulados. El campeonato tiene ganador.` : "Añade un desempate en la última semana para definir al campeón." : "El equipo con más puntos acumulados se coronará al finalizar la semana 8."}</p></div><span className="final-progress">{completed}<small>/ 8</small></span></section>
        <section className="full-ranking"><div className="section-heading"><h2>Clasificación general</h2><span>Puntaje acumulado</span></div><Table><TableHeader><TableRow><TableHead className="rank-cell">#</TableHead><TableHead>Equipo</TableHead>{data.weeks.map(w => <TableHead key={w.number}>S{w.number}</TableHead>)}<TableHead>Copas</TableHead><TableHead className="total-cell">Total</TableHead></TableRow></TableHeader><TableBody>{generalRanking.map(({ team, rank, points }) => <TableRow key={team.id}><TableCell className={`rank-cell ${rank === 1 ? "highlight" : ""}`}>{String(rank).padStart(2, "0")}</TableCell><TableCell><span className="table-team"><TeamMark team={team} small />{teamName(team)}</span></TableCell>{data.weeks.map(week => <TableCell key={week.number}>{weekScore(week, team.id)}</TableCell>)}<TableCell><span className="cup-count"><Trophy size={15} />{cupCount(data, team.id)}</span></TableCell><TableCell className="total-cell">{points}</TableCell></TableRow>)}</TableBody></Table></section>
        <div className="section-heading cup-gallery-heading"><h2>Las copas de la temporada</h2><span>{completed} {completed === 1 ? "semana finalizada" : "semanas finalizadas"}</span></div><div className="cups-grid">{data.weeks.map(week => { const winners = leaders(data, week); const awarded = week.status === "closed" && winners.length === 1; return <button className={`cup-card ${awarded ? "awarded" : ""}`} key={week.number} onClick={() => { setSelectedWeek(week.number); setView("competition"); }}><span className="eyebrow">SEMANA {String(week.number).padStart(2, "0")}</span>{awarded ? <Trophy size={35} strokeWidth={1.4} /> : <LockKeyhole size={30} strokeWidth={1.3} />}<h3>{awarded ? teamName(winners[0].team) : week.status === "active" ? "Copa en juego" : week.status === "closed" ? "Por desempatar" : "Por disputar"}</h3><p>{awarded ? `${winners[0].points} puntos` : statusLabels[week.status]}</p></button>; })}</div>
      </TabsContent>
      <TabsContent value="teams" className="section-content"><div className="section-heading"><h2>Los equipos</h2><span>4 equipos en competencia</span></div><div className="teams-grid">{data.teams.map(team => <article className="team-card" key={team.id}><div className="team-card-top"><TeamMark team={team} /></div><h2>{teamName(team)}</h2><p className="team-full-name">{team.shortName ? team.name : "Equipo del curso Python Developer"}</p>{team.description && <p className="team-description">{team.description}</p>}<div className="team-members"><h3><Users size={16} />Integrantes <span>{team.members.length}</span></h3>{team.members.length ? <ul>{team.members.map((member, index) => <li key={index}>{member}</li>)}</ul> : <p>Integrantes por registrar</p>}</div><div className="team-stats"><div><strong>{totalScore(data, team.id)}</strong><span>puntos totales</span></div><div><strong>{cupCount(data, team.id)}</strong><span>copas semanales</span></div></div></article>)}</div></TabsContent>
      <TabsContent value="admin" className="section-content admin-panel">
        <div className="admin-heading"><div><div className="eyebrow">ORGANIZACIÓN DEL CURSO</div><h2>Panel de edición</h2><p>Gestiona los equipos, las actividades y el marcador de cada semana.</p></div><span className="admin-access-state"><Settings2 size={17} />{canEdit ? "Edición habilitada" : "Acceso del organizador"}</span></div>
        {!canEdit && !loadError ? <section className="admin-login"><span className="admin-login-icon"><LockKeyhole size={28} /></span><div><h3>Acceso del organizador</h3><p>Introduce la contraseña para editar equipos, actividades, enunciados y puntajes. Los visitantes solo pueden consultar el campeonato.</p><form className="admin-login-actions" onSubmit={event => { event.preventDefault(); if (password === "1729") { const next = { ...snapshotRef.current, canEdit: true }; snapshotRef.current = next; setSnapshot(next); setAdminPassword(password); setPassword(""); toast.success("Edición habilitada"); } else toast.error("Contraseña incorrecta."); }}><Input aria-label="Contraseña de administrador" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Contraseña" required /><button className="button primary"><LogIn size={17} />Entrar a administrar</button></form></div></section> : null}
        {canEdit && <>
          <section className="admin-section"><div className="section-heading"><h3>1. Equipos</h3><span>Nombres, integrantes y descripción de cada equipo.</span></div><div className="admin-team-grid">{data.teams.map(team => <div className="admin-team" key={team.id}><TeamMark team={team} small /><div className="admin-team-info"><strong>{teamName(team)}</strong><span>{team.members.length ? team.members.join(" · ") : "Sin integrantes registrados"}</span></div><button className="button secondary" aria-label={`Editar equipo: ${teamName(team)}`} onClick={() => setTeamEditor({ ...team })}><Pencil size={15} />Editar</button></div>)}</div></section>
          <section className="admin-section"><div className="section-heading"><h3>2. Actividades y puntajes</h3></div><div className="admin-week-toolbar"><div className="admin-week-choice"><label htmlFor="admin-week">Semana que quieres editar</label><Select value={String(selectedWeek)} onValueChange={value => setSelectedWeek(Number(value))}><SelectTrigger id="admin-week" className="admin-week-select"><SelectValue /></SelectTrigger><SelectContent>{data.weeks.map(week => <SelectItem key={week.number} value={String(week.number)}>Semana {week.number} · {statusLabels[week.status]}</SelectItem>)}</SelectContent></Select></div><button className="button primary" onClick={newActivity}><Plus size={17} />Añadir actividad</button></div>
            <div className="admin-week-title"><h4>{currentWeek.title}</h4><button className="button secondary" onClick={() => setWeekEditor({ number: selectedWeek, title: currentWeek.title, closesAt: currentWeek.closesAt ? new Date(currentWeek.closesAt).toISOString().slice(0, 16) : "" })}><Pencil size={14} />Editar semana</button></div>
            {currentWeek.activities.length ? <Table className="admin-score-table"><TableHeader><TableRow><TableHead>Actividad</TableHead><TableHead>Máximo</TableHead>{data.teams.map(team => <TableHead key={team.id}>{teamName(team)}</TableHead>)}<TableHead>Edición</TableHead></TableRow></TableHeader><TableBody>{currentWeek.activities.map(activity => <TableRow key={activity.id}><TableCell><button className="admin-activity-title" onClick={() => setActivityDetails({ week: selectedWeek, activity: activity.id })}>{activity.title}<BookOpen size={14} /></button>{activity.bonus && <small className="admin-bonus-label">Bonus</small>}</TableCell><TableCell>{activity.points} pts</TableCell>{data.teams.map(team => <TableCell key={team.id}>{activity.scores[team.id] || 0}</TableCell>)}<TableCell><div className="admin-row-actions"><button className="button primary" onClick={() => editScores(currentWeek, activity)} aria-label={`Editar puntajes: ${activity.title}`}><Plus size={14} />Puntos</button><button className="button secondary" onClick={() => setActivityEditor({ week: selectedWeek, activity: structuredClone(activity), isNew: false })} aria-label={`Editar actividad: ${activity.title}`}><Pencil size={14} />Actividad</button></div></TableCell></TableRow>)}</TableBody></Table> : <div className="admin-empty"><Code2 size={28} /><p>Esta semana todavía no tiene actividades. Añade la primera para comenzar.</p></div>}
            <section className="admin-week-summary"><div><span>PUNTAJE ACUMULADO · SEMANA {selectedWeek}</span><h4>{currentWinners.length === 1 ? `Ganador actual: ${teamName(currentWinners[0].team)}` : currentWinners.length > 1 ? "Empate en el liderato" : "Aún no hay puntos asignados"}</h4></div><div className="admin-week-totals">{ranking(data, currentWeek).map(({ team, points }) => <span key={team.id} className={`score-chip ${team.color}`}><b>{teamName(team)}</b> {points} pts</span>)}</div></section>
            <div className="admin-save-note"><Check size={16} /><span>Usa «Guardar» en cada formulario. Los puntajes actualizan automáticamente la clasificación.</span></div>
          </section>
          <section className="admin-section admin-close-week"><div><h3>3. Copa de la semana {selectedWeek}</h3><p>{currentWeek.status === "closed" ? "La copa ya fue entregada. Puedes reabrir la semana para continuar la competencia." : "Cierra la semana cuando terminen los retos para entregar la copa al equipo con más puntos."}</p></div><button className="button secondary" onClick={() => setConfirmation({ kind: currentWeek.status === "closed" ? "reopen" : currentWeek.status === "upcoming" ? "start" : "close", week: selectedWeek })}><Trophy size={17} />{currentWeek.status === "closed" ? "Reabrir semana" : currentWeek.status === "upcoming" ? "Poner en juego" : "Cerrar semana y entregar copa"}</button></section>
        </>}
        {!canEdit && <div className="admin-capabilities"><span><Users size={19} />Equipos e integrantes</span><span><Code2 size={19} />Crear y editar actividades</span><span><Target size={19} />Asignar o corregir puntos</span><span><Trophy size={19} />Entregar las copas semanales</span></div>}
      </TabsContent>
      <footer className="site-footer"><span><img src="/python-cup.png" alt="" width={24} height={24} /> Python Developer Cup</span><span>{busy ? <><LoaderCircle className="spin" size={14} /> Guardando…</> : <><Check size={14} /> By Jonathan Rosero</>}</span></footer>
    </main>

    <Sheet open={!!activityDetails} onOpenChange={open => { if (!open) setActivityDetails(null); }}><SheetContent className="challenge-sheet"><SheetHeader><div className="eyebrow">SEMANA {activityDetails?.week} · {viewedActivity?.bonus ? "BONUS" : "RETO"}</div><SheetTitle>{viewedActivity?.title}</SheetTitle><SheetDescription><span className="sheet-points">{viewedActivity?.points} puntos</span>{viewedActivity?.bonus ? "Actividad bonus" : "Enunciado completo de la actividad"}</SheetDescription></SheetHeader><div className="challenge-sheet-body"><MarkdownText>{viewedActivity?.description || ""}</MarkdownText>{viewedActivity && <section className="challenge-result"><h3>Resultados del reto</h3><p>{viewedActivity.bonus ? "Bonus disponible para este ejercicio." : "Reto principal de la semana."}</p>{data.teams.filter(team => (viewedActivity.scores[team.id] || 0) > 0).length ? <div className="score-chips">{data.teams.filter(team => (viewedActivity.scores[team.id] || 0) > 0).map(team => <span key={team.id} className={`score-chip ${team.color}`}>{teamName(team)} <b>+{viewedActivity.scores[team.id]}</b></span>)}</div> : <p className="pending-score">Aún no se han asignado puntos.</p>}</section>}</div>{isEditing && viewedActivity && activityDetails && <div className="challenge-sheet-actions"><button className="button secondary" onClick={() => { setActivityEditor({ week: activityDetails.week, activity: structuredClone(viewedActivity), isNew: false }); setActivityDetails(null); }}><Pencil size={16} />Editar enunciado</button><button className="button primary" onClick={() => { editScores(data.weeks[activityDetails.week - 1], viewedActivity); setActivityDetails(null); }}><Plus size={16} />Asignar puntos</button></div>}</SheetContent></Sheet>

    <Dialog open={!!scoreEditor} onOpenChange={open => { if (!open && !busy) setScoreEditor(null); }}><DialogContent className="edit-dialog"><DialogHeader><DialogTitle>Asignar puntos</DialogTitle><DialogDescription>{editorActivity?.title} · Semana {scoreEditor?.week}. Máximo {editorActivity?.points} puntos por equipo.</DialogDescription></DialogHeader><form onSubmit={submitScores}><div className="score-form">{data.teams.map(team => <div className="score-form-row" key={team.id}><label htmlFor={`score-${team.id}`}><TeamMark team={team} small /><span>{teamName(team)}</span></label><div><Input id={`score-${team.id}`} type="number" min="0" max={editorActivity?.points ?? 0} step="1" required value={scoreEditor?.scores[team.id] ?? "0"} onChange={event => setScoreEditor(previous => previous ? { ...previous, scores: { ...previous.scores, [team.id]: event.target.value } } : null)} /><span>pts</span></div></div>)}</div><p className="form-hint">Puedes puntuar a varios equipos. Usa 0 para retirar los puntos. Los valores reemplazan el puntaje anterior.</p><DialogFooter><button type="button" className="button secondary" onClick={() => setScoreEditor(null)} disabled={busy}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Guardar puntos</button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={!!activityEditor} onOpenChange={open => { if (!open && !busy) setActivityEditor(null); }}><DialogContent className="edit-dialog activity-editor-dialog"><DialogHeader><DialogTitle>{activityEditor?.isNew ? "Añadir actividad" : "Editar actividad"}</DialogTitle><DialogDescription>Semana {activityEditor?.week} · Define el reto y sus puntos.</DialogDescription></DialogHeader>{activityEditor && <form onSubmit={submitActivity} className="edit-form"><label htmlFor="activity-title">Nombre de la actividad<Input id="activity-title" required maxLength={100} value={activityEditor.activity.title} onChange={e => setActivityEditor({ ...activityEditor, activity: { ...activityEditor.activity, title: e.target.value } })} placeholder="Por ejemplo: Reto de listas" /></label><div className="markdown-editor-field"><label htmlFor="activity-description">Enunciado completo del reto (Markdown)</label><Tabs defaultValue="write" className="markdown-editor"><TabsList aria-label="Modo del editor de enunciado"><TabsTrigger value="write"><Pencil size={14} />Escribir</TabsTrigger><TabsTrigger value="preview"><Eye size={14} />Vista previa</TabsTrigger></TabsList><TabsContent value="write"><Textarea id="activity-description" maxLength={20000} value={activityEditor.activity.description} onChange={e => setActivityEditor({ ...activityEditor, activity: { ...activityEditor.activity, description: e.target.value } })} className="markdown-source" placeholder={"## Objetivo\nDescribe qué debe resolver el equipo.\n\n## Requisitos\n- Primer requisito\n- Segundo requisito\n\n## Ejemplo\n```python\nprint(\"Hola, Python\")\n```"} /><p className="markdown-syntax-hint">## Títulos · **Negrita** · - Listas · `código` · Tablas</p></TabsContent><TabsContent value="preview" className="markdown-preview"><MarkdownText>{activityEditor.activity.description}</MarkdownText></TabsContent></Tabs></div><div className="form-two-col"><label htmlFor="activity-points">Puntos máximos<Input id="activity-points" type="number" min={1} max={1000} required value={activityEditor.activity.points || ""} onChange={e => setActivityEditor({ ...activityEditor, activity: { ...activityEditor.activity, points: Number(e.target.value) } })} /></label><div className="switch-field"><label htmlFor="activity-bonus">Actividad bonus</label><Switch id="activity-bonus" checked={activityEditor.activity.bonus} onCheckedChange={bonus => setActivityEditor({ ...activityEditor, activity: { ...activityEditor.activity, bonus } })} /></div></div><DialogFooter>{!activityEditor.isNew && <button className="delete-button" type="button" onClick={() => { setConfirmation({ kind: "delete", week: activityEditor.week, activity: activityEditor.activity.id }); setActivityEditor(null); }} disabled={busy}><Trash2 size={16} />Eliminar</button>}<button type="button" className="button secondary" onClick={() => setActivityEditor(null)} disabled={busy}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Guardando…" : "Guardar actividad"}</button></DialogFooter></form>}</DialogContent></Dialog>

    <Dialog open={!!teamEditor} onOpenChange={open => { if (!open && !busy) setTeamEditor(null); }}><DialogContent className="edit-dialog"><DialogHeader><DialogTitle>Editar equipo</DialogTitle><DialogDescription>Añade los integrantes y una descripción. Los puntos y las copas se conservan.</DialogDescription></DialogHeader>{teamEditor && <form className="edit-form" onSubmit={submitTeam}><label htmlFor="team-name">Nombre completo<Input id="team-name" required maxLength={150} value={teamEditor.name} onChange={e => setTeamEditor({ ...teamEditor, name: e.target.value })} /></label><label htmlFor="team-short">Nombre corto (opcional)<Input id="team-short" maxLength={40} value={teamEditor.shortName} onChange={e => setTeamEditor({ ...teamEditor, shortName: e.target.value })} /></label><label htmlFor="team-members">Integrantes (un nombre por línea)<Textarea id="team-members" maxLength={3030} value={teamEditor.members.join("\n")} onChange={e => setTeamEditor({ ...teamEditor, members: e.target.value.split(/\r?\n/) })} placeholder={"Nombre del primer integrante\nNombre del segundo integrante\nNombre del tercer integrante"} className="members-input" /></label><label htmlFor="team-description">Descripción del equipo<Textarea id="team-description" maxLength={2000} value={teamEditor.description} onChange={e => setTeamEditor({ ...teamEditor, description: e.target.value })} placeholder="Presentación, lema o características del equipo" /></label><p className="form-hint">El nombre corto, si lo completas, aparecerá en el marcador.</p><DialogFooter><button className="button secondary" type="button" onClick={() => setTeamEditor(null)} disabled={busy}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Guardando…" : "Guardar equipo"}</button></DialogFooter></form>}</DialogContent></Dialog>

    <Dialog open={!!weekEditor} onOpenChange={open => { if (!open && !busy) setWeekEditor(null); }}><DialogContent className="edit-dialog"><DialogHeader><DialogTitle>Editar semana {weekEditor?.number}</DialogTitle><DialogDescription>Define el título y la hora límite que alimenta el cronómetro del campeonato.</DialogDescription></DialogHeader>{weekEditor && <form className="edit-form" onSubmit={submitWeek}><label htmlFor="week-title">Título<Input id="week-title" required maxLength={100} value={weekEditor.title} onChange={e => setWeekEditor({ ...weekEditor, title: e.target.value })} /></label><label htmlFor="week-closes-at">Cierre de la semana<Input id="week-closes-at" type="datetime-local" value={weekEditor.closesAt} onChange={e => setWeekEditor({ ...weekEditor, closesAt: e.target.value })} /></label><p className="form-hint">Déjalo vacío para usar el próximo lunes a las 17:00 como referencia temporal.</p><DialogFooter><button className="button secondary" type="button" onClick={() => setWeekEditor(null)} disabled={busy}>Cancelar</button><button className="button primary" disabled={busy}>Guardar semana</button></DialogFooter></form>}</DialogContent></Dialog>

    <AlertDialog open={!!confirmation} onOpenChange={open => { if (!open && !busy) setConfirmation(null); }}><AlertDialogContent className="edit-dialog"><AlertDialogHeader><AlertDialogTitle>{confirmation?.kind === "delete" ? "¿Eliminar esta actividad?" : confirmation?.kind === "close" ? `¿Entregar la copa de la semana ${confirmation.week}?` : `¿Poner en juego la semana ${confirmation?.week}?`}</AlertDialogTitle><AlertDialogDescription>{confirmation?.kind === "delete" ? "Se eliminarán la actividad y sus puntos. La clasificación y las copas se recalcularán." : confirmation?.kind === "close" ? "Se reconocerá al equipo con más puntos de esta semana y se abrirá la siguiente pendiente. Si hay un empate, añade un desempate antes de cerrar." : "Los puntos se conservarán. La semana que esté en juego pasará a pendiente, y podrás continuarla después."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction className="button primary" disabled={busy} onClick={event => { event.preventDefault(); void confirmAction(); }}>{busy ? "Guardando…" : confirmation?.kind === "delete" ? "Eliminar actividad" : confirmation?.kind === "close" ? "Entregar copa" : "Poner en juego"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Toaster theme="dark" position="bottom-right" richColors />
  </Tabs>;
}
