import { useEffect } from "react";
import Constants from "expo-constants";
import { useAppConfig } from "@/api/hooks";
import { setRemoteTexts } from "@/i18n";
import { compareVersions } from "@/lib/version";
import { APP_VERSION } from "./env";
import type { AppConfig } from "@/api/types";

/** Valores por defecto si aún no hay configuración (sin conexión y sin caché). */
export const DEFAULT_CONFIG: AppConfig = {
  min_app_version: "0.0.0",
  repurchase_reminder_days: 7,
  texts: {},
};

export function needsUpdate(config: AppConfig | undefined, installed = APP_VERSION): boolean {
  if (!config?.min_app_version) return false;
  return compareVersions(installed, config.min_app_version) < 0;
}

/** Configuración remota: min_app_version, textos editables, avisos. Se guarda en caché. */
export function useRemoteConfig() {
  const query = useAppConfig();
  const config = query.data ?? DEFAULT_CONFIG;
  useEffect(() => {
    setRemoteTexts(query.data?.texts);
  }, [query.data?.texts]);
  return {
    config,
    loaded: query.isSuccess || query.isError,
    blocked: needsUpdate(query.data),
    isStale: query.isError || query.isPaused,
    updatedAt: query.dataUpdatedAt,
    installedVersion: Constants.expoConfig?.version ?? APP_VERSION,
  };
}
