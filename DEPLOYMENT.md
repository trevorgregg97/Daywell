# Free hosting and Windows updates

The app is prepared for your own Cloudflare Workers Free account and a private GitHub repository. This configuration uses no database or paid storage service in the cloud.

## 1. Connect Cloudflare

From the project directory:

```powershell
npx wrangler login
npx wrangler whoami
```

Complete Cloudflare’s browser sign-in. Do not paste passwords, Cloudflare tokens, or USDA API keys into chat.

## 2. Configure food lookup

Request a free USDA FoodData Central API key at https://fdc.nal.usda.gov/api-key-signup/.

Use a password manager to generate a random token of at least 32 characters for `PERSONAL_API_TOKEN`. Save it; the same token will be entered in the app’s Settings. These commands accept values interactively so they are not embedded in shell history:

```powershell
npx wrangler secret put USDA_API_KEY
npx wrangler secret put PERSONAL_API_TOKEN
```

If Wrangler asks to create the `daywell` Worker to store its first secret, accept. Set `OFF_CONTACT` in `wrangler.jsonc` to a contact email or your app’s public information URL for Open Food Facts identification. Follow OFF’s API usage registration guidance. Only this public contact value belongs in source; secrets never do.

You can deploy without the secrets; custom/saved foods work, while online lookup displays a configuration message. Static hosting remains available when an upstream provider is down or rate-limited.

## 3. Publish

```powershell
npm test
npm run build
npx wrangler deploy
```

Wrangler prints `https://daywell.<your-account-subdomain>.workers.dev`. Use this permanent URL for your diary. Remain on the Workers Free plan; there is no need to buy a domain or activate paid services.

On iPhone: open that URL in Safari → Share → Add to Home Screen → Open as Web App. Complete onboarding in the installed app. In Settings, save your personal food lookup token. Make an encrypted backup after the first few entries, save it in Files, then verify restoration on a separate browser before relying on the app for important records.

## 4. Create a private GitHub repository

Sign in to GitHub and create an empty **private** repository named `daywell` without adding a README or license. The local repository already contains the implementation. Configure Git’s author locally with your real identity, then commit and connect:

```powershell
git config user.name "Your Name"
git config user.email "Your GitHub email or noreply address"
git branch -M main
git add .
git commit -m "Build Daywell personal nutrition PWA"
git remote add origin https://github.com/YOUR_ACCOUNT/daywell.git
git push -u origin main
```

Use Git Credential Manager’s browser flow when prompted. The ignore file excludes local secrets, dependencies, build output, test artifacts, and backups. Never put actual diary exports in the source tree outside the ignored `backups/` directory.

## 5. Automatic deployment on push

In Cloudflare, open the existing `daywell` Worker → Settings → Builds → connect the private GitHub repository and choose `main` as the production branch.

- Build command: `npm ci && npm test && npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root.
- Retain `USDA_API_KEY` and `PERSONAL_API_TOKEN` as Worker runtime secrets.

The included GitHub Actions workflow separately checks tests and build on pushes and pull requests. Cloudflare’s build command also runs the tests so it will not publish a failing build while waiting for GitHub checks.

For later Windows changes:

```powershell
npm test
npm run build
git add .
git commit -m "Describe the update"
git push
```

The phone will show an update prompt after fetching the new version. Finish any open form before applying it. Data is stored separately from cached code. Keep the Worker name/hostname stable.

## Local provider development

Copy `.env.example` to `.dev.vars` using your editor, then fill the values there. This file is ignored. Run `npx wrangler dev --port 8787` alongside `npm run dev`; Vite forwards `/api/*` to the local Worker. Never use the production token in browser tests or commit it in fixtures.

## Release acceptance on an actual iPhone

Verify Home Screen icons, first install and reopen, both check-ins, camera permission/denial, a real barcode, keyboard/zoom/VoiceOver, offline save and reload, encrypted backup download/restore, and an update while a form is open. Confirm new code retains the same diary and that browser/site-data deletion is understood before using any destructive device settings.

## Recovery

If an update fails, retain the cached version and retry online. Cloudflare can roll back a Worker deployment, but an older UI must remain compatible with the on-device database. Export before database upgrades. Restore validates the whole file before changing records and preserves a local pre-restore recovery snapshot. Browser storage deletion removes that snapshot too; an external encrypted backup is the recovery path after device loss.
