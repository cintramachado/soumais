create function public.score_summary(p_task_id uuid default null,p_student_id uuid default null,p_period_id uuid default null)
returns table(total_score numeric,maximum_score numeric,assigned_count bigint,completed_count bigint,pending_count bigint,late_count bigint,on_time_count bigint,achievement_percentage numeric,completed_percentage numeric,on_time_percentage numeric)
language sql stable security invoker set search_path='' as $$
  with totals as (
    select coalesce(sum(coalesce(assignment.manual_score,assignment.calculated_score)),0) as earned,
      coalesce(sum(task.maximum_score),0) as possible,count(*) as assigned,
      count(*) filter(where assignment.status in ('completed_on_time','completed_late')) as completed,
      count(*) filter(where assignment.status='pending') as pending,
      count(*) filter(where assignment.status='completed_late') as late,
      count(*) filter(where assignment.status='completed_on_time') as on_time
    from public.student_tasks assignment join public.tasks task on task.id=assignment.task_id
    where task.status in ('active','closed')
      and (p_task_id is null or task.id=p_task_id)
      and (p_student_id is null or assignment.student_id=p_student_id)
      and (p_period_id is null or task.period_id=p_period_id)
  )
  select earned,possible,assigned,completed,pending,late,on_time,
    case when possible=0 then 0 else round(earned*100/possible,2) end,
    case when assigned=0 then 0 else round(completed*100.0/assigned,2) end,
    case when assigned=0 then 0 else round(on_time*100.0/assigned,2) end
  from totals
$$;
revoke execute on function public.score_summary(uuid,uuid,uuid) from public,anon;
grant execute on function public.score_summary(uuid,uuid,uuid) to authenticated;