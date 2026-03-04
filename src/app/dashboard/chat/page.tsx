"use client";

import { GlobalChat } from '@/components/ui/global-chat';

export default function ChatPage() {
  return (
    <div className="h-full w-full">
      <GlobalChat
        variant="team"
        context="private"
        showHeader={true}
        allowContextSwitch={true}
        allowFileUpload={true}
        className="h-full rounded-lg"
      />
    </div>
  );
}
