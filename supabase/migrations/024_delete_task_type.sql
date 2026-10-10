create function public.delete_task_type(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_active_teacher() then raise exception using errcode='42501',message='Teacher required'; end if;
  if not exists(select 1 from public.task_types where id=p_id and organization_id=public.current_organization_id()) then
    raise exception using errcode='42501',message='Task type access denied';
  end if;
  if exists(select 1 from public.tasks where task_type_id=p_id) then
    raise exception using errcode='23503',message='Task type in use by existing tasks';
  end if;
  delete from public.task_types where id=p_id and organization_id=public.current_organization_id();
end;
$$;

revoke execute on function public.delete_task_type(uuid) from public,anon,authenticated;
grant execute on function public.delete_task_type(uuid) to authenticated;
