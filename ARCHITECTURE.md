# Architecture

## Current site

Astro pages, shared components, and layouts live in `src/`. TypeScript content schemas in `src/content.config.ts` validate Markdown from `src/content/`; profile interests and current-state copy live in `src/content/profile.ts`. Shared Studio styles are in `src/styles/global.css`; the isolated Funky presentation layer is in `src/styles/funky-mode.css`. Early appearance/presentation bootstrap and browser interactions live in `public/scripts/`.

The public shell keeps three independent root states: `data-presentation` selects Studio or Funky, `data-theme` selects light or dark appearance, and `data-mode` selects the Build / Break / Understand practice lens. Presentation persists under `bbu-experience-mode`; appearance persists under `onkar-appearance`. `src/scripts/experience-mode.ts` updates the presentation without changing either of the other preferences.

The homepage declares the sculpture canvas and an accessible static SVG fallback in Astro. `src/scripts/funky-experience.ts` loads only when Funky is selected on that route, then imports `src/scripts/funky-scene.ts` (and Three.js) when the stage approaches the viewport. No WebGL code runs during Astro rendering, and other routes do not request the Three.js chunk.

The site builds with `output: "static"` and `build.format: "file"` into `dist/`. Section routes preserve the original `.html` paths. Public collection entries generate static detail files and use clean canonical paths such as `/projects/example`; Cloudflare Pages and Astro preview resolve those clean routes. Generic legacy detail templates remain noindex unpublished states.

## Build and hosting

- Build command: `npm run build` (runs `astro check`, then `astro build`).
- Output directory: `dist`.
- Cloudflare Pages build/runtime: static asset hosting; no server runtime is required for public pages.
- Set `PUBLIC_SITE_URL` to the production origin in the build environment to generate canonical/Open Graph URLs and the sitemap. The config validates it as a bare HTTP(S) origin. No real production domain is currently supplied.
- The site requests Google Fonts at runtime and includes local fallback stacks. A font-service outage does not prevent rendering.

Cloudflare Pages is a good fit for this static phase and has a free tier, subject to provider limits and terms that should be checked when deploying. No production account, custom domain, deployment pipeline, or live-host verification has been configured.

## Content flow

1. An administrator creates and edits a draft in `/admin`; Supabase Auth authenticates the account and `admin_users` is the server-side allowlist.
2. PostgreSQL RLS allows administrators to manage drafts. Column grants prevent browser clients from changing `status` or `published_at`; unauthenticated visitors can read only published rows.
3. The protected Pages Function at `/api/publish` verifies the access token and allowlist, applies the publication transition with the service-role key, promotes linked images, and triggers the Pages deploy hook.
4. Astro's build-time content loader queries published rows only and validates them against the collection schemas. Supabase query/configuration failures fail a configured build; `CMS_REQUIRED=true` prevents a production build from silently using local Markdown.
5. The static build emits only published content and published media references to `dist/`. Drafts and private previews are never copied into public HTML.

The structured content types are projects, research investigations, articles/research notes, experiments, Now updates, professional experience, and certifications. CMS records store common editorial/SEO fields separately from type-specific JSON metadata; Astro collection schemas validate and adapt them for the public templates. Professional experience and certifications remain empty until verified data is provided. See [CONTENT.md](./CONTENT.md) and [ADMIN_GUIDE.md](./ADMIN_GUIDE.md).

The `public` flag and `status` are publishing controls, not security controls. Any source file in a public repository or static output must be treated as public. Do not commit sensitive drafts, embargoed research, employer material, secrets, or private credentials.

## Administrator and publishing security

- `/admin` and `/admin/login` are static shells and are not security boundaries. Data access is enforced by Supabase Auth, the `admin_users` allowlist, RLS, explicit grants, and private storage policies.
- Browser code receives only the public anon key. It can write draft fields but cannot update publication status or publication timestamps through the granted PostgREST columns.
- The Pages Function accepts same-origin JSON POST only, verifies the user through Supabase Auth, checks the allowlist server-side, applies per-IP and per-user Cloudflare rate limits, and holds the service-role key and deploy-hook URL only at runtime.
- Publishing validates required content and linked media references, copies those images from private draft storage to public published storage, updates the record, and requests a static rebuild. A successful hook response means the build was accepted, not that it completed; Cloudflare deployment logs remain the source of truth for build success.
- The preview dialog is client-side and administrator-only in the dashboard. It does not create public draft URLs. The authenticated administrator's browser session is trusted for the private preview.
- Public content is sanitized during static rendering. Do not store sensitive or employer-owned information in the CMS; published database rows and promoted media are public.
- Cloudflare rate-limit counters are approximate and local to Cloudflare locations. Configure unique namespace IDs in `wrangler.toml`.
- Account provisioning, password recovery email delivery, rate-limit bindings, runtime secrets, backups, and deploy hooks require real provider configuration and cannot be verified without those accounts.

No Supabase/Cloudflare project or credentials are provisioned in the repository. Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) and [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) before relying on live authentication or publishing.

## Migration boundaries

This migration changes the implementation framework and build process while retaining the approved Studio identity and existing section routes. Funky is an explicitly selected alternative presentation; it does not add new biographical claims, sample work, or research findings. The original implementation is preserved in the Git baseline commit rather than duplicated as a second active root-level site.
