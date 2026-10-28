import { createMockApi } from "../mocks/core";

const login = (api: ReturnType<typeof createMockApi>) => {
  const res = api.handle({ method: "POST", path: "/v1/auth/session", body: { shopify_access_token: "x" } });
  return { Authorization: `Bearer ${(res.body as { access_token: string }).access_token}` };
};
const scan = (api: ReturnType<typeof createMockApi>, headers: Record<string, string>, d: string, extra = {}) =>
  api.handle({
    method: "POST",
    path: "/v1/scans",
    headers,
    body: { tag_url: `https://links.lavi.example/t?d=${d}&c=x`, device_time: new Date().toISOString(), ...extra },
  }).body as { result: string; reason?: string };

describe("servidor simulado", () => {
  it("rechaza sin sesión y renueva tokens", () => {
    const api = createMockApi();
    expect(api.handle({ method: "GET", path: "/v1/me" }).status).toBe(401);
    const res = api.handle({ method: "POST", path: "/v1/auth/session", body: { shopify_access_token: "x" } });
    const { refresh_token } = res.body as { refresh_token: string };
    const refreshed = api.handle({ method: "POST", path: "/v1/auth/refresh", body: { refresh_token } });
    expect(refreshed.status).toBe(200);
    expect(api.handle({ method: "POST", path: "/v1/auth/refresh", body: { refresh_token } }).status).toBe(401);
  });

  it("emite todos los result del escaneo", () => {
    const api = createMockApi();
    const h = login(api);
    const cases: [string, string, string?][] = [
      ["sim_activation", "activation_required"],
      ["sim_recorded", "dose_recorded"],
      ["sim_too_early", "too_early"],
      ["sim_late", "late"],
      ["sim_no_pending", "no_pending_dose"],
      ["sim_finished", "treatment_finished"],
      ["sim_invalid_signature", "rejected", "invalid_signature"],
      ["sim_replayed", "rejected", "replayed"],
      ["sim_owned_by_other", "rejected", "owned_by_other"],
      ["sim_blocked", "rejected", "blocked"],
      ["sim_offline_expired", "rejected", "offline_expired"],
    ];
    for (const [d, result, reason] of cases) {
      const body = scan(api, h, d);
      expect(body.result).toBe(result);
      if (reason) expect(body.reason).toBe(reason);
    }
  });

  it("activa un tratamiento con el token y lo rechaza si venció", () => {
    const api = createMockApi();
    const h = login(api);
    const act = scan(api, h, "any") as unknown as { activation_token: string };
    const ok = api.handle({ method: "POST", path: "/v1/treatments", headers: h, body: { activation_token: act.activation_token, schedule_times: ["08:00"] } });
    expect(ok.status).toBe(200);
    const reuse = api.handle({ method: "POST", path: "/v1/treatments", headers: h, body: { activation_token: act.activation_token, schedule_times: ["08:00"] } });
    expect(reuse.status).toBe(410);
  });

  it("el canje es idempotente", () => {
    const api = createMockApi();
    const h = login(api);
    const req = { method: "POST", path: "/v1/redemptions", headers: { ...h, "idempotency-key": "k1" }, body: { option_id: "opt_10" } };
    const a = api.handle(req).body as { code: string };
    const b = api.handle(req).body as { code: string };
    expect(a.code).toBe(b.code);
    expect(api.state.balance).toBe(20);
  });
});
