alter table public.artifacts
add column if not exists discovery_visibility text not null default 'public'
check (discovery_visibility in ('public', 'hidden', 'backroom'));

update public.artifacts
set discovery_visibility = 'public'
where discovery_visibility is null;

drop policy if exists "Public can read published artifacts" on public.artifacts;

create policy "Public can read discoverable artifacts"
on public.artifacts
for select
to anon, authenticated
using (
  is_public = true
  and discovery_visibility in ('public', 'hidden')
);

