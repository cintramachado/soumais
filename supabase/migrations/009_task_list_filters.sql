create function public.list_teacher_tasks(
  p_page integer default 1, p_search text default '', p_status text default null,
  p_type_id uuid default null, p_period_id uuid default null, p_class_id uuid default null,
  p_group_id uuid default null, p_from date default null, p_to date default null
)
returns table(id uuid,title text,type_name text,period_name text,due_date date,maximum_score numeric,status text,total_count bigint)
language sql stable security definer set search_path='' as $$
  select task.id,task.title,type.name,period.name,task.due_date,task.maximum_score,task.status,count(*) over()
  from public.tasks task
  join public.task_types type on type.id=task.task_type_id
  join public.periods period on period.id=task.period_id
  join public.school_years year on year.id=period.school_year_id
  where task.teacher_id=public.current_teacher_id() and year.organization_id=public.current_organization_id()
    and (p_search='' or task.title ilike '%' || replace(replace(left(p_search,120),'%',''),'_','') || '%')
    and (p_status is null or task.status=p_status)
    and (p_type_id is null or task.task_type_id=p_type_id)
    and (p_period_id is null or task.period_id=p_period_id)
    and (p_from is null or task.due_date>=p_from) and (p_to is null or task.due_date<=p_to)
    and (p_class_id is null or exists (
      select 1 from public.task_targets target where target.task_id=task.id and (
        target.class_id=p_class_id or exists(select 1 from public.groups grp where grp.id=target.group_id and grp.class_id=p_class_id)
        or exists(select 1 from public.student_enrollments enrollment where enrollment.student_id=target.student_id and enrollment.class_id=p_class_id and enrollment.school_year_id=period.school_year_id))))
    and (p_group_id is null or exists (
      select 1 from public.task_targets target join public.groups grp on grp.id=p_group_id
      join public.classes class on class.id=grp.class_id and class.school_year_id=period.school_year_id
      where target.task_id=task.id and (
        target.group_id=p_group_id or target.class_id=grp.class_id or exists (
          select 1 from public.student_groups membership join public.student_enrollments enrollment on enrollment.id=membership.enrollment_id
          where membership.group_id=p_group_id and enrollment.student_id=target.student_id and enrollment.school_year_id=period.school_year_id))))
  order by task.due_date desc, task.id
  limit 20 offset ((greatest(1,least(coalesce(p_page,1),10000))-1)*20)
$$;
revoke execute on function public.list_teacher_tasks(integer,text,text,uuid,uuid,uuid,uuid,date,date) from public,anon;
grant execute on function public.list_teacher_tasks(integer,text,text,uuid,uuid,uuid,uuid,date,date) to authenticated;