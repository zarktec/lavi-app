import { router } from "expo-router";
import { FlatList, View } from "react-native";
import { useLedger, usePoints, useRedemptions } from "@/api/hooks";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/time";
import { Button, Card, Chip, Hairline, Loading, StatCard, Text } from "@/ui";
import { ConnectionBanner } from "@/ui/ConnectionBanner";
import { colors, spacing } from "@/ui/theme";

export default function Points() {
  const t = useT();
  const points = usePoints();
  const ledger = useLedger();
  const redemptions = useRedemptions();
  if (points.isLoading && !points.data) return <Loading />;

  const entries = ledger.data?.pages.flatMap((p) => p.entries) ?? [];
  const toneFor = { issued: "success", used: "neutral", expired: "danger", pending: "warning", failed: "danger" } as const;
  const labelFor = {
    issued: "points.codeActive",
    used: "points.codeUsed",
    expired: "points.codeExpired",
    pending: "points.codePending",
    failed: "points.codeFailed",
  } as const;
  const reasonLabel = (reason: string) => {
    const key = `points.reasons.${reason}`;
    const text = t(key);
    return text === key ? t("points.unknownReason") : text;
  };

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <Text variant="title">{t("points.title")}</Text>
      <ConnectionBanner updatedAt={points.dataUpdatedAt} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard icon="star-outline" label={t("points.balance")} value={String(points.data?.balance ?? 0)} />
        <StatCard
          icon="cash-outline"
          label={t("points.valueCop")}
          value={new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(points.data?.value_cop ?? 0)}
        />
      </View>
      <Button label={t("points.redeem")} icon="gift-outline" onPress={() => router.push("/redeem")} />

      {points.data?.upcoming_expirations?.length ? (
        <Card style={{ gap: spacing.xs }}>
          <Text variant="bodyStrong">{t("points.expiring")}</Text>
          {points.data.upcoming_expirations.map((e) => (
            <Text key={e.date} muted>
              {t("points.expiresOn", { points: e.amount, date: formatDate(`${e.date}T12:00:00Z`) })}
            </Text>
          ))}
        </Card>
      ) : null}

      <Text variant="heading">{t("points.codes")}</Text>
      {redemptions.data?.redemptions.length ? (
        redemptions.data.redemptions.map((r) => (
          <Card key={r.id} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="bodyStrong" selectable>{r.code ?? "—"}</Text>
              <Chip tone={toneFor[r.status]} label={t(labelFor[r.status])} />
            </View>
            <Text variant="caption" muted>{r.option_name}</Text>
          </Card>
        ))
      ) : (
        <Text muted>{t("points.noCodes")}</Text>
      )}
      <Text variant="heading">{t("points.ledger")}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 60 }}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text muted>{t("points.noLedger")}</Text>}
        ItemSeparatorComponent={Hairline}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text>{reasonLabel(item.reason)}</Text>
              <Text variant="caption" muted>{formatDate(item.created_at)}</Text>
            </View>
            <Text variant="bodyStrong" color={item.amount >= 0 ? colors.success : colors.danger}>
              {item.amount >= 0 ? "+" : ""}{item.amount}
            </Text>
          </View>
        )}
        onEndReached={() => ledger.hasNextPage && !ledger.isFetchingNextPage && ledger.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          ledger.hasNextPage ? <Button variant="ghost" label={t("points.loadMore")} loading={ledger.isFetchingNextPage} onPress={() => ledger.fetchNextPage()} /> : undefined
        }
      />
    </View>
  );
}
