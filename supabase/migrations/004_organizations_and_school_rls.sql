create type public.organization_role as enum ('teacher', 'student', 'parent');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  timezone text not null default 'America/Sao_Paulo',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  role public.organization_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create index organization_memberships_profile_active_idx
  on public.organization_memberships (profile_id, active);

insert into public.organizations (name, slug)
values ('Soul+ Principal', 'soulmais')
on conflict (slug) do nothing;

alter table public.school_years
  add column organization_id uuid references public.organizations (id) on delete restrict;

update public.school_years
set organization_id = (select id from public.organizations where slug = 'soulmais')
where organization_id is null;

alter table public.school_years
  alter column organization_id set not null;

alter table public.school_years
  drop constraint if exists school_years_year_key;

alter table public.school_years
  add constraint school_years_organization_year_key unique (organization_id, year);

create index school_years_organization_id_idx on public.school_years (organization_id);

insert into public.organization_memberships (organization_id, profile_id, role)
select organization.id, profile.id, profile.role::text::public.organization_role
from public.profiles as profile
cross join public.organizations as organization
where organization.slug = 'soulmais'
on conflict (organization_id, profile_id) do nothing;

insert into public.teachers (profile_id)
select profile.id
from public.profiles as profile
where profile.role = 'teacher'
on conflict (profile_id) do nothing;

