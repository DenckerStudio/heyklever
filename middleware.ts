import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function createMiddlewareSupabaseClient(req: NextRequest, res: NextResponse) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    return createServerClient(supabaseUrl, supabaseAnonKey, {
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
	});
}

/** Resolve tenant slug from request: subdomain (e.g. acme.platform.tech) or path (/t/acme/...). */
function getTenantSlug(req: NextRequest): string | null {
	const host = req.headers.get('host') ?? '';
	const pathname = req.nextUrl.pathname;

	// Path-based: /t/[slug] or /t/[slug]/...
	const pathMatch = pathname.match(/^\/t\/([^/]+)/);
	if (pathMatch) return pathMatch[1];

	// Subdomain-based: NEXT_PUBLIC_TENANT_DOMAIN e.g. "platform.tech" -> acme.platform.tech => "acme"
	const tenantDomain = process.env.NEXT_PUBLIC_TENANT_DOMAIN;
	if (tenantDomain && host.endsWith(tenantDomain) && host !== tenantDomain) {
		const sub = host.slice(0, -tenantDomain.length).replace(/\.$/, '');
		if (sub && sub !== 'www') return sub;
	}
	return null;
}

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // Create a Supabase client bound to the request/response cookies and refresh auth
    const supabase = createMiddlewareSupabaseClient(req, res);
    const { data } = await supabase.auth.getUser();
    const user = data.user ?? null;

    if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
        const redirectUrl = new URL('/signin', req.url);
        redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Optional tenant resolution: set x-team-id when subdomain or /t/[slug] matches a team the user is in
    const slug = getTenantSlug(req);
    if (user && slug) {
        const { data: teamId } = await supabase.rpc('get_team_id_by_slug', { p_slug: slug });
        if (teamId) {
            res.headers.set('x-team-id', String(teamId));
            res.headers.set('x-tenant-slug', slug);
        }
    }

    return res;
}

export const config = {
	matcher: ['/dashboard/:path*', '/t/:path*'],
};


