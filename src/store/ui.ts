import { create } from "zustand";
import type { components } from "@/api/schema";

export type ScanOutcome =
  | { kind: "api"; response: components["schemas"]["ScanResponse"] }
  | { kind: "invalid_tag" }
  | { kind: "saved_offline" }
  | { kind: "error"; message?: string };

export type SyncNotice = { id: number; text: string };

type UiState = {
  /** Resultado que muestra la pantalla modal de resultado. */
  outcome: ScanOutcome | null;
  setOutcome: (o: ScanOutcome | null) => void;
  /** URL leída sin sesión; se procesa al terminar el inicio de sesión. */
  pendingTagUrl: string | null;
  setPendingTagUrl: (u: string | null) => void;
  /** Lecturas en la cola SQLite sin sincronizar. */
  pendingScanCount: number;
  setPendingScanCount: (n: number) => void;
  /** Avisos en la app cuando una lectura guardada se sincroniza. */
  notices: SyncNotice[];
  pushNotice: (text: string) => void;
  dismissNotice: (id: number) => void;
  /** Conectividad. */
  online: boolean;
  setOnline: (v: boolean) => void;
  /** NFC. */
  nfcSupported: boolean | null;
  nfcEnabled: boolean;
  setNfc: (supported: boolean | null, enabled: boolean) => void;
  /** Permiso de notificaciones: undetermined | granted | denied. */
  notificationsStatus: "undetermined" | "granted" | "denied";
  setNotificationsStatus: (s: "undetermined" | "granted" | "denied") => void;
};

let noticeSeq = 0;

export const useUiStore = create<UiState>((set) => ({
  outcome: null,
  setOutcome: (outcome) => set({ outcome }),
  pendingTagUrl: null,
  setPendingTagUrl: (pendingTagUrl) => set({ pendingTagUrl }),
  pendingScanCount: 0,
  setPendingScanCount: (pendingScanCount) => set({ pendingScanCount }),
  notices: [],
  pushNotice: (text) =>
    set((s) => ({ notices: [...s.notices, { id: ++noticeSeq, text }] })),
  dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  online: true,
  setOnline: (online) => set({ online }),
  nfcSupported: null,
  nfcEnabled: true,
  setNfc: (nfcSupported, nfcEnabled) => set({ nfcSupported, nfcEnabled }),
  notificationsStatus: "undetermined",
  setNotificationsStatus: (notificationsStatus) => set({ notificationsStatus }),
}));
