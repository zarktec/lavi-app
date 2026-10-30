/* eslint-disable import/first */
jest.mock("@/config/env", () => ({ env: { apiUrl: "", linkDomain: "x", appEnv: "development", sentryDsn: "", shopify: {} }, APP_VERSION: "1.0.0", EAS_PROJECT_ID: undefined }));
jest.mock("@/lib/db", () => {
  const store = new Map<string, string>();
  return {
    kvGet: jest.fn(async (k: string) => store.get(k) ?? null),
    kvSet: jest.fn(async (k: string, v: string) => void store.set(k, v)),
  };
});

import "@/i18n";
import { buildReminderContent, reminderChannel } from "@/notifications/content";
import { ALARM_CHANNEL_ID, ANDROID_CHANNEL_ID, ALARM_SOUND } from "@/notifications/setup";
import { isAlarmMode, loadSettings, setAlarmMode } from "@/store/settings";

describe("alarma tipo despertador", () => {
  const item = { doseId: "d1", kind: "dose" as const };

  it("activada: canal de alarma, sonido propio y nivel time sensitive", () => {
    expect(reminderChannel(true)).toBe(ALARM_CHANNEL_ID);
    expect(buildReminderContent(item, { product: "Serum" }, true)).toMatchObject({
      sound: ALARM_SOUND,
      interruptionLevel: "timeSensitive",
      data: { dose_id: "d1", kind: "dose", open: "scan", alarm: true },
    });
  });

  it("desactivada: recordatorio normal", () => {
    expect(reminderChannel(false)).toBe(ANDROID_CHANNEL_ID);
    expect(buildReminderContent(item, { product: "Serum" }, false)).toMatchObject({ sound: true, interruptionLevel: "active" });
  });

  it("el texto lleva el nombre del producto", () => {
    const c = buildReminderContent(item, { product: "Serum Lavi" }, true);
    expect(c.body).toContain("Serum Lavi");
  });

  it("la preferencia está activada por defecto y se conserva al reiniciar", async () => {
    await loadSettings();
    expect(isAlarmMode()).toBe(true);
    await setAlarmMode(false);
    expect(isAlarmMode()).toBe(false);
    await loadSettings(); // simula reiniciar la app
    expect(isAlarmMode()).toBe(false);
    await setAlarmMode(true);
    await loadSettings();
    expect(isAlarmMode()).toBe(true);
  });
});
