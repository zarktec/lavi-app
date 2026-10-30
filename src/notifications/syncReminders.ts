import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { queryClient } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import type { Treatment } from "@/api/types";
import { translate } from "@/i18n";
import { planReminders } from "./plan";
import { ANDROID_CHANNEL_ID, ensureAndroidChannel } from "./setup";

let running: Promise<void> | null = null;
let queued = false;

export type ReminderSyncStatus = { at: number; scheduled: number; error?: string };
let lastSync: ReminderSyncStatus | null = null;

async function loadActiveTreatment(): Promise<Treatment | null | undefined> {
  // `undefined` = no se pudo saber (sin conexión y sin caché): no tocar lo programado.
  try {
    const list = await queryClient.fetchQuery({
      queryKey: ["treatments"],
      queryFn: endpoints.treatments,
      staleTime: 0,
    });
    const active = list.treatments.find((t) => t.status === "active");
    if (!active) return null;
    return await queryClient.fetchQuery({
      queryKey: ["treatments", active.id],
      queryFn: () => endpoints.treatment(active.id),
      staleTime: 0,
    });
  } catch {
    const list = queryClient.getQueryData<{ treatments: { id: string; status: string }[] }>([
      "treatments",
    ]);
    const active = list?.treatments.find((t) => t.status === "active");
    if (!list) return undefined;
    if (!active) return null;
    return queryClient.getQueryData<Treatment>(["treatments", active.id]) ?? undefined;
  }
}

async function run() {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  const treatment = await loadActiveTreatment();
  if (treatment === undefined) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!treatment) {
    lastSync = { at: Date.now(), scheduled: 0 };
    return;
  }
  // Si el canal falla, igual se programan: Android usa el canal por defecto.
  await ensureAndroidChannel().catch((e) => console.warn("[recordatorios] canal:", e));

  const plan = planReminders(treatment.doses, treatment.config?.reminder_nudges ?? []);
  const vars = { product: treatment.product.name };
  let scheduled = 0;
  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: translate(item.kind === "dose" ? "notifications.doseTitle" : "notifications.nudgeTitle", vars),
        body: translate(item.kind === "dose" ? "notifications.doseBody" : "notifications.nudgeBody", vars),
        sound: true,
        data: { dose_id: item.doseId, kind: item.kind, open: "scan" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.at,
        ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
    scheduled += 1;
  }
  lastSync = { at: Date.now(), scheduled };
}

/** Estado para diagnóstico: permiso, última programación y lo que Android tiene pendiente. */
export async function getReminderStatus() {
  const [perm, pending] = await Promise.all([
    Notifications.getPermissionsAsync(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  const upcoming = pending
    .map((n) => {
      const trigger = n.trigger as { value?: number; date?: number } | null;
      const when = trigger?.value ?? trigger?.date;
      return { kind: (n.content.data as { kind?: string })?.kind ?? "?", when: typeof when === "number" ? new Date(when) : null };
    })
    .sort((a, b) => (a.when?.getTime() ?? 0) - (b.when?.getTime() ?? 0));
  return { granted: perm.granted, total: pending.length, upcoming: upcoming.slice(0, 4), lastSync };
}

/** Notificación de prueba en 10 s: comprueba permiso, canal y sonido sin depender del backend. */
export async function scheduleTestNotification() {
  await ensureAndroidChannel().catch(() => {});
  return Notifications.scheduleNotificationAsync({
    content: { title: "Prueba de recordatorio", body: "Si ves y oyes esto, las notificaciones funcionan.", sound: true, data: { open: "home" } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
}

/**
 * Borra y reprograma todo. Idempotente y de un solo vuelo: si se pide mientras
 * corre, se vuelve a ejecutar una vez al terminar.
 */
export function syncReminders(): Promise<void> {
  if (running) {
    queued = true;
    return running;
  }
  running = run()
    .catch((e) => {
      lastSync = { at: Date.now(), scheduled: 0, error: e instanceof Error ? e.message : String(e) };
      console.warn("[recordatorios] no se pudieron programar:", e);
    })
    .finally(async () => {
      running = null;
      if (queued) {
        queued = false;
        await syncReminders();
      }
    });
  return running;
}

/** Al registrar una dosis se cancelan sus insistencias restantes. */
export async function cancelDoseNudges(doseId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { dose_id?: string } | undefined)?.dose_id === doseId)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
