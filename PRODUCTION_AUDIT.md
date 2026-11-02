# Build. Break. Understand. — Production-readiness audit

**Audit date:** 2026-11-02  
**Scope:** Read-only review of the static portfolio in this workspace. No application files were changed.

## Executive assessment

The site is a coherent, lightweight portfolio foundation, not a finished public portfolio. Its strongest work is the distinctive editorial identity, genuinely separate routes, the interactive system map, the persistent system/light/night appearance control, responsive layouts, and honest unpublished states. The empty archives and missing biography/contact details are not disguised as achievements.

It is **not ready to launch as a complete professional portfolio**: the content model contains no projects, investigations, or articles; the About and Now pages lack verified personal details; and Contact offers no actual way to reach Onkar. There are also light-theme text-contrast failures and incomplete sharing metadata for detail entries. These are fixable without discarding the approved design.

No critical vulnerability was confirmed in the inspected static application. This is a source and browser audit, **not** a penetration test or a review of a production host: there is no server-side application, deployment configuration, or production URL to assess.

### Heuristic quality snapshot

Scores use a 0–4 scale; they are audit judgments, not certification results.

| Area | Score | Evidence |
|---|---:|---|
| Accessibility | 2/4 | Semantic landmarks, skip link, visible focus, keyboard-operable map and dialog; contrast failures and very small labels still need attention. |
| Performance | 3/4 | Approximately 85 KB of uncompressed local CSS/JavaScript, no image payloads or framework; three font families depend on Google Fonts, and no production performance measurement is possible yet. |
| Theming | 3/4 | System preference, direct icon toggle, persistence, and distinct night palette work; light-theme accent/hover combinations need contrast correction. |
| Responsiveness | 4/4 | All ten routes rendered without horizontal overflow at 320, 390, 768, 1024, and 1440 px. |
| Implementation integrity | 3/4 | Shared shell, reusable templates, safe text rendering, and explicit empty states; no schema validation, automated test suite, or static detail-page generation. |

## Page-by-page audit

| Page | Status | Findings and readiness |
|---|---|---|
| **Home** ([`index.html`](./index.html)) | Strong foundation; content partly ready | The BUILD / BREAK / UNDERSTAND composition and original system diagram read as a deliberate identity, not a generic template. Lens selection, path comparison, and map-node selection work. The diagram is correctly identified as illustrative. The “now” and writing previews remain empty because no verified entries were provided. |
| **About** ([`about.html`](./about.html)) | Needs owner input | The page avoids invented credentials and separates interests from experience. Engineering background, professional journey, responsibilities, and experience are all explicitly “Not shared yet”; repeated gap statements make this feel like a profile scaffold rather than a finished biography. Replace them only with verified, cleared details. |
| **Work** ([`work.html`](./work.html)) | Unpublished by design | The project archive has a useful case-study outline, but there are no project records, screenshots, diagrams, demos, or source links. Keep it unpublished/clearly empty until real work can be shared; remove or reduce setup copy once actual case studies exist. |
| **Research** ([`research.html`](./research.html)) | Interests ready; research unpublished | The page clearly distinguishes research interests from active investigations and findings. There are no investigation records, methods, evidence, diagrams, references, or conclusions to publish. The current interest list is not evidence of completed research. |
| **Writing** ([`writing.html`](./writing.html)) | Publication system unpopulated | The journal index and content model describe useful reading features, but there are no articles, excerpts, categories, or images. Article filtering, table of contents, reading time, and code rendering could not be exercised with real content. |
| **Now** ([`now.html`](./now.html)) | Needs current owner input | It correctly labels unknown learning, goals, projects, and research activity rather than fabricating a live status report. It is not yet a living page; add a dated update only when its contents are current and verified. |
| **Contact** ([`contact.html`](./contact.html)) | Launch blocker | The design is clear, but there is no email address, verified profile link, or other actionable contact destination. The page explicitly says none was supplied. Provide at least one monitored public route or decide not to publish a Contact page. |
| **Project detail** ([`project.html`](./project.html)) | Template works; no entries | The unknown/unpublished slug produces a contextual, accessible empty state. A real record can render architecture, stack, screenshots, source/demo links, and lessons. Per-entry social metadata and a crawlable static URL are not implemented. |
| **Investigation detail** ([`investigation.html`](./investigation.html)) | Template works; no entries | The template supports methodology, technical details, diagrams, code, findings, limitations, and references. No investigation data exists, so those sections have not been validated with representative content. |
| **Article detail** ([`article.html`](./article.html)) | Template works; no entries | The template supports a reading-focused article, linked contents, references, code, images, and related articles. No article data exists. The page currently starts with generic HTML metadata, and the renderer updates the document title only—not the description or social metadata. |

