create table if not exists public.recipe_categories (
  id text primary key,
  display_name text not null unique,
  sort_order integer not null check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_categories_id_format
    check (id ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint recipe_categories_display_name_length
    check (char_length(btrim(display_name)) between 1 and 40)
);

insert into public.recipe_categories (id, display_name, sort_order)
values
  ('rice', '밥·한 그릇', 10),
  ('soup', '국', 20),
  ('stew', '찌개·전골', 30),
  ('side', '반찬', 40),
  ('egg', '달걀', 50),
  ('tofu', '두부', 60),
  ('meat', '고기', 70),
  ('seafood', '해산물', 80),
  ('noodle', '면', 90),
  ('snack', '분식', 100),
  ('western', '양식', 110),
  ('chinese', '중식', 120),
  ('japanese', '일식', 130),
  ('dessert', '간식·디저트', 140),
  ('other', '기타', 150)
on conflict (id) do update
set display_name = excluded.display_name,
    sort_order = excluded.sort_order;

alter table public.recipes
  add column if not exists slug text,
  add column if not exists summary text,
  add column if not exists category_id text references public.recipe_categories(id),
  add column if not exists cuisine_type text,
  add column if not exists schema_version smallint not null default 1,
  add column if not exists version integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_slug_format'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_slug_format
      check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_phase1_field_lengths'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_phase1_field_lengths
      check (
        (summary is null or char_length(summary) <= 300)
        and (cuisine_type is null or char_length(cuisine_type) <= 40)
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_schema_version_allowed'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_schema_version_allowed
      check (schema_version in (1, 2));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_version_positive'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_version_positive
      check (version > 0);
  end if;
end
$$;

create unique index if not exists idx_recipes_slug_unique
on public.recipes(slug)
where slug is not null;

create index if not exists idx_recipes_category_id
on public.recipes(category_id);

create index if not exists idx_recipes_schema_version
on public.recipes(schema_version, review_status);

create table if not exists public.ingredients_catalog (
  id text primary key,
  canonical_name text not null,
  category text not null,
  default_storage_type text,
  common_unit text,
  allergen_group text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_catalog_id_format
    check (id ~ '^[a-z][a-z0-9-]{1,79}$'),
  constraint ingredients_catalog_name_length
    check (char_length(btrim(canonical_name)) between 1 and 80),
  constraint ingredients_catalog_category_length
    check (char_length(btrim(category)) between 1 and 40),
  constraint ingredients_catalog_storage_allowed
    check (default_storage_type is null or default_storage_type in ('냉장', '냉동', '실온')),
  constraint ingredients_catalog_unit_length
    check (common_unit is null or char_length(common_unit) <= 24),
  constraint ingredients_catalog_allergen_length
    check (allergen_group is null or char_length(allergen_group) <= 80)
);

create unique index if not exists idx_ingredients_catalog_canonical_name
on public.ingredients_catalog(lower(btrim(canonical_name)));

create table if not exists public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text not null references public.ingredients_catalog(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  alias_type text not null default 'synonym',
  locale text not null default 'ko-KR',
  created_at timestamptz not null default now(),
  constraint ingredient_aliases_alias_length
    check (char_length(btrim(alias)) between 1 and 80),
  constraint ingredient_aliases_normalized_length
    check (char_length(normalized_alias) between 1 and 80),
  constraint ingredient_aliases_normalized_matches_alias
    check (normalized_alias = lower(regexp_replace(btrim(alias), '[[:space:]]+', '', 'g'))),
  constraint ingredient_aliases_type_allowed
    check (alias_type in ('canonical', 'synonym', 'regional', 'spelling', 'editorial')),
  constraint ingredient_aliases_locale_length
    check (char_length(locale) between 2 and 16),
  unique (locale, normalized_alias)
);

create index if not exists idx_ingredient_aliases_ingredient_id
on public.ingredient_aliases(ingredient_id);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id text references public.ingredients_catalog(id),
  group_type text not null default 'main',
  display_name text not null,
  quantity_value numeric,
  quantity_text text,
  unit text,
  preparation text,
  optional boolean not null default false,
  pantry_staple boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_ingredients_group_type_allowed
    check (group_type in ('main', 'sauce', 'seasoning', 'garnish', 'optional', 'other')),
  constraint recipe_ingredients_display_name_length
    check (char_length(btrim(display_name)) between 1 and 80),
  constraint recipe_ingredients_quantity_value_valid
    check (quantity_value is null or quantity_value >= 0),
  constraint recipe_ingredients_text_lengths
    check (
      (quantity_text is null or char_length(quantity_text) <= 80)
      and (unit is null or char_length(unit) <= 24)
      and (preparation is null or char_length(preparation) <= 240)
    ),
  constraint recipe_ingredients_sort_order_valid
    check (sort_order >= 0),
  unique (recipe_id, sort_order),
  unique (id, recipe_id)
);

create index if not exists idx_recipe_ingredients_recipe_id
on public.recipe_ingredients(recipe_id, sort_order);

create index if not exists idx_recipe_ingredients_ingredient_id
on public.recipe_ingredients(ingredient_id);

create table if not exists public.recipe_ingredient_substitutions (
  id uuid primary key default gen_random_uuid(),
  recipe_ingredient_id uuid not null references public.recipe_ingredients(id) on delete cascade,
  substitute_ingredient_id text references public.ingredients_catalog(id),
  substitute_text text,
  ratio_text text,
  caution_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint recipe_ingredient_substitutions_target_required
    check (
      substitute_ingredient_id is not null
      or nullif(btrim(substitute_text), '') is not null
    ),
  constraint recipe_ingredient_substitutions_text_lengths
    check (
      (substitute_text is null or char_length(substitute_text) <= 120)
      and (ratio_text is null or char_length(ratio_text) <= 120)
      and (caution_text is null or char_length(caution_text) <= 500)
    ),
  constraint recipe_ingredient_substitutions_sort_order_valid
    check (sort_order >= 0),
  unique (recipe_ingredient_id, sort_order)
);

create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_order integer not null,
  title text,
  instruction text not null,
  heat_level text,
  duration_seconds_min integer,
  duration_seconds_max integer,
  timer_preset_seconds integer,
  visual_cue text,
  sound_cue text,
  smell_cue text,
  safety_note text,
  recovery_tip text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_steps_order_valid
    check (step_order > 0),
  constraint recipe_steps_instruction_length
    check (char_length(btrim(instruction)) between 1 and 2000),
  constraint recipe_steps_title_length
    check (title is null or char_length(title) <= 160),
  constraint recipe_steps_heat_level_allowed
    check (heat_level is null or heat_level in ('none', 'low', 'medium_low', 'medium', 'high')),
  constraint recipe_steps_duration_valid
    check (
      (duration_seconds_min is null or duration_seconds_min >= 0)
      and (duration_seconds_max is null or duration_seconds_max >= 0)
      and (
        duration_seconds_min is null
        or duration_seconds_max is null
        or duration_seconds_max >= duration_seconds_min
      )
      and (timer_preset_seconds is null or timer_preset_seconds > 0)
    ),
  constraint recipe_steps_guidance_lengths
    check (
      (visual_cue is null or char_length(visual_cue) <= 1000)
      and (sound_cue is null or char_length(sound_cue) <= 500)
      and (smell_cue is null or char_length(smell_cue) <= 500)
      and (safety_note is null or char_length(safety_note) <= 1000)
      and (recovery_tip is null or char_length(recovery_tip) <= 1000)
      and (image_url is null or char_length(image_url) <= 2048)
    ),
  unique (recipe_id, step_order),
  unique (id, recipe_id)
);

