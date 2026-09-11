# Personal meal catalog

## September 10 update: v2

Search **personal** and select the **v2** foods for micronutrient-enriched future entries. Existing v1 diary snapshots and local corrections remain unchanged. v2 supplements missing vitamins/minerals with USDA SR Legacy ingredient references (label values, including known zero, take precedence). The exact reference snapshot is `worker/ingredient-references.json`; `scripts/ingredient-references.py` reproduces it from the USDA public archive. These are generic ingredient estimates, not laboratory measurements of the branded finished meals. No cooking-retention adjustment is applied, so heat-sensitive vitamins remain approximate. Unknown reference values are still null.

The app now uses dark surfaces, larger touch controls, visible overlaid AM weight markers, and reduced explanatory copy. Hydration inputs/widgets are removed; old hydration records and backup fields are retained for safe restoration. In-app credits remain brief, with full provenance retained in exported food snapshots.

The Worker-only catalog in `worker/personal-foods.ts` serves prepared foods through the existing authenticated search endpoint. The installed app needs no frontend change or file import. Search **personal** to see both meals, or search **Breakfast burrito** / **Teriyaki chicken with rice**, with either database selected. Select a result to save it locally, then log its named serving. Saved meals work offline.

Matching personal queries return a dedicated personal result set without consulting upstream providers, their quotas, or the shared edge cache. Nonmatching queries follow the unchanged USDA/OFF workflow. Results require the existing personal API token and use `Cache-Control: no-store`. Catalog definitions are bundled only into the Worker, not public frontend assets. No diary is uploaded, modified, or restored.

## v1 quantities and estimates

| Ingredient | Burrito: one whole meal                                                   | Chicken/rice: full two-serving batch                                   |
| ---------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Tortilla   | 1 La Flor premium uncooked, user label 150 kcal                           | —                                                                      |
| Eggs       | 3 large, 70 kcal each, 150g edible weight assumed                         | —                                                                      |
| Cheese     | Kroger Mexican blend, 56g / 1/2 cup                                       | —                                                                      |
| Butter     | Kerrygold salted, 1.5 tbsp, all counted                                   | —                                                                      |
| Salsa      | Mateo's Hot, assumed 4 tbsp; user label 10 kcal / 210mg sodium per 2 tbsp | —                                                                      |
| Chicken    | —                                                                         | 453.59237g raw skinless boneless breast                                |
| Peppers    | —                                                                         | 240g edible red pepper, estimated after trimming                       |
| Carrots    | —                                                                         | 152.5g, estimated 2.5 medium carrots                                   |
| Sauce      | —                                                                         | Kroger Sesame Teriyaki Stir Fry, 5.5 tbsp, 15 kcal / 200mg sodium each |
| Rice       | —                                                                         | 2 bowls, 290 kcal each per user's estimate                             |
| Oil        | —                                                                         | 3.5 tbsp avocado oil, all counted                                      |

Nutrition is calculated from ingredient data, not hardcoded meal totals: approximately **750 kcal per burrito** and **876 kcal per chicken/rice serving**. User label values take precedence. USDA generic data supplies raw egg/chicken/vegetable references. Rice macros use a provisional 210g cooked medium-grain USDA proxy; tortilla macros/sodium use the matching 150-kcal flour listing, pending package confirmation. Kerrygold salted-stick label is a proxy for the user's butter. Oil uses a standard avocado-oil label proxy. These choices and source URLs are included in the food's visible attribution and in each ingredient definition.

Micronutrients are **unknown if any ingredient lacks that nutrient**. They are not partial sums masquerading as full meal totals. Raw vegetable vitamin values are not used to assert precise cooked-vitamin retention. Full labels and measured portions would improve coverage and accuracy.

**Log by burrito or serving, not grams.** Final cooked weights are not measured: 320g per burrito and 550g per chicken/rice serving are explicitly estimated conversion bases needed by the existing per-100g contract. These do not affect named-serving totals. Weigh the finished batch before relying on gram-based logging.

## Future edits

Add meals or revise ingredients in the server catalog, run tests and deploy the Worker. Nutritional changes must receive a new ID and visible revision suffix (v2, etc.). Never silently change existing versioned IDs: the app intentionally preserves previously saved foods, edits, and diary snapshots. Select the new version through online search for future logging; older entries remain unchanged. Updating existing saved foods automatically would require a separate app feature.

The catalog is not submitted to public food databases. Do not publish this repository publicly without reviewing its personal recipe contents.

## Deployment and verification

Deployed on 2026-09-08 to `https://daywell.daywell.workers.dev`, Worker version `4b14b329-dee5-4138-9273-c0e4b5860105`. All 33 unit tests and 10 desktop/mobile-sized browser tests passed. A one-line CSS fix (`.card { min-width: 0 }`) also ships to prevent long food names from widening the mobile dashboard. The catalog is compatible with the previous app; the normal update prompt delivers the layout fix. This was a direct Wrangler deployment; these changes have not been committed or pushed to GitHub.
