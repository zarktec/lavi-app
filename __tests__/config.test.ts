import { remoteTextsFrom } from "@/config/useRemoteConfig";
import { setRemoteTexts, translate } from "@/i18n";

describe("textos remotos del backend", () => {
  it("mapea notification_texts a claves locales y rellena {product}", () => {
    const texts = remoteTextsFrom({
      min_app_version: "1.0.0",
      notification_texts: { reminder_body: "Aplica {product} ya", desconocida: "x" },
    });
    expect(texts).toEqual({ "notifications.doseBody": "Aplica {product} ya" });
    setRemoteTexts(texts);
    expect(translate("notifications.doseBody", { product: "Serum" })).toBe("Aplica Serum ya");
    setRemoteTexts({});
    expect(translate("notifications.doseBody", { product: "Serum" })).toContain("Serum");
  });
});
