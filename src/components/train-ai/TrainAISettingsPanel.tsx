"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Settings,
  Save,
  Trash2,
  Edit2,
  Plus,
  Star,
  BookOpen,
  FileText,
  Users,
  Volume2,
  Ruler,
  RotateCcw,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTrainAI, useBrandGuidelines, useTrainAIDefaults } from "@/lib/train-ai-context";
import { BrandGuideline, TrainAIDefaults, type OutputLanguage } from "@/lib/train-ai-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Sparkles } from "lucide-react";

const outputTypes = [
  { id: "user-manual", label: "User Manual" },
  { id: "documentation", label: "Documentation" },
  { id: "step-by-step", label: "Step-by-Step Guide" },
  { id: "blog-post", label: "Blog Post" },
  { id: "custom", label: "Custom" },
];

const audienceOptions = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "technical", label: "Technical" },
  { id: "mixed", label: "Mixed" },
];

const toneOptions = [
  { id: "formal", label: "Formal" },
  { id: "conversational", label: "Conversational" },
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly" },
];

const lengthOptions = [
  { id: "brief", label: "Brief" },
  { id: "detailed", label: "Detailed" },
  { id: "comprehensive", label: "Comprehensive" },
];

const languageOptions: { id: OutputLanguage; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "it", label: "Italian" },
  { id: "pt", label: "Portuguese" },
  { id: "nl", label: "Dutch" },
  { id: "pl", label: "Polish" },
  { id: "sv", label: "Swedish" },
  { id: "no", label: "Norwegian" },
  { id: "da", label: "Danish" },
  { id: "fi", label: "Finnish" },
  { id: "ja", label: "Japanese" },
  { id: "zh", label: "Chinese" },
  { id: "ko", label: "Korean" },
  { id: "ar", label: "Arabic" },
  { id: "other", label: "Other" },
];

const GUIDELINES_INCLUDE = [
  "Voice & tone (e.g., professional, friendly, technical)",
  "Terminology and words to use or avoid",
  "Formatting preferences (headings, lists, examples)",
  "Audience level and reading level",
  "Length and depth expectations",
  "Legal or compliance phrasing",
  "Brand-specific terms and product names",
];

const GUIDELINES_EXCLUDE = [
  "Full document content—keep guidelines short and reusable",
  "One-off instructions—use key topics in the questionnaire instead",
  "Contradictory rules—one clear rule per area works best",
];

