import { QueryClient } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { kvGet, kvSet, kvDelete } from "@/lib/db";
import { ApiError } from "./errors";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: WEEK, // necesario para que la caché persistida sirva sin conexión
      networkMode: "offlineFirst",
      retry: (count, error) =>
        !(error instanceof ApiError && error.status < 500) && count < 2,
    },
    mutations: { networkMode: "online" },
  },
});

/** Caché persistente en SQLite: saldo, tratamiento, dosis, historial, canje y config. */
export const sqlitePersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await kvSet("query_cache", JSON.stringify(client));
  },
  restoreClient: async () => {
    const raw = await kvGet("query_cache");
    return raw ? (JSON.parse(raw) as PersistedClient) : undefined;
  },
  removeClient: async () => {
    await kvDelete("query_cache");
  },
};

export const PERSIST_MAX_AGE = WEEK;

/** Después de cada escaneo, canje, activación o cambio de horario. */
export function invalidateProgress() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["treatments"] }),
    queryClient.invalidateQueries({ queryKey: ["points"] }),
    queryClient.invalidateQueries({ queryKey: ["redemptions"] }),
  ]);
}
