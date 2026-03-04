-- 0052_public_docs_table.sql
-- Public documentation table for app-wide documentation (separate from team-scoped ai_documents)

create table if not exists public.public_docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text not null,
  order_index integer default 0,
  is_published boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- Indexes
create index if not exists public_docs_slug_idx on public.public_docs(slug);
create index if not exists public_docs_published_idx on public.public_docs(is_published);
create index if not exists public_docs_order_idx on public.public_docs(order_index);

-- RLS
alter table public.public_docs enable row level security;

-- Policy: Anyone can view published docs
create policy "Anyone can view published docs"
on public.public_docs for select
to authenticated
using (is_published = true);

-- Policy: Only app admins can insert/update/delete
-- This will be enforced via API route checks using APP_ADMIN_EMAILS env var
create policy "App admins can manage docs"
on public.public_docs for all
to authenticated
using (false)  -- Disabled by default, API will check admin status
with check (false);

-- Function to update updated_at timestamp
create or replace function update_public_docs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_public_docs_updated_at
before update on public.public_docs
for each row
execute function update_public_docs_updated_at();

