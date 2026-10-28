import type { Dose } from "@/api/types";

/** iOS permite como máximo 64 notificaciones locales pendientes; dejamos margen. */
export const MAX_SCHEDULED = 50;
export const HORIZON_DAYS = 7;

export type PlannedNotification = {
  doseId: string;
  at: Date;
  kind: "dose" | "nudge";
};

/**
 * Calcula qué notificaciones programar: solo dosis programadas de los próximos
 * días, la apertura de la ventana y cada insistencia (`config.reminder_nudges`,
 * en minutos desde la apertura), hasta un máximo de 50 ordenadas por hora.
 */
export function planReminders(
  doses: Dose[],
  nudges: number[],
  now: Date = new Date(),
  horizonDays = HORIZON_DAYS,
  max = MAX_SCHEDULED,
): PlannedNotification[] {
  const horizon = now.getTime() + horizonDays * 24 * 60 * 60 * 1000;
  const offsets = [...new Set(nudges)].filter((n) => n > 0);
  const out: PlannedNotification[] = [];
  for (const dose of doses) {
    if (dose.status !== "scheduled") continue;
    const opens = new Date(dose.window_start).getTime();
    const closes = new Date(dose.window_end).getTime();
    if (opens <= horizon && opens > now.getTime()) {
      out.push({ doseId: dose.id, at: new Date(opens), kind: "dose" });
    }
    for (const offset of offsets) {
      const at = opens + offset * 60_000;
      if (at > now.getTime() && at <= horizon && at < closes) {
        out.push({ doseId: dose.id, at: new Date(at), kind: "nudge" });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max);
}
