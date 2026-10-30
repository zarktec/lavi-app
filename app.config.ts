import type { ExpoConfig, ConfigContext } from "expo/config";

type AppEnv = "development" | "preview" | "production";

const APP_ENV = (process.env.APP_ENV ?? "development") as AppEnv;

// Variables por entorno (se definen en eas.json / EAS Environment Variables).
// Ninguna credencial privada vive aquí: solo el token público de Storefront API
// y el identificador del cliente público de Customer Account API.
const LINK_DOMAIN = process.env.LAVI_LINK_DOMAIN ?? "links.lavi.example";
const API_URL = process.env.LAVI_API_URL ?? "http://localhost:4010";
const SHOPIFY_STORE_DOMAIN =
  process.env.LAVI_SHOPIFY_STORE_DOMAIN ?? "lavi-dev.myshopify.com";
const STOREFRONT_TOKEN = process.env.LAVI_STOREFRONT_TOKEN ?? "";
// Modo de prueba: entra sin Shopify y se usa con el servidor simulado (npm run mock).
// Nunca se activa en producción.
const DEV_LOGIN = process.env.LAVI_DEV_LOGIN === "1" && APP_ENV !== "production";
const CUSTOMER_ACCOUNT_CLIENT_ID =
  process.env.LAVI_CUSTOMER_ACCOUNT_CLIENT_ID ?? "";

const SUFFIX: Record<AppEnv, string> = {
  development: ".dev",
  preview: ".preview",
  production: "",
};
const NAME_SUFFIX: Record<AppEnv, string> = {
  development: " (Dev)",
  preview: " (Pruebas)",
  production: "",
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `Lavi${NAME_SUFFIX[APP_ENV]}`,
  slug: "lavi-app",
  scheme: "lavi",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  runtimeVersion: { policy: "appVersion" },
  updates: {
    // Canales por entorno: EAS Update solo para JavaScript y textos.
    url: process.env.LAVI_EAS_UPDATE_URL,
    fallbackToCacheTimeout: 0,
  },
  locales: { es: "./src/i18n/native/es.json" },
  ios: {
    bundleIdentifier: `com.lavi.app${SUFFIX[APP_ENV]}`,
    supportsTablet: false,
    // Universal Links: el sistema lee el tag en segundo plano (iPhone XS o posterior).
    associatedDomains: [`applinks:${LINK_DOMAIN}`],
    // «Time sensitive»: la alarma atraviesa los modos de concentración (no requiere aprobación de Apple).
    entitlements: { "com.apple.developer.usernotifications.time-sensitive": true },
    infoPlist: {
      NFCReaderUsageDescription:
        "Lavi usa el NFC para leer el frasco cuando lo acercas al teléfono.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: `com.lavi.app${SUFFIX[APP_ENV]}`,
    adaptiveIcon: {
      backgroundColor: "#F3EEFB",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    // App Links verificados: al acercar el frasco el sistema abre la app en la ruta /t.
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: LINK_DOMAIN, pathPrefix: "/t" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    // No se solicitan permisos de alarma exacta (ver README).
    blockedPermissions: [
      "android.permission.SCHEDULE_EXACT_ALARM",
      "android.permission.USE_EXACT_ALARM",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-localization",
    "expo-background-task",
    ["react-native-nfc-manager", { includeNdefEntitlement: true }],
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#6B4FBB",
        // Sonido de la alarma tipo despertador (28 s; iOS admite hasta 30 s).
        sounds: ["./assets/sounds/alarm.wav"],
      },
    ],
    [
      "expo-build-properties",
      {
        ios: { deploymentTarget: "16.4" },
        // El servidor simulado se sirve por HTTP en la red local.
        android: { minSdkVersion: 26, ...(DEV_LOGIN ? { usesCleartextTraffic: true } : {}) },
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    appEnv: APP_ENV,
    devLogin: DEV_LOGIN,
    apiUrl: API_URL,
    linkDomain: LINK_DOMAIN,
    sentryDsn: process.env.LAVI_SENTRY_DSN ?? "",
    // El backend no publica estos datos en GET /v1/config/app: llegan por variables de entorno.
    supportEmail: process.env.LAVI_SUPPORT_EMAIL ?? "",
    privacyUrl: process.env.LAVI_PRIVACY_URL ?? "",
    termsUrl: process.env.LAVI_TERMS_URL ?? "",
    shopify: {
      storeDomain: SHOPIFY_STORE_DOMAIN,
      storefrontToken: STOREFRONT_TOKEN,
      customerAccountClientId: CUSTOMER_ACCOUNT_CLIENT_ID,
    },
    eas: { projectId: process.env.LAVI_EAS_PROJECT_ID },
  },
});
