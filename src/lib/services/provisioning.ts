import { createClient } from '@supabase/supabase-js';
import { 
  Configuration, 
  VPSVirtualMachineApi, 
  VPSOSTemplatesApi,
  VPSDataCentersApi,
  VPSDockerManagerApi,
  VPSV1VirtualMachinePurchaseRequest,
  VPSV1VirtualMachineSetupRequest,
  VPSV1VirtualMachineDockerManagerUpRequest
} from 'hostinger-api-sdk';

// Initialize Service Role Client for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Get Hostinger API key from environment
 * Best practice: Read from env each time to ensure we have the latest value
 */
function getHostingerApiKey(): string {
  const apiKey = process.env.HOSTINGER_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('HOSTINGER_API_KEY environment variable is not set. Please set it in your .env.local file.');
}
  return apiKey.trim();
}

/**
 * Create Hostinger Configuration with Bearer token authentication
 * Best practice: Create fresh config for each operation to ensure API key is current
 */
function createHostingerConfig(): Configuration {
  const apiKey = getHostingerApiKey();
  // SDK automatically adds "Bearer " prefix via setBearerAuthToObject
  return new Configuration({
    accessToken: apiKey,
  });
}

/**
 * Get Hostinger API clients with fresh configuration
 * Best practice: Create clients dynamically to ensure authentication is current
 */
export function getHostingerClients() {
  const config = createHostingerConfig();
  return {
    vpsApi: new VPSVirtualMachineApi(config),
    osApi: new VPSOSTemplatesApi(config),
    dcApi: new VPSDataCentersApi(config),
    dockerApi: new VPSDockerManagerApi(config),
  };
}

export type VPSStatus = 'provisioning' | 'installing_n8n' | 'running' | 'stopped' | 'error';

/**
 * Retry utility with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 403) {
        throw error; // Bad request, unauthorized, or forbidden - don't retry
      }
      
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Get user-friendly error message from Hostinger API error
 */
function getErrorMessage(error: any): string {
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    return JSON.stringify(data);
  }
  
  if (error.message) {
    // Check for common error patterns
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Hostinger API authentication failed. Please check your API key.';
    }
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'Hostinger API access forbidden. Please check your API permissions.';
    }
    if (error.message.includes('402') || error.message.includes('Payment')) {
      return 'Insufficient balance in Hostinger account. Please add funds.';
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return 'Request to Hostinger API timed out. Please try again.';
    }
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return 'Cannot connect to Hostinger API. Please check your network connection.';
    }
    return error.message;
  }
  
  return 'Unknown error occurred during VPS provisioning';
}

// Mapping internal slugs to Hostinger Plan Item IDs
// Format: hostingercom-vps-{plan}-{currency}-{period}
// Example: hostingercom-vps-kvm2-usd-1m
// Reference: https://developers.hostinger.com/#tag/vps-virtual-machine/POST/api/vps/v1/virtual-machines.body.item_id
const PLAN_MAPPING: Record<string, string> = {
  'kvm-1': 'hostingercom-vps-kvm1-usd-1m', 
  'kvm-2': 'hostingercom-vps-kvm2-usd-1m',
  'kvm-4': 'hostingercom-vps-kvm4-usd-1m',
  'kvm-8': 'hostingercom-vps-kvm8-usd-1m'
};

// Map UI locations to Data Center IDs (These need to be verified with getDataCenterListV1)
// Default mappings - fallback if API fails
const FALLBACK_LOCATION_MAPPING: Record<string, number> = {
  'lithuania': 1,
  'france': 2, 
  'united-kingdom': 3,
  'germany': 4,
  'united-states': 5,
  'brazil': 6,
  'india': 7,
  'indonesia': 8,
  'malaysia': 9
};

// Cache for data center mappings (fetched from API)
let dataCenterCache: Record<string, number> | null = null;
let dataCenterCacheTime: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Map location names to search terms for API lookup
const LOCATION_SEARCH_TERMS: Record<string, string[]> = {
  'lithuania': ['lithuania', 'vilnius', 'lt'],
  'france': ['france', 'paris', 'fr'],
  'united-kingdom': ['united kingdom', 'uk', 'london', 'gb'],
  'germany': ['germany', 'frankfurt', 'de'],
  'united-states': ['united states', 'usa', 'us', 'america'],
  'brazil': ['brazil', 'sao paulo', 'br'],
  'india': ['india', 'mumbai', 'in'],
  'indonesia': ['indonesia', 'jakarta', 'id'],
  'malaysia': ['malaysia', 'kuala lumpur', 'my'],
};

/**
 * Fetches data centers from Hostinger API and maps UI locations to data center IDs
 * Best practice: Use fresh API client for each request
 */
async function getDataCenterId(location: string): Promise<number> {
  // Check cache first
  if (dataCenterCache && Date.now() - dataCenterCacheTime < CACHE_TTL) {
    if (dataCenterCache[location]) {
      return dataCenterCache[location];
    }
  }

  try {
    // Create fresh API client with current API key
    const { dcApi } = getHostingerClients();
    const response = await dcApi.getDataCenterListV1();
    const dataCenters = (response.data as any).data?.data || (response.data as any).data || (response.data as any);
    
    if (!Array.isArray(dataCenters)) {
      throw new Error('Invalid data centers response format');
    }

    // Build mapping from API response
    const mapping: Record<string, number> = {};
    const searchTerms = LOCATION_SEARCH_TERMS[location] || [location.toLowerCase()];

    for (const dc of dataCenters) {
      const dcName = (dc.name || '').toLowerCase();
      const dcLocation = (dc.location || '').toLowerCase();
      const dcId = dc.id || dc.data_center_id;

      if (!dcId) continue;

      // Check if this data center matches our location
      for (const term of searchTerms) {
        if (dcName.includes(term) || dcLocation.includes(term)) {
          mapping[location] = Number(dcId);
          break;
        }
      }
    }

    // Update cache
    if (mapping[location]) {
      dataCenterCache = { ...dataCenterCache, ...mapping };
      dataCenterCacheTime = Date.now();
      console.log(`Mapped location "${location}" to data center ID ${mapping[location]}`);
      return mapping[location];
    }

    // If not found, try fallback
    console.warn(`Data center not found for location "${location}", using fallback`);
    return FALLBACK_LOCATION_MAPPING[location] || FALLBACK_LOCATION_MAPPING['united-states'] || 5;

  } catch (error: any) {
    const errorData = error.response?.data || error.message || error;
    console.error('Failed to fetch data centers from Hostinger API:', errorData);
    
    // Check if it's an authentication error
    if (errorData?.message?.includes('Unauthenticated') || errorData?.includes('Unauthenticated')) {
      console.error('❌ Hostinger API Authentication Failed when fetching data centers!');
      console.error('Please verify HOSTINGER_API_KEY is set correctly in your environment variables.');
    }
    
    console.warn(`Using fallback mapping for location "${location}"`);
    return FALLBACK_LOCATION_MAPPING[location] || FALLBACK_LOCATION_MAPPING['united-states'] || 5;
  }
}

