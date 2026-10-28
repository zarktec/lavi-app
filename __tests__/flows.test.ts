/* eslint-disable import/first */
/* Flujos de lectura: handleTagUrl y la cola sin conexión, contra un backend simulado. */
import { createMockApi } from "../mocks/core";

const mockApi = createMockApi();
let online = true;

jest.mock("@/config/env", () => ({
  env: { apiUrl: "http://mock", linkDomain: "links.lavi.example", appEnv: "development", sentryDsn: "", shopify: {} },
  APP_VERSION: "1.0.0",
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissAll: jest.fn(), navigate: jest.fn() },
}));
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: jest.fn() }));

// Cola en memoria (sustituye a SQLite).
const mockQueue: { id: number; tag_url: string; device_time: string; created_at: string; attempts: number; last_error: string | null }[] = [];
let mockQid = 1;
jest.mock("@/offline/queue", () => ({
  enqueueScan: jest.fn(async (tag_url: string, device_time: string) => {
    mockQueue.push({ id: mockQid++, tag_url, device_time, created_at: "", attempts: 0, last_error: null });
  }),
  listPending: jest.fn(async () => [...mockQueue]),
  removePending: jest.fn(async (id: number) => {
    mockQueue.splice(mockQueue.findIndex((q) => q.id === id), 1);
  }),
  markAttempt: jest.fn(async (id: number) => {
    mockQueue.find((q) => q.id === id)!.attempts += 1;
  }),
  loadPendingCount: jest.fn(async () => {}),
  backoffMs: () => 1_000_000,
}));
jest.mock("@/api/queryClient", () => ({ invalidateProgress: jest.fn(async () => {}), queryClient: {} }));
jest.mock("@/notifications/syncReminders", () => ({
  syncReminders: jest.fn(async () => {}),
  cancelDoseNudges: jest.fn(async () => {}),
}));
jest.mock("@/auth/tokens", () => ({
  getToken: jest.fn(async (k: string) => (k === "access" ? (mockApi.state.accessToken ?? "none") : "r")),
  setToken: jest.fn(async () => {}),
}));

import { router } from "expo-router";
import { handleTagUrl, __resetDeduper } from "@/nfc/handleTagUrl";
import { cancelScheduledRetry, flushQueue } from "@/offline/sync";
import { useSessionStore } from "@/store/session";
import { useUiStore } from "@/store/ui";

// fetch → servidor simulado; sin conexión lanza error de red.
beforeAll(() => {
  global.fetch = (async (input: Request | string, init?: RequestInit) => {
    if (!online) throw new TypeError("Network request failed");
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    const text = await req.text();
    const out = mockApi.handle({
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(req.headers),
      body: text ? JSON.parse(text) : undefined,
    });
    return new Response(out.body === undefined ? null : JSON.stringify(out.body), {
      status: out.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
});

const tag = (d: string) => `https://links.lavi.example/t?d=${d}&c=x`;

afterAll(() => cancelScheduledRetry());

beforeEach(async () => {
  online = true;
  mockQueue.length = 0;
  __resetDeduper();
  jest.clearAllMocks();
  useUiStore.setState({ outcome: null, pendingTagUrl: null, notices: [] });
  mockApi.handle({ method: "POST", path: "/v1/auth/session", body: { shopify_access_token: "x" } });
  useSessionStore.setState({ status: "signedIn" });
});

describe("handleTagUrl", () => {
  it("un tag de otro dominio muestra «no pertenece» sin llamar al servidor", async () => {
    await handleTagUrl("https://otra.com/t?d=a&c=b");
    expect(useUiStore.getState().outcome).toEqual({ kind: "invalid_tag" });
    expect(router.push).toHaveBeenCalledWith("/scan/result");
    expect(mockApi.state.scansLog).toHaveLength(0);
  });

  it("envía a POST /v1/scans y muestra el result", async () => {
    await handleTagUrl(tag("sim_too_early"));
    const o = useUiStore.getState().outcome;
    expect(o).toMatchObject({ kind: "api", response: { result: "too_early" } });
  });

  it("ignora la misma URL dos veces en menos de 5 s", async () => {
    const before = mockApi.state.scansLog.length;
    await handleTagUrl(tag("sim_late"));
    await handleTagUrl(tag("sim_late"));
    expect(mockApi.state.scansLog.length - before).toBe(1);
  });

  it("sin sesión guarda la URL y lleva al login", async () => {
    useSessionStore.setState({ status: "signedOut" });
    await handleTagUrl(tag("sim_late"));
    expect(useUiStore.getState().pendingTagUrl).toBe(tag("sim_late"));
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("sin conexión guarda la lectura en la cola y muestra «lectura guardada»", async () => {
    online = false;
    await handleTagUrl(tag("sim_recorded"));
    expect(mockQueue).toHaveLength(1);
    expect(useUiStore.getState().outcome).toEqual({ kind: "saved_offline" });
  });
});

describe("cola sin conexión", () => {
  it("sincroniza en orden al recuperar la red, con offline:true, y vacía la cola", async () => {
    online = false;
    await handleTagUrl(tag("sim_recorded"));
    __resetDeduper();
    await handleTagUrl(tag("sim_late"));
    expect(mockQueue).toHaveLength(2);

    online = true;
    const before = mockApi.state.scansLog.length;
    await flushQueue();
    expect(mockQueue).toHaveLength(0);
    const sent = mockApi.state.scansLog.slice(before);
    expect(sent.map((s) => new URL(s.tag_url).searchParams.get("d"))).toEqual(["sim_recorded", "sim_late"]);
    expect(sent.every((s) => s.offline === true)).toBe(true);
    expect(useUiStore.getState().notices.length).toBe(2);
  });

  it("ante un fallo de red conserva la lectura y se detiene", async () => {
    online = false;
    await handleTagUrl(tag("sim_recorded"));
    await flushQueue();
    expect(mockQueue).toHaveLength(1);
    expect(mockQueue[0].attempts).toBe(1);
  });

  it("una respuesta rejected también saca la lectura de la cola", async () => {
    online = false;
    await handleTagUrl(tag("sim_offline_expired"));
    online = true;
    await flushQueue();
    expect(mockQueue).toHaveLength(0);
  });
});
