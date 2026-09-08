# Daywell

A personal nutrition and daily-rhythm PWA for iPhone, developed from Windows. React + TypeScript + Vite, IndexedDB via Dexie, a Cloudflare Worker for food lookup, and a precached application shell. There are no payments, ads, diary quotas, or analytics.

## Run locally

Requires Node 22 or newer (tested with the installed Node runtime).

```powershell
npm ci
npm run dev
```

Open the URL printed by Vite. The app starts with onboarding and an empty diary. No sample health records are inserted into your database. Custom foods, recipes, check-ins, goals, and all other local features work without cloud credentials.

To test the installable offline production version:

```powershell
npm run build
npm run preview
```

The dev server does not install a service worker. Production preview does. Use a stable production address for real data: different ports, hostnames, Safari tabs, and installed apps may have separate storage. Do not enter your real diary into temporary preview addresses.

## What is implemented

- Fasted AM weight and PM weight/steps check-ins, measurement exclusions, conditions, diary-complete confirmation, bedtime reflections, and check-in calendar.
- Custom food labels with all registry nutrients; known-zero versus unknown handling; serving/volume conversion with explicit density; editable provider foods and favorites.
- USDA search/detail and Open Food Facts search/barcode normalization; camera scanner and manual barcode fallback; saved foods usable offline.
- Immutable diary nutrition snapshots, meal groups, quantity edits, meal moves, duplicate, bulk-delete, copy-day/selection, recipes, cooked yield, and saved meal templates.
- Reference nutrient targets, custom ranges/macros, effective-dated goals, drinking water, manual exercise, sleep/wellness and body measurements.
- AM/PM normalization, robust 7/14/28-day weight trends, dynamic experimental energy model, readiness/uncertainty, and daily activity evidence tables.
- Nutrient averages and food contributions; calorie/macro/wellness/body trends; descriptive step/energy-rating association and dismissible insights.
- AES-256-GCM password-encrypted backups with PBKDF2, source records plus model snapshot/version, validated atomic restore and recovery snapshot; CSV exports with provider attribution.
- Optional local screen lock, backup reminders, privacy headers, install icons, offline persistence, and safe application-update prompt.

## Deploy to your free Cloudflare address

No Cloudflare account was authenticated in the implementation environment, and no GitHub remote was configured. No public deployment or remote repository has been created. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for the remaining account setup and Windows push workflow.

## Verification

```powershell
npm test
npm run build
npm run test:e2e
npx wrangler deploy --dry-run
```

Browser tests use installed Microsoft Edge on Windows in isolated test profiles, including an iPhone-sized Chromium viewport. They do not touch your everyday browser data. For another system, set the browser channel in `playwright.config.ts`. Tests cover offline reloads and edits, no external diary traffic, both check-ins, custom foods, recipes, and WCAG A/AA automated scans. Test screenshots and traces are under ignored `test-results/`.

Actual iPhone Safari, camera hardware, VoiceOver, and a real deployed service-worker update still need device acceptance. Chromium mobile emulation is not an iOS engine test.

## Data and scientific boundaries

Live IndexedDB is not application-encrypted. The optional password screen is a convenience lock; backups are encrypted. Browser/site-data deletion or device loss can remove local data, so keep encrypted backups outside the device. Backups do not contain the food-proxy token or screen-lock credential.

The food proxy receives search text/barcodes, never diary or profile records. It validates an authorization token, keeps the USDA key in Worker secrets, limits provider calls, and uses edge caching. Requests for static assets bypass Worker execution. Rate limits are abuse/provider protection, not paid feature gates. Free providers can change policies; the app has no paid fallback.

The adaptive energy estimator is deterministic and tested against synthetic scenarios, but **not clinically validated**. It estimates total expenditure conditional on logged intake and cannot distinguish underreported intake from lower expenditure. Resting expenditure remains formula-anchored. See [MODEL.md](MODEL.md) for the exact algorithm, assumptions, thresholds, and interpretation.

Nutrient defaults cover adult reference categories and common age/life-stage adjustments; manual targets take precedence. Food composition datasets do not comprehensively report every nutrient. Form-specific upper limits are not applied to total intake. Pregnancy/lactation energy planning is not calculated automatically. Allergen notes are personal references, not a food safety filter.

## Code map

- `src/domain.ts`, `nutrients.ts`: validated data contracts, unit conversion, aggregation, nutrient registry and defaults.
- `src/storage.ts`: IndexedDB transactions, encrypted backup/restore, CSV, local lock.
- `src/model.ts`: deterministic weight and expenditure models.
- `src/App.tsx`, `forms.tsx`, `food-ui.tsx`, `views.tsx`, `insights.tsx`: application screens and workflows.
- `worker/`: authenticated food proxy and provider normalization.
- `tests/`: domain, backup, provider, browser, and accessibility checks.

The journal/backup format is v1. IndexedDB schema v2 adds a non-authoritative food lookup cache, with a tested migration from the initial v1 database. Future schema changes must increment Dexie’s version and include old-version fixtures. Do not change the production hostname without exporting data first. Deploy rollback restores code only; database migrations must remain backward compatible or be accompanied by a backup/restore procedure.

Data attribution: USDA FoodData Central (CC0); Open Food Facts (ODbL). OFF-derived records retain attribution in app, CSV, and backup. If redistributing a derived food database, follow the ODbL redistribution/share-alike requirements. No product images are downloaded.