The seven primary navigation destinations and all three detail templates returned HTTP 200 on the local static server. The root route `/` also returned 200. An unknown project slug was tested and returned the intended “not published” state.

## Functionality and technical audit

### Verified behavior

- The shared navigation shows all seven real routes and identifies the active section. Clicking a route reaches its independent page.
- The native navigation dialog opens from the header and closes with Escape; after closing, `aria-expanded` is false and focus returns to the opener.
- The sun/moon control follows the system preference, switches appearance directly, and retains an explicit choice after reload. Changing the emulated system preference updates the theme when the visitor has not chosen one.
- BUILD / BREAK / UNDERSTAND lens selection, path comparison, and keyboard activation of a diagram point were exercised.
- Reduced-motion emulation reduced authored transition/animation durations to effectively zero.
- Browser smoke checks across ten routes and five viewport widths found no horizontal overflow, broken local navigation, browser console errors, or failed route-dependency requests. Static HTML checks found no duplicate IDs, broken local file links, or missing `alt` attributes on existing images (there are no static image elements). A separate HTTP check did find the missing favicon's 404.
- The Google Fonts CSS endpoint responded successfully, and the selected font families appeared loaded in the browser.

### Build, code quality, assets, and performance

- This is plain HTML/CSS/JavaScript, with no `package.json`, dependency manifest, build/lint/type-check/test configuration, or Git repository in the workspace. A production build is not currently defined. `npm run` and `npm test` are unavailable because `package.json` does not exist; they are not failing configured project tests.
- `node --check` passed for [`script.js`](./script.js), [`site-shell.js`](./site-shell.js), [`content.js`](./content.js), and [`appearance-init.js`](./appearance-init.js). This checks JavaScript syntax, not behavior or types.
- Current local CSS/JavaScript totals approximately **84.7 KB uncompressed** ([`styles.css`](./styles.css) 48.9 KB; four JavaScript files about 35.8 KB). There are no image or local font assets. No Lighthouse, field performance, or production bundle measurement could be run without a deployment target.
- Each page requests DM Sans, IBM Plex Mono, and Instrument Serif from Google Fonts. This keeps local payloads small and fallbacks exist, but adds a third-party request, external availability/privacy considerations, and unmeasured font-loading cost. Decide whether to retain or self-host the required font files after deployment requirements are known.
- An actual request for `/favicon.ico` returned **404**. No favicon/social preview assets are present. No image optimization is currently applicable; add responsive, compressed images with explicit dimensions and useful alternative text when real assets are supplied.
- The site has no deployment target or host configuration, so HTTPS, redirects, caching/compression, security headers, CSP, and production console/network behavior remain unverified.

### Accessibility and visual quality

The shared landmarks, skip link, button labels, active-route state, pressed lens state, focus styling, reduced-motion handling, and keyboard-operable map/dialog are good foundations. The reviewed screenshots retain a distinctive, consistent editorial world while the section pages use different compositions rather than cloning the home hero.

