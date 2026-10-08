create function public.parent_can_read_enrollment(target_enrollment_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.student_enrollments enrollment
    join public.school_years school_year on school_year.id = enrollment.school_year_id
    where enrollment.id = target_enrollment_id
      and school_year.organization_id = public.current_organization_id()
      and public.parent_can_read_student(enrollment.student_id)
  )
$$;
revoke execute on function public.parent_can_read_enrollment(uuid) from public, anon;
grant execute on function public.parent_can_read_enrollment(uuid) to authenticated;
drop policy enrollments_parent_select on public.student_enrollments;
create policy enrollments_parent_select on public.student_enrollments
for select to authenticated using (public.parent_can_read_enrollment(id));