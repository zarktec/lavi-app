import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { track } from "@/analytics";
import { useT } from "@/i18n";
import { requestPermission } from "@/notifications/setup";
import { Button, Screen, Text } from "@/ui";
import { colors, spacing } from "@/ui/theme";

/** Explica por qué son indispensables las notificaciones antes de pedir el permiso del sistema. */
export default function Permissions() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const allow = async () => {
    setBusy(true);
    const granted = await requestPermission();
    track({ name: "notifications_permission", granted });
    setBusy(false);
    router.push("/login");
  };
  return (
    <Screen scroll={false} style={{ justifyContent: "space-between" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
        <Ionicons name="notifications-outline" size={96} color={colors.primary} />
        <Text variant="title" style={{ textAlign: "center" }}>{t("permissions.title")}</Text>
        <Text muted style={{ textAlign: "center" }}>{t("permissions.body")}</Text>
      </View>
      <Button label={t("permissions.allow")} loading={busy} onPress={allow} />
    </Screen>
  );
}
