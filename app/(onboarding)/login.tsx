import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { signIn } from "@/auth/session";
import { LoginCancelledError } from "@/auth/shopifyAuth";
import { env } from "@/config/env";
import { useT } from "@/i18n";
import { captureError } from "@/lib/sentry";
import { Banner, Button, Screen, Text } from "@/ui";
import { colors, MIN_TOUCH, spacing } from "@/ui/theme";

export default function Login() {
  const t = useT();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    if (!accepted) return setError(t("login.mustAccept"));
    setError(null);
    setBusy(true);
    try {
      await signIn({ acceptedAnalytics: accepted });
      router.replace("/home");
    } catch (e) {
      if (!(e instanceof LoginCancelledError)) {
        captureError(e);
        setError(t("login.failed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false} style={{ justifyContent: "space-between" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
        <Ionicons name="person-circle-outline" size={96} color={colors.primary} />
        <Text variant="title" style={{ textAlign: "center" }}>{t("login.title")}</Text>
        <Text muted style={{ textAlign: "center" }}>{t("login.body")}</Text>
      </View>
      <View style={{ gap: spacing.md }}>
        {env.devLogin ? <Banner tone="info" text="Modo de prueba: sin Shopify, con el servidor simulado." /> : null}
        {error ? <Banner tone="danger" text={error} /> : null}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel={t("login.analytics")}
          onPress={() => setAccepted(!accepted)}
          style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", minHeight: MIN_TOUCH }}
        >
          <Ionicons
            name={accepted ? "checkbox" : "square-outline"}
            size={26}
            color={accepted ? colors.primary : colors.textMuted}
          />
          <Text variant="caption" style={{ flex: 1 }}>{t("login.analytics")}</Text>
        </Pressable>
        {env.privacyUrl ? (
          <Button
            variant="ghost"
            label={t("login.policyLink")}
            onPress={() => WebBrowser.openBrowserAsync(env.privacyUrl)}
          />
        ) : null}
        <Button label={t("login.button")} loading={busy} onPress={onLogin} />
      </View>
    </Screen>
  );
}
