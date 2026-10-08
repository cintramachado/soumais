alter table public.task_types add column organization_id uuid references public.organizations(id) on delete restrict;
alter table public.score_policies add column organization_id uuid references public.organizations(id) on delete restrict;
update public.task_types set organization_id=(select id from public.organizations where slug='soulmais');
update public.score_policies set organization_id=coalesce(
  (select organization_id from public.school_years where id=score_policies.school_year_id),
  (select id from public.organizations where slug='soulmais'));
alter table public.task_types alter column organization_id set not null;
alter table public.score_policies alter column organization_id set not null;
alter table public.task_types drop constraint task_types_name_key;
alter table public.task_types add constraint task_types_org_name_unique unique(organization_id,name);
drop index public.score_policies_global_name_idx;
drop index public.score_policies_year_name_idx;
create unique index score_policies_global_name_idx on public.score_policies(organization_id,name) where school_year_id is null;
create unique index score_policies_year_name_idx on public.score_policies(organization_id,school_year_id,name) where school_year_id is not null;
create index task_types_org_idx on public.task_types(organization_id);

create function public.teacher_owns_task(target_task_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.tasks task join public.periods period on period.id=task.period_id
    join public.school_years year on year.id=period.school_year_id
    where task.id=target_task_id and task.teacher_id=public.current_teacher_id()
      and year.organization_id=public.current_organization_id())
$$;

