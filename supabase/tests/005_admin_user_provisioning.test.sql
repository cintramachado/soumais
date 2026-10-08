begin;

select plan(8);

select lives_ok(
  $$
    insert into auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data
    ) values (
      '12000000-0000-0000-0000-000000000001',
      'authenticated',
      'authenticated',
      'new.teacher@soulmais.test',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"New Teacher"}'::jsonb
    )
  $$,
  'Auth user without a trusted role can be created in an inactive state'
);

select is(
  (select active from public.profiles where id = '12000000-0000-0000-0000-000000000001'),
  false,
  'profile stays inactive before trusted role assignment'
);
select is(
  (select count(*)::integer from public.organization_memberships where profile_id = '12000000-0000-0000-0000-000000000001'),
  0,
  'inactive profile receives no organization membership'
);

select lives_ok(
  $$
    update auth.users
    set raw_app_meta_data = raw_app_meta_data || '{"role":"teacher"}'::jsonb
    where id = '12000000-0000-0000-0000-000000000001'
  $$,
  'trusted Auth Admin role assignment activates the profile'
);

select is(
  (select active from public.profiles where id = '12000000-0000-0000-0000-000000000001'),
  true,
  'profile becomes active after trusted role assignment'
);
select is(
  (select role::text from public.profiles where id = '12000000-0000-0000-0000-000000000001'),
  'teacher',
  'profile role comes from trusted app metadata'
);
select is(
  (select count(*)::integer from public.organization_memberships where profile_id = '12000000-0000-0000-0000-000000000001' and role = 'teacher' and active),
  1,
  'teacher membership is provisioned after role assignment'
);
select is(
  (select count(*)::integer from public.teachers where profile_id = '12000000-0000-0000-0000-000000000001' and active),
  1,
  'teacher record is provisioned after role assignment'
);

select * from finish();
rollback;