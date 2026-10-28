import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { endpoints } from "@/api/endpoints";
import { ApiError, AuthExpiredError, isRetryable } from "@/api/errors";
import { invalidateProgress } from "@/api/queryClient";
import { track } from "@/analytics";
import { env } from "@/config/env";
import { createDeduper } from "@/lib/dedupe";
import { toIsoWithOffset } from "@/lib/time";
import { validateTagUrl } from "@/lib/tagUrl";
import { cancelDoseNudges, syncReminders } from "@/notifications/syncReminders";
import { enqueueScan } from "@/offline/queue";
import { useSessionStore } from "@/store/session";
import { useUiStore, type ScanOutcome } from "@/store/ui";
import { scanNav } from "./nav";

const deduper = createDeduper();

export type ScanPath = "background" | "button";

function showOutcome(outcome: ScanOutcome) {
  useUiStore.getState().setOutcome(outcome);
  if (scanNav.scanScreenOpen || scanNav.resultScreenOpen) {
    router.replace("/scan/result");
  } else {
    router.push("/scan/result");
  }
}

/** Tag que no trae un registro URI (o no es de nuestra marca): mensaje amable, sin errores técnicos. */
export function showInvalidTag() {
  showOutcome({ kind: "invalid_tag" });
}

/**
 * Único punto de entrada de toda lectura, venga por donde venga: valida
 * dominio y parámetros, evita dobles envíos, vibra, la envía a POST /v1/scans
 * (o a la cola sin conexión) y abre la pantalla de resultado.
 * La app nunca interpreta el contenido cifrado del tag.
 */
export async function handleTagUrl(url: string, path: ScanPath = "background"): Promise<void> {
  const check = validateTagUrl(url, env.linkDomain);
  if (!check.ok) {
    showOutcome({ kind: "invalid_tag" });
    return;
  }
  if (deduper.isDuplicate(check.url)) return;

  // Vibración inmediata, antes de la respuesta del servidor.
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  track({ name: "scan_started", path });

  if (useSessionStore.getState().status !== "signedIn") {
    // Sin sesión: se guarda, se lleva al inicio de sesión y se procesa al terminar.
    useUiStore.getState().setPendingTagUrl(check.url);
    router.replace("/login");
    return;
  }

  const deviceTime = toIsoWithOffset(new Date());
  try {
    const response = await endpoints.scan({ tag_url: check.url, device_time: deviceTime });
    track({ name: "scan_result", result: response.result, reason: response.reason, path });
    if (response.result === "dose_recorded" && response.dose_id) {
      void cancelDoseNudges(response.dose_id);
    }
    void invalidateProgress();
    void syncReminders();
    showOutcome({ kind: "api", response });
  } catch (e) {
    if (e instanceof AuthExpiredError) {
      // La sesión se cerró: la lectura se conserva en la cola y vuelve al login.
      await enqueueScan(check.url, deviceTime);
      return;
    }
    if (isRetryable(e)) {
      await enqueueScan(check.url, deviceTime);
      showOutcome({ kind: "saved_offline" });
      return;
    }
    showOutcome({
      kind: "error",
      message: e instanceof ApiError && e.message ? e.message : undefined,
    });
  }
}

/** Para pruebas. */
export const __resetDeduper = () => deduper.reset();