export function TrainAISettingsPanel() {
  const { isLoading } = useTrainAI();
  const { defaults, updateDefaults, clearDefaults, autoApply, toggleAutoApply } = useTrainAIDefaults();
  const { guidelines, addGuideline, updateGuideline, deleteGuideline, setDefault } = useBrandGuidelines();
  
  const [showGuidelineDialog, setShowGuidelineDialog] = useState(false);
  const [editingGuideline, setEditingGuideline] = useState<BrandGuideline | null>(null);
  const [newGuideline, setNewGuideline] = useState({ name: "", description: "", content: "", isDefault: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingGuidelines, setIsGeneratingGuidelines] = useState(false);
  const [localDefaults, setLocalDefaults] = useState<TrainAIDefaults>(defaults);

  // Sync local defaults with context
  React.useEffect(() => {
    setLocalDefaults(defaults);
  }, [defaults]);

  const handleSaveDefaults = async () => {
    setIsSaving(true);
    try {
      await updateDefaults(localDefaults);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDefaults = async () => {
    setIsSaving(true);
    try {
      await clearDefaults();
      setLocalDefaults({});
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOrUpdateGuideline = async () => {
    setIsSaving(true);
    try {
      if (editingGuideline) {
        await updateGuideline(editingGuideline.id, {
          name: newGuideline.name,
          description: newGuideline.description,
          content: newGuideline.content,
          isDefault: newGuideline.isDefault,
        });
      } else {
        await addGuideline({
          name: newGuideline.name,
          description: newGuideline.description,
          content: newGuideline.content,
          isDefault: newGuideline.isDefault,
        });
      }
      setShowGuidelineDialog(false);
      setEditingGuideline(null);
      setNewGuideline({ name: "", description: "", content: "", isDefault: false });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditGuideline = (guideline: BrandGuideline) => {
    setEditingGuideline(guideline);
    setNewGuideline({
      name: guideline.name,
      description: guideline.description || "",
      content: guideline.content,
      isDefault: guideline.isDefault || false,
    });
    setShowGuidelineDialog(true);
  };

  const handleDeleteGuideline = async (id: string) => {
    setIsSaving(true);
    try {
      await deleteGuideline(id);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefaultGuideline = async (id: string) => {
    setIsSaving(true);
    try {
      await setDefault(id);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateGuidelinesWithAI = async () => {
    setIsGeneratingGuidelines(true);
    try {
      const res = await fetch("/api/train-ai/generate-guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hint: newGuideline.name || newGuideline.description || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      const content = data.guidelines ?? data.content ?? "";
      if (content) {
        setNewGuideline((prev) => ({ ...prev, content }));
      }
    } catch {
      // Silent fail; user can still type manually
    } finally {
      setIsGeneratingGuidelines(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-8">
      {/* Default Configuration Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Default Configuration</h3>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="autoApply" className="text-sm text-muted-foreground cursor-pointer">
              Auto-apply defaults
            </Label>
            <Switch
              id="autoApply"
              checked={autoApply}
              onCheckedChange={toggleAutoApply}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                When on, in Content Training you can either use defaults and generate in one click, or open the full customization flow to change any option.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Set default values for document generation. When <strong>Auto-apply defaults</strong> is on, you can skip the configuration step in Content Training and generate with one click, or choose to customize anytime.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Output Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Output Type
            </Label>
            <Select
              value={localDefaults.outputType || ""}
              onValueChange={(value) => setLocalDefaults(prev => ({ 
                ...prev, 
                outputType: value as TrainAIDefaults["outputType"] 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default output type" />
              </SelectTrigger>
              <SelectContent>
                {outputTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Target Audience
            </Label>
            <Select
              value={localDefaults.targetAudience || ""}
              onValueChange={(value) => setLocalDefaults(prev => ({ 
                ...prev, 
                targetAudience: value as TrainAIDefaults["targetAudience"] 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default audience" />
              </SelectTrigger>
              <SelectContent>
                {audienceOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Tone & Style
            </Label>
            <Select
              value={localDefaults.tone || ""}
              onValueChange={(value) => setLocalDefaults(prev => ({ 
                ...prev, 
                tone: value as TrainAIDefaults["tone"] 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default tone" />
              </SelectTrigger>
              <SelectContent>
                {toneOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Length */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Length
            </Label>
            <Select
              value={localDefaults.length || ""}
              onValueChange={(value) => setLocalDefaults(prev => ({ 
                ...prev, 
                length: value as TrainAIDefaults["length"] 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default length" />
              </SelectTrigger>
              <SelectContent>
                {lengthOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-2">
              <span className="text-base">🌐</span>
              Output Language
            </Label>
            <Select
              value={localDefaults.language || ""}
              onValueChange={(value) => setLocalDefaults(prev => ({ 
                ...prev, 
                language: value as OutputLanguage 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default output language" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Generated documents will follow this language when set.
            </p>
          </div>
        </div>

        {/* Key Topics */}
        <div className="space-y-2">
          <Label>Default Key Topics</Label>
          <Textarea
            placeholder="Enter default key topics to emphasize..."
            value={localDefaults.keyTopics || ""}
            onChange={(e) => setLocalDefaults(prev => ({ ...prev, keyTopics: e.target.value }))}
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSaveDefaults} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Defaults
          </Button>
          <Button variant="outline" onClick={handleClearDefaults} disabled={isSaving} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Brand Guidelines Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Brand/Style Guidelines</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingGuideline(null);
              setNewGuideline({ name: "", description: "", content: "", isDefault: false });
              setShowGuidelineDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Guideline
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Save reusable brand and style rules. They are applied during document generation so content stays consistent.
        </p>

        {/* What to include / exclude */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            What to include in guidelines
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {GUIDELINES_INCLUDE.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="text-sm font-medium text-foreground pt-1 border-t border-border/40">
            What to avoid
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {GUIDELINES_EXCLUDE.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Guidelines List */}
        {guidelines.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed border-border">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No brand guidelines saved yet</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setEditingGuideline(null);
                setNewGuideline({ name: "", description: "", content: "", isDefault: false });
                setShowGuidelineDialog(true);
              }}
              className="mt-2"
            >
              Create your first guideline
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {guidelines.map((guideline) => (
                <motion.div
                  key={guideline.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    guideline.isDefault
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-border/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{guideline.name}</h4>
                        {guideline.isDefault && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {guideline.description && (
                        <p className="text-sm text-muted-foreground mb-2">{guideline.description}</p>
                      )}
                      <div className="text-sm text-foreground/80 max-h-24 overflow-y-auto rounded border border-border/40 bg-muted/20 px-2 py-1.5">
                        <p className="whitespace-pre-wrap">{guideline.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!guideline.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefaultGuideline(guideline.id)}
                          className="h-8 w-8 p-0"
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditGuideline(guideline)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGuideline(guideline.id)}
                        className="h-8 w-8 p-0 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Brand Guideline Dialog */}
      <Dialog open={showGuidelineDialog} onOpenChange={(open) => {
        setShowGuidelineDialog(open);
        if (!open) {
          setEditingGuideline(null);
          setNewGuideline({ name: "", description: "", content: "", isDefault: false });
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {editingGuideline ? "Edit Brand Guideline" : "Add Brand Guideline"}
            </DialogTitle>
            <DialogDescription>
              Create a reusable brand/style guideline that can be quickly applied to document generation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guidelineName">Name *</Label>
              <Input
                id="guidelineName"
                placeholder="e.g., Corporate Style, Casual Blog, Technical Docs..."
                value={newGuideline.name}
                onChange={(e) => setNewGuideline(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guidelineDescription">Description (optional)</Label>
              <Input
                id="guidelineDescription"
                placeholder="Brief description of when to use this guideline"
                value={newGuideline.description}
                onChange={(e) => setNewGuideline(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="guidelineContent">Guidelines Content *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleGenerateGuidelinesWithAI}
                  disabled={isGeneratingGuidelines}
                >
                  {isGeneratingGuidelines ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                id="guidelineContent"
                placeholder="e.g., Use active voice. Avoid jargon. Include one short example per section. Use our product names as written in the source."
                value={newGuideline.content}
                onChange={(e) => setNewGuideline(prev => ({ ...prev, content: e.target.value }))}
                rows={5}
                className="resize-none min-h-[120px] max-h-[280px] overflow-y-auto"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Add a name or description above, then click &quot;Generate with AI&quot; for a draft you can edit.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isDefault"
                checked={newGuideline.isDefault}
                onCheckedChange={(checked) => setNewGuideline(prev => ({ ...prev, isDefault: checked }))}
              />
              <Label htmlFor="isDefault" className="text-sm font-normal cursor-pointer">
                Set as default guideline
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGuidelineDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddOrUpdateGuideline} 
              disabled={!newGuideline.name.trim() || !newGuideline.content.trim() || isSaving}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingGuideline ? "Update" : "Save"} Guideline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
