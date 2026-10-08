begin;

select plan(15);

insert into public.organizations (id, name, slug)
values ('21000000-0000-0000-0000-000000000002', 'Soul+ Two', 'soulmais-two');

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  (
    '11000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'teacher.one@org-one.test',
    '',
    now(),
    '{"role":"teacher"}'::jsonb,
    '{"full_name":"Teacher One"}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'teacher.two@org-two.test',
    '',
    now(),
    '{"role":"teacher"}'::jsonb,
    '{"full_name":"Teacher Two"}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'teacher.multi@orgs.test',
    '',
    now(),
    '{"role":"teacher"}'::jsonb,
    '{"full_name":"Teacher Multi"}'::jsonb
  );

delete from public.organization_memberships
where profile_id = '11000000-0000-0000-0000-000000000002';

insert into public.organization_memberships (organization_id, profile_id, role)
values
  (
    '21000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000002',
    'teacher'
  ),
  (
    '21000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000003',
    'teacher'
  );

update public.teachers set organization_id='21000000-0000-0000-0000-000000000002'
where profile_id='11000000-0000-0000-0000-000000000002';

insert into public.school_years (id, organization_id, year, start_date, end_date)
values
  (
    '22000000-0000-0000-0000-000000000001',
    (select id from public.organizations where slug = 'soulmais'),
    2097,
    '2097-01-01',
    '2097-12-31'
  ),
  (
    '22000000-0000-0000-0000-000000000002',
    '21000000-0000-0000-0000-000000000002',
    2097,
    '2097-01-01',
    '2097-12-31'
  );

insert into public.classes (id, school_year_id, name)
values
  (
    '23000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'Org One Class'
  ),
  (
    '23000000-0000-0000-0000-000000000002',
    '22000000-0000-0000-0000-000000000002',
    'Org Two Class'
  );

insert into public.teacher_classes (teacher_id, class_id)
select teacher.id, class.id
from public.teachers as teacher
join public.classes as class on class.id in (
  '23000000-0000-0000-0000-000000000001',
  '23000000-0000-0000-0000-000000000002'
)
join public.organization_memberships as membership
  on membership.profile_id = teacher.profile_id
join public.school_years as school_year
  on school_year.id = class.school_year_id
  and school_year.organization_id = membership.organization_id
where teacher.profile_id in (
  '11000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000002'
)
  and membership.active;

insert into public.periods (id, school_year_id, name, start_date, end_date)
values
  (
    '24000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'Org One Period',
    '2097-01-01',
    '2097-06-30'
  ),
  (
    '24000000-0000-0000-0000-000000000002',
    '22000000-0000-0000-0000-000000000002',
    'Org Two Period',
    '2097-01-01',
    '2097-06-30'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.current_organization_id(),
  (select id from public.organizations where slug = 'soulmais'),
  'teacher is scoped to default organization'
);
select is((select count(*)::integer from public.school_years where id in ('22000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000002')), 1, 'teacher sees only own organization school year');
select is((select count(*)::integer from public.classes), 1, 'teacher sees only assigned class in own organization');
select is((select count(*)::integer from public.periods where id in ('24000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000002')), 1, 'teacher sees only own organization period');
select lives_ok(
  $$ select public.create_school_year(2098, '2098-01-01', '2098-12-31') $$,
  'teacher creates school year in current organization'
);
select lives_ok(
  $$ select public.create_class('22000000-0000-0000-0000-000000000001', 'Created Org One') $$,
  'teacher creates class only in current organization'
);
select is((select count(*)::integer from public.classes), 2, 'created class is visible in current organization');

select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select is(
  public.current_organization_id(),
  '21000000-0000-0000-0000-000000000002'::uuid,
  'second teacher is scoped to second organization'
);
select is((select count(*)::integer from public.school_years), 1, 'second teacher sees only second organization school year');
select is((select count(*)::integer from public.classes), 1, 'second teacher sees only assigned class');
select is((select count(*)::integer from public.periods), 1, 'second teacher sees only second organization period');
select throws_ok(
  $$ select public.create_class('22000000-0000-0000-0000-000000000001', 'Cross Org Attempt') $$,
  '22023',
  'Active school year in current organization required',
  'teacher cannot create class in another organization'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select is(public.current_organization_id(), null::uuid, 'multiple memberships have no implicit active organization');
select is((select count(*)::integer from public.school_years), 0, 'ambiguous membership sees no school years');
select throws_ok(
  $$ select public.create_school_year(2099, '2099-01-01', '2099-12-31') $$,
  '42501',
  'Teacher membership required',
  'ambiguous membership cannot mutate organization data'
);

select * from finish();
rollback;