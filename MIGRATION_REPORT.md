# Astro migration report

## Executive summary

The portfolio has been migrated from duplicated root-level HTML/CSS/JavaScript to Astro and TypeScript with static output for Cloudflare Pages. The approved visual direction and seven `.html` section URLs remain intact; the site still has the BUILD / BREAK / UNDERSTAND home lenses, interactive system map, full-screen route navigation, and direct icon-only sun/moon theme toggle.

The migration adds the Astro implementation and a Supabase/Cloudflare publishing workflow; it does not add fabricated content or committed deployment credentials. The original implementation remains recoverable from Git baseline commit `23cd712`. Live CMS and deployment configuration remain external to the repository.

## Routes and page templates

- Home: `/`
- About: `/about.html`
- Work: `/work.html`
- Research: `/research.html`
- Writing: `/writing.html`
- Now: `/now.html`
- Contact: `/contact.html`
- Public project, investigation, experiment, and article entries generate clean detail routes under `/projects/`, `/investigations/`, `/experiments/`, and `/writing/`.
- Generic `/project.html`, `/investigation.html`, and `/article.html` routes remain noindex unpublished/legacy states.

Astro source pages live under `src/pages/`; `build.format: "file"` preserves the old section paths. Published detail pages receive record-specific titles, descriptions, canonical paths, and Open Graph metadata when `PUBLIC_SITE_URL` is configured.

## Shared components and content architecture

- `BaseLayout.astro` provides shared metadata, the pre-paint theme initializer, site header/footer, and styles.
- `SiteHeader.astro` and `SiteFooter.astro` preserve the navigation, theme, and footer interactions.
- `PageIntro.astro`, `ArchiveList.astro`, and `EmptyState.astro` provide reusable editorial/archive patterns.
- Markdown content collections are defined in `src/content.config.ts` for projects, investigations, experiments, articles, and Now updates. Article categories can distinguish research notes.
- `src/content/profile.ts` holds supplied interests/current-state values and typed professional experience/certification record shapes; no unsupported records are included.
- Article templates support table of contents, reading time, categories/tags, Markdown, syntax-highlighted code, images, references, and related articles.
- Drafts default to non-public. Build-time visibility flags are not security controls; private material must not be committed to the public source repository.

## Preserved and verified functionality

- Persistent system/light/night appearance and direct sun/moon icon toggle.
- BUILD / BREAK / UNDERSTAND practice lens and interactive, keyboard-operable system map.
- Route dialog, Escape dismissal, and focus return to its opener.
- Article category/tag filters and accessible filter status.
- Reduced-motion support and responsive editorial layouts.
- Explicit empty/unpublished states rather than fabricated sample work.

## Verification performed

- `npm run build`: passed; `astro check` reported 0 errors, warnings, or hints. The build emits expected empty-collection notices because no verified content records were supplied.
- Production preview: all seven primary routes and three legacy detail templates returned HTTP 200 across 320, 390, 768, 1024, and 1440 pixel widths (50 route/viewport checks), with one main heading and no horizontal overflow.
- Browser route checks reported no page errors or failed network requests.
- Tested persistent theme toggle, BUILD/BREAK/UNDERSTAND mode switching, navigation dialog Escape dismissal, and focus restoration.
- Contrast sweep: no body/control text failures across seven primary routes in light and dark themes; checked the homepage About link and practice-lens hover states.
- Temporary QA-only records were used to exercise every content detail template, Markdown table of contents/code rendering, article filtering, draft exclusion, record canonical URLs, and sitemap URL rewriting. All fixtures and test-domain references were removed before the final build.
- Final `dist` contains the expected core outputs, no fixture/draft files, no reserved test-domain references, and no sitemap because no production site origin was provided.
- Impeccable detector on the modified global stylesheet returned no findings.

## Outstanding before launch

1. Provide verified biography, engineering responsibilities, experience, credentials, projects, research, writing, contact details, and profile links. Empty content is intentional until then.
2. Set `PUBLIC_SITE_URL` to the real HTTPS origin in the production build environment and verify canonical, social, sitemap, and robots behavior on the deployed host.
3. Configure and smoke-test the Cloudflare Pages project, custom domain, HTTPS, caching/security headers, and deployment workflow. No live Cloudflare deployment was available for this migration.
4. Review the finished site on the target browsers and run a production performance/accessibility audit against the real deployed assets and content.
5. Treat the Supabase Auth/PostgreSQL/Storage administrator publishing workflow as a separate approved phase. It is not implemented here; see [ARCHITECTURE.md](./ARCHITECTURE.md) for security boundaries.
