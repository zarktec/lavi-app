import { useShopifyCheckoutSheet } from "@shopify/checkout-sheet-kit";
import { useState } from "react";
import { useMe } from "@/api/hooks";
import { getShopifyAccessToken } from "@/auth/shopifyAuth";
import { captureError } from "@/lib/sentry";
import { createCart } from "./storefront";

/** Crea un carrito autenticado (con el código de canje si aplica) y abre Checkout Kit. */
export function useCheckout() {
  const checkout = useShopifyCheckoutSheet();
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const buy = async (variantId: string, discountCode?: string) => {
    setBusy(true);
    setError(false);
    try {
      const url = await createCart({
        variantId,
        customerAccessToken: await getShopifyAccessToken(),
        email: me.data?.email,
        discountCode,
      });
      checkout.present(url);
    } catch (e) {
      captureError(e);
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return { buy, busy, error };
}
