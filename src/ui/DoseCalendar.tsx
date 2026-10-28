import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import type { Dose } from "@/api/types";
import { useT } from "@/i18n";
import { deviceTimeZone } from "@/lib/time";
import { displayStatus, type DoseDisplayStatus } from "@/offline/usePendingScans";
import { Chip, Text } from "./index";
import { colors, MIN_TOUCH, radius, spacing } from "./theme";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: deviceTimeZone() }).format(d); // YYYY-MM-DD

const STATUS_COLOR: Record<DoseDisplayStatus, string> = {
  on_time: colors.success,
  late: colors.late,
  missed: colors.missed,
  pending: colors.pending,
  pending_sync: colors.primary,
};
const STATUS_TONE = {
  on_time: "success",
  late: "warning",
  missed: "danger",
  pending: "neutral",
  pending_sync: "info",
} as const;
const STATUS_KEY: Record<DoseDisplayStatus, string> = {
  on_time: "history.onTime",
  late: "history.late",
  missed: "history.missed",
  pending: "history.pending",
  pending_sync: "history.pendingSync",
};

/** Peor estado del día para colorear la celda. */
function worst(statuses: DoseDisplayStatus[]): DoseDisplayStatus {
  for (const s of ["missed", "late", "pending_sync", "pending"] as const) {
    if (statuses.includes(s)) return s;
  }
  return "on_time";
}

export function DoseCalendar({
  doses,
  pending,
}: {
  doses: Dose[];
  pending: { device_time: string }[];
}) {
  const t = useT();
  const byDay = useMemo(() => {
    const map = new Map<string, { dose: Dose; status: DoseDisplayStatus }[]>();
    for (const dose of doses) {
      const key = dayKey(new Date(dose.scheduled_at));
      const list = map.get(key) ?? [];
      list.push({ dose, status: displayStatus(dose, pending) });
      map.set(key, list);
    }
    return map;
  }, [doses, pending]);

  const firstDose = doses[0] ? new Date(doses[0].scheduled_at) : new Date();
  const [cursor, setCursor] = useState(() => new Date(Date.now()));
  const [selected, setSelected] = useState<string>(dayKey(new Date()));
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const offset = (monthStart.getDay() + 6) % 7; // semana inicia en lunes
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const monthLabel = monthStart.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const move = (delta: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  const canPrev = monthStart > new Date(firstDose.getFullYear(), firstDose.getMonth(), 1);

  const selectedDoses = byDay.get(selected) ?? [];

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          disabled={!canPrev}
          onPress={() => move(-1)}
          style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: "center", opacity: canPrev ? 1 : 0.3 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="bodyStrong" style={{ textTransform: "capitalize" }}>{monthLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          onPress={() => move(1)}
          style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: "center", alignItems: "flex-end" }}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row" }}>
        {WEEKDAYS.map((d) => (
          <Text key={d} variant="caption" muted style={{ flex: 1, textAlign: "center" }}>{d}</Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`e${idx}`} style={{ width: `${100 / 7}%`, height: MIN_TOUCH }} />;
          const key = dayKey(new Date(cursor.getFullYear(), cursor.getMonth(), day, 12));
          const entries = byDay.get(key);
          const status = entries ? worst(entries.map((e) => e.status)) : null;
          const isSel = key === selected;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${day}${status ? `, ${t(STATUS_KEY[status])}` : ""}`}
              accessibilityState={{ selected: isSel }}
              onPress={() => setSelected(key)}
              style={{ width: `${100 / 7}%`, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSel ? colors.primarySoft : "transparent",
                  borderWidth: isSel ? 1 : 0,
                  borderColor: colors.primary,
                }}
              >
                <Text variant="caption">{day}</Text>
                {status ? (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 3,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: STATUS_COLOR[status],
                    }}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.sm }}>
        {selectedDoses.length === 0 ? (
          <Text muted>{t("history.noDosesDay")}</Text>
        ) : (
          selectedDoses.map(({ dose, status }) => (
            <View key={dose.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text>
                {new Date(dose.scheduled_at).toLocaleTimeString("es-CO", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: deviceTimeZone(),
                })}
              </Text>
              <Chip tone={STATUS_TONE[status]} label={t(STATUS_KEY[status])} />
            </View>
          ))
        )}
      </View>
    </View>
  );
}
