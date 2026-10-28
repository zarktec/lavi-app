export const colors = {
  primary: "#6B4FBB",
  primaryDark: "#4F3792",
  primarySoft: "#F3EEFB",
  background: "#FBFAFD",
  surface: "#FFFFFF",
  text: "#1F1A2E",
  textMuted: "#5E5873",
  border: "#E4DEF0",
  success: "#2E7D4F",
  successSoft: "#E3F4EA",
  warning: "#8A5A00",
  warningSoft: "#FFF1D6",
  danger: "#B3261E",
  dangerSoft: "#FDE7E5",
  late: "#B26A00",
  missed: "#B3261E",
  pending: "#8C86A0",
  white: "#FFFFFF",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

/** Tamaño mínimo táctil (accesibilidad). */
export const MIN_TOUCH = 44;

export const type = {
  title: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: "700" as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  display: { fontSize: 44, fontWeight: "800" as const, lineHeight: 50 },
};
