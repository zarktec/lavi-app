import NfcManager, {
  Ndef,
  NfcAdapter,
  NfcEvents,
  NfcTech,
  type NdefRecord,
  type TagEvent,
} from "react-native-nfc-manager";
import { Platform } from "react-native";
import { translate } from "@/i18n";
import { useUiStore } from "@/store/ui";

export const SCAN_TIMEOUT_MS = 30_000;

/**
 * Tecnologías que escucha el modo lector de Android. La librería usa 0 por defecto, que no detecta
 * ningún tag: el sistema se queda con la lectura y abre el enlace en el navegador. NTAG215/424 son NFC-A.
 */
export const ANDROID_READER_FLAGS =
  NfcAdapter.FLAG_READER_NFC_A |
  NfcAdapter.FLAG_READER_NFC_B |
  NfcAdapter.FLAG_READER_NFC_F |
  NfcAdapter.FLAG_READER_NFC_V;

/** Primer registro NDEF de tipo URI, o `null` si el tag no lo trae. */
export function extractUrl(tag: TagEvent | null | undefined): string | null {
  const records: NdefRecord[] = tag?.ndefMessage ?? [];
  for (const record of records) {
    try {
      if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
        return Ndef.uri.decodePayload(Uint8Array.from(record.payload));
      }
    } catch {
      // registro ilegible: se ignora
    }
  }
  return null;
}

export async function initNfc(): Promise<{ supported: boolean; enabled: boolean }> {
  let supported = false;
  try {
    supported = await NfcManager.isSupported();
    if (supported) await NfcManager.start();
  } catch {
    supported = false;
  }
  const enabled = supported && Platform.OS === "android" ? await safeIsEnabled() : supported;
  useUiStore.getState().setNfc(supported, enabled);
  return { supported, enabled };
}

async function safeIsEnabled() {
  try {
    return await NfcManager.isEnabled();
  } catch {
    return false;
  }
}

/** En Android se verifica `isEnabled()` en cada apertura. */
export async function refreshNfcEnabled() {
  const { nfcSupported } = useUiStore.getState();
  if (!nfcSupported) return;
  const enabled = Platform.OS === "android" ? await safeIsEnabled() : true;
  useUiStore.getState().setNfc(true, enabled);
}

export function openNfcSettings() {
  return NfcManager.goToNfcSetting();
}

export type ReadResult =
  | { status: "tag"; url: string }
  | { status: "invalid" }
  | { status: "cancelled" };

export type ActiveRead = { promise: Promise<ReadResult>; cancel: () => void };

/**
 * Camino 2 (botón de escanear). iOS abre la hoja del sistema; Android registra
 * la escucha mientras la pantalla está visible. Vence a los 30 s sin error.
 */
export function startReading(timeoutMs = SCAN_TIMEOUT_MS): ActiveRead {
  let finish!: (r: ReadResult) => void;
  const promise = new Promise<ReadResult>((resolve) => (finish = resolve));
  let done = false;
  const settle = (r: ReadResult) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    void cleanup().then(() => finish(r));
  };
  const timer = setTimeout(() => settle({ status: "cancelled" }), timeoutMs);

  const cleanup = async () => {
    try {
      if (Platform.OS === "ios") {
        await NfcManager.cancelTechnologyRequest();
      } else {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
        await NfcManager.unregisterTagEvent();
      }
    } catch {
      // ya estaba cerrada
    }
  };

  const onTag = (tag: TagEvent | null) => {
    const url = extractUrl(tag);
    settle(url ? { status: "tag", url } : { status: "invalid" });
  };

  void (async () => {
    try {
      if (Platform.OS === "ios") {
        await NfcManager.requestTechnology(NfcTech.Ndef, {
          alertMessage: translate("scan.iosAlert"),
        });
        onTag(await NfcManager.getTag());
      } else {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, onTag);
        await NfcManager.registerTagEvent({ isReaderModeEnabled: true, readerModeFlags: ANDROID_READER_FLAGS });
      }
    } catch {
      // cancelación de la clienta o sesión cerrada por el sistema: sin error
      settle({ status: "cancelled" });
    }
  })();

  return { promise, cancel: () => settle({ status: "cancelled" }) };
}
