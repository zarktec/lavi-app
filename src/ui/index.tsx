import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, MIN_TOUCH, radius, spacing, type } from "./theme";

type Variant = keyof typeof type;

/** Texto escalable con el tamaño de fuente del sistema. */
export function Text({
  variant = "body",
  muted,
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      {...props}
      style={[type[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
    />
  );
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  edges = "top",
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  edges?: "top" | "none";
}) {
  const insets = useSafeAreaInsets();
  const pad = {
    paddingTop: edges === "top" ? insets.top + spacing.sm : spacing.md,
    paddingBottom: insets.bottom + spacing.md,
    paddingHorizontal: padded ? spacing.md : 0,
  };
  if (!scroll) {
    return <View style={[styles.screen, pad, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[{ gap: spacing.md, flexGrow: 1 }, pad, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const isOff = disabled || loading;
  const bg = {
    primary: colors.primary,
    secondary: colors.primarySoft,
    ghost: "transparent",
    danger: colors.danger,
  }[variant];
  const fg = variant === "primary" || variant === "danger" ? colors.white : colors.primaryDark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isOff, busy: !!loading }}
      disabled={isOff}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: isOff ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
          <Text variant="bodyStrong" color={fg} style={{ textAlign: "center" }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Banner({
  tone = "warning",
  text,
  actionLabel,
  onAction,
  onDismiss,
}: {
  tone?: "warning" | "info" | "success" | "danger";
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  const palette = {
    warning: [colors.warningSoft, colors.warning],
    info: [colors.primarySoft, colors.primaryDark],
    success: [colors.successSoft, colors.success],
    danger: [colors.dangerSoft, colors.danger],
  }[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: palette[0] }]}
    >
      <Text variant="body" color={palette[1]}>
        {text}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={styles.bannerAction}
        >
          <Text variant="bodyStrong" color={palette[1]} style={{ textDecorationLine: "underline" }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          onPress={onDismiss}
          style={styles.bannerAction}
        >
          <Ionicons name="close" size={20} color={palette[1]} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  tone = "neutral",
  style,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  style?: StyleProp<TextStyle>;
}) {
  const palette = {
    neutral: [colors.border, colors.textMuted],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    info: [colors.primarySoft, colors.primaryDark],
  }[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette[0] }]}>
      <Text variant="caption" color={palette[1]} style={style}>
        {label}
      </Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label ?? "Cargando"}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function StatCard({
  label,
  value,
  icon,
  style,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card style={[{ flex: 1, gap: spacing.xs }, style]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text variant="heading" accessibilityLabel={`${label}: ${value}`}>
        {value}
      </Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </Card>
  );
}

export function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: spacing.sm }, style]}>{children}</View>;
}

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
  icon,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const content = (
    <View style={styles.listRow}>
      {icon ? <Ionicons name={icon} size={22} color={colors.primary} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" muted>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function Hairline() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  button: {
    minHeight: MIN_TOUCH + 4,
    minWidth: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  banner: {
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bannerAction: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    justifyContent: "center",
    alignItems: "center",
  },
  chip: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  listRow: {
    minHeight: MIN_TOUCH + 8,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
});
