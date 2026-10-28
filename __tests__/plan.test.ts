import type { Dose } from "@/api/types";
import { MAX_SCHEDULED, planReminders } from "@/notifications/plan";

const now = new Date("2026-10-28T12:00:00Z");
const dose = (i: number, status: Dose["status"] = "pending"): Dose => {
  const sched = now.getTime() + i * 3_600_000;
  return {
    id: `d${i}`,
    scheduled_at: new Date(sched).toISOString(),
    window_opens_at: new Date(sched - 30 * 60_000).toISOString(),
    window_closes_at: new Date(sched + 90 * 60_000).toISOString(),
    status,
  };
};

describe("planReminders", () => {
  it("solo programa dosis pendientes futuras, con sus insistencias", () => {
    const plan = planReminders(
      [dose(2), dose(3, "on_time")],
      [{ offset_minutes: 30 }, { offset_minutes: 60 }],
      now,
    );
    expect(plan.map((p) => `${p.doseId}:${p.kind}`)).toEqual(["d2:dose", "d2:nudge", "d2:nudge"]);
    expect(plan[0].at.getTime()).toBeLessThan(plan[1].at.getTime());
  });
  it("no programa insistencias después de cerrada la ventana", () => {
    const plan = planReminders([dose(2)], [{ offset_minutes: 500 }], now);
    expect(plan).toHaveLength(1);
  });
  it("nunca supera 50 notificaciones", () => {
    const doses = Array.from({ length: 100 }, (_, i) => dose(i + 1));
    const plan = planReminders(doses, [{ offset_minutes: 20 }, { offset_minutes: 40 }], now, 30);
    expect(plan.length).toBe(MAX_SCHEDULED);
    const times = plan.map((p) => p.at.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
  it("respeta el horizonte de días", () => {
    const far: Dose = { ...dose(24 * 10) };
    expect(planReminders([far], [], now, 7)).toHaveLength(0);
  });
});
