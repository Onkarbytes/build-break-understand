# Publishing studio guide

The private studio is served at `/admin`; sign-in and password recovery are at `/admin/login`. It is a single-author CMS, not an open registration system. An Auth account is usable only after its UUID is added to `public.admin_users`.

## Drafting

1. Sign in with the allowlisted Supabase account. The overview lists stored content and its current status.
2. Choose a section or create a draft. Add a title, URL slug, excerpt, Markdown body, tags, and any relevant metadata. Autosave writes editable fields to Supabase; the browser also keeps a per-entry recovery copy if a save fails.
3. Use **Preview** to render the current text in the authenticated dashboard. This does not publish a public preview route.
4. For an image, upload a JPG, PNG, or WebP under 10 MB in Media library. Add descriptive alt text and insert it from the library so the CMS links the asset to the entry. Images remain in private draft storage until a publish request promotes referenced files. **Promotion makes an image publicly readable, and unpublishing a post does not remove a previously promoted image.** Upload only material cleared for public release.
5. Explicitly review the factual claims, disclosure status, image rights/alt text, metadata JSON, and excerpt before publishing.

The structured metadata JSON maps to these Astro collection schemas:

- **Project:** `role`, `stack`, `architecture`, `sections`, `screenshots`, `sourceCodeUrl`, `demoUrl`, `lessons`.
- **Research:** `topics`, `methodology`, `technicalDetails`, `diagrams`, `code`, `findings`, `limitations`, `references`, `conclusion`, `disclosureStatus`.
- **Article / research note:** `references`, `related`; use category and tags to distinguish research notes from articles.
- **Experiment:** `hypothesis`, `scope`, `methodology`, `observations`, `limitations`, `references`.
- **Now update:** `area` and `statusText`.

Use the shapes in `src/content.config.ts` as the source of truth. The collection schema validates content during the build. A malformed record can cause a deployment to fail; check the Pages build log after Cloudflare accepts a hook request.

## Publication states

- **Draft:** private in Supabase; absent from public builds.
- **Published:** visible to public queries and included on the next successful static build.
- **Unpublish:** returns an entry to draft state.
- **Archive:** removes an entry from public builds while keeping it in the private dashboard.

The publishing endpoint updates the database before triggering the deploy hook. If the hook request fails, the dashboard reports that the status changed but no build started. Check the entry status before retrying. Hook acceptance is not the same as a successful build.

Do not use the CMS for unverified achievements, confidential employer details, unauthorized research, or private credentials. Keep professional experience and certifications empty until verified facts are supplied.

## Account and support

Public registration is disabled. Create or revoke the administrator through Supabase Auth and the `admin_users` allowlist as described in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). Password reset requires working Supabase email configuration. The optional TOTP setting must be verified with a real authenticator; it is not a substitute for the server-side allowlist.
