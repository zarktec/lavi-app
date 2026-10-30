import type { NotificationContentInput } from "expo-notifications";
import { ALARM_CHANNEL_ID, ALARM_SOUND, ANDROID_CHANNEL_ID } from "./setup";
import { translate } from "@/i18n";
import type { PlannedNotification } from "./plan";

/** Canal de Android según el modo: alarma tipo despertador o recordatorio normal. */
export const reminderChannel = (alarm: boolean) => (alarm ? ALARM_CHANNEL_ID : ANDROID_CHANNEL_ID);

/**
 * Contenido de un recordatorio. Con la alarma activada: en Android lo decide el canal (alarma, sonido largo);
 * en iOS se usa el sonido propio (máx. 30 s) y el nivel «time sensitive», que atraviesa los modos de concentración.
 */
export function buildReminderContent(
  item: Pick<PlannedNotification, "doseId" | "kind">,
  vars: { product: string },
  alarm: boolean,
): NotificationContentInput {
  const dose = item.kind === "dose";
  return {
    title: translate(dose ? "notifications.doseTitle" : "notifications.nudgeTitle", vars),
    body: translate(dose ? "notifications.doseBody" : "notifications.nudgeBody", vars),
    sound: alarm ? ALARM_SOUND : true,
    interruptionLevel: alarm ? "timeSensitive" : "active",
    data: { dose_id: item.doseId, kind: item.kind, open: "scan", alarm },
  };
}
