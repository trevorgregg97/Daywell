import { describe, it, expect, vi, afterEach } from "vitest";
import { fromUSDA, fromOFF } from "../worker/providers";
import { handle, type Env } from "../worker";
afterEach(() => vi.unstubAllGlobals());
describe("food contracts", () => {
  it("normalizes USDA units and unknowns", () => {
    const f = fromUSDA({
      fdcId: 1,
      description: "Test",
      foodNutrients: [
        { nutrient: { id: 1008, unitName: "KCAL" }, amount: 120 },
        { nutrient: { id: 1103, unitName: "UG" }, amount: 25 },
        { nutrient: { id: 1099, unitName: "UG" }, amount: 10 },
      ],
    });
    expect(f.nutrients.calories).toBe(120);
    expect(f.nutrients.selenium).toBe(25);
    expect(f.nutrients.fluoride).toBeCloseTo(0.01);
    expect(f.nutrients.iron).toBeNull();
  });
  it("converts OFF mass nutrients from grams, preserves zero", () => {
    const f = fromOFF({
      code: "12345678",
      product_name: "Test",
      nutriments: {
        "energy-kcal_100g": 250,
        sodium_100g: 0.2,
        "vitamin-b12_100g": 0.000003,
        iron_100g: 0,
      },
    });
    expect(f.nutrients.sodium).toBe(200);
    expect(f.nutrients.b12).toBeCloseTo(3);
    expect(f.nutrients.iron).toBe(0);
    expect(f.nutrients.calcium).toBeNull();
  });
  it("guards absent keys, authorization, paths, and methods", async () => {
    const env: Env = { ASSETS: { fetch: async () => new Response("asset") } };
    expect(
      (await handle(new Request("https://app/api/foods/search?q=rice"), env))
        .status,
    ).toBe(503);
    env.PERSONAL_API_TOKEN = "secret";
    expect(
      (await handle(new Request("https://app/api/foods/search?q=rice"), env))
        .status,
    ).toBe(401);
    expect(
      (
        await handle(
          new Request("https://app/api/foods/barcode/not-a-code", {
            headers: { Authorization: "Bearer secret" },
          }),
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handle(
          new Request("https://app/api/foods/search", { method: "POST" }),
          env,
        )
      ).status,
    ).toBe(405);
  });
  it("returns typed provider rate-limit response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 429 })),
    );
    const env: Env = {
      PERSONAL_API_TOKEN: "secret",
      ASSETS: { fetch: async () => new Response("asset") },
    };
    const r = await handle(
      new Request("https://app/api/foods/barcode/12345678", {
        headers: { Authorization: "Bearer secret" },
      }),
      env,
    );
    expect(r.status).toBe(429);
  });
  it("returns unavailable on malformed upstream data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json")),
    );
    const env: Env = {
      PERSONAL_API_TOKEN: "secret",
      ASSETS: { fetch: async () => new Response("asset") },
    };
    expect(
      (
        await handle(
          new Request("https://app/api/foods/barcode/12345678", {
            headers: { Authorization: "Bearer secret" },
          }),
          env,
        )
      ).status,
    ).toBe(502);
  });
});
