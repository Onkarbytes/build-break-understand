# Supabase setup

The public website remains static. Supabase stores private drafts and media; its public client key can only read published content under row-level security. Never put the service-role key in a `PUBLIC_` variable or browser bundle.

## Create the project and apply the schema

1. Create a Supabase project and keep its database password in a password manager.
2. Apply `supabase/migrations/20261102000100_cms.sql` using the Supabase SQL Editor, or link the project and run `supabase db push` with the Supabase CLI.
3. Confirm the migration creates the `admin_users`, `content_entries`, `media_assets`, and `content_media` tables, the private `draft-media` bucket, and the public `published-media` bucket.
4. In Authentication settings, disable new user sign-ups and configure the production site URL plus the exact `/admin/login` redirect URL. Keep email confirmation enabled.
5. Create the single administrator account in Supabase Auth using the dashboard. Do not enable public registration.
6. Copy that user's UUID and add it to the allowlist from the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('replace-with-the-auth-user-uuid');
   ```

The admin pages are not protected by obscurity. Auth, the `admin_users` allowlist, row-level security, column grants, and the server-side publishing endpoint enforce access.

## Local development

1. Copy `.env.example` to `.env` and set the public site URL, project URL, and anon key. Astro loads these values before content collections sync.
2. Set `CMS_REQUIRED=false` in the shell that runs Astro for local development if the CMS is not configured. Shell variables override `.env`; `PUBLIC_` values are intentionally public.
3. Copy `.dev.vars.example` to `.dev.vars` only when testing the Pages Function through Wrangler. Keep the service-role key and deploy-hook URL private. Do not configure a production deploy hook for local testing unless you intentionally want local actions to trigger production builds.
4. Run `npm run dev`. The application can be viewed without a Supabase project; admin data operations require the Supabase settings above.

The checked-in local Auth config disables sign-ups. Its sample redirect domain must be replaced with the real local/production origin when running Supabase locally or configuring a hosted project.

## Row-level security checks

The pgTAP policy tests are in `supabase/tests/content_access.test.sql`. With the Supabase CLI and a local Supabase stack available, run `supabase test db`. Test the hosted project separately before launch; local tests do not prove that hosted Auth, SMTP, redirect URLs, or storage settings are correct.

## Recovery and operational checks

- Keep database backups enabled and test restoring one before relying on the CMS.
- Rotate the service-role key immediately if it is exposed.
- Check Supabase Auth, Postgres, and Storage logs when an operation fails.
- Treat all published media as public and all content committed to a public Git repository as public.
