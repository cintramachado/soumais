alter table public.students add column email text;
alter table public.parents add column email text;
update public.students student set email=lower(profile.email) from public.profiles profile where profile.id=student.profile_id;
update public.parents parent set email=lower(profile.email) from public.profiles profile where profile.id=parent.profile_id;
alter table public.students add constraint students_email_valid check(email is null or (length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
alter table public.parents add constraint parents_email_valid check(email is null or (length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));

create function public.save_parent_contact(p_name text,p_email text default null,p_phone text default null,p_id uuid default null,p_active boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
  result_id:=public.save_parent(p_name,p_phone,p_id,p_active);
  update public.parents set email=nullif(lower(trim(p_email)),'') where id=result_id;
  return result_id;
end;
$$;

create function public.create_student_contact(p_name text,p_birth_date date,p_class_id uuid,p_group_id uuid default null,p_email text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
  result_id:=public.create_student_with_enrollment(p_name,p_birth_date,p_class_id,p_group_id);
  update public.students set email=nullif(lower(trim(p_email)),'') where id=result_id;
  return result_id;
end;
$$;

create function public.update_student_contact(p_id uuid,p_name text,p_birth_date date,p_email text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_active_teacher() or not exists(
    select 1 from public.student_enrollments enrollment where enrollment.student_id=p_id and public.teacher_has_class_access(enrollment.class_id)
  ) then raise exception using errcode='42501',message='Student access denied'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 120 then
    raise exception using errcode='22023',message='Invalid student name';
  end if;
  update public.students set name=trim(p_name),birth_date=p_birth_date,email=nullif(lower(trim(p_email)),'') where id=p_id;
end;
$$;

revoke execute on function public.save_parent_contact(text,text,text,uuid,boolean),public.create_student_contact(text,date,uuid,uuid,text),public.update_student_contact(uuid,text,date,text) from public,anon;
grant execute on function public.save_parent_contact(text,text,text,uuid,boolean),public.create_student_contact(text,date,uuid,uuid,text),public.update_student_contact(uuid,text,date,text) to authenticated;