"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
  ListChecks,
  PenLine,
  Sparkles,
  Users,
  Volume2,
  Ruler,
  Tag,
  ArrowRight,
  Check,
  Settings,
  Save,
  RotateCcw,
  Plus,
  ChevronDown,
  Star,
  Trash2,
  Edit2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTrainAI, useBrandGuidelines } from "@/lib/train-ai-context";
import { BrandGuideline } from "@/lib/train-ai-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface QuestionnaireAnswers {
  outputType: "user-manual" | "documentation" | "step-by-step" | "blog-post" | "custom";
  customOutputType?: string;
  targetAudience: "beginner" | "intermediate" | "technical" | "mixed";
  tone: "formal" | "conversational" | "professional" | "friendly";
  length: "brief" | "detailed" | "comprehensive";
  keyTopics: string;
  brandGuidelines: string;
  language?: string; // ISO 639-1 or 'other'
}

interface OutputQuestionnaireProps {
  onComplete: (answers: QuestionnaireAnswers) => void;
  contentSummary: string;
}

const outputTypes = [
  {
    id: "user-manual" as const,
    label: "User Manual",
    description: "Comprehensive guide for end-users",
    icon: BookOpen,
  },
  {
    id: "documentation" as const,
    label: "Documentation",
    description: "Technical reference documentation",
    icon: FileText,
  },
  {
    id: "step-by-step" as const,
    label: "Step-by-Step Guide",
    description: "Walkthrough with numbered steps",
    icon: ListChecks,
  },
  {
    id: "blog-post" as const,
    label: "Blog Post",
    description: "Engaging article for your audience",
    icon: PenLine,
  },
  {
    id: "custom" as const,
    label: "Custom",
    description: "Define your own output type",
    icon: Sparkles,
  },
];

const audienceOptions = [
  { id: "beginner" as const, label: "Beginner", description: "New to the topic" },
  { id: "intermediate" as const, label: "Intermediate", description: "Some experience" },
  { id: "technical" as const, label: "Technical", description: "Expert level" },
  { id: "mixed" as const, label: "Mixed", description: "Varied audience" },
];

const toneOptions = [
  { id: "formal" as const, label: "Formal", description: "Professional & serious" },
  { id: "conversational" as const, label: "Conversational", description: "Casual & friendly" },
  { id: "professional" as const, label: "Professional", description: "Business appropriate" },
  { id: "friendly" as const, label: "Friendly", description: "Warm & approachable" },
];

const lengthOptions = [
  { id: "brief" as const, label: "Brief", description: "Quick overview" },
  { id: "detailed" as const, label: "Detailed", description: "In-depth coverage" },
  { id: "comprehensive" as const, label: "Comprehensive", description: "Complete reference" },
];

