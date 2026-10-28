/**
 * Servidor simulado para desarrollo: `npm run mock` (http://localhost:4010).
 * Desde un teléfono físico usar la IP de la computadora en LAVI_API_URL.
 */
import http from "node:http";
import { createMockApi } from "./core";

const api = createMockApi({ seed: process.env.MOCK_SEED === "1" });
const port = Number(process.env.PORT ?? 4010);

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      const out = api.handle({
        method: req.method ?? "GET",
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        headers: req.headers as Record<string, string>,
        body: raw ? JSON.parse(raw) : undefined,
      });
      res.writeHead(out.status, { "Content-Type": "application/json" });
      res.end(out.body === undefined ? undefined : JSON.stringify(out.body));
      console.log(`${req.method} ${url.pathname} → ${out.status}`);
    });
  })
  .listen(port, () => console.log(`Mock Lavi API en http://localhost:${port}`));
