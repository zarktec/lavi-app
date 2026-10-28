import { env } from "@/config/env";
import { NetworkError } from "@/api/errors";

const API_VERSION = "2025-07";

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(
      `https://${env.shopify.storeDomain}/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": env.shopify.storefrontToken,
          ...extraHeaders,
        },
        body: JSON.stringify({ query, variables }),
      },
    );
  } catch {
    throw new NetworkError();
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length || !json.data) {
    throw new Error(json.errors?.[0]?.message ?? `storefront_${res.status}`);
  }
  return json.data;
}

export type StoreVariant = {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
  availableForSale: boolean;
};
export type StoreProduct = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  variants: StoreVariant[];
};

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!) {
    products(first: $first) {
      nodes {
        id
        title
        description
        featuredImage { url }
        variants(first: 20) {
          nodes { id title availableForSale price { amount currencyCode } }
        }
      }
    }
  }
`;

export async function fetchProducts(first = 20): Promise<StoreProduct[]> {
  const data = await gql<{
    products: {
      nodes: {
        id: string;
        title: string;
        description: string;
        featuredImage: { url: string } | null;
        variants: { nodes: StoreVariant[] };
      }[];
    };
  }>(PRODUCTS_QUERY, { first });
  return data.products.nodes.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    imageUrl: p.featuredImage?.url ?? null,
    variants: p.variants.nodes,
  }));
}

const CART_CREATE = /* GraphQL */ `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl }
      userErrors { field message }
    }
  }
`;

/**
 * Carrito autenticado con el token de la clienta: Checkout Kit abre el
 * checkout con sus datos precargados. `discountCode` aplica un código de canje.
 */
export async function createCart(opts: {
  variantId: string;
  customerAccessToken: string | null;
  email?: string | null;
  discountCode?: string;
}): Promise<string> {
  const input: Record<string, unknown> = {
    lines: [{ merchandiseId: opts.variantId, quantity: 1 }],
  };
  if (opts.customerAccessToken || opts.email) {
    input.buyerIdentity = {
      ...(opts.customerAccessToken ? { customerAccessToken: opts.customerAccessToken } : {}),
      ...(opts.email ? { email: opts.email } : {}),
    };
  }
  if (opts.discountCode) input.discountCodes = [opts.discountCode];
  const data = await gql<{
    cartCreate: {
      cart: { id: string; checkoutUrl: string } | null;
      userErrors: { message: string }[];
    };
  }>(CART_CREATE, { input });
  const { cart, userErrors } = data.cartCreate;
  if (!cart) throw new Error(userErrors[0]?.message ?? "cart_create_failed");
  return cart.checkoutUrl;
}
