import { type Profile, type Goal, type Target, uid, dayKey } from "./domain";
export type Nutrient = {
  id: string;
  name: string;
  unit: string;
  group: string;
  usda?: number;
  off?: string;
  male?: number;
  female?: number;
  upper?: number;
};
const row = (
  id: string,
  name: string,
  unit: string,
  group: string,
  usda?: number,
  off?: string,
  male?: number,
  female?: number,
  upper?: number,
): Nutrient => ({ id, name, unit, group, usda, off, male, female, upper });
export const nutrients: Nutrient[] = [
  row("calories", "Energy", "kcal", "Energy", 1008, "energy-kcal"),
  row("kilojoules", "Energy", "kJ", "Energy", 1062, "energy"),
  row("protein", "Protein", "g", "Macros", 1003, "proteins"),
  row("carbs", "Carbohydrate", "g", "Macros", 1005, "carbohydrates", 130, 130),
  row("fat", "Fat", "g", "Macros", 1004, "fat"),
  row("fiber", "Fiber", "g", "Macros", 1079, "fiber", 38, 25),
  row("sugar", "Total sugar", "g", "Macros", 2000, "sugars"),
  row("addedSugar", "Added sugar", "g", "Macros", 1235, "added-sugars"),
  row("starch", "Starch", "g", "Macros", 1009, "starch"),
  row("sugarAlcohol", "Sugar alcohol", "g", "Macros", 1086, "polyols"),
  row("netCarbs", "Net carbs (carbs − fiber)", "g", "Macros"),
  row("saturated", "Saturated fat", "g", "Fats", 1258, "saturated-fat"),
  row("trans", "Trans fat", "g", "Fats", 1257, "trans-fat"),
  row("mono", "Monounsaturated fat", "g", "Fats", 1292, "monounsaturated-fat"),
  row("poly", "Polyunsaturated fat", "g", "Fats", 1293, "polyunsaturated-fat"),
  row("ala", "Omega-3 ALA", "g", "Fats", 1404, undefined, 1.6, 1.1),
  row("epa", "Omega-3 EPA", "g", "Fats", 1278),
  row("dha", "Omega-3 DHA", "g", "Fats", 1272),
  row("omega6", "Omega-6 linoleic acid", "g", "Fats", 1269, undefined, 17, 12),
  row("cholesterol", "Cholesterol", "mg", "Fats", 1253, "cholesterol"),
  row("sodium", "Sodium", "mg", "Minerals", 1093, "sodium", 1500, 1500),
  row(
    "potassium",
    "Potassium",
    "mg",
    "Minerals",
    1092,
    "potassium",
    3400,
    2600,
  ),
  row(
    "calcium",
    "Calcium",
    "mg",
    "Minerals",
    1087,
    "calcium",
    1000,
    1000,
    2500,
  ),
  row("iron", "Iron", "mg", "Minerals", 1089, "iron", 8, 18, 45),
  row("magnesium", "Magnesium", "mg", "Minerals", 1090, "magnesium", 420, 320),
  row(
    "phosphorus",
    "Phosphorus",
    "mg",
    "Minerals",
    1091,
    "phosphorus",
    700,
    700,
    4000,
  ),
  row("zinc", "Zinc", "mg", "Minerals", 1095, "zinc", 11, 8, 40),
  row("copper", "Copper", "mg", "Minerals", 1098, "copper", 0.9, 0.9, 10),
  row(
    "manganese",
    "Manganese",
    "mg",
    "Minerals",
    1101,
    "manganese",
    2.3,
    1.8,
    11,
  ),
  row("selenium", "Selenium", "µg", "Minerals", 1103, "selenium", 55, 55, 400),
  row("iodine", "Iodine", "µg", "Minerals", 1100, "iodine", 150, 150, 1100),
  row(
    "chloride",
    "Chloride",
    "mg",
    "Minerals",
    1088,
    "chloride",
    2300,
    2300,
    3600,
  ),
  row("chromium", "Chromium", "µg", "Minerals", 1096, "chromium", 35, 25),
  row(
    "molybdenum",
    "Molybdenum",
    "µg",
    "Minerals",
    1102,
    "molybdenum",
    45,
    45,
    2000,
  ),
  row("fluoride", "Fluoride", "mg", "Minerals", 1099, "fluoride", 4, 3, 10),
  row(
    "vitaminA",
    "Vitamin A (RAE)",
    "µg",
    "Vitamins",
    1106,
    undefined,
    900,
    700,
  ),
  row(
    "vitaminC",
    "Vitamin C",
    "mg",
    "Vitamins",
    1162,
    "vitamin-c",
    90,
    75,
    2000,
  ),
  row(
    "vitaminD",
    "Vitamin D",
    "µg",
    "Vitamins",
    1114,
    "vitamin-d",
    15,
    15,
    100,
  ),
  row(
    "vitaminE",
    "Vitamin E (alpha-tocopherol)",
    "mg",
    "Vitamins",
    1109,
    "vitamin-e",
    15,
    15,
  ),
  row("vitaminK", "Vitamin K", "µg", "Vitamins", 1185, "vitamin-k", 120, 90),
  row(
    "thiamin",
    "Thiamin (B1)",
    "mg",
    "Vitamins",
    1165,
    "vitamin-b1",
    1.2,
    1.1,
  ),
  row(
    "riboflavin",
    "Riboflavin (B2)",
    "mg",
    "Vitamins",
    1166,
    "vitamin-b2",
    1.3,
    1.1,
  ),
  row("niacin", "Niacin", "mg", "Vitamins", 1167, "vitamin-pp", 16, 14),
  row(
    "pantothenic",
    "Pantothenic acid",
    "mg",
    "Vitamins",
    1170,
    "pantothenic-acid",
    5,
    5,
  ),
  row("b6", "Vitamin B6", "mg", "Vitamins", 1175, "vitamin-b6", 1.3, 1.3, 100),
  row("biotin", "Biotin", "µg", "Vitamins", 1176, "biotin", 30, 30),
  row("folate", "Folate (DFE)", "µg", "Vitamins", 1190, undefined, 400, 400),
  row("b12", "Vitamin B12", "µg", "Vitamins", 1178, "vitamin-b12", 2.4, 2.4),
  row("choline", "Choline", "mg", "Vitamins", 1180, undefined, 550, 425, 3500),
  row("caffeine", "Caffeine", "mg", "Other", 1057, "caffeine"),
  row("alcohol", "Alcohol", "g", "Other", 1018),
  ...[
    [1210, "tryptophan"],
    [1211, "threonine"],
    [1212, "isoleucine"],
    [1213, "leucine"],
    [1214, "lysine"],
    [1215, "methionine"],
    [1217, "phenylalanine"],
    [1219, "valine"],
    [1221, "histidine"],
  ].map(([id, name]) =>
    row(
      String(name),
      String(name)[0].toUpperCase() + String(name).slice(1),
      "g",
      "Amino acids",
      Number(id),
    ),
  ),
];
export function resting(p: Profile, kg = p.weightKg) {
  return (
    10 * kg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161)
  );
}
export function seedGoal(p: Profile): Goal {
  const calories =
    Math.round(
      (resting(p) * p.activity +
        (p.goal === "lose" ? -1 : p.goal === "gain" ? 1 : 0) * p.rate * 1100) /
        10,
    ) * 10;
  const targets: Record<string, Target> = {};
  for (const n of nutrients) {
    const value = p.sex === "male" ? n.male : n.female;
    if (value != null)
      targets[n.id] = { value, ...(n.upper ? { max: n.upper } : {}) };
  }
  if (p.age >= 51) {
    targets.fiber = { value: p.sex === "male" ? 30 : 21 };
    targets.iron = { value: 8, max: 45 };
    targets.chromium = { value: p.sex === "male" ? 30 : 20 };
    targets.chloride = { value: p.age >= 71 ? 1800 : 2000, max: 3600 };
    targets.omega6 = { value: p.sex === "male" ? 14 : 11 };
    targets.b6 = { value: p.sex === "male" ? 1.7 : 1.5, max: 100 };
    if (p.sex === "female" || p.age >= 71)
      targets.calcium = { value: 1200, max: 2000 };
    else targets.calcium.max = 2000;
  }
  if (p.age >= 71) {
    targets.vitaminD = { value: 20, max: 100 };
    targets.phosphorus.max = 3000;
  }
  if (p.age < 31) targets.magnesium = { value: p.sex === "male" ? 400 : 310 };
  if (p.lifeStage !== "standard" && p.sex === "female") {
    const pregnant = p.lifeStage === "pregnant";
    for (const [id, v] of Object.entries({
      iron: pregnant ? 27 : 9,
      folate: pregnant ? 600 : 500,
      b12: 2.6 + (pregnant ? 0 : 0.2),
      choline: pregnant ? 450 : 550,
      iodine: pregnant ? 220 : 290,
      zinc: pregnant ? 11 : 12,
      vitaminA: pregnant ? 770 : 1300,
      vitaminC: pregnant ? 85 : 120,
      thiamin: 1.4,
      riboflavin: pregnant ? 1.4 : 1.6,
      b6: pregnant ? 1.9 : 2,
      niacin: pregnant ? 18 : 17,
      pantothenic: pregnant ? 6 : 7,
      biotin: pregnant ? 30 : 35,
      selenium: pregnant ? 60 : 70,
      copper: pregnant ? 1 : 1.3,
      manganese: pregnant ? 2 : 2.6,
      chromium: pregnant ? 30 : 45,
      molybdenum: 50,
      magnesium: p.age < 31 ? 350 : 360,
      potassium: pregnant ? 2900 : 2800,
      fiber: pregnant ? 28 : 29,
      ala: pregnant ? 1.4 : 1.3,
      omega6: 13,
      carbs: pregnant ? 175 : 210,
    }))
      targets[id] = { ...targets[id], value: v };
  }
  targets.protein = { value: 1.6, mode: "gkg" };
  targets.carbs = { value: 45, mode: "percent" };
  targets.fat = { value: 30, mode: "percent" };
  targets.sodium = { value: 1500, max: 2300 };
  targets.saturated = { max: (calories * 0.1) / 9 };
  targets.addedSugar = { max: (calories * 0.1) / 4 };
  return {
    id: uid(),
    effective: dayKey(new Date(), p.timezone),
    calories,
    waterMl: 2000,
    targets,
    exerciseAdjustment: false,
  };
}
export function targetValue(
  id: string,
  t: Target | undefined,
  g: Goal,
  p: Profile,
) {
  if (t?.value == null) return undefined;
  return t.mode === "gkg"
    ? t.value * p.weightKg
    : t.mode === "percent"
      ? ((t.value / 100) * g.calories) / (id === "fat" ? 9 : 4)
      : t.value;
}
export const referenceUrl =
  "https://ods.od.nih.gov/HealthInformation/nutrientrecommendations.aspx";
