# Cloudflare Pages setup

## Create and deploy the Pages project

1. Connect the repository to Cloudflare Pages and use `npm run build` as the build command with `dist` as the output directory.
2. Enable the Pages V2 build system so the checked-in [`wrangler.toml`](./wrangler.toml) configures the Pages Functions and rate-limit bindings.
3. Set these **build environment variables** for preview and production as appropriate:
   - `PUBLIC_SITE_URL`: canonical site origin, with no path.
   - `PUBLIC_SUPABASE_URL`: the Supabase project URL.
   - `PUBLIC_SUPABASE_ANON_KEY`: the Supabase anon/publishable key.
   - `CMS_REQUIRED`: `true` for production builds. This fails a deployment if the CMS is not configured or its published-content query fails.
4. Deploy once to create the Pages project. Confirm the public routes render before enabling publication.
5. Create a Cloudflare Pages deploy hook for this project. Keep its URL private.
6. Add these **Pages Function runtime secrets** in the Cloudflare dashboard (Settings → Variables and Secrets), separately for preview and production as required:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CLOUDFLARE_DEPLOY_HOOK`
7. Deploy again and test the Pages Function from the authenticated admin.

The function accepts only same-origin JSON POST requests, verifies the Supabase access token with Auth, checks the server-side administrator allowlist, rate-limits by Cloudflare IP and verified user, changes publication state with the service-role key, promotes referenced media, and then calls the protected deploy hook. The service-role key and hook URL are never bundled into the site.

The rate-limit API is approximate and enforced per Cloudflare location, not a strict global quota. The namespace IDs in `wrangler.toml` must be unique within your Cloudflare account; choose new integer IDs if either is already used by another Worker.

## Local Pages Function preview

Build the static site, configure the local runtime secrets in an ignored `.dev.vars` file, then run:

```powershell
npm run build
npm run pages:dev
```

Do not point a local preview at the production deploy hook unless triggering a production rebuild is intended. A missing runtime secret or rate-limit binding must fail closed rather than publish.

## Publication behavior

Supabase records change status before Cloudflare accepts a build request. If the hook is unreachable, the function explicitly reports that the status changed but the build did not start; verify the record and retry. A successful hook response means Cloudflare accepted the build, not that the build completed. Check the Pages deployment log for build failures.
