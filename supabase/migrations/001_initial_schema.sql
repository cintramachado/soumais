create type public.app_role as enum ('teacher', 'student', 'parent');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  birth_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique check (year between 1900 and 2200),
  start_date date not null,
  end_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_year_id, name),
  unique (id, school_year_id)
);

create table public.teacher_classes (
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (teacher_id, class_id)
);

create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  class_id uuid not null,
  school_year_id uuid not null,
  active boolean not null default true,
  enrolled_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= enrolled_at),
  unique (student_id, school_year_id),
  foreign key (class_id, school_year_id)
    references public.classes (id, school_year_id) on delete restrict
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name),
  unique (id, class_id)
);

create table public.student_groups (
  enrollment_id uuid not null references public.student_enrollments (id) on delete restrict,
  group_id uuid not null references public.groups (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (enrollment_id, group_id)
);

create table public.parent_students (
  parent_id uuid not null references public.parents (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete restrict,
  relationship_type text not null check (length(trim(relationship_type)) > 0),
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  start_date date not null,
  end_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (school_year_id, name),
  unique (id, school_year_id)
);

create table public.task_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  description text,
  default_score numeric(10, 2) not null default 0 check (default_score >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.score_policies (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid references public.school_years (id) on delete restrict,
  late_multiplier numeric(5, 4) not null default 0.5
    check (late_multiplier between 0 and 1),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create unique index score_policies_global_name_idx
  on public.score_policies (name) where school_year_id is null;
create unique index score_policies_year_name_idx
  on public.score_policies (school_year_id, name) where school_year_id is not null;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  task_type_id uuid not null references public.task_types (id) on delete restrict,
  period_id uuid not null references public.periods (id) on delete restrict,
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  score_policy_id uuid not null references public.score_policies (id) on delete restrict,
  start_date date not null,
  due_date date not null,
  maximum_score numeric(10, 2) not null check (maximum_score >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'closed', 'cancelled')),
  activated_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date >= start_date),
  check (status <> 'draft' or activated_at is null)
);

create table public.task_targets (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete restrict,
  class_id uuid references public.classes (id) on delete restrict,
  group_id uuid references public.groups (id) on delete restrict,
  student_id uuid references public.students (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (num_nonnulls(class_id, group_id, student_id) = 1)
);

create unique index task_targets_class_idx
  on public.task_targets (task_id, class_id) where class_id is not null;
create unique index task_targets_group_idx
  on public.task_targets (task_id, group_id) where group_id is not null;
create unique index task_targets_student_idx
  on public.task_targets (task_id, student_id) where student_id is not null;

create table public.student_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  task_id uuid not null references public.tasks (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'completed_on_time', 'completed_late', 'not_completed')),
  completed_at timestamptz,
  calculated_score numeric(10, 2) not null default 0 check (calculated_score >= 0),
  manual_score numeric(10, 2) check (manual_score >= 0),
  manual_score_reason text,
  recorded_by uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, student_id),
  check (
    (status in ('completed_on_time', 'completed_late') and completed_at is not null)
    or (status in ('pending', 'not_completed') and completed_at is null)
  ),
  check (
    (manual_score is null and manual_score_reason is null)
    or (manual_score is not null and length(trim(manual_score_reason)) > 0)
  )
);

create table public.score_history (
  id uuid primary key default gen_random_uuid(),
  student_task_id uuid not null references public.student_tasks (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete restrict,
  previous_score numeric(10, 2),
  new_score numeric(10, 2) not null check (new_score >= 0),
  reason text not null check (length(trim(reason)) > 0),
  changed_by uuid not null references public.profiles (id) on delete restrict,
  changed_at timestamptz not null default now()
);

create table public.student_task_events (
  id uuid primary key default gen_random_uuid(),
  student_task_id uuid not null references public.student_tasks (id) on delete restrict,
  previous_status text,
  new_status text not null
    check (new_status in ('pending', 'completed_on_time', 'completed_late', 'not_completed')),
  note text,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  changed_at timestamptz not null default now()
);

create index teacher_classes_class_id_idx on public.teacher_classes (class_id);
create index student_enrollments_class_id_idx on public.student_enrollments (class_id);
create index student_groups_group_id_idx on public.student_groups (group_id);
create index parent_students_student_id_idx on public.parent_students (student_id);
create index periods_school_year_id_idx on public.periods (school_year_id);
create index tasks_teacher_id_idx on public.tasks (teacher_id);
create index tasks_period_id_idx on public.tasks (period_id);
create index tasks_due_date_idx on public.tasks (due_date);
create index tasks_status_idx on public.tasks (status);
create index task_targets_class_id_idx on public.task_targets (class_id);
create index task_targets_group_id_idx on public.task_targets (group_id);
create index task_targets_student_id_idx on public.task_targets (student_id);
create index student_tasks_student_id_idx on public.student_tasks (student_id);
create index student_tasks_task_id_idx on public.student_tasks (task_id);
create index student_tasks_status_idx on public.student_tasks (status);
create index score_history_student_id_idx on public.score_history (student_id, changed_at desc);
create index student_task_events_task_id_idx
  on public.student_task_events (student_task_id, changed_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'teachers', 'students', 'parents', 'school_years', 'classes',
    'student_enrollments', 'groups', 'periods', 'task_types', 'tasks', 'student_tasks'
  ] loop
    execute format(
      'create trigger %I before update on public.%I '
      'for each row execute function public.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end;
$$;

create function public.validate_student_group_class()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  enrollment_class_id uuid;
  group_class_id uuid;
begin
  select class_id into enrollment_class_id
  from public.student_enrollments
  where id = new.enrollment_id;

  select class_id into group_class_id
  from public.groups
  where id = new.group_id;

  if enrollment_class_id is distinct from group_class_id then
    raise exception 'Student group membership must match the enrollment class';
  end if;

  return new;
end;
$$;

create trigger validate_student_group_class
before insert or update on public.student_groups
for each row execute function public.validate_student_group_class();