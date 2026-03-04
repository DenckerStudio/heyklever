import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for Microsoft Token Response
interface MicrosoftTokenResponse {
  token_type: string;
  scope: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
  refresh_token?: string;
  id_token?: string;
}

export const MICROSOFT_GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
export const MICROSOFT_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

/**
 * Gets a valid access token for a Microsoft integration.
 * Refreshes the token if it is expired or close to expiring.
 */
export async function getMicrosoftAccessToken(
  supabase: SupabaseClient,
  teamId: string
): Promise<string | null> {
  // 1. Fetch the integration account
  const { data: account, error } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('team_id', teamId)
    .in('provider', ['onedrive', 'microsoft']) // Support both legacy onedrive and new microsoft
    .single();

  if (error || !account) {
    console.error('Microsoft integration not found for team:', teamId, error);
    return null;
  }

  // 2. Check if token is valid (add 5 minute buffer)
  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5 minutes

  if (account.access_token && expiresAt > now + buffer) {
    return account.access_token;
  }

  // 3. Refresh token if needed
  if (!account.refresh_token) {
    console.error('No refresh token available for Microsoft integration');
    return null;
  }

  // We need client_id and client_secret. They should be stored in the integration account.
  if (!account.client_id || !account.client_secret) {
    console.error('Missing client_id or client_secret for Microsoft integration');
    return null;
  }

  try {
    const params = new URLSearchParams({
      client_id: account.client_id,
      client_secret: account.client_secret,
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
      scope: account.scope || 'Files.Read.All User.Read offline_access', // Default fallback
    });

    const tokenUrl = account.access_token_url || MICROSOFT_TOKEN_ENDPOINT;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to refresh Microsoft token:', errorText);
      // Optional: Update status to 'disconnected' or 'error' in DB?
      return null;
    }

    const data = (await response.json()) as MicrosoftTokenResponse;

    // 4. Update DB with new tokens
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    
    const { error: updateError } = await supabase
      .from('integration_accounts')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || account.refresh_token, // Keep old if not rotated
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Failed to update refreshed token in DB:', updateError);
    }

    return data.access_token;

  } catch (err) {
    console.error('Error refreshing Microsoft token:', err);
    return null;
  }
}

/**
 * Helper to make authenticated Graph API calls
 */
export async function callMicrosoftGraph(
  supabase: SupabaseClient,
  teamId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
) {
  const accessToken = await getMicrosoftAccessToken(supabase, teamId);
  if (!accessToken) {
    throw new Error('Failed to get access token');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${MICROSOFT_GRAPH_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
