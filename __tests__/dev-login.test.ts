/* eslint-disable import/first */
const mockLogin = jest.fn();
const mockCreateSession = jest.fn(async (_body: unknown) => ({ access_token: "a", refresh_token: "r", needs_data_consent: false, user_id: "u1" }));

jest.mock("@/config/env", () => ({
  env: { devLogin: true, appEnv: "development", linkDomain: "x", apiUrl: "http://mock", sentryDsn: "", shopify: {} },
  APP_VERSION: "1.0.0",
}));
jest.mock("@/auth/shopifyAuth", () => ({ loginWithShopify: () => mockLogin() }));
jest.mock("@/api/endpoints", () => ({
  endpoints: {
    createSession: (b: unknown) => mockCreateSession(b),
    me: async () => ({ id: "u1", timezone: "America/Bogota", balance: 0 }),
    updateMe: jest.fn(),
    registerDevice: jest.fn(),
  },
}));
jest.mock("@/auth/tokens", () => ({
  getToken: jest.fn(async () => null),
  setToken: jest.fn(async () => {}),
  deleteToken: jest.fn(async () => {}),
  clearSessionTokens: jest.fn(async () => {}),
}));
jest.mock("@/api/client", () => ({ setAuthFailureHandler: jest.fn() }));
jest.mock("@/api/queryClient", () => ({
  queryClient: { setQueryData: jest.fn(), clear: jest.fn() },
  sqlitePersister: { removeClient: jest.fn() },
}));
jest.mock("@/lib/db", () => ({ kvGet: jest.fn(async () => null), kvSet: jest.fn(async () => {}) }));
jest.mock("@/analytics", () => ({ setAnalyticsConsent: jest.fn(), loadConsent: jest.fn() }));
jest.mock("@/nfc/handleTagUrl", () => ({ handleTagUrl: jest.fn() }));
jest.mock("@/notifications/syncReminders", () => ({ cancelAllReminders: jest.fn(), syncReminders: jest.fn() }));
jest.mock("@/notifications/setup", () => ({ getExpoPushToken: jest.fn(async () => null) }));
jest.mock("@/offline/queue", () => ({ clearPending: jest.fn(), loadPendingCount: jest.fn() }));
jest.mock("@/offline/sync", () => ({ flushQueue: jest.fn(async () => {}) }));
jest.mock("@/lib/sentry", () => ({ setSentryUser: jest.fn() }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));

import { signIn } from "@/auth/session";

describe("modo de prueba sin Shopify", () => {
  it("no abre Shopify y crea la sesión con un token de prueba", async () => {
    await signIn({ acceptedAnalytics: true });
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockCreateSession).toHaveBeenCalledWith(expect.objectContaining({ shopify_access_token: "dev-login-token" }));
  });
});
