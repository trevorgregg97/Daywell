import { describe, it, expect } from "vitest";
import {
  gramsFor,
  total,
  recipeFood,
  dayKey,
  shiftDay,
  defaultProfile,
  type Food,
  type Data,
  emptyData,
  type CheckIn,
} from "../src/domain";
import { weightTrend, energyModel, energyDensity } from "../src/model";
import { seedGoal } from "../src/nutrients";
const food: Food = {
  id: "a",
  name: "Test food",
  provider: "custom",
  nutrients: { calories: 100, protein: 10, sodium: 0, iron: null },
  servings: [{ name: "cup", grams: 90 }],
  attribution: "Test",
  favorite: false,
  edited: false,
  revision: 1,
};
export function history(days = 42, change = 0, varied = true): Data {
  const p = defaultProfile();
  p.units = "metric";
  const d: Data = {
    ...structuredClone(emptyData),
    profile: p,
    goals: [seedGoal(p)],
  };
  for (let i = 0; i < days; i++) {
    const date = shiftDay("2026-01-01", i),
      steps = varied ? (i % 2 ? 12000 : 3000) : 5000;
    const kg = 75 + i * change;
    d.checks.push({
      date,
      timezone: "America/Denver",
      am: {
        kg,
        time: date + "T07:00",
        fasted: true,
        bathroom: true,
        sameScale: true,
        sameClothes: true,
        excluded: false,
        includeNormally: false,
        notes: "",
      },
      pm: {
        kg: kg + 0.8,
        time: date + "T22:00",
        fasted: false,
        bathroom: false,
        sameScale: true,
        sameClothes: true,
        excluded: false,
        includeNormally: false,
        notes: "",
      },
      steps,
      complete: true,
      illness: false,
      notes: "",
    });
    d.entries.push({
      id: String(i),
      date,
      time: date + "T12:00",
      meal: "Lunch",
      grams: (2400 / 100) * 100,
      quantity: 24,
      unit: "serving",
      food,
    });
  }
  return d;
}
describe("nutrition and dates", () => {
  it("converts mass and named portions without guessing density", () => {
    expect(gramsFor(food, 2, "cup")).toBe(180);
    expect(gramsFor(food, 1, "oz")).toBeCloseTo(28.3495);
    expect(() => gramsFor(food, 1, "ml")).toThrow("density");
    expect(() => gramsFor(food, 0, "g")).toThrow();
    expect(gramsFor({ ...food, density: 1.03 }, 100, "ml")).toBe(103);
  });
  it("preserves unknowns and explicit zeros with coverage", () => {
    const items = [
      { food, grams: 100 },
      { food: { ...food, nutrients: { calories: 200 } }, grams: 100 },
    ];
    expect(total(items, "iron").value).toBeNull();
    expect(total(items, "sodium")).toMatchObject({
      value: 0,
      known: 1,
      coverage: 0.5,
    });
    expect(total(items, "calories").value).toBe(300);
  });
  it("recipes scale known nutrients and preserve incomplete totals", () => {
    const r = recipeFood({
      id: "r",
      name: "Recipe",
      ingredients: [{ food, grams: 200 }],
      yieldGrams: 100,
      portions: 2,
      template: false,
      revision: 1,
    });
    expect(r.nutrients.calories).toBe(200);
    expect(r.nutrients.iron).toBeNull();
    expect(r.servings[0].grams).toBe(50);
  });
  it("handles local midnight and daylight-saving transitions", () => {
    expect(dayKey(new Date("2026-09-08T02:00Z"), "America/Denver")).toBe(
      "2026-09-07",
    );
    expect(shiftDay("2026-03-08", 1)).toBe("2026-03-09");
  });
});
describe("weight normalization", () => {
  it("waits for seven pairs and normalizes evening weight", () => {
    const d = history(10);
    const points = weightTrend(d);
    expect(points[5].offset).toBeNull();
    expect(points[6].offset).toBeCloseTo(0.8);
    expect(points[6].normalized).toBeCloseTo(75);
    delete d.checks[9].am;
    expect(weightTrend(d)[9].normalized).toBeCloseTo(75);
  });
  it("excludes PM-only observations before calibration", () => {
    const d = history(3);
    d.checks.forEach((c) => delete c.am);
    expect(weightTrend(d).every((p) => p.normalized === null)).toBe(true);
  });
  it("excludes flagged AM weights and downweights fluid spikes", () => {
    const d = history(20);
    d.checks[19].am!.kg = 80;
    d.checks[19].pm!.kg = 80.8;
    expect(weightTrend(d)[19].outlierWeight).toBeLessThan(0.2);
    d.checks[19].am!.excluded = true;
    d.checks[19].pm!.excluded = true;
    expect(weightTrend(d)[19].normalized).toBeNull();
  });
  it("nonfasted AM receives lower reliability", () => {
    const d = history(3);
    d.checks[1].am!.fasted = false;
    expect(weightTrend(d)[1].reliability).toBe(0.4);
  });
});
describe("energy model", () => {
  it("is deterministic and remains provisional below 14 complete days", () => {
    const d = history(13);
    const m = energyModel(d, "2026-02-11")!;
    expect(m.ready).toBe("provisional");
    expect(m.stepKcalPer1000).toBeNull();
    expect(energyModel(d, "2026-02-11")).toEqual(m);
  });
  it("personalizes after sufficient complete, varied days", () => {
    const m = energyModel(history(42), "2026-02-11")!;
    expect(m.ready).toBe("personalized");
    expect(m.stepKcalPer1000).not.toBeNull();
    expect(m.baseline).toBeGreaterThan(2000);
    expect(m.baseline).toBeLessThan(2900);
    expect(m.bmr).toBeGreaterThan(1500);
  });
  it("does not personalize step response without activity variation", () => {
    expect(
      energyModel(history(42, 0, false), "2026-02-11")!.stepKcalPer1000,
    ).toBeNull();
  });
  it("uses intake and sustained weight change in expenditure", () => {
    const loss = energyModel(history(42, -0.04), "2026-02-11")!;
    const gain = energyModel(history(42, 0.04), "2026-02-11")!;
    expect(loss.baseline).toBeGreaterThan(gain.baseline);
  });
  it("does not count incomplete or missing-energy days", () => {
    const d = history(42);
    d.checks.forEach((c) => (c.complete = false));
    expect(energyModel(d, "2026-02-11")!.validDays).toBe(0);
    const d2 = history(42);
    d2.entries.forEach(
      (e) => (e.food = { ...e.food, nutrients: { calories: null } }),
    );
    expect(energyModel(d2, "2026-02-11")!.validDays).toBe(0);
  });
  it("missing steps are unknown and widen uncertainty", () => {
    const full = history(42);
    const incomplete = history(42);
    incomplete.checks.slice(15).forEach((c, i) => {
      if (i % 2) c.steps = null;
    });
    expect(energyModel(incomplete, "2026-02-11")!.uncertainty).toBeGreaterThan(
      energyModel(full, "2026-02-11")!.uncertainty,
    );
  });
  it("does not count walking exercise twice", () => {
    const d = history(42);
    const before = energyModel(d, "2026-02-11")!;
    d.observations.push({
      id: "walk",
      date: "2026-02-11",
      time: "2026-02-11T12:00",
      kind: "exercise",
      values: { calories: 400, nonStep: false },
      notes: "",
    });
    expect(energyModel(d, "2026-02-11")!.days.at(-1)!.tdee).toBe(
      before.days.at(-1)!.tdee,
    );
  });
  it("effective tissue density varies with body composition prior", () => {
    const p = defaultProfile();
    expect(energyDensity(p, 60)).not.toBe(energyDensity(p, 100));
  });
});
