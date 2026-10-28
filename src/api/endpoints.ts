import { api, unwrap } from "./client";
import type { components } from "./schema";

type S = components["schemas"];

export const endpoints = {
  config: () => unwrap(api.GET("/v1/config/app")),
  createSession: (body: S["CreateSessionRequest"]) =>
    unwrap(api.POST("/v1/auth/session", { body })),
  deleteSession: (refreshToken: string) =>
    unwrap(api.DELETE("/v1/auth/session", { params: { header: { "X-Refresh-Token": refreshToken } } })),
  registerDevice: (body: S["RegisterDeviceRequest"]) =>
    unwrap(api.POST("/v1/devices", { body })),
  deleteDevice: (id: string) =>
    unwrap(api.DELETE("/v1/devices/{id}", { params: { path: { id } } })),
  me: () => unwrap(api.GET("/v1/me")),
  updateMe: (body: S["UpdateMeRequest"]) => unwrap(api.PATCH("/v1/me", { body })),
  deleteMe: () => unwrap(api.DELETE("/v1/me")),
  scan: (body: S["ScanRequest"]) => unwrap(api.POST("/v1/scans", { body })),
  treatments: () => unwrap(api.GET("/v1/treatments")),
  treatment: (id: string) =>
    unwrap(api.GET("/v1/treatments/{id}", { params: { path: { id } } })),
  activate: (body: S["ActivateTreatmentRequest"]) =>
    unwrap(api.POST("/v1/treatments", { body })),
  changeSchedule: (id: string, body: S["ChangeScheduleRequest"]) =>
    unwrap(api.PATCH("/v1/treatments/{id}/schedule", { params: { path: { id } }, body })),
  points: () => unwrap(api.GET("/v1/points")),
  ledger: (before?: string) =>
    unwrap(api.GET("/v1/points/ledger", { params: { query: { before, limit: 20 } } })),
  redemptionOptions: () => unwrap(api.GET("/v1/redemptions/options")),
  redemptions: () => unwrap(api.GET("/v1/redemptions")),
  redeem: (optionId: string, idempotencyKey: string) =>
    unwrap(
      api.POST("/v1/redemptions", {
        params: { header: { "Idempotency-Key": idempotencyKey } },
        body: { option_id: optionId },
      }),
    ),
};
