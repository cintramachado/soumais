alter table public.student_tasks
  add constraint student_tasks_scores_finite check(calculated_score between 0 and 99999999.99 and (manual_score is null or manual_score between 0 and 99999999.99)),
  add constraint student_tasks_manual_reason_required check(manual_score is null or (manual_score_reason is not null and length(trim(manual_score_reason)) between 1 and 2000));
alter table public.score_history
  add column previous_manual_score numeric(10,2),
  add column new_manual_score numeric(10,2),
  add column previous_calculated_score numeric(10,2),
  add column new_calculated_score numeric(10,2),
  add column previous_status text,
  add column new_status text;
create index score_history_assignment_date_idx on public.score_history(student_task_id,changed_at desc);

create function public.calculate_task_score(p_maximum numeric,p_status text,p_late_multiplier numeric,p_manual numeric default null)
returns numeric language plpgsql immutable set search_path='' as $$
begin
  if p_maximum is null or not (p_maximum between 0 and 99999999.99) or p_maximum<>round(p_maximum,2)
    or p_status is null or p_status not in ('pending','completed_on_time','completed_late','not_completed')
    or p_late_multiplier is null or not (p_late_multiplier between 0 and 1) or p_late_multiplier<>round(p_late_multiplier,4) then
    raise exception using errcode='22023',message='Invalid score inputs';
  end if;
  if p_manual is not null then
    if not (p_manual between 0 and p_maximum) or p_manual<>round(p_manual,2) then
      raise exception using errcode='22023',message='Invalid manual score';
    end if;
    return p_manual;
  end if;
  if p_status='completed_on_time' then return p_maximum; end if;
  if p_status='completed_late' then return round(p_maximum*p_late_multiplier,2); end if;
  return 0;
end;
$$;

create function public.protect_score_policy()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' or old.organization_id is distinct from new.organization_id
    or old.school_year_id is distinct from new.school_year_id or old.late_multiplier is distinct from new.late_multiplier then
    if exists(select 1 from public.tasks where score_policy_id=old.id) then
      raise exception using errcode='22023',message='Referenced score policies are immutable';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger protect_score_policy before update or delete on public.score_policies for each row execute function public.protect_score_policy();

create function public.configure_late_multiplier(p_multiplier numeric)
returns uuid language plpgsql security definer set search_path='' as $$
declare organization_id_value uuid; result_id uuid; old_policy public.score_policies;
begin
  organization_id_value:=public.current_organization_id();
  if not public.is_active_teacher() then raise exception using errcode='42501',message='Teacher required'; end if;
  if p_multiplier is null or not (p_multiplier between 0 and 1) or p_multiplier<>round(p_multiplier,4) then
    raise exception using errcode='22023',message='Invalid late multiplier';
  end if;
  perform id from public.organizations where id=organization_id_value for update;
  select * into old_policy from public.score_policies where organization_id=organization_id_value and school_year_id is null and name='Default' for update;
  if old_policy.id is not null and old_policy.late_multiplier=p_multiplier then return old_policy.id; end if;
  if old_policy.id is not null then
    update public.score_policies set name='Archived ' || old_policy.id::text where id=old_policy.id;
  end if;
  insert into public.score_policies(organization_id,name,late_multiplier) values(organization_id_value,'Default',p_multiplier) returning id into result_id;
  return result_id;
end;
$$;

