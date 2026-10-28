import type { RedemptionOption } from "@/api/types";

/** Texto de la recompensa según `reward_type` / `reward_value` de la opción de canje. */
export function rewardLabel(
  option: Pick<RedemptionOption, "reward_type" | "reward_value">,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const value =
    option.reward_type === "fixed_amount" && option.reward_value != null
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(option.reward_value)
      : String(option.reward_value ?? "");
  return t(`redeem.reward.${option.reward_type}`, { value });
}
