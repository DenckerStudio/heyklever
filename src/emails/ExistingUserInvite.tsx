import * as React from "react";
import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Tailwind, Text } from "@react-email/components";

type ExistingUserInviteEmailProps = {
  teamName: string;
  inviterName: string;
  inviteUrl: string; // points to /dashboard?inviteToken=...&team=...
  appName?: string;
  logoUrl?: string | null;
  supportEmail?: string;
};

export default function ExistingUserInviteEmail(props: ExistingUserInviteEmailProps) {
  const {
    teamName,
    inviterName,
    inviteUrl,
    appName = "HeyKlever",
    logoUrl,
    supportEmail = "support@heyklever.ai",
  } = props;

  const previewText = `${inviterName} invited you to join ${teamName} on ${appName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans text-zinc-900">
          <Container className="mx-auto my-8 w-[480px] rounded-xl border border-zinc-200 p-6">
            <Section className="text-center">
              {logoUrl ? (
                <Img src={logoUrl} alt={appName} width="48" height="48" className="mx-auto mb-3 rounded" />
              ) : (
                <Text className="text-xl font-semibold mb-3">{appName}</Text>
              )}
            </Section>

            <Text className="text-base">Hi there,</Text>
            <Text className="text-base leading-6">
              <strong>{inviterName}</strong> invited you to join the team <strong>{teamName}</strong> on {appName}.
            </Text>
            <Text className="text-base leading-6">
              You already have an account. Click the button below to open your dashboard and confirm the invitation.
            </Text>

            <Section className="text-center my-6">
              <Button
                className="inline-block rounded-lg bg-black px-5 py-3 text-white no-underline"
                href={inviteUrl}
              >
                Open dashboard
              </Button>
            </Section>

            <Text className="text-sm text-zinc-600">Or copy and paste this URL into your browser:</Text>
            <Link href={inviteUrl} className="break-all text-sm text-zinc-800">
              {inviteUrl}
            </Link>

            <Hr className="my-6 border-zinc-200" />
            <Text className="text-xs text-zinc-500">
              If you didn’t expect this invitation, you can safely ignore this email. For help, contact us at {supportEmail}.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}


