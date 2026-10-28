import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { ApiError } from "@/api/errors";
import { useActivateTreatment } from "@/api/hooks";
import { track } from "@/analytics";
import { useT } from "@/i18n";
import { useUiStore } from "@/store/ui";
import { Banner, Button, Card, Screen, Text } from "@/ui";
import { normalizeTimes, ScheduleEditor, timesValid } from "@/ui/ScheduleEditor";
import { spacing } from "@/ui/theme";

/** El token de activación vence (15 min por defecto): el backend responde `activation_token_invalid` y se pide volver a leer el frasco. */
function isExpired(e: unknown) {
  return e instanceof ApiError && e.code === "activation_token_invalid";
}

export default function Activate() {
  const t = useT();
  const outcome = useUiStore((s) => s.outcome);
  const online = useUiStore((s) => s.online);
  const response = outcome?.kind === "api" ? outcome.response : null;
  const [times, setTimes] = useState<string[]>(response?.suggested_times ?? ["08:00"]);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activate = useActivateTreatment();

  if (!response?.activation_token || expired) {
    return (
      <Screen scroll={false} edges="none" style={{ justifyContent: "center", gap: spacing.md }}>
        <Text variant="title" style={{ textAlign: "center" }}>{t("activate.expiredTitle")}</Text>
        <Text muted style={{ textAlign: "center" }}>{t("activate.expiredBody")}</Text>
        <Button label={t("activate.scanAgain")} onPress={() => router.replace("/scan")} />
      </Screen>
    );
  }

  const confirm = () => {
    setError(null);
    activate.mutate(
      { activation_token: response.activation_token as string, reminder_times: normalizeTimes(times) },
      {
        onSuccess: () => {
          track({ name: "treatment_activated" });
          useUiStore.getState().setOutcome(null);
          router.dismissAll();
        },
        onError: (e) => {
          if (isExpired(e)) setExpired(true);
          else setError(e instanceof ApiError && e.message ? e.message : t("common.genericError"));
        },
      },
    );
  };

  return (
    <Screen edges="none">
      <Text variant="title">{t("activate.title")}</Text>
      <Card style={{ gap: spacing.xs }}>
        <Text variant="caption" muted>{t("activate.product")}</Text>
        <Text variant="heading">{response.product?.name}</Text>
        {response.variant ? (
          <>
            <Text variant="caption" muted>{t("activate.presentation")}</Text>
            <Text variant="bodyStrong">{response.variant.name}</Text>
          </>
        ) : null}
      </Card>
      <View style={{ gap: spacing.xs }}>
        <Text variant="heading">{t("activate.schedule")}</Text>
        <Text muted>{t("activate.scheduleHint")}</Text>
      </View>
      <ScheduleEditor times={times} onChange={setTimes} />
      {error ? <Banner tone="danger" text={error} /> : null}
      {!online ? <Banner tone="info" text={t("common.needsConnection")} /> : null}
      <Button
        label={t("activate.confirm")}
        loading={activate.isPending}
        disabled={!timesValid(times) || !online}
        onPress={confirm}
      />
    </Screen>
  );
}
