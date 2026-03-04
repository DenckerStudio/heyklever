"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, User, ArrowRight, Loader2, Users } from "lucide-react";

export default function InviteOnboardingPage() {
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState<number>(0);
    const [userId, setUserId] = useState<string>("");
    const [userEmail, setUserEmail] = useState<string>("");
    const [teamId, setTeamId] = useState<string>("");
    const [teamName, setTeamName] = useState<string>("");

    // Profile fields
    const [fullName, setFullName] = useState<string>("");

    // Status
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const init = async () => {
            const { data: authData } = await supabase.auth.getUser();
            const user = authData.user;
            if (!user) {
                router.replace('/signin');
                return;
            }
            setUserId(user.id);
            setUserEmail(user.email || "");

            // Load profile to check if user was invited
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, default_team_id, onboarding_completed, invited_user")
                .eq("id", user.id)
                .maybeSingle();

            // If not an invited user, redirect to team onboarding
            if (!profile?.invited_user) {
                router.replace('/dashboard/team-onboarding');
                return;
            }

            // If onboarding already complete, skip to dashboard
            if (profile?.onboarding_completed) {
                router.replace('/dashboard');
                return;
            }

            // Load team info
            if (profile?.default_team_id) {
                setTeamId(profile.default_team_id);
                const { data: team } = await supabase
                    .from("teams")
                    .select("name")
                    .eq("id", profile.default_team_id)
                    .single();
                if (team?.name) setTeamName(team.name);
            }

            // Determine current step
            // Step 0 -> missing full_name
            // Step 1 -> ready to complete
            if (!profile?.full_name) {
                setCurrentStep(0);
                return;
            }

            setCurrentStep(1);
        };
        init();
    }, [supabase, router]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            if (!userId || !userEmail) throw new Error("Missing user");
            const { error: upsertError } = await supabase
                .from("profiles")
                .upsert({ id: userId, email: userEmail, full_name: fullName }, { onConflict: "id" });
            if (upsertError) throw upsertError;
            setCurrentStep(1);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to save profile";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCompleteOnboarding = async () => {
        setSubmitting(true);
        setError("");
        try {
            if (!userId) throw new Error("Missing user");
            
            // Mark onboarding as completed
            const { error: completeError } = await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", userId);
            if (completeError) throw completeError;

            // Ensure member folder exists (this handles folder creation if missed during sign up)
            if (teamId) {
                try {
                    await fetch('/api/teams/member/setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ teamId }),
                    });
                } catch (e) {
                    console.error("Failed to setup member folder", e);
                }
            }

            // Set team cookie and redirect to dashboard
            if (teamId) {
                document.cookie = `team_id=${encodeURIComponent(teamId)}; path=/`;
            }
            router.replace("/dashboard");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to complete onboarding";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { id: 0, title: "Profile", icon: User, description: "Complete your profile" },
        { id: 1, title: "Welcome", icon: Users, description: "Join the team" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 px-8 py-12 text-white">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h1 className="text-3xl font-bold mb-2">Welcome to {teamName}</h1>
                            <p className="text-green-100 text-lg">You&apos;ve been invited to join the team. Let&apos;s get you set up!</p>
                        </motion.div>
                    </div>

                    {/* Progress Steps */}
                    <div className="px-8 py-6 border-b border-gray-100">
                        <div className="flex items-center justify-center space-x-16">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.id;
                                const isCompleted = currentStep > step.id;
                                
                                return (
                                    <motion.div
                                        key={step.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex flex-col items-center space-y-2"
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                            isCompleted 
                                                ? 'bg-green-500 border-green-500 text-white' 
                                                : isActive 
                                                    ? 'bg-blue-500 border-blue-500 text-white' 
                                                    : 'bg-gray-100 border-gray-300 text-gray-400'
                                        }`}>
                                            {isCompleted ? (
                                                <CheckCircle className="w-6 h-6" />
                                            ) : (
                                                <Icon className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                                {step.title}
                                            </p>
                                            <p className="text-xs text-gray-500">{step.description}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
                            >
                                <p className="text-red-700 text-sm">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Content */}
                    <div className="px-8 py-8">
                        <AnimatePresence mode="wait">
                            {/* Profile Step */}
                            {currentStep === 0 && (
                                <motion.div
                                    key="profile"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <User className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Complete your profile</h2>
                                        <p className="text-gray-600">We need a few details to get you started with the team</p>
                                    </div>

                                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                                            <input 
                                                value={userEmail} 
                                                disabled 
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
                                            <input 
                                                value={fullName} 
                                                onChange={(e) => setFullName(e.target.value)} 
                                                placeholder="Enter your full name" 
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800" 
                                                required 
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button 
                                                disabled={submitting || !fullName.trim()} 
                                                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                                                type="submit"
                                            >
                                                {submitting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <span>Continue</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {/* Complete Step */}
                            {currentStep === 1 && (
                                <motion.div
                                    key="complete"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-8">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                                        >
                                            <Users className="w-10 h-10 text-green-600" />
                                        </motion.div>
                                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to {teamName}!</h2>
                                        <p className="text-gray-600">You&apos;re now part of the team and ready to start collaborating</p>
                                    </div>

                                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                        <h3 className="font-medium text-green-800 mb-2">What you can do now:</h3>
                                        <ul className="text-sm text-green-700 space-y-1">
                                            <li>• Access the team dashboard and workspace</li>
                                            <li>• Collaborate with your team members</li>
                                            <li>• Connect your storage providers in settings</li>
                                            <li>• Start using HeyKlever&apos;s AI features</li>
                                        </ul>
                                    </div>

                                    <div className="flex justify-center">
                                        <button 
                                            onClick={handleCompleteOnboarding}
                                            disabled={submitting}
                                            className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Go to Dashboard</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
