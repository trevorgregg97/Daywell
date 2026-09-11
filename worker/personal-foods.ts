import { foodSchema, type Food } from "../src/domain";
import { nutrients } from "../src/nutrients";
import references from "./ingredient-references.json" with { type: "json" };
import { fromUSDA } from "./providers";

// Server-only catalog: never import this module into src/. New nutrition revisions
// must use new IDs so a phone's saved corrections and old diary snapshots survive.
type Ingredient = {
  name: string;
  amount: number;
  basis: string;
  nutrients: Food["nutrients"];
  source: string;
};
type Meal = {
  id: string;
  name: string;
  aliases: string;
  portions: number;
  serving: string;
  estimatedServingGrams: number;
  notes: string;
  ingredients: Ingredient[];
};
const fdc = (id: number) =>
  `https://fdc.nal.usda.gov/food-details/${id}/nutrients`;
export const personalMeals: Meal[] = [
  {
    id: "personal:breakfast-burrito:v1",
    name: "Personal Breakfast burrito — estimated v1",
    aliases: "breakfast burrito eggs cheese salsa mateos la flor",
    portions: 1,
    serving: "1 burrito (with salsa; estimated)",
    estimatedServingGrams: 320,
    notes:
      "1 tortilla, 3 eggs, 1/2 cup (56g) cheese, 1.5 tbsp butter, 4 tbsp salsa. All butter counted. Tortilla macros/sodium are provisional matching-150-kcal-label estimates; verify your package. Butter uses salted-stick label proxy. Log by burrito, not cooked grams: 320g finished weight is only an estimate.",
    ingredients: [
      {
        name: "La Flor premium uncooked flour tortilla",
        amount: 1,
        basis: "1 tortilla",
        nutrients: {
          calories: 150,
          protein: 6,
          carbs: 25,
          fat: 3.5,
          sodium: 230,
          fiber: 1,
        },
        source:
          "User calories; provisional 150-kcal flour version: https://foods.fatsecret.com/calories-nutrition/la-flor/uncooked-flour-tortilla",
      },
      {
        name: "Large eggs",
        amount: 1.5,
        basis: "100g edible raw egg; 3 eggs assumed 150g",
        nutrients: {
          calories: 140,
          protein: 12.56,
          carbs: 0.72,
          fat: 9.51,
          sodium: 142,
          fiber: 0,
          calcium: 56,
          iron: 1.75,
          potassium: 138,
          b12: 0.89,
          vitaminD: 2,
        },
        source: `User 70 kcal/egg overrides USDA energy only; ${fdc(171287)}`,
      },
      {
        name: "Kroger Mexican style blend cheese",
        amount: 2,
        basis: "28g (1/4 cup)",
        nutrients: {
          calories: 110,
          protein: 6,
          carbs: 1,
          fat: 9,
          sodium: 200,
          fiber: 0,
          calcium: 190,
          iron: 0,
          potassium: 0,
          vitaminD: 0,
        },
        source:
          "https://www.kroger.com/p/kroger-shredded-mexican-style-cheese-blend/0001111050204",
      },
      {
        name: "Kerrygold salted butter",
        amount: 1.5,
        basis: "1 tbsp (14g)",
        nutrients: {
          calories: 100,
          protein: 0,
          carbs: 0,
          fat: 11,
          sodium: 100,
          fiber: 0,
        },
        source:
          "https://www.kerrygoldusa.com/products/salted-butter-sticks-1lb/",
      },
      {
        name: "Mateo's Gourmet Hot salsa",
        amount: 2,
        basis: "2 tbsp",
        nutrients: { calories: 10, sodium: 210, carbs: 2, protein: 0, fat: 0 },
        source:
          "User label calories/sodium; https://mateos.com/pages/frequently-asked-questions ; macro proxy https://gardengrocer.com/product/8017-mateos-all-natural-gourmet-salsa-hot-regular-16oz-glass-jar (different sodium label; other micros left unknown)",
      },
    ],
  },
  {
    id: "personal:teriyaki-chicken-rice:v1",
    name: "Personal Teriyaki chicken with rice — estimated v1",
    aliases: "teriyaki chicken rice stir fry dinner bibigo",
    portions: 2,
    serving: "1 serving (half batch, including 1 rice bowl; estimated)",
    estimatedServingGrams: 550,
    notes:
      "Batch: 1lb raw skinless boneless chicken breast, 240g trimmed red peppers, 152.5g carrots (2.5 medium), 5.5 tbsp sauce, 2 Bibigo rice bowls, 3.5 tbsp avocado oil. All oil counted. Rice 290 kcal/bowl per your estimate; rice macros/sodium use 210g USDA cooked medium-grain proxy, not a verified Bibigo label. Log by serving: 550g finished weight is only an estimate. No extra salt included.",
    ingredients: [
      {
        name: "Raw skinless boneless chicken breast",
        amount: 4.5359237,
        basis: "100g raw",
        nutrients: {
          calories: 120,
          protein: 22.5,
          carbs: 0,
          fat: 2.62,
          sodium: 45,
          fiber: 0,
          calcium: 5,
          iron: 0.37,
          potassium: 334,
          b12: 0.21,
        },
        source: fdc(171077),
      },
      {
        name: "Red bell peppers, trimmed",
        amount: 2.4,
        basis: "100g edible raw; assume 120g per pepper",
        nutrients: {
          calories: 26,
          protein: 0.99,
          carbs: 6.03,
          fat: 0.3,
          sodium: 4,
          fiber: 2.1,
          calcium: 7,
          iron: 0.43,
          potassium: 211,
        },
        source: fdc(170108),
      },
      {
        name: "Carrots",
        amount: 1.525,
        basis: "100g edible raw; assume 61g per carrot",
        nutrients: {
          calories: 41,
          protein: 0.93,
          carbs: 9.58,
          fat: 0.24,
          sodium: 69,
          fiber: 2.8,
          calcium: 33,
          iron: 0.3,
          potassium: 320,
        },
        source: fdc(170393),
      },
      {
        name: "Kroger Sesame Teriyaki Stir Fry Sauce",
        amount: 5.5,
        basis: "1 tbsp (17g)",
        nutrients: {
          calories: 15,
          protein: 0,
          carbs: 3,
          fat: 0,
          sodium: 200,
          sugar: 2,
          addedSugar: 2,
        },
        source:
          "User label confirmed; https://www.kroger.com/p/kroger-sesame-teriyaki-sauce/0001111015801",
      },
      {
        name: "Bibigo rice bowl (generic macros pending label)",
        amount: 2,
        basis: "1 bowl, assumed 210g",
        nutrients: {
          calories: 290,
          protein: 2.38 * 2.1,
          carbs: 28.59 * 2.1,
          fat: 0.21 * 2.1,
          sodium: 0,
        },
        source: `User energy estimate; generic macro/sodium proxy ${fdc(168930)}; https://www.bibigousa.com/products/shop-cooked-sticky-white-rice`,
      },
      {
        name: "Avocado oil (brand unspecified)",
        amount: 3.5,
        basis: "1 tbsp",
        nutrients: { calories: 120, protein: 0, carbs: 0, fat: 14, sodium: 0 },
        source:
          "Label proxy https://www.kroger.com/p/private-selection-cold-pressed-avocado-oil/0001111012325",
      },
    ],
  },
];

