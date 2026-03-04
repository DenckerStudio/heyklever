"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default function InvitePage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const search = useSearchParams();
  
  const [email, setEmail] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      const emailParam = search.get("email");
      const teamParam = search.get("team");
      const teamNameParam = search.get("teamName");

      if (!emailParam || !teamParam || !teamNameParam) {
        setError("Invalid invite link. Please contact the person who invited you.");
        setLoading(false);
        return;
      }

      setEmail(emailParam);
      setTeamId(teamParam);
      setTeamName(teamNameParam);
      setLoading(false);
    };
    init();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setSubmitting(false);
      return;
    }

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?invite=true&team=${teamId}`,
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user?.id) throw new Error("User not created");

      // Upsert profile: handle_new_user trigger may already have created a row
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: authData.user.id,
            email,
            full_name: fullName,
            invited_user: true,
            default_team_id: teamId,
            onboarding_completed: false,
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      // Add user to team
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: teamId,
          user_id: authData.user?.id,
          role: "member",
        });

      if (memberError) throw memberError;

      // Upload profile picture if provided
      if (profilePicture && authData.user?.id) {
        const fileExt = profilePicture.name.split('.').pop();
        const fileName = `${authData.user.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, profilePicture);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          await supabase
            .from("profiles")
            .update({ avatar_url: publicUrl })
            .eq("id", authData.user.id);
        }
      }

      // Mark invite as accepted using the centralized API
      // Note: We need to get the invite token first
      const { data: inviteData } = await supabase
        .from("invites")
        .select("token")
        .eq("team_id", teamId)
        .eq("email", email)
        .is("accepted_at", null)
        .single();

      if (inviteData?.token) {
        try {
          const acceptRes = await fetch('/api/invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteData.token }),
          });
          if (!acceptRes.ok) {
            console.warn("Failed to accept invite:", await acceptRes.text());
          }
        } catch (err) {
          console.warn("Failed to accept invite:", err);
        }
      }

      router.push("/signin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-10 left-10">
        <Link href="/" className="flex items-center gap-1 group">
          <ArrowLeftIcon className="w-4 h-4 group-hover:translate-x-[-3px] transition-transform duration-300" />
          Back
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Join {teamName}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You&apos;ve been invited to join the team. Complete your profile to get started.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Profile Picture (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? "Creating Account..." : "Join Team"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/signin"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