// Generate password in format: (h5B7k)G/va(x,rxoRLw
// Format: alphanumeric + special chars, ~16-20 chars
export function generatePassword(): string {
    // Mix of alphanumeric and special characters similar to example
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()/.,";
    let password = "";
    const length = 16 + Math.floor(Math.random() * 4); // 16-19 chars
    
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure it has at least one of each required type
    if (!/[A-Z]/.test(password)) {
        const pos = Math.floor(Math.random() * password.length);
        password = password.slice(0, pos) + 'A' + password.slice(pos + 1);
    }
    if (!/[a-z]/.test(password)) {
        const pos = Math.floor(Math.random() * password.length);
        password = password.slice(0, pos) + 'a' + password.slice(pos + 1);
    }
    if (!/[0-9]/.test(password)) {
        const pos = Math.floor(Math.random() * password.length);
        password = password.slice(0, pos) + '1' + password.slice(pos + 1);
    }
    
    return password;
}

async function getDebianTemplateId(): Promise<number> {
  try {
    // Create fresh API client with current API key (best practice)
    const { osApi } = getHostingerClients();
    const response = await retryWithBackoff(() => osApi.getTemplatesV1());
    const templates = (response.data as any).data || (response.data as any);
    // Find Debian 12 or 11
    const template = templates?.find((t: any) => 
      t.name.toLowerCase().includes('debian') && !t.name.toLowerCase().includes('old')
    );
    return template ? template.id : 105; // Fallback ID for Debian
  } catch (error: any) {
    console.warn('Failed to fetch OS templates, using default Debian ID 105:', getErrorMessage(error));
    return 105;
  }
}

// n8n Docker Compose configuration template for shared VPS
// Containers use internal port 5678, nginx handles external routing by subdomain
function getN8nDockerCompose(config: {
  containerName: string;
  password: string;
  adminEmail: string;
  firstName: string;
  lastName: string;
  editorBaseUrl: string;
  webhookUrl: string;
}): string {
  return `version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: ${config.containerName}
    restart: unless-stopped
    # No port mapping - nginx handles routing by subdomain
    # All containers use internal port 5678
    expose:
      - "5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${config.password}
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - N8N_USER_MANAGEMENT_DISABLED=false
      - N8N_EDITOR_BASE_URL=${config.editorBaseUrl}
      - N8N_WEBHOOK_URL=${config.webhookUrl}
      - N8N_ENDPOINT_REST=/rest
    volumes:
      - ${config.containerName}_data:/home/node/.n8n
    networks:
      - n8n-network

volumes:
  ${config.containerName}_data:

networks:
  n8n-network:
    driver: bridge
`;
}

/**
 * Construct n8n base URL from VPS metadata
 * Tries to extract server ID (srvXXXXX) from VPS info, falls back to IP-based URL
 */
export async function getN8nBaseUrl(vmId: number, instanceId: string): Promise<string> {
  try {
    // Try to get VPS details to extract server ID
    const { vpsApi } = getHostingerClients();
    const response = await retryWithBackoff(() => vpsApi.getVirtualMachineDetailsV1(vmId), 2, 1000);
    const vmInfo = (response.data as any).data;
    
    // Try to extract server ID from various possible fields
    const serverId = vmInfo?.server_id || vmInfo?.id || vmInfo?.hostname?.match(/srv(\d+)/)?.[1];
    
    if (serverId) {
      // Format: https://n8n.srvXXXXX.hstgr.cloud
      const serverIdStr = String(serverId).replace(/^srv/i, '');
      return `https://n8n.srv${serverIdStr}.hstgr.cloud`;
    }
    
    // Fallback to IP-based URL
    const ipAddress = vmInfo?.ip_address;
    if (ipAddress) {
      return `https://${ipAddress}:5678`;
    }
    
    // Last resort: use instance ID to construct a placeholder
    console.warn(`Could not determine n8n URL from VPS metadata, using fallback`);
    return `https://n8n-${instanceId.slice(0, 8)}.hstgr.cloud`;
  } catch (error: any) {
    console.error('Error getting n8n base URL:', getErrorMessage(error));
    // Return a fallback URL
    return `https://n8n-${instanceId.slice(0, 8)}.hstgr.cloud`;
  }
}

/**
 * Wait for n8n to become ready by polling the health endpoint
 */
export async function waitForN8n(baseUrl: string, timeoutMs: number = 300000): Promise<void> {
  const start = Date.now();
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/healthz`;
  
  console.log(`Waiting for n8n to be ready at ${healthUrl}...`);
  
  while (Date.now() - start < timeoutMs) {
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✓ n8n is ready at ${baseUrl}`);
          return;
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          // Timeout - will retry
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      // Health check failed, will retry
    }
    
    // Wait 5 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error(`n8n did not become ready within ${timeoutMs}ms`);
}

/**
 * Wait for n8n setup page to be available by polling /rest/login
 * Returns when setup page is ready (indicated by specific response)
 */
async function waitForN8nSetupPage(baseUrl: string, timeoutMs: number = 60000): Promise<void> {
  const start = Date.now();
  const loginUrl = `${baseUrl.replace(/\/$/, '')}/rest/login`;
  
  console.log(`Waiting for n8n setup page at ${loginUrl}...`);
  
  while (Date.now() - start < timeoutMs) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(loginUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // If we get a response (even 401/403), n8n is ready
        // Setup page typically shows when no owner exists
        if (response.status === 200 || response.status === 401 || response.status === 403) {
          const text = await response.text().catch(() => '');
          // Check if it's the setup page (usually contains "setup" or "owner" in HTML)
          if (text.includes('setup') || text.includes('owner') || response.status === 401) {
            console.log(`✓ n8n setup page is ready`);
            return;
          }
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name !== 'AbortError') {
          throw fetchError;
        }
      }
    } catch (error) {
      // Will retry
    }
    
    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Don't throw - continue anyway, n8n might still accept the setup request
  console.warn(`Setup page check timed out, proceeding with owner setup anyway`);
}

/**
 * Create n8n owner user via REST API
 * Primary method: /rest/owner/setup (as recommended by user)
 * Falls back to other endpoints for compatibility
 */
