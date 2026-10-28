import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { create } from "zustand";
import { useCallback } from "react";
import es from "./es.json";

i18next.use(initReactI18next).init({
  lng: "es",
  fallbackLng: "es",
  resources: { es: { translation: es } },
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
  returnNull: false,
});

/** Textos editables que llegan de GET /v1/config/app (por clave i18n). */
const useRemoteTexts = create<{ texts: Record<string, string> }>(() => ({ texts: {} }));
export function setRemoteTexts(texts: Record<string, string> | undefined) {
  useRemoteTexts.setState({ texts: texts ?? {} });
}

/** Usa el texto remoto si existe; si no, el local. */
export function translate(key: string, options?: Record<string, unknown>): string {
  const remote = useRemoteTexts.getState().texts[key];
  if (remote) {
    return remote.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(options?.[k] ?? ""));
  }
  return i18next.t(key, options) as string;
}

/** Hook de traducción: se re-renderiza cuando llegan textos remotos nuevos. */
export function useT() {
  const texts = useRemoteTexts((s) => s.texts);
  useTranslation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((key: string, options?: Record<string, unknown>) => translate(key, options), [texts]);
}

export default i18next;
