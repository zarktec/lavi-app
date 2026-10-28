import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { env } from "@/config/env";
import { getToken, setToken } from "./tokens";

WebBrowser.maybeCompleteAuthSession();

const SCOPES = ["openid", "email", "customer-account-api:full"];

export type ShopifyLoginResult = {
  accessToken: string;
  idToken?: string;
};

export class LoginCancelledError extends Error {
  constructor() {
    super("login_cancelled");
  }
}

export const redirectUri = () => AuthSession.makeRedirectUri({ scheme: "lavi", path: "auth/callback" });

let discoveryCache: AuthSession.DiscoveryDocument | null = null;

/** Descubre los endpoints OAuth de la Customer Account API de la tienda. */
async function discover(): Promise<AuthSession.DiscoveryDocument> {
  if (discoveryCache) return discoveryCache;
  const res = await fetch(`https://${env.shopify.storeDomain}/.well-known/openid-configuration`);
  const { issuer } = (await res.json()) as { issuer: string };
  discoveryCache = await AuthSession.fetchDiscoveryAsync(issuer);
  return discoveryCache;
}

async function persist(tokens: AuthSession.TokenResponse) {
  await setToken("shopifyAccess", tokens.accessToken);
  if (tokens.refreshToken) await setToken("shopifyRefresh", tokens.refreshToken);
  const exp = tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : 0;
  await setToken("shopifyExpiresAt", String(exp));
}

/** OAuth 2.0 con PKCE como cliente público móvil (sin contraseña: código por correo). */
export async function loginWithShopify(): Promise<ShopifyLoginResult> {
  const discovery = await discover();
  const request = new AuthSession.AuthRequest({
    clientId: env.shopify.customerAccountClientId,
    scopes: SCOPES,
    redirectUri: redirectUri(),
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { nonce: Crypto.randomUUID() },
  });
  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);
  if (result.type !== "success") throw new LoginCancelledError();

  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId: env.shopify.customerAccountClientId,
      code: result.params.code,
      redirectUri: redirectUri(),
      extraParams: { code_verifier: request.codeVerifier ?? "" },
    },
    discovery,
  );
  await persist(tokens);
  return { accessToken: tokens.accessToken, idToken: tokens.idToken };
}

/** Token de Shopify vigente; se renueva si vence. Solo para Checkout Kit y Storefront API. */
export async function getShopifyAccessToken(): Promise<string | null> {
  const access = await getToken("shopifyAccess");
  if (!access) return null;
  const exp = Number((await getToken("shopifyExpiresAt")) ?? 0);
  if (!exp || exp - Date.now() > 60_000) return access;
  const refresh = await getToken("shopifyRefresh");
  if (!refresh) return access;
  try {
    const discovery = await discover();
    const tokens = await AuthSession.refreshAsync(
      { clientId: env.shopify.customerAccountClientId, refreshToken: refresh },
      discovery,
    );
    await persist(tokens);
    return tokens.accessToken;
  } catch {
    return access;
  }
}
