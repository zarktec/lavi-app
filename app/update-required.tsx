import { Ionicons } from "@expo/vector-icons";
import { Linking, Platform, View } from "react-native";
import { useRemoteConfig } from "@/config/useRemoteConfig";
import { useT } from "@/i18n";
import { Button, Screen, Text } from "@/ui";
import { colors, spacing } from "@/ui/theme";

export default function UpdateRequired() {
  const t = useT();
  const { config } = useRemoteConfig();
  const url = Platform.OS === "ios" ? config.links?.ios_store_url : config.links?.android_store_url;
  return (
    <Screen scroll={false} style={{ justifyContent: "center", gap: spacing.lg }}>
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <Ionicons name="cloud-download-outline" size={64} color={colors.primary} />
        <Text variant="title" style={{ textAlign: "center" }}>{t("update.title")}</Text>
        <Text muted style={{ textAlign: "center" }}>{t("update.body")}</Text>
      </View>
      <Button label={t("update.cta")} disabled={!url} onPress={() => url && Linking.openURL(url)} />
    </Screen>
  );
}
