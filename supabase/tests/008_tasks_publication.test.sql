begin;
select plan(21);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 ('80000000-0000-4000-8000-000000000001','tasks.teacher@test.invalid','{"role":"teacher"}','{"full_name":"Teacher"}'),
 ('80000000-0000-4000-8000-000000000002','tasks.other@test.invalid','{"role":"teacher"}','{"full_name":"Other"}');
insert into public.school_years(id,organization_id,year,start_date,end_date)
select '81000000-0000-4000-8000-000000000001',id,2095,'2095-01-01','2095-12-31' from public.organizations where slug='soulmais';
insert into public.classes(id,school_year_id,name) values
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','Tasks Test'),
 ('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000001','Tasks Other');
insert into public.teacher_classes(teacher_id,class_id)
select id,'82000000-0000-4000-8000-000000000001' from public.teachers where profile_id='80000000-0000-4000-8000-000000000001';
insert into public.periods(id,school_year_id,name,start_date,end_date) values ('83000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','Tasks Period','2095-01-01','2095-12-31');
insert into public.task_types(id,organization_id,name,default_score)
select '84000000-0000-4000-8000-000000000001',id,'Tasks Type',100 from public.organizations where slug='soulmais';
insert into public.students(id,name,birth_date) values
 ('85000000-0000-4000-8000-000000000001','Task Student One','2012-01-01'),
 ('85000000-0000-4000-8000-000000000002','Task Student Two','2012-01-01');
insert into public.student_enrollments(id,student_id,class_id,school_year_id) values
 ('86000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001'),
 ('86000000-0000-4000-8000-000000000002','85000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001');
insert into public.groups(id,class_id,name) values ('87000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','Tasks Group');
insert into public.groups(id,class_id,name) values ('87000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','Tasks Empty Group');
insert into public.student_groups(enrollment_id,group_id) values ('86000000-0000-4000-8000-000000000001','87000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001"}',true);
select set_config('test.task_payload','{"title":"Task Test","taskTypeId":"84000000-0000-4000-8000-000000000001","periodId":"83000000-0000-4000-8000-000000000001","startDate":"2095-01-01","dueDate":"2095-03-01","maximumScore":100,"classIds":["82000000-0000-4000-8000-000000000001"],"groupIds":["87000000-0000-4000-8000-000000000001"],"studentIds":["85000000-0000-4000-8000-000000000001"]}',true);
select set_config('test.task_id',public.save_task_draft(current_setting('test.task_payload')::jsonb)::text,true);
select throws_ok($$select public.save_task_draft(current_setting('test.task_payload')::jsonb || '{"classIds":["82000000-0000-4000-8000-000000000002"]}'::jsonb)$$,'42501','Destination outside assigned classes or school year','unauthorized destination rejected');
select throws_ok($$select public.save_task_draft(current_setting('test.task_payload')::jsonb || '{"dueDate":"2096-01-01"}'::jsonb)$$,'22023','Task dates outside active period','period date boundary enforced');
select throws_ok($$select public.save_task_draft(current_setting('test.task_payload')::jsonb || '{"classIds":[],"groupIds":[],"studentIds":[]}'::jsonb)$$,'22023','At least one destination required','empty destinations rejected');
select throws_ok($$select public.save_task_type('NaN Type','', 'NaN'::numeric)$$,'23514',null,'nonfinite score rejected by database');
select is((select status from public.tasks where id=current_setting('test.task_id')::uuid),'draft','saved as draft');
select is((select count(*)::integer from public.student_tasks where task_id=current_setting('test.task_id')::uuid),0,'draft has no assignments');
select is(public.publish_task(current_setting('test.task_id')::uuid),2,'class/group/student overlap deduplicated');
select is(public.publish_task(current_setting('test.task_id')::uuid),2,'publish is idempotent');
select is((select count(*)::integer from public.list_teacher_tasks(p_group_id=>'87000000-0000-4000-8000-000000000001')),1,'group filter includes class and individual destinations');
select is((select count(*)::integer from public.student_tasks where task_id=current_setting('test.task_id')::uuid),2,'exactly two assignments');
select throws_ok($$select public.save_task_draft(current_setting('test.task_payload')::jsonb,current_setting('test.task_id')::uuid)$$,'22023','Only drafts can be edited','published task cannot be rewritten');
select throws_ok($$select public.validate_task_destination('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002',null,null)$$,'42501',null,'validation helper not directly callable by client');
reset role;
select is((select count(*)::integer from public.student_task_events where student_task_id in(select id from public.student_tasks where task_id=current_setting('test.task_id')::uuid)),2,'publication audit not duplicated');
insert into public.students(id,name,birth_date) values ('85000000-0000-4000-8000-000000000003','New Student','2012-01-01');
insert into public.student_enrollments(student_id,class_id,school_year_id) values ('85000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(public.publish_task(current_setting('test.task_id')::uuid),2,'new enrollment does not change published snapshot');
select set_config('test.empty_task_id',public.save_task_draft(current_setting('test.task_payload')::jsonb || '{"title":"Empty Task","classIds":[],"groupIds":["87000000-0000-4000-8000-000000000002"],"studentIds":[]}'::jsonb)::text,true);
select throws_ok($$select public.publish_task(current_setting('test.empty_task_id')::uuid)$$,'22023','No active students in destinations','empty group publication rejected');
select is((select status from public.tasks where id=current_setting('test.empty_task_id')::uuid),'draft','failed publication remains draft');
select is((select count(*)::integer from public.student_tasks where task_id=current_setting('test.empty_task_id')::uuid),0,'failed publication has no partial assignments');
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000002"}',true);
select is((select count(*)::integer from public.tasks where id=current_setting('test.task_id')::uuid),0,'other teacher cannot read task');
select throws_ok($$select public.publish_task(current_setting('test.task_id')::uuid)$$,'42501','Task access denied','other teacher cannot publish task');
reset role;
delete from public.teacher_classes where class_id='82000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001"}',true);
select is((select count(*)::integer from public.student_tasks where task_id=current_setting('test.task_id')::uuid),0,'revoked teacher loses assignment access');
select is((select count(*)::integer from public.list_teacher_tasks()),0,'revoked teacher loses task list access');
select * from finish();
rollback;