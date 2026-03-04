# RLS checklist for new migrations (IT-administrasjonsplattform)

When adding **new tables** that hold tenant-scoped data:

1. **Enable RLS** on the table: `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;`
2. **Add policies** that filter by `team_id` (or equivalent tenant column) using membership:
   - `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())`
   - Or use helpers: `public.is_team_member(team_id)` for read, `public.is_team_admin(team_id)` for write where appropriate.
3. **Service role** bypasses RLS; use it only in backend/webhooks (e.g. Stripe, n8n).
4. For tables keyed by **metadata->>'team_id'** (e.g. `documents`), policies must cast and check membership the same way.

See `0076_handle_new_user_and_rls_hardening.sql` for examples (documents, subscriptions, get_team_id_by_slug).
