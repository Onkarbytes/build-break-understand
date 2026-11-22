# Content model and publishing boundary

The public site reads Markdown collections from `src/content/`. Collection definitions and Zod validation live in `src/content.config.ts`; shared profile interests and current-state copy live in `src/content/profile.ts`. Content is separate from Astro page presentation and is validated during `npm run check` and `npm run build`.

## Visibility and factual integrity

Shared frontmatter includes a stable filename/slug, `title`, `summary`, `status`, `public`, optional dates, tags, category, and optional SEO description/image. The defaults are `status: draft` and `public: false`. Archives and generated detail pages include only records with `public: true` and `status: published`; in-progress investigations can be explicitly shown on the research archive with an ongoing label.

These are static build-time filters, not authentication or confidentiality controls. Every file committed to a public repository must be considered public. Keep confidential, employer-owned, embargoed, draft-sensitive, or uncleared material out of the public repository entirely.

Do not invent projects, findings, employment history, credentials, dates, contact information, or accomplishments. Interests are labelled as interests; empty public archives are intentional until verified material is available.

## Collections

All collection records use Markdown with YAML frontmatter and a Markdown body.

### Projects — `src/content/projects/`

In addition to shared metadata:

- `role`, `stack`, `architecture`
- `sections`: titled implementation details
- `screenshots`: site-relative or HTTPS `src`, descriptive `alt`, optional `caption`
- HTTPS-only `sourceCodeUrl` and `demoUrl`
- `lessons`

Published project details are generated at `/projects/{slug}`.

### Investigations — `src/content/investigations/`

Additional fields: `topics`, `methodology`, `technicalDetails`, `diagrams`, `code` blocks, `findings`, `limitations`, `references`, `conclusion`, and `disclosureStatus`. References can be plain text or a title with an HTTPS URL. Do not describe an ongoing investigation as a confirmed finding.

Published details are generated at `/investigations/{slug}`. Public in-progress entries are labelled as ongoing.

### Experiments — `src/content/experiments/`

Additional fields: `hypothesis`, `scope`, `methodology`, `observations`, `limitations`, and `references`. Published details are generated at `/experiments/{slug}`.

### Articles and research notes — `src/content/articles/`

Article frontmatter supports category, tags, publication/update dates, references, related article slugs, and shared SEO metadata. Research notes use the same validated editorial format and are distinguished by category rather than an unrelated presentation system.

Markdown supports headings, lists, quotes, images, and code. Article pages generate a linked table of contents, reading-time estimate, and syntax-highlighted code; references and related links are supported. Published details are generated at `/writing/{slug}`.

### Now updates — `src/content/now/`

Additional fields: required `area` and `statusText`, plus shared status/date/tags metadata. `src/content/profile.ts` holds the verified interest taxonomy and explicit “not supplied” current-state values; it does not claim that an interest is active research.

### Professional experience and certifications

The profile source defines typed `ProfessionalExperience` and `Certification` record shapes, but there are no supplied records and no public detail/archive pages for them. The About page should remain explicit about this gap until verified content and its public presentation are approved.

## Adding a record

1. Add a Markdown file named for its URL-safe slug under the matching collection directory.
2. Provide the required title and summary and the collection-specific fields in `src/content.config.ts`.
3. Keep it draft/non-public until every factual claim and publication right is verified.
4. For an intentionally public release, set `status: published` and `public: true`; add a verified date where appropriate.
5. Run `npm run check` and `npm run build`, then review the generated page and metadata.

Example:

```yaml
---
title: "Verified article title"
summary: "A concise, factual description."
status: draft
public: false
category: "Research note"
tags: []
---

Draft body.
```

## Supabase publishing model

The private `/admin` studio writes drafts to `content_entries`, media metadata to `media_assets`, and attaches media with `content_media`. Common fields (type, title, slug, excerpt, Markdown, category, tags, SEO fields, status, timestamps, and featured/ordering metadata) are columns. Type-specific presentation data is stored in the `metadata` JSON object and is validated by the Astro collection schema during the static build.

Only the authenticated administrator allowlisted in `admin_users` can access draft records or private draft media. Browser clients do not receive column privileges to change `status` or `published_at`; publication transitions go through the protected Pages Function at `/api/publish`. The function verifies the user and allowlist, rate-limits requests, promotes referenced media, updates status, then calls the protected Cloudflare Pages deploy hook. Public builds query published entries only and fail on CMS errors when `CMS_REQUIRED=true`.

The preview is generated inside the authenticated dashboard and is not a public draft route. The public website remains static. Supabase/Cloudflare account configuration, initial admin provisioning, password reset email delivery, deploy-hook success, and production restore procedures require owner-provided accounts and must be completed using [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) and [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md). Never expose service-role keys or deploy-hook URLs to the browser.
