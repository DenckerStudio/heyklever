import React from 'react';
import { getServerUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import SectionTitle from '@/components/dashboard/sectionTitle';
import { KnowledgeBaseView } from '@/components/dashboard/analytics/KnowledgeBaseView';

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();
  let teamId = cookieStore.get('team_id')?.value || '';

  const user = await getServerUser();
  if (!teamId && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_team_id')
      .eq('id', user.id)
      .maybeSingle();
    teamId = profile?.default_team_id || '';
  }

  return (
    <div className="w-full h-full max-w-screen-2xl mx-auto">
      <SectionTitle 
        title="Knowledge Base" 
        badgeText="" 
        badgeLabel="" 
      />
      <KnowledgeBaseView teamId={teamId} />
    </div>
  );
}
