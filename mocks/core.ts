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

  const product = { id: "prod_1", name: "Serum Lavi" };
  const variant = { id: "var_30", name: "30 ml", volume_ml: 30, shopify_variant_id: "1" };
  const TZ_OFFSET_H = 5; // Bogotá (UTC-5)
  const NUDGES = [20, 40];

  // Hora local de Bogotá (UTC-5): "08:00" del día d → instante UTC.
  const at = (dayMs: number, hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(dayMs);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h + TZ_OFFSET_H, m);
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
          window_start: new Date(opens).toISOString(),
          window_end: new Date(closes).toISOString(),
          status: past ? (day % 4 === 0 ? "missed" : day % 3 === 0 ? "late" : "on_time") : "scheduled",
          recorded_at: null,
        });
      }
    }
    return doses.sort((a, b) => a.window_start.localeCompare(b.window_start));
  }

  function startTreatment(times: string[]) {
    const startedAt = now();
    state.treatment = { id: id("trt"), scheduleTimes: times, startedAt, doses: buildDoses(times, startedAt), changesLeft: 2 };
  }

  const windowOf = (d: any) => ({ id: d.id, window_start: d.window_start, window_end: d.window_end });
  /** Ventana abierta o, si no hay, la próxima programada. */
  function nextDose() {
    return state.treatment?.doses.find((d) => d.status === "scheduled" && new Date(d.window_end).getTime() >= now()) ?? null;
  }
  /** Siguiente dosis programada que abre después de `after` (como `nextDose` del backend). */
  function nextAfter(after: number) {
    const d = state.treatment?.doses.find((x) => x.status === "scheduled" && new Date(x.window_start).getTime() > after);
    return d ? windowOf(d) : null;
  }

  function summary() {
    const t = state.treatment!;
    const count = (st: string) => t.doses.filter((d) => d.status === st).length;
    const last = t.doses[t.doses.length - 1];
    const daysLeft = Math.max(0, Math.ceil((new Date(last.window_end).getTime() - now()) / 86_400_000));
    return {
      id: t.id,
      tag_uid: "04A1B2C3D4E5F6",
      status: "active",
      start_date: new Date(t.startedAt).toISOString().slice(0, 10),
      end_date: new Date(last.window_end).toISOString().slice(0, 10),
      reminder_times: t.scheduleTimes,
      points_earned: 30,
      product,
      variant,
      config: {
        id: "cfg_1",
        version: 1,
        doses_per_day: t.scheduleTimes.length,
        duration_days: 14,
        points_per_dose: 10,
        window_minutes_before: 30,
        window_minutes_after: 90,
        reminder_nudges: NUDGES,
        schedule_change_min_notice_hours: 24,
        schedule_change_max_count: 2,
        schedule_change_period_days: 30,
      },
      progress: { total: t.doses.length, on_time: count("on_time"), late: count("late"), missed: count("missed") },
      schedule_changes_left: t.changesLeft,
      days_left: daysLeft,
      repurchase_suggested: daysLeft <= 7,
      created_at: new Date(t.startedAt).toISOString(),
      finished_at: null,
    };
  }
  const treatmentView = () => ({ ...summary(), doses: state.treatment!.doses });

  function recordDose(dose: any, deviceTime: number) {
    dose.status = "on_time";
    dose.recorded_at = new Date(deviceTime).toISOString();
    const completed = !state.treatment!.doses.some((d) => d.status === "scheduled");
    state.streak += 1;
    const bonus = state.streak % 7 === 0 ? 10 : 0;
    const earned = 10;
    state.balance += earned + bonus;
    state.ledger.unshift({ id: id("led"), amount: earned, reason: "dose_on_time", reference_type: "dose", expires_at: null, created_at: new Date(now()).toISOString() });
    if (bonus) state.ledger.unshift({ id: id("led"), amount: bonus, reason: "streak_bonus", reference_type: "dose", expires_at: null, created_at: new Date(now()).toISOString() });
    return {
      result: "dose_recorded",
      dose_id: dose.id,
      points_earned: earned,
      bonus_points: bonus,
      streak: state.streak,
      balance: state.balance,
      next_dose: nextAfter(deviceTime),
      treatment_completed: completed,
    };
  }

  function scan(body: any): MockResponse {
    const url = new URL(body.tag_url);
    const d = url.searchParams.get("d") ?? "";
    state.scansLog.push(body);
    const deviceTime = body.device_time ? new Date(body.device_time).getTime() : now();
    const forced = d.startsWith("sim_") ? d.slice(4) : null;

    const activation = () => {
      const token = id("act");
      state.activationTokens.add(token);
      return {
        result: "activation_required",
        activation_token: token,
        expires_in: 900,
        product,
        variant,
        suggested_times: ["08:00", "20:00"],
        config: { doses_per_day: 2, duration_days: 14, points_per_dose: 10, window_minutes_before: 30, window_minutes_after: 90, schedule_change_min_notice_hours: 24 },
      };
    };
    const sampleWindow = (hours: number) => ({ id: "dose_next", window_start: new Date(now() + hours * 3_600_000).toISOString(), window_end: new Date(now() + (hours + 2) * 3_600_000).toISOString() });
    const nxt = nextDose();
    const rejected = (reason: string) => ({ result: "rejected", reason });

    switch (forced) {
      case "activation": return { status: 200, body: activation() };
      case "recorded": return { status: 200, body: { result: "dose_recorded", dose_id: "dose_x", points_earned: 10, bonus_points: 5, streak: 7, balance: 135, next_dose: sampleWindow(12), treatment_completed: false } };
      case "too_early": return { status: 200, body: { result: "too_early", opens_at: new Date(now() + 3 * 3_600_000).toISOString(), window_end: new Date(now() + 5 * 3_600_000).toISOString(), dose_id: "dose_x" } };
      case "late": return { status: 200, body: { result: "late", dose_id: "dose_x", points_earned: 0, balance: 120, next_dose: sampleWindow(12), treatment_completed: false } };
      case "no_pending": return { status: 200, body: { result: "no_pending_dose", next_dose: sampleWindow(12) } };
      case "finished": return { status: 200, body: { result: "treatment_finished", treatment_id: state.treatment?.id ?? null, repurchase_suggested: true } };
      case "invalid_signature": return { status: 200, body: rejected("invalid_signature") };
      case "replayed": return { status: 200, body: rejected("replayed") };
      case "owned_by_other": return { status: 200, body: rejected("owned_by_other") };
      case "blocked": return { status: 200, body: rejected("blocked") };
      case "offline_expired": return { status: 200, body: rejected("offline_expired") };
      case "unknown": return { status: 200, body: { result: "brand_new_result" } };
    }

    if (body.offline && now() - deviceTime > 24 * 3_600_000) return { status: 200, body: rejected("offline_expired") };
    if (!state.treatment) return { status: 200, body: activation() };
    if (!nxt) return { status: 200, body: { result: "no_pending_dose", next_dose: null } };
    const opens = new Date(nxt.window_start).getTime();
    const closes = new Date(nxt.window_end).getTime();
    if (deviceTime < opens) return { status: 200, body: { result: "too_early", opens_at: nxt.window_start, window_end: nxt.window_end, dose_id: nxt.id } };
    if (deviceTime > closes) return { status: 200, body: { result: "late", dose_id: nxt.id, points_earned: 0, balance: state.balance, next_dose: nextAfter(now()), treatment_completed: false } };
    return { status: 200, body: recordDose(nxt, deviceTime) };
  }

  const options = [
    { id: "00000000-0000-4000-8000-000000000010", name: "10% de descuento", points_cost: 100, reward_type: "percentage", reward_value: 10 },
    { id: "00000000-0000-4000-8000-000000000020", name: "$20.000 de descuento", points_cost: 250, reward_type: "fixed_amount", reward_value: 20000 },
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
          notification_texts: {
            reminder_title: "Es hora de tu aplicación",
            reminder_body: "Aplica {product} y acerca tu teléfono al frasco para sumar puntos.",
            nudge_body: "Aún no registras tu aplicación de {product}. ¡Acerca tu teléfono al frasco!",
            backup_title: "¿Ya te aplicaste {product}?",
            backup_body: "Tu ventana sigue abierta: acerca el teléfono al frasco para registrar tu dosis.",
            repurchase_title: "Tu tratamiento está por terminar",
            repurchase_body: "Reordena {product} a tiempo para no interrumpir tu progreso.",
          },
          settings: { point_value_cop: 50, min_points_to_redeem: 100, points_expiration_days: 365, offline_scan_max_hours: 24, allow_parallel_treatments: false },
          links: { ios_store_url: "https://apps.apple.com/app/lavi", android_store_url: "https://play.google.com/store/apps/details?id=com.lavi.app", app_domain: "links.lavi.example" },
        },
      };
    }
    if (method === "POST" && path === "/v1/auth/session") {
      if (!req.body?.shopify_access_token) return err(400, "invalid_request", "Falta el token de Shopify");
      state.accessToken = id("at");
      state.refreshToken = id("rt");
      if (req.body.timezone) state.user.timezone = req.body.timezone;
      if (opts.seed) startTreatment(["08:00", "20:00"]);
      return { status: 200, body: { access_token: state.accessToken, refresh_token: state.refreshToken, expires_in: 900, user_id: state.user.id, needs_data_consent: !req.body.data_consent } };
    }
    if (method === "POST" && path === "/v1/auth/refresh") {
      if (req.body?.refresh_token !== state.refreshToken) return err(401, "invalid_refresh", "Sesión vencida");
      state.accessToken = id("at");
      state.refreshToken = id("rt");
      return { status: 200, body: { access_token: state.accessToken, refresh_token: state.refreshToken, expires_in: 900 } };
    }
    if (method === "DELETE" && path === "/v1/auth/session") {
      if (!(req.headers?.["x-refresh-token"] ?? req.headers?.["X-Refresh-Token"])) return err(400, "missing_refresh_token", "Falta el encabezado X-Refresh-Token");
      state.accessToken = null;
      state.refreshToken = null;
      return { status: 204 };
    }
    if (method === "POST" && path === "/v1/devices") {
      const dev = id("dev");
      state.devices.set(dev, req.body.push_token);
      return { status: 201, body: { id: dev } };
    }
    if (method === "DELETE" && path.startsWith("/v1/devices/")) {
      state.devices.delete(path.split("/").pop()!);
      return { status: 204 };
    }
    if (path === "/v1/me") {
      if (method === "GET") return { status: 200, body: { ...state.user, balance: state.balance, data_consent_at: null, created_at: "2026-10-01T00:00:00Z" } };
      if (method === "PATCH") {
        const { accept_data_policy: _a, ...patch } = req.body ?? {};
        Object.assign(state.user, patch);
        return { status: 200, body: { ...state.user, balance: state.balance } };
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
        items.push(summary());
      }
      return { status: 200, body: { treatments: [...items, ...state.finishedTreatments] } };
    }
    if (method === "POST" && path === "/v1/treatments") {
      const { activation_token, reminder_times } = req.body ?? {};
      if (!state.activationTokens.has(activation_token)) return err(400, "activation_token_invalid", "El token de activación venció o no es válido");
      state.activationTokens.delete(activation_token);
      startTreatment(reminder_times ?? ["08:00", "20:00"]);
      return { status: 201, body: treatmentView() };
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
      if (t.changesLeft <= 0) return err(409, "schedule_change_limit", "Alcanzaste el límite de cambios de horario para este periodo");
      t.changesLeft -= 1;
      t.scheduleTimes = req.body.reminder_times;
      const effective = now() + 24 * 3_600_000;
      t.doses = [...t.doses.filter((d) => new Date(d.window_start).getTime() < effective), ...buildDoses(t.scheduleTimes, t.startedAt).filter((d) => new Date(d.window_start).getTime() >= effective)];
      return { status: 200, body: treatmentView() };
    }
    if (method === "GET" && path === "/v1/points") {
      return { status: 200, body: { balance: state.balance, value_cop: state.balance * 50, upcoming_expirations: [{ date: new Date(now() + 30 * 86_400_000).toISOString().slice(0, 10), amount: 20 }] } };
    }
    if (method === "GET" && path === "/v1/points/ledger") {
      const limit = Number(req.query?.limit ?? 20);
      const start = Number(req.query?.before ?? 0);
      const entries = state.ledger.slice(start, start + limit);
      const next = start + limit < state.ledger.length ? String(start + limit) : null;
      return { status: 200, body: { entries, next_before: next } };
    }
    if (method === "GET" && path === "/v1/redemptions/options") {
      return { status: 200, body: { balance: state.balance, min_points_to_redeem: 100, options: options.map((o) => ({ ...o, affordable: state.balance >= Math.max(o.points_cost, 100) })) } };
    }
    if (method === "GET" && path === "/v1/redemptions") return { status: 200, body: { redemptions: state.redemptions } };
    if (method === "POST" && path === "/v1/redemptions") {
      const key = req.headers?.["idempotency-key"] ?? req.headers?.["Idempotency-Key"];
      if (!key) return err(400, "idempotency_key_required", "Falta Idempotency-Key");
      if (state.idempotency.has(key)) return { status: 201, body: state.idempotency.get(key) };
      const option = options.find((o) => o.id === req.body?.option_id);
      if (!option) return err(404, "not_found", "Opción no encontrada");
      if (state.balance < 100) return err(409, "below_minimum", "Necesitas al menos 100 puntos para redimir");
      if (state.balance < option.points_cost) return err(409, "insufficient_points", "No tienes puntos suficientes");
      state.balance -= option.points_cost;
      state.ledger.unshift({ id: id("led"), amount: -option.points_cost, reason: "redemption", reference_type: "redemption", expires_at: null, created_at: new Date(now()).toISOString() });
      const redemption = { id: id("red"), option_id: option.id, option_name: option.name, reward_type: option.reward_type, points: option.points_cost, code: `LAVI${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: "issued", expires_at: new Date(now() + 30 * 86_400_000).toISOString(), used_at: null, created_at: new Date(now()).toISOString() };
      state.redemptions.unshift(redemption);
      state.idempotency.set(key, redemption);
      return { status: 201, body: redemption };
    }
    return err(404, "not_found", `Ruta no encontrada: ${method} ${path}`);
  }

  return { handle, state, startTreatment };
}
