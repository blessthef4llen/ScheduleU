-- Travel alerts: campus-wide mobility notices (shuttle, parking, weather, advisory).
-- RLS: active rows are readable by anyone with the anon key (typical public campus feed).
-- Writes should use service role / trusted server paths only (no insert policy for anon).

create table if not exists public.travel_alerts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('shuttle', 'parking', 'weather', 'advisory')),
  title text not null,
  message text not null,
  route text,
  location text,
  shuttle_status text check (shuttle_status is null or shuttle_status in ('on-time', 'delayed')),
  priority text not null default 'normal' check (priority in ('high', 'normal')),
  sort_index int not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists travel_alerts_active_sort_idx on public.travel_alerts (is_active, sort_index);

alter table public.travel_alerts enable row level security;

-- Optional dedupe: comment out if your project uses a different role naming pattern.
drop policy if exists "travel_alerts_select_active_public" on public.travel_alerts;
create policy "travel_alerts_select_active_public"
  on public.travel_alerts
  for select
  using (is_active = true);

-- Seed from former TRAVEL_MOCK_ALERTS (replace or delete after syncing real data).
insert into public.travel_alerts (category, title, message, route, location, shuttle_status, priority, sort_index, is_active, updated_at)
values
  ('shuttle', 'Beachside Shuttle delayed', 'Beachside Shuttle is delayed by 4 mins due to traffic near Bellflower Blvd.', 'Beachside Lot → Central Quad', 'North route', 'delayed', 'high', 0, true, now() - interval '2 minutes'),
  ('shuttle', 'North Campus line on schedule', 'Shuttle arriving in 10 minutes; all stops operating normally.', 'North Campus → South Campus', 'Campus loop', 'on-time', 'normal', 1, true, now() - interval '5 minutes'),
  ('shuttle', 'Library / Engineering loop', 'Expect a longer wait at the Library stop; vehicle running behind one rotation.', 'Library → Engineering Building', 'East campus', 'delayed', 'normal', 2, true, now() - interval '8 minutes'),
  ('parking', 'Lot G overflow parking', 'When Lot G is full, use Lot E with free cross-campus shuttle.', null, 'Lot E — Atherton entrance', null, 'normal', 3, true, now() - interval '1 hour'),
  ('weather', 'Light rain this afternoon', 'Sidewalks near Brotman Hall may be slick. Allow extra walk time between classes.', null, 'South campus core', null, 'normal', 4, true, now() - interval '25 minutes'),
  ('advisory', 'Horn Center access', 'East entrance closed for maintenance through Friday. Use west doors only.', null, 'Horn Center', null, 'high', 5, true, now() - interval '3 hours')
;
