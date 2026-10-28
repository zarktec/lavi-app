import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { countdownParts } from "@/lib/time";
import { Text } from "./index";

/** Cuenta regresiva hasta la próxima dosis; se actualiza cada 30 s. */
export function Countdown({ target }: { target: string }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const p = countdownParts(target, now);
  const text =
    p.days > 0
      ? t("home.opensIn", { d: p.days, h: p.hours, m: p.minutes })
      : t("home.opensInShort", { h: p.hours, m: p.minutes });
  return (
    <Text variant="heading" accessibilityLiveRegion="polite">
      {text}
    </Text>
  );
}
