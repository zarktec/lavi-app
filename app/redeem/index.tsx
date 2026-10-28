import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useActiveTreatment } from "@/api/active";
import { ApiError } from "@/api/errors";
import { newIdempotencyKey, usePoints, useRedeem, useRedemptionOptions } from "@/api/hooks";
import type { Redemption, RedemptionOption } from "@/api/types";
import { track } from "@/analytics";
import { useT } from "@/i18n";
import { fetchProducts } from "@/shopify/storefront";
import { useCheckout } from "@/shopify/useCheckout";
import { useUiStore } from "@/store/ui";
import { Banner, Button, Card, Loading, Screen, Text } from "@/ui";
import { colors, MIN_TOUCH, spacing } from "@/ui/theme";

export default function RedeemScreen() {
  const t = useT();
  const options = useRedemptionOptions();
  const points = usePoints();
  const online = useUiStore((s) => s.online);
  const { treatment } = useActiveTreatment();
  const products = useQuery({ queryKey: ["store", "products"], queryFn: () => fetchProducts() });
  const redeem = useRedeem();
  const { buy, busy: buying, error: checkoutError } = useCheckout();

  const [selected, setSelected] = useState<RedemptionOption | null>(null);
  const [result, setResult] = useState<Redemption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Una clave por intento de canje: un reintento (p. ej. por red) no canjea dos veces.
  const key = useRef<string | null>(null);

  if (options.isLoading && !options.data) return <Loading />;
  const balance = points.data?.balance ?? 0;

  if (result) {
    const variant =
      treatment?.product.presentation?.shopify_variant_id ?? products.data?.[0]?.variants[0]?.id;
    return (
      <Screen edges="none" style={{ justifyContent: "center" }}>
        <Text variant="title" style={{ textAlign: "center" }}>{t("redeem.codeTitle")}</Text>
        <Card style={{ alignItems: "center", gap: spacing.sm }}>
          <Text variant="display" selectable accessibilityLabel={`Código ${result.code}`}>{result.code}</Text>
          <Text muted>{result.option.name}</Text>
        </Card>
        {checkoutError ? <Banner tone="danger" text={t("store.checkoutError")} /> : null}
        <Button
          label={t("redeem.useNow")}
          loading={buying}
          disabled={!variant || !online}
          onPress={() => {
            track({ name: "repurchase_started", source: "redemption" });
            if (variant) void buy(variant, result.code);
          }}
        />
        <Button
          variant="secondary"
          label={copied ? t("redeem.copied") : t("redeem.copyCode")}
          onPress={async () => {
            await Clipboard.setStringAsync(result.code);
            setCopied(true);
          }}
        />
        <Button variant="ghost" label={t("common.close")} onPress={() => router.back()} />
      </Screen>
    );
  }

  if (selected) {
    return (
      <Screen edges="none" style={{ justifyContent: "center" }}>
        <Text variant="title">{t("redeem.confirmTitle")}</Text>
        <Card style={{ gap: spacing.xs }}>
          <Text variant="heading">{selected.name}</Text>
          {selected.description ? <Text muted>{selected.description}</Text> : null}
          <Text>{t("redeem.youReceive", { name: selected.name })}</Text>
          <Text variant="bodyStrong">{t("redeem.confirmBody", { cost: selected.cost_points })}</Text>
        </Card>
        {error ? <Banner tone="danger" text={error} /> : null}
        {!online ? <Banner tone="info" text={t("common.needsConnection")} /> : null}
        <Button
          label={t("redeem.confirm")}
          loading={redeem.isPending}
          disabled={!online}
          onPress={() => {
            setError(null);
            key.current ??= newIdempotencyKey();
            redeem.mutate(
              { optionId: selected.id, key: key.current },
              {
                onSuccess: (r) => {
                  track({ name: "redemption_created" });
                  setResult(r);
                },
                onError: (e) =>
                  setError(e instanceof ApiError && e.message ? e.message : t("common.genericError")),
              },
            );
          }}
        />
        <Button
          variant="ghost"
          label={t("common.cancel")}
          onPress={() => {
            key.current = null;
            setSelected(null);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges="none">
      <Text variant="title">{t("redeem.title")}</Text>
      <Text muted>{t("home.balance")}: {balance} {t("common.points")}</Text>
      {options.data?.items.length === 0 ? <Text muted>{t("redeem.empty")}</Text> : null}
      {options.data?.items.map((o) => {
        const enough = balance >= o.cost_points;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={`${o.name}, ${t("redeem.cost", { count: o.cost_points })}`}
            accessibilityState={{ disabled: !enough || !online }}
            disabled={!enough || !online}
            onPress={() => {
              key.current = null;
              setSelected(o);
            }}
            style={{ opacity: enough ? 1 : 0.5, minHeight: MIN_TOUCH }}
          >
            <Card style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="bodyStrong" style={{ flex: 1 }}>{o.name}</Text>
                <Text variant="bodyStrong" color={colors.primary}>{t("redeem.cost", { count: o.cost_points })}</Text>
              </View>
              {o.description ? <Text variant="caption" muted>{o.description}</Text> : null}
              {!enough ? <Text variant="caption" color={colors.danger}>{t("redeem.notEnough")}</Text> : null}
            </Card>
          </Pressable>
        );
      })}
      {!online ? <Banner tone="info" text={t("common.needsConnection")} /> : null}
    </Screen>
  );
}
