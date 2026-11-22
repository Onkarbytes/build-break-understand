begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'cms-admin-test@example.invalid', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'cms-user-test@example.invalid', '', now(), now(), now());

insert into public.admin_users (user_id)
values ('00000000-0000-0000-0000-000000000001');

insert into public.content_entries (id, content_type, title, slug, status, published_at, created_by)
values
  ('00000000-0000-0000-0000-000000000011', 'article', 'Published test entry', 'published-test', 'published', now(), '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000012', 'article', 'Draft test entry', 'draft-test', 'draft', null, '00000000-0000-0000-0000-000000000001');

select ok((select relrowsecurity from pg_class where oid = 'public.content_entries'::regclass), 'content has row-level security');
select ok((select relrowsecurity from pg_class where oid = 'public.admin_users'::regclass), 'admin allowlist has row-level security');
select ok(not has_column_privilege('authenticated', 'public.content_entries', 'status', 'UPDATE'), 'browser administrators cannot directly publish');
select ok(not has_table_privilege('anon', 'public.content_entries', 'INSERT'), 'anonymous users cannot create content');
select ok(not has_table_privilege('anon', 'public.content_entries', 'UPDATE'), 'anonymous users cannot edit content');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon","sub":""}', true);
select is((select count(*)::integer from public.content_entries), 1, 'anonymous visitors see published entries only');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}', true);
select is((select count(*)::integer from public.content_entries), 1, 'authenticated non-admins see published entries only');
select throws_ok(
  $$insert into public.content_entries (content_type, title, slug) values ('article', 'Denied', 'denied')$$,
  '42501',
  null,
  'authenticated non-admins cannot write'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}', true);
select is((select count(*)::integer from public.content_entries), 2, 'allowlisted administrators can read drafts');
select lives_ok(
  $$insert into public.content_entries (content_type, title, slug) values ('article', 'New draft', 'new-draft')$$,
  'allowlisted administrators can create drafts'
);

select * from finish();
rollback;
