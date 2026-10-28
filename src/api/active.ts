import { useMemo } from "react";
import { useTreatment, useTreatments } from "./hooks";
import type { Dose, Treatment } from "./types";

/** Dosis que importa ahora: la ventana abierta o, si no hay, la próxima pendiente. */
export function pickNextDose(doses: Dose[], now = Date.now()): { dose: Dose; windowOpen: boolean } | null {
  const pending = doses
    .filter((d) => d.status === "pending" && new Date(d.window_closes_at).getTime() >= now)
    .sort((a, b) => new Date(a.window_opens_at).getTime() - new Date(b.window_opens_at).getTime());
  const dose = pending[0];
  if (!dose) return null;
  const windowOpen =
    new Date(dose.window_opens_at).getTime() <= now && new Date(dose.window_closes_at).getTime() >= now;
  return { dose, windowOpen };
}

export function isEndingSoon(t: Pick<Treatment, "ending_soon" | "ends_at"> | undefined, days: number, now = Date.now()) {
  if (!t) return false;
  if (t.ending_soon) return true;
  if (!t.ends_at) return false;
  const left = new Date(t.ends_at).getTime() - now;
  return left > 0 && left <= days * 24 * 60 * 60 * 1000;
}

/** Tratamiento activo (resumen + detalle con dosis e insistencias). */
export function useActiveTreatment() {
  const list = useTreatments();
  const active = useMemo(() => list.data?.items.find((t) => t.status === "active"), [list.data]);
  const detail = useTreatment(active?.id);
  return {
    list,
    active,
    detail,
    treatment: detail.data,
    isLoading: list.isLoading || (!!active && detail.isLoading),
    isError: list.isError,
    updatedAt: Math.max(list.dataUpdatedAt, detail.dataUpdatedAt),
    refetch: async () => {
      await list.refetch();
      await detail.refetch();
    },
  };
}