create function public.provision_default_organization_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  default_organization_id uuid;
begin
  select id into default_organization_id
  from public.organizations
  where slug = 'soulmais' and active;

  if default_organization_id is null then
    raise exception 'Default organization is not configured';
  end if;

  insert into public.organization_memberships (organization_id, profile_id, role)
  values (default_organization_id, new.id, new.role::text::public.organization_role)
  on conflict (organization_id, profile_id) do nothing;

  if new.role = 'teacher' then
    insert into public.teachers (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger provision_default_organization_membership
after insert on public.profiles
for each row execute function public.provision_default_organization_membership();

revoke execute on function public.provision_default_organization_membership()
  from public, anon, authenticated;

create or replace function public.current_organization_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  membership_count integer;
  selected_organization_id uuid;
begin
  select count(*), (array_agg(membership.organization_id))[1]
  into membership_count, selected_organization_id
  from public.organization_memberships as membership
  join public.organizations as organization
    on organization.id = membership.organization_id
  where membership.profile_id = (select auth.uid())
    and membership.active
    and organization.active;

  if membership_count <> 1 then
    return null;
  end if;

  return selected_organization_id;
end;
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select teacher.id
  from public.teachers as teacher
  join public.profiles as profile on profile.id = teacher.profile_id
  join public.organization_memberships as membership
    on membership.profile_id = profile.id
  where profile.id = (select auth.uid())
    and profile.role = 'teacher'
    and profile.active
    and teacher.active
    and membership.role = 'teacher'
    and membership.active
    and membership.organization_id = public.current_organization_id()
  limit 1
$$;

create or replace function public.teacher_has_class_access(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_classes as assignment
    join public.classes as class on class.id = assignment.class_id
    join public.school_years as school_year on school_year.id = class.school_year_id
    where assignment.teacher_id = public.current_teacher_id()
      and assignment.class_id = target_class_id
      and school_year.organization_id = public.current_organization_id()
  )
$$;

create or replace function public.is_active_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_teacher_id() is not null
$$;

create function public.organization_has_teacher_access(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    join public.profiles as profile on profile.id = membership.profile_id
    join public.organizations as organization on organization.id = membership.organization_id
    where membership.profile_id = (select auth.uid())
      and membership.organization_id = target_organization_id
      and membership.role = 'teacher'
      and membership.active
      and profile.role = 'teacher'
      and profile.active
      and organization.active
      and membership.organization_id = public.current_organization_id()
  )
$$;

revoke execute on function public.current_organization_id() from public, anon;
revoke execute on function public.organization_has_teacher_access(uuid) from public, anon;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.organization_has_teacher_access(uuid) to authenticated;

create function public.create_school_year(
  p_year integer,
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_school_year_id uuid;
  acting_organization_id uuid;
begin
  acting_organization_id := public.current_organization_id();
  if acting_organization_id is null or not public.is_active_teacher() then
    raise exception using errcode = '42501', message = 'Teacher membership required';
  end if;

  insert into public.school_years (organization_id, year, start_date, end_date)
  values (acting_organization_id, p_year, p_start_date, p_end_date)
  returning id into new_school_year_id;

  return new_school_year_id;
end;
$$;

create or replace function public.create_class(p_school_year_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_class_id uuid;
  acting_teacher_id uuid;
begin
  acting_teacher_id := public.current_teacher_id();
  if acting_teacher_id is null then
    raise exception using errcode = '42501', message = 'Active teacher membership required';
  end if;

  if not exists (
    select 1 from public.school_years
    where id = p_school_year_id
      and active
      and organization_id = public.current_organization_id()
  ) then
    raise exception using errcode = '22023', message = 'Active school year in current organization required';
  end if;

  insert into public.classes (school_year_id, name)
  values (p_school_year_id, trim(p_name))
  returning id into new_class_id;

  insert into public.teacher_classes (teacher_id, class_id)
  values (acting_teacher_id, new_class_id);

  return new_class_id;
end;
$$;

create or replace function public.create_student_with_enrollment(
  p_name text,
  p_birth_date date,
  p_class_id uuid,
  p_group_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_student_id uuid;
  class_school_year_id uuid;
  new_enrollment_id uuid;
begin
  if not public.teacher_has_class_access(p_class_id) then
    raise exception using errcode = '42501', message = 'Teacher is not assigned to this class';
  end if;

  select class.school_year_id into class_school_year_id
  from public.classes as class
  join public.school_years as school_year on school_year.id = class.school_year_id
  where class.id = p_class_id
    and class.active
    and school_year.organization_id = public.current_organization_id();

  if class_school_year_id is null then
    raise exception using errcode = '22023', message = 'Active class required';
  end if;

  if p_group_id is not null and not exists (
    select 1 from public.groups
    where id = p_group_id and class_id = p_class_id and active
  ) then
    raise exception using errcode = '22023', message = 'Group must be active and belong to the class';
  end if;

  insert into public.students (name, birth_date)
  values (trim(p_name), p_birth_date)
  returning id into new_student_id;

  insert into public.student_enrollments (student_id, class_id, school_year_id)
  values (new_student_id, p_class_id, class_school_year_id)
  returning id into new_enrollment_id;

  if p_group_id is not null then
    insert into public.student_groups (enrollment_id, group_id)
    values (new_enrollment_id, p_group_id);
  end if;

  return new_student_id;
end;
$$;

revoke execute on function public.create_school_year(integer, date, date) from public, anon;
revoke execute on function public.create_class(uuid, text) from public, anon;
revoke execute on function public.create_student_with_enrollment(text, date, uuid, uuid)
  from public, anon;
grant execute on function public.create_school_year(integer, date, date) to authenticated;
grant execute on function public.create_class(uuid, text) to authenticated;
grant execute on function public.create_student_with_enrollment(text, date, uuid, uuid)
  to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

revoke all on public.organizations, public.organization_memberships from anon, authenticated;
grant select on public.organizations, public.organization_memberships to authenticated;

create policy organizations_member_select
  on public.organizations for select to authenticated
  using (id = public.current_organization_id());
create policy memberships_self_select
  on public.organization_memberships for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists school_years_teacher_select on public.school_years;
drop policy if exists school_years_teacher_insert on public.school_years;
drop policy if exists school_years_teacher_update on public.school_years;
drop policy if exists periods_teacher_select on public.periods;
drop policy if exists periods_teacher_insert on public.periods;
drop policy if exists periods_teacher_update on public.periods;

revoke insert, update on public.school_years from authenticated;
grant select on public.school_years to authenticated;
grant update (year, start_date, end_date, active) on public.school_years to authenticated;

create policy school_years_member_select
  on public.school_years for select to authenticated
  using (public.organization_has_teacher_access(organization_id));
create policy school_years_member_update
  on public.school_years for update to authenticated
  using (public.organization_has_teacher_access(organization_id))
  with check (public.organization_has_teacher_access(organization_id));

create policy periods_member_select
  on public.periods for select to authenticated
  using (
    exists (
      select 1 from public.school_years as school_year
      where school_year.id = periods.school_year_id
        and public.organization_has_teacher_access(school_year.organization_id)
    )
  );
create policy periods_member_insert
  on public.periods for insert to authenticated
  with check (
    exists (
      select 1 from public.school_years as school_year
      where school_year.id = periods.school_year_id
        and school_year.active
        and public.organization_has_teacher_access(school_year.organization_id)
    )
  );
create policy periods_member_update
  on public.periods for update to authenticated
  using (
    exists (
      select 1 from public.school_years as school_year
      where school_year.id = periods.school_year_id
        and public.organization_has_teacher_access(school_year.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.school_years as school_year
      where school_year.id = periods.school_year_id
        and public.organization_has_teacher_access(school_year.organization_id)
    )
  );

create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();