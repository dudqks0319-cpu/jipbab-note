-- 이 migration은 구조화 알레르기 분류와 사람 검수 상태를 추가합니다.
create table if not exists public.allergen_groups (
  id text primary key,
  display_name text not null unique,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint allergen_groups_id_format
    check (id ~ '^[a-z][a-z0-9-]{1,39}$'),
  constraint allergen_groups_display_name_length
    check (char_length(btrim(display_name)) between 1 and 40)
);

insert into public.allergen_groups (id, display_name, sort_order)
values
  ('eggs', '난류', 10),
  ('milk', '우유', 20),
  ('buckwheat', '메밀', 30),
  ('peanut', '땅콩', 40),
  ('soy', '대두', 50),
  ('wheat', '밀', 60),
  ('mackerel', '고등어', 70),
  ('crab', '게', 80),
  ('shrimp', '새우', 90),
  ('pork', '돼지고기', 100),
  ('peach', '복숭아', 110),
  ('tomato', '토마토', 120),
  ('sulfites', '아황산류', 130),
  ('walnut', '호두', 140),
  ('chicken', '닭고기', 150),
  ('beef', '쇠고기', 160),
  ('squid', '오징어', 170),
  ('shellfish', '조개류', 180),
  ('pine-nut', '잣', 190)
on conflict (id) do update
set display_name = excluded.display_name,
    sort_order = excluded.sort_order;

create table if not exists public.ingredient_allergen_profiles (
  ingredient_id text primary key references public.ingredients_catalog(id) on delete cascade,
  review_status text not null default 'unreviewed',
  reviewer text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_allergen_profiles_status_allowed
    check (review_status in ('unreviewed', 'approved', 'needs_revision')),
  constraint ingredient_allergen_profiles_review_evidence
    check (
      review_status <> 'approved'
      or (
        nullif(btrim(reviewer), '') is not null
        and reviewed_at is not null
      )
    ),
  constraint ingredient_allergen_profiles_text_lengths
    check (
      (reviewer is null or char_length(reviewer) <= 120)
      and (review_note is null or char_length(review_note) <= 1000)
    )
);

create table if not exists public.ingredient_allergen_links (
  ingredient_id text not null references public.ingredient_allergen_profiles(ingredient_id) on delete cascade,
  allergen_group_id text not null references public.allergen_groups(id) on delete restrict,
  presence_type text not null,
  evidence_reference text,
  created_at timestamptz not null default now(),
  primary key (ingredient_id, allergen_group_id, presence_type),
  constraint ingredient_allergen_links_presence_allowed
    check (presence_type in ('contains', 'may_contain', 'cross_contact')),
  constraint ingredient_allergen_links_evidence_length
    check (evidence_reference is null or char_length(evidence_reference) <= 2048)
);

insert into public.ingredient_allergen_profiles (ingredient_id, review_status)
select id, 'unreviewed'
from public.ingredients_catalog
on conflict (ingredient_id) do nothing;

drop trigger if exists set_ingredient_allergen_profiles_updated_at on public.ingredient_allergen_profiles;
create trigger set_ingredient_allergen_profiles_updated_at
  before update on public.ingredient_allergen_profiles
  for each row execute function public.set_updated_at();

alter table public.allergen_groups enable row level security;
alter table public.ingredient_allergen_profiles enable row level security;
alter table public.ingredient_allergen_links enable row level security;

revoke all on table public.allergen_groups from anon, authenticated;
revoke all on table public.ingredient_allergen_profiles from anon, authenticated;
revoke all on table public.ingredient_allergen_links from anon, authenticated;

grant all on table public.allergen_groups to service_role;
grant all on table public.ingredient_allergen_profiles to service_role;
grant all on table public.ingredient_allergen_links to service_role;

comment on table public.ingredient_allergen_profiles is
  'Every catalog ingredient starts unreviewed. Allergy-filtered recommendations require approved human review.';
comment on table public.ingredient_allergen_links is
  'Structured direct, possible, and cross-contact allergen relationships for approved ingredient profiles.';

notify pgrst, 'reload schema';
