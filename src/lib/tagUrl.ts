export type TagUrlCheck =
  | { ok: true; url: string }
  | { ok: false };

/**
 * La app nunca interpreta el contenido cifrado del tag: solo valida que la URL
 * pertenezca al dominio esperado y traiga los parámetros `d` y `c`.
 */
export function validateTagUrl(
  raw: string,
  expectedDomain: string,
  /** Tags de prueba sin SUN (NTAG215): `?uid=<14 hex>`. Solo en builds que no son de producción. */
  allowTestUid = false,
): TagUrlCheck {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return { ok: false };
    if (url.hostname.toLowerCase() !== expectedDomain.toLowerCase()) {
      return { ok: false };
    }
    const signed = !!url.searchParams.get("d") && !!url.searchParams.get("c");
    const testUid = allowTestUid && /^[0-9A-Fa-f]{14}$/.test(url.searchParams.get("uid") ?? "");
    if (!signed && !testUid) return { ok: false };
    return { ok: true, url: raw.trim() };
  } catch {
    return { ok: false };
  }
}

/** Reconstruye la URL del tag a partir de los parámetros de la ruta /t. */
export function buildTagUrl(domain: string, d: string, c: string): string {
  const q = new URLSearchParams({ d, c });
  return `https://${domain}/t?${q.toString()}`;
}