The primary confirmed accessibility issue is contrast. Static contrast analysis flagged light-theme hover text against dark surfaces at approximately **2.5–2.9:1**, and a contact-page text pairing at approximately **3.9:1**. The first is substantially below the WCAG AA 4.5:1 target for normal text; the contact pairing is also below target. The warnings repeat across routes because they come from shared tokens/rules. Recheck each foreground/background pair, including hover and focus states, in both themes and all three practice modes.

Several functional labels render around **9–11 px**, and some body copy is about 11 px. These sizes are not automatically a WCAG failure, but they make controls, route labels, and reading metadata difficult to scan, especially on mobile. Increase small functional/reading text and retest hierarchy rather than enlarging every decorative label indiscriminately.

The contact hero's generous pause is consistent with the visual direction, but is currently followed by explanatory placeholder copy instead of an action. Work, research, writing, About, and Now also contain repeated scaffold/absence language. Populate with genuine material first; then tighten the copy and spacing where the content no longer earns the space. Do not solve empty archives with stock art or invented case studies.

The Impeccable detector reported 62 file-based and 49 live-route signals. Those counts include repeated route-level warnings and opinionated stylistic heuristics (for example, serif usage or a cream palette); they are **not** 111 independent defects or an accessibility conformance result. The contrast and small-text observations above are the corroborated, actionable findings.

### SEO and social sharing

All ten HTML pages have a title, meta description, Open Graph title/description, and a Twitter card declaration. Gaps:

- No page has an Open Graph image, Twitter-specific title/description, or canonical URL. A canonical domain was not provided, so it must be decided before adding canonicals.
- Project, investigation, and article HTML has generic title/description/share content. On a populated detail route, JavaScript changes `document.title` but leaves description and Open Graph/Twitter metadata generic.
- Detail records are rendered client-side into three query-string templates (`?slug=...`) instead of being generated as per-entry HTML paths. This weakens reliable previews and indexing for technical content; no entries exist yet to test crawler behavior.
- No favicon, `robots.txt`, or sitemap is present. Add canonical/share assets and crawler files after the public domain and publication policy are known.

## Content readiness inventory

| Content | What is genuinely ready | Needs owner input / remains unpublished |
|---|---|---|
| Identity and interests | Name, BUILD. BREAK. UNDERSTAND. framing, and supplied interests in security, AI, systems, and experimentation. | A concise verified biography and any factual professional background. |
| Professional experience | Nothing beyond the stated engineering identity. The site appropriately does not claim an employer, role, or career history. | Roles, dates, responsibilities, and only employer/project details explicitly cleared for public use. |
| Projects | Reusable project schema and page template. | Every actual project, verified description, role, architecture, stack, dates, media, code/demo links, and lessons. Keep unpublished until cleared. |
| Research | Interest topics and a framework that distinguishes interest, in-progress work, and findings. | Research notes, experiments, authorized scope, methods, evidence, limitations, references, and any verified/publishable findings. |
| Writing | Article rendering model and empty journal state. | Actual articles, publication/update dates, categories, tags, references, and supporting media. |
| Now | A transparent current-state layout. | Current learning, activity, projects, research, goals, and an update date. |
| Contact | A polished route with no guessed destination. | A monitored email address or verified public profile/contact route. |
| Media and credentials | No project media or credentials are present. | Original screenshots/diagrams and any certifications/credential URLs, only if verified. |

Nothing in this inventory should be promoted to a published claim solely to make the site look fuller. Where the required evidence or permission is unavailable, an unpublished state is the correct result.

## Content architecture assessment

[`content.js`](./content.js) separates presentation from data and has a `schemaVersion`, plus `projects`, `investigations`, `articles`, `interests`, and `now` collections. [`CONTENT.md`](./CONTENT.md) describes useful detail fields and article blocks. Current project/investigation/article arrays are empty. Records use `status` and a `public` flag; they have no runtime/build-time schema validation, common timestamps/SEO/media envelope, or types for the other requested content categories.

