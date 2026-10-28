import { useT } from "@/i18n";
import { formatDateTime } from "@/lib/time";
import { useUiStore } from "@/store/ui";
import { Banner } from "./index";

/** Sin conexión se muestran los datos en caché con la marca de «última actualización». */
export function ConnectionBanner({ updatedAt }: { updatedAt?: number }) {
  const t = useT();
  const online = useUiStore((s) => s.online);
  if (online) return null;
  const when = updatedAt ? ` ${t("common.lastUpdated", { time: formatDateTime(new Date(updatedAt)) })}` : "";
  return <Banner tone="info" text={`${t("offline.banner")}${when}`} />;
}
