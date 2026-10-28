import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { useT } from "@/i18n";
import { handleTagUrl, showInvalidTag } from "@/nfc/handleTagUrl";
import { scanNav } from "@/nfc/nav";
import { openNfcSettings, refreshNfcEnabled, startReading, type ActiveRead } from "@/nfc/reader";
import { useUiStore } from "@/store/ui";
import { Banner, Button, Screen, Text } from "@/ui";
import { colors, spacing } from "@/ui/theme";

/** Camino 2: modo escaneo. Vence a los 30 s o al cancelar y vuelve sin error. */
export default function Scan() {
  const t = useT();
  const nfcEnabled = useUiStore((s) => s.nfcEnabled);
  const [pulse] = useState(() => new Animated.Value(0));
  const read = useRef<ActiveRead | null>(null);

  useEffect(() => {
    scanNav.scanScreenOpen = true;
    Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ).start();
    void refreshNfcEnabled();
    return () => {
      scanNav.scanScreenOpen = false;
      read.current?.cancel();
    };
  }, [pulse]);

  useEffect(() => {
    if (!nfcEnabled) return;
    const active = startReading();
    read.current = active;
    void active.promise.then((r) => {
      if (read.current !== active) return;
      if (r.status === "tag") void handleTagUrl(r.url, "button");
      else if (r.status === "invalid") showInvalidTag();
      else if (router.canGoBack()) router.back();
    });
    return () => active.cancel();
  }, [nfcEnabled]);

  const ring = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
  };

  return (
    <Screen scroll={false} edges="none" style={{ justifyContent: "space-between" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg }}>
        {!nfcEnabled ? (
          <>
            <Banner tone="warning" text={t("compat.nfcOffBody")} />
            <Button label={t("compat.openSettings")} onPress={() => void openNfcSettings()} />
          </>
        ) : (
          <>
            <View
              style={{ width: 200, height: 200, alignItems: "center", justifyContent: "center" }}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={Platform.OS === "ios" ? t("scan.hintIos") : t("scan.hintAndroid")}
            >
              <Animated.View
                style={[
                  { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primary },
                  ring,
                ]}
              />
              <Ionicons name="radio-outline" size={88} color={colors.primary} />
            </View>
            <Text variant="heading" style={{ textAlign: "center" }}>
              {Platform.OS === "ios" ? t("scan.hintIos") : t("scan.hintAndroid")}
            </Text>
            <Text muted>{t("scan.waiting")}</Text>
          </>
        )}
      </View>
      <Button variant="secondary" label={t("scan.cancel")} onPress={() => router.back()} />
    </Screen>
  );
}
