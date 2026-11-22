# Onkar Tambake — portfolio and research journal

The site is built with Astro and TypeScript and generates static files for Cloudflare Pages. The Astro migration preserves the original editorial design, independent `.html` section routes, BUILD / BREAK / UNDERSTAND home experience, interactive system map, and direct sun/moon theme control.

## Requirements and local development

- Node.js `>=22.23.4`
- npm

```powershell
npm ci
npm run dev
```

Astro prints the local URL after startup. For production verification:

```powershell
npm run check
npm test
npm run build
npm run preview
```

The static output is written to `dist`. Cloudflare Pages should run `npm run build` and publish `dist`.

## Routes

| Route | Purpose |
|---|---|
| `/` | Home and interactive system map |
| `/about.html` | About |
| `/work.html` | Project archive |
| `/research.html` | Research interests and investigations |
| `/writing.html` | Article archive |
| `/now.html` | Current-information register |
| `/contact.html` | Contact |
| `/projects/{slug}` | Project detail |
| `/investigations/{slug}` | Investigation detail |
| `/experiments/{slug}` | Experiment detail |
| `/writing/{slug}` | Article detail |

The generic `/project.html`, `/investigation.html`, and `/article.html` routes remain as noindex legacy/unpublished states. Published content receives clean detail URLs.

## Content

Structured local Markdown lives in `src/content/`; the private publishing studio stores content in Supabase when configured. Collection schemas and validation are in `src/content.config.ts`, and `src/content/remote-loader.ts` reads only published rows at build time. Without Supabase configuration, the site falls back to local Markdown. `CMS_REQUIRED=true` makes a production build fail rather than silently ship local content when the CMS is unavailable.

See [CONTENT.md](./CONTENT.md) for the frontmatter models, authoring workflow, and security limits. Do not add invented projects, findings, employment claims, credentials, contact details, or profile links.

## Architecture and publishing

- [ARCHITECTURE.md](./ARCHITECTURE.md) documents the Astro/Cloudflare build, content flow, and security boundary.
- [`/admin`](./src/pages/admin.astro) is the private publishing studio; [`/admin/login`](./src/pages/admin/login.astro) is the administrator sign-in.
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) covers the schema, Auth, administrator allowlist, local configuration, and RLS tests.
- [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) covers Pages Functions, runtime secrets, rate limits, and the protected deploy hook.
- [wrangler.toml](./wrangler.toml) configures the Pages output and publication rate limits. No production credentials are committed.
- [MIGRATION_REPORT.md](./MIGRATION_REPORT.md) records the migration and verification.
- [DESIGN.md](./DESIGN.md) documents the preserved visual system.
- The admin experience requires a real Supabase project and administrator provisioned in the allowlist. It does not include public registration or fake credentials.

Set `PUBLIC_SITE_URL` to the canonical production origin during a production build to emit canonical/Open Graph URLs and a sitemap. It must be an origin with no path, query, or fragment. For example, in PowerShell:

```powershell
$env:PUBLIC_SITE_URL = "https://your-domain.example"
npm run build
```

No live domain was supplied; the example domain must be replaced before deployment. If the variable is omitted, the build intentionally omits canonical host URLs and the sitemap.

Copy `.env.example` for public build variables. Keep the Supabase service-role key and Cloudflare deploy-hook URL in protected Pages Function runtime secrets only; never put them in `PUBLIC_` variables or browser code. See [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) for the editorial workflow.

## Content still needed

No verified employment history or responsibilities, public projects, investigations, articles, current project details, email address, or professional profile URLs were supplied. These remain absent or explicitly unpublished. The site requests display and body fonts from Google Fonts and uses local fallback stacks if that service is unavailable.
