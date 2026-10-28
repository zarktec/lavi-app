import { useSessionStore } from "@/store/session";
import { kvGet, kvSet } from "@/lib/db";

/**
 * Herramienta de analítica pendiente de definir (p. ej. PostHog).
 * Este módulo es la única puerta: al elegir proveedor solo se cambia `send`.
 * La analítica requiere el consentimiento de la política de datos.
 */
export type AnalyticsEvent =
  | { name: "treatment_activated" }
  | { name: "scan_started"; path: "background" | "button" }
  | { name: "scan_result"; result: string; reason?: string; path: "background" | "button" }
  | { name: "notifications_permission"; granted: boolean }
  | { name: "redemption_created" }
  | { name: "repurchase_started"; source: "store" | "reminder" | "redemption" };

let consent = false;
const CONSENT_KEY = "analytics_consent";

export async function loadConsent() {
  consent = (await kvGet(CONSENT_KEY)) === "1";
}

export async function setAnalyticsConsent(value: boolean) {
  consent = value;
  await kvSet(CONSENT_KEY, value ? "1" : "0");
}

function send(event: AnalyticsEvent, userId: string | null) {
  if (__DEV__) console.log("[analytics]", event.name, { ...event, userId });
  // TODO: enviar al proveedor elegido.
}

export function track(event: AnalyticsEvent) {
  if (!consent) return;
  send(event, useSessionStore.getState().userId);
}
