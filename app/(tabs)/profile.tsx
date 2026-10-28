import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Platform, TextInput, View } from "react-native";
import { useMe } from "@/api/hooks";
import { deleteAccount, signOut } from "@/auth/session";
import { useRemoteConfig } from "@/config/useRemoteConfig";
import { useT } from "@/i18n";
import { handleTagUrl } from "@/nfc/handleTagUrl";
import { openNfcSettings } from "@/nfc/reader";
import { useUiStore } from "@/store/ui";
import { Banner, Button, Card, Hairline, ListRow, Screen, Text } from "@/ui";
import { ConnectionBanner } from "@/ui/ConnectionBanner";
import { colors, radius, spacing } from "@/ui/theme";

export default function Profile() {
  const t = useT();
  const { config } = useRemoteConfig();
  const me = useMe();
  const notifications = useUiStore((s) => s.notificationsStatus);
  const nfcEnabled = useUiStore((s) => s.nfcEnabled);
  const online = useUiStore((s) => s.online);
  const [error, setError] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState("");

  const confirmLogout = () =>
    Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("profile.logout"), onPress: () => void signOut() },
    ]);

  // Doble confirmación con aviso de pérdida de puntos.
  const confirmDelete = () =>
    Alert.alert(t("profile.deleteConfirm1Title"), t("profile.deleteConfirm1Body"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.delete"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("profile.deleteConfirm2Title"), t("profile.deleteConfirm2Body"), [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("profile.deleteConfirm"),
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteAccount();
                } catch (e) {
                  setError(e instanceof Error && e.message ? e.message : t("common.genericError"));
                }
              },
            },
          ]),
      },
    ]);

  return (
    <Screen>
      <Text variant="title">{t("profile.title")}</Text>
      <ConnectionBanner updatedAt={me.dataUpdatedAt} />
      {error ? <Banner tone="danger" text={error} onDismiss={() => setError(null)} /> : null}

      <Card>
        <ListRow icon="time-outline" title={t("profile.schedule")} onPress={() => router.push("/schedule")} />
        <Hairline />
        <ListRow
          icon="notifications-outline"
          title={t("profile.notifications")}
          subtitle={notifications === "granted" ? t("profile.notificationsOn") : t("profile.notificationsOff")}
          onPress={notifications === "granted" ? undefined : () => void Linking.openSettings()}
        />
        <Hairline />
        <ListRow
          icon="radio-outline"
          title={t("profile.nfc")}
          subtitle={nfcEnabled ? t("profile.nfcOn") : t("profile.nfcOff")}
          onPress={Platform.OS === "android" && !nfcEnabled ? () => void openNfcSettings() : undefined}
        />
      </Card>

      <Card>
        <Text variant="bodyStrong">{t("profile.personalData")}</Text>
        <Text muted>{me.data?.name ?? "—"}</Text>
        <Text muted>{me.data?.email ?? "—"}</Text>
        {me.data?.phone ? <Text muted>{me.data.phone}</Text> : null}
      </Card>

      <Card>
        <ListRow
          icon="help-buoy-outline"
          title={t("profile.support")}
          onPress={config.support_email ? () => void Linking.openURL(`mailto:${config.support_email}`) : undefined}
        />
        {config.privacy_policy_url ? (
          <>
            <Hairline />
            <ListRow
              icon="shield-checkmark-outline"
              title={t("profile.privacy")}
              onPress={() => WebBrowser.openBrowserAsync(config.privacy_policy_url as string)}
            />
          </>
        ) : null}
        {config.terms_url ? (
          <>
            <Hairline />
            <ListRow
              icon="document-text-outline"
              title={t("profile.terms")}
              onPress={() => WebBrowser.openBrowserAsync(config.terms_url as string)}
            />
          </>
        ) : null}
      </Card>

      <Button variant="secondary" label={t("profile.logout")} onPress={confirmLogout} />
      <Button variant="ghost" label={t("profile.delete")} onPress={confirmDelete} disabled={!online} />
      {!online ? <Text variant="caption" muted>{t("common.needsConnection")}</Text> : null}

      {__DEV__ ? (
        // Comando de desarrollo: inyecta una URL en handleTagUrl sin tags reales.
        <Card style={{ gap: spacing.sm }}>
          <Text variant="caption" muted>DEV · inyectar URL de tag</Text>
          <TextInput
            value={devUrl}
            onChangeText={setDevUrl}
            autoCapitalize="none"
            placeholder="https://dominio/t?d=...&c=..."
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm }}
          />
          <Button label="Inyectar" variant="secondary" onPress={() => void handleTagUrl(devUrl, "button")} />
        </Card>
      ) : null}

      <Text variant="caption" muted style={{ textAlign: "center" }}>
        {t("profile.version", { version: Constants.expoConfig?.version })}
      </Text>
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
