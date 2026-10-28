import { router } from "expo-router";
import { useState } from "react";
import { useActiveTreatment } from "@/api/active";
import { useChangeSchedule } from "@/api/hooks";
import { ApiError } from "@/api/errors";
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
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !treatment || !active) return <Loading />;
  const times = edited ?? treatment.reminder_times;
  const setTimes = setEdited;

  const left = treatment.schedule_changes_left;
  const saved = savedAt !== null;
  // El cambio rige tras el aviso mínimo que define la configuración del tratamiento.
  const effectiveFrom = new Date((savedAt ?? 0) + (treatment.config?.schedule_change_min_notice_hours ?? 0) * 3_600_000);
  const noneLeft = left <= 0;

  return (
    <Screen edges="none">
      <Text variant="title">{t("schedule.title")}</Text>
      <Card style={{ gap: spacing.xs }}>
        <Text variant="caption" muted>{t("schedule.current")}</Text>
        <Text variant="heading">{treatment.reminder_times.join("  ·  ")}</Text>
      </Card>

      {saved ? (
        <>
          <Banner tone="success" text={t("schedule.saved")} />
          <Text>{t("schedule.effective", { date: formatDateTime(effectiveFrom) })}</Text>
        </>
      ) : (
        <>
          <Text variant="heading">{t("schedule.new")}</Text>
          <ScheduleEditor times={times} onChange={setTimes} />
        </>
      )}

      <Text muted>{noneLeft ? t("schedule.noChangesLeft") : t("schedule.changesLeft", { count: left })}</Text>
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
              onSuccess: () => setSavedAt(Date.now()),
              onError: (e) => setError(e instanceof ApiError && e.message ? e.message : t("common.genericError")),
            });
          }}
        />
      )}
    </Screen>
  );
}
