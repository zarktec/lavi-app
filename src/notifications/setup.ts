import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { translate } from "@/i18n";
import { useUiStore } from "@/store/ui";
import { EAS_PROJECT_ID } from "@/config/env";

/**
 * Los canales de Android son inmutables una vez creados (sonido e importancia). El canal «reminders» se creó
 * con un sonido inválido (`sound: "default"`) y pudo quedar mudo en los teléfonos donde ya existía: se
 * abandona y se usa uno nuevo.
 */
export const ANDROID_CHANNEL_ID = "reminders-v2";
const LEGACY_CHANNEL_IDS = ["reminders"];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Canal propio con importancia alta y sonido (Android). */
export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  for (const id of LEGACY_CHANNEL_IDS) {
    await Notifications.deleteNotificationChannelAsync(id).catch(() => {});
  }
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: translate("notifications.channel"),
    // eslint-disable-next-line import/namespace
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function refreshPermissionStatus() {
  const res = await Notifications.getPermissionsAsync();
  const status = res.granted ? "granted" : res.canAskAgain ? "undetermined" : "denied";
  useUiStore.getState().setNotificationsStatus(status);
  return status;
}

export async function requestPermission(): Promise<boolean> {
  // Un fallo al crear el canal no debe impedir pedir el permiso del sistema.
  await ensureAndroidChannel().catch(() => {});
  const res = await Notifications.requestPermissionsAsync();
  useUiStore.getState().setNotificationsStatus(res.granted ? "granted" : "denied");
  return res.granted;
}

/** Token de Expo para el push de respaldo; `null` en simuladores o sin permiso. */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return null;
  try {
    const t = await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
    );
    return t.data;
  } catch {
    return null;
  }
}
