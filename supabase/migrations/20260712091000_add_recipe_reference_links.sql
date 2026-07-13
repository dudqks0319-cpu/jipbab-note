-- Stores multiple reviewed references without treating external articles or videos as reusable content.

create table if not exists public.recipe_reference_links (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  reference_type text not null
    check (
      reference_type in (
        'official_guidance',
        'book',
        'blog',
        'video',
        'community',
        'internal_cooking_test'
      )
    ),
  provider text not null,
  title text not null,
  source_url text,
  license_or_usage_note text not null,
  rights_note text not null,
  used_for text not null,
  checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint recipe_reference_links_text_lengths
    check (
      char_length(provider) between 1 and 120
      and char_length(title) between 1 and 500
      and (source_url is null or char_length(source_url) <= 2048)
      and char_length(license_or_usage_note) between 1 and 1000
      and char_length(rights_note) between 1 and 1000
      and char_length(used_for) between 1 and 1000
    )
);

create index if not exists idx_recipe_reference_links_recipe
  on public.recipe_reference_links(recipe_id);

create index if not exists idx_recipe_reference_links_type
  on public.recipe_reference_links(reference_type, checked_at desc);

alter table public.recipe_reference_links enable row level security;

revoke all on table public.recipe_reference_links from public;
revoke all on table public.recipe_reference_links from anon, authenticated;
