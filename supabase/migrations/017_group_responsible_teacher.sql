alter table public.groups add column responsible_teacher_id uuid references public.teachers(id) on delete restrict;
alter table public.groups add constraint groups_teacher_class_fk
  foreign key(responsible_teacher_id,class_id) references public.teacher_classes(teacher_id,class_id) on delete restrict;

create function public.validate_group_responsible_teacher()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.responsible_teacher_id is not null and not exists (
    select 1 from public.teachers teacher join public.classes class on class.id=new.class_id
    join public.school_years year on year.id=class.school_year_id
    join public.teacher_classes assignment on assignment.teacher_id=teacher.id and assignment.class_id=class.id
    where teacher.id=new.responsible_teacher_id and teacher.active and teacher.organization_id=year.organization_id
  ) then raise exception using errcode='22023',message='Responsible teacher must be active and assigned to class'; end if;
  return new;
end;
$$;
create trigger validate_group_responsible_teacher before insert or update of responsible_teacher_id,class_id on public.groups
for each row execute function public.validate_group_responsible_teacher();
revoke execute on function public.validate_group_responsible_teacher() from public,anon,authenticated;

grant select on public.teacher_classes to authenticated;
create policy teacher_classes_assigned_select on public.teacher_classes for select to authenticated using(public.teacher_has_class_access(class_id));
create function public.set_teacher_class(p_teacher_id uuid,p_class_id uuid,p_remove boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.teacher_has_class_access(p_class_id) or not exists (
    select 1 from public.teachers where id=p_teacher_id and organization_id=public.current_organization_id()
      and (active or p_remove)
  ) then raise exception using errcode='42501',message='Teacher or class access denied'; end if;
  if p_remove then
    delete from public.teacher_classes where teacher_id=p_teacher_id and class_id=p_class_id;
  else
    insert into public.teacher_classes(teacher_id,class_id) values(p_teacher_id,p_class_id) on conflict do nothing;
  end if;
end;
$$;
revoke execute on function public.set_teacher_class(uuid,uuid,boolean) from public,anon;
grant execute on function public.set_teacher_class(uuid,uuid,boolean) to authenticated;