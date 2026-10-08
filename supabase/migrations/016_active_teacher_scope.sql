create or replace function public.organization_has_teacher_access(target_organization_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select target_organization_id=public.current_organization_id() and public.current_teacher_id() is not null
$$;