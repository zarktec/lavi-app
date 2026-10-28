import { router } from "expo-router";
import { useState } from "react";
import { useActiveTreatment } from "@/api/active";
import { useChangeSchedule } from "@/api/hooks";
import { ApiError } from "@/api/errors";
import type { ScheduleChange } from "@/api/types";
import { useT } from "@/i18n";
import { formatDateTime } from "@/lib/time";
import { useUiStore } from "@/store/ui";
import { Banner, Button, Card, Loading, Screen, Text } from "@/ui";
import { normalizeTimes, ScheduleEditor, timesValid } from "@/ui/ScheduleEditor";
import { spacing } from "@/ui/theme";

export default function Schedule() {
  const t = useT();
  const { active, treatment, isLoading } = useActiveTreatment();
  const online = useUiStore((s) => s.online);
  const change = useChangeSchedule(active?.id ?? "");
  const [edited, setEdited] = useState<string[] | null>(null);
  const [saved, setSaved] = useState<ScheduleChange | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !treatment || !active) return <Loading />;
  const times = edited ?? treatment.schedule_times;
  const setTimes = setEdited;

  const left = saved?.changes_left ?? treatment.schedule_changes_left;
  const noneLeft = left !== undefined && left <= 0;

  return (
    <Screen edges="none">
      <Text variant="title">{t("schedule.title")}</Text>
      <Card style={{ gap: spacing.xs }}>
        <Text variant="caption" muted>{t("schedule.current")}</Text>
        <Text variant="heading">{(saved?.schedule_times ?? treatment.schedule_times).join("  ·  ")}</Text>
      </Card>

      {saved ? (
        <>
          <Banner tone="success" text={t("schedule.saved")} />
          <Text>{t("schedule.effective", { date: formatDateTime(saved.effective_from) })}</Text>
        </>
      ) : (
        <>
          <Text variant="heading">{t("schedule.new")}</Text>
          <ScheduleEditor times={times} onChange={setTimes} />
        </>
      )}

      {left !== undefined ? (
        <Text muted>{noneLeft ? t("schedule.noChangesLeft") : t("schedule.changesLeft", { count: left })}</Text>
      ) : null}
      {error ? <Banner tone="danger" text={error} /> : null}
      {!online ? <Banner tone="info" text={t("common.needsConnection")} /> : null}

      {saved ? (
        <Button label={t("common.close")} onPress={() => router.back()} />
      ) : (
        <Button
          label={t("schedule.confirm")}
          loading={change.isPending}
          disabled={!timesValid(times) || noneLeft || !online}
          onPress={() => {
            setError(null);
            change.mutate(normalizeTimes(times), {
              onSuccess: setSaved,
              onError: (e) => setError(e instanceof ApiError && e.message ? e.message : t("common.genericError")),
            });
          }}
        />
      )}
    </Screen>
  );
}
