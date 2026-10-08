create function public.parent_student_dashboard(p_student_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.parent_can_read_student(p_student_id) then
    raise exception using errcode = '42501', message = 'Parent student dashboard access denied';
  end if;

  select jsonb_build_object(
    'student', jsonb_build_object(
      'id', student.id,
      'name', student.name,
      'birthDate', student.birth_date,
      'active', student.active
    ),
    'summary', (
      select jsonb_build_object(
        'totalScore', coalesce(sum(coalesce(assignment.manual_score, assignment.calculated_score)), 0),
        'maximumScore', coalesce(sum(task.maximum_score), 0),
        'assignedCount', count(*),
        'completedCount', count(*) filter (where assignment.status in ('completed_on_time', 'completed_late')),
        'pendingCount', count(*) filter (where assignment.status = 'pending'),
        'notCompletedCount', count(*) filter (where assignment.status = 'not_completed'),
        'lateCount', count(*) filter (where assignment.status = 'completed_late'),
        'onTimeCount', count(*) filter (where assignment.status = 'completed_on_time'),
        'achievementPercentage', case
          when coalesce(sum(task.maximum_score), 0) = 0 then 0
          else round(coalesce(sum(coalesce(assignment.manual_score, assignment.calculated_score)), 0) * 100
            / sum(task.maximum_score), 2)
        end
      )
      from public.student_tasks assignment
      join public.tasks task on task.id = assignment.task_id
      where assignment.student_id = student.id and task.status in ('active', 'closed')
    ),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', assignment.id,
        'title', task.title,
        'description', task.description,
        'taskType', task_type.name,
        'period', period.name,
        'startDate', task.start_date,
        'dueDate', task.due_date,
        'maximumScore', task.maximum_score,
        'score', coalesce(assignment.manual_score, assignment.calculated_score),
        'status', assignment.status,
        'completedAt', assignment.completed_at
      ) order by task.due_date desc, task.created_at desc)
      from public.student_tasks assignment
      join public.tasks task on task.id = assignment.task_id
      join public.task_types task_type on task_type.id = task.task_type_id
      join public.periods period on period.id = task.period_id
      where assignment.student_id = student.id and task.status in ('active', 'closed')
    ), '[]'::jsonb)
  ) into result
  from public.students student
  where student.id = p_student_id;

  return result;
end;
$$;

revoke execute on function public.parent_student_dashboard(uuid) from public, anon;
grant execute on function public.parent_student_dashboard(uuid) to authenticated;