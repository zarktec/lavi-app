import { useEffect, useState } from "react";
import { useUiStore } from "@/store/ui";
import { listPending, type PendingScan } from "./queue";
import type { Dose } from "@/api/types";

/** Lecturas guardadas sin sincronizar (se refresca cuando cambia el conteo de la cola). */
export function usePendingScans(): PendingScan[] {
  const count = useUiStore((s) => s.pendingScanCount);
  const [items, setItems] = useState<PendingScan[]>([]);
  useEffect(() => {
    let alive = true;
    void listPending().then((r) => alive && setItems(r));
    return () => {
      alive = false;
    };
  }, [count]);
  return items;
}

export type DoseDisplayStatus = Dose["status"] | "pending_sync";

/** Una dosis pendiente cuya ventana contiene una lectura en cola se muestra «pendiente de sincronizar». */
export function displayStatus(dose: Dose, pending: { device_time: string }[]): DoseDisplayStatus {
  if (dose.status !== "pending") return dose.status;
  const opens = new Date(dose.window_opens_at).getTime();
  const closes = new Date(dose.window_closes_at).getTime();
  const hit = pending.some((p) => {
    const t = new Date(p.device_time).getTime();
    return t >= opens && t <= closes;
  });
  return hit ? "pending_sync" : "pending";
}
