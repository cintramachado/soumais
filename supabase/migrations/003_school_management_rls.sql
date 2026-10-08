create function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select teacher.id
  from public.teachers as teacher
  join public.profiles as profile on profile.id = teacher.profile_id
  where profile.id = (select auth.uid())
    and profile.role = 'teacher'
    and profile.active
    and teacher.active
  limit 1
$$;

create function public.is_active_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_teacher_id() is not null
$$;

create function public.teacher_has_class_access(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_classes as assignment
    where assignment.teacher_id = public.current_teacher_id()
      and assignment.class_id = target_class_id
  )
$$;

revoke execute on function public.current_teacher_id() from public, anon;
revoke execute on function public.is_active_teacher() from public, anon;
revoke execute on function public.teacher_has_class_access(uuid) from public, anon;
grant execute on function public.current_teacher_id() to authenticated;
grant execute on function public.is_active_teacher() to authenticated;
grant execute on function public.teacher_has_class_access(uuid) to authenticated;

create function public.create_class(p_school_year_id uuid, p_name text)
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
    raise exception using errcode = '42501', message = 'Active teacher profile required';
  end if;

  if not exists (
    select 1 from public.school_years
    where id = p_school_year_id and active
  ) then
    raise exception using errcode = '22023', message = 'Active school year required';
  end if;

  insert into public.classes (school_year_id, name)
  values (p_school_year_id, trim(p_name))
  returning id into new_class_id;

  insert into public.teacher_classes (teacher_id, class_id)
  values (acting_teacher_id, new_class_id);

  return new_class_id;
end;
$$;

create function public.create_student_with_enrollment(
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

  select school_year_id into class_school_year_id
  from public.classes
  where id = p_class_id and active;

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

revoke execute on function public.create_class(uuid, text) from public, anon;
revoke execute on function public.create_student_with_enrollment(text, date, uuid, uuid)
  from public, anon;
grant execute on function public.create_class(uuid, text) to authenticated;
grant execute on function public.create_student_with_enrollment(text, date, uuid, uuid)
  to authenticated;

grant select, insert, update on public.school_years to authenticated;
grant select, insert, update on public.periods to authenticated;
grant select, update on public.classes to authenticated;
grant update (name, birth_date, active) on public.students to authenticated;
grant select on public.students to authenticated;
grant select, update on public.student_enrollments to authenticated;
grant select, insert, update on public.groups to authenticated;
grant select, insert, delete on public.student_groups to authenticated;

create policy school_years_teacher_select
  on public.school_years for select to authenticated
  using (public.is_active_teacher());
create policy school_years_teacher_insert
  on public.school_years for insert to authenticated
  with check (public.is_active_teacher());
create policy school_years_teacher_update
  on public.school_years for update to authenticated
  using (public.is_active_teacher())
  with check (public.is_active_teacher());

create policy periods_teacher_select
  on public.periods for select to authenticated
  using (public.is_active_teacher());
create policy periods_teacher_insert
  on public.periods for insert to authenticated
  with check (public.is_active_teacher());
create policy periods_teacher_update
  on public.periods for update to authenticated
  using (public.is_active_teacher())
  with check (public.is_active_teacher());

create policy classes_assigned_teacher_select
  on public.classes for select to authenticated
  using (public.teacher_has_class_access(id));
create policy classes_assigned_teacher_update
  on public.classes for update to authenticated
  using (public.teacher_has_class_access(id))
  with check (public.teacher_has_class_access(id));

create policy groups_assigned_teacher_select
  on public.groups for select to authenticated
  using (public.teacher_has_class_access(class_id));
create policy groups_assigned_teacher_insert
  on public.groups for insert to authenticated
  with check (public.teacher_has_class_access(class_id));
create policy groups_assigned_teacher_update
  on public.groups for update to authenticated
  using (public.teacher_has_class_access(class_id))
  with check (public.teacher_has_class_access(class_id));

create policy enrollments_assigned_teacher_select
  on public.student_enrollments for select to authenticated
  using (public.teacher_has_class_access(class_id));
create policy enrollments_assigned_teacher_update
  on public.student_enrollments for update to authenticated
  using (public.teacher_has_class_access(class_id))
  with check (public.teacher_has_class_access(class_id));

create policy students_assigned_teacher_select
  on public.students for select to authenticated
  using (
    exists (
      select 1 from public.student_enrollments as enrollment
      where enrollment.student_id = students.id
        and public.teacher_has_class_access(enrollment.class_id)
    )
  );
create policy students_assigned_teacher_update
  on public.students for update to authenticated
  using (
    exists (
      select 1 from public.student_enrollments as enrollment
      where enrollment.student_id = students.id
        and public.teacher_has_class_access(enrollment.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.student_enrollments as enrollment
      where enrollment.student_id = students.id
        and public.teacher_has_class_access(enrollment.class_id)
    )
  );

create policy student_groups_assigned_teacher_select
  on public.student_groups for select to authenticated
  using (
    exists (
      select 1
      from public.student_enrollments as enrollment
      join public.groups as class_group on class_group.id = student_groups.group_id
      where enrollment.id = student_groups.enrollment_id
        and enrollment.class_id = class_group.class_id
        and public.teacher_has_class_access(enrollment.class_id)
    )
  );
create policy student_groups_assigned_teacher_insert
  on public.student_groups for insert to authenticated
  with check (
    exists (
      select 1
      from public.student_enrollments as enrollment
      join public.groups as class_group on class_group.id = student_groups.group_id
      where enrollment.id = student_groups.enrollment_id
        and enrollment.class_id = class_group.class_id
        and public.teacher_has_class_access(enrollment.class_id)
    )
  );
create policy student_groups_assigned_teacher_delete
  on public.student_groups for delete to authenticated
  using (
    exists (
      select 1
      from public.student_enrollments as enrollment
      join public.groups as class_group on class_group.id = student_groups.group_id
      where enrollment.id = student_groups.enrollment_id
        and enrollment.class_id = class_group.class_id
        and public.teacher_has_class_access(enrollment.class_id)
    )
  );