export function OutputQuestionnaire({ onComplete, contentSummary }: OutputQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({});
  const [showSaveDefaultsDialog, setShowSaveDefaultsDialog] = useState(false);
  const [showGuidelineDialog, setShowGuidelineDialog] = useState(false);
  const [editingGuideline, setEditingGuideline] = useState<BrandGuideline | null>(null);
  const [newGuideline, setNewGuideline] = useState({ name: "", description: "", content: "", isDefault: false });

  // Get defaults and brand guidelines from context
  const { defaults, saveCurrentAsDefaults, autoApplyDefaults, isLoading: settingsLoading } = useTrainAI();
  const { guidelines, addGuideline, updateGuideline, deleteGuideline, setDefault, getDefault } = useBrandGuidelines();

  // Apply defaults on mount if autoApplyDefaults is enabled
  useEffect(() => {
    if (!settingsLoading && autoApplyDefaults && defaults) {
      const defaultAnswers: Partial<QuestionnaireAnswers> = {};
      if (defaults.outputType) defaultAnswers.outputType = defaults.outputType;
      if (defaults.customOutputType) defaultAnswers.customOutputType = defaults.customOutputType;
      if (defaults.targetAudience) defaultAnswers.targetAudience = defaults.targetAudience;
      if (defaults.tone) defaultAnswers.tone = defaults.tone;
      if (defaults.length) defaultAnswers.length = defaults.length;
      if (defaults.keyTopics) defaultAnswers.keyTopics = defaults.keyTopics;
      if (defaults.language) defaultAnswers.language = defaults.language;
      // Apply default brand guideline
      const defaultBrandGuideline = getDefault();
      if (defaultBrandGuideline) {
        defaultAnswers.brandGuidelines = defaultBrandGuideline.content;
      }
      if (Object.keys(defaultAnswers).length > 0) {
        setAnswers(defaultAnswers);
      }
    }
  }, [settingsLoading, autoApplyDefaults, defaults, getDefault]);

  const steps = [
    { id: "outputType", label: "Output Type", icon: FileText },
    { id: "audience", label: "Audience", icon: Users },
    { id: "tone", label: "Tone & Style", icon: Volume2 },
    { id: "length", label: "Length", icon: Ruler },
    { id: "language", label: "Language", icon: Globe },
    { id: "details", label: "Details", icon: Tag },
  ];

  const hasDefaults = defaults && (
    defaults.outputType || defaults.targetAudience || defaults.tone || defaults.length
  );

  const languageOptionsList = [
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
    { id: "ja", label: "Japanese" },
    { id: "zh", label: "Chinese" },
    { id: "ko", label: "Korean" },
    { id: "other", label: "Other" },
  ];

  const applyDefaults = () => {
    if (!defaults) return;
    const defaultAnswers: Partial<QuestionnaireAnswers> = { ...answers };
    if (defaults.outputType) defaultAnswers.outputType = defaults.outputType;
    if (defaults.customOutputType) defaultAnswers.customOutputType = defaults.customOutputType;
    if (defaults.targetAudience) defaultAnswers.targetAudience = defaults.targetAudience;
    if (defaults.tone) defaultAnswers.tone = defaults.tone;
    if (defaults.length) defaultAnswers.length = defaults.length;
    if (defaults.keyTopics) defaultAnswers.keyTopics = defaults.keyTopics;
    if (defaults.language) defaultAnswers.language = defaults.language;
    const defaultBrandGuideline = getDefault();
    if (defaultBrandGuideline) {
      defaultAnswers.brandGuidelines = defaultBrandGuideline.content;
    }
    setAnswers(defaultAnswers);
  };

  const handleSaveAsDefaults = async () => {
    await saveCurrentAsDefaults(answers);
    setShowSaveDefaultsDialog(false);
  };

  const handleAddOrUpdateGuideline = async () => {
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
    await deleteGuideline(id);
  };

  const handleSelectGuideline = (guideline: BrandGuideline) => {
    setAnswers(prev => ({ ...prev, brandGuidelines: guideline.content }));
  };

  const handleOutputTypeSelect = (type: QuestionnaireAnswers["outputType"]) => {
    setAnswers((prev) => ({ ...prev, outputType: type }));
    if (type !== "custom") {
      setCurrentStep(1);
    }
  };

  const handleCustomOutputType = (value: string) => {
    setAnswers((prev) => ({ ...prev, customOutputType: value }));
  };

  const handleAudienceSelect = (audience: QuestionnaireAnswers["targetAudience"]) => {
    setAnswers((prev) => ({ ...prev, targetAudience: audience }));
    setCurrentStep(2);
  };

  const handleToneSelect = (tone: QuestionnaireAnswers["tone"]) => {
    setAnswers((prev) => ({ ...prev, tone: tone }));
    setCurrentStep(3);
  };

  const handleLengthSelect = (length: QuestionnaireAnswers["length"]) => {
    setAnswers((prev) => ({ ...prev, length: length }));
    setCurrentStep(4);
  };

  const handleLanguageSelect = (language: string) => {
    setAnswers((prev) => ({ ...prev, language }));
    setCurrentStep(5);
  };

  const handleDetailsSubmit = () => {
    if (answers.outputType && answers.targetAudience && answers.tone && answers.length) {
      onComplete({
        outputType: answers.outputType,
        customOutputType: answers.customOutputType,
        targetAudience: answers.targetAudience,
        tone: answers.tone,
        length: answers.length,
        keyTopics: answers.keyTopics || "",
        brandGuidelines: answers.brandGuidelines || "",
        language: answers.language,
      });
    }
  };

  const canProceedFromCustom = answers.outputType === "custom" && answers.customOutputType?.trim();

  return (
    <div className="space-y-6">
      {/* Content Summary */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/40">
        <p className="text-xs text-muted-foreground">
          Generating from: <span className="text-foreground">{contentSummary}</span>
        </p>
      </div>

      {/* Step Progress & Defaults */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : index < currentStep
                    ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <step.icon className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-4 shrink-0",
                    index < currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Defaults Button */}
        {hasDefaults && (
          <Button
            variant="outline"
            size="sm"
            onClick={applyDefaults}
            className="shrink-0 gap-1.5 text-xs h-7"
          >
            <RotateCcw className="h-3 w-3" />
            Use Defaults
          </Button>
        )}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.div
            key="outputType"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                What would you like to create?
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose the type of document to generate from your content
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {outputTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleOutputTypeSelect(type.id)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left",
                    "hover:border-primary/50 hover:bg-muted/50",
                    answers.outputType === type.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60"
                  )}
                >
                  <div className="p-2 rounded-lg bg-primary/10 mb-3">
                    <type.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">{type.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                </button>
              ))}
            </div>

            {answers.outputType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customType">Describe your desired output</Label>
                <Input
                  id="customType"
                  placeholder="e.g., FAQ section, product comparison, tutorial video script..."
                  value={answers.customOutputType || ""}
                  onChange={(e) => handleCustomOutputType(e.target.value)}
                />
                <Button
                  onClick={() => setCurrentStep(1)}
                  disabled={!canProceedFromCustom}
                  className="mt-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div
            key="audience"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                Who is your target audience?
              </h3>
              <p className="text-sm text-muted-foreground">
                This helps us adjust the technical depth and terminology
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {audienceOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAudienceSelect(option.id)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center",
                    "hover:border-primary/50 hover:bg-muted/50",
                    answers.targetAudience === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60"
                  )}
                >
                  <Users className="h-5 w-5 text-primary mb-2" />
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="tone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                What tone should we use?
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose the voice and style for your content
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {toneOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleToneSelect(option.id)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center",
                    "hover:border-primary/50 hover:bg-muted/50",
                    answers.tone === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60"
                  )}
                >
                  <Volume2 className="h-5 w-5 text-primary mb-2" />
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="length"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                How detailed should it be?
              </h3>
              <p className="text-sm text-muted-foreground">
                Select the level of detail for your document
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {lengthOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleLengthSelect(option.id)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center",
                    "hover:border-primary/50 hover:bg-muted/50",
                    answers.length === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60"
                  )}
                >
                  <Ruler className="h-5 w-5 text-primary mb-2" />
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div
            key="language"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                Output language
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose the language for the generated document
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {languageOptionsList.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleLanguageSelect(option.id)}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center",
                    "hover:border-primary/50 hover:bg-muted/50",
                    answers.language === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60"
                  )}
                >
                  <p className="font-medium text-foreground text-sm">{option.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {currentStep === 5 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                Any additional details? (Optional)
              </h3>
              <p className="text-sm text-muted-foreground">
                Help us create the perfect document for you
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyTopics">Key topics to emphasize</Label>
                <Textarea
                  id="keyTopics"
                  placeholder="e.g., focus on security features, highlight integrations, explain pricing tiers..."
                  value={answers.keyTopics || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, keyTopics: e.target.value }))}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Brand Guidelines Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="brandGuidelines">Brand/style guidelines</Label>
                  {guidelines.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                          <BookOpen className="h-3 w-3" />
                          Saved Guidelines
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        {guidelines.map((guideline) => (
                          <DropdownMenuItem
                            key={guideline.id}
                            onClick={() => handleSelectGuideline(guideline)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {guideline.isDefault && <Star className="h-3 w-3 text-yellow-500 shrink-0" />}
                              <span className="truncate">{guideline.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditGuideline(guideline);
                                }}
                                className="p-1 hover:bg-muted rounded"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGuideline(guideline.id);
                                }}
                                className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          setEditingGuideline(null);
                          setNewGuideline({ name: "", description: "", content: answers.brandGuidelines || "", isDefault: false });
                          setShowGuidelineDialog(true);
                        }}>
                          <Plus className="h-3 w-3 mr-2" />
                          Save current as new guideline
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <Textarea
                  id="brandGuidelines"
                  placeholder="e.g., avoid jargon, use active voice, include examples for each feature..."
                  value={answers.brandGuidelines || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, brandGuidelines: e.target.value }))
                  }
                  rows={3}
                  className="resize-none min-h-[80px] max-h-[220px] overflow-y-auto"
                />
                {guidelines.length === 0 && answers.brandGuidelines && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setEditingGuideline(null);
                      setNewGuideline({ name: "", description: "", content: answers.brandGuidelines || "", isDefault: false });
                      setShowGuidelineDialog(true);
                    }}
                  >
                    <Save className="h-3 w-3" />
                    Save as reusable guideline
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button onClick={handleDetailsSubmit} size="lg" className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Document
              </Button>
              
              {/* Save as Defaults */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-muted-foreground"
                  onClick={() => setShowSaveDefaultsDialog(true)}
                >
                  <Save className="h-3 w-3" />
                  Save current settings as defaults
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Defaults Dialog */}
      <Dialog open={showSaveDefaultsDialog} onOpenChange={setShowSaveDefaultsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Save as Default Configuration
            </DialogTitle>
            <DialogDescription>
              Save your current selections as the default configuration. These defaults will be 
              automatically applied when you start a new document generation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-muted-foreground text-xs mb-1">Output Type</p>
                <p className="font-medium capitalize">{answers.outputType?.replace("-", " ") || "Not set"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-muted-foreground text-xs mb-1">Audience</p>
                <p className="font-medium capitalize">{answers.targetAudience || "Not set"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-muted-foreground text-xs mb-1">Tone</p>
                <p className="font-medium capitalize">{answers.tone || "Not set"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-muted-foreground text-xs mb-1">Length</p>
                <p className="font-medium capitalize">{answers.length || "Not set"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-muted-foreground text-xs mb-1">Language</p>
                <p className="font-medium">{languageOptionsList.find((o) => o.id === answers.language)?.label || answers.language || "Not set"}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDefaultsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsDefaults} className="gap-2">
              <Save className="h-4 w-4" />
              Save Defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {editingGuideline ? "Edit Brand Guideline" : "Save Brand Guideline"}
            </DialogTitle>
            <DialogDescription>
              Save your brand/style guidelines to quickly apply them to future document generations.
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
              <Label htmlFor="guidelineContent">Guidelines Content *</Label>
              <Textarea
                id="guidelineContent"
                placeholder="e.g., avoid jargon, use active voice, include examples for each feature..."
                value={newGuideline.content}
                onChange={(e) => setNewGuideline(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={newGuideline.isDefault}
                onChange={(e) => setNewGuideline(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="rounded border-border"
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
              disabled={!newGuideline.name.trim() || !newGuideline.content.trim()}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {editingGuideline ? "Update" : "Save"} Guideline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
