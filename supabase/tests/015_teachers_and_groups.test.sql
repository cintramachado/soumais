begin;
select plan(12);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
values ('b0000000-0000-4000-8000-000000000001','teacher.registry.actor@test.invalid','{"role":"teacher"}','{"full_name":"Actor"}');
insert into public.school_years(id,organization_id,year,start_date,end_date)
select 'b1000000-0000-4000-8000-000000000001',id,2091,'2091-01-01','2091-12-31' from public.organizations where slug='soulmais';
insert into public.classes(id,school_year_id,name) values ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Teacher Registry Class');
insert into public.teacher_classes(teacher_id,class_id)
select id,'b2000000-0000-4000-8000-000000000001' from public.teachers where profile_id='b0000000-0000-4000-8000-000000000001';
insert into public.organizations(id,name,slug) values ('b8000000-0000-4000-8000-000000000001','Outside Registry','outside-registry');
insert into public.teachers(id,name,email,organization_id) values ('b9000000-0000-4000-8000-000000000001','Outside Teacher','outside.registry@test.invalid','b8000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000001"}',true);
select set_config('test.registry_teacher',public.save_teacher('Registered Teacher','new.registry.teacher@test.invalid')::text,true);
select is((select count(*)::integer from public.teachers where id='b9000000-0000-4000-8000-000000000001'),0,'other organization registry hidden');
select throws_ok($$select public.save_teacher('Attack','attack@test.invalid',null,'b9000000-0000-4000-8000-000000000001')$$,'42501','Teacher outside organization','cannot edit teacher outside organization');
select is((select profile_id from public.teachers where id=current_setting('test.registry_teacher')::uuid),null::uuid,'registry can exist before login');
select lives_ok($$select public.set_teacher_class(current_setting('test.registry_teacher')::uuid,'b2000000-0000-4000-8000-000000000001')$$,'link teacher to authorized class');
select lives_ok($$insert into public.groups(id,class_id,name,responsible_teacher_id) values ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Responsible Group',current_setting('test.registry_teacher')::uuid)$$,'assign teacher to group');
select throws_ok($$select public.set_teacher_class(current_setting('test.registry_teacher')::uuid,'b2000000-0000-4000-8000-000000000001',true)$$,'23503',null,'cannot remove class link while responsible for group');
select set_config('test.unassigned_teacher',public.save_teacher('Unassigned Teacher','unassigned.registry@test.invalid')::text,true);
select throws_ok($$update public.groups set responsible_teacher_id=current_setting('test.unassigned_teacher')::uuid where id='b3000000-0000-4000-8000-000000000001'$$,'22023','Responsible teacher must be active and assigned to class','unassigned teacher rejected');
reset role;
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
values ('b0000000-0000-4000-8000-000000000002','new.registry.teacher@test.invalid','{"role":"teacher"}','{"full_name":"New Teacher"}');
select is((select count(*)::integer from public.teachers where email='new.registry.teacher@test.invalid'),1,'Auth provisioning reuses existing registry');
select is((select profile_id from public.teachers where id=current_setting('test.registry_teacher')::uuid),'b0000000-0000-4000-8000-000000000002'::uuid,'existing registry linked to Auth');
set local role authenticated;
select public.save_teacher('Registered Teacher','new.registry.teacher@test.invalid',null,current_setting('test.registry_teacher')::uuid,false);
select throws_ok($$update public.groups set responsible_teacher_id=current_setting('test.registry_teacher')::uuid where id='b3000000-0000-4000-8000-000000000001'$$,'22023','Responsible teacher must be active and assigned to class','inactive responsible teacher rejected');
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000002"}',true);
select is(public.current_teacher_id(),null::uuid,'inactive teacher loses privileges');
select throws_ok($$select public.save_teacher('Forbidden','forbidden@test.invalid')$$,'42501','Teacher membership required','inactive teacher cannot create registry');
select * from finish();
rollback;