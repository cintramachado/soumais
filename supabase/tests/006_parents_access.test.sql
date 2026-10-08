begin;
select plan(26);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
values
 ('60000000-0000-4000-8000-000000000001','teacher.parents@test.invalid','{"role":"teacher"}','{"full_name":"Teacher"}'),
 ('60000000-0000-4000-8000-000000000002','parent@test.invalid','{"role":"parent"}','{"full_name":"Parent"}'),
 ('60000000-0000-4000-8000-000000000003','student@test.invalid','{"role":"student"}','{"full_name":"Linked Student"}'),
 ('60000000-0000-4000-8000-000000000004','teacher.link@test.invalid','{"role":"teacher"}','{"full_name":"Linked Teacher"}');
update public.teachers set profile_id=null where email='teacher.link@test.invalid';
insert into public.school_years(id,organization_id,year,start_date,end_date)
select '61000000-0000-4000-8000-000000000001',id,2096,'2096-01-01','2096-12-31' from public.organizations where slug='soulmais';
insert into public.classes(id,name,school_year_id) values ('62000000-0000-4000-8000-000000000001','Parent Test','61000000-0000-4000-8000-000000000001');
insert into public.teacher_classes(teacher_id,class_id)
select id,'62000000-0000-4000-8000-000000000001' from public.teachers where profile_id='60000000-0000-4000-8000-000000000001';
insert into public.students(id,name,birth_date) values
 ('63000000-0000-4000-8000-000000000001','Linked Student','2012-01-01'),
 ('63000000-0000-4000-8000-000000000002','Unlinked Student','2013-01-01'),
 ('63000000-0000-4000-8000-000000000003','Outside Class Student','2013-01-01');
insert into public.classes(id,name,school_year_id) values ('62000000-0000-4000-8000-000000000002','Outside Parent Test','61000000-0000-4000-8000-000000000001');
insert into public.student_enrollments(student_id,class_id,school_year_id)
values ('63000000-0000-4000-8000-000000000003','62000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000001');
insert into public.student_enrollments(student_id,class_id,school_year_id)
select id,'62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001' from public.students where id in ('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000002');
insert into public.periods(id,school_year_id,name,start_date,end_date)
values ('67000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','Parent Test Period','2096-01-01','2096-12-31');
insert into public.task_types(id,organization_id,name,default_score)
select '68000000-0000-4000-8000-000000000001',id,'Parent Test Task Type',10 from public.organizations where slug='soulmais';
insert into public.score_policies(id,organization_id,school_year_id,name,late_multiplier)
select '69000000-0000-4000-8000-000000000001',id,'61000000-0000-4000-8000-000000000001','Parent Test Policy',0.5 from public.organizations where slug='soulmais';
insert into public.tasks(id,title,task_type_id,period_id,teacher_id,score_policy_id,start_date,due_date,maximum_score,status,activated_at,created_by)
select '6a000000-0000-4000-8000-000000000001','Parent Test Assignment','68000000-0000-4000-8000-000000000001',
	'67000000-0000-4000-8000-000000000001',teacher.id,'69000000-0000-4000-8000-000000000001',
	'2096-02-01','2096-02-10',10,'active','2096-02-01','60000000-0000-4000-8000-000000000001'
from public.teachers teacher where teacher.profile_id='60000000-0000-4000-8000-000000000001';
insert into public.student_tasks(id,student_id,task_id,status,completed_at,calculated_score)
values ('6b000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000001',
	'6a000000-0000-4000-8000-000000000001','completed_on_time','2096-02-05 12:00:00+00',8.5);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001"}',true);
select lives_ok($$select public.save_parent('Test Parent')$$,'teacher creates parent');
select lives_ok($$select public.attach_teacher_account((select id from public.teachers where email='teacher.link@test.invalid'),'teacher.link@test.invalid')$$,'teacher links a provisioned teacher account');
select is((select profile_id from public.teachers where email='teacher.link@test.invalid'),'60000000-0000-4000-8000-000000000004'::uuid,'teacher login linked to registry');
select lives_ok($$select public.save_parent_contact('Test Parent',' PARENT@Test.Invalid ',null,(select id from public.parents where name='Test Parent'))$$,'parent contact email saved');
select is((select email from public.parents where name='Test Parent'),'parent@test.invalid','parent email normalized');
select lives_ok($$select public.update_student_contact('63000000-0000-4000-8000-000000000001','Linked Student','2012-01-01',' Student@Test.Invalid ')$$,'student contact email saved');
select throws_ok($$select public.update_student_contact('63000000-0000-4000-8000-000000000001','Linked Student','2012-01-01','invalid')$$,'23514',null,'invalid contact email rejected by database');
select lives_ok($$select public.attach_student_account('63000000-0000-4000-8000-000000000001','student@test.invalid')$$,'teacher links provisioned student account');
select is((select profile_id from public.students where id='63000000-0000-4000-8000-000000000001'),'60000000-0000-4000-8000-000000000003'::uuid,'student login linked to school record');
select lives_ok($$select public.set_parent_student((select id from public.parents where name='Test Parent'),'63000000-0000-4000-8000-000000000001','mae')$$,'teacher links assigned student');
select throws_ok($$select public.set_parent_student((select id from public.parents where name='Test Parent'),'63000000-0000-4000-8000-000000000003','mae')$$,'42501','Student or parent access denied','teacher cannot link student from another class');
select lives_ok($$select public.attach_parent_account((select id from public.parents where name='Test Parent'),'parent@test.invalid')$$,'teacher attaches provisioned account');
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000002"}',true);
select is((select count(*)::integer from public.students),1,'parent reads only linked student');
select is((select count(*)::integer from public.student_enrollments),1,'parent reads only linked student enrollment');
select is((select count(*)::integer from public.parent_students),1,'parent reads only own link');
select is((public.parent_student_dashboard('63000000-0000-4000-8000-000000000001')->'summary'->>'totalScore')::numeric,8.5,'parent reads linked student score');
select is((public.parent_student_dashboard('63000000-0000-4000-8000-000000000001')->'summary'->>'completedCount')::integer,1,'parent reads linked student completion count');
select is(jsonb_array_length(public.parent_student_dashboard('63000000-0000-4000-8000-000000000001')->'tasks'),1,'parent reads linked student task details');
select throws_ok($$select public.parent_student_dashboard('63000000-0000-4000-8000-000000000002')$$,'42501','Parent student dashboard access denied','parent cannot read an unlinked student dashboard');
select is((select count(*)::integer from public.tasks),0,'parent cannot query task table directly');
select throws_ok($$select public.save_parent('Unauthorized')$$,'42501','Teacher required','parent cannot create records');
select throws_ok($$select public.update_student_contact('63000000-0000-4000-8000-000000000001','Linked Student','2012-01-01','attack@test.invalid')$$,'42501','Student access denied','parent cannot edit student contact');
select throws_ok($$select public.attach_student_account('63000000-0000-4000-8000-000000000002','student@test.invalid')$$,'42501','Student access denied','parent cannot link a student login');
select throws_ok($$select public.set_parent_student((select id from public.parents where name='Test Parent'),'63000000-0000-4000-8000-000000000002','mae')$$,'42501','Student or parent access denied','parent cannot create links');
with changed as (update public.students set name='Hacked' where id='63000000-0000-4000-8000-000000000001' returning id)
select is((select count(*)::integer from changed),0,'parent cannot update student');
reset role;
update public.parents set active=false where name='Test Parent';
set local role authenticated;
select is((select count(*)::integer from public.students),0,'inactive parent loses access');
select * from finish();
rollback;