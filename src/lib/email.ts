import { Resend } from "resend";
import TeamInviteEmail from "@/emails/TeamInvite";
import ExistingUserInviteEmail from "../emails/ExistingUserInvite";

type BuildInviteUrlInput = {
  teamId: string;
  teamName: string;
  email: string;
  customDomain?: string | null;
};

export function buildInviteUrl({ teamId, teamName, email, customDomain }: BuildInviteUrlInput): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const base = (customDomain && isValidDomain(customDomain)) ? `https://${customDomain}` : siteUrl;
  const url = new URL("/invite", base);
  url.searchParams.set("email", email);
  url.searchParams.set("team", teamId);
  url.searchParams.set("teamName", teamName);
  return url.toString();
}

export async function sendTeamInviteEmail(params: {
  to: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
  logoUrl?: string | null;
  existingUser?: boolean;
}): Promise<{ emailId: string | null }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "noreply@heyklever.ai";
  if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");
  const resend = new Resend(resendApiKey);

  const reactEmail = params.existingUser
    ? ExistingUserInviteEmail({
        teamName: params.teamName,
        inviterName: params.inviterName,
        inviteUrl: params.inviteUrl,
        logoUrl: params.logoUrl ?? null,
      })
    : TeamInviteEmail({
        teamName: params.teamName,
        inviterName: params.inviterName,
        inviteUrl: params.inviteUrl,
        logoUrl: params.logoUrl ?? null,
      });

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: params.existingUser
      ? `You're invited to join ${params.teamName} on HeyKlever`
      : `${params.inviterName} invited you to ${params.teamName} on HeyKlever`,
    react: reactEmail,
  });
  if (error) throw new Error(error.message || "Failed to send email");
  return { emailId: data?.id ?? null };
}

function isValidDomain(input: string): boolean {
  // Very light validation to avoid SSRF with URL base
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);
}