create function public.insert_score_audit(p_old public.student_tasks,p_new public.student_tasks,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.score_history(student_task_id,student_id,previous_score,new_score,reason,changed_by,
    previous_manual_score,new_manual_score,previous_calculated_score,new_calculated_score,previous_status,new_status)
  values(p_new.id,p_new.student_id,coalesce(p_old.manual_score,p_old.calculated_score),coalesce(p_new.manual_score,p_new.calculated_score),p_reason,auth.uid(),
    p_old.manual_score,p_new.manual_score,p_old.calculated_score,p_new.calculated_score,p_old.status,p_new.status);
end;
$$;

create function public.record_student_task(p_id uuid,p_status text,p_completed_date date default null)
returns numeric language plpgsql security definer set search_path='' as $$
declare old_assignment public.student_tasks; new_assignment public.student_tasks; task_row public.tasks;
  multiplier numeric; organization_timezone text; completion_time timestamptz; result_score numeric;
begin
  select task.* into task_row from public.tasks task join public.student_tasks assignment on assignment.task_id=task.id where assignment.id=p_id for update of task;
  if task_row.id is null or not public.teacher_owns_task(task_row.id) then raise exception using errcode='42501',message='Task access denied'; end if;
  if task_row.status not in ('active','closed') then raise exception using errcode='22023',message='Task must be active or closed'; end if;
  select * into old_assignment from public.student_tasks where id=p_id for update;
  select late_multiplier into multiplier from public.score_policies where id=task_row.score_policy_id;
  select timezone into organization_timezone from public.organizations where id=public.current_organization_id();
  if p_status in ('completed_on_time','completed_late') then
    if p_completed_date is null or not isfinite(p_completed_date) or p_completed_date<task_row.start_date
      or (p_status='completed_on_time' and p_completed_date>task_row.due_date)
      or (p_status='completed_late' and p_completed_date<=task_row.due_date) then
      raise exception using errcode='22023',message='Completion date inconsistent with status';
    end if;
    completion_time:=p_completed_date::timestamp at time zone organization_timezone;
  elsif p_completed_date is not null then
    raise exception using errcode='22023',message='Completion date not allowed for incomplete task';
  end if;
  result_score:=public.calculate_task_score(task_row.maximum_score,p_status,multiplier,null);
  if old_assignment.status=p_status and old_assignment.completed_at is not distinct from completion_time then
    return coalesce(old_assignment.manual_score,old_assignment.calculated_score);
  end if;
  update public.student_tasks set status=p_status,completed_at=completion_time,calculated_score=result_score,recorded_by=auth.uid()
  where id=p_id returning * into new_assignment;
  insert into public.student_task_events(student_task_id,previous_status,new_status,note,changed_by)
  values(p_id,old_assignment.status,p_status,'Result recorded',auth.uid());
  perform public.insert_score_audit(old_assignment,new_assignment,'Result recorded: ' || p_status);
  return coalesce(new_assignment.manual_score,new_assignment.calculated_score);
end;
$$;

create function public.adjust_student_task_score(p_id uuid,p_manual_score numeric,p_reason text)
returns numeric language plpgsql security definer set search_path='' as $$
declare old_assignment public.student_tasks; new_assignment public.student_tasks; task_row public.tasks; multiplier numeric;
begin
  select task.* into task_row from public.tasks task join public.student_tasks assignment on assignment.task_id=task.id where assignment.id=p_id for update of task;
  if task_row.id is null or not public.teacher_owns_task(task_row.id) then raise exception using errcode='42501',message='Task access denied'; end if;
  if task_row.status not in ('active','closed') then raise exception using errcode='22023',message='Task must be active or closed'; end if;
  if p_reason is null or length(trim(p_reason)) not between 1 and 2000 then raise exception using errcode='22023',message='Manual adjustment reason required'; end if;
  select * into old_assignment from public.student_tasks where id=p_id for update;
  select late_multiplier into multiplier from public.score_policies where id=task_row.score_policy_id;
  perform public.calculate_task_score(task_row.maximum_score,old_assignment.status,multiplier,p_manual_score);
  if old_assignment.manual_score is not distinct from p_manual_score
    and (p_manual_score is null or old_assignment.manual_score_reason=trim(p_reason)) then
    return coalesce(old_assignment.manual_score,old_assignment.calculated_score);
  end if;
  update public.student_tasks set manual_score=p_manual_score,
    manual_score_reason=case when p_manual_score is null then null else trim(p_reason) end,recorded_by=auth.uid()
  where id=p_id returning * into new_assignment;
  perform public.insert_score_audit(old_assignment,new_assignment,trim(p_reason));
  return coalesce(new_assignment.manual_score,new_assignment.calculated_score);
end;
$$;

create function public.reject_audit_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception using errcode='42501',message='Audit records are append only';
end;
$$;
create trigger score_history_append_only before update or delete on public.score_history for each row execute function public.reject_audit_mutation();
create trigger student_task_events_append_only before update or delete on public.student_task_events for each row execute function public.reject_audit_mutation();

revoke all on public.score_history,public.student_task_events from anon,authenticated;
grant select on public.score_history,public.student_task_events to authenticated;
create policy score_history_teacher_select on public.score_history for select to authenticated using(exists(
  select 1 from public.student_tasks assignment where assignment.id=score_history.student_task_id and public.teacher_owns_task(assignment.task_id)));
create policy student_task_events_teacher_select on public.student_task_events for select to authenticated using(exists(
  select 1 from public.student_tasks assignment where assignment.id=student_task_events.student_task_id and public.teacher_owns_task(assignment.task_id)));
revoke execute on function public.calculate_task_score(numeric,text,numeric,numeric),public.configure_late_multiplier(numeric),
  public.insert_score_audit(public.student_tasks,public.student_tasks,text),public.record_student_task(uuid,text,date),
  public.adjust_student_task_score(uuid,numeric,text),public.reject_audit_mutation(),public.protect_score_policy() from public,anon,authenticated;
grant execute on function public.calculate_task_score(numeric,text,numeric,numeric),public.configure_late_multiplier(numeric),
  public.record_student_task(uuid,text,date),public.adjust_student_task_score(uuid,numeric,text) to authenticated;