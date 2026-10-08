alter table public.task_types
  add constraint task_types_score_finite check(default_score between 0 and 99999999.99),
  add constraint task_types_description_length check(description is null or length(description)<=2000);
alter table public.tasks
  add constraint tasks_score_finite check(maximum_score between 0 and 99999999.99),
  add constraint tasks_title_length check(length(trim(title)) between 1 and 200),
  add constraint tasks_description_length check(description is null or length(description)<=5000);