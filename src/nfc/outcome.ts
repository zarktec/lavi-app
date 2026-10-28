import type { ScanOutcome } from "@/store/ui";

export type OutcomeView =
  | "activation"
  | "recorded"
  | "too_early"
  | "late"
  | "no_pending"
  | "finished"
  | "rejected_signature"
  | "rejected_owned"
  | "rejected_blocked"
  | "rejected_expired"
  | "invalid_tag"
  | "saved_offline"
  | "generic"
  | "error";

/**
 * Mapea cada `result` del backend a su variante de pantalla.
 * `rejected` + `replayed` se muestra igual que firma inválida (nunca se acusa a la clienta).
 * Un `result` desconocido (versión nueva del backend) cae en «generic».
 */
export function outcomeView(outcome: ScanOutcome): OutcomeView {
  if (outcome.kind === "invalid_tag") return "invalid_tag";
  if (outcome.kind === "saved_offline") return "saved_offline";
  if (outcome.kind === "error") return "error";
  const { result, reason } = outcome.response;
  switch (result as string) {
    case "activation_required":
      return "activation";
    case "dose_recorded":
      return "recorded";
    case "too_early":
      return "too_early";
    case "late":
      return "late";
    case "no_pending_dose":
      return "no_pending";
    case "treatment_finished":
      return "finished";
    case "rejected":
      switch (reason as string) {
        case "invalid_signature":
        case "replayed":
          return "rejected_signature";
        case "owned_by_other":
          return "rejected_owned";
        case "blocked":
          return "rejected_blocked";
        case "offline_expired":
          return "rejected_expired";
        default:
          return "rejected_signature";
      }
    default:
      return "generic";
  }
}

/** Variantes en las que se ofrece contacto de soporte. */
export const SUPPORT_VIEWS: OutcomeView[] = [
  "rejected_signature",
  "rejected_owned",
  "rejected_blocked",
];