create index if not exists idx_recipe_steps_recipe_id
on public.recipe_steps(recipe_id, step_order);

create table if not exists public.recipe_step_ingredients (
  recipe_step_id uuid not null,
  recipe_ingredient_id uuid not null,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  usage_text text,
  created_at timestamptz not null default now(),
  primary key (recipe_step_id, recipe_ingredient_id),
  constraint recipe_step_ingredients_step_fk
    foreign key (recipe_step_id, recipe_id)
    references public.recipe_steps(id, recipe_id)
    on delete cascade,
  constraint recipe_step_ingredients_ingredient_fk
    foreign key (recipe_ingredient_id, recipe_id)
    references public.recipe_ingredients(id, recipe_id)
    on delete cascade,
  constraint recipe_step_ingredients_usage_length
    check (usage_text is null or char_length(usage_text) <= 300)
);

create index if not exists idx_recipe_step_ingredients_recipe_id
on public.recipe_step_ingredients(recipe_id);

create table if not exists public.recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  review_type text not null,
  reviewer text not null,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  score numeric,
  result text not null,
  notes text,
  evidence_reference text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint recipe_reviews_type_allowed
    check (review_type in ('structure', 'editorial', 'beginner', 'food_safety', 'actual_cooking', 'legal_source')),
  constraint recipe_reviews_reviewer_length
    check (char_length(btrim(reviewer)) between 1 and 120),
  constraint recipe_reviews_score_valid
    check (score is null or score between 0 and 100),
  constraint recipe_reviews_result_allowed
    check (result in ('approved', 'needs_revision', 'rejected')),
  constraint recipe_reviews_notes_length
    check (notes is null or char_length(notes) <= 5000),
  constraint recipe_reviews_evidence_length
    check (evidence_reference is null or char_length(evidence_reference) <= 2048)
);

