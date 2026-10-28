import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Platform, RefreshControl, ScrollView, View } from "react-native";
import { useState } from "react";
import { isEndingSoon, pickNextDose, useActiveTreatment } from "@/api/active";
import { usePoints } from "@/api/hooks";
import { useRemoteConfig } from "@/config/useRemoteConfig";
import { useT } from "@/i18n";
import { formatTime } from "@/lib/time";
import { openNfcSettings } from "@/nfc/reader";
import { useUiStore } from "@/store/ui";
import { Banner, Button, Card, Chip, Loading, Screen, StatCard, Text } from "@/ui";
import { ConnectionBanner } from "@/ui/ConnectionBanner";
import { Countdown } from "@/ui/Countdown";
import { colors, radius, spacing } from "@/ui/theme";

export default function Home() {
  const t = useT();
  const { config } = useRemoteConfig();
  const { treatment, active, isLoading, updatedAt, refetch } = useActiveTreatment();
  const points = usePoints();
  const notificationsStatus = useUiStore((s) => s.notificationsStatus);
  const nfcEnabled = useUiStore((s) => s.nfcEnabled);
  const pendingScans = useUiStore((s) => s.pendingScanCount);
  const notices = useUiStore((s) => s.notices);
  const dismissNotice = useUiStore((s) => s.dismissNotice);
  const [refreshing, setRefreshing] = useState(false);

  if (isLoading && !active) return <Loading />;

  const next = treatment ? pickNextDose(treatment.doses) : null;
  const windowOpen = !!next?.windowOpen;
  const endingSoon = isEndingSoon(treatment, config.repurchase_reminder_days ?? 7);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([refetch(), points.refetch()]);
            setRefreshing(false);
          }}
        />
      }
    >
      <Screen scroll={false} style={{ gap: spacing.md }}>
        <ConnectionBanner updatedAt={updatedAt} />
        {notices.map((n) => (
          <Banner key={n.id} tone="success" text={n.text} onDismiss={() => dismissNotice(n.id)} />
        ))}
        {notificationsStatus === "denied" ? (
          <Banner
            tone="warning"
            text={t("home.notificationsOff")}
            actionLabel={t("home.openSettings")}
            onAction={() => void Linking.openSettings()}
          />
        ) : null}
        {Platform.OS === "android" && !nfcEnabled ? (
          <Banner
            tone="warning"
            text={t("home.nfcOff")}
            actionLabel={t("compat.openSettings")}
            onAction={() => void openNfcSettings()}
          />
        ) : null}
        {pendingScans > 0 ? (
          <Banner tone="info" text={t("home.pendingScans", { count: pendingScans })} />
        ) : null}

        {!treatment || !next ? (
          <Card style={{ alignItems: "center", gap: spacing.sm }}>
            <Ionicons name="phone-portrait-outline" size={56} color={colors.primary} />
            <Text variant="heading" style={{ textAlign: "center" }}>{t("home.noTreatment")}</Text>
            <Text muted style={{ textAlign: "center" }}>{t("home.noTreatmentBody")}</Text>
          </Card>
        ) : (
          <View
            style={{
              backgroundColor: windowOpen ? colors.primary : colors.surface,
              borderRadius: radius.lg,
              padding: spacing.lg,
              gap: spacing.sm,
              borderWidth: windowOpen ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text variant="caption" color={windowOpen ? colors.white : colors.textMuted}>
              {t("home.nextDose")}
            </Text>
            {windowOpen ? (
              <>
                <Text variant="title" color={colors.white}>{t("home.windowOpen")}</Text>
                <Text color={colors.white}>
                  {t("home.windowOpenUntil", { time: formatTime(next.dose.window_closes_at) })}
                </Text>
              </>
            ) : (
              <>
                <Text variant="display">{formatTime(next.dose.window_opens_at)}</Text>
                <Countdown target={next.dose.window_opens_at} />
              </>
            )}
            {pendingScans > 0 ? <Chip tone="warning" label={t("home.pendingSync")} /> : null}
          </View>
        )}

        {!windowOpen && treatment ? (
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <StatCard
              icon="flame-outline"
              label={t("home.streak")}
              value={String(points.data?.streak ?? 0)}
            />
            <StatCard
              icon="star-outline"
              label={t("home.balance")}
              value={String(points.data?.balance ?? 0)}
            />
          </View>
        ) : null}

        <Button
          icon="radio-outline"
          label={t("home.scan")}
          onPress={() => router.push("/scan")}
          style={{ minHeight: 72 }}
        />

        {endingSoon ? (
          <Card style={{ gap: spacing.sm, backgroundColor: colors.primarySoft }}>
            <Text variant="bodyStrong">{t("home.repurchaseTitle")}</Text>
            <Text muted>{t("home.repurchaseBody")}</Text>
            <Button
              variant="secondary"
              label={t("home.repurchaseCta")}
              onPress={() => router.push("/store")}
            />
          </Card>
        ) : null}
      </Screen>
    </ScrollView>
  );
}
