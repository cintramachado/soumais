alter function public.class_score_report(uuid,uuid,uuid) rename to class_score_report_base;
revoke execute on function public.class_score_report_base(uuid,uuid,uuid) from public,anon,authenticated;
create function public.class_score_report(p_class_id uuid,p_period_id uuid default null,p_group_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare report jsonb; teachers_json jsonb; group_teachers_json jsonb;
begin
  report:=public.class_score_report_base(p_class_id,p_period_id,p_group_id);
  select coalesce(jsonb_agg(teacher.name order by teacher.name),'[]'::jsonb) into teachers_json
  from public.teacher_classes assignment join public.teachers teacher on teacher.id=assignment.teacher_id
  where assignment.class_id=p_class_id and teacher.active and teacher.organization_id=public.current_organization_id();
  select coalesce(jsonb_agg(jsonb_build_object('groupName',grp.name,'teacherName',teacher.name,'teacherActive',teacher.active) order by grp.name),'[]'::jsonb)
  into group_teachers_json from public.groups grp left join public.teachers teacher on teacher.id=grp.responsible_teacher_id
  where grp.class_id=p_class_id and (p_group_id is null or grp.id=p_group_id);
  return report || jsonb_build_object('teachers',teachers_json,'groupTeachers',group_teachers_json);
end;
$$;
revoke execute on function public.class_score_report(uuid,uuid,uuid) from public,anon;
grant execute on function public.class_score_report(uuid,uuid,uuid) to authenticated;