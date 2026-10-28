import { getDb } from "@/lib/db";
import { useUiStore } from "@/store/ui";

export type PendingScan = {
  id: number;
  tag_url: string;
  device_time: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
};

async function refreshCount() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM pending_scans");
  useUiStore.getState().setPendingScanCount(row?.n ?? 0);
}

export async function enqueueScan(tagUrl: string, deviceTime: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO pending_scans (tag_url, device_time, created_at, attempts) VALUES (?, ?, ?, 0)",
    tagUrl,
    deviceTime,
    new Date().toISOString(),
  );
  await refreshCount();
}

/** En orden de lectura. */
export async function listPending(): Promise<PendingScan[]> {
  const db = await getDb();
  return db.getAllAsync<PendingScan>("SELECT * FROM pending_scans ORDER BY id ASC");
}

export async function removePending(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM pending_scans WHERE id = ?", id);
  await refreshCount();
}

export async function markAttempt(id: number, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE pending_scans SET attempts = attempts + 1, last_error = ? WHERE id = ?",
    error,
    id,
  );
}

export const loadPendingCount = refreshCount;

/** Espera creciente (5 s, 10 s, 20 s… hasta 5 min) según los intentos. */
export function backoffMs(attempts: number): number {
  return Math.min(5_000 * 2 ** Math.max(0, attempts), 5 * 60_000);
}

export async function clearPending(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM pending_scans");
  await refreshCount();
}
