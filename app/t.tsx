import * as Linking from "expo-linking";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { env } from "@/config/env";
import { buildTagUrl } from "@/lib/tagUrl";
import { handleTagUrl } from "@/nfc/handleTagUrl";
import { useSessionStore } from "@/store/session";
import { Loading } from "@/ui";

/**
 * Camino 1: lectura en segundo plano. El sistema abre la app aquí con la URL
 * del tag (App Link en Android, Universal Link en iOS). Se pasa completa a
 * `handleTagUrl`; la app no interpreta `d` ni `c`.
 */
export default function TagRoute() {
  const params = useLocalSearchParams<{ d?: string; c?: string; url?: string }>();
  const linkUrl = Linking.useLinkingURL();
  const status = useSessionStore((s) => s.status);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || status === "loading") return;
    // `url` solo en desarrollo: lavi://t?url=<enlace> inyecta una lectura (scripts/inject-tag.mjs).
    const dev = __DEV__ && params.url ? decodeURIComponent(params.url) : null;
    const full =
      dev ??
      (linkUrl?.startsWith("https://") ? linkUrl : null) ??
      (params.d && params.c ? buildTagUrl(env.linkDomain, params.d, params.c) : null);
    done.current = true;
    if (full) void handleTagUrl(full, "background");
  }, [status, linkUrl, params.d, params.c, params.url]);

  // Detrás del resultado queda Inicio (o el login si no hay sesión).
  return status === "loading" ? <Loading /> : <Redirect href="/" />;
}
