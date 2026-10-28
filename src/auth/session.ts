import { Platform } from "react-native";
import { router } from "expo-router";
import { endpoints } from "@/api/endpoints";
import { setAuthFailureHandler } from "@/api/client";
import { queryClient, sqlitePersister } from "@/api/queryClient";
import { env } from "@/config/env";
import { kvGet, kvSet } from "@/lib/db";
import { deviceTimeZone } from "@/lib/time";
import { setSentryUser } from "@/lib/sentry";
import { handleTagUrl } from "@/nfc/handleTagUrl";
import { cancelAllReminders, syncReminders } from "@/notifications/syncReminders";
import { getExpoPushToken } from "@/notifications/setup";
import { clearPending, loadPendingCount } from "@/offline/queue";
import { flushQueue } from "@/offline/sync";
import { setAnalyticsConsent, loadConsent } from "@/analytics";
import { useSessionStore } from "@/store/session";
import { useUiStore } from "@/store/ui";
import { loginWithShopify } from "./shopifyAuth";
import { clearSessionTokens, deleteToken, getToken, setToken } from "./tokens";

const ONBOARDING_KEY = "onboarding_done";

/** Restaura el estado persistido al arrancar. */
export async function bootstrapSession() {
  const store = useSessionStore.getState();
  await loadConsent();
  store.setOnboardingDone((await kvGet(ONBOARDING_KEY)) === "1");
  await loadPendingCount();
  const refresh = await getToken("refresh");
  store.setStatus(refresh ? "signedIn" : "signedOut");
  if (refresh) {
    try {
      const me = await endpoints.me();
      store.setUserId(me.id);
      setSentryUser(me.id);
      queryClient.setQueryData(["me"], me);
    } catch {
      // sin conexión: se usa la sesión guardada
    }
  }
}

export async function completeOnboarding() {
  await kvSet(ONBOARDING_KEY, "1");
  useSessionStore.getState().setOnboardingDone(true);
}

/** Token de Expo para el push de respaldo; se registra tras iniciar sesión y cada vez que cambie. */
export async function registerPushDevice() {
  const token = await getExpoPushToken();
  if (!token) return;
  if ((await getToken("pushToken")) === token && (await getToken("deviceId"))) return;
  try {
    const device = await endpoints.registerDevice({
      push_token: token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
    await setToken("pushToken", token);
    await setToken("deviceId", device.id);
  } catch {
    // se reintenta en la próxima apertura
  }
}

/** Inicio de sesión con Shopify y sesión propia del backend. */
export async function signIn(opts: { acceptedAnalytics: boolean }) {
  // Modo de prueba (solo fuera de producción): sin Shopify, contra el servidor simulado.
  const shopify = env.devLogin ? { accessToken: "dev-login-token" } : await loginWithShopify();
  const tokens = await endpoints.createSession({
    shopify_access_token: shopify.accessToken,
    data_consent: true,
    timezone: deviceTimeZone(),
  });
  await setToken("access", tokens.access_token);
  await setToken("refresh", tokens.refresh_token);
  if (tokens.needs_data_consent) await endpoints.updateMe({ accept_data_policy: true });
  await setAnalyticsConsent(opts.acceptedAnalytics);
  await completeOnboarding();

  const me = await endpoints.me();
  queryClient.setQueryData(["me"], me);
  useSessionStore.getState().setUserId(me.id);
  setSentryUser(me.id);
  useSessionStore.getState().setStatus("signedIn");

  void registerPushDevice();
  void syncReminders();
  void flushQueue();

  // Lectura hecha sin sesión: se procesa al terminar el inicio de sesión.
  const pending = useUiStore.getState().pendingTagUrl;
  if (pending) {
    useUiStore.getState().setPendingTagUrl(null);
    await handleTagUrl(pending, "background");
  }
}

/** Limpieza local; conserva la cola de lecturas pendientes. */
export async function localSignOut() {
  await cancelAllReminders();
  await clearSessionTokens();
  await deleteToken("deviceId");
  await deleteToken("pushToken");
  queryClient.clear();
  await sqlitePersister.removeClient();
  setSentryUser(null);
  useSessionStore.getState().setUserId(null);
  useSessionStore.getState().setStatus("signedOut");
}

export async function signOut() {
  const deviceId = await getToken("deviceId");
  const refresh = await getToken("refresh");
  try {
    if (deviceId) await endpoints.deleteDevice(deviceId);
    if (refresh) await endpoints.deleteSession(refresh);
  } catch {
    // aunque falle la red, la sesión local se cierra
  }
  await localSignOut();
  router.replace("/login");
}

/** Eliminación de cuenta (la exige Apple); también borra la cola local. */
export async function deleteAccount() {
  await endpoints.deleteMe();
  await clearPending();
  await localSignOut();
  router.replace("/login");
}

setAuthFailureHandler(async () => {
  await localSignOut();
});
