import { createDeduper } from "@/lib/dedupe";
import { buildTagUrl, validateTagUrl } from "@/lib/tagUrl";
import { toIsoWithOffset } from "@/lib/time";
import { compareVersions } from "@/lib/version";
import { needsUpdate } from "@/config/useRemoteConfig";
import { backoffMs } from "@/offline/queue";

describe("validateTagUrl", () => {
  const domain = "links.lavi.example";
  it("acepta el dominio esperado con d y c", () => {
    expect(validateTagUrl(`https://${domain}/t?d=abc&c=def`, domain).ok).toBe(true);
  });
  it("rechaza otro dominio, http o parámetros faltantes", () => {
    expect(validateTagUrl("https://otra.com/t?d=a&c=b", domain).ok).toBe(false);
    expect(validateTagUrl(`http://${domain}/t?d=a&c=b`, domain).ok).toBe(false);
    expect(validateTagUrl(`https://${domain}/t?d=a`, domain).ok).toBe(false);
    expect(validateTagUrl("no es una url", domain).ok).toBe(false);
  });
  it("reconstruye la URL desde los parámetros", () => {
    expect(buildTagUrl(domain, "a", "b")).toBe(`https://${domain}/t?d=a&c=b`);
  });
});

describe("createDeduper", () => {
  it("ignora la misma URL en menos de 5 s", () => {
    let t = 0;
    const d = createDeduper(5000, () => t);
    expect(d.isDuplicate("u")).toBe(false);
    t = 4000;
    expect(d.isDuplicate("u")).toBe(true);
    t = 9500;
    expect(d.isDuplicate("u")).toBe(false);
    expect(d.isDuplicate("otra")).toBe(false);
  });
});

describe("versiones", () => {
  it("compara", () => {
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
    expect(compareVersions("1.10.0", "1.9.9")).toBe(1);
    expect(compareVersions("2.0", "2.0.0")).toBe(0);
  });
  it("bloquea si la instalada es menor a min_app_version", () => {
    expect(needsUpdate({ min_app_version: "2.0.0" }, "1.5.0")).toBe(true);
    expect(needsUpdate({ min_app_version: "1.0.0" }, "1.0.0")).toBe(false);
    expect(needsUpdate(undefined, "1.0.0")).toBe(false);
  });
});

describe("toIsoWithOffset", () => {
  it("usa la zona del teléfono (Bogotá, -05:00)", () => {
    expect(toIsoWithOffset(new Date("2026-10-28T13:01:00Z"))).toBe("2026-10-28T08:01:00-05:00");
  });
});

describe("backoffMs", () => {
  it("crece y se limita a 5 minutos", () => {
    expect(backoffMs(0)).toBe(5000);
    expect(backoffMs(1)).toBe(10000);
    expect(backoffMs(20)).toBe(300000);
  });
});