create index if not exists idx_recipe_reviews_recipe_type
on public.recipe_reviews(recipe_id, review_type, reviewed_at desc);

create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  change_summary text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint recipe_versions_change_summary_length
    check (change_summary is null or char_length(change_summary) <= 500),
  unique (recipe_id, version)
);

create index if not exists idx_recipe_versions_recipe_created
on public.recipe_versions(recipe_id, created_at desc);

drop trigger if exists set_recipe_categories_updated_at on public.recipe_categories;
create trigger set_recipe_categories_updated_at
  before update on public.recipe_categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_ingredients_catalog_updated_at on public.ingredients_catalog;
create trigger set_ingredients_catalog_updated_at
  before update on public.ingredients_catalog
  for each row execute function public.set_updated_at();

drop trigger if exists set_recipe_ingredients_updated_at on public.recipe_ingredients;
create trigger set_recipe_ingredients_updated_at
  before update on public.recipe_ingredients
  for each row execute function public.set_updated_at();

drop trigger if exists set_recipe_steps_updated_at on public.recipe_steps;
create trigger set_recipe_steps_updated_at
  before update on public.recipe_steps
  for each row execute function public.set_updated_at();

create or replace function app.build_recipe_v2_snapshot(target_recipe_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, app
as $$
declare
  snapshot_value jsonb;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;

  select jsonb_build_object(
    'snapshot_version', 1,
    'recipe', to_jsonb(recipe_row),
    'recipe_ingredients', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
      from public.recipe_ingredients item
      where item.recipe_id = recipe_row.id
    ), '[]'::jsonb),
    'ingredient_substitutions', coalesce((
      select jsonb_agg(to_jsonb(substitution) order by substitution.recipe_ingredient_id, substitution.sort_order, substitution.id)
      from public.recipe_ingredient_substitutions substitution
      join public.recipe_ingredients item on item.id = substitution.recipe_ingredient_id
      where item.recipe_id = recipe_row.id
    ), '[]'::jsonb),
    'recipe_steps', coalesce((
      select jsonb_agg(to_jsonb(step_row) order by step_row.step_order, step_row.id)
      from public.recipe_steps step_row
      where step_row.recipe_id = recipe_row.id
    ), '[]'::jsonb),
    'step_ingredients', coalesce((
      select jsonb_agg(to_jsonb(usage) order by usage.recipe_step_id, usage.recipe_ingredient_id)
      from public.recipe_step_ingredients usage
      where usage.recipe_id = recipe_row.id
    ), '[]'::jsonb)
  )
  into snapshot_value
  from public.recipes recipe_row
  where recipe_row.id = target_recipe_id;

  if snapshot_value is null then
    raise exception 'recipe_not_found';
  end if;

  return snapshot_value;
end;
$$;

