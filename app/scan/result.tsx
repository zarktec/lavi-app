import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Linking, View } from "react-native";
import { useRemoteConfig } from "@/config/useRemoteConfig";
import { useT } from "@/i18n";
import { formatTime, formatDateTime } from "@/lib/time";
import { scanNav } from "@/nfc/nav";
import { outcomeView, SUPPORT_VIEWS, type OutcomeView } from "@/nfc/outcome";
import { useUiStore } from "@/store/ui";
import { Button, Card, Screen, Text } from "@/ui";
import { colors, spacing } from "@/ui/theme";

const ICON: Record<OutcomeView, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  activation: { name: "sparkles", color: colors.primary },
  recorded: { name: "checkmark-circle", color: colors.success },
  too_early: { name: "time-outline", color: colors.primary },
  late: { name: "alert-circle-outline", color: colors.late },
  no_pending: { name: "calendar-outline", color: colors.primary },
  finished: { name: "trophy-outline", color: colors.success },
  rejected_signature: { name: "close-circle-outline", color: colors.danger },
  rejected_owned: { name: "person-circle-outline", color: colors.danger },
  rejected_blocked: { name: "ban-outline", color: colors.danger },
  rejected_expired: { name: "hourglass-outline", color: colors.late },
  invalid_tag: { name: "help-circle-outline", color: colors.textMuted },
  saved_offline: { name: "cloud-offline-outline", color: colors.primary },
  generic: { name: "refresh-circle-outline", color: colors.primary },
  error: { name: "warning-outline", color: colors.danger },
};

/** Cierra el modal y navega a otra pestaña. */
function closeAnd(path: "/store" | "/home") {
  router.dismissAll();
  router.navigate(path);
}

export default function ScanResult() {
  const t = useT();
  const { config } = useRemoteConfig();
  const outcome = useUiStore((s) => s.outcome);
  const view = outcome ? outcomeView(outcome) : null;

  useEffect(() => {
    scanNav.resultScreenOpen = true;
    return () => {
      scanNav.resultScreenOpen = false;
    };
  }, []);

  // La activación abre su propia pantalla con el token, producto y horarios sugeridos.
  useEffect(() => {
    if (view === "activation") router.replace("/activate");
  }, [view]);

  if (!outcome || !view || view === "activation") return <Screen><View /></Screen>;

  const r = outcome.kind === "api" ? outcome.response : null;
  let title = "";
  let body: string | undefined;
  const details: string[] = [];

  switch (view) {
    case "recorded":
      title = t("result.recordedTitle");
      details.push(t("result.pointsEarned", { count: r?.points_earned ?? 0 }));
      if (r?.streak_bonus) details.push(t("result.streakBonus", { count: r.streak_bonus }));
      if (r?.streak !== undefined) details.push(t("result.streakNow", { count: r.streak }));
      if (r?.balance !== undefined) details.push(t("result.balanceNow", { count: r.balance }));
      if (r?.next_dose_at) details.push(t("result.nextDose", { time: formatDateTime(r.next_dose_at) }));
      break;
    case "too_early":
      title = t("result.tooEarlyTitle");
      body = t("result.tooEarlyBody", { time: r?.window_opens_at ? formatTime(r.window_opens_at) : "" });
      break;
    case "late":
      title = t("result.lateTitle");
      body = t("result.lateBody");
      break;
    case "no_pending":
      title = t("result.noPendingTitle");
      body = r?.next_dose_at ? t("result.noPendingBody", { time: formatDateTime(r.next_dose_at) }) : undefined;
      break;
    case "finished":
      title = t("result.finishedTitle");
      body = t("result.finishedBody", {
        onTime: r?.summary?.doses_on_time ?? 0,
        total: r?.summary?.doses_total ?? 0,
        percent: r?.summary?.adherence_percent ?? 0,
      });
      break;
    case "rejected_signature":
      title = t("result.rejectedTitle");
      body = t("result.rejectedBody");
      break;
    case "rejected_owned":
      title = t("result.ownedByOtherTitle");
      break;
    case "rejected_blocked":
      title = t("result.blockedTitle");
      break;
    case "rejected_expired":
      title = t("result.offlineExpiredTitle");
      break;
    case "invalid_tag":
      title = t("result.invalidTagTitle");
      body = t("result.invalidTagBody");
      break;
    case "saved_offline":
      title = t("result.savedOfflineTitle");
      body = t("result.savedOfflineBody");
      break;
    case "error":
      title = t("result.errorTitle");
      body = outcome.kind === "error" && outcome.message ? outcome.message : t("common.genericError");
      break;
    default:
      title = t("result.genericTitle");
      body = t("result.genericBody");
  }

  const icon = ICON[view];
  return (
    <Screen scroll={false} edges="none" style={{ justifyContent: "space-between" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
        <Ionicons name={icon.name} size={96} color={icon.color} />
        <Text variant="title" style={{ textAlign: "center" }} accessibilityRole="header">{title}</Text>
        {body ? <Text muted style={{ textAlign: "center" }}>{body}</Text> : null}
        {details.length ? (
          <Card style={{ alignSelf: "stretch", gap: spacing.xs }}>
            {details.map((d, i) => (
              <Text key={i} variant={i === 0 ? "heading" : "body"} style={{ textAlign: "center" }}>{d}</Text>
            ))}
          </Card>
        ) : null}
      </View>
      <View style={{ gap: spacing.sm }}>
        {SUPPORT_VIEWS.includes(view) && config.support_email ? (
          <Button
            variant="secondary"
            label={t("result.supportCta")}
            onPress={() => void Linking.openURL(`mailto:${config.support_email}`)}
          />
        ) : null}
        {view === "finished" ? (
          <Button label={t("result.finishedCta")} onPress={() => closeAnd("/store")} />
        ) : null}
        <Button
          variant={view === "finished" ? "ghost" : "primary"}
          label={t("result.done")}
          onPress={() => router.dismissAll()}
        />
      </View>
    </Screen>
  );
}
