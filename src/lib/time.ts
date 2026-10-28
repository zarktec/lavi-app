import * as Localization from "expo-localization";

/** Zona horaria local del teléfono (IANA). */
export function deviceTimeZone(): string {
  return Localization.getCalendars()[0]?.timeZone ?? "America/Bogota";
}

const LOCALE = "es-CO";

export function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: deviceTimeZone(),
  });
}

export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: deviceTimeZone(),
  });
}

export function formatDateTime(iso: string | Date): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** ISO 8601 con desfase de zona del teléfono, p. ej. 2026-10-28T08:01:00-05:00. */
export function toIsoWithOffset(date: Date): string {
  const tz = deviceTimeZone();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const local = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
  const asUtc = Date.parse(`${local}Z`);
  const offsetMin = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${local}${sign}${hh}:${mm}`;
}

export function countdownParts(targetIso: string, now = Date.now()) {
  const ms = Math.max(0, new Date(targetIso).getTime() - now);
  const totalMin = Math.floor(ms / 60000);
  return {
    days: Math.floor(totalMin / 1440),
    hours: Math.floor((totalMin % 1440) / 60),
    minutes: totalMin % 60,
    done: ms === 0,
  };
}
