import "@/i18n";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ShopifyCheckoutSheetProvider } from "@shopify/checkout-sheet-kit";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { PERSIST_MAX_AGE, queryClient, sqlitePersister } from "@/api/queryClient";
import { bootstrapSession, registerPushDevice } from "@/auth/session";
import { useRemoteConfig } from "@/config/useRemoteConfig";
import { initSentry, wrapRoot } from "@/lib/sentry";
import { initNfc, refreshNfcEnabled } from "@/nfc/reader";
import { registerBackgroundSync } from "@/notifications/background";
import { ensureAndroidChannel, refreshPermissionStatus } from "@/notifications/setup";
import { syncReminders } from "@/notifications/syncReminders";
import { flushQueue, startConnectivityWatch } from "@/offline/sync";
import { useSessionStore } from "@/store/session";

initSentry();
void SplashScreen.preventAutoHideAsync();

function Gate() {
  const status = useSessionStore((s) => s.status);
  const onboardingDone = useSessionStore((s) => s.onboardingDone);
  const { blocked } = useRemoteConfig();
  const signedIn = status === "signedIn";
  const inApp = signedIn && onboardingDone;
  const lastHandled = useRef<string | null>(null);

  // Arranque: NFC, sesión, permisos, conectividad.
  useEffect(() => {
    void (async () => {
      await ensureAndroidChannel();
      await Promise.all([initNfc(), bootstrapSession(), refreshPermissionStatus()]);
      await SplashScreen.hideAsync();
    })();
    return startConnectivityWatch();
  }, []);

  // Cada apertura: NFC encendido, permisos, recordatorios y cola.
  useEffect(() => {
    if (!signedIn) return;
    void registerBackgroundSync();
    void registerPushDevice();
    const run = () => {
      void refreshNfcEnabled();
      void refreshPermissionStatus();
      void syncReminders();
      void flushQueue();
    };
    run();
    const sub = AppState.addEventListener("change", (s) => s === "active" && run());
    return () => sub.remove();
  }, [signedIn]);

  // Tocar un recordatorio (local o push de respaldo) abre el modo escaneo.
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response || !inApp) return;
    const id = response.notification.request.identifier;
    if (lastHandled.current === id) return;
    lastHandled.current = id;
    const open = (response.notification.request.content.data as { open?: string } | undefined)?.open;
    router.push(open === "home" ? "/home" : "/scan");
  }, [response, inApp]);

  if (status === "loading") return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="t" />
      <Stack.Protected guard={blocked}>
        <Stack.Screen name="update-required" />
      </Stack.Protected>
      <Stack.Protected guard={!blocked && !inApp}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!blocked && inApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="scan/result" options={{ presentation: "modal", gestureEnabled: false }} />
        <Stack.Screen name="activate/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="schedule/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="redeem/index" options={{ presentation: "modal" }} />
      </Stack.Protected>
    </Stack>
  );
}

function Root() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: sqlitePersister, maxAge: PERSIST_MAX_AGE }}
    >
      <ShopifyCheckoutSheetProvider>
        <StatusBar style="dark" />
        <Gate />
      </ShopifyCheckoutSheetProvider>
    </PersistQueryClientProvider>
  );
}

export default wrapRoot(Root);