export async function createN8nOwnerUser(config: {
  baseUrl: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  basicAuthUser?: string;
  basicAuthPassword?: string;
}): Promise<any> {
  const { baseUrl, email, password, firstName, lastName, basicAuthUser, basicAuthPassword } = config;
  
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // Prepare payload for /rest/owner/setup
  const ownerSetupPayload = {
    email,
    password,
    firstName,
    lastName,
  };
  
  try {
    // Step 1: Wait for n8n setup page to be available
    await waitForN8nSetupPage(cleanBaseUrl, 60000); // 1 minute timeout
    
    // Step 2: Try /rest/owner/setup as primary method (as recommended by user)
    console.log(`Attempting to create owner via /rest/owner/setup (primary method)...`);
    const ownerSetupUrl = `${cleanBaseUrl}/rest/owner/setup`;
    
    let response = await fetch(ownerSetupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(basicAuthUser && basicAuthPassword ? {
          'Authorization': `Basic ${Buffer.from(`${basicAuthUser}:${basicAuthPassword}`).toString('base64')}`
        } : {}),
      },
      body: JSON.stringify(ownerSetupPayload),
    });
    
    let data = await response.json().catch(() => ({}));
    
    // Success cases
    if (response.status === 200 || response.status === 201) {
      console.log(`✓ n8n owner user created successfully via /rest/owner/setup`);
      return data;
    }
    
    // Already initialized - treat as success
    if (response.status === 400 || response.status === 409) {
      console.log(`✓ n8n already initialized (status ${response.status})`);
      return { alreadyInitialized: true, ...data };
    }
    
    // If /rest/owner/setup fails, fall back to other endpoints
    console.log(`/rest/owner/setup returned ${response.status}, trying fallback endpoints...`);
    
    // Fallback 1: Try /rest/setup
    const setupUrl = `${cleanBaseUrl}/rest/setup`;
    const setupPayload = {
      email,
      firstName,
      lastName,
      password,
      allowUserManagement: true,
    };
    
    response = await fetch(setupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(basicAuthUser && basicAuthPassword ? {
          'Authorization': `Basic ${Buffer.from(`${basicAuthUser}:${basicAuthPassword}`).toString('base64')}`
        } : {}),
      },
      body: JSON.stringify(setupPayload),
    });
    
    data = await response.json().catch(() => ({}));
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✓ n8n owner user created successfully via /rest/setup`);
      return data;
    }
    
    if (response.status === 400 || response.status === 409) {
      console.log(`✓ n8n already initialized via /rest/setup (status ${response.status})`);
      return { alreadyInitialized: true, ...data };
    }
    
    // Fallback 2: Try /api/v1/users
    const apiV1UsersUrl = `${cleanBaseUrl}/api/v1/users`;
    const payload = {
      email,
      password,
      firstName,
      lastName,
    };
    
    response = await fetch(apiV1UsersUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(basicAuthUser && basicAuthPassword ? {
          'Authorization': `Basic ${Buffer.from(`${basicAuthUser}:${basicAuthPassword}`).toString('base64')}`
        } : {}),
      },
      body: JSON.stringify(payload),
    });
    
    data = await response.json().catch(() => ({}));
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✓ n8n owner user created successfully via /api/v1/users`);
      return data;
    }
    
    // Fallback 3: Try /rest/users
    const restUsersUrl = `${cleanBaseUrl}/rest/users`;
    response = await fetch(restUsersUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(basicAuthUser && basicAuthPassword ? {
          'Authorization': `Basic ${Buffer.from(`${basicAuthUser}:${basicAuthPassword}`).toString('base64')}`
        } : {}),
      },
      body: JSON.stringify(payload),
    });
    
    data = await response.json().catch(() => ({}));
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✓ n8n owner user created successfully via /rest/users`);
      return data;
    }
    
    // Already initialized or user exists
    if (response.status === 400 || response.status === 409) {
      console.log(`✓ n8n already initialized or user exists (status ${response.status})`);
      return { alreadyInitialized: true, ...data };
    }
    
    throw new Error(`Owner setup failed with status ${response.status}: ${JSON.stringify(data)}`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('Owner setup failed')) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create n8n owner user: ${errorMessage}`);
  }
}

/**
 * Get shared VPS VM ID from environment or database
 */
async function getSharedVpsVmId(): Promise<number> {
  // First try environment variable
  const envVmId = process.env.SHARED_VPS_HOSTINGER_VM_ID;
  if (envVmId) {
    const vmId = Number(envVmId);
    if (!isNaN(vmId) && vmId > 0) {
      return vmId;
    }
  }
  
  // Try to find shared VPS in database by IP
  const sharedVpsIp = process.env.SHARED_VPS_IP || '72.62.148.138';
  const { data: sharedInstance } = await supabaseAdmin
    .from('vps_instances')
    .select('provider_id')
    .eq('ip_address', sharedVpsIp)
    .single();
  
  if (sharedInstance?.provider_id) {
    const vmId = Number(sharedInstance.provider_id);
    if (!isNaN(vmId) && vmId > 0) {
      return vmId;
    }
  }
  
  throw new Error('SHARED_VPS_HOSTINGER_VM_ID environment variable is not set. Please set it to the Hostinger VM ID of the shared VPS.');
}

/**
 * Create n8n Docker container for a team on the shared VPS
 * This replaces the old provisionVPS function - creates a container instead of purchasing a new VPS
 */
