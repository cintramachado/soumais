create function public.attach_teacher_account(p_teacher_id uuid,p_email text)
returns void language plpgsql security definer set search_path='' as $$
declare teacher_row public.teachers; target_profile_id uuid; organization_id_value uuid;
begin
  if not public.is_active_teacher() then
    raise exception using errcode='42501',message='Teacher membership required';
  end if;

  organization_id_value:=public.current_organization_id();
  select * into teacher_row from public.teachers
  where id=p_teacher_id and organization_id=organization_id_value for update;
  if teacher_row.id is null or not teacher_row.active then
    raise exception using errcode='42501',message='Active teacher registry required';
  end if;
  if lower(teacher_row.email)<>lower(trim(p_email)) then
    raise exception using errcode='22023',message='Teacher email does not match registry';
  end if;

  select profile.id into target_profile_id
  from public.profiles profile
  join public.organization_memberships membership on membership.profile_id=profile.id
  where lower(profile.email)=lower(trim(p_email)) and profile.role='teacher' and profile.active
    and membership.role='teacher' and membership.active and membership.organization_id=organization_id_value;
  if target_profile_id is null then
    raise exception using errcode='22023',message='Provisioned teacher account required';
  end if;
  if teacher_row.profile_id is not null and teacher_row.profile_id<>target_profile_id then
    raise exception using errcode='22023',message='Teacher account already attached';
  end if;
  if exists(select 1 from public.teachers where profile_id=target_profile_id and id<>p_teacher_id) then
    raise exception using errcode='23505',message='Teacher account already in use';
  end if;

  update public.teachers set profile_id=target_profile_id where id=p_teacher_id;
end;
$$;

revoke execute on function public.attach_teacher_account(uuid,text) from public,anon;
grant execute on function public.attach_teacher_account(uuid,text) to authenticated;