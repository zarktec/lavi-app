import * as SecureStore from "expo-secure-store";

const KEYS = {
  access: "lavi.access_token",
  refresh: "lavi.refresh_token",
  shopifyAccess: "lavi.shopify_access_token",
  shopifyRefresh: "lavi.shopify_refresh_token",
  shopifyExpiresAt: "lavi.shopify_expires_at",
  deviceId: "lavi.device_id",
  pushToken: "lavi.push_token",
} as const;

type KeyName = keyof typeof KEYS;

// Copia en memoria para no leer el almacén seguro en cada petición.
const memory: Partial<Record<KeyName, string | null>> = {};

export async function getToken(name: KeyName): Promise<string | null> {
  if (name in memory) return memory[name] ?? null;
  const v = await SecureStore.getItemAsync(KEYS[name]);
  memory[name] = v;
  return v;
}

export async function setToken(name: KeyName, value: string): Promise<void> {
  memory[name] = value;
  await SecureStore.setItemAsync(KEYS[name], value);
}

export async function deleteToken(name: KeyName): Promise<void> {
  memory[name] = null;
  await SecureStore.deleteItemAsync(KEYS[name]);
}

export async function clearSessionTokens(): Promise<void> {
  await Promise.all(
    (["access", "refresh", "shopifyAccess", "shopifyRefresh", "shopifyExpiresAt"] as const).map(
      deleteToken,
    ),
  );
}
