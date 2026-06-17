alter table artifacts
add column if not exists drift_moods text[] not null default '{}'::text[]
check (
  drift_moods <@ array[
    'dawn',
    'morning',
    'afternoon',
    'dusk',
    'evening',
    'late-night'
  ]::text[]
);

update artifacts
set drift_moods = '{}'::text[]
where drift_moods is null;
