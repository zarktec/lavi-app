import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useEffect } from "react";
import { useMe, useUpdateMe } from "@/api/hooks";
import { useT } from "@/i18n";
import { deviceTimeZone } from "@/lib/time";
import { syncReminders } from "@/notifications/syncReminders";
import { colors } from "@/ui/theme";

/** Si cambió la zona horaria del teléfono respecto al perfil: PATCH /v1/me y reprogramar. */
function useTimezoneSync() {
  const me = useMe();
  const update = useUpdateMe();
  const tz = deviceTimeZone();
  useEffect(() => {
    if (me.data && me.data.timezone !== tz && !update.isPending) {
      update.mutate({ timezone: tz }, { onSuccess: () => void syncReminders() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data?.timezone, tz]);
}

const ICONS = {
  home: ["home", "home-outline"],
  history: ["calendar", "calendar-outline"],
  points: ["star", "star-outline"],
  store: ["bag", "bag-outline"],
  profile: ["person", "person-outline"],
} as const;

export default function TabsLayout() {
  const t = useT();
  useTimezoneSync();
  const tab = (name: keyof typeof ICONS) => ({
    title: t(`tabs.${name}`),
    tabBarIcon: ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
      <Ionicons name={ICONS[name][focused ? 0 : 1]} size={size} color={color as string} />
    ),
  });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen name="home" options={tab("home")} />
      <Tabs.Screen name="history" options={tab("history")} />
      <Tabs.Screen name="points" options={tab("points")} />
      <Tabs.Screen name="store" options={tab("store")} />
      <Tabs.Screen name="profile" options={tab("profile")} />
    </Tabs>
  );
}