Before connecting a publisher, define and validate a shared content envelope: stable ID/slug/type; title, summary and description; lifecycle state; public visibility; created/updated/published dates; tags/categories; media with alt text/captions; references; and SEO metadata. Keep draft/preview access out of the public bundle.

| Type | Suggested type-specific fields |
|---|---|
| Project | Problem, constraints, role, architecture/diagrams, stack, implementation sections, screenshots, source/demo links, outcomes and lessons. |
| Research investigation | Question, category, authorized scope, status, methodology, environment, evidence, diagrams/code, findings, limitations, disclosure state, references and conclusion. |
| Technical article | Body blocks, category/tags, publication/update date, references, related slugs, canonical/share metadata; derive contents and reading time from validated content. |
| Research note | Short observation/question, date, status, sources, tags, and links to a related investigation or article. Keep notes distinct from validated findings. |
| Experiment | Hypothesis, scope/environment, method, observations/results, status, limitations, date, references, and related project/research links. |
| Professional experience | Public organization label, role, dates, cleared responsibilities, and evidence/links. Do not include confidential employer material. |
| Certification | Issuer, exact credential name, issue/expiry dates, verification URL/ID, and public visibility. |
| Currently exploring | Topic, short current status, last-updated date, and optional related entries; publish only when current. |

Use explicit allowed states and schema validation at content entry/build time; keep `public` as a publication decision, not an authorization mechanism. The article word-count helper currently counts paragraph, heading, quote, and code text but omits list items and image captions, so reading-time estimates will be inaccurate for list-heavy articles until corrected and tested with representative content.

## Security and publishing infrastructure

The current site is static and contains no admin login, write endpoint, database, upload handler, contact form, or secret. This is a sound choice for this phase; there is no fake authentication to bypass. Rendering generally uses `textContent`/DOM construction, and external content URLs are constrained to HTTPS or same-origin URLs.

**Important boundary:** all of [`content.js`](./content.js) ships to every visitor. The client-side `public`/`status` check only decides what to display; it cannot protect a draft, private investigation, confidential employer detail, unpublished source, or credential. Do not put non-public material in the public data file and assume the flag hides it.

For the first genuine publishing workflow, keep the current public site static and use a mature **managed headless CMS** with editor roles, MFA, draft/published states, schema validation, media management, preview, and audit history. A build-time adapter should fetch only published records using a server-side secret, generate detail pages, and run from a secured publish webhook. Use short-lived, authenticated preview access for drafts; never embed CMS write credentials or draft API access in browser JavaScript. Avoid building custom authentication or a decorative dashboard. If self-hosting a CMS is later required, budget for its server, database, backups, updates, access controls, and monitoring as a separate operational system.

Before launch, also choose the hosting provider/domain and verify HTTPS, restrictive content-security policy, referrer policy, MIME/nosniff behavior, caching, and deployment secrets there; none can be inferred from this source workspace.

## Prioritized issues

**Critical: none confirmed.** This does not certify the site or hosting as secure.