export function mealFood(meal: Meal): Food {
  const referenceIds =
    meal.portions === 1
      ? [175037, 171287, 171288, 173410, 174524]
      : [171077, 170108, 170393, 171167, 168930, 173573];
  const referenceGrams =
    meal.portions === 1 ? [51, 100, 28, 14, 30] : [100, 100, 100, 17, 210, 14];
  const ingredients = meal.ingredients.map((ingredient, index) => {
    const reference = fromUSDA(
      references.find((r) => r.fdcId === referenceIds[index])!,
    ).nutrients;
    const combined = { ...ingredient.nutrients };
    for (const nutrient of nutrients) {
      if (!["Vitamins", "Minerals"].includes(nutrient.group)) continue;
      const value = reference[nutrient.id];
      if (combined[nutrient.id] == null && value != null)
        combined[nutrient.id] = (value * referenceGrams[index]) / 100;
    }
    return { ...ingredient, nutrients: combined };
  });
  const map: Food["nutrients"] = {};
  for (const nutrient of nutrients) {
    const values = ingredients.map((i) => i.nutrients[nutrient.id]);
    // A partial ingredient sum is not a complete meal nutrient value.
    map[nutrient.id] = values.some((v) => v == null)
      ? null
      : (values.reduce<number>(
          (sum, v, index) => sum + v! * meal.ingredients[index].amount,
          0,
        ) /
          meal.portions /
          meal.estimatedServingGrams) *
        100;
  }
  if (map.calories != null) map.kilojoules = map.calories * 4.184;
  return foodSchema.parse({
    id: meal.id.replace(":v1", ":v2"),
    name: meal.name.replace("v1", "v2"),
    provider: "custom",
    brand: "Your personal meals",
    nutrients: map,
    servings: [{ name: meal.serving, grams: meal.estimatedServingGrams }],
    attribution: `Personal catalog v2 · Estimated label/USDA blend, NOT USDA or OFF product data. Missing vitamins and minerals use per-ingredient USDA SR Legacy reference estimates; raw ingredient composition is used without cooking-retention adjustment. Reference FDC IDs: ${referenceIds.join(", ")}. ${meal.notes} Unreported reference nutrients remain unknown. Sources: ${meal.ingredients.map((i) => `${i.name}: ${i.source}`).join("; ")}`,
    retrievedAt: "2026-09-10T00:00:00.000Z",
    revision: 2,
    favorite: false,
    edited: false,
  });
}

export function searchPersonalFoods(query: string): Food[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["with", "and", "w"].includes(w));
  if (!words.length) return [];
  return personalMeals
    .filter((meal) => {
      const text = `${meal.name} ${meal.aliases} my meals`.toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .map(mealFood);
}
