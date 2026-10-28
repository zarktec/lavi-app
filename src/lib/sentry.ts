import * as Sentry from "@sentry/react-native";
import { env } from "@/config/env";

let started = false;

export function initSentry() {
  if (started || !env.sentryDsn) return;
  started = true;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.appEnv,
    enabled: !__DEV__,
    sendDefaultPii: false,
    // Sin datos personales: se elimina todo menos el identificador interno.
    beforeSend(event) {
      if (event.user) event.user = { id: event.user.id };
      delete event.request?.cookies;
      delete event.request?.headers;
      return event;
    },
  });
}

export function setSentryUser(id: string | null) {
  Sentry.setUser(id ? { id } : null);
}

export function captureError(e: unknown, ctx?: Record<string, unknown>) {
  if (!env.sentryDsn) return;
  Sentry.captureException(e, { extra: ctx });
}

export const wrapRoot = Sentry.wrap;
