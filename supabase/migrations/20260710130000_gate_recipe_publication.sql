alter table public.recipes
  add column if not exists servings_base integer,
  add column if not exists prep_time_minutes integer,
  add column if not exists cook_time_minutes integer,
  add column if not exists total_time_minutes integer,
  add column if not exists tools jsonb not null default '[]'::jsonb,
  add column if not exists storage_guide text,
  add column if not exists reheating_guide text,
  add column if not exists safety_notes jsonb not null default '[]'::jsonb,
  add column if not exists review_status text not null default 'imported',
  add column if not exists beginner_reviewed_at timestamptz,
  add column if not exists actual_cooking_tested boolean not null default false,
  add column if not exists actual_cooking_tested_at timestamptz,
  add column if not exists food_safety_reviewed boolean not null default false,
  add column if not exists food_safety_reviewed_at timestamptz,
  add column if not exists image_rights_status text not null default 'unverified',
  add column if not exists image_rights_reviewed_at timestamptz,
  add column if not exists source_reviewed_at timestamptz,
  add column if not exists reviewer text,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_review_status_allowed'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_review_status_allowed
      check (review_status in (
        'imported',
        'normalizing',
        'editorial_review',
        'beginner_review',
        'cooking_test',
        'approved',
        'needs_revision',
        'rejected',
        'archived'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_image_rights_status_allowed'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_image_rights_status_allowed
      check (image_rights_status in ('unverified', 'approved', 'no_image_approved', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_v2_time_values_valid'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_v2_time_values_valid
      check (
        (servings_base is null or servings_base > 0)
        and (prep_time_minutes is null or prep_time_minutes >= 0)
        and (cook_time_minutes is null or cook_time_minutes > 0)
        and (total_time_minutes is null or total_time_minutes > 0)
        and (
          total_time_minutes is null
          or prep_time_minutes is null
          or cook_time_minutes is null
          or total_time_minutes >= prep_time_minutes + cook_time_minutes
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_v2_json_arrays_valid'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_v2_json_arrays_valid
      check (
        jsonb_typeof(tools) = 'array'
        and jsonb_typeof(ingredients) = 'array'
        and jsonb_typeof(steps) = 'array'
        and jsonb_typeof(safety_notes) = 'array'
      );
  end if;
end
$$;

create index if not exists idx_recipes_publication_ready
on public.recipes (published_at desc, created_at desc)
where review_status = 'approved'
  and reviewed_for_beginner is true
  and actual_cooking_tested is true
  and food_safety_reviewed is true
  and published_at is not null;

drop policy if exists recipes_select_public on public.recipes;
create policy recipes_select_public
on public.recipes
for select
to anon, authenticated
using (
  review_status = 'approved'
  and reviewed_for_beginner is true
  and beginner_reviewed_at is not null
  and actual_cooking_tested is true
  and actual_cooking_tested_at is not null
  and food_safety_reviewed is true
  and food_safety_reviewed_at is not null
  and image_rights_status in ('approved', 'no_image_approved')
  and image_rights_reviewed_at is not null
  and source_reviewed_at is not null
  and published_at is not null
  and reviewer is not null
  and btrim(reviewer) <> ''
  and source_id is not null
  and title is not null
  and btrim(title) <> ''
  and description is not null
  and btrim(description) <> ''
  and category is not null
  and btrim(category) <> ''
  and difficulty between 1 and 3
  and servings_base > 0
  and prep_time_minutes >= 0
  and cook_time_minutes > 0
  and total_time_minutes >= prep_time_minutes + cook_time_minutes
  and jsonb_typeof(tools) = 'array'
  and jsonb_array_length(tools) >= 1
  and not exists (
    select 1
    from jsonb_array_elements(tools) as tool(value)
    where not (
      (jsonb_typeof(tool.value) = 'string' and btrim(tool.value #>> '{}') <> '')
      or (
        jsonb_typeof(tool.value) = 'object'
        and nullif(btrim(tool.value ->> 'name'), '') is not null
      )
    )
  )
  and jsonb_typeof(ingredients) = 'array'
  and jsonb_array_length(ingredients) >= 3
  and not exists (
    select 1
    from jsonb_array_elements(ingredients) as ingredient(value)
    where jsonb_typeof(ingredient.value) <> 'object'
      or nullif(btrim(ingredient.value ->> 'name'), '') is null
      or nullif(
        btrim(coalesce(
          ingredient.value ->> 'amount',
          ingredient.value ->> 'quantityText',
          ingredient.value ->> 'quantity_text'
        )),
        ''
      ) is null
  )
  and jsonb_typeof(steps) = 'array'
  and jsonb_array_length(steps) >= 3
  and not exists (
    select 1
    from jsonb_array_elements(steps) as step(value)
    where jsonb_typeof(step.value) <> 'object'
      or nullif(btrim(coalesce(
        step.value ->> 'instruction',
        step.value ->> 'description',
        step.value ->> 'action'
      )), '') is null
      or nullif(btrim(coalesce(
        step.value ->> 'heatLevel',
        step.value ->> 'heat_level',
        step.value ->> 'heat'
      )), '') is null
      or nullif(btrim(coalesce(
        step.value ->> 'visualCue',
        step.value ->> 'visual_cue'
      )), '') is null
      or coalesce(
        nullif(btrim(step.value ->> 'minutes'), ''),
        nullif(btrim(step.value ->> 'durationSecondsMin'), ''),
        nullif(btrim(step.value ->> 'duration_seconds_min'), ''),
        nullif(btrim(step.value ->> 'timerPresetSeconds'), ''),
        nullif(btrim(step.value ->> 'timer_preset_seconds'), ''),
        ''
      ) !~ '^[0-9]+([.][0-9]+)?$'
  )
  and storage_guide is not null
  and btrim(storage_guide) <> ''
  and reheating_guide is not null
  and btrim(reheating_guide) <> ''
  and (
    image_rights_status = 'no_image_approved'
    or (thumbnail_url is not null and btrim(thumbnail_url) <> '')
  )
);

drop policy if exists recipe_sources_select_public on public.recipe_sources;
create policy recipe_sources_select_public
on public.recipe_sources
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.recipes
    where recipes.source_id = recipe_sources.id
  )
);

notify pgrst, 'reload schema';
