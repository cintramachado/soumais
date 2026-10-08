create function public.teacher_dashboard_metrics(p_class_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_active_teacher() then raise exception using errcode='42501',message='Teacher required'; end if;
  if p_class_id is not null and not public.teacher_has_class_access(p_class_id) then
    raise exception using errcode='42501',message='Dashboard class access denied';
  end if;
  with roster as (
    select distinct student.id,year.id as school_year_id
    from public.students student
    join public.student_enrollments enrollment on enrollment.student_id=student.id and enrollment.active
    join public.classes class on class.id=enrollment.class_id and class.active
    join public.school_years year on year.id=class.school_year_id and year.active
    where student.active and year.organization_id=public.current_organization_id()
      and public.teacher_has_class_access(class.id) and (p_class_id is null or class.id=p_class_id)
  ), results as (
    select assignment.id,assignment.status,assignment.task_id,coalesce(assignment.manual_score,assignment.calculated_score) as score,
      task.maximum_score,task.status as task_status
    from public.student_tasks assignment join public.tasks task on task.id=assignment.task_id
    join public.periods period on period.id=task.period_id
    where task.status in ('active','closed') and exists(
      select 1 from roster where roster.id=assignment.student_id and roster.school_year_id=period.school_year_id)
  ), totals as (
    select coalesce(sum(score),0) as earned,coalesce(sum(maximum_score),0) as maximum,
      count(*) filter(where status='pending') as pending,
      count(*) filter(where status in ('completed_on_time','completed_late')) as completed,count(*) as assigned
    from results
  )
  select jsonb_build_object(
    'students',(select count(distinct id) from roster),
    'openTasks',(select count(distinct task_id) from results where task_status='active'),
    'pending',totals.pending,
    'achievementPercentage',case when totals.maximum=0 then 0 else round(totals.earned*100/totals.maximum,2) end,
    'completedPercentage',case when totals.assigned=0 then 0 else round(totals.completed*100.0/totals.assigned,2) end,
    'totalScore',totals.earned,
    'updatedAt',statement_timestamp()
  ) into result from totals;
  return result;
end;
$$;
revoke execute on function public.teacher_dashboard_metrics(uuid) from public,anon;
grant execute on function public.teacher_dashboard_metrics(uuid) to authenticated;