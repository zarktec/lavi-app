import { create } from "zustand";

type SessionState = {
  /** `loading` mientras se restauran los tokens al arrancar. */
  status: "loading" | "signedOut" | "signedIn";
  userId: string | null;
  /** Primer uso completado (compatibilidad, bienvenida y permiso mostrados). */
  onboardingDone: boolean;
  setStatus: (s: SessionState["status"]) => void;
  setUserId: (id: string | null) => void;
  setOnboardingDone: (v: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  userId: null,
  onboardingDone: false,
  setStatus: (status) => set({ status }),
  setUserId: (userId) => set({ userId }),
  setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
}));
