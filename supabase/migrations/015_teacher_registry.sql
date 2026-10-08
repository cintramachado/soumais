alter table public.teachers
  alter column profile_id drop not null,
  add column name text,
  add column email text,
  add column phone text,
  add column organization_id uuid references public.organizations(id) on delete restrict;
update public.teachers teacher set
  name=(select full_name from public.profiles where id=teacher.profile_id),
  email=(select email from public.profiles where id=teacher.profile_id),
  organization_id=coalesce((select organization_id from public.organization_memberships where profile_id=teacher.profile_id order by active desc,created_at limit 1),(select id from public.organizations where slug='soulmais'));
alter table public.teachers alter column name set not null,alter column email set not null,alter column organization_id set not null;
alter table public.teachers add constraint teachers_name_present check(length(trim(name))>0);
create unique index teachers_org_email_idx on public.teachers(organization_id,lower(email));

create function public.fill_teacher_registry()
returns trigger language plpgsql security definer set search_path='' as $$
declare pending_id uuid;
begin
  if new.profile_id is not null then
    select coalesce(new.name,profile.full_name),coalesce(new.email,profile.email),
      coalesce(new.organization_id,membership.organization_id)
    into new.name,new.email,new.organization_id
    from public.profiles profile join public.organization_memberships membership on membership.profile_id=profile.id
    where profile.id=new.profile_id and membership.role='teacher' order by membership.active desc,membership.created_at limit 1;
    select id into pending_id from public.teachers
    where organization_id=new.organization_id and lower(email)=lower(new.email) and profile_id is null for update;
    if pending_id is not null then
      update public.teachers set profile_id=new.profile_id where id=pending_id;
      return null;
    end if;
  end if;
  return new;
end;
$$;
create trigger fill_teacher_registry before insert on public.teachers for each row execute function public.fill_teacher_registry();

create or replace function public.current_teacher_id()
returns uuid language sql stable security definer set search_path='' as $$
  select teacher.id from public.teachers teacher
  join public.profiles profile on profile.id=teacher.profile_id
  join public.organization_memberships membership on membership.profile_id=profile.id
  where profile.id=auth.uid() and profile.role='teacher' and profile.active and teacher.active
    and membership.role='teacher' and membership.active
    and membership.organization_id=public.current_organization_id()
    and teacher.organization_id=membership.organization_id limit 1
$$;

create function public.save_teacher(p_name text,p_email text,p_phone text default null,p_id uuid default null,p_active boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare teacher_row public.teachers; result_id uuid;
begin
  if not public.is_active_teacher() then raise exception using errcode='42501',message='Teacher membership required'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 120 or p_email is null
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_email)>254
    or length(coalesce(p_phone,''))>30 then
    raise exception using errcode='22023',message='Invalid teacher registry data';
  end if;
  if p_id is null then
    insert into public.teachers(name,email,phone,organization_id,active)
    values(trim(p_name),lower(trim(p_email)),nullif(trim(p_phone),''),public.current_organization_id(),p_active)
    returning id into result_id;
  else
    select * into teacher_row from public.teachers where id=p_id and organization_id=public.current_organization_id() for update;
    if teacher_row.id is null then raise exception using errcode='42501',message='Teacher outside organization'; end if;
    update public.teachers set name=trim(p_name),email=lower(trim(p_email)),phone=nullif(trim(p_phone),''),active=p_active where id=p_id;
    if teacher_row.profile_id is not null then
      update public.profiles set full_name=trim(p_name),active=p_active where id=teacher_row.profile_id;
    end if;
    result_id:=p_id;
  end if;
  return result_id;
end;
$$;
revoke all on public.teachers from anon,authenticated;
grant select on public.teachers to authenticated;
create policy teachers_organization_select on public.teachers for select to authenticated using(public.organization_has_teacher_access(organization_id));
revoke execute on function public.fill_teacher_registry() from public,anon,authenticated;
revoke execute on function public.save_teacher(text,text,text,uuid,boolean) from public,anon;
grant execute on function public.save_teacher(text,text,text,uuid,boolean) to authenticated;