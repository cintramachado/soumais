create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
  role_is_trusted boolean;
begin
  assigned_role := new.raw_app_meta_data ->> 'role';
  role_is_trusted := assigned_role in ('teacher', 'student', 'parent');

  insert into public.profiles (id, full_name, email, role, active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when role_is_trusted then assigned_role::public.app_role else 'parent'::public.app_role end,
    coalesce(role_is_trusted, false)
  );

  return new;
end;
$$;

create or replace function public.provision_default_organization_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  default_organization_id uuid;
begin
  if not new.active then
    update public.organization_memberships
    set active = false
    where profile_id = new.id and active;

    update public.teachers
    set active = false
    where profile_id = new.id and active;

    return new;
  end if;

  select id into default_organization_id
  from public.organizations
  where slug = 'soulmais' and active;

  if default_organization_id is null then
    raise exception 'Default organization is not configured';
  end if;

  insert into public.organization_memberships (organization_id, profile_id, role, active)
  values (default_organization_id, new.id, new.role::text::public.organization_role, true)
  on conflict (organization_id, profile_id)
  do update set role = excluded.role, active = true;

  if new.role = 'teacher' then
    insert into public.teachers (profile_id, active)
    values (new.id, true)
    on conflict (profile_id) do update set active = true;
  else
    update public.teachers
    set active = false
    where profile_id = new.id and active;
  end if;

  return new;
end;
$$;

drop trigger if exists provision_default_organization_membership on public.profiles;
create trigger provision_default_organization_membership
after insert or update of role, active on public.profiles
for each row execute function public.provision_default_organization_membership();

create function public.sync_profile_from_trusted_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
begin
  assigned_role := new.raw_app_meta_data ->> 'role';

  if assigned_role in ('teacher', 'student', 'parent') then
    update public.profiles
    set role = assigned_role::public.app_role,
        active = true
    where id = new.id;
  else
    update public.profiles
    set active = false
    where id = new.id and active;
  end if;

  return new;
end;
$$;

create trigger sync_profile_from_trusted_auth_metadata
after update of raw_app_meta_data on auth.users
for each row
when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
execute function public.sync_profile_from_trusted_auth_metadata();

revoke execute on function public.sync_profile_from_trusted_auth_metadata()
  from public, anon, authenticated;