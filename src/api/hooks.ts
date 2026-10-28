import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { endpoints } from "./endpoints";
import { invalidateProgress, queryClient } from "./queryClient";
import { syncReminders } from "@/notifications/syncReminders";

export const useAppConfig = () =>
  useQuery({ queryKey: ["config"], queryFn: endpoints.config, staleTime: 5 * 60_000 });

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: endpoints.me });

export const useTreatments = () =>
  useQuery({ queryKey: ["treatments"], queryFn: endpoints.treatments });

export const useTreatment = (id: string | undefined) =>
  useQuery({
    queryKey: ["treatments", id],
    queryFn: () => endpoints.treatment(id as string),
    enabled: !!id,
  });

export const usePoints = () => useQuery({ queryKey: ["points"], queryFn: endpoints.points });

export const useLedger = () =>
  useInfiniteQuery({
    queryKey: ["points", "ledger"],
    queryFn: ({ pageParam }) => endpoints.ledger(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_before ?? undefined,
  });

export const useRedemptions = () =>
  useQuery({ queryKey: ["redemptions"], queryFn: endpoints.redemptions });

export const useRedemptionOptions = () =>
  useQuery({ queryKey: ["redemptions", "options"], queryFn: endpoints.redemptionOptions });

export function useActivateTreatment() {
  return useMutation({
    mutationFn: endpoints.activate,
    onSuccess: async () => {
      await invalidateProgress();
      void syncReminders();
    },
  });
}

export function useChangeSchedule(id: string) {
  return useMutation({
    mutationFn: (reminder_times: string[]) => endpoints.changeSchedule(id, { reminder_times }),
    onSuccess: async () => {
      await invalidateProgress();
      void syncReminders();
    },
  });
}

/** La clave de idempotencia se genera una vez por intento de canje para que un reintento no canjee dos veces. */
export function useRedeem() {
  return useMutation({
    mutationFn: ({ optionId, key }: { optionId: string; key: string }) =>
      endpoints.redeem(optionId, key),
    onSuccess: () => invalidateProgress(),
  });
}
export const newIdempotencyKey = () => Crypto.randomUUID();

export function useUpdateMe() {
  return useMutation({
    mutationFn: endpoints.updateMe,
    onSuccess: (me) => queryClient.setQueryData(["me"], me),
  });
}
