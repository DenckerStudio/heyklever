-- 0066_train_ai_updates.sql
-- Updates to AI Agent Training tables (0065)
-- This migration applies updates to existing train AI tables

-- ============================================================================
-- ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for faster lookup by created_by user
create index if not exists generated_outputs_created_by_idx 
  on public.generated_outputs(created_by) 
  where created_by is not null;

-- Index for faster lookup by approved_by user
create index if not exists generated_outputs_approved_by_idx 
  on public.generated_outputs(approved_by) 
  where approved_by is not null;

-- Composite index for team + status queries (common query pattern)
create index if not exists generated_outputs_team_status_idx 
  on public.generated_outputs(team_id, status);

-- Index for training sources by created_by
create index if not exists training_sources_created_by_idx 
  on public.training_sources(created_by) 
  where created_by is not null;

-- Index for monitored URLs by created_by
create index if not exists monitored_urls_created_by_idx 
  on public.monitored_urls(created_by) 
  where created_by is not null;

-- ============================================================================
-- ADD POLICY FOR URL CHECK HISTORY INSERT
-- (Missing from original migration)
-- ============================================================================

-- Drop and recreate to ensure policy exists
drop policy if exists "Team members can insert URL check history" on public.url_check_history;
create policy "Team members can insert URL check history"
on public.url_check_history for insert
to authenticated
with check (
  exists (
    select 1 from public.monitored_urls mu
    where mu.id = monitored_url_id
    and public.is_team_member(mu.team_id)
  )
);

-- ============================================================================
-- ADD UPDATE POLICY FOR TRAINING SOURCES
-- (Missing from original migration)
-- ============================================================================

drop policy if exists "Team members can update training sources" on public.training_sources;
create policy "Team members can update training sources"
on public.training_sources for update
to authenticated
using (public.is_team_member(team_id));

-- ============================================================================
-- GRANT EXECUTE ON HELPER FUNCTIONS TO SERVICE ROLE
-- ============================================================================

-- Ensure service role can execute the URL check function
grant execute on function public.get_urls_due_for_check(int) to service_role;
grant execute on function public.update_updated_at_column() to service_role;
