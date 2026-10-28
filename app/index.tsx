import { Redirect } from "expo-router";
import { useRemoteConfig } from "@/config/useRemoteConfig";
import { useSessionStore } from "@/store/session";

/** Punto de entrada: decide a dónde va la clienta según versión, primer uso y sesión. */
export default function Index() {
  const { blocked } = useRemoteConfig();
  const status = useSessionStore((s) => s.status);
  const onboardingDone = useSessionStore((s) => s.onboardingDone);
  if (blocked) return <Redirect href="/update-required" />;
  if (status === "signedIn" && onboardingDone) return <Redirect href="/home" />;
  return <Redirect href="/compat" />;
}
