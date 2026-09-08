import { fromUSDA, fromOFF } from "./providers";
type Limit = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};
export interface Env {
  USDA_API_KEY?: string;
  PERSONAL_API_TOKEN?: string;
  OFF_CONTACT?: string;
  ASSETS: { fetch: (r: Request) => Promise<Response> };
  SEARCH_LIMIT?: Limit;
  PRODUCT_LIMIT?: Limit;
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
async function sameSecret(a: string, b: string) {
  const encode = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", encode.encode(a)),
    crypto.subtle.digest("SHA-256", encode.encode(b)),
  ]);
  const xx = new Uint8Array(x),
    yy = new Uint8Array(y);
  return xx.reduce((s, v, i) => s | (v ^ yy[i]), 0) === 0;
}
export async function handle(request: Request, env: Env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if (request.method !== "GET")
    return json({ error: "Method not allowed." }, 405);
  if (!env.PERSONAL_API_TOKEN)
    return json(
      {
        error:
          "Food lookup is not configured yet. Saved and custom foods remain available.",
      },
      503,
    );
  if (
    !(await sameSecret(
      request.headers.get("Authorization") ?? "",
      "Bearer " + env.PERSONAL_API_TOKEN,
    ))
  )
    return json(
      { error: "Invalid food lookup token. Update it in Settings." },
      401,
    );
  const search = url.pathname === "/api/foods/search",
    barcode = url.pathname.match(/^\/api\/foods\/barcode\/(\d{8}|\d{12,14})$/),
    detail = url.pathname.match(/^\/api\/foods\/(usda|off)\/(\d{1,20})$/);
  if (!search && !barcode && !detail)
    return json({ error: "Invalid food endpoint or barcode." }, 400);
  const provider = barcode
    ? "off"
    : search
      ? (url.searchParams.get("provider") ?? "usda")
      : detail![1];
  if (!["usda", "off"].includes(provider))
    return json({ error: "Unknown provider." }, 400);
  const q = (url.searchParams.get("q") ?? "").trim();
  const page = Number(url.searchParams.get("cursor") ?? 1);
  if (
    search &&
    (q.length < 2 ||
      q.length > 120 ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100)
  )
    return json({ error: "Enter 2–120 characters and a valid page." }, 400);
  if (provider === "usda" && !env.USDA_API_KEY)
    return json(
      {
        error:
          "USDA API key is not configured. Try Open Food Facts or a custom food.",
      },
      503,
    );
  const cacheApi = (globalThis as unknown as { caches?: { default?: Cache } })
    .caches?.default;
  const cacheKey = new Request(
    "https://daywell-cache.invalid" +
      url.pathname +
      "?" +
      url.searchParams.toString(),
  );
  const cached = await cacheApi?.match(cacheKey);
  if (cached) {
    const body = await cached.text();
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
  const limiter = search ? env.SEARCH_LIMIT : env.PRODUCT_LIMIT;
  if (limiter && !(await limiter.limit({ key: provider })).success)
    return json(
      {
        error:
          "Food provider rate limit reached. Wait a minute; saved foods still work offline.",
      },
      429,
    );
  try {
    let upstream: URL;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (provider === "usda") {
      upstream = new URL(
        search
          ? "https://api.nal.usda.gov/fdc/v1/foods/search"
          : `https://api.nal.usda.gov/fdc/v1/food/${detail![2]}`,
      );
      upstream.searchParams.set("api_key", env.USDA_API_KEY!);
      if (search) {
        upstream.searchParams.set("query", q);
        upstream.searchParams.set("pageSize", "20");
        upstream.searchParams.set("pageNumber", String(page));
      }
    } else {
      upstream = new URL(
        search
          ? "https://world.openfoodfacts.org/cgi/search.pl"
          : `https://world.openfoodfacts.org/api/v3/product/${barcode?.[1] ?? detail![2]}`,
      );
      headers["User-Agent"] =
        `Daywell/1.0 (${env.OFF_CONTACT || "personal nutrition journal"})`;
      if (search) {
        upstream.searchParams.set("search_terms", q);
        upstream.searchParams.set("search_simple", "1");
        upstream.searchParams.set("action", "process");
        upstream.searchParams.set("json", "1");
        upstream.searchParams.set("page_size", "20");
        upstream.searchParams.set("page", String(page));
      }
      upstream.searchParams.set(
        "fields",
        "code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit",
      );
    }
    const result = await fetch(upstream, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (result.status === 429)
      return json(
        {
          error:
            "The food provider is rate-limiting requests. Try again later.",
        },
        429,
      );
    if (result.status === 404)
      return json({ error: "Food not found. Create it from its label." }, 404);
    if (!result.ok)
      return json(
        { error: "Food provider unavailable. Use saved or custom foods." },
        502,
      );
    if (Number(result.headers.get("Content-Length") ?? 0) > 4_000_000)
      return json({ error: "Provider response too large." }, 502);
    const body = await result.text();
    if (body.length > 4_000_000)
      return json({ error: "Provider response too large." }, 502);
    const raw = JSON.parse(body);
    let payload;
    if (search) {
      const foods = (provider === "usda" ? raw.foods : raw.products) ?? [];
      payload = {
        foods: foods.slice(0, 20).map(provider === "usda" ? fromUSDA : fromOFF),
        cursor: foods.length === 20 ? String(page + 1) : null,
      };
    } else {
      if (provider === "off" && !raw.product)
        return json(
          { error: "Barcode not found. You can create a custom food." },
          404,
        );
      payload = {
        food: provider === "usda" ? fromUSDA(raw) : fromOFF(raw.product),
      };
    }
    if (cacheApi)
      await cacheApi.put(
        cacheKey,
        new Response(JSON.stringify(payload), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public,max-age=86400",
          },
        }),
      );
    return json(payload);
  } catch {
    return json(
      {
        error:
          "Food lookup timed out or returned invalid data. Try saved foods while offline.",
      },
      502,
    );
  }
}
export default { fetch: handle };
