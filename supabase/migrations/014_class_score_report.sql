create function public.class_score_report(p_class_id uuid,p_period_id uuid default null,p_group_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare class_row public.classes; period_name text; group_name text; school_year integer;
  organization_timezone text; teachers_json jsonb; students_json jsonb; student_count integer;
begin
  if not public.teacher_has_class_access(p_class_id) then
    raise exception using errcode='42501',message='Class report access denied';
  end if;
  select * into class_row from public.classes where id=p_class_id;
  select year.year,organization.timezone into school_year,organization_timezone
  from public.school_years year join public.organizations organization on organization.id=year.organization_id
  where year.id=class_row.school_year_id and organization.id=public.current_organization_id();
  if school_year is null then raise exception using errcode='42501',message='Class report access denied'; end if;
  if p_period_id is not null then
    select name into period_name from public.periods where id=p_period_id and school_year_id=class_row.school_year_id;
    if period_name is null then raise exception using errcode='22023',message='Period outside class school year'; end if;
  end if;
  if p_group_id is not null then
    select name into group_name from public.groups where id=p_group_id and class_id=p_class_id;
    if group_name is null then raise exception using errcode='22023',message='Group outside class'; end if;
  end if;
  select coalesce(jsonb_agg(names.full_name order by names.full_name),'[]'::jsonb) into teachers_json
  from (
    select profile.full_name from public.teacher_classes assignment
    join public.teachers teacher on teacher.id=assignment.teacher_id and teacher.active
    join public.profiles profile on profile.id=teacher.profile_id and profile.active
    join public.organization_memberships membership on membership.profile_id=profile.id
      and membership.organization_id=public.current_organization_id() and membership.active and membership.role='teacher'
    where assignment.class_id=p_class_id
  ) names;
  select count(*) into student_count from public.student_enrollments enrollment
  where enrollment.class_id=p_class_id and enrollment.active and (p_group_id is null or exists(
    select 1 from public.student_groups membership where membership.enrollment_id=enrollment.id and membership.group_id=p_group_id));
  if student_count>1000 then raise exception using errcode='22023',message='Report exceeds 1000 students; filter by group'; end if;
  with roster as (
    select student.id,student.name,student.active,enrollment.id as enrollment_id
    from public.student_enrollments enrollment join public.students student on student.id=enrollment.student_id
    where enrollment.class_id=p_class_id and enrollment.active and (p_group_id is null or exists(
      select 1 from public.student_groups membership where membership.enrollment_id=enrollment.id and membership.group_id=p_group_id))
  ), points as (
    select assignment.student_id,sum(coalesce(assignment.manual_score,assignment.calculated_score)) as earned,
      sum(task.maximum_score) as maximum,count(*) as assigned,
      count(*) filter(where assignment.status in ('completed_on_time','completed_late')) as completed
    from public.student_tasks assignment join public.tasks task on task.id=assignment.task_id
    join public.periods period on period.id=task.period_id
    where task.status in ('active','closed') and period.school_year_id=class_row.school_year_id
      and (p_period_id is null or period.id=p_period_id)
      and assignment.student_id in(select id from roster)
    group by assignment.student_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',roster.id,'name',roster.name,'active',roster.active,
    'groups',coalesce((select jsonb_agg(grp.name order by grp.name) from public.student_groups membership
      join public.groups grp on grp.id=membership.group_id and grp.class_id=p_class_id where membership.enrollment_id=roster.enrollment_id),'[]'::jsonb),
    'score',coalesce(points.earned,0),'maximumScore',coalesce(points.maximum,0),
    'assigned',coalesce(points.assigned,0),'completed',coalesce(points.completed,0)
  ) order by roster.name,roster.id),'[]'::jsonb) into students_json
  from roster left join points on points.student_id=roster.id;
  return jsonb_build_object('className',class_row.name,'schoolYear',school_year,'periodName',period_name,
    'groupName',group_name,'timezone',organization_timezone,'teachers',teachers_json,'students',students_json,'generatedAt',statement_timestamp());
end;
$$;
revoke execute on function public.class_score_report(uuid,uuid,uuid) from public,anon;
grant execute on function public.class_score_report(uuid,uuid,uuid) to authenticated;