"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Modal, 
  ModalBody, 
  ModalContent, 
  ModalFooter, 
  ModalTrigger,
  useModal 
} from "@/components/ui/animated-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { FileUp, Link as LinkIcon, Loader2, BookOpen, FileText, PenTool } from "lucide-react";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

interface CreateDocDialogProps {
  onSuccess?: () => void;
}

const steps = [
  { title: "Action Type" },
  { title: "Source" },
  { title: "Details" },
];

export function CreateDocDialog({ onSuccess }: CreateDocDialogProps) {
  return (
    <Modal>
      <ModalTrigger className="">
          <InteractiveHoverButton className="text-sm font-medium" text="Call AI">
          </InteractiveHoverButton>
      </ModalTrigger>
      <ModalBody>
        <CreateDocForm onSuccess={onSuccess} />
      </ModalBody>
    </Modal>
  );
}

function CreateDocForm({ onSuccess }: { onSuccess?: () => void }) {
  const { setOpen } = useModal();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [actionType, setActionType] = useState<"guide" | "docs" | "blog" | "">("");
  const [sourceType, setSourceType] = useState<"file" | "url">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState<"team" | "personal">("team");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [folderName, setFolderName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("actionType", actionType);
      formData.append("sourceType", sourceType);
      
      if (sourceType === "url") {
        if (!url) throw new Error("Please enter a URL");
        formData.append("url", url);
      } else {
        if (!file) throw new Error("Please select a file");
        formData.append("file", file);
      }

      formData.append("context", context); 
      const finalVisibility = context === "personal" ? "private" : visibility;
      formData.append("visibility", finalVisibility);
      
      if (folderName) {
        formData.append("folderName", folderName);
      }

      const res = await fetch("/api/docs/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate document");
      }

      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creating doc:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 0 && !actionType) return;
    if (step === 1) {
        if (sourceType === "url" && !url) return;
        if (sourceType === "file" && !file) return;
    }
    setStep(s => Math.min(s + 1, steps.length - 1));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const isLastStep = step === steps.length - 1;

  return (
    <ModalContent className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div className="mb-2">
         <h2 className="text-2xl font-bold mb-2 text-center text-black dark:text-white">Create Content with AI</h2>
         <MultiStepLoader steps={steps} currentStep={step} className="mt-6 mb-8 px-4" />
      </div>

      <div className="flex-1 overflow-y-auto px-1 min-h-[300px]">
        {/* Step 1: Action Type */}
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <ActionCard 
                title="Create Guide" 
                icon={<BookOpen className="w-6 h-6" />}
                description="Step-by-step tutorials and how-to guides."
                selected={actionType === "guide"}
                onClick={() => setActionType("guide")}
             />
             <ActionCard 
                title="Documentation" 
                icon={<FileText className="w-6 h-6" />}
                description="Technical documentation and API references."
                selected={actionType === "docs"}
                onClick={() => setActionType("docs")}
             />
             <ActionCard 
                title="Blog Post" 
                icon={<PenTool className="w-6 h-6" />}
                description="Engaging articles and blog content."
                selected={actionType === "blog"}
                onClick={() => setActionType("blog")}
             />
          </div>
        )}

        {/* Step 2: Source */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <Tabs 
              value={sourceType} 
              onValueChange={(v) => setSourceType(v as "file" | "url")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">URL Source</TabsTrigger>
                <TabsTrigger value="file">File Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="mt-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="url">Source URL</Label>
                    <div className="relative">
                    <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="url"
                        placeholder="https://example.com/source"
                        className="pl-9"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        autoFocus
                    />
                    </div>
                    <p className="text-xs text-muted-foreground">The AI will scrape this URL for context.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="file" className="mt-6 space-y-4">
                 <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/25"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileUp className="w-10 h-10 mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        {file ? (
                          <span className="font-semibold text-primary text-base">{file.name}</span>
                        ) : (
                          <>
                            <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD (Max 10MB)</p>
                    </div>
                    <input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.txt,.md"
                    />
                  </label>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destination</Label>
                <Select 
                  value={context} 
                  onValueChange={(v: "team" | "personal") => setContext(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team Docs</SelectItem>
                    <SelectItem value="personal">Personal Docs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={context === "personal" ? "text-muted-foreground" : ""}>
                  Visibility
                </Label>
                <Select 
                  value={context === "personal" ? "private" : visibility} 
                  onValueChange={(v: "public" | "private") => setVisibility(v)}
                  disabled={context === "personal"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (Team only)</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder">Folder Name (Optional)</Label>
              <Input
                id="folder"
                placeholder="e.g. Onboarding, API Reference"
                value={folderName}
                onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '');
                    setFolderName(val);
                }}
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Only letters, numbers, hyphens, and underscores allowed.
              </p>
            </div>
          </div>
        )}
      </div>

      <ModalFooter className="gap-2 bg-transparent p-0 pt-4 mt-auto border-t dark:border-white/10">
        <Button variant="ghost" onClick={() => (step === 0 ? setOpen(false) : prevStep())}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        
        {isLastStep ? (
           <HoverBorderGradient
                containerClassName="rounded-md"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2"
                as="button"
                onClick={handleSubmit}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                    </div>
                ) : (
                    <span>Generate Content</span>
                )}
            </HoverBorderGradient>
        ) : (
            <Button onClick={nextStep} disabled={
                (step === 0 && !actionType) ||
                (step === 1 && sourceType === "url" && !url) ||
                (step === 1 && sourceType === "file" && !file)
            }>
                Continue
            </Button>
        )}
      </ModalFooter>
    </ModalContent>
  );
}

function ActionCard({ title, description, icon, selected, onClick }: { 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    selected: boolean; 
    onClick: () => void 
}) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50 hover:bg-muted/50 h-full flex flex-col items-center text-center",
                selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted bg-background"
            )}
        >
            <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
                {icon}
            </div>
            <h3 className="font-semibold mb-1 text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}
