import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { useT } from "@/i18n";
import { openNfcSettings, refreshNfcEnabled } from "@/nfc/reader";
import { useSessionStore } from "@/store/session";
import { useUiStore } from "@/store/ui";
import { Button, Loading, Screen, Text } from "@/ui";
import { colors, spacing } from "@/ui/theme";

/** Verifica soporte NFC. Sin NFC no hay app: pantalla final de equipo no compatible. */
export default function Compat() {
  const t = useT();
  const supported = useUiStore((s) => s.nfcSupported);
  const enabled = useUiStore((s) => s.nfcEnabled);
  const onboardingDone = useSessionStore((s) => s.onboardingDone);

  useEffect(() => {
    void refreshNfcEnabled();
  }, []);

  useEffect(() => {
    if (supported && enabled) router.replace(onboardingDone ? "/login" : "/welcome");
  }, [supported, enabled, onboardingDone]);

  if (supported === null) return <Loading label={t("compat.checking")} />;

  if (!supported) {
    return (
      <Screen scroll={false} style={{ justifyContent: "center", gap: spacing.md }}>
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <Ionicons name="phone-portrait-outline" size={64} color={colors.textMuted} />
          <Text variant="title" style={{ textAlign: "center" }}>{t("compat.unsupportedTitle")}</Text>
          <Text muted style={{ textAlign: "center" }}>{t("compat.unsupportedBody")}</Text>
        </View>
      </Screen>
    );
  }

  // NFC apagado (Android): botón a los ajustes del sistema.
  return (
    <Screen scroll={false} style={{ justifyContent: "center", gap: spacing.md }}>
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <Ionicons name="radio-outline" size={64} color={colors.warning} />
        <Text variant="title" style={{ textAlign: "center" }}>{t("compat.nfcOffTitle")}</Text>
        <Text muted style={{ textAlign: "center" }}>{t("compat.nfcOffBody")}</Text>
      </View>
      <Button label={t("compat.openSettings")} onPress={() => void openNfcSettings()} />
      <Button
        label={t("common.continue")}
        variant="ghost"
        onPress={() => router.replace(onboardingDone ? "/login" : "/welcome")}
      />
    </Screen>
  );
}
