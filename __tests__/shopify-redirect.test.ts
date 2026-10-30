/* eslint-disable import/first */
jest.mock("expo-auth-session", () => ({ makeRedirectUri: () => "lavi://auth/callback" }));
jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "x" }));
jest.mock("@/config/env", () => ({ env: { linkDomain: "lavi.zark.pro", shopify: {} } }));
jest.mock("@/auth/tokens", () => ({ getToken: jest.fn(), setToken: jest.fn() }));

import { appReturnUrl, buildRedirectUri, redirectUri } from "@/auth/shopifyAuth";

describe("URI de devolución de Shopify", () => {
  it("la registrada en Shopify es https y está en el dominio de enlaces", () => {
    expect(buildRedirectUri("lavi.zark.pro")).toBe("https://lavi.zark.pro/auth/callback");
    expect(redirectUri()).toBe("https://lavi.zark.pro/auth/callback");
  });
  it("la app espera el retorno a su esquema propio", () => {
    expect(appReturnUrl()).toBe("lavi://auth/callback");
  });
});
