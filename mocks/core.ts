/**
 * Servidor simulado de la API /v1 (derivado de api/openapi.yaml).
 * Lógica independiente del transporte: lo usan MSW (pruebas) y server.ts (desarrollo).
 *
 * Para forzar un `result` en el escaneo, usar un tag con d=sim_<caso>:
 *   activation, recorded, too_early, late, no_pending, finished,
 *   invalid_signature, replayed, owned_by_other, blocked, offline_expired, unknown
 */
export type MockRequest = {
  method: string;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string | undefined>;
  body?: any;
};
export type MockResponse = { status: number; body?: unknown };

const MIN = 60_000;
const err = (status: number, code: string, message: string): MockResponse => ({
  status,
  body: { error: { code, message } },
});

export function createMockApi(opts: { now?: () => number; seed?: boolean } = {}) {
  const now = opts.now ?? Date.now;
  let seq = 1;
  const id = (p: string) => `${p}_${seq++}`;

  const state = {
    minAppVersion: "1.0.0",
    user: { id: "usr_1", name: "Ana Pérez", email: "ana@example.com", phone: null as string | null, timezone: "America/Bogota" },
    refreshToken: null as string | null,
    accessToken: null as string | null,
    devices: new Map<string, string>(),
    treatment: null as null | {
      id: string;
      scheduleTimes: string[];
      startedAt: number;
      doses: any[];
      changesLeft: number;
    },
    finishedTreatments: [] as any[],
    balance: 120,
    streak: 3,
    ledger: [] as any[],
    redemptions: [] as any[],
    idempotency: new Map<string, any>(),
    activationTokens: new Set<string>(),
    scansLog: [] as any[],
  };

  const product = {
    id: "prod_1",
    name: "Serum Lavi",
    presentation: { id: "pres_30", name: "30 ml", shopify_variant_id: "gid://shopify/ProductVariant/1" },
  };

  // Hora local de Bogotá (UTC-5): "08:00" del día d → instante UTC.
  const at = (dayMs: number, hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(dayMs);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h + 5, m);
  };

  function buildDoses(times: string[], startedAt: number, days = 14) {
    const doses: any[] = [];
    for (let day = -3; day < days; day++) {
      for (const hhmm of times) {
        const scheduled = at(startedAt + day * 86_400_000, hhmm);
        const opens = scheduled - 30 * MIN;
        const closes = scheduled + 90 * MIN;
        const past = closes < now();
        doses.push({
          id: id("dose"),
          scheduled_at: new Date(scheduled).toISOString(),
          window_opens_at: new Date(opens).toISOString(),
          window_closes_at: new Date(closes).toISOString(),
          status: past ? (day % 4 === 0 ? "missed" : day % 3 === 0 ? "late" : "on_time") : "pending",
          recorded_at: null,
        });
      }
    }
    return doses.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }

  function startTreatment(times: string[]) {
    const startedAt = now();
    state.treatment = { id: id("trt"), scheduleTimes: times, startedAt, doses: buildDoses(times, startedAt), changesLeft: 2 };
  }

  function nextDose() {
    return state.treatment?.doses.find((d) => d.status === "pending" && new Date(d.window_closes_at).getTime() >= now()) ?? null;
  }

  function treatmentView() {
    const t = state.treatment!;
    const lastDose = t.doses[t.doses.length - 1];
    return {
      id: t.id,
      status: "active",
      product,
      started_at: new Date(t.startedAt).toISOString(),
      ends_at: lastDose?.scheduled_at ?? null,
      next_dose: nextDose(),
      adherence_percent: 80,
      schedule_times: t.scheduleTimes,
      doses: t.doses,
      reminder_nudges: [{ offset_minutes: 30 }, { offset_minutes: 60 }],
      schedule_changes_left: t.changesLeft,
      ending_soon: false,
    };
  }

  function recordDose(dose: any, deviceTime: number) {
    dose.status = "on_time";
    dose.recorded_at = new Date(deviceTime).toISOString();
    state.streak += 1;
    const bonus = state.streak % 7 === 0 ? 10 : 0;
    const earned = 10;
    state.balance += earned + bonus;
    state.ledger.unshift({ id: id("led"), points: earned, reason: "dose", description: "Aplicación a tiempo", created_at: new Date(now()).toISOString() });
    if (bonus) state.ledger.unshift({ id: id("led"), points: bonus, reason: "streak", description: "Bono de racha", created_at: new Date(now()).toISOString() });
    const nxt = nextDose();
    return {
      result: "dose_recorded",
      dose_id: dose.id,
      points_earned: earned,
      streak_bonus: bonus,
      streak: state.streak,
      balance: state.balance,
      next_dose_at: nxt?.scheduled_at ?? null,
    };
  }

  function scan(body: any): MockResponse {
    const url = new URL(body.tag_url);
    const d = url.searchParams.get("d") ?? "";
    state.scansLog.push(body);
    const deviceTime = new Date(body.device_time).getTime();
    const forced = d.startsWith("sim_") ? d.slice(4) : null;

    const activation = () => {
      const token = id("act");
      state.activationTokens.add(token);
      return {
        result: "activation_required",
        activation_token: token,
        product,
        suggested_schedule: ["08:00", "20:00"],
      };
    };
    const nxt = nextDose();
    const rejected = (reason: string) => ({ result: "rejected", reason });

    switch (forced) {
      case "activation": return { status: 200, body: activation() };
      case "recorded": return { status: 200, body: { result: "dose_recorded", points_earned: 10, streak_bonus: 5, streak: 7, balance: 135, next_dose_at: new Date(now() + 12 * 3_600_000).toISOString() } };
      case "too_early": return { status: 200, body: { result: "too_early", window_opens_at: new Date(now() + 3 * 3_600_000).toISOString() } };
      case "late": return { status: 200, body: { result: "late", next_dose_at: new Date(now() + 12 * 3_600_000).toISOString() } };
      case "no_pending": return { status: 200, body: { result: "no_pending_dose", next_dose_at: new Date(now() + 12 * 3_600_000).toISOString() } };
      case "finished": return { status: 200, body: { result: "treatment_finished", summary: { doses_total: 60, doses_on_time: 54, adherence_percent: 90 } } };
      case "invalid_signature": return { status: 200, body: rejected("invalid_signature") };
      case "replayed": return { status: 200, body: rejected("replayed") };
      case "owned_by_other": return { status: 200, body: rejected("owned_by_other") };
      case "blocked": return { status: 200, body: rejected("blocked") };
      case "offline_expired": return { status: 200, body: rejected("offline_expired") };
      case "unknown": return { status: 200, body: { result: "brand_new_result" } };
    }

    if (body.offline && now() - deviceTime > 24 * 3_600_000) return { status: 200, body: rejected("offline_expired") };
    if (!state.treatment) return { status: 200, body: activation() };
    if (!nxt) return { status: 200, body: { result: "no_pending_dose", next_dose_at: null } };
    const opens = new Date(nxt.window_opens_at).getTime();
    const closes = new Date(nxt.window_closes_at).getTime();
    if (deviceTime < opens) return { status: 200, body: { result: "too_early", window_opens_at: nxt.window_opens_at } };
    if (deviceTime > closes) return { status: 200, body: { result: "late", next_dose_at: nxt.scheduled_at } };
    return { status: 200, body: recordDose(nxt, deviceTime) };
  }

  const options = [
    { id: "opt_10", name: "10% de descuento", description: "En tu próxima compra", cost_points: 100 },
    { id: "opt_20", name: "20% de descuento", description: "En tu próxima compra", cost_points: 250 },
  ];

  function handle(req: MockRequest): MockResponse {
    const { method, path } = req;
    const auth = req.headers?.authorization ?? req.headers?.Authorization;
    const isPublic =
      path === "/v1/config/app" || path === "/v1/auth/session" && method === "POST" || path === "/v1/auth/refresh";
    if (!isPublic && auth !== `Bearer ${state.accessToken}`) return err(401, "unauthorized", "Sesión inválida");

    if (method === "GET" && path === "/v1/config/app") {
      return {
        status: 200,
        body: {
          min_app_version: state.minAppVersion,
          repurchase_reminder_days: 7,
          support_email: "soporte@lavi.example",
          privacy_policy_url: "https://lavi.example/privacidad",
          terms_url: "https://lavi.example/terminos",
          store_urls: { ios: "https://apps.apple.com/app/lavi", android: "https://play.google.com/store/apps/details?id=com.lavi.app" },
          texts: {},
        },
      };
    }
    if (method === "POST" && path === "/v1/auth/session") {
      if (!req.body?.shopify_access_token) return err(400, "invalid_request", "Falta el token de Shopify");
      state.accessToken = id("at");
      state.refreshToken = id("rt");
      if (req.body.timezone) state.user.timezone = req.body.timezone;
      if (opts.seed) startTreatment(["08:00", "20:00"]);
      return { status: 200, body: { access_token: state.accessToken, refresh_token: state.refreshToken, expires_in: 900 } };
    }
    if (method === "POST" && path === "/v1/auth/refresh") {
      if (req.body?.refresh_token !== state.refreshToken) return err(401, "invalid_refresh", "Sesión vencida");
      state.accessToken = id("at");
      state.refreshToken = id("rt");
      return { status: 200, body: { access_token: state.accessToken, refresh_token: state.refreshToken, expires_in: 900 } };
    }
    if (method === "DELETE" && path === "/v1/auth/session") {
      state.accessToken = null;
      state.refreshToken = null;
      return { status: 204 };
    }
    if (method === "POST" && path === "/v1/devices") {
      const dev = id("dev");
      state.devices.set(dev, req.body.expo_push_token);
      return { status: 200, body: { id: dev } };
    }
    if (method === "DELETE" && path.startsWith("/v1/devices/")) {
      state.devices.delete(path.split("/").pop()!);
      return { status: 204 };
    }
    if (path === "/v1/me") {
      if (method === "GET") return { status: 200, body: state.user };
      if (method === "PATCH") {
        Object.assign(state.user, req.body);
        return { status: 200, body: state.user };
      }
      if (method === "DELETE") {
        state.accessToken = null;
        state.refreshToken = null;
        state.treatment = null;
        return { status: 204 };
      }
    }
    if (method === "POST" && path === "/v1/scans") return scan(req.body);

    if (method === "GET" && path === "/v1/treatments") {
      const items: any[] = [];
      if (state.treatment) {
        const { doses: _d, reminder_nudges: _r, schedule_times: _s, schedule_changes_left: _c, ...summary } = treatmentView();
        items.push(summary);
      }
      return { status: 200, body: { items: [...items, ...state.finishedTreatments] } };
    }
    if (method === "POST" && path === "/v1/treatments") {
      const { activation_token, schedule_times } = req.body ?? {};
      if (!state.activationTokens.has(activation_token)) return err(410, "activation_expired", "La activación venció. Vuelve a leer el frasco.");
      state.activationTokens.delete(activation_token);
      startTreatment(schedule_times);
      return { status: 200, body: treatmentView() };
    }
    let m = path.match(/^\/v1\/treatments\/([^/]+)$/);
    if (method === "GET" && m) {
      if (!state.treatment || state.treatment.id !== m[1]) return err(404, "not_found", "Tratamiento no encontrado");
      return { status: 200, body: treatmentView() };
    }
    m = path.match(/^\/v1\/treatments\/([^/]+)\/schedule$/);
    if (method === "PATCH" && m) {
      const t = state.treatment;
      if (!t || t.id !== m[1]) return err(404, "not_found", "Tratamiento no encontrado");
      if (t.changesLeft <= 0) return err(409, "no_changes_left", "Ya no te quedan cambios de horario en este periodo");
      t.changesLeft -= 1;
      t.scheduleTimes = req.body.schedule_times;
      const effective = now() + 24 * 3_600_000;
      t.doses = [...t.doses.filter((d) => new Date(d.scheduled_at).getTime() < effective), ...buildDoses(t.scheduleTimes, t.startedAt).filter((d) => new Date(d.scheduled_at).getTime() >= effective)];
      return { status: 200, body: { schedule_times: t.scheduleTimes, effective_from: new Date(effective).toISOString(), changes_left: t.changesLeft } };
    }
    if (method === "GET" && path === "/v1/points") {
      return { status: 200, body: { balance: state.balance, streak: state.streak, expiring: [{ points: 20, expires_at: new Date(now() + 30 * 86_400_000).toISOString() }] } };
    }
    if (method === "GET" && path === "/v1/points/ledger") {
      const limit = Number(req.query?.limit ?? 20);
      const start = Number(req.query?.cursor ?? 0);
      const items = state.ledger.slice(start, start + limit);
      const next = start + limit < state.ledger.length ? String(start + limit) : null;
      return { status: 200, body: { items, next_cursor: next } };
    }
    if (method === "GET" && path === "/v1/redemptions/options") return { status: 200, body: { items: options } };
    if (method === "GET" && path === "/v1/redemptions") return { status: 200, body: { items: state.redemptions } };
    if (method === "POST" && path === "/v1/redemptions") {
      const key = req.headers?.["idempotency-key"] ?? req.headers?.["Idempotency-Key"];
      if (!key) return err(400, "idempotency_key_required", "Falta Idempotency-Key");
      if (state.idempotency.has(key)) return { status: 200, body: state.idempotency.get(key) };
      const option = options.find((o) => o.id === req.body?.option_id);
      if (!option) return err(404, "not_found", "Opción no encontrada");
      if (state.balance < option.cost_points) return err(409, "insufficient_points", "No tienes puntos suficientes");
      state.balance -= option.cost_points;
      state.ledger.unshift({ id: id("led"), points: -option.cost_points, reason: "redemption", description: option.name, created_at: new Date(now()).toISOString() });
      const redemption = { id: id("red"), code: `LAVI${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: "active", option, created_at: new Date(now()).toISOString(), expires_at: null };
      state.redemptions.unshift(redemption);
      state.idempotency.set(key, redemption);
      return { status: 200, body: redemption };
    }
    return err(404, "not_found", `Ruta no encontrada: ${method} ${path}`);
  }

  return { handle, state, startTreatment };
}
