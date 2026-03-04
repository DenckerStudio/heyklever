"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn, normalizeFileName } from "@/lib/utils";
import {
  Upload,
  Link2,
  Mic,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Globe,
  FileText,
  Music,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Settings2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDropzone } from "react-dropzone";
import { OutputQuestionnaire, type QuestionnaireAnswers } from "./OutputQuestionnaire";
import { DocumentPreview, type SaveOptions } from "./DocumentPreview";
import { useTrainAI } from "@/lib/train-ai-context";

interface ContentTrainingPanelProps {
  teamId: string;
  onSuccess?: () => void;
}

type Step = "upload" | "questionnaire" | "preview";

interface UploadedContent {
  type: "url" | "file" | "audio";
  name: string;
  url?: string;
  file?: File;
  content?: string;
}

export function ContentTrainingPanel({ teamId, onSuccess }: ContentTrainingPanelProps) {
  const { defaults, autoApplyDefaults, getDefaultBrandGuideline } = useTrainAI();
  const [step, setStep] = useState<Step>("upload");
  const [uploadedContent, setUploadedContent] = useState<UploadedContent[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [customizeMode, setCustomizeMode] = useState(false); // when true, show full questionnaire even if defaults available

  const hasCompleteDefaults = useMemo(() => {
    return !!(
      defaults?.outputType &&
      defaults?.targetAudience &&
      defaults?.tone &&
      defaults?.length
    );
  }, [defaults]);

  const canSkipToGenerate = autoApplyDefaults && hasCompleteDefaults;

  const buildAnswersFromDefaults = useCallback((): QuestionnaireAnswers => {
    const d = defaults!;
    const defaultGuideline = getDefaultBrandGuideline();
    return {
      outputType: d.outputType!,
      customOutputType: d.customOutputType,
      targetAudience: d.targetAudience!,
      tone: d.tone!,
      length: d.length!,
      keyTopics: d.keyTopics ?? "",
      brandGuidelines: defaultGuideline?.content ?? "",
      language: d.language,
    };
  }, [defaults, getDefaultBrandGuideline]);

  const handleContentAdded = (content: UploadedContent) => {
    setUploadedContent((prev) => [...prev, content]);
  };

  const handleRemoveContent = (index: number) => {
    setUploadedContent((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionnaireComplete = async (answers: QuestionnaireAnswers) => {
    setQuestionnaireAnswers(answers);
    setIsGenerating(true);
    setStep("preview");

    try {
      // Check if we have files (document or audio)
      const hasFiles = uploadedContent.some(c => c.type === "file" || c.type === "audio");
      const hasFileObjects = uploadedContent.some(c => c.file);

      let response: Response;

      // Create AbortController with 5 minute timeout for AI generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

      try {
        if (hasFiles && hasFileObjects) {
          // Use FormData for files/audio
          const formData = new FormData();
          formData.append("teamId", teamId);
          formData.append("content", JSON.stringify(
            uploadedContent.map((c) => ({
              type: c.type,
              name: c.name,
              url: c.url,
              content: c.content,
            }))
          ));
          formData.append("answers", JSON.stringify(answers));

          // Add files to FormData
          uploadedContent.forEach((item) => {
            if (item.file) {
              formData.append("file", item.file);
            }
          });

          response = await fetch("/api/train-ai/generate", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
        } else {
          // Use JSON for URLs only
          response = await fetch("/api/train-ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teamId,
              content: uploadedContent.map((c) => ({
                type: c.type,
                name: c.name,
                url: c.url,
                content: c.content,
              })),
              answers,
            }),
            signal: controller.signal,
          });
        }
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error("Failed to generate document");
      }

      const data = await response.json();
      setGeneratedDocument(data.document || "");
    } catch (error) {
      console.error("Generation error:", error);
      setGeneratedDocument("Error generating document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (editedDocument: string, saveOptions?: SaveOptions) => {
    try {
      // Generate a filename from the output type
      const outputType = questionnaireAnswers?.outputType || "documentation";
      const timestamp = new Date().toISOString().split("T")[0];
      const fileName = normalizeFileName(`${outputType}-${timestamp}.md`);

      // If save options provided, upload to storage first
      if (saveOptions) {
        // Step 1: Get signed upload URL
        const uploadStartRes = await fetch("/api/storage/upload/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName,
            fileSize: new Blob([editedDocument]).size,
            contentType: "text/markdown",
            scope: saveOptions.scope,
            path: saveOptions.folderPath,
          }),
        });

        if (!uploadStartRes.ok) {
          const errData = await uploadStartRes.json();
          throw new Error(errData.error || "Failed to get upload URL");
        }

        const { uploadUrl, token, path: objectPath, bucketId } = await uploadStartRes.json();

        // Step 2: Upload the file to storage
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "text/markdown",
            Authorization: `Bearer ${token}`,
          },
          body: editedDocument,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // Step 3: Call storage ingest webhook
        const ingestRes = await fetch("/api/storage/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucketId,
            objectPath,
            fileName,
            content: editedDocument,
            visibilityScope: saveOptions.visibilityScope,
            allowedClientCodes: saveOptions.allowedClientCodes,
          }),
        });

        if (!ingestRes.ok) {
          console.error("Ingest webhook failed but file was uploaded");
        }
      }

      // Also save to the documents table for RAG
      const response = await fetch("/api/train-ai/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          document: editedDocument,
          sourceContent: uploadedContent.map((c) => ({
            type: c.type,
            name: c.name,
          })),
          outputType: questionnaireAnswers?.outputType,
        }),
      });

      if (!response.ok) {
        let message = "Failed to approve document";
        try {
          const body = await response.json();
          if (body?.error) message = body.error;
          if (body?.details) message += `: ${body.details}`;
        } catch {
          // ignore non-JSON body
        }
        throw new Error(message);
      }

      // Reset state
      setUploadedContent([]);
      setQuestionnaireAnswers(null);
      setGeneratedDocument("");
      setStep("upload");
      onSuccess?.();
    } catch (error) {
      console.error("Approval error:", error);
      alert(error instanceof Error ? error.message : "Failed to save document");
    }
  };

  const handleRegenerate = () => {
    if (questionnaireAnswers) {
      handleQuestionnaireComplete(questionnaireAnswers);
    }
  };

  const canProceedToQuestionnaire = uploadedContent.length > 0;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {["upload", "questionnaire", "preview"].map((s, index) => (
          <React.Fragment key={s}>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : index < ["upload", "questionnaire", "preview"].indexOf(step)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                {index + 1}
              </span>
              <span className="hidden sm:inline">
                {s === "upload" ? "Add Content" : s === "questionnaire" ? "Configure" : "Review"}
              </span>
            </div>
            {index < 2 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors",
                  index < ["upload", "questionnaire", "preview"].indexOf(step)
                    ? "bg-primary"
                    : "bg-border"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <ContentUploadSection
              uploadedContent={uploadedContent}
              onContentAdded={handleContentAdded}
              onRemoveContent={handleRemoveContent}
            />

            {uploadedContent.length > 0 && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setStep("questionnaire")}
                  disabled={!canProceedToQuestionnaire}
                  className="gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {step === "questionnaire" && (
          <motion.div
            key="questionnaire"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomizeMode(false);
                  setStep("upload");
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Content
              </Button>
            </div>

            {canSkipToGenerate && !customizeMode ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-6 space-y-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Use your saved defaults or customize
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You have default settings enabled. Generate now with one click, or open the full configuration to change output type, audience, tone, and more.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={() => handleQuestionnaireComplete(buildAnswersFromDefaults())}
                      disabled={isGenerating}
                      className="gap-2 flex-1"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Use defaults & generate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCustomizeMode(true)}
                      className="gap-2 flex-1"
                    >
                      <Settings2 className="h-4 w-4" />
                      Customize
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <OutputQuestionnaire
                onComplete={handleQuestionnaireComplete}
                contentSummary={uploadedContent.map((c) => c.name).join(", ")}
              />
            )}
          </motion.div>
        )}

        {step === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("questionnaire")}
                className="gap-2"
                disabled={isGenerating}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Configure
              </Button>
            </div>
            <DocumentPreview
              document={generatedDocument}
              isGenerating={isGenerating}
              outputType={questionnaireAnswers?.outputType || "documentation"}
              onApprove={handleApprove}
              onRegenerate={handleRegenerate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Content Upload Section Component
function ContentUploadSection({
  uploadedContent,
  onContentAdded,
  onRemoveContent,
}: {
  uploadedContent: UploadedContent[];
  onContentAdded: (content: UploadedContent) => void;
  onRemoveContent: (index: number) => void;
}) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="urls" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">URLs</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Audio</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-0">
          <DocumentUploadTab onContentAdded={onContentAdded} />
        </TabsContent>

        <TabsContent value="urls" className="mt-0">
          <URLInputTab onContentAdded={onContentAdded} />
        </TabsContent>

        <TabsContent value="audio" className="mt-0">
          <AudioUploadTab onContentAdded={onContentAdded} />
        </TabsContent>
      </Tabs>

      {/* Uploaded Content List */}
      {uploadedContent.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">
            Added Content ({uploadedContent.length})
          </h4>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {uploadedContent.map((content, index) => (
                <motion.div
                  key={`${content.name}-${index}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border/40"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {content.type === "url" && (
                      <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                    )}
                    {content.type === "file" && (
                      <FileText className="h-4 w-4 text-orange-500 shrink-0" />
                    )}
                    {content.type === "audio" && (
                      <Music className="h-4 w-4 text-purple-500 shrink-0" />
                    )}
                    <span className="text-sm truncate">{content.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      ({content.type})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => onRemoveContent(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// Document Upload Tab
function DocumentUploadTab({
  onContentAdded,
}: {
  onContentAdded: (content: UploadedContent) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      for (const file of acceptedFiles) {
        let content = "";
        const lower = file.name.toLowerCase();

        if (
          lower.endsWith(".txt") ||
          lower.endsWith(".md") ||
          lower.endsWith(".csv") ||
          lower.endsWith(".json") ||
          lower.endsWith(".xml") ||
          lower.endsWith(".html")
        ) {
          try {
            content = await file.text();
          } catch {
            content = "";
          }
        }

        onContentAdded({
          type: "file",
          name: file.name,
          file,
          content,
        });
      }
      setUploading(false);
    },
    [onContentAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer",
        "flex flex-col items-center justify-center text-center",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border/60 hover:border-primary/50 hover:bg-muted/30",
        uploading && "opacity-50 pointer-events-none"
      )}
    >
      <input {...getInputProps()} />
      <div className="p-3 rounded-full bg-orange-500/10 mb-3">
        {uploading ? (
          <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
        ) : (
          <Upload className="h-6 w-6 text-orange-500" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isDragActive ? "Drop documents here" : "Drag & drop documents"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        PDF, DOCX, TXT, MD files supported
      </p>
    </div>
  );
}

// URL Input Tab
function URLInputTab({
  onContentAdded,
}: {
  onContentAdded: (content: UploadedContent) => void;
}) {
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addUrl = async () => {
    if (!inputUrl.trim()) return;

    try {
      new URL(inputUrl.trim());
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Optionally fetch content from URL here
      onContentAdded({
        type: "url",
        name: inputUrl.trim(),
        url: inputUrl.trim(),
      });
      setInputUrl("");
    } catch (e) {
      setError("Failed to add URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/documentation"
          value={inputUrl}
          onChange={(e) => {
            setInputUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && addUrl()}
          className="flex-1"
        />
        <Button onClick={addUrl} disabled={!inputUrl.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Add URLs to documentation pages, articles, or any web content
      </p>
    </div>
  );
}

// Audio Upload Tab
function AudioUploadTab({
  onContentAdded,
}: {
  onContentAdded: (content: UploadedContent) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      for (const file of acceptedFiles) {
        onContentAdded({
          type: "audio",
          name: file.name,
          file,
        });
      }
      setUploading(false);
    },
    [onContentAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac"],
    },
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer",
        "flex flex-col items-center justify-center text-center",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border/60 hover:border-primary/50 hover:bg-muted/30",
        uploading && "opacity-50 pointer-events-none"
      )}
    >
      <input {...getInputProps()} />
      <div className="p-3 rounded-full bg-purple-500/10 mb-3">
        {uploading ? (
          <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
        ) : (
          <Mic className="h-6 w-6 text-purple-500" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isDragActive ? "Drop audio files here" : "Drag & drop audio files"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        MP3, WAV, M4A, OGG files supported (stored for reference)
      </p>
    </div>
  );
}
