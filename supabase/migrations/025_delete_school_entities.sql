create function public.delete_period(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_active_teacher() then raise exception using errcode='42501',message='Teacher required'; end if;
  if not exists(
    select 1 from public.periods period
    join public.school_years school_year on school_year.id = period.school_year_id
    where period.id = p_id and school_year.organization_id = public.current_organization_id()
  ) then
    raise exception using errcode='42501',message='Period access denied';
  end if;
  if exists(select 1 from public.tasks where period_id = p_id) then
    raise exception using errcode='23503',message='Period in use by existing tasks';
  end if;
  delete from public.periods where id = p_id;
end;
$$;

create function public.delete_group(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(
    select 1 from public.groups grp where grp.id = p_id and public.teacher_has_class_access(grp.class_id)
  ) then
    raise exception using errcode='42501',message='Group access denied';
  end if;
  if exists(select 1 from public.task_targets where group_id = p_id) then
    raise exception using errcode='23503',message='Group in use by existing tasks';
  end if;
  delete from public.student_groups where group_id = p_id;
  delete from public.groups where id = p_id;
end;
$$;

create function public.delete_student(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(
    select 1 from public.student_enrollments enrollment
    where enrollment.student_id = p_id and public.teacher_has_class_access(enrollment.class_id)
  ) then
    raise exception using errcode='42501',message='Student access denied';
  end if;
  if exists(select 1 from public.student_tasks where student_id = p_id)
    or exists(select 1 from public.task_targets where student_id = p_id) then
    raise exception using errcode='23503',message='Student in use by existing tasks';
  end if;
  delete from public.student_groups
    where enrollment_id in (select id from public.student_enrollments where student_id = p_id);
  delete from public.parent_students where student_id = p_id;
  delete from public.student_enrollments where student_id = p_id;
  delete from public.students where id = p_id;
end;
$$;

create function public.delete_teacher(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_active_teacher() then raise exception using errcode='42501',message='Teacher required'; end if;
  if p_id = public.current_teacher_id() then
    raise exception using errcode='42501',message='Cannot delete own teacher record';
  end if;
  if not exists(select 1 from public.teachers where id = p_id and organization_id = public.current_organization_id()) then
    raise exception using errcode='42501',message='Teacher access denied';
  end if;
  if exists(select 1 from public.tasks where teacher_id = p_id)
    or exists(select 1 from public.groups where responsible_teacher_id = p_id) then
    raise exception using errcode='23503',message='Teacher in use by existing tasks or groups';
  end if;
  delete from public.teacher_classes where teacher_id = p_id;
  delete from public.teachers where id = p_id;
end;
$$;

create function public.delete_parent(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.can_manage_parent(p_id) then
    raise exception using errcode='42501',message='Parent access denied';
  end if;
  delete from public.parent_students where parent_id = p_id;
  delete from public.parents where id = p_id;
end;
$$;

revoke execute on function public.delete_period(uuid), public.delete_group(uuid),
  public.delete_student(uuid), public.delete_teacher(uuid), public.delete_parent(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_period(uuid), public.delete_group(uuid),
  public.delete_student(uuid), public.delete_teacher(uuid), public.delete_parent(uuid)
  to authenticated;
