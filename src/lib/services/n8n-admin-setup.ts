import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Generate a secure password meeting requirements:
 * - Minimum 8 characters
 * - At least 1 number
 * - At least 1 capital letter
 */
function generateSecurePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  // Ensure at least one of each required type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)]; // 1 capital
  password += numbers[Math.floor(Math.random() * numbers.length)]; // 1 number
  password += lowercase[Math.floor(Math.random() * lowercase.length)]; // 1 lowercase
  
  // Fill the rest randomly (minimum 8 total, so 5 more)
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < 12; i++) { // Generate 12 char password for security
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Wait for n8n to be ready by polling /rest/login endpoint
 * Returns true when n8n is ready (shows setup page), false on timeout
 * Based on: https://docs.n8n.io/api/rest/authentication/#check-if-setup-is-needed
 */
async function waitForN8nReady(n8nUrl: string, maxWaitTime: number = 300000): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 5000; // Check every 5 seconds
  const loginUrl = `${n8nUrl}/rest/login`;
  
  console.log(`Waiting for n8n to be ready at ${loginUrl}...`);
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(loginUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      // n8n /rest/login endpoint behavior:
      // - Returns 200 with HTML setup page when no owner exists (ready for setup)
      // - Returns 401 when owner exists (already set up)
      // - Returns 503 or connection error when not ready yet
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type') || '';
        
        // If it's HTML, check if it's the setup page
        if (contentType.includes('text/html')) {
          const text = await response.text();
          if (text.includes('setup') || text.includes('owner') || text.includes('Welcome to n8n')) {
            console.log('✓ n8n is ready for owner setup (HTML setup page detected)');
            return true;
          }
        }
        
        // If it's JSON, check the response
        if (contentType.includes('application/json')) {
          try {
            const json = await response.json();
            // Some n8n versions return JSON indicating setup is needed
            if (json.setupRequired !== false || json.requiresSetup === true) {
              console.log('✓ n8n is ready for owner setup (JSON indicates setup needed)');
              return true;
            }
          } catch {
            // Invalid JSON, but got 200 - might be ready
            console.log('✓ n8n returned 200, assuming ready for setup');
            return true;
          }
        }
        
        // Got 200 but unclear content - assume ready
        console.log('✓ n8n returned 200, assuming ready for setup');
        return true;
      }
      
      // If we get 401, n8n already has an owner - we can still try to create (will fail gracefully)
      if (response.status === 401) {
        console.log('n8n returned 401 - owner may already exist, will attempt setup anyway');
        return true;
      }
      
      // 503 or other errors mean n8n is not ready yet
      if (response.status === 503) {
        console.log(`n8n returned 503 (not ready), retrying in ${pollInterval/1000}s...`);
      } else {
        console.log(`n8n returned ${response.status}, retrying in ${pollInterval/1000}s...`);
      }
      
    } catch (error) {
      // Connection error - n8n not ready yet, continue polling
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`n8n not reachable yet (${errorMsg}), retrying in ${pollInterval/1000}s... (${elapsed}s elapsed)`);
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  console.error(`Timeout waiting for n8n to be ready after ${maxWaitTime/1000}s`);
  return false;
}

/**
 * Create n8n owner account via REST API
 */
async function createN8nOwner(
  n8nUrl: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<boolean> {
  const setupUrl = `${n8nUrl}/rest/owner/setup`;
  
  console.log(`Creating n8n owner account at ${setupUrl}`);
  console.log(`Email: ${email}, FirstName: ${firstName}, LastName: ${lastName}`);
  
  try {
    const response = await fetch(setupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to create n8n owner: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return false;
    }
    
    const result = await response.json();
    console.log('✓ n8n owner account created successfully');
    console.log(`Response:`, result);
    return true;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error creating n8n owner: ${errorMessage}`);
    return false;
  }
}

/**
 * Main function to setup n8n admin account after container is ready
 * This should be called after n8n container is created and started
 */
export async function setupN8nAdminAccount(teamId: string): Promise<{ success: boolean; password?: string; error?: string }> {
  try {
    console.log(`Setting up n8n admin account for team ${teamId}`);
    
    // 1. Get n8n instance from database
    const { data: n8nInstance, error: fetchError } = await supabaseAdmin
      .from('n8n_instances')
      .select('*')
      .eq('team_id', teamId)
      .single();
    
    if (fetchError || !n8nInstance) {
      const errorMsg = `n8n instance not found for team ${teamId}: ${fetchError?.message || 'Not found'}`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // Check if password already exists
    if (n8nInstance.admin_password) {
      console.log(`n8n admin account already exists for team ${teamId}`);
      return { success: true, password: n8nInstance.admin_password };
    }
    
    const n8nUrl = n8nInstance.url;
    const adminEmail = n8nInstance.admin_email;
    const containerName = n8nInstance.container_name || 'n8n';
    const plan = n8nInstance.plan || 'default';
    
    if (!n8nUrl || !adminEmail) {
      const errorMsg = `Missing required fields: url=${n8nUrl}, admin_email=${adminEmail}`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // 2. Wait for n8n to be ready
    const isReady = await waitForN8nReady(n8nUrl, 300000); // 5 minutes max
    if (!isReady) {
      const errorMsg = 'n8n did not become ready within timeout period';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // 3. Generate secure password
    const password = generateSecurePassword();
    console.log(`Generated secure password (length: ${password.length})`);
    
    // 4. Create owner account
    const ownerCreated = await createN8nOwner(
      n8nUrl,
      adminEmail,
      password,
      containerName, // firstName
      plan // lastName
    );
    
    if (!ownerCreated) {
      const errorMsg = 'Failed to create n8n owner account';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // 5. Update database with password
    const { error: updateError } = await supabaseAdmin
      .from('n8n_instances')
      .update({
        admin_password: password,
      })
      .eq('id', n8nInstance.id);
    
    if (updateError) {
      console.error(`Failed to update password in database: ${updateError.message}`);
      // Password was created but not stored - still return success but log warning
      console.warn('WARNING: n8n owner created but password not stored in database');
      return { success: true, password, error: 'Password created but not stored in database' };
    }
    
    console.log(`✓ n8n admin account setup completed for team ${teamId}`);
    return { success: true, password };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error setting up n8n admin account: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

