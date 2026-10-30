/* eslint-disable import/first */
const mockTreatment = {
  id: "t1",
  status: "active",
  product: { id: "p", name: "Serum Lavi" },
  config: { reminder_nudges: [20] },
  doses: [
    { id: "d1", status: "scheduled", window_start: new Date(Date.now() + 3_600_000).toISOString(), window_end: new Date(Date.now() + 7_200_000).toISOString() },
  ],
};

jest.mock("@/config/env", () => ({ env: { apiUrl: "", linkDomain: "x", appEnv: "development", sentryDsn: "", shopify: {} }, APP_VERSION: "1.0.0", EAS_PROJECT_ID: undefined }));
jest.mock("@/lib/db", () => ({ kvGet: jest.fn(async () => null), kvSet: jest.fn(async () => {}) }));
jest.mock("@/api/endpoints", () => ({ endpoints: { treatments: jest.fn(), treatment: jest.fn() } }));
jest.mock("@/api/queryClient", () => ({
  queryClient: {
    fetchQuery: jest.fn(async ({ queryKey }: { queryKey: string[] }) =>
      queryKey.length === 1 ? { treatments: [{ id: "t1", status: "active" }] } : mockTreatment,
    ),
    getQueryData: jest.fn(),
  },
}));

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import "@/i18n";
import { cancelAllReminders, cancelDoseNudges, syncReminders } from "@/notifications/syncReminders";
import { ALARM_CHANNEL_ID, ANDROID_CHANNEL_ID } from "@/notifications/setup";
import { setAlarmMode } from "@/store/settings";

const scheduled = Notifications.scheduleNotificationAsync as jest.Mock;

describe("syncReminders (módulo real)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, "OS", "android");
  });
  afterEach(() => jest.restoreAllMocks());

  it("exporta todas las funciones que usa la app", () => {
    expect(typeof syncReminders).toBe("function");
    expect(typeof cancelDoseNudges).toBe("function");
    expect(typeof cancelAllReminders).toBe("function");
  });

  it("con la alarma activada programa en el canal de alarma", async () => {
    await setAlarmMode(true);
    await syncReminders();
    expect(scheduled).toHaveBeenCalledTimes(2); // apertura + una insistencia
    for (const [arg] of scheduled.mock.calls) {
      expect(arg.trigger.channelId).toBe(ALARM_CHANNEL_ID);
      expect(arg.content.sound).toBe("alarm.wav");
    }
  });

  it("con la alarma desactivada usa el canal normal", async () => {
    await setAlarmMode(false);
    await syncReminders();
    for (const [arg] of scheduled.mock.calls) {
      expect(arg.trigger.channelId).toBe(ANDROID_CHANNEL_ID);
      expect(arg.content.sound).toBe(true);
    }
  });
});