| # | Priority | Issue | Why it matters | Recommended resolution |
|---:|---|---|---|---|
| 1 | **High** | No verified portfolio substance: project, investigation, and article arrays are empty; About/Now lack personal details. | Visitors cannot evaluate real engineering work, experience, or research; the site reads as a polished scaffold. | Collect owner-approved facts and public artifacts. Publish only verified/cleared entries; leave other material unpublished. |
| 2 | **High** | Contact has no actionable destination. | A professional portfolio cannot convert interest into a conversation. | Add a monitored verified email/profile, or remove the promise of an open contact channel until one exists. |
| 3 | **High** | Light-theme contrast fails in hover/contact states. | Some text falls below WCAG AA contrast for normal-size content, reducing readability for low-vision visitors. | Correct the relevant color pairs across light/night themes and practice modes; retest normal, hover, focus, and disabled states. |
| 4 | **Medium** | Detail SEO metadata is generic and client-side only. | Published research/articles may share the same snippet and may not be consistently indexed or previewed. | Once the domain/content are known, generate per-entry HTML or otherwise ensure crawlable content; update title, description, canonical, Open Graph, and Twitter metadata per record. |
| 5 | **Medium** | Content architecture omits research notes, experiments, experience, and certifications; records lack validation. | Requested content types would otherwise become ad hoc fields or hardcoded page copy, making future publishing inconsistent. | Extend the shared schema/envelope and add build-time validation before connecting a CMS. |
| 6 | **Medium** | Several functional labels/body text are very small. | Scannability and reading comfort suffer, especially on narrow screens and for visitors with low vision. | Increase functional text to a comfortable size, preserve the editorial hierarchy, and visually retest all widths. |
| 7 | **Medium** | No automated quality gate; populated article behavior and production environment remain unverified. | Future content/code changes could silently break routes, article rendering, accessibility, or publishing. | Add lightweight route/link/schema checks, browser tests, an accessibility scan, and staging performance/security-header checks when a deployment target exists. |
| 8 | **Low** | Browser request to `/favicon.ico` returns 404; no share image exists. | Browser tabs/bookmarks lack a site mark, and social shares will have weak visual previews. | Add an original favicon and share image after confirming visual assets and domain. |
| 9 | **Low** | Google Fonts are a third-party runtime dependency. | External availability, privacy, and load timing are outside the site's control. | Decide whether to retain the provider or self-host optimized WOFF2 subsets; test actual production loading and fallback. |
| 10 | **Low** | Empty-state/setup copy is repeated across pages. | Honest placeholders are appropriate now, but too much scaffolding competes with real work once it is available. | Revisit copy and spacing after content is supplied; do not fill space with fabricated work or stock material. |

## Implementation roadmap

1. **Resolve owner-dependent launch inputs:** approved biography and experience, public contact route, current Now details, and any work/research/writing that is genuinely publishable. Record explicit permission/embargo limits.
2. **Close the accessibility blockers:** adjust contrast in every theme/mode and hover/focus state; improve small functional text; run a complete keyboard and screen-reader-oriented pass plus an automated WCAG scan.
3. **Finalize the content contract:** add notes, experiments, experience, certifications, and current-exploration schemas; validate required fields, status transitions, dates, media descriptions, and article reading time. Keep presentation data-driven.
4. **Complete public metadata and identity assets:** agree the production domain; produce per-page/per-entry SEO and social metadata, canonical URLs, favicon/share images, sitemap, and robots policy. Prefer pre-rendered detail pages for published content.
5. **Choose publishing infrastructure separately:** select a managed CMS unless there is a concrete need and budget to operate one; implement server-side roles, secure preview, media controls, validation, auditability, and a publish-to-static-build flow. Do not add a frontend password gate.
6. **Validate the actual release target:** automate route, link, schema, and browser behavior checks; run accessibility and performance tools against staging; verify HTTPS/headers/redirects, mobile layouts, social cards, console/network health, and a rollback path before launch.

## Checks performed and limitations

- Rendered and smoke-tested all seven primary pages and three detail templates in the browser; checked routes, active navigation, empty/unknown detail states, theme behavior/persistence, lens and diagram interactions, dialog Escape/focus return, and reduced motion.
- Checked responsive widths at 320, 390, 768, 1024, and 1440 px across all ten routes.
- Checked local HTTP responses, static links/IDs, JavaScript syntax, Google Fonts reachability, browser console/request failures, metadata presence, source and rendered detector signals, and project asset/config inventory.
- No application files were edited. `PRODUCTION_AUDIT.md` is the audit deliverable.
- Not performed: production-host testing, full WCAG/assistive-technology certification, Lighthouse/Core Web Vitals, actual article/project data testing, CI/build/lint/type-check (not configured), or a penetration test.
