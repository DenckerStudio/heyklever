"use client";

import { AssetOverviewWidget } from "@/components/dashboard/AssetOverviewWidget";
import { SignageStatusWidget } from "@/components/dashboard/SignageStatusWidget";
import { DocumentPulseWidget } from "@/components/dashboard/DocumentPulseWidget";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function OverviewView() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <AssetOverviewWidget />
        <SignageStatusWidget />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <DocumentPulseWidget />
        <div className="rounded-lg border bg-card p-4 flex flex-col justify-center items-center min-h-[140px]">
          <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">AI Chat</p>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open Notebook to chat with your knowledge base
          </Link>
        </div>
      </div>
    </div>
  );
}
