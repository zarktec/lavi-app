import Constants from "expo-constants";

type Extra = {
  appEnv: "development" | "preview" | "production";
  apiUrl: string;
  linkDomain: string;
  sentryDsn: string;
  supportEmail: string;
  privacyUrl: string;
  termsUrl: string;
  shopify: {
    storeDomain: string;
    storefrontToken: string;
    customerAccountClientId: string;
  };
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const env: Extra = {
  appEnv: extra.appEnv ?? "development",
  apiUrl: extra.apiUrl ?? "http://localhost:4010",
  linkDomain: extra.linkDomain ?? "links.lavi.example",
  sentryDsn: extra.sentryDsn ?? "",
  supportEmail: extra.supportEmail ?? "",
  privacyUrl: extra.privacyUrl ?? "",
  termsUrl: extra.termsUrl ?? "",
  shopify: {
    storeDomain: extra.shopify?.storeDomain ?? "",
    storefrontToken: extra.shopify?.storefrontToken ?? "",
    customerAccountClientId: extra.shopify?.customerAccountClientId ?? "",
  },
};

export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";
export const EAS_PROJECT_ID = (
  Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
)?.eas?.projectId;
