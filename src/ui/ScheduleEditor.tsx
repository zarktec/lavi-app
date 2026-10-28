import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View } from "react-native";
import { useT } from "@/i18n";
import { Button, Text } from "./index";
import { colors, MIN_TOUCH, radius, spacing } from "./theme";

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.map((t) => t.trim()))].sort();
}

export function timesValid(times: string[]): boolean {
  return times.length > 0 && times.every((t) => TIME_RE.test(t));
}

/** Editor de horarios HH:MM (hora local del teléfono). */
export function ScheduleEditor({
  times,
  onChange,
}: {
  times: string[];
  onChange: (t: string[]) => void;
}) {
  const t = useT();
  return (
    <View style={{ gap: spacing.sm }}>
      {times.map((value, i) => {
        const bad = value.length > 0 && !TIME_RE.test(value);
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <TextInput
              value={value}
              onChangeText={(v) => onChange(times.map((x, j) => (j === i ? v : x)))}
              placeholder="08:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              accessibilityLabel={`Horario ${i + 1}`}
              style={{
                flex: 1,
                minHeight: MIN_TOUCH + 4,
                borderWidth: 1,
                borderColor: bad ? colors.danger : colors.border,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                fontSize: 18,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
            />
            {times.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar horario ${i + 1}`}
                onPress={() => onChange(times.filter((_, j) => j !== i))}
                style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="trash-outline" size={22} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {times.some((v) => v.length > 0 && !TIME_RE.test(v)) ? (
        <Text variant="caption" color={colors.danger}>{t("activate.invalidTime")}</Text>
      ) : null}
      <Button variant="ghost" icon="add" label={t("activate.addTime")} onPress={() => onChange([...times, ""])} />
    </View>
  );
}
