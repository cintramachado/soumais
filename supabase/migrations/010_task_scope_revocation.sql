create or replace function public.teacher_owns_task(target_task_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.tasks task
    join public.periods period on period.id=task.period_id
    join public.school_years year on year.id=period.school_year_id
    where task.id=target_task_id and task.teacher_id=public.current_teacher_id()
      and year.organization_id=public.current_organization_id()
      and not exists (
        select 1 from public.task_targets target where target.task_id=task.id
        and not (
          (target.class_id is not null and public.teacher_has_class_access(target.class_id)
            and exists(select 1 from public.classes class where class.id=target.class_id and class.school_year_id=period.school_year_id))
          or (target.group_id is not null and exists(
            select 1 from public.groups grp join public.classes class on class.id=grp.class_id
            where grp.id=target.group_id and class.school_year_id=period.school_year_id and public.teacher_has_class_access(class.id)))
          or (target.student_id is not null and exists(
            select 1 from public.student_enrollments enrollment
            where enrollment.student_id=target.student_id and enrollment.school_year_id=period.school_year_id
              and public.teacher_has_class_access(enrollment.class_id)))
        )
      )
  )
$$;
alter function public.list_teacher_tasks(integer,text,text,uuid,uuid,uuid,uuid,date,date) security invoker;