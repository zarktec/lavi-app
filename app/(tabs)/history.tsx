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
  const previous = list.data?.items.filter((i) => i.status !== "active") ?? [];

  return (
    <Screen>
      <Text variant="title">{t("history.title")}</Text>
      <ConnectionBanner updatedAt={updatedAt} />

      {active && treatment ? (
        <Card style={{ gap: spacing.md }}>
          <Text variant="heading">{t("history.activeTreatment")}</Text>
          <Text muted>
            {active.product.name}
            {active.product.presentation ? ` · ${active.product.presentation.name}` : ""}
          </Text>
          {active.adherence_percent !== undefined ? (
            <Text variant="caption" muted>{t("history.adherence", { percent: active.adherence_percent })}</Text>
          ) : null}
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
                {formatDate(p.started_at)}
                {p.ends_at ? ` – ${formatDate(p.ends_at)}` : ""}
              </Text>
              {p.adherence_percent !== undefined ? (
                <Text variant="caption">{t("history.adherence", { percent: p.adherence_percent })}</Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
