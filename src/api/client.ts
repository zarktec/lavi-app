import createClient from "openapi-fetch";
import { Platform } from "react-native";
import type { paths } from "./schema";
import { env } from "@/config/env";
import { getToken, setToken } from "@/auth/tokens";
import { ApiError, AuthExpiredError, NetworkError } from "./errors";
import { captureError } from "@/lib/sentry";

type AuthFailureHandler = () => void | Promise<void>;
let onAuthFailure: AuthFailureHandler = () => {};
export function setAuthFailureHandler(fn: AuthFailureHandler) {
  onAuthFailure = fn;
}

let refreshing: Promise<boolean> | null = null;

/** Renueva el token del backend una sola vez aunque fallen varias peticiones. */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const refresh = await getToken("refresh");
        if (!refresh) return false;
        const res = await fetch(`${env.apiUrl}/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) return false;
        const tokens = (await res.json()) as { access_token: string; refresh_token: string };
        await setToken("access", tokens.access_token);
        await setToken("refresh", tokens.refresh_token);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

const authFetch = async (request: Request): Promise<Response> => {
  const retry = request.clone();
  const isPublic = /\/v1\/auth\/(session|refresh)$/.test(new URL(request.url).pathname)
    && request.method === "POST";
  const access = isPublic ? null : await getToken("access");
  if (access) request.headers.set("Authorization", `Bearer ${access}`);
  request.headers.set("Accept-Language", "es-CO");
  request.headers.set("X-Client-Platform", Platform.OS);

  let res: Response;
  try {
    res = await fetch(request);
  } catch {
    throw new NetworkError();
  }
  if (res.status !== 401 || isPublic) return res;

  // Ante un 401: renovar una sola vez y repetir; si falla, cerrar sesión.
  const ok = await refreshSession();
  if (!ok) {
    await onAuthFailure();
    throw new AuthExpiredError();
  }
  retry.headers.set("Authorization", `Bearer ${await getToken("access")}`);
  try {
    return await fetch(retry);
  } catch {
    throw new NetworkError();
  }
};

export const api = createClient<paths>({
  baseUrl: env.apiUrl,
  fetch: (input) => authFetch(input as Request),
});

type Result<T> = { data?: T; error?: unknown; response: Response };

/** Devuelve `data` o lanza ApiError con el formato { error: { code, message } }. */
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await promise;
  if (response.ok) return data as T;
  const body = (error ?? {}) as { error?: { code?: string; message?: string } };
  const code = body.error?.code ?? `http_${response.status}`;
  const err = new ApiError(response.status, code, body.error?.message ?? "");
  // El `code` va a Sentry; el `message` se muestra a la clienta.
  if (response.status !== 401) captureError(err, { code, status: response.status });
  throw err;
}
