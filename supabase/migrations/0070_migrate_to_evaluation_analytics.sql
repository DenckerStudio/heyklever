-- Migrer eksisterende confidence-evaluering til felles tabell og dropp gammel tabell.
insert into public.evaluation_analytics (team_id, calculated_at, evaluation_type, stats, created_at, updated_at)
select team_id, calculated_at, 'confidence'::text, stats, created_at, updated_at
from public.confidence_evaluation_analytics
on conflict (team_id, calculated_date, evaluation_type) do nothing;

-- Dropp gammel tabell (trigger og function droppes automatisk ved drop table)
drop table if exists public.confidence_evaluation_analytics;

-- Dropp function som ikke lenger brukes
drop function if exists update_confidence_evaluation_analytics_updated_at();
