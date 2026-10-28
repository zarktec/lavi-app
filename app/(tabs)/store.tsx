import { useQuery } from "@tanstack/react-query";
import { Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { isEndingSoon, useActiveTreatment } from "@/api/active";
import { track } from "@/analytics";
import { useRemoteConfig } from "@/config/useRemoteConfig";
import { useT } from "@/i18n";
import { fetchProducts } from "@/shopify/storefront";
import { useCheckout } from "@/shopify/useCheckout";
import { useUiStore } from "@/store/ui";
import { Banner, Button, Card, Chip, Loading, Screen, Text } from "@/ui";
import { ConnectionBanner } from "@/ui/ConnectionBanner";
import { radius, spacing } from "@/ui/theme";

export default function Store() {
  const t = useT();
  const { config } = useRemoteConfig();
  const { treatment } = useActiveTreatment();
  const online = useUiStore((s) => s.online);
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const products = useQuery({ queryKey: ["store", "products"], queryFn: () => fetchProducts() });
  const { buy, busy, error } = useCheckout();

  const inUseVariant = treatment?.product.presentation?.shopify_variant_id ?? highlight;
  const endingSoon = isEndingSoon(treatment, config.repurchase_reminder_days ?? 7);

  if (products.isLoading && !products.data) return <Loading />;

  return (
    <Screen>
      <Text variant="title">{t("store.title")}</Text>
      <ConnectionBanner updatedAt={products.dataUpdatedAt} />
      {endingSoon ? <Banner tone="info" text={t("store.endingSoon")} /> : null}
      {error ? <Banner tone="danger" text={t("store.checkoutError")} /> : null}
      {products.data?.length === 0 ? <Text muted>{t("store.empty")}</Text> : null}

      {products.data?.map((p) =>
        p.variants.map((v) => {
          const mine = v.id === inUseVariant;
          return (
            <Card
              key={v.id}
              style={{
                gap: spacing.sm,
                borderColor: mine && endingSoon ? "#6B4FBB" : undefined,
                borderWidth: mine && endingSoon ? 2 : 1,
              }}
            >
              {p.imageUrl ? (
                <Image
                  source={{ uri: p.imageUrl }}
                  accessibilityIgnoresInvertColors
                  style={{ width: "100%", height: 160, borderRadius: radius.md }}
                  resizeMode="contain"
                />
              ) : null}
              {mine ? <Chip tone="info" label={t("store.inUse")} /> : null}
              <Text variant="heading">{p.title}</Text>
              <Text muted>{v.title === "Default Title" ? "" : v.title}</Text>
              <Text variant="bodyStrong">
                {new Intl.NumberFormat("es-CO", { style: "currency", currency: v.price.currencyCode, maximumFractionDigits: 0 }).format(Number(v.price.amount))}
              </Text>
              <Button
                label={v.availableForSale ? t("store.buy") : t("store.unavailable")}
                disabled={!v.availableForSale || !online}
                loading={busy}
                onPress={() => {
                  track({ name: "repurchase_started", source: "store" });
                  void buy(v.id);
                }}
              />
              {!online ? <Text variant="caption" muted>{t("common.needsConnection")}</Text> : null}
            </Card>
          );
        }),
      )}
    </Screen>
  );
}
