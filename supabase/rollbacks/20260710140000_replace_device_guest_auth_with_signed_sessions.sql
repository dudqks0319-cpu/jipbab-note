create or replace function app.current_device_id()
returns text
language sql
stable
as $$
  select null::text;
$$;

revoke all on function app.current_device_id() from public;
revoke all on function app.current_device_id() from anon, authenticated;

drop policy if exists signed_guest_emergency_disable on public.ingredients;
create policy signed_guest_emergency_disable
on public.ingredients
as restrictive
for all
to authenticated
using (app.is_permanent_user())
with check (app.is_permanent_user());

drop policy if exists signed_guest_emergency_disable on public.favorites;
create policy signed_guest_emergency_disable
on public.favorites
as restrictive
for all
to authenticated
using (app.is_permanent_user())
with check (app.is_permanent_user());

drop policy if exists signed_guest_emergency_disable on public.shopping_items;
create policy signed_guest_emergency_disable
on public.shopping_items
as restrictive
for all
to authenticated
using (app.is_permanent_user())
with check (app.is_permanent_user());

revoke all on function public.merge_anonymous_user_data(uuid, uuid) from service_role;
