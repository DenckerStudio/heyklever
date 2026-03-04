"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { SignInPage as AuthCard } from "@/components/ui/sign-in";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default function SignUpPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const teamCreatedRef = useRef(false);

  useEffect(() => {
    const invite = search.get('invite');
    const team = search.get('team');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "SIGNED_IN" || teamCreatedRef.current) return;
      teamCreatedRef.current = true;

      if (invite) {
        const redirect = `/dashboard/invite-onboarding?invite=${invite}${team ? `&team=${team}` : ''}`;
        router.replace(redirect);
        return;
      }

      const pendingTeamName = localStorage.getItem('pendingTeamName');
      if (pendingTeamName) {
        try {
          await fetch('/api/teams/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: pendingTeamName }),
          });
        } catch (e) {
          console.error('Failed to auto-create team:', e);
        } finally {
          localStorage.removeItem('pendingTeamName');
        }
      }

      router.replace("/dashboard");
    });

    return () => { subscription.unsubscribe(); };
  }, [router, search, supabase]);

  const handleEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string) || "";
    const password = (formData.get("password") as string) || "";
    const teamName = (formData.get("teamName") as string) || "";

    if (mode === 'signup') {
      if (teamName) localStorage.setItem('pendingTeamName', teamName);

      const invite = search.get('invite');
      const team = search.get('team');
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

  const savePendingTeam = () => {
    const teamInput = document.querySelector<HTMLInputElement>('input[name="teamName"]');
    const name = teamInput?.value?.trim();
    if (name) localStorage.setItem('pendingTeamName', name);
  };

  const handleGoogle = async () => {
    savePendingTeam();
    const qp = new URLSearchParams();
    const invite = search.get('invite');
    const team = search.get('team');
    qp.set('redirect', search.get('redirect') || '/dashboard');
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
          savePendingTeam();
          const email = prompt('Enter your email for a magic link') || '';
          if (!email) return;
          const qp = new URLSearchParams();
          const invite = search.get('invite');
          const team = search.get('team');
          qp.set('redirect', '/dashboard');
          if (invite) qp.set('invite', invite);
          if (team) qp.set('team', team);
          await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?${qp.toString()}` } });
          alert('Check your email for a sign-in link');
        }}
        onResetPassword={() => {
          alert('Password reset functionality coming soon');
        }}
      />
    </>
  );
}