create function public.validate_task_destination(p_period_id uuid, p_class_id uuid default null, p_group_id uuid default null, p_student_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare target_year uuid; destination_class uuid;
begin
  select period.school_year_id into target_year from public.periods period
  join public.school_years year on year.id=period.school_year_id
  where period.id=p_period_id and period.active and year.active
    and year.organization_id=public.current_organization_id();
  if target_year is null or num_nonnulls(p_class_id,p_group_id,p_student_id)<>1 then
    raise exception using errcode='22023',message='Invalid task destination or period';
  end if;
  if p_class_id is not null then destination_class:=p_class_id;
  elsif p_group_id is not null then
    select class_id into destination_class from public.groups where id=p_group_id and active;
  else
    select enrollment.class_id into destination_class from public.student_enrollments enrollment
    join public.students student on student.id=enrollment.student_id
    where enrollment.student_id=p_student_id and enrollment.school_year_id=target_year and enrollment.active and student.active;
  end if;
  if destination_class is null or not public.teacher_has_class_access(destination_class)
    or not exists(select 1 from public.classes where id=destination_class and active and school_year_id=target_year) then
    raise exception using errcode='42501',message='Destination outside assigned classes or school year';
  end if;
end;
$$;

create function public.save_task_type(p_name text,p_description text,p_score numeric,p_id uuid default null,p_active boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
  if not public.is_active_teacher() then raise exception using errcode='42501',message='Teacher required'; end if;
  if length(trim(p_name)) not between 1 and 120 or p_score is null or p_score<0 then
    raise exception using errcode='22023',message='Invalid task type';
  end if;
  if p_id is null then
    insert into public.task_types(organization_id,name,description,default_score,active)
    values(public.current_organization_id(),trim(p_name),p_description,p_score,p_active) returning id into result_id;
  else
    update public.task_types set name=trim(p_name),description=p_description,default_score=p_score,active=p_active
    where id=p_id and organization_id=public.current_organization_id() returning id into result_id;
    if result_id is null then raise exception using errcode='42501',message='Task type access denied'; end if;
  end if;
  return result_id;
end;
$$;

create function public.save_task_draft(p_task jsonb,p_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; policy_id uuid; period_id_value uuid;
  class_ids uuid[]; group_ids uuid[]; student_ids uuid[]; destination uuid; task_state text;
  start_value date; due_value date;
begin
  if not public.is_active_teacher() then raise exception using errcode='42501',message='Teacher required'; end if;
  period_id_value:=(p_task->>'periodId')::uuid;
  start_value:=(p_task->>'startDate')::date;
  due_value:=(p_task->>'dueDate')::date;
  if length(trim(p_task->>'title')) not between 1 and 200 or start_value is null or due_value is null
    or start_value>due_value or (p_task->>'maximumScore')::numeric is null or (p_task->>'maximumScore')::numeric<0 then
    raise exception using errcode='22023',message='Invalid task data';
  end if;
  if not exists(select 1 from public.periods p join public.school_years y on y.id=p.school_year_id
    where p.id=period_id_value and p.active and y.active and y.organization_id=public.current_organization_id()
      and start_value>=p.start_date and due_value<=p.end_date) then
    raise exception using errcode='22023',message='Task dates outside active period';
  end if;
  if not exists(select 1 from public.task_types where id=(p_task->>'taskTypeId')::uuid and active and organization_id=public.current_organization_id()) then
    raise exception using errcode='42501',message='Task type access denied';
  end if;
  select coalesce(array_agg(value::uuid),'{}') into class_ids from jsonb_array_elements_text(coalesce(p_task->'classIds','[]'));
  select coalesce(array_agg(value::uuid),'{}') into group_ids from jsonb_array_elements_text(coalesce(p_task->'groupIds','[]'));
  select coalesce(array_agg(value::uuid),'{}') into student_ids from jsonb_array_elements_text(coalesce(p_task->'studentIds','[]'));
  if cardinality(class_ids)+cardinality(group_ids)+cardinality(student_ids) not between 1 and 1000 then
    raise exception using errcode='22023',message='At least one destination required';
  end if;
  foreach destination in array class_ids loop perform public.validate_task_destination(period_id_value,destination,null,null); end loop;
  foreach destination in array group_ids loop perform public.validate_task_destination(period_id_value,null,destination,null); end loop;
  foreach destination in array student_ids loop perform public.validate_task_destination(period_id_value,null,null,destination); end loop;

  if p_id is not null then
    if not public.teacher_owns_task(p_id) then raise exception using errcode='42501',message='Task access denied'; end if;
    select status into task_state from public.tasks where id=p_id for update;
    if task_state<>'draft' then raise exception using errcode='22023',message='Only drafts can be edited'; end if;
    result_id:=p_id;
    update public.tasks set title=trim(p_task->>'title'),description=p_task->>'description',task_type_id=(p_task->>'taskTypeId')::uuid,
      period_id=period_id_value,start_date=start_value,due_date=due_value,maximum_score=(p_task->>'maximumScore')::numeric where id=p_id;
    delete from public.task_targets where task_id=p_id;
  else
    insert into public.score_policies(organization_id,name) values(public.current_organization_id(),'Default')
    on conflict(organization_id,name) where school_year_id is null do nothing;
    select id into policy_id from public.score_policies where organization_id=public.current_organization_id() and name='Default' and school_year_id is null;
    insert into public.tasks(title,description,task_type_id,period_id,teacher_id,score_policy_id,start_date,due_date,maximum_score,created_by)
    values(trim(p_task->>'title'),p_task->>'description',(p_task->>'taskTypeId')::uuid,period_id_value,public.current_teacher_id(),policy_id,start_value,due_value,(p_task->>'maximumScore')::numeric,auth.uid())
    returning id into result_id;
  end if;
  insert into public.task_targets(task_id,class_id) select result_id,unnest(class_ids) on conflict do nothing;
  insert into public.task_targets(task_id,group_id) select result_id,unnest(group_ids) on conflict do nothing;
  insert into public.task_targets(task_id,student_id) select result_id,unnest(student_ids) on conflict do nothing;
  return result_id;
end;
$$;

create function public.publish_task(p_task_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare task_row public.tasks; destination public.task_targets; assigned_count integer;
begin
  if not public.teacher_owns_task(p_task_id) then raise exception using errcode='42501',message='Task access denied'; end if;
  select * into task_row from public.tasks where id=p_task_id for update;
  if task_row.status='active' then
    select count(*) into assigned_count from public.student_tasks where task_id=p_task_id;
    return assigned_count;
  end if;
  if task_row.status<>'draft' then raise exception using errcode='22023',message='Only drafts can be published'; end if;
  for destination in select * from public.task_targets where task_id=p_task_id loop
    perform public.validate_task_destination(task_row.period_id,destination.class_id,destination.group_id,destination.student_id);
  end loop;
  insert into public.student_tasks(task_id,student_id)
  select distinct p_task_id,student.id
  from public.students student
  join public.student_enrollments enrollment on enrollment.student_id=student.id
  join public.classes class on class.id=enrollment.class_id
  join public.periods period on period.id=task_row.period_id and period.school_year_id=enrollment.school_year_id
  where student.active and enrollment.active and class.active
    and public.teacher_has_class_access(class.id)
    and exists(select 1 from public.task_targets target where target.task_id=p_task_id and (
      target.class_id=class.id or target.student_id=student.id or exists(
        select 1 from public.student_groups membership join public.groups grp on grp.id=membership.group_id
        where membership.enrollment_id=enrollment.id and grp.active and grp.class_id=class.id and grp.id=target.group_id)))
  on conflict(task_id,student_id) do nothing;
  select count(*) into assigned_count from public.student_tasks where task_id=p_task_id;
  if assigned_count=0 then raise exception using errcode='22023',message='No active students in destinations'; end if;
  insert into public.student_task_events(student_task_id,new_status,note,changed_by)
  select id,'pending','Task published',auth.uid() from public.student_tasks where task_id=p_task_id;
  update public.tasks set status='active',activated_at=now() where id=p_task_id;
  return assigned_count;
end;
$$;

create function public.change_task_state(p_task_id uuid,p_state text)
returns void language plpgsql security definer set search_path='' as $$
declare current_state text;
begin
  if not public.teacher_owns_task(p_task_id) then raise exception using errcode='42501',message='Task access denied'; end if;
  select status into current_state from public.tasks where id=p_task_id for update;
  if not ((p_state='cancelled' and current_state in ('draft','active')) or (p_state='closed' and current_state='active')) then
    raise exception using errcode='22023',message='Invalid task state transition';
  end if;
  update public.tasks set status=p_state where id=p_task_id;
end;
$$;

revoke all on public.task_types,public.score_policies,public.tasks,public.task_targets,public.student_tasks from anon,authenticated;
grant select on public.task_types,public.score_policies,public.tasks,public.task_targets,public.student_tasks to authenticated;
create policy task_types_teacher_select on public.task_types for select to authenticated using(public.organization_has_teacher_access(organization_id));
create policy score_policies_teacher_select on public.score_policies for select to authenticated using(public.organization_has_teacher_access(organization_id));
create policy tasks_owner_select on public.tasks for select to authenticated using(public.teacher_owns_task(id));
create policy task_targets_owner_select on public.task_targets for select to authenticated using(public.teacher_owns_task(task_id));
create policy student_tasks_owner_select on public.student_tasks for select to authenticated using(public.teacher_owns_task(task_id));
revoke execute on function public.teacher_owns_task(uuid),public.validate_task_destination(uuid,uuid,uuid,uuid),
  public.save_task_type(text,text,numeric,uuid,boolean),public.save_task_draft(jsonb,uuid),public.publish_task(uuid),public.change_task_state(uuid,text) from public,anon,authenticated;
grant execute on function public.teacher_owns_task(uuid),public.save_task_type(text,text,numeric,uuid,boolean),
  public.save_task_draft(jsonb,uuid),public.publish_task(uuid),public.change_task_state(uuid,text) to authenticated;