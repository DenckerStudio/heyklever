import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if a team is an application administrator
 * Teams with the name 'HeyKlever' are considered admins
 */
export async function isAdminTeam(teamId: string, supabase: SupabaseClient): Promise<boolean> {
  if (!teamId) return false;

  try {
    const { data: team, error } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .maybeSingle();

    if (error) {
      console.error("Error checking admin team:", error);
      return false;
    }

    return team?.name === 'HeyKlever';
  } catch (error) {
    console.error("Error in isAdminTeam:", error);
    return false;
  }
}

/**
 * Check if a team has an active subscription
 * Admin teams (HeyKlever) automatically bypass subscription checks
 */
export async function hasActiveSubscription(teamId: string, supabase: SupabaseClient): Promise<boolean> {
  if (!teamId) return false;

  // Check if team is an admin team first
  const isAdmin = await isAdminTeam(teamId, supabase);
  if (isAdmin) {
    return true; // Admin teams bypass subscription checks
  }

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('team_id', teamId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (error) {
    console.error("Error checking subscription:", error);
    return false;
  }

  return !!subscription;
}

