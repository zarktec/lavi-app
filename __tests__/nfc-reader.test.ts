/* eslint-disable import/first */
jest.mock("react-native-nfc-manager", () => ({
  __esModule: true,
  default: {},
  Ndef: {},
  NfcEvents: {},
  NfcTech: {},
  NfcAdapter: { FLAG_READER_NFC_A: 0x1, FLAG_READER_NFC_B: 0x2, FLAG_READER_NFC_F: 0x4, FLAG_READER_NFC_V: 0x8 },
}));
jest.mock("@/i18n", () => ({ translate: (k: string) => k }));
jest.mock("@/store/ui", () => ({ useUiStore: { getState: () => ({ setNfc: jest.fn(), nfcSupported: true }) } }));

import { ANDROID_READER_FLAGS } from "@/nfc/reader";

describe("modo lector de Android", () => {
  it("escucha NFC-A (NTAG215/424): los flags nunca son 0", () => {
    expect(ANDROID_READER_FLAGS).not.toBe(0);
    expect(ANDROID_READER_FLAGS & 0x1).toBe(0x1);
  });
});
