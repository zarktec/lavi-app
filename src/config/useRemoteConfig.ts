import { useEffect } from "react";
import Constants from "expo-constants";
import { useAppConfig } from "@/api/hooks";
import { setRemoteTexts } from "@/i18n";
import { compareVersions } from "@/lib/version";
import { APP_VERSION } from "./env";
import type { AppConfig } from "@/api/types";

/** Valores por defecto si aún no hay configuración (sin conexión y sin caché). */
export const DEFAULT_CONFIG: AppConfig = { min_app_version: "0.0.0" };

/** `notification_texts` del backend → clave de traducción local que reemplazan. */
const REMOTE_TEXT_KEYS: Record<string, string> = {
  reminder_title: "notifications.doseTitle",
  reminder_body: "notifications.doseBody",
  nudge_body: "notifications.nudgeBody",
  backup_title: "notifications.backupTitle",
  backup_body: "notifications.backupBody",
  repurchase_title: "home.repurchaseTitle",
  repurchase_body: "home.repurchaseBody",
};

export function remoteTextsFrom(config: AppConfig | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(config?.notification_texts ?? {})) {
    if (REMOTE_TEXT_KEYS[k] && v) out[REMOTE_TEXT_KEYS[k]] = v;
  }
  return out;
}

export function needsUpdate(config: AppConfig | undefined, installed = APP_VERSION): boolean {
  if (!config?.min_app_version) return false;
  return compareVersions(installed, config.min_app_version) < 0;
}

/** Configuración remota: min_app_version, textos editables, enlaces de tienda. Se guarda en caché. */
export function useRemoteConfig() {
  const query = useAppConfig();
  const config = query.data ?? DEFAULT_CONFIG;
  useEffect(() => {
    setRemoteTexts(remoteTextsFrom(query.data));
  }, [query.data]);
  return {
    config,
    loaded: query.isSuccess || query.isError,
    blocked: needsUpdate(query.data),
    isStale: query.isError || query.isPaused,
    updatedAt: query.dataUpdatedAt,
    installedVersion: Constants.expoConfig?.version ?? APP_VERSION,
  };
}
