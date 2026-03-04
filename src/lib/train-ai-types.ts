// Train AI Types and Interfaces

import { QuestionnaireAnswers } from "@/components/train-ai/OutputQuestionnaire";

// Brand/Style Guideline that can be saved and reused
export interface BrandGuideline {
  id: string;
  name: string;
  description?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

// Supported output languages (ISO 639-1 or common codes)
export type OutputLanguage =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "pl"
  | "sv"
  | "no"
  | "da"
  | "fi"
  | "ja"
  | "zh"
  | "ko"
  | "ar"
  | "other";

// Default configuration for the questionnaire wizard
export interface TrainAIDefaults {
  outputType?: QuestionnaireAnswers["outputType"];
  customOutputType?: string;
  targetAudience?: QuestionnaireAnswers["targetAudience"];
  tone?: QuestionnaireAnswers["tone"];
  length?: QuestionnaireAnswers["length"];
  keyTopics?: string;
  language?: OutputLanguage;
  defaultBrandGuidelineId?: string; // ID of the default brand guideline to use
}

// Full Train AI settings stored in team.settings.trainAI
export interface TrainAISettings {
  defaults?: TrainAIDefaults;
  brandGuidelines?: BrandGuideline[];
  lastUsedSettings?: Partial<QuestionnaireAnswers>;
  autoApplyDefaults?: boolean; // Whether to auto-apply defaults when starting
}

// API request/response types
export interface SaveDefaultsRequest {
  defaults: TrainAIDefaults;
}

export interface SaveBrandGuidelineRequest {
  guideline: Omit<BrandGuideline, "id" | "createdAt" | "updatedAt">;
}

export interface UpdateBrandGuidelineRequest {
  id: string;
  guideline: Partial<Omit<BrandGuideline, "id" | "createdAt" | "updatedAt">>;
}

export interface DeleteBrandGuidelineRequest {
  id: string;
}

// Helper function to generate unique IDs
export function generateGuidelineId(): string {
  return `bg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Default empty settings
export const DEFAULT_TRAIN_AI_SETTINGS: TrainAISettings = {
  defaults: {},
  brandGuidelines: [],
  lastUsedSettings: {},
  autoApplyDefaults: true,
};
