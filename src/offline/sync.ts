import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { endpoints } from "@/api/endpoints";
import { ApiError, AuthExpiredError, NetworkError } from "@/api/errors";
import { invalidateProgress } from "@/api/queryClient";
import type { ScanResponse } from "@/api/types";
import { translate } from "@/i18n";
import { syncReminders } from "@/notifications/syncReminders";
import { useSessionStore } from "@/store/session";
import { useUiStore } from "@/store/ui";
import { backoffMs, listPending, loadPendingCount, markAttempt, removePending } from "./queue";

let flushing: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Errores de red, 5xx y 429 se reintentan; cualquier otra respuesta del backend saca la lectura de la cola. */
function shouldRetry(e: unknown) {
  return e instanceof NetworkError || (e instanceof ApiError && (e.status >= 500 || e.status === 429));
}

export function describeSyncedResult(r: ScanResponse): string {
  if (r.result === "dose_recorded") {
    return translate("result.syncedNoticePoints", { count: r.points_earned ?? 0 });
  }
  if (r.result === "rejected" && r.reason === "offline_expired") {
    return translate("result.offlineExpiredTitle");
  }
  if (r.result === "rejected") return translate("result.rejectedTitle");
  return translate("result.syncedNotice");
}

async function run() {
  if (useSessionStore.getState().status !== "signedIn") return;
  const pending = await listPending();
  const messages: string[] = [];
  let delay: number | null = null;

  for (const item of pending) {
    try {
      const res = await endpoints.scan({
        tag_url: item.tag_url,
        device_time: item.device_time,
        offline: true,
      });
      await removePending(item.id);
      messages.push(describeSyncedResult(res));
    } catch (e) {
      if (e instanceof AuthExpiredError) break; // se conserva en la cola hasta volver a entrar
      if (shouldRetry(e)) {
        await markAttempt(item.id, e instanceof Error ? e.message : "error");
        delay = backoffMs(item.attempts);
        break; // se envían en orden, una a la vez
      }
      await markAttempt(item.id, e instanceof Error ? e.message : "error");
      await removePending(item.id);
      messages.push(translate("result.rejectedTitle"));
    }
  }

  await loadPendingCount();
  if (messages.length) {
    await invalidateProgress();
    void syncReminders();
    const ui = useUiStore.getState();
    messages.forEach((m) => ui.pushNotice(m));
    if (AppState.currentState !== "active") {
      await Notifications.scheduleNotificationAsync({
        content: { title: translate("notifications.syncedTitle"), body: messages.join("\n"), data: { open: "home" } },
        trigger: null,
      });
    }
  }
  if (delay !== null) {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => void flushQueue(), delay);
    (retryTimer as { unref?: () => void }).unref?.(); // Node (pruebas); en RN no existe
  }
}

export function cancelScheduledRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

/** Envía la cola en orden de lectura. Un solo vuelo a la vez. */
export function flushQueue(): Promise<void> {
  if (!flushing) {
    flushing = run()
      .catch(() => {})
      .finally(() => {
        flushing = null;
      });
  }
  return flushing;
}

/** Escucha el estado de la red y vacía la cola al recuperar conexión. */
export function startConnectivityWatch(): () => void {
  return NetInfo.addEventListener((state) => {
    const online = !!state.isConnected && state.isInternetReachable !== false;
    const was = useUiStore.getState().online;
    useUiStore.getState().setOnline(online);
    if (online && !was) void flushQueue();
  });
}
