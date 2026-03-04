"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInPage as AuthCard } from "@/components/ui/sign-in";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default function SignUpPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');

  useEffect(() => {
    const invite = search.get('invite');
    const team = search.get('team');
    let redirect = "/dashboard/team-onboarding";
    if (invite) {
      redirect = `/dashboard/invite-onboarding?invite=${invite}`;
      if (team) redirect += `&team=${team}`;
    }
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") router.replace(redirect);
    });
  }, [router, search, supabase]);

  const handleEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string) || "";
    const password = (formData.get("password") as string) || "";
    
    if (mode === 'signup') {
      const invite = search.get('invite');
      const team = search.get('team');
      
      // Build redirect URL with invite params
      const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`);
      if (invite) redirectUrl.searchParams.set('invite', invite);
      if (team) redirectUrl.searchParams.set('team', team);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: redirectUrl.toString(),
          data: invite ? { invite_token: invite, team_id: team } : undefined
        },
      });
      if (error) alert(error.message);
    } else {
      // Sign in logic
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      const invite = search.get('invite');
      if (!error && invite) {
        try {
          await fetch('/api/invites/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: invite }) });
        } catch {}
      }
    }
  };

  const handleGoogle = async () => {
    const qp = new URLSearchParams();
    const invite = search.get('invite');
    const team = search.get('team');
    const redirect = mode === 'signup'
      ? (search.get('redirect') || '/dashboard/onboarding')
      : (search.get('redirect') || '/dashboard');
    qp.set('redirect', redirect);
    if (invite) qp.set('invite', invite);
    if (team) qp.set('team', team);
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?${qp.toString()}` } });
  };

  return (
    <>
      <div className="absolute top-10 left-10 flex items-center gap-2 z-20">
        <Link href="/" className="flex items-center gap-1 group">
          <ArrowLeftIcon className="w-4 h-4 group-hover:translate-x-[-3px] transition-transform duration-300" /> Back
        </Link>
      </div>
      <AuthCard
        mode={mode}
        onModeChange={setMode}
        onSignIn={handleEmail}
        onGoogleSignIn={handleGoogle}
        onMagicLink={async () => {
          const email = prompt('Enter your email for a magic link') || '';
          if (!email) return;
          const qp = new URLSearchParams();
          const invite = search.get('invite');
          const team = search.get('team');
          qp.set('redirect', mode === 'signup' ? (invite ? '/dashboard/invite-onboarding' : '/dashboard/onboarding') : '/dashboard');
          if (invite) qp.set('invite', invite);
          if (team) qp.set('team', team);
          await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?${qp.toString()}` } });
          alert('Check your email for a sign-in link');
        }}
        onResetPassword={() => {
          // TODO: Implement password reset
          alert('Password reset functionality coming soon');
        }}
      />
    </>
  );
}


