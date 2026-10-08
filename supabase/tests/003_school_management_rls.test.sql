begin;

select plan(8);

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
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'teacher.one@soulmais.test',
    '',
    now(),
    '{"role":"teacher"}'::jsonb,
    '{"full_name":"Teacher One"}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'teacher.two@soulmais.test',
    '',
    now(),
    '{"role":"teacher"}'::jsonb,
    '{"full_name":"Teacher Two"}'::jsonb
  );

insert into public.school_years (id, year, start_date, end_date, organization_id)
select
  '20000000-0000-0000-0000-000000000001',
  2098,
  '2098-01-01',
  '2098-12-31',
  organization.id
from public.organizations as organization
where organization.slug = 'soulmais';

insert into public.classes (id, school_year_id, name)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Class One'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'Class Two'
  );

insert into public.teacher_classes (teacher_id, class_id)
select teacher.id, class.id
from public.teachers as teacher
join public.classes as class on class.name = case
  when teacher.profile_id = '10000000-0000-0000-0000-000000000001' then 'Class One'
  else 'Class Two'
end
where teacher.profile_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is((select count(*)::integer from public.classes), 1, 'teacher reads only assigned class');
select ok(
  public.teacher_has_class_access('30000000-0000-0000-0000-000000000001'),
  'teacher has access to assigned class'
);
select ok(
  not public.teacher_has_class_access('30000000-0000-0000-0000-000000000002'),
  'teacher cannot access another class'
);
select lives_ok(
  $$ select public.create_class('20000000-0000-0000-0000-000000000001', 'Created Class') $$,
  'teacher creates and is assigned to a class atomically'
);
select ok(
  exists (
    select 1 from public.classes where name = 'Created Class'
  ),
  'created class is visible to its teacher'
);
select lives_ok(
  $$ select public.create_student_with_enrollment(
    'Student One', '2010-05-10', '30000000-0000-0000-0000-000000000001'
  ) $$,
  'teacher creates student and enrollment atomically'
);
select is((select count(*)::integer from public.students), 1, 'teacher sees enrolled student');

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select is((select count(*)::integer from public.students), 0, 'other teacher cannot see student');

select * from finish();
rollback;