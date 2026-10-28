import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useT } from "@/i18n";
import { Button, Screen, Text } from "@/ui";
import { colors, spacing } from "@/ui/theme";

const SLIDES = [
  { icon: "phone-portrait-outline", key: "slide1" },
  { icon: "star-outline", key: "slide2" },
  { icon: "gift-outline", key: "slide3" },
] as const;

export default function Welcome() {
  const t = useT();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <Screen scroll={false} style={{ justifyContent: "space-between" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
        <Ionicons name={slide.icon} size={96} color={colors.primary} />
        <Text variant="title" style={{ textAlign: "center" }}>{t(`welcome.${slide.key}Title`)}</Text>
        <Text muted style={{ textAlign: "center" }}>{t(`welcome.${slide.key}Body`)}</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }} accessible={false}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: idx === i ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
      </View>
      <Button
        label={last ? t("welcome.start") : t("welcome.next")}
        onPress={() => (last ? router.push("/permissions") : setI(i + 1))}
      />
    </Screen>
  );
}
