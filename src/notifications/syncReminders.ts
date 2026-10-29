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
  if (!treatment) return;
  await ensureAndroidChannel();

  const plan = planReminders(treatment.doses, treatment.config?.reminder_nudges ?? []);
  const vars = { product: treatment.product.name };
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
  }
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
    .catch(() => {})
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
