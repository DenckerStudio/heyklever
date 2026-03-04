import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
	const cookieStore = await cookies();
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
	}
	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			get(name) {
				return cookieStore.get(name)?.value;
			},
			set(name, value, options) {
				cookieStore.set({ name, value, ...options });
			},
			remove(name, options) {
				cookieStore.set({ name, value: '', ...options });
			},
		},
	});
}

export async function getServerUser() {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase.auth.getUser();
	return data.user ?? null;
}


export function createSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  // Using fetch directly without cookie binding; service key bypasses RLS
  return {
    url: supabaseUrl,
    key: serviceKey,
  };
}


