begin;
select plan(30);
select is(public.calculate_task_score(100,'completed_on_time',0.5),100::numeric,'100 on time');
select is(public.calculate_task_score(100,'completed_late',0.5),50::numeric,'100 late');
select is(public.calculate_task_score(200,'completed_late',0.5),100::numeric,'200 late');
select is(public.calculate_task_score(100,'not_completed',0.5),0::numeric,'not completed');
select is(public.calculate_task_score(100,'completed_late',0.5,75),75::numeric,'manual precedence');
select is(public.calculate_task_score(100,'completed_on_time',0.5,0),0::numeric,'manual zero precedence');
select is(public.calculate_task_score(0.01,'completed_late',0.5),0.01::numeric,'round half up');
select throws_ok($$select public.calculate_task_score('NaN'::numeric,'completed_late',0.5)$$,'22023','Invalid score inputs','NaN rejected');
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 ('90000000-0000-4000-8000-000000000001','score.teacher@test.invalid','{"role":"teacher"}','{"full_name":"Teacher"}'),
 ('90000000-0000-4000-8000-000000000002','score.other@test.invalid','{"role":"teacher"}','{"full_name":"Other"}');
insert into public.school_years(id,organization_id,year,start_date,end_date)
select '91000000-0000-4000-8000-000000000001',id,2093,'2093-01-01','2093-12-31' from public.organizations where slug='soulmais';
insert into public.classes(id,school_year_id,name) values ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Score Test');
insert into public.teacher_classes(teacher_id,class_id)
select id,'92000000-0000-4000-8000-000000000001' from public.teachers where profile_id='90000000-0000-4000-8000-000000000001';
insert into public.periods(id,school_year_id,name,start_date,end_date) values ('93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Score Period','2093-01-01','2093-12-31');
insert into public.task_types(id,organization_id,name,default_score)
select '94000000-0000-4000-8000-000000000001',id,'Score Type',100 from public.organizations where slug='soulmais';
insert into public.students(id,name,birth_date) values
 ('95000000-0000-4000-8000-000000000001','Score Student','2012-01-01'),
 ('95000000-0000-4000-8000-000000000002','Pending Student','2012-01-01');
insert into public.student_enrollments(student_id,class_id,school_year_id)
select id,'92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001' from public.students where id in ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001"}',true);
select public.configure_late_multiplier(0.5);
select set_config('test.score_task',public.save_task_draft('{"title":"Score Test","description":"","taskTypeId":"94000000-0000-4000-8000-000000000001","periodId":"93000000-0000-4000-8000-000000000001","startDate":"2093-01-01","dueDate":"2093-03-01","maximumScore":100,"classIds":["92000000-0000-4000-8000-000000000001"]}')::text,true);
select public.publish_task(current_setting('test.score_task')::uuid);
select set_config('test.assignment',(select id::text from public.student_tasks where task_id=current_setting('test.score_task')::uuid and student_id='95000000-0000-4000-8000-000000000001'),true);
select is(public.record_student_task(current_setting('test.assignment')::uuid,'completed_on_time','2093-03-01'),100::numeric,'records on time result');
select is(public.record_student_task(current_setting('test.assignment')::uuid,'completed_on_time','2093-03-01'),100::numeric,'same result is idempotent');
select is((select count(*)::integer from public.score_history where student_task_id=current_setting('test.assignment')::uuid),1,'same result does not duplicate audit');
select throws_ok($$select public.record_student_task(current_setting('test.assignment')::uuid,'completed_late','2093-03-01')$$,'22023','Completion date inconsistent with status','late result needs late date');
select is(public.adjust_student_task_score(current_setting('test.assignment')::uuid,75,'Extra activity'),75::numeric,'manual adjustment');
select throws_ok($$select public.adjust_student_task_score(current_setting('test.assignment')::uuid,80,' ')$$,'22023','Manual adjustment reason required','manual reason required');
select throws_ok($$select public.adjust_student_task_score(current_setting('test.assignment')::uuid,101,'Above maximum')$$,'22023','Invalid manual score','manual score bounded by task maximum');
select is(public.record_student_task(current_setting('test.assignment')::uuid,'completed_late','2093-03-02'),75::numeric,'result change preserves manual override');
select is((select calculated_score from public.student_tasks where id=current_setting('test.assignment')::uuid),50::numeric,'late calculated score stored separately');
select is(public.adjust_student_task_score(current_setting('test.assignment')::uuid,null,'Remove override'),50::numeric,'removal restores calculated points');
select is((select count(*)::integer from public.score_history where student_task_id=current_setting('test.assignment')::uuid),4,'all changes recorded in history');
select is((select previous_score from public.score_history where student_task_id=current_setting('test.assignment')::uuid and reason='Remove override'),75::numeric,'previous score preserved');
select is((select total_score from public.score_summary(p_task_id=>current_setting('test.score_task')::uuid)),50::numeric,'total points aggregate');
select is((select achievement_percentage from public.score_summary(p_task_id=>current_setting('test.score_task')::uuid)),25::numeric,'achievement percentage');
select is((select pending_count::integer from public.score_summary(p_task_id=>current_setting('test.score_task')::uuid)),1,'pending count');
select public.configure_late_multiplier(0.25);
select is(public.record_student_task(current_setting('test.assignment')::uuid,'completed_late','2093-03-03'),50::numeric,'old task retains multiplier');
select public.change_task_state(current_setting('test.score_task')::uuid,'cancelled');
select is((select total_score from public.score_summary(p_task_id=>current_setting('test.score_task')::uuid)),0::numeric,'cancelled task excluded from totals');
select is((select count(*)::integer from public.score_history where student_task_id=current_setting('test.assignment')::uuid),5,'cancelled task preserves history');
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000002"}',true);
select throws_ok($$select public.adjust_student_task_score(current_setting('test.assignment')::uuid,1,'Attack')$$,'42501','Task access denied','other teacher cannot adjust');
select is((select count(*)::integer from public.score_history where student_task_id=current_setting('test.assignment')::uuid),0,'other teacher cannot read history');
reset role;
select throws_ok($$update public.score_history set reason='Changed' where student_task_id=current_setting('test.assignment')::uuid$$,'42501','Audit records are append only','history immutable');
select throws_ok($$update public.score_policies set late_multiplier=0.9 where id=(select score_policy_id from public.tasks where id=current_setting('test.score_task')::uuid)$$,'22023','Referenced score policies are immutable','referenced rule immutable');
select * from finish();
rollback;