export async function createN8nContainer(
  teamId: string,
  teamSlug: string,
  teamName: string
): Promise<{ success: boolean; instanceId?: string; error?: string }> {
  try {
    console.log(`Creating n8n container for team ${teamId} (${teamSlug}) on shared VPS`);
    
    // 1. Validate environment variables
    const adminEmail = process.env.N8N_ADMIN_EMAIL;
    if (!adminEmail) {
      throw new Error('N8N_ADMIN_EMAIL environment variable is not set');
    }
    
    const sharedVpsIp = process.env.SHARED_VPS_IP || '72.62.148.138';
    
    // 2. Get shared VPS VM ID
    const sharedVmId = await getSharedVpsVmId();
    console.log(`✓ Using shared VPS VM ID: ${sharedVmId}`);
    
    // 3. Generate container configuration
    const containerName = `n8n-${teamSlug}`;
    const n8nDomain = `${teamSlug}.heyklever.ai`;
    const editorBaseUrl = `https://${n8nDomain}`;
    const webhookUrl = `https://${n8nDomain}`;
    
    // Generate n8n password
    const n8nPassword = generatePassword();
    
    // Generate owner credentials
    const firstName = teamName || 'Team';
    const lastName = teamSlug || teamId.slice(0, 8);
    
    // 4. Check if container already exists
    const { data: existingInstance } = await supabaseAdmin
      .from('vps_instances')
      .select('id, status, n8n_container_name')
      .eq('team_id', teamId)
      .single();
    
    if (existingInstance && existingInstance.n8n_container_name === containerName) {
      console.log(`Container ${containerName} already exists for team ${teamId}`);
      return { success: true, instanceId: existingInstance.id };
    }
    
    // 5. Create Docker Compose content
    const composeContent = getN8nDockerCompose({
      containerName,
      password: n8nPassword,
      adminEmail,
      firstName,
      lastName,
      editorBaseUrl,
      webhookUrl,
    });
    
    const dockerRequest: VPSV1VirtualMachineDockerManagerUpRequest = {
      project_name: containerName, // Use container name as project name
      content: composeContent,
      environment: null
    };
    
    // 6. Create container via Hostinger Docker Manager API
    console.log(`Creating Docker container: ${containerName}`);
    console.log(`  Domain: ${n8nDomain}`);
    console.log(`  Editor URL: ${editorBaseUrl}`);
    console.log(`  Admin Email: ${adminEmail}`);
    
    const { dockerApi } = getHostingerClients();
    try {
      await retryWithBackoff(
        () => dockerApi.createNewProjectV1(sharedVmId, dockerRequest),
        3,
        2000
      );
      console.log(`✓ Container created successfully: ${containerName}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to create container: ${errorMsg}`);
      throw new Error(`Container creation failed: ${errorMsg}`);
    }
    
    // 7. Create or update database record
    const instanceData: any = {
      team_id: teamId,
      status: 'provisioning',
      n8n_domain: n8nDomain,
      n8n_container_name: containerName,
      shared_vps_ip: sharedVpsIp,
      n8n_url: editorBaseUrl,
      n8n_credentials: {
        n8n_password: n8nPassword,
        n8n_user: 'admin',
        admin_email: adminEmail,
      },
      updated_at: new Date().toISOString(),
    };
    
    const { data: instance, error: dbError } = await supabaseAdmin
      .from('vps_instances')
      .upsert(instanceData, {
        onConflict: 'team_id',
      })
      .select()
      .single();
    
    if (dbError || !instance) {
      throw new Error(`Failed to store container info: ${dbError?.message || 'Unknown error'}`);
    }
    
    console.log(`✓ Container info stored in database (instance ID: ${instance.id})`);
    
    // 8. Wait for container to be ready (poll container status)
    console.log(`Waiting for container ${containerName} to start...`);
    let containerReady = false;
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check container status via Docker Manager API
        // Note: Hostinger API might have a way to check container status
        // For now, we'll wait a bit and then try to access n8n
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        // Try to access n8n health endpoint
        try {
          const healthResponse = await fetch(`${editorBaseUrl}/healthz`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });
          if (healthResponse.ok) {
            containerReady = true;
            console.log(`✓ Container is ready and n8n is responding`);
            break;
          }
        } catch {
          // Not ready yet, continue waiting
        }
      } catch (error) {
        // Continue waiting
      }
    }
    
    if (!containerReady) {
      console.warn(`Container may not be fully ready, but proceeding with owner setup`);
    }
    
    // 9. Wait for n8n setup page
    console.log(`Waiting for n8n setup page at ${editorBaseUrl}...`);
    try {
      await waitForN8nSetupPage(editorBaseUrl, 60000); // 1 minute timeout
    } catch (error) {
      console.warn(`Setup page check failed, but proceeding anyway: ${error}`);
    }
    
    // 10. Create owner account via /rest/owner/setup
    console.log(`Creating n8n owner account...`);
    try {
      await createN8nOwnerUser({
        baseUrl: editorBaseUrl,
        email: adminEmail,
        password: n8nPassword,
        firstName,
        lastName,
        basicAuthUser: 'admin',
        basicAuthPassword: n8nPassword,
      });
      console.log(`✓ n8n owner account created`);
      
      // Update status to running
      await supabaseAdmin
        .from('vps_instances')
        .update({
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id);
    } catch (ownerError: unknown) {
      const errorMessage = ownerError instanceof Error ? ownerError.message : 'Unknown error';
      console.warn(`Owner account creation failed (may already exist): ${errorMessage}`);
      // Continue anyway - n8n will work, user can complete setup manually
      // Update status to installing_n8n (owner setup pending)
      await supabaseAdmin
        .from('vps_instances')
        .update({
          status: 'installing_n8n',
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id);
    }
    
    console.log(`✓ n8n container setup completed for team ${teamId}`);
    return { success: true, instanceId: instance.id };
    
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating n8n container:', errorMsg);
    
    // Update instance status to error if it exists
    const { data: existingInstance } = await supabaseAdmin
      .from('vps_instances')
      .select('id')
      .eq('team_id', teamId)
      .single();
    
    if (existingInstance) {
      await supabaseAdmin
        .from('vps_instances')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInstance.id);
    }
    
    return { success: false, error: errorMsg };
  }
}

