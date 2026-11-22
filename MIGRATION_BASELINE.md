# Migration baseline

This is a historical inventory of the original static-site implementation before the Astro migration. The old files are preserved in Git commit `23cd712`; the current source of truth is `src/`. See [ARCHITECTURE.md](./ARCHITECTURE.md) and [MIGRATION_REPORT.md](./MIGRATION_REPORT.md) for the migrated implementation and current verification.

## Snapshot

- Original static-site baseline commit: `23cd712` (`chore: preserve original static website baseline`).
- No remote was configured and no push was performed.
- The project was a plain static site: HTML, CSS, and vanilla JavaScript; no package manifest, framework, build pipeline, test runner, Git history, or bundled media assets existed.
- The baseline working tree was clean before this document and `.gitignore` were added.

## Routes

| Route | Purpose | Existing entry point |
|---|---|---|
| `/` and `/index.html` | Home, practice lenses, interactive system map, current-work and writing previews | `index.html` |
| `/about.html` | Profile, experience gaps, interests, philosophy | `about.html` |
| `/work.html` | Project archive and case-study outline | `work.html` |
| `/research.html` | Research interests and investigation archive | `research.html` |
| `/writing.html` | Article archive and publication features | `writing.html` |
| `/now.html` | Current-information register | `now.html` |
| `/contact.html` | Contact page; verified address/profile not supplied | `contact.html` |
| `/project.html?slug=...` | Reusable project-detail template and unpublished state | `project.html` |
| `/investigation.html?slug=...` | Reusable investigation-detail template and unpublished state | `investigation.html` |
| `/article.html?slug=...` | Reusable article-detail template and unpublished state | `article.html` |

Preserve these `.html` routes during migration. New published content can additionally receive clean, static per-entry URLs.

## Existing implementation inventory

- **Global styling:** `styles.css` (approximately 49 KB); warm paper/ink palette, separate night tokens, responsive editorial layouts, map SVG styling, navigation dialog, article reading layout, and reduced-motion rules.
- **Shared shell:** `site-shell.js` injects the site header, full-screen native navigation dialog, active route state, footer, and expandable marginal note.
- **Appearance:** `appearance-init.js` runs before first paint, resolves system/light/night preference, and sets the theme color. `script.js` provides the persistent sun/moon toggle, operating-system preference updates, and optional view-transition reveal.
- **Home interactions:** `script.js` updates BUILD / BREAK / UNDERSTAND lens state and copy; toggles direct/alternate system paths; and supports pointer/keyboard selection of SVG map nodes.
- **Content rendering:** `content.js` contains empty project, investigation, and article lists plus supplied interests/current-state entries. `script.js` renders archives, filters articles, builds project/investigation/article detail views, article contents/reading time/code accents, and unpublished states.
- **Navigation/content markup:** ten root-level HTML files listed above. Main routes use a shared placeholder element for header/footer injection; detail templates are query-string-driven.
- **Assets:** no local image, font, favicon, or media files were present. The map and wordmark are inline SVG. Google Fonts loads DM Sans, IBM Plex Mono, and Instrument Serif, with local CSS fallbacks.
- **Dependencies/build:** none. No TypeScript, Astro, package scripts, automated tests, deployment configuration, or environment-variable files existed.
- **Documentation:** `README.md`, `PRODUCT.md`, `CONTENT.md`, `DESIGN.md`, `PRODUCTION_AUDIT.md`, and `research-and-environment-audit.md`.

## Behavior to preserve

- Theme starts from the operating-system preference; a saved light/night choice persists. When the saved choice is `system`, later OS theme changes are followed.
- Header menu opens as a native modal dialog, includes all seven real section routes, supports Escape/backdrop/close-button dismissal, and returns focus to its opener.
- The home practice-lens control updates accent-driven styling, pressed state, indicator/copy, and menu context.
- The diagram can switch path emphasis and inspect each map node by pointer or keyboard.
- Article filters announce changes; article detail supports headings/table of contents, reading time, code blocks, images, references, and related links.
- Missing/unknown content uses an explicit unpublished state. Do not invent biography, projects, research findings, work history, certifications, contact details, or other claims.
- Responsive layouts were smoke-tested at 320, 390, 768, 1024, and 1440 CSS pixels without horizontal overflow. Reduced-motion preferences reduce transitions/animations.

## Existing SEO, accessibility, and quality findings

- All ten source pages have a title, description, Open Graph title/description, and a Twitter card declaration. No canonical domain, Open Graph image, Twitter-specific title/description, favicon, sitemap, or robots policy exists. Detail route metadata is generic; the current client renderer only changes `document.title`.
- Positive accessibility patterns include language declaration, semantic landmarks, skip link, visible focus, icon-button labels, active navigation state, keyboard-operable SVG controls, a native modal dialog, and reduced-motion CSS.
- The production audit found light-theme contrast failures in hover/contact color combinations and very small functional labels/body text. Recheck all themes, modes, and interaction states; migration should preserve presentation first and record unrelated audit fixes separately.
- No local assets currently need optimization. Google Fonts is an external request. Actual host-level HTTPS, caching, headers, CSP, and deployment behavior cannot be assessed without a production target.
- The full launch audit is in `PRODUCTION_AUDIT.md`; it also documents content readiness, future content models, security boundaries, priorities, and limitations.

## Previewing the original site

From the project root in PowerShell:

```powershell
python -m http.server 4173
```

Open `http://localhost:4173/`. Press `Ctrl+C` in the server terminal to stop it. Before Astro migration, the original routes are files in the project root; the recorded initial commit preserves that exact state.

## Astro migration mapping

| Existing responsibility | Astro destination |
|---|---|
| Shared head, fonts, pre-paint theme initialization, page shell | `src/layouts/BaseLayout.astro` |
| Header and native route dialog; footer and note | `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro` |
| Global tokens, theme variants, responsive styling | `src/styles/global.css` |
| Theme initialization and interaction handlers | `public/scripts/appearance-init.js`, `public/scripts/site-interactions.js` |
| Home/section/detail templates | `src/pages/*.astro`; `build.format: "file"` preserves `.html` section URLs without `.html.astro` source filenames |
| Content data and validation | Markdown in `src/content/`, Astro collection schemas in `src/content.config.ts`, profile data in `src/content/profile.ts` |
| Published detail records | Static collection routes with per-record metadata and clean canonical paths; generic `.html` templates remain noindex |

The root-level HTML/CSS/JavaScript inventory above describes the historical baseline only; it is not an active second content source. The migration baseline is a preservation record, not a deployment source.
