import { useMemo } from "react";
import { useTreatment, useTreatments } from "./hooks";
import type { Dose, Treatment } from "./types";

/** Dosis que importa ahora: la ventana abierta o, si no hay, la próxima programada. */
export function pickNextDose(doses: Dose[], now = Date.now()): { dose: Dose; windowOpen: boolean } | null {
  const pending = doses
    .filter((d) => d.status === "scheduled" && new Date(d.window_end).getTime() >= now)
    .sort((a, b) => new Date(a.window_start).getTime() - new Date(b.window_start).getTime());
  const dose = pending[0];
  if (!dose) return null;
  const windowOpen =
    new Date(dose.window_start).getTime() <= now && new Date(dose.window_end).getTime() >= now;
  return { dose, windowOpen };
}

/** El backend decide cuándo sugerir la recompra (`repurchase_suggested`). */
export function isEndingSoon(t: Pick<Treatment, "repurchase_suggested"> | undefined) {
  return !!t?.repurchase_suggested;
}

/** Tratamiento activo (resumen + detalle con dosis). */
export function useActiveTreatment() {
  const list = useTreatments();
  const active = useMemo(() => list.data?.treatments.find((t) => t.status === "active"), [list.data]);
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
