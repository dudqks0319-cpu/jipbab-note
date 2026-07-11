-- Adds reviewed age, texture, allergen and serving guidance for baby/toddler recipes.
-- Public clients do not read this table directly. API v1 reads it through the server admin client
-- and applies both the existing recipe publication gate and the child-guidance gate.

create table if not exists public.recipe_child_guidance (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  audience text not null
    check (audience in ('baby', 'toddler')),
  stage_code text not null
    check (
      stage_code in (
        'baby_6_8',
        'baby_9_11',
        'toddler_12_17',
        'toddler_18_23',
        'toddler_24_29',
        'toddler_30_36',
        'toddler_24_36'
      )
    ),
  min_age_months smallint not null
    check (min_age_months between 6 and 72),
  max_age_months smallint not null
    check (
      max_age_months between 6 and 72
      and max_age_months >= min_age_months
    ),
  texture_level text not null
    check (
      texture_level in (
        'puree',
        'mashed',
        'soft_lumps',
        'soft_bite',
        'family_cut'
      )
    ),
  meal_types text[] not null default '{}'
    check (
      meal_types <@ array['breakfast', 'lunch', 'dinner', 'snack']::text[]
      and cardinality(meal_types) between 1 and 4
    ),
  allergen_codes text[] not null default '{}'
    check (
      allergen_codes <@ array[
        'egg',
        'milk',
        'wheat',
        'soy',
        'peanut',
        'tree_nut',
        'sesame',
        'buckwheat',
        'fish',
        'shellfish',
        'pork',
        'chicken',
        'beef',
        'peach',
        'tomato',
        'sulfite',
        'pine_nut'
      ]::text[]
    ),
  nutrition_roles text[] not null default '{}'
    check (
      nutrition_roles <@ array[
        'grain',
        'protein',
        'iron_source',
        'vegetable',
        'fruit',
        'dairy',
        'healthy_fat'
      ]::text[]
    ),
  choking_risk_flags text[] not null default '{}',
  serving_shape_notes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(serving_shape_notes) = 'array'),
  sodium_strategy text not null
    check (
      sodium_strategy in (
        'no_added_salt',
        'child_portion_first',
        'low_sodium_product'
      )
    ),
  family_split_supported boolean not null default false,
  family_split_instruction text,
  freezer_friendly boolean not null default false,
  freezer_quality_days smallint
    check (
      freezer_quality_days is null
      or freezer_quality_days between 1 and 90
    ),
  storage_policy_code text not null
    check (
      storage_policy_code in (
        'eat_now',
        'young_child_cooked_food',
        'young_child_rice',
        'recipe_specific'
      )
    ),
  picky_eating_tip text not null,
  caregiver_note text not null,
  guidance_version smallint not null default 1
    check (guidance_version between 1 and 1000),
  review_status text not null default 'draft'
    check (
      review_status in (
        'draft',
        'editorial_review',
        'cooking_test',
        'approved',
        'rejected'
      )
    ),
  child_feeding_reviewed boolean not null default false,
  child_feeding_reviewed_at timestamptz,
  child_feeding_reviewer text,
  requirements_verified boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_child_guidance_family_split_text
    check (
      family_split_supported = false
      or length(trim(coalesce(family_split_instruction, ''))) > 0
    ),
  constraint recipe_child_guidance_approved_contract
    check (
      review_status <> 'approved'
      or (
        child_feeding_reviewed = true
        and child_feeding_reviewed_at is not null
        and length(trim(coalesce(child_feeding_reviewer, ''))) > 0
        and requirements_verified = true
        and published_at is not null
        and jsonb_array_length(serving_shape_notes) > 0
        and length(trim(picky_eating_tip)) > 0
        and length(trim(caregiver_note)) > 0
      )
    ),
  unique (recipe_id, stage_code, guidance_version)
);

create index if not exists idx_recipe_child_guidance_recipe
  on public.recipe_child_guidance(recipe_id);

create index if not exists idx_recipe_child_guidance_age
  on public.recipe_child_guidance(
    audience,
    min_age_months,
    max_age_months,
    review_status
  );

create index if not exists idx_recipe_child_guidance_meal_types
  on public.recipe_child_guidance using gin(meal_types);

create index if not exists idx_recipe_child_guidance_allergens
  on public.recipe_child_guidance using gin(allergen_codes);

create index if not exists idx_recipe_child_guidance_nutrition
  on public.recipe_child_guidance using gin(nutrition_roles);

drop trigger if exists set_recipe_child_guidance_updated_at
  on public.recipe_child_guidance;

create trigger set_recipe_child_guidance_updated_at
before update on public.recipe_child_guidance
for each row execute function public.set_updated_at();

alter table public.recipe_child_guidance enable row level security;

revoke all on table public.recipe_child_guidance from public;
revoke all on table public.recipe_child_guidance from anon, authenticated;
