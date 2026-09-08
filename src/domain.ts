import { z } from "zod";
export const finite = z.number().finite();
export const positive = finite.positive();
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T12:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Enter a valid calendar date.");
const timezoneSchema = z.string().refine((s) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: s });
    return true;
  } catch {
    return false;
  }
}, "Choose a valid IANA timezone.");
export const nutrientMapSchema = z.record(finite.nonnegative().nullable());
export const foodSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  provider: z.enum(["custom", "usda", "off", "recipe"]),
  providerId: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  nutrients: nutrientMapSchema,
  servings: z.array(z.object({ name: z.string(), grams: positive })),
  density: positive.optional(),
  retrievedAt: z.string().optional(),
  attribution: z.string(),
  favorite: z.boolean().default(false),
  edited: z.boolean().default(false),
  revision: finite.int().default(1),
});
export type Food = z.infer<typeof foodSchema>;
export const profileSchema = z.object({
  name: z.string(),
  age: finite.int().min(18).max(120),
  sex: z.enum(["male", "female"]),
  heightCm: positive,
  weightKg: positive,
  units: z.enum(["metric", "imperial"]),
  precision: z.enum(["0.1", "0.01"]),
  timezone: timezoneSchema,
  activity: finite.min(1).max(2.5),
  goal: z.enum(["maintain", "lose", "gain"]),
  rate: finite.min(0).max(2),
  diet: z.string(),
  allergens: z.string(),
  interest: z.array(z.string()),
  lifeStage: z.enum(["standard", "pregnant", "lactating"]),
  amTime: z.string(),
  pmTime: z.string(),
  backupDays: finite.int().min(1).max(90),
  mealGroups: z.array(z.string().min(1)).min(1),
  lastBackup: z.string().optional(),
});
export type Profile = z.infer<typeof profileSchema>;
export const targetSchema = z.object({
  min: finite.nonnegative().optional(),
  max: finite.nonnegative().optional(),
  value: finite.nonnegative().optional(),
  mode: z.enum(["grams", "percent", "gkg"]).optional(),
});
export type Target = z.infer<typeof targetSchema>;
export const goalSchema = z.object({
  id: z.string(),
  effective: dateSchema,
  calories: positive,
  waterMl: positive,
  targets: z.record(targetSchema),
  exerciseAdjustment: z.boolean(),
});
export type Goal = z.infer<typeof goalSchema>;
const measureSchema = z.object({
  kg: positive,
  time: z.string(),
  fasted: z.boolean().default(false),
  bathroom: z.boolean().default(false),
  sameScale: z.boolean().default(true),
  sameClothes: z.boolean().default(true),
  excluded: z.boolean().default(false),
  includeNormally: z.boolean().default(false),
  notes: z.string().default(""),
});
export const checkSchema = z.object({
  date: dateSchema,
  timezone: timezoneSchema,
  am: measureSchema.optional(),
  pm: measureSchema.optional(),
  steps: finite.int().min(0).max(200000).nullable().default(null),
  complete: z.boolean().default(false),
  illness: z.boolean().default(false),
  notes: z.string().default(""),
});
export type CheckIn = z.infer<typeof checkSchema>;
export const entrySchema = z.object({
  id: z.string(),
  date: dateSchema,
  time: z.string(),
  meal: z.string(),
  grams: positive,
  quantity: positive,
  unit: z.string(),
  food: foodSchema,
});
export type Entry = z.infer<typeof entrySchema>;
export const observationSchema = z.object({
  id: z.string(),
  date: dateSchema,
  time: z.string(),
  kind: z.enum(["water", "exercise", "wellness", "body"]),
  values: z.record(z.union([finite, z.string(), z.boolean()])),
  notes: z.string().default(""),
});
export type Observation = z.infer<typeof observationSchema>;
export const recipeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  ingredients: z.array(z.object({ food: foodSchema, grams: positive })).min(1),
  yieldGrams: positive,
  portions: positive,
  template: z.boolean(),
  revision: finite.int().default(1),
});
export type Recipe = z.infer<typeof recipeSchema>;
export const dataSchema = z.object({
  version: z.literal(1),
  profile: profileSchema.nullable(),
  goals: z.array(goalSchema),
  foods: z.array(foodSchema),
  entries: z.array(entrySchema),
  checks: z.array(checkSchema),
  observations: z.array(observationSchema),
  recipes: z.array(recipeSchema),
  modelSnapshots: z.array(z.record(z.unknown())).optional(),
});
export type Data = z.infer<typeof dataSchema>;
export const emptyData: Data = {
  version: 1,
  profile: null,
  goals: [],
  foods: [],
  entries: [],
  checks: [],
  observations: [],
  recipes: [],
};
export const uid = () => crypto.randomUUID();
export function dayKey(
  date = new Date(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export const dayNumber = (s: string) => Date.parse(s + "T12:00:00Z") / 86400000;
export const shiftDay = (s: string, n: number) =>
  new Date((dayNumber(s) + n) * 86400000).toISOString().slice(0, 10);
export const kgToDisplay = (n: number, p: Profile) =>
  n * (p.units === "imperial" ? 2.2046226218 : 1);
export const displayToKg = (n: number, p: Profile) =>
  n / (p.units === "imperial" ? 2.2046226218 : 1);
export const weightUnit = (p: Profile) =>
  p.units === "imperial" ? "lb" : "kg";
export const formatWeight = (n: number, p: Profile) =>
  kgToDisplay(n, p).toFixed(p.precision === "0.01" ? 2 : 1);
export function defaultProfile(): Profile {
  return {
    name: "",
    age: 30,
    sex: "male",
    heightCm: 175,
    weightKg: 75,
    units: "imperial",
    precision: "0.1",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    activity: 1.4,
    goal: "maintain",
    rate: 0.25,
    diet: "",
    allergens: "",
    interest: [
      "fiber",
      "sodium",
      "potassium",
      "calcium",
      "iron",
      "vitaminD",
      "b12",
    ],
    lifeStage: "standard",
    amTime: "07:00",
    pmTime: "21:30",
    backupDays: 7,
    mealGroups: ["Breakfast", "Lunch", "Dinner", "Snacks", "Supplements"],
  };
}
export function gramsFor(food: Food, quantity: number, unit: string) {
  if (!Number.isFinite(quantity) || quantity <= 0)
    throw Error("Enter a positive amount.");
  if (unit === "g") return quantity;
  if (unit === "oz") return quantity * 28.349523125;
  if (unit === "ml" || unit === "fl oz") {
    if (!food.density)
      throw Error("Add a known density before using volume units.");
    return quantity * food.density * (unit === "fl oz" ? 29.5735295625 : 1);
  }
  const s = food.servings.find((s) => s.name === unit);
  if (!s) throw Error("Choose a valid serving.");
  return quantity * s.grams;
}
export function total(
  entries: Pick<Entry, "food" | "grams">[],
  nutrient: string,
) {
  let value = 0,
    known = 0,
    grams = 0,
    knownGrams = 0;
  for (const e of entries) {
    grams += e.grams;
    const v = e.food.nutrients[nutrient];
    if (v != null) {
      value += (v * e.grams) / 100;
      known++;
      knownGrams += e.grams;
    }
  }
  return {
    value: known ? value : null,
    known,
    count: entries.length,
    coverage: grams ? knownGrams / grams : 0,
  };
}
export function recipeFood(recipe: Recipe): Food {
  const keys = new Set(
    recipe.ingredients.flatMap((i) => Object.keys(i.food.nutrients)),
  );
  const nutrients: Food["nutrients"] = {};
  for (const key of keys) {
    const t = total(recipe.ingredients, key);
    nutrients[key] =
      t.known === t.count && t.value != null
        ? (t.value * 100) / recipe.yieldGrams
        : null;
  }
  return {
    id: recipe.id,
    name: recipe.name,
    provider: "recipe",
    nutrients,
    servings: [{ name: "portion", grams: recipe.yieldGrams / recipe.portions }],
    attribution: "Your recipe · unknown ingredients keep recipe values unknown",
    favorite: false,
    edited: false,
    revision: recipe.revision,
  };
}
export const activeGoal = (data: Data, date: string) =>
  [...data.goals]
    .filter((g) => g.effective <= date)
    .sort((a, b) => b.effective.localeCompare(a.effective))[0] ?? data.goals[0];
