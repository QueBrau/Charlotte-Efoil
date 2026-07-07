-- Allow scheduling on the 29th, 30th, and 31st (skips months without that day).

alter table public.email_schedules
  drop constraint if exists email_schedules_day_of_month_check;

alter table public.email_schedules
  add constraint email_schedules_day_of_month_check
  check (day_of_month between 1 and 31);
