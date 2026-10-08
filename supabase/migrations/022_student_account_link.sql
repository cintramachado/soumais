create function public.attach_student_account(p_student_id uuid,p_email text)
returns void language plpgsql security definer set search_path='' as $$
declare student_email text; existing_profile_id uuid; target_profile_id uuid; organization_id_value uuid;
begin
  if not public.is_active_teacher() or not exists(
    select 1 from public.student_enrollments enrollment
    join public.classes class on class.id=enrollment.class_id and class.school_year_id=enrollment.school_year_id
    where enrollment.student_id=p_student_id and enrollment.active and class.active
      and public.teacher_has_class_access(class.id)
  ) then
    raise exception using errcode='42501',message='Student access denied';
  end if;

  select student.email,student.profile_id into student_email,existing_profile_id
  from public.students student where student.id=p_student_id and student.active for update;
  if student_email is null or lower(student_email)<>lower(trim(p_email)) then
    raise exception using errcode='22023',message='Student email does not match registry';
  end if;

  organization_id_value:=public.current_organization_id();
  select profile.id into target_profile_id
  from public.profiles profile
  join public.organization_memberships membership on membership.profile_id=profile.id
  where lower(profile.email)=lower(trim(p_email)) and profile.role='student' and profile.active
    and membership.role='student' and membership.active and membership.organization_id=organization_id_value;
  if target_profile_id is null then
    raise exception using errcode='22023',message='Provisioned student account required';
  end if;
  if existing_profile_id is not null and existing_profile_id<>target_profile_id then
    raise exception using errcode='22023',message='Student account already attached';
  end if;
  if exists(select 1 from public.students where profile_id=target_profile_id and id<>p_student_id) then
    raise exception using errcode='23505',message='Student account already in use';
  end if;

  update public.students set profile_id=target_profile_id where id=p_student_id;
end;
$$;

revoke execute on function public.attach_student_account(uuid,text) from public,anon;
grant execute on function public.attach_student_account(uuid,text) to authenticated;