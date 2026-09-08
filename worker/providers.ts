import { type Food } from "../src/domain";
import { nutrients } from "../src/nutrients";
type Json = Record<string, any>;
function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0)
    return value;
  return null;
}
function convert(value: number, from: string, to: string): number | null {
  const units: Record<string, number> = {
    g: 1,
    mg: 0.001,
    ug: 0.000001,
    µg: 0.000001,
    mcg: 0.000001,
  };
  from = from.toLowerCase();
  to = to.toLowerCase();
  if (from === to) return value;
  if (units[from] && units[to]) return (value * units[from]) / units[to];
  return null;
}
export function fromUSDA(raw: Json): Food {
  const map: Food["nutrients"] = {};
  for (const n of nutrients) {
    const matches = (raw.foodNutrients ?? []).filter(
      (x: Json) => (x.nutrient?.id ?? x.nutrientId) === n.usda,
    );
    const match = matches.find(
      (x: Json) => numeric(x.amount ?? x.value) !== null,
    );
    const value = match ? numeric(match.amount ?? match.value) : null;
    let result: number | null = null;
    if (value !== null) {
      const from = match.nutrient?.unitName ?? match.unitName;
      result = from ? convert(value, from, n.unit) : null;
      if (n.id === "water" && String(from).toLowerCase() === "g")
        result = value;
    }
    map[n.id] = result;
  }
  if (map.calories === null) {
    for (const id of [2048, 2047]) {
      const energy = (raw.foodNutrients ?? []).find(
        (x: Json) => (x.nutrient?.id ?? x.nutrientId) === id,
      );
      if (energy && numeric(energy.amount ?? energy.value) !== null) {
        map.calories = energy.amount ?? energy.value;
        break;
      }
    }
  }
  if (map.calories == null && map.kilojoules != null)
    map.calories = map.kilojoules / 4.184;
  if (map.kilojoules == null && map.calories != null)
    map.kilojoules = map.calories * 4.184;
  if (map.carbs != null && map.fiber != null)
    map.netCarbs = Math.max(0, map.carbs - map.fiber);
  const servings = (raw.foodPortions ?? [])
    .filter((s: Json) => numeric(s.gramWeight) !== null && s.gramWeight > 0)
    .map((s: Json) => ({
      name: `${s.amount ?? 1} ${s.modifier ?? s.measureUnit?.name ?? s.portionDescription ?? "portion"}`,
      grams: s.gramWeight,
    }));
  if (
    numeric(raw.servingSize) &&
    String(raw.servingSizeUnit).toLowerCase() === "g"
  )
    servings.unshift({
      name: raw.householdServingFullText || "serving",
      grams: raw.servingSize,
    });
  return {
    id: "usda:" + raw.fdcId,
    providerId: String(raw.fdcId),
    name: raw.description || "USDA food",
    provider: "usda",
    brand: raw.brandOwner ?? raw.brandName,
    barcode: raw.gtinUpc,
    servings,
    nutrients: map,
    attribution: "USDA FoodData Central · CC0",
    retrievedAt: new Date().toISOString(),
    edited: false,
    favorite: false,
    revision: 1,
  };
}
export function fromOFF(raw: Json): Food {
  const map: Food["nutrients"] = {};
  const data = raw.nutriments ?? {};
  for (const n of nutrients) {
    const value = n.off ? numeric(data[n.off + "_100g"]) : null;
    let result = value;
    if (value !== null && n.off) {
      if (!["calories", "kilojoules"].includes(n.id))
        result = convert(value, "g", n.unit);
    }
    map[n.id] = result;
  }
  // OFF normalizes mass nutrients to g per 100g; alcohol is volume percent and not grams.
  const grams = numeric(raw.serving_quantity);
  const unit = String(raw.serving_quantity_unit ?? "g").toLowerCase();
  const servings =
    grams && unit === "g"
      ? [{ name: raw.serving_size || "serving", grams }]
      : [];
  if (map.calories == null && map.kilojoules != null)
    map.calories = map.kilojoules / 4.184;
  if (map.kilojoules == null && map.calories != null)
    map.kilojoules = map.calories * 4.184;
  return {
    id: "off:" + raw.code,
    providerId: String(raw.code),
    barcode: String(raw.code),
    name: raw.product_name || raw.product_name_en || "Packaged food",
    brand: raw.brands,
    provider: "off",
    nutrients: map,
    servings,
    attribution:
      "Open Food Facts · ODbL · carbohydrate labeling conventions may vary; verify label",
    retrievedAt: new Date().toISOString(),
    favorite: false,
    edited: false,
    revision: 1,
  };
}
