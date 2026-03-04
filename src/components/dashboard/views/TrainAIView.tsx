"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainIcon, Eye, FileText, Sparkles, History, Settings } from "lucide-react";
import { ContentTrainingPanel } from "@/components/train-ai/ContentTrainingPanel";
import { URLMonitorPanel } from "@/components/train-ai/URLMonitorPanel";
import { GeneratedHistoryPanel } from "@/components/train-ai/GeneratedHistoryPanel";
import { TrainAISettingsPanel } from "@/components/train-ai/TrainAISettingsPanel";
import { useTeams } from "@/lib/hooks/useTeams";
import { TrainAIProvider } from "@/lib/train-ai-context";

export function TrainAIView() {
  const { currentTeam } = useTeams();
  const [activeTab, setActiveTab] = useState<"content" | "monitor" | "history" | "settings">("content");

  return (
    <TrainAIProvider>
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <BrainIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Train AI Agent</h1>
              <p className="text-sm text-muted-foreground">
                Upload content, generate documents, and teach your AI from your data sources
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "content" | "monitor" | "history" | "settings")}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
              <TabsTrigger value="content" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Content Training</span>
                <span className="sm:hidden">Train</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger value="monitor" className="gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">URL Monitoring</span>
                <span className="sm:hidden">Monitor</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="content" className="mt-0">
                <div className="space-y-6">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground mb-1">
                          Generate & Train from Content
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Upload documents, provide URLs, or add audio files. Answer a few questions
                          about your desired output, and we&apos;ll generate high-quality content that
                          you can review and approve for training your AI.
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentTeam?.id ? (
                    <ContentTrainingPanel teamId={currentTeam.id} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Please select a team to continue</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <div className="space-y-6">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <History className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground mb-1">
                          Generated Documents History
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          View, manage, and reuse previously generated documents. Documents approved
                          for RAG training are marked accordingly.
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentTeam?.id ? (
                    <GeneratedHistoryPanel teamId={currentTeam.id} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Please select a team to continue</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="monitor" className="mt-0">
                <div className="space-y-6">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Eye className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground mb-1">
                          Monitor URLs for Changes
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Add URLs to your documentation, product pages, or any web content. We&apos;ll
                          automatically check for updates and sync changes to your AI&apos;s knowledge base.
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentTeam?.id ? (
                    <URLMonitorPanel teamId={currentTeam.id} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Please select a team to continue</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="space-y-6">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Settings className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground mb-1">
                          Configuration & Brand Guidelines
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Set default values for document generation and manage reusable brand/style guidelines
                          that can be quickly applied to your content.
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentTeam?.id ? (
                    <TrainAISettingsPanel />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Please select a team to continue</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </motion.div>
          </Tabs>
        </div>
      </div>
    </div>
    </TrainAIProvider>
  );
}
