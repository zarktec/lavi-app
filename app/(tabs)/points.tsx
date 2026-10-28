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

  const entries = ledger.data?.pages.flatMap((p) => p.items) ?? [];
  const toneFor = { active: "success", used: "neutral", expired: "danger" } as const;
  const labelFor = { active: "points.codeActive", used: "points.codeUsed", expired: "points.codeExpired" } as const;

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <Text variant="title">{t("points.title")}</Text>
      <ConnectionBanner updatedAt={points.dataUpdatedAt} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard icon="star-outline" label={t("points.balance")} value={String(points.data?.balance ?? 0)} />
        <StatCard icon="flame-outline" label={t("home.streak")} value={String(points.data?.streak ?? 0)} />
      </View>
      <Button label={t("points.redeem")} icon="gift-outline" onPress={() => router.push("/redeem")} />

      {points.data?.expiring?.length ? (
        <Card style={{ gap: spacing.xs }}>
          <Text variant="bodyStrong">{t("points.expiring")}</Text>
          {points.data.expiring.map((e) => (
            <Text key={e.expires_at} muted>
              {t("points.expiresOn", { points: e.points, date: formatDate(e.expires_at) })}
            </Text>
          ))}
        </Card>
      ) : null}

      <Text variant="heading">{t("points.codes")}</Text>
      {redemptions.data?.items.length ? (
        redemptions.data.items.map((r) => (
          <Card key={r.id} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="bodyStrong" selectable>{r.code}</Text>
              <Chip tone={toneFor[r.status]} label={t(labelFor[r.status])} />
            </View>
            <Text variant="caption" muted>{r.option.name}</Text>
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
              <Text>{item.description ?? item.reason}</Text>
              <Text variant="caption" muted>{formatDate(item.created_at)}</Text>
            </View>
            <Text variant="bodyStrong" color={item.points >= 0 ? colors.success : colors.danger}>
              {item.points >= 0 ? "+" : ""}{item.points}
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
