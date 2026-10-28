/* eslint-disable import/first */
import { render, screen } from "@testing-library/react-native";
import "@/i18n";
import { useUiStore } from "@/store/ui";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), dismissAll: jest.fn(), navigate: jest.fn() },
}));
jest.mock("@/config/useRemoteConfig", () => ({
  useRemoteConfig: () => ({ config: { support_email: "soporte@lavi.example" } }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import ScanResult from "../app/scan/result";

const show = async (response: object) => {
  useUiStore.setState({ outcome: { kind: "api", response: response as never } });
  return await render(<ScanResult />);
};

describe("pantalla de resultado del escaneo", () => {
  it("dose_recorded: celebra con puntos, bono de racha, saldo", async () => {
    await show({ result: "dose_recorded", points_earned: 10, streak_bonus: 5, streak: 7, balance: 135, next_dose_at: "2026-10-29T13:00:00Z" });
    expect(screen.getByText("¡Aplicación registrada!")).toBeTruthy();
    expect(screen.getByText("+10 puntos")).toBeTruthy();
    expect(screen.getByText("Bono de racha: +5 puntos")).toBeTruthy();
    expect(screen.getByText("Saldo: 135 puntos")).toBeTruthy();
  });
  it("rejected + replayed: mismo mensaje que firma inválida, con soporte", async () => {
    await show({ result: "rejected", reason: "replayed" });
    expect(screen.getByText("No pudimos verificar este frasco")).toBeTruthy();
    expect(screen.getByText("Contactar a soporte")).toBeTruthy();
  });
  it("rejected + owned_by_other", async () => {
    await show({ result: "rejected", reason: "owned_by_other" });
    expect(screen.getByText("Este frasco está registrado en otra cuenta")).toBeTruthy();
  });
  it("result desconocido: mensaje genérico", async () => {
    await show({ result: "algo_nuevo" });
    expect(screen.getByText("Actualizamos tus datos")).toBeTruthy();
  });
  it("lectura guardada sin conexión: sin puntos", async () => {
    useUiStore.setState({ outcome: { kind: "saved_offline" } });
    await render(<ScanResult />);
    expect(screen.getByText("Lectura guardada")).toBeTruthy();
    expect(screen.getByText("La registraremos apenas tengas internet.")).toBeTruthy();
  });
});
