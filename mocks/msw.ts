import { http, HttpResponse } from "msw";
import { createMockApi } from "./core";

/** Handlers de MSW sobre la misma lógica del servidor simulado (para Jest). */
export function createHandlers(api = createMockApi()) {
  const handler = async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const text = await request.text();
    const out = api.handle({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers),
      body: text ? JSON.parse(text) : undefined,
    });
    return out.body === undefined
      ? new HttpResponse(null, { status: out.status })
      : HttpResponse.json(out.body as never, { status: out.status });
  };
  return { api, handlers: [http.all("*/v1/*", handler)] };
}
