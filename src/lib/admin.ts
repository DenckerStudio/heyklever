/**
 * Admin access utilities
 * App admins are identified via APP_ADMIN_EMAILS environment variable
 */

// Client-side version - fetches admin status from API
export async function isAppAdminClient(userEmail: string | null | undefined): Promise<boolean> {
  if (!userEmail) return false;
  
  try {
    const res = await fetch(`/api/admin/check?email=${encodeURIComponent(userEmail)}`);
    if (res.ok) {
      const data = await res.json();
      return data.isAdmin === true;
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
  }
  return false;
}

// Server-side version
export async function isAppAdmin(userEmail: string | null | undefined): Promise<boolean> {
  if (!userEmail) return false;
  
  const adminEmails = process.env.APP_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return adminEmails.includes(userEmail.toLowerCase());
}

export async function checkAppAdmin(userEmail: string | null | undefined): Promise<void> {
  if (!(await isAppAdmin(userEmail))) {
    throw new Error('Unauthorized: App admin access required');
  }
}

