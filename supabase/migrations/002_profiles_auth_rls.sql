create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
begin
  assigned_role := new.raw_app_meta_data ->> 'role';

  if assigned_role is null or assigned_role not in ('teacher', 'student', 'parent') then
    raise exception 'A trusted app_metadata role is required to create a profile';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    assigned_role::public.app_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_student_group_class() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.parents enable row level security;
alter table public.school_years enable row level security;
alter table public.classes enable row level security;
alter table public.teacher_classes enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.groups enable row level security;
alter table public.student_groups enable row level security;
alter table public.parent_students enable row level security;
alter table public.periods enable row level security;
alter table public.task_types enable row level security;
alter table public.score_policies enable row level security;
alter table public.tasks enable row level security;
alter table public.task_targets enable row level security;
alter table public.student_tasks enable row level security;
alter table public.score_history enable row level security;
alter table public.student_task_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;

create policy profiles_select_self
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));