export async function deployN8nViaDocker(
  vmId: number, 
  teamSlug: string, 
  instanceId: string, 
  teamName: string,
  maxRetries: number = 3
): Promise<{ password: string; baseUrl: string }> {
  let lastError: any;
  
  // Get admin email from environment
  const adminEmail = process.env.N8N_ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('N8N_ADMIN_EMAIL environment variable is not set');
  }
  
  // Get n8n base URL from VPS metadata
  const baseUrl = await getN8nBaseUrl(vmId, instanceId);
  const webhookUrl = baseUrl;
  const editorBaseUrl = baseUrl;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Generate n8n password
      const n8nPassword = generatePassword();
      
      // Generate owner credentials
      const firstName = teamName || 'Team';
      const lastName = teamSlug || instanceId.slice(0, 8);
      
      // Create Docker Compose with all environment variables
      // For legacy VPS deployments, use a generic container name
      const containerName = `n8n-${teamSlug}`;
      const composeContent = getN8nDockerCompose({
        containerName,
        password: n8nPassword,
        adminEmail,
        firstName,
        lastName,
        editorBaseUrl,
        webhookUrl,
      });

      const dockerRequest: VPSV1VirtualMachineDockerManagerUpRequest = {
        project_name: 'n8n',
        content: composeContent,
        environment: null
      };

      console.log(`Deploying n8n via Docker Manager on VM ${vmId} (attempt ${attempt}/${maxRetries})...`);
      console.log(`  Base URL: ${baseUrl}`);
      console.log(`  Admin Email: ${adminEmail}`);
      
      // Create fresh API client with current API key (best practice)
      const { dockerApi } = getHostingerClients();
      await retryWithBackoff(() => dockerApi.createNewProjectV1(vmId, dockerRequest), 2, 2000);
      
      // Store n8n credentials in DB
      const { data: instance } = await supabaseAdmin
        .from('vps_instances')
        .select('n8n_credentials')
        .eq('id', instanceId)
        .single();
      
      await supabaseAdmin
        .from('vps_instances')
        .update({
          n8n_credentials: {
            root_password: instance?.n8n_credentials?.root_password || '',
            n8n_password: n8nPassword,
            n8n_user: 'admin'
          }
        })
        .eq('id', instanceId);
      
      console.log(`✓ n8n deployed successfully on VM ${vmId}`);
      return { password: n8nPassword, baseUrl };
    } catch (error: any) {
      lastError = error;
      console.error(`Failed to deploy n8n (attempt ${attempt}/${maxRetries}):`, getErrorMessage(error));
      
      if (attempt < maxRetries) {
        const delay = 3000 * attempt; // 3s, 6s, 9s
        console.log(`Retrying n8n deployment in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to deploy n8n after ${maxRetries} attempts: ${getErrorMessage(lastError)}`);
}

/**
 * @deprecated This function purchases a new VPS for each team (legacy architecture).
 * For new teams, use `createN8nContainer()` instead, which creates a container on the shared VPS.
 * 
 * This function is kept for backward compatibility with existing VPS instances.
 * New teams should use the shared VPS architecture with Docker containers.
 * 
 * @see createN8nContainer - Use this for new team provisioning
 */
export async function provisionVPS(teamId: string, planId: string, teamSlug: string, location: string, addons: string[]) {
  try {
    // 0. Validate Hostinger API Key first
    let apiKey: string;
    try {
      apiKey = getHostingerApiKey();
      if (apiKey.length < 20) {
        throw new Error(`API key appears to be invalid (too short: ${apiKey.length} chars)`);
      }
      console.log(`✓ Hostinger API Key validated (${apiKey.length} chars)`);
    } catch (keyError: unknown) {
      const errorMsg = keyError instanceof Error ? keyError.message : 'HOSTINGER_API_KEY is not set';
      console.error('❌', errorMsg);
      console.error('Please set HOSTINGER_API_KEY in your .env.local file and restart the server.');
      throw new Error(errorMsg);
    }

    // 1. Get Plan Details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('vps_plans')
      .select('slug, hostinger_plan_id')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('❌ Invalid Plan:', planError?.message || 'Plan not found');
      throw new Error(`Invalid Plan: ${planError?.message || 'Plan not found'}`);
    }

    // Use hostinger_plan_id from database, or fallback to mapping, or default to kvm-1
    // Format should be: hostingercom-vps-{plan}-{currency}-{period}
    const hostingerPlanId = plan.hostinger_plan_id || PLAN_MAPPING[plan.slug] || 'hostingercom-vps-kvm1-usd-1m';
    const templateId = await getDebianTemplateId();
    const datacenterId = await getDataCenterId(location);
    const generatedPassword = generatePassword();
    const enableBackup = addons.includes('daily-backups');
    
    console.log(`📋 Provisioning Details:`);
    console.log(`  Plan: ${plan.slug} (${hostingerPlanId})`);
    console.log(`  Location: ${location} (DC ID: ${datacenterId})`);
    console.log(`  Template ID: ${templateId}`);
    console.log(`  Hostname: ${teamSlug}.heyklever.ai`);
    console.log(`  Backups: ${enableBackup ? 'enabled' : 'disabled'}`);

    // 2. Prepare Purchase Request
    // Note: We omit ns1 and ns2 to use Hostinger's default DNS nameservers
    // If you need custom nameservers, you must first set up glue records at your domain registrar
    // and then provide the IP addresses (not domain names) in ns1 and ns2
    // Reference: https://support.hostinger.com/en/articles/how-to-point-a-domain-to-your-vps
    console.log(`  Item ID: ${hostingerPlanId} (from plan.hostinger_plan_id or fallback)`);
    
    // Build setup object - omitting ns1, ns2, public_key, and post_install_script_id
    // The API accepts these fields as optional even though the SDK types mark them as required
    const setup = {
            template_id: templateId,
            data_center_id: datacenterId,
        // post_install_script_id omitted - will be handled later
            password: generatedPassword,
            hostname: `${teamSlug}.heyklever.ai`,
            install_monarx: false,
            enable_backups: enableBackup,
        // ns1 and ns2 omitted - Hostinger will use default DNS automatically
        // public_key omitted - no SSH key needed
    } as VPSV1VirtualMachineSetupRequest;
    
    const purchaseRequest: VPSV1VirtualMachinePurchaseRequest = {
        item_id: hostingerPlanId,
        payment_method_id: 0, // 0 usually implies default/balance
        setup: setup,
        coupons: []
    };

    // 3. Call Hostinger API to create VPS
    console.log(`🚀 Calling Hostinger API to purchase VPS...`);
    console.log(`  API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`  Request:`, JSON.stringify({
      item_id: hostingerPlanId,
      data_center_id: datacenterId,
      template_id: templateId,
      hostname: `${teamSlug}.heyklever.ai`,
      enable_backups: enableBackup
    }, null, 2));
    
    // Create fresh API client with current API key (best practice)
    const { vpsApi } = getHostingerClients();
    
    let response: any;
    try {
      response = await retryWithBackoff(() => vpsApi.purchaseNewVirtualMachineV1(purchaseRequest), 3, 2000);
      
      // Log the full response structure for debugging
      console.log('✓ Hostinger API response received');
      console.log('  Response keys:', Object.keys(response || {}));
      if (response?.data) {
        console.log('  response.data keys:', Object.keys(response.data || {}));
        if (response.data?.data) {
          console.log('  response.data.data keys:', Object.keys(response.data.data || {}));
        }
      }
      console.log('  Full response:', JSON.stringify(response, null, 2));
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);
      console.error('❌ Hostinger API error:', errorMsg);
      
      // Log full error details for debugging
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response data:', JSON.stringify(error.response.data, null, 2));
        
        // If item_id is incorrect, provide helpful guidance
        if (error.response.status === 422 && error.response.data?.errors?.item_id) {
          console.error('');
          console.error('⚠️  Item ID Validation Error:');
          console.error(`  Current item_id: "${hostingerPlanId}"`);
          console.error('  The item_id might need to be:');
          console.error('    1. A numeric ID instead of a string');
          console.error('    2. Fetched from Hostinger\'s product catalog API');
          console.error('    3. A different format (e.g., with prefix/suffix)');
          console.error('  Please verify the hostinger_plan_id in your database matches Hostinger\'s API format.');
          console.error('  You may need to fetch available VPS plans from Hostinger API first.');
        }
      }
      if (error.message) {
        console.error('  Error message:', error.message);
      }
  
      // Check if it's an authentication error
      if (errorMsg.includes('Unauthenticated') || errorMsg.includes('401') || errorMsg.includes('authentication') || errorMsg.toLowerCase().includes('unauthorized')) {
        console.error('❌ Hostinger API Authentication Failed!');
        console.error('');
        console.error('TROUBLESHOOTING STEPS:');
        console.error('  1. Verify HOSTINGER_API_KEY is set in your .env.local file');
        console.error('  2. Check the API key is valid and not expired');
        console.error('  3. Ensure the API key has VPS management permissions');
        console.error('  4. Restart your server after setting the environment variable');
        console.error('  5. Test the API key using: npx tsx scripts/fetch_hostinger_data.ts');
        console.error('');
        console.error('Current API Key Status:');
        try {
          const currentKey = getHostingerApiKey();
          console.error(`  - Set: YES`);
          console.error(`  - Length: ${currentKey.length} characters`);
          console.error(`  - Preview: ${currentKey.substring(0, 10)}...`);
        } catch {
          console.error(`  - Set: NO`);
          console.error(`  - Error: API key not found in environment`);
        }
      }
      
      // Update instance status to error if it exists
      const { data: existingInstance } = await supabaseAdmin
    .from('vps_instances')
        .select('id')
    .eq('team_id', teamId)
    .single();

      if (existingInstance) {
        await supabaseAdmin
          .from('vps_instances')
          .update({
            status: 'error',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInstance.id);
      }
      
      throw new Error(`VPS provisioning failed: ${errorMsg}`);
    }
    
    // Extract VM ID from response - try multiple possible locations
    // Response structure can vary: response.data.data.id, response.data.id, response.id, etc.
    const vmId = 
      (response.data as any)?.data?.id || 
      (response.data as any)?.id || 
      (response as any)?.data?.id ||
      (response as any)?.id ||
      response?.id;

    if (!vmId) {
      const errorMsg = 'No VM ID returned from Hostinger API';
      console.error(errorMsg);
      console.error('Response structure:', JSON.stringify(response, null, 2));
      console.error('Attempted to extract from: response.data.data.id, response.data.id, response.id');
      throw new Error(errorMsg);
  }

    console.log(`✓ VPS created successfully with VM ID: ${vmId}`);

    // 4. Create DB Record
    const { data: instance, error } = await supabaseAdmin
    .from('vps_instances')
      .upsert({
      team_id: teamId,
      plan_id: planId,
      status: 'provisioning',
        provider_id: String(vmId),
        ip_address: null,
        location: location,
        os: 'debian',
        n8n_credentials: { root_password: generatedPassword }, // Will update with n8n password after deployment
        updated_at: new Date().toISOString()
    })
    .select()
    .single();

    if (error) throw error;

    // 5. n8n deployment will be handled by checkProvisionStatus when VM becomes active
    // No need for setTimeout - polling will handle it

    return { success: true, instanceId: instance.id };

  } catch (err: any) {
    const errorMsg = getErrorMessage(err);
    console.error('Error provisioning VPS:', errorMsg);
    
    // Update instance status to error if it exists
    const { data: existingInstance } = await supabaseAdmin
      .from('vps_instances')
      .select('id')
      .eq('team_id', teamId)
      .single();
    
    if (existingInstance) {
      await supabaseAdmin
        .from('vps_instances')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInstance.id);
    }
    
    // Fallback to Mock in development
    if (process.env.NODE_ENV === 'development') {
        console.warn('Falling back to MOCK provisioning due to error.');
        return mockProvisionVPS(teamId, planId, location);
    }

    return { success: false, error: errorMsg };
  }
}

// Fallback Mock
async function mockProvisionVPS(teamId: string, planId: string, location: string) {
    const { data, error } = await supabaseAdmin
      .from('vps_instances')
      .upsert({
        team_id: teamId,
        plan_id: planId,
        status: 'provisioning',
        provider_id: `mock-hostinger-${Date.now()}`,
        ip_address: null,
        location: location,
        os: 'debian',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, instanceId: data.id };
}

/**
 * Check container status for a team
 * This checks if n8n is accessible at the n8n_domain and updates status accordingly
 */
async function checkContainerStatus(instance: any): Promise<{ status: VPSStatus; instance?: any; error?: string }> {
  try {
    const n8nDomain = instance.n8n_domain;
    if (!n8nDomain) {
      console.error('Container instance missing n8n_domain');
      return { status: 'error', error: 'Missing n8n_domain', instance };
    }

    const baseUrl = `https://${n8nDomain}`;
    let newStatus: VPSStatus = instance.status;
    const updates: any = {};

    // Check if n8n is accessible
    try {
      const healthResponse = await fetch(`${baseUrl}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (healthResponse.ok) {
        // n8n is responding
        if (instance.status === 'provisioning' || instance.status === 'installing_n8n') {
          // Check if owner account needs to be created
          try {
            const adminEmail = process.env.N8N_ADMIN_EMAIL;
            if (adminEmail && instance.n8n_credentials?.n8n_password) {
              const { data: team } = await supabaseAdmin
                .from('teams')
                .select('slug, name')
                .eq('id', instance.team_id)
                .single();

              if (team) {
                // Try to create owner if not already done
                await createN8nOwnerUser({
                  baseUrl,
                  email: adminEmail,
                  password: instance.n8n_credentials.n8n_password,
                  firstName: team.name || 'Team',
                  lastName: team.slug || instance.team_id.slice(0, 8),
                  basicAuthUser: 'admin',
                  basicAuthPassword: instance.n8n_credentials.n8n_password,
                });
              }
            }
            newStatus = 'running';
            updates.n8n_base_url = `${baseUrl}/rest`;
            updates.n8n_api_user = 'admin';
            updates.n8n_api_password = instance.n8n_credentials?.n8n_password || '';
            updates.n8n_url = baseUrl;
          } catch (ownerError: unknown) {
            // Owner might already exist, check if n8n is still accessible
            const errorMessage = ownerError instanceof Error ? ownerError.message : 'Unknown error';
            if (errorMessage.includes('already initialized') || errorMessage.includes('409')) {
              newStatus = 'running';
              updates.n8n_base_url = `${baseUrl}/rest`;
              updates.n8n_api_user = 'admin';
              updates.n8n_api_password = instance.n8n_credentials?.n8n_password || '';
              updates.n8n_url = baseUrl;
            } else {
              console.warn('Owner setup check failed, but n8n is accessible:', errorMessage);
              // If n8n is accessible, mark as running anyway
              newStatus = 'running';
              updates.n8n_url = baseUrl;
            }
          }
        } else if (instance.status !== 'running') {
          // n8n is accessible but status wasn't running - update it
          newStatus = 'running';
          updates.n8n_url = baseUrl;
        }
      } else {
        // n8n not ready yet
        if (instance.status === 'provisioning') {
          newStatus = 'installing_n8n';
        }
        // Keep current status if already installing_n8n
      }
    } catch (fetchError: unknown) {
      // n8n is not accessible yet
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.log(`n8n not accessible yet at ${baseUrl}: ${errorMessage}`);
      
      if (instance.status === 'provisioning') {
        newStatus = 'installing_n8n';
      }
      // If we've been in installing_n8n for more than 10 minutes, might be an error
      if (instance.status === 'installing_n8n') {
        const installingSince = new Date(instance.updated_at).getTime();
        const elapsed = Date.now() - installingSince;
        if (elapsed > 10 * 60 * 1000) {
          console.warn(`Container has been in installing_n8n status for ${Math.round(elapsed / 60000)} minutes`);
          // Don't mark as error yet - might just be slow to start
        }
      }
    }

    // Update database if status changed
    if (newStatus !== instance.status || Object.keys(updates).length > 0) {
      const { data: updated } = await supabaseAdmin
        .from('vps_instances')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString(), 
          ...updates 
        })
        .eq('id', instance.id)
        .select()
        .single();
      
      return { status: newStatus, instance: updated };
    }

    return { status: instance.status, instance };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error checking container status:', errorMsg);
    return { status: 'error', error: errorMsg, instance };
  }
}

export async function checkProvisionStatus(teamId: string) {
  try {
  const { data: instance, error } = await supabaseAdmin
    .from('vps_instances')
    .select('*')
    .eq('team_id', teamId)
    .single();

    if (error || !instance) return { status: 'error', error: 'Instance not found' };

    // Check if this is a container-based instance (new architecture) or VPS-based (legacy)
    const isContainerBased = !!instance.n8n_container_name;
    
    if (isContainerBased) {
      // Container-based status checking
      return await checkContainerStatus(instance);
    }

    // Legacy VPS-based checking (for existing instances)
    if (instance.provider_id?.startsWith('mock-')) {
       return mockCheckStatus(instance);
    }

    const vmId = Number(instance.provider_id);
    if (isNaN(vmId) || vmId === 0) {
      console.error('Invalid VM ID:', instance.provider_id);
      return { status: 'error', error: `Invalid VM ID: ${instance.provider_id}`, instance };
    }

    // Create fresh API client with current API key (best practice)
    const { vpsApi } = getHostingerClients();
    let response: any;
    try {
      response = await retryWithBackoff(() => vpsApi.getVirtualMachineDetailsV1(vmId), 3, 1000);
    } catch (error: any) {
      console.error('Error checking VM status:', getErrorMessage(error));
      return { status: 'error', error: getErrorMessage(error), instance };
    }
    
    // Try multiple possible response structures (similar to how we handle VM ID extraction)
    const vmInfo = 
      (response.data as any)?.data || 
      (response.data as any) || 
      (response as any)?.data ||
      (response as any);

    if (!vmInfo) {
      console.error('VM info not found. Response structure:', JSON.stringify(response, null, 2));
      console.error('Attempted paths: response.data.data, response.data, response.data, response');
      throw new Error('VM info not found');
    }

    // Log the actual status from Hostinger API for debugging
    const hostingerStatus = vmInfo.status || vmInfo.state || 'unknown';
    console.log('Hostinger VM status:', hostingerStatus, 'VM Info keys:', Object.keys(vmInfo));
    
    // Check for additional indicators that VPS is running (IP address, power state, etc.)
    const hasIpAddress = !!(vmInfo.ip_address || vmInfo.ip);
    const powerState = vmInfo.power_state || vmInfo.powerState || vmInfo.state;

    let newStatus: VPSStatus = instance.status;
    let updates: any = {};

    // Handle various status values that indicate the VPS is running/active
    const runningStatuses = ['active', 'running', 'online', 'up', 'started', 'operational'];
    const isRunning = runningStatuses.includes(String(hostingerStatus).toLowerCase()) || 
                      runningStatuses.includes(String(powerState).toLowerCase());
    
    // If we have an IP address and the status isn't explicitly stopped, assume it's running
    const likelyRunning = hasIpAddress && hostingerStatus !== 'stopped' && hostingerStatus !== 'offline' && hostingerStatus !== 'down';

    if (isRunning || likelyRunning) {
        console.log(`VPS is running (status: ${hostingerStatus}, has IP: ${hasIpAddress})`);
        // If VPS is active but we haven't deployed n8n yet, check if we should
        if (instance.status === 'provisioning') {
            newStatus = 'installing_n8n';
            // Get team info for n8n deployment
            const { data: team } = await supabaseAdmin
                .from('teams')
                .select('slug, name')
                .eq('id', instance.team_id)
                .single();
            
            // Trigger n8n deployment if not already done
            if (team?.slug && !instance.n8n_url) {
                try {
                    const deployResult = await deployN8nViaDocker(vmId, team.slug, instance.id, team.name || 'Team');
                    const { password, baseUrl } = deployResult;
                    
                    // Wait for n8n to be ready
                    try {
                        await waitForN8n(baseUrl);
                        
                        // Create owner user
                        const adminEmail = process.env.N8N_ADMIN_EMAIL;
                        if (!adminEmail) {
                            throw new Error('N8N_ADMIN_EMAIL environment variable is not set');
                        }
                        
                        try {
                            await createN8nOwnerUser({
                                baseUrl: baseUrl, // Full base URL without /rest suffix
                                email: adminEmail,
                                password,
                                firstName: team.name || 'Team',
                                lastName: team.slug || instance.team_id.slice(0, 8),
                                basicAuthUser: 'admin',
                                basicAuthPassword: password,
                            });
                        } catch (ownerError: any) {
                            console.warn('Owner user creation failed (may already exist):', getErrorMessage(ownerError));
                            // Continue anyway - n8n will work, user can complete setup manually
                        }
                        
                        // Update database with n8n credentials
                        updates.n8n_base_url = `${baseUrl}/rest`;
                        updates.n8n_api_user = 'admin';
                        updates.n8n_api_password = password;
                        updates.n8n_url = baseUrl;
                        newStatus = 'running';
                    } catch (setupError: any) {
                        console.error('n8n setup failed:', getErrorMessage(setupError));
                        // Store partial credentials for manual setup
                        updates.n8n_base_url = `${baseUrl}/rest`;
                        updates.n8n_api_user = 'admin';
                        updates.n8n_api_password = password;
                        updates.n8n_url = baseUrl;
                        // Keep status as installing_n8n - will retry on next poll
                    }
                } catch (err: any) {
                    console.error('Failed to deploy n8n:', getErrorMessage(err));
                    // Don't update status to error yet - might retry on next poll
                }
            }
        } else if (instance.status === 'installing_n8n') {
            // Check if we need to complete n8n setup
            if (instance.n8n_base_url && instance.n8n_api_user && instance.n8n_api_password) {
                // Credentials are set, check if we need to create owner
                const baseUrl = instance.n8n_base_url.replace(/\/rest$/, '');
                
                try {
                    // Try to create owner if not already done
                    const adminEmail = process.env.N8N_ADMIN_EMAIL;
                    if (adminEmail) {
                        const { data: team } = await supabaseAdmin
                            .from('teams')
                            .select('slug, name')
                            .eq('id', instance.team_id)
                            .single();
                        
                        if (team) {
                            // Extract base URL without /rest suffix
                            const baseUrlWithoutRest = instance.n8n_base_url?.replace(/\/rest$/, '') || instance.n8n_url || '';
                            await createN8nOwnerUser({
                                baseUrl: baseUrlWithoutRest,
                                email: adminEmail,
                                password: instance.n8n_api_password,
                                firstName: team.name || 'Team',
                                lastName: team.slug || instance.team_id.slice(0, 8),
                                basicAuthUser: instance.n8n_api_user,
                                basicAuthPassword: instance.n8n_api_password,
                            });
                        }
                    }
                    
                    newStatus = 'running';
                } catch (ownerError: any) {
                    // If owner already exists or setup fails, mark as running anyway
                    if (ownerError.message?.includes('already initialized') || ownerError.message?.includes('409')) {
                newStatus = 'running';
                    } else {
                        console.warn('Owner setup check failed:', getErrorMessage(ownerError));
                        // Check if n8n is at least responding
                        try {
                            await waitForN8n(baseUrl, 10000); // Quick check
                            newStatus = 'running';
                        } catch {
                            // Keep as installing_n8n
                        }
                    }
                }
            } else {
                // Still installing, check if we should retry deployment
                const { data: team } = await supabaseAdmin
                    .from('teams')
                    .select('slug, name')
                    .eq('id', instance.team_id)
                    .single();
                
                if (team?.slug) {
                    // Check how long we've been in installing_n8n status
                    const installingSince = new Date(instance.updated_at).getTime();
                    const elapsed = Date.now() - installingSince;
                    
                    // If more than 5 minutes, try deploying again
                    if (elapsed > 5 * 60 * 1000) {
                        try {
                            const deployResult = await deployN8nViaDocker(vmId, team.slug, instance.id, team.name || 'Team');
                            const { password, baseUrl } = deployResult;
                            
                            await waitForN8n(baseUrl);
                            
                            const adminEmail = process.env.N8N_ADMIN_EMAIL;
                            if (adminEmail) {
                                await createN8nOwnerUser({
                                    baseUrl: baseUrl, // Full base URL without /rest suffix
                                    email: adminEmail,
                                    password,
                                    firstName: team.name || 'Team',
                                    lastName: team.slug || instance.team_id.slice(0, 8),
                                    basicAuthUser: 'admin',
                                    basicAuthPassword: password,
                                });
                            }
                            
                            updates.n8n_base_url = `${baseUrl}/rest`;
                            updates.n8n_api_user = 'admin';
                            updates.n8n_api_password = password;
                            updates.n8n_url = baseUrl;
                            newStatus = 'running';
                        } catch (err: any) {
                            console.error('Retry n8n deployment failed:', getErrorMessage(err));
                            // Keep status as installing_n8n
                        }
                    }
                }
            }
        } else {
            newStatus = 'running';
        }
        updates.ip_address = vmInfo.ip_address || vmInfo.ip || instance.ip_address;
    } else if (hostingerStatus === 'pending_setup' || hostingerStatus === 'pending' || hostingerStatus === 'provisioning') {
        newStatus = 'provisioning';
    } else if (hostingerStatus === 'stopped' || hostingerStatus === 'offline' || hostingerStatus === 'down') {
        newStatus = 'stopped';
    } else {
        // Unknown status - log it but don't change to stopped if we have an IP and n8n_url
        console.warn(`Unknown VM status from Hostinger: ${hostingerStatus}. Current instance status: ${instance.status}`);
        // If we have IP and n8n_url, assume it's running (might be a status we don't recognize)
        if (hasIpAddress && instance.n8n_url) {
            console.log('Assuming VPS is running based on IP address and n8n_url presence');
            newStatus = 'running';
        } else if (hasIpAddress) {
            // If we have an IP but no n8n_url, it might be running but n8n not set up yet
            console.log('VPS has IP address, assuming running status');
            newStatus = 'running';
        } else {
            // Keep current status or set to error if it's a completely unknown state
            newStatus = instance.status || 'error';
        }
    }

    if (newStatus !== instance.status || (updates.ip_address && !instance.ip_address)) {
    const { data: updated } = await supabaseAdmin
      .from('vps_instances')
            .update({ status: newStatus, updated_at: new Date().toISOString(), ...updates })
      .eq('id', instance.id)
      .select()
      .single();
        return { status: newStatus, instance: updated };
  }

    return { status: instance.status, instance };

  } catch (err: any) {
    const errorMsg = getErrorMessage(err);
    console.error('Error checking VPS status:', errorMsg);
    
    // Fetch instance to update status
    const { data: existingInstance } = await supabaseAdmin
      .from('vps_instances')
      .select('id')
      .eq('team_id', teamId)
      .single();
    
    // Update instance status to error
    if (existingInstance?.id) {
      await supabaseAdmin
      .from('vps_instances')
      .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInstance.id)
        .then(() => {}, () => {}); // Ignore update errors
    }
    
    return { status: 'error', error: errorMsg, instance: existingInstance || null };
  }
}

async function mockCheckStatus(instance: any) {
    const updatedAt = new Date(instance.updated_at).getTime();
    const now = Date.now();
    const elapsed = now - updatedAt;

    let newStatus: VPSStatus = instance.status;
    let shouldUpdate = false;
    let updates: any = {};

    if (instance.status === 'provisioning' && elapsed > 5000) {
      newStatus = 'installing_n8n';
      shouldUpdate = true;
    } else if (instance.status === 'installing_n8n' && elapsed > 8000) {
      newStatus = 'running';
      shouldUpdate = true;
      updates = {
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        n8n_url: `http://n8n-${instance.team_id.slice(0, 8)}.heyklever.ai:5678`,
        n8n_api_key: `mock-key-${Date.now()}`
      };
    }

    if (shouldUpdate) {
      const { data: updated } = await supabaseAdmin
        .from('vps_instances')
        .update({ status: newStatus, updated_at: new Date().toISOString(), ...updates })
      .eq('id', instance.id)
      .select()
      .single();
      return { status: newStatus, instance: updated };
    }
    return { status: instance.status, instance };
}

export async function getVPSStatus(teamId: string) {
  const { data, error } = await supabaseAdmin
      .from('vps_instances')
      .select('*')
    .eq('team_id', teamId)
      .single();
      
  if (error) return null;
  return data;
}
