alter table public.parents
  add column name text,
  add column phone text,
  add column organization_id uuid references public.organizations(id) on delete restrict,
  add column created_by uuid references public.profiles(id) on delete restrict;
update public.parents as parent
set name = coalesce((select full_name from public.profiles where id = parent.profile_id), 'Responsavel'),
    organization_id = (select id from public.organizations where slug = 'soulmais');
alter table public.parents alter column name set not null, alter column organization_id set not null;
alter table public.parents add constraint parents_name_check check (length(trim(name)) between 1 and 120);
create index parents_organization_idx on public.parents(organization_id);

create function public.can_manage_parent(target_parent_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.parents p
    where p.id = target_parent_id
      and p.organization_id = public.current_organization_id()
      and public.is_active_teacher()
      and (p.created_by = auth.uid() or exists (
        select 1 from public.parent_students ps
        join public.student_enrollments e on e.student_id = ps.student_id
        where ps.parent_id = p.id and public.teacher_has_class_access(e.class_id)
      ))
  )
$$;

create function public.parent_can_read_student(target_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.parents p
    join public.profiles profile on profile.id = p.profile_id
    join public.organization_memberships m on m.profile_id = p.profile_id and m.organization_id = p.organization_id
    join public.parent_students ps on ps.parent_id = p.id
    where p.profile_id = auth.uid() and p.active and profile.active
      and m.active and m.role = 'parent'
      and p.organization_id = public.current_organization_id()
      and ps.student_id = target_student_id
      and exists (
        select 1 from public.student_enrollments e
        join public.school_years y on y.id = e.school_year_id
        where e.student_id = target_student_id and y.organization_id = p.organization_id
      )
  )
$$;

create function public.save_parent(p_name text, p_phone text default null, p_id uuid default null, p_active boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if not public.is_active_teacher() then
    raise exception using errcode = '42501', message = 'Teacher required';
  end if;
  if p_id is null then
    insert into public.parents(name, phone, organization_id, created_by, active)
    values (trim(p_name), nullif(trim(p_phone), ''), public.current_organization_id(), auth.uid(), p_active)
    returning id into result_id;
  else
    if not public.can_manage_parent(p_id) then
      raise exception using errcode = '42501', message = 'Parent access denied';
    end if;
    update public.parents set name = trim(p_name), phone = nullif(trim(p_phone), ''), active = p_active where id = p_id;
    result_id := p_id;
  end if;
  return result_id;
end;
$$;

create function public.set_parent_student(p_parent_id uuid, p_student_id uuid, p_relationship text, p_remove boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_parent(p_parent_id) or not exists (
    select 1 from public.student_enrollments e
    where e.student_id = p_student_id and public.teacher_has_class_access(e.class_id)
  ) then
    raise exception using errcode = '42501', message = 'Student or parent access denied';
  end if;
  if p_remove then
    delete from public.parent_students where parent_id = p_parent_id and student_id = p_student_id;
  else
    if not exists(select 1 from public.parents where id = p_parent_id and active) then
      raise exception using errcode = '22023', message = 'Active parent required';
    end if;
    insert into public.parent_students(parent_id, student_id, relationship_type)
    values(p_parent_id, p_student_id, trim(p_relationship))
    on conflict(parent_id, student_id) do update set relationship_type = excluded.relationship_type;
  end if;
end;
$$;

create function public.attach_parent_account(p_parent_id uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_profile uuid;
begin
  if not public.can_manage_parent(p_parent_id) then
    raise exception using errcode = '42501', message = 'Parent access denied';
  end if;
  select profile.id into target_profile from public.profiles profile
  join public.organization_memberships m on m.profile_id = profile.id
  where lower(profile.email) = lower(trim(p_email)) and profile.active and m.active and m.role = 'parent'
    and m.organization_id = public.current_organization_id();
  if target_profile is null then
    raise exception using errcode = '22023', message = 'Provisioned parent account required';
  end if;
  if exists(select 1 from public.parents where id = p_parent_id and profile_id is not null and profile_id <> target_profile) then
    raise exception using errcode = '22023', message = 'Account already attached';
  end if;
  update public.parents set profile_id = target_profile where id = p_parent_id;
end;
$$;

revoke all on public.parents, public.parent_students from anon, authenticated;
grant select on public.parents, public.parent_students to authenticated;
create policy parents_select on public.parents for select to authenticated
using (public.can_manage_parent(id) or (profile_id = auth.uid() and active and organization_id = public.current_organization_id()));
create policy parent_students_select on public.parent_students for select to authenticated
using (
  (public.can_manage_parent(parent_id) and exists (
    select 1 from public.student_enrollments e where e.student_id = parent_students.student_id and public.teacher_has_class_access(e.class_id)
  )) or (public.parent_can_read_student(student_id) and exists (
    select 1 from public.parents p where p.id = parent_students.parent_id and p.profile_id = auth.uid()
  ))
);
create policy students_parent_select on public.students for select to authenticated
using (public.parent_can_read_student(id));
create policy enrollments_parent_select on public.student_enrollments for select to authenticated
using (public.parent_can_read_student(student_id) and exists (
  select 1 from public.school_years y where y.id = student_enrollments.school_year_id and y.organization_id = public.current_organization_id()
));

revoke execute on function public.can_manage_parent(uuid), public.parent_can_read_student(uuid),
  public.save_parent(text,text,uuid,boolean), public.set_parent_student(uuid,uuid,text,boolean), public.attach_parent_account(uuid,text) from public, anon;
grant execute on function public.can_manage_parent(uuid), public.parent_can_read_student(uuid),
  public.save_parent(text,text,uuid,boolean), public.set_parent_student(uuid,uuid,text,boolean), public.attach_parent_account(uuid,text) to authenticated;