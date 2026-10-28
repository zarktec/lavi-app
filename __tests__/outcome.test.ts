import { outcomeView } from "@/nfc/outcome";
import type { ScanOutcome } from "@/store/ui";

const api = (result: string, reason?: string): ScanOutcome => ({
  kind: "api",
  response: { result, reason } as never,
});

describe("outcomeView", () => {
  it.each([
    ["activation_required", undefined, "activation"],
    ["dose_recorded", undefined, "recorded"],
    ["too_early", undefined, "too_early"],
    ["late", undefined, "late"],
    ["no_pending_dose", undefined, "no_pending"],
    ["treatment_finished", undefined, "finished"],
    ["rejected", "invalid_signature", "rejected_signature"],
    ["rejected", "replayed", "rejected_signature"],
    ["rejected", "owned_by_other", "rejected_owned"],
    ["rejected", "blocked", "rejected_blocked"],
    ["rejected", "offline_expired", "rejected_expired"],
    ["algo_nuevo", undefined, "generic"],
  ])("%s %s → %s", (result, reason, view) => {
    expect(outcomeView(api(result, reason))).toBe(view);
  });
  it("cubre los resultados locales", () => {
    expect(outcomeView({ kind: "invalid_tag" })).toBe("invalid_tag");
    expect(outcomeView({ kind: "saved_offline" })).toBe("saved_offline");
    expect(outcomeView({ kind: "error" })).toBe("error");
  });
});
