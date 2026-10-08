begin;
select plan(15);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 ('a0000000-0000-4000-8000-000000000001','report.teacher@test.invalid','{"role":"teacher"}','{"full_name":"Professora Ana"}'),
 ('a0000000-0000-4000-8000-000000000002','report.colleague@test.invalid','{"role":"teacher"}','{"full_name":"Professor João"}'),
 ('a0000000-0000-4000-8000-000000000003','report.outside@test.invalid','{"role":"teacher"}','{"full_name":"Outside"}');
insert into public.school_years(id,organization_id,year,start_date,end_date)
select 'a1000000-0000-4000-8000-000000000001',id,2092,'2092-01-01','2092-12-31' from public.organizations where slug='soulmais';
insert into public.classes(id,school_year_id,name) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Relatório Teste'),
 ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','Outside Report');
insert into public.teacher_classes(teacher_id,class_id)
select id,'a2000000-0000-4000-8000-000000000001' from public.teachers where profile_id in ('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002');
insert into public.periods(id,school_year_id,name,start_date,end_date) values ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Report Period','2092-01-01','2092-12-31');
insert into public.students(id,name,birth_date) values
 ('a4000000-0000-4000-8000-000000000001','Ana','2012-01-01'),
 ('a4000000-0000-4000-8000-000000000002','João','2012-01-01');
insert into public.student_enrollments(id,student_id,class_id,school_year_id) values
 ('a5000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001'),
 ('a5000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001');
insert into public.groups(id,class_id,name) values ('a6000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Grupo A');
update public.groups set responsible_teacher_id=(select id from public.teachers where profile_id='a0000000-0000-4000-8000-000000000002') where id='a6000000-0000-4000-8000-000000000001';
insert into public.student_groups(enrollment_id,group_id) values ('a5000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001');
insert into public.groups(id,class_id,name) values ('a6000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','Grupo B');
insert into public.student_groups(enrollment_id,group_id) values ('a5000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000002');
insert into public.task_types(id,organization_id,name,default_score)
select 'a7000000-0000-4000-8000-000000000001',id,'Report Type',100 from public.organizations where slug='soulmais';
insert into public.score_policies(id,organization_id,name,late_multiplier)
select 'a8000000-0000-4000-8000-000000000001',id,'Report Policy',0.5 from public.organizations where slug='soulmais';
insert into public.tasks(id,title,task_type_id,period_id,teacher_id,score_policy_id,start_date,due_date,maximum_score,created_by,status)
select 'a9000000-0000-4000-8000-000000000001','Report Task','a7000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',id,'a8000000-0000-4000-8000-000000000001','2092-01-01','2092-03-01',100,profile_id,'active'
from public.teachers where profile_id='a0000000-0000-4000-8000-000000000002';
insert into public.tasks(id,title,task_type_id,period_id,teacher_id,score_policy_id,start_date,due_date,maximum_score,created_by,status)
select 'a9000000-0000-4000-8000-000000000002','Cancelled Report Task','a7000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',id,'a8000000-0000-4000-8000-000000000001','2092-01-01','2092-03-01',100,profile_id,'cancelled'
from public.teachers where profile_id='a0000000-0000-4000-8000-000000000002';
insert into public.student_tasks(student_id,task_id,calculated_score,manual_score,manual_score_reason) values
 ('a4000000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000001',50,75,'Extra'),
 ('a4000000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000002',100,null,null);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001"}',true);
select set_config('test.report',public.class_score_report('a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001')::text,true);
select is((current_setting('test.report')::jsonb->>'className'),'Relatório Teste','class identified');
select is(jsonb_array_length(current_setting('test.report')::jsonb->'teachers'),2,'all responsible teachers identified');
select is((current_setting('test.report')::jsonb->'groupTeachers'->0->>'teacherName'),'Professor João','group responsible teacher included');
select throws_ok($$select public.class_score_report_base('a2000000-0000-4000-8000-000000000001')$$,'42501',null,'private report helper not callable directly');
select is(jsonb_array_length(current_setting('test.report')::jsonb->'students'),2,'all enrolled students included');
select is((current_setting('test.report')::jsonb->'students'->0->>'score')::numeric,75::numeric,'manual points from colleague included; cancelled excluded');
select is((current_setting('test.report')::jsonb->'students'->1->>'score')::numeric,0::numeric,'student without assignments has zero');
select is(jsonb_array_length(public.class_score_report('a2000000-0000-4000-8000-000000000001',null,'a6000000-0000-4000-8000-000000000001')->'students'),1,'group filter works');
select is((public.teacher_dashboard_metrics('a2000000-0000-4000-8000-000000000001')->>'students')::integer,2,'dashboard counts students without duplicating groups');
select is((public.teacher_dashboard_metrics('a2000000-0000-4000-8000-000000000001')->>'openTasks')::integer,1,'dashboard counts open tasks from responsible colleagues');
select is((public.teacher_dashboard_metrics('a2000000-0000-4000-8000-000000000001')->>'totalScore')::numeric,75::numeric,'dashboard manual points exclude cancelled tasks');
select is((public.teacher_dashboard_metrics('a2000000-0000-4000-8000-000000000001')->>'achievementPercentage')::numeric,75::numeric,'dashboard percentage computed from assignments');
select throws_ok($$select public.teacher_dashboard_metrics('a2000000-0000-4000-8000-000000000002')$$,'42501','Dashboard class access denied','dashboard rejects unassigned class');
select throws_ok($$select public.class_score_report('a2000000-0000-4000-8000-000000000002')$$,'42501','Class report access denied','other class denied');
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000003"}',true);
select throws_ok($$select public.class_score_report('a2000000-0000-4000-8000-000000000001')$$,'42501','Class report access denied','unassigned teacher denied');
select * from finish();
rollback;