create or replace function public.capture_recipe_version(
  target_recipe_id uuid,
  expected_version integer,
  change_summary text default null,
  changed_by uuid default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, app
as $$
declare
  current_version integer;
  next_version integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if change_summary is not null and char_length(change_summary) > 500 then
    raise exception 'change_summary_too_long';
  end if;

  select version into current_version
  from public.recipes
  where id = target_recipe_id
  for update;

  if current_version is null then
    raise exception 'recipe_not_found';
  end if;
  if current_version <> expected_version then
    raise exception 'recipe_version_conflict';
  end if;

  insert into public.recipe_versions (
    recipe_id,
    version,
    snapshot,
    change_summary,
    changed_by
  ) values (
    target_recipe_id,
    current_version,
    app.build_recipe_v2_snapshot(target_recipe_id),
    nullif(btrim(change_summary), ''),
    changed_by
  );

  next_version := current_version + 1;
  update public.recipes
  set version = next_version,
      updated_at = now()
  where id = target_recipe_id;

  return next_version;
end;
$$;

create or replace function public.restore_recipe_version(
  target_recipe_id uuid,
  target_version integer,
  expected_current_version integer,
  change_summary text default null,
  changed_by uuid default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, app
as $$
declare
  current_version integer;
  next_version integer;
  target_snapshot jsonb;
  restored_recipe public.recipes%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if change_summary is not null and char_length(change_summary) > 500 then
    raise exception 'change_summary_too_long';
  end if;

  select version into current_version
  from public.recipes
  where id = target_recipe_id
  for update;

  if current_version is null then
    raise exception 'recipe_not_found';
  end if;
  if current_version <> expected_current_version then
    raise exception 'recipe_version_conflict';
  end if;

  select snapshot into target_snapshot
  from public.recipe_versions
  where recipe_id = target_recipe_id
    and version = target_version;

  if target_snapshot is null then
    raise exception 'recipe_version_not_found';
  end if;
  if coalesce((target_snapshot ->> 'snapshot_version')::integer, 0) <> 1 then
    raise exception 'unsupported_snapshot_version';
  end if;
  if exists (
    select 1 from public.recipe_versions
    where recipe_id = target_recipe_id and version = current_version
  ) then
    raise exception 'current_version_already_archived';
  end if;

  insert into public.recipe_versions (
    recipe_id,
    version,
    snapshot,
    change_summary,
    changed_by
  ) values (
    target_recipe_id,
    current_version,
    app.build_recipe_v2_snapshot(target_recipe_id),
    coalesce(nullif(btrim(change_summary), ''), format('before restore to version %s', target_version)),
    changed_by
  );

  select * into restored_recipe
  from jsonb_populate_record(null::public.recipes, target_snapshot -> 'recipe');

  if restored_recipe.id is distinct from target_recipe_id then
    raise exception 'snapshot_recipe_mismatch';
  end if;

  next_version := current_version + 1;

  update public.recipes
  set slug = restored_recipe.slug,
      title = restored_recipe.title,
      summary = restored_recipe.summary,
      description = restored_recipe.description,
      category = restored_recipe.category,
      category_id = restored_recipe.category_id,
      cuisine_type = restored_recipe.cuisine_type,
      difficulty = restored_recipe.difficulty,
      cooking_time = restored_recipe.cooking_time,
      servings = restored_recipe.servings,
      servings_base = restored_recipe.servings_base,
      prep_time_minutes = restored_recipe.prep_time_minutes,
      cook_time_minutes = restored_recipe.cook_time_minutes,
      total_time_minutes = restored_recipe.total_time_minutes,
      thumbnail_url = restored_recipe.thumbnail_url,
      tools = restored_recipe.tools,
      ingredients = restored_recipe.ingredients,
      steps = restored_recipe.steps,
      storage_guide = restored_recipe.storage_guide,
      reheating_guide = restored_recipe.reheating_guide,
      safety_notes = restored_recipe.safety_notes,
      source_id = restored_recipe.source_id,
      content_origin = restored_recipe.content_origin,
      reviewed_for_beginner = restored_recipe.reviewed_for_beginner,
      review_status = restored_recipe.review_status,
      beginner_reviewed_at = restored_recipe.beginner_reviewed_at,
      actual_cooking_tested = restored_recipe.actual_cooking_tested,
      actual_cooking_tested_at = restored_recipe.actual_cooking_tested_at,
      food_safety_reviewed = restored_recipe.food_safety_reviewed,
      food_safety_reviewed_at = restored_recipe.food_safety_reviewed_at,
      image_rights_status = restored_recipe.image_rights_status,
      image_rights_reviewed_at = restored_recipe.image_rights_reviewed_at,
      source_reviewed_at = restored_recipe.source_reviewed_at,
      reviewer = restored_recipe.reviewer,
      published_at = restored_recipe.published_at,
      source = restored_recipe.source,
      schema_version = restored_recipe.schema_version,
      version = next_version,
      updated_at = now()
  where id = target_recipe_id;

  delete from public.recipe_step_ingredients where recipe_id = target_recipe_id;
  delete from public.recipe_ingredient_substitutions substitution
  using public.recipe_ingredients item
  where substitution.recipe_ingredient_id = item.id
    and item.recipe_id = target_recipe_id;
  delete from public.recipe_steps where recipe_id = target_recipe_id;
  delete from public.recipe_ingredients where recipe_id = target_recipe_id;

  insert into public.recipe_ingredients
  select *
  from jsonb_populate_recordset(
    null::public.recipe_ingredients,
    coalesce(target_snapshot -> 'recipe_ingredients', '[]'::jsonb)
  );

  insert into public.recipe_steps
  select *
  from jsonb_populate_recordset(
    null::public.recipe_steps,
    coalesce(target_snapshot -> 'recipe_steps', '[]'::jsonb)
  );

  insert into public.recipe_ingredient_substitutions
  select *
  from jsonb_populate_recordset(
    null::public.recipe_ingredient_substitutions,
    coalesce(target_snapshot -> 'ingredient_substitutions', '[]'::jsonb)
  );

  insert into public.recipe_step_ingredients
  select *
  from jsonb_populate_recordset(
    null::public.recipe_step_ingredients,
    coalesce(target_snapshot -> 'step_ingredients', '[]'::jsonb)
  );

  return next_version;
end;
$$;

revoke all on function app.build_recipe_v2_snapshot(uuid) from public, anon, authenticated;
grant execute on function app.build_recipe_v2_snapshot(uuid) to service_role;

revoke all on function public.capture_recipe_version(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.capture_recipe_version(uuid, integer, text, uuid) to service_role;

revoke all on function public.restore_recipe_version(uuid, integer, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.restore_recipe_version(uuid, integer, integer, text, uuid) to service_role;

alter table public.recipe_categories enable row level security;
alter table public.ingredients_catalog enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_ingredient_substitutions enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_step_ingredients enable row level security;
alter table public.recipe_reviews enable row level security;
alter table public.recipe_versions enable row level security;

revoke all on table public.recipe_categories from anon, authenticated;
revoke all on table public.ingredients_catalog from anon, authenticated;
revoke all on table public.ingredient_aliases from anon, authenticated;
revoke all on table public.recipe_ingredients from anon, authenticated;
revoke all on table public.recipe_ingredient_substitutions from anon, authenticated;
revoke all on table public.recipe_steps from anon, authenticated;
revoke all on table public.recipe_step_ingredients from anon, authenticated;
revoke all on table public.recipe_reviews from anon, authenticated;
revoke all on table public.recipe_versions from anon, authenticated;

grant all on table public.recipe_categories to service_role;
grant all on table public.ingredients_catalog to service_role;
grant all on table public.ingredient_aliases to service_role;
grant all on table public.recipe_ingredients to service_role;
grant all on table public.recipe_ingredient_substitutions to service_role;
grant all on table public.recipe_steps to service_role;
grant all on table public.recipe_step_ingredients to service_role;
grant all on table public.recipe_reviews to service_role;
grant all on table public.recipe_versions to service_role;

drop policy if exists recipe_categories_select_public on public.recipe_categories;
create policy recipe_categories_select_public
on public.recipe_categories
for select
to anon, authenticated
using (active is true);

grant select on table public.recipe_categories to anon, authenticated;

comment on table public.recipe_ingredients is
  'Phase 1 normalized recipe ingredients. Legacy recipes.ingredients remains until migration validation and API cutover.';
comment on table public.recipe_versions is
  'Service-role-only complete recipe snapshots used for optimistic capture and reversible restore.';
comment on column public.recipes.schema_version is
  '1 means legacy JSONB is authoritative; 2 is set only after normalized child validation succeeds.';

notify pgrst, 'reload schema';
