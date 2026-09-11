import { describe, it, expect, vi, afterEach } from "vitest";
import { handle, type Env } from "../worker";
import {
  personalMeals,
  mealFood,
  searchPersonalFoods,
} from "../worker/personal-foods";
import { foodSchema, gramsFor, total } from "../src/domain";
const env: Env = {
  PERSONAL_API_TOKEN: "test-token",
  ASSETS: { fetch: async () => new Response("asset") },
};
const request = (q: string, provider = "usda", cursor = "1") =>
  new Request(
    `https://app/api/foods/search?q=${encodeURIComponent(q)}&provider=${provider}&cursor=${cursor}`,
    { headers: { Authorization: "Bearer test-token" } },
  );
afterEach(() => vi.unstubAllGlobals());
describe("private personal catalog", () => {
  it("provides both meals in the existing Food contract with real named servings", () => {
    for (const meal of personalMeals) {
      const food = foodSchema.parse(mealFood(meal));
      expect(food.provider).toBe("custom");
      expect(food.providerId).toBeUndefined();
      expect(gramsFor(food, 1, food.servings[0].name)).toBe(
        meal.estimatedServingGrams,
      );
      expect(food.attribution.toLowerCase()).toContain("estimated");
      expect(food.nutrients.iodine).toBeNull();
      expect(food.nutrients.calcium).toBeGreaterThan(0);
      expect(food.nutrients.iron).toBeGreaterThan(0);
      expect(food.nutrients.potassium).toBeGreaterThan(0);
      expect(food.nutrients.magnesium).toBeGreaterThan(0);
      expect(food.nutrients.zinc).toBeGreaterThan(0);
      expect(food.nutrients.b12).toBeGreaterThan(0);
      expect(food.id).toContain(":v2");
    }
  });
  it("calculates complete portions rather than treating a raw pound as cooked or sharing one rice bowl", () => {
    const [burrito, chicken] = personalMeals.map(mealFood);
    const serving = (food: typeof burrito, key: string) =>
      total([{ food, grams: food.servings[0].grams }], key).value;
    expect(serving(burrito, "calories")).toBeCloseTo(750);
    expect(serving(burrito, "protein")).toBeCloseTo(36.84);
    expect(serving(burrito, "sodium")).toBeCloseTo(1413);
    expect(serving(chicken, "calories")).toBeCloseTo(
      (4.5359237 * 120 + 2.4 * 26 + 1.525 * 41 + 5.5 * 15 + 580 + 420) / 2,
    );
    expect(serving(chicken, "protein")).toBeGreaterThan(57);
  });
  it("matches names and personal catalog listing without matching unrelated foods", () => {
    expect(searchPersonalFoods("PERSONAL")).toHaveLength(2);
    expect(searchPersonalFoods("breakfast burrito")).toHaveLength(1);
    expect(searchPersonalFoods("teriyaki chicken w/ rice")).toHaveLength(1);
    expect(searchPersonalFoods("banana")).toHaveLength(0);
    expect(searchPersonalFoods("and with")).toHaveLength(0);
    expect(new Set(searchPersonalFoods("personal").map((f) => f.id)).size).toBe(
      2,
    );
  });
  it("works with either provider selected, no USDA key, denied provider quota and no network/cache access", async () => {
    const network = vi.fn(() => {
      throw Error("must not call provider");
    });
    const cache = vi.fn(() => {
      throw Error("must not use shared cache");
    });
    vi.stubGlobal("fetch", network);
    vi.stubGlobal("caches", { default: { match: cache } });
    for (const provider of ["usda", "off"]) {
      const response = await handle(request("personal", provider), {
        ...env,
        SEARCH_LIMIT: { limit: async () => ({ success: false }) },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const payload = (await response.json()) as any;
      expect(payload.foods).toHaveLength(2);
      expect(payload.cursor).toBeNull();
    }
    expect(network).not.toHaveBeenCalled();
    expect(cache).not.toHaveBeenCalled();
  });
  it("does not leak catalog without authentication or duplicate it on later pages", async () => {
    expect(
      (
        await handle(
          new Request("https://app/api/foods/search?q=personal"),
          env,
        )
      ).status,
    ).toBe(401);
    const second = await handle(request("personal", "usda", "2"), env);
    expect(await second.json()).toEqual({ foods: [], cursor: null });
    expect((await handle(request("banana"), env)).status).toBe(503); // existing USDA configuration error
    expect((await handle(request("personal", "invalid"), env)).status).toBe(
      400,
    );
  });
});
