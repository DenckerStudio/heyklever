import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
	const url = new URL(req.url);
	const redirect = url.searchParams.get('redirect') || '/dashboard';
	const inviteToken = url.searchParams.get('invite') || '';
	const res = NextResponse.redirect(new URL(redirect, req.url));

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
		{
			cookies: {
				get(name) {
					return req.cookies.get(name)?.value;
				},
				set(name, value, options) {
					res.cookies.set({ name, value, ...options });
				},
				remove(name, options) {
					res.cookies.set({ name, value: '', ...options });
				},
			},
		}
	);

	await supabase.auth.exchangeCodeForSession(url.href);

	// Get the user after session exchange
	const { data: { user } } = await supabase.auth.getUser();

	// If this is an invite signup, redirect to invite onboarding
	const isInvite = url.searchParams.get('invite') === 'true';
	if (isInvite && user) {
		return NextResponse.redirect(new URL('/dashboard/invite-onboarding', req.url));
	}
	return res;
}


