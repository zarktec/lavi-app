import { router } from "expo-router";
import { useActiveTreatment } from "@/api/active";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/time";
import { usePendingScans } from "@/offline/usePendingScans";
import { Button, Card, Loading, Screen, Text } from "@/ui";
import { ConnectionBanner } from "@/ui/ConnectionBanner";
import { DoseCalendar } from "@/ui/DoseCalendar";
import { spacing } from "@/ui/theme";

export default function History() {
  const t = useT();
  const { list, active, treatment, isLoading, updatedAt } = useActiveTreatment();
  const pending = usePendingScans();
  if (isLoading && !list.data) return <Loading />;
  const previous = list.data?.treatments.filter((i) => i.status !== "active") ?? [];

  return (
    <Screen>
      <Text variant="title">{t("history.title")}</Text>
      <ConnectionBanner updatedAt={updatedAt} />

      {active && treatment ? (
        <Card style={{ gap: spacing.md }}>
          <Text variant="heading">{t("history.activeTreatment")}</Text>
          <Text muted>
            {active.product.name} · {active.variant.name}
          </Text>
          <Text variant="caption" muted>
            {t("history.adherence", { onTime: active.progress.on_time, total: active.progress.total })}
          </Text>
          <DoseCalendar doses={treatment.doses} pending={pending} />
          <Button
            variant="secondary"
            label={t("history.changeSchedule")}
            onPress={() => router.push({ pathname: "/schedule", params: { id: active.id } })}
          />
        </Card>
      ) : (
        <Text muted>{t("history.none")}</Text>
      )}

      {previous.length > 0 ? (
        <>
          <Text variant="heading">{t("history.previous")}</Text>
          {previous.map((p) => (
            <Card key={p.id} style={{ gap: spacing.xs }}>
              <Text variant="bodyStrong">{p.product.name}</Text>
              <Text variant="caption" muted>
                {formatDate(p.start_date)} – {formatDate(p.end_date)}
              </Text>
              <Text variant="caption">
                {t("history.adherence", { onTime: p.progress.on_time, total: p.progress.total })}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
