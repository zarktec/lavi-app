import { create } from "zustand";
import { kvGet, kvSet } from "@/lib/db";

const ALARM_KEY = "alarm_mode";

type SettingsState = {
  /** Alarma tipo despertador para los recordatorios. Activada por defecto; la clienta puede desactivarla. */
  alarmMode: boolean;
  loaded: boolean;
};

export const useSettingsStore = create<SettingsState>(() => ({ alarmMode: true, loaded: false }));

export async function loadSettings() {
  const v = await kvGet(ALARM_KEY);
  useSettingsStore.setState({ alarmMode: v !== "0", loaded: true });
}

/** Guarda la preferencia. Quien la llama debe reprogramar los recordatorios (`syncReminders`). */
export async function setAlarmMode(value: boolean) {
  useSettingsStore.setState({ alarmMode: value });
  await kvSet(ALARM_KEY, value ? "1" : "0");
}

export const isAlarmMode = () => useSettingsStore.getState().alarmMode;
