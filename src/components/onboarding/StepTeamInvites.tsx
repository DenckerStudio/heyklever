import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Loader2, Mail, Send } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Invite {
  email: string;
  role: string;
}

interface StepTeamInvitesProps {
  onNext: () => void;
  onSkip: () => void;
  teamId: string;
  isProcessing: boolean;
}

export function StepTeamInvites({
  onNext,
  onSkip,
  teamId,
  isProcessing: parentProcessing,
}: StepTeamInvitesProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentRole, setCurrentRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addInvite = () => {
    if (!currentEmail || !currentEmail.includes("@")) {
        setError("Please enter a valid email address");
        return;
    }
    if (invites.some(i => i.email === currentEmail)) {
        setError("This email is already added");
        return;
    }
    
    setInvites([...invites, { email: currentEmail, role: currentRole }]);
    setCurrentEmail("");
    setError(null);
  };

  const removeInvite = (email: string) => {
    setInvites(invites.filter(i => i.email !== email));
  };

  const handleSendInvites = async () => {
    if (invites.length === 0) {
        onNext(); // Or onSkip, but functionally same here
        return;
    }

    setSending(true);
    setError(null);

    try {
        const results = await Promise.allSettled(
            invites.map(invite => 
                fetch("/api/invites/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        teamId,
                        email: invite.email,
                        role: invite.role,
                    }),
                }).then(async res => {
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || "Failed to send");
                    }
                    return res.json();
                })
            )
        );

        const failed = results.filter(r => r.status === "rejected");
        if (failed.length > 0) {
            console.error("Some invites failed:", failed);
            // Optionally show error, but we'll proceed for now or show partial success
            // For onboarding flow, maybe better to just proceed and log
        }
        
        onNext();
    } catch (err) {
        console.error("Error sending invites:", err);
        setError("Failed to send some invites. Please try again or skip.");
    } finally {
        setSending(false);
    }
  };

  const isProcessing = parentProcessing || sending;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                    id="inviteEmail"
                    placeholder="colleague@company.com"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addInvite();
                        }
                    }}
                    disabled={isProcessing}
                />
            </div>
            <div className="w-[140px] space-y-2">
                <Label htmlFor="inviteRole">Role</Label>
                <Select 
                    value={currentRole} 
                    onValueChange={setCurrentRole}
                    disabled={isProcessing}
                >
                    <SelectTrigger id="inviteRole">
                        <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={addInvite} type="button" variant="secondary" disabled={isProcessing}>
                <Plus className="w-4 h-4" />
            </Button>
        </div>
        
        {error && (
            <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="mt-6">
            <Label className="mb-2 block">Pending Invites ({invites.length})</Label>
            <div className="bg-slate-50 rounded-md border min-h-[100px] p-2 space-y-2 max-h-[300px] overflow-y-auto">
                {invites.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm py-8">
                        <Mail className="w-8 h-8 mb-2 opacity-20" />
                        <p>No invites added yet</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {invites.map((invite) => (
                            <motion.div
                                key={invite.email}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between bg-white p-3 rounded shadow-sm border"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <Mail className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{invite.email}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{invite.role}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeInvite(invite.email)}
                                    disabled={isProcessing}
                                    className="text-muted-foreground hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="ghost" onClick={onSkip} disabled={isProcessing}>
          Skip for now
        </Button>
        <Button onClick={handleSendInvites} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              {invites.length > 0 ? (
                 <>Send {invites.length} Invite{invites.length !== 1 ? 's' : ''} & Finish</>
              ) : (
                 <>Finish</>
              )}
              <Send className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

