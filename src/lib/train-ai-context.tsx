"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  TrainAISettings,
  TrainAIDefaults,
  BrandGuideline,
  DEFAULT_TRAIN_AI_SETTINGS,
} from "./train-ai-types";
import { QuestionnaireAnswers } from "@/components/train-ai/OutputQuestionnaire";

interface TrainAIContextValue {
  settings: TrainAISettings;
  isLoading: boolean;
  error: string | null;
  // Defaults management
  defaults: TrainAIDefaults;
  updateDefaults: (defaults: Partial<TrainAIDefaults>) => Promise<void>;
  clearDefaults: () => Promise<void>;
  saveCurrentAsDefaults: (answers: Partial<QuestionnaireAnswers>) => Promise<void>;
  // Brand guidelines management
  brandGuidelines: BrandGuideline[];
  addBrandGuideline: (guideline: Omit<BrandGuideline, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateBrandGuideline: (id: string, updates: Partial<Omit<BrandGuideline, "id" | "createdAt" | "updatedAt">>) => Promise<void>;
  deleteBrandGuideline: (id: string) => Promise<void>;
  setDefaultBrandGuideline: (id: string | null) => Promise<void>;
  getDefaultBrandGuideline: () => BrandGuideline | undefined;
  // Last used settings
  lastUsedSettings: Partial<QuestionnaireAnswers>;
  saveLastUsedSettings: (settings: Partial<QuestionnaireAnswers>) => Promise<void>;
  // Settings
  autoApplyDefaults: boolean;
  toggleAutoApplyDefaults: (enabled: boolean) => Promise<void>;
  // Utility
  refresh: () => Promise<void>;
}

const TrainAIContext = createContext<TrainAIContextValue | undefined>(undefined);

export function TrainAIProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TrainAISettings>(DEFAULT_TRAIN_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings on mount
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/train-ai/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || DEFAULT_TRAIN_AI_SETTINGS);
      } else {
        setError("Failed to fetch settings");
      }
    } catch (err) {
      console.error("Error fetching Train AI settings:", err);
      setError("Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // API call helper
  const updateSettings = async (action: string, payload: unknown) => {
    try {
      const response = await fetch("/api/train-ai/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        return data.settings;
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to update settings");
      }
    } catch (err) {
      console.error("Error updating Train AI settings:", err);
      throw err;
    }
  };

  // Defaults management
  const updateDefaults = async (defaults: Partial<TrainAIDefaults>) => {
    await updateSettings("updateDefaults", defaults);
  };

  const clearDefaults = async () => {
    await updateSettings("clearDefaults", {});
  };

  const saveCurrentAsDefaults = async (answers: Partial<QuestionnaireAnswers>) => {
    const defaults: TrainAIDefaults = {
      outputType: answers.outputType,
      customOutputType: answers.customOutputType,
      targetAudience: answers.targetAudience,
      tone: answers.tone,
      length: answers.length,
      keyTopics: answers.keyTopics,
      language: answers.language as TrainAIDefaults["language"],
    };
    await updateDefaults(defaults);
  };

  // Brand guidelines management
  const addBrandGuideline = async (guideline: Omit<BrandGuideline, "id" | "createdAt" | "updatedAt">) => {
    await updateSettings("addBrandGuideline", guideline);
  };

  const updateBrandGuideline = async (id: string, updates: Partial<Omit<BrandGuideline, "id" | "createdAt" | "updatedAt">>) => {
    await updateSettings("updateBrandGuideline", { id, ...updates });
  };

  const deleteBrandGuideline = async (id: string) => {
    await updateSettings("deleteBrandGuideline", { id });
  };

  const setDefaultBrandGuideline = async (id: string | null) => {
    await updateSettings("setDefaultBrandGuideline", { id });
  };

  const getDefaultBrandGuideline = useCallback(() => {
    const defaultId = settings.defaults?.defaultBrandGuidelineId;
    if (defaultId) {
      return settings.brandGuidelines?.find(g => g.id === defaultId);
    }
    return settings.brandGuidelines?.find(g => g.isDefault);
  }, [settings.defaults?.defaultBrandGuidelineId, settings.brandGuidelines]);

  // Last used settings
  const saveLastUsedSettings = async (lastUsed: Partial<QuestionnaireAnswers>) => {
    await updateSettings("saveLastUsed", lastUsed);
  };

  // Auto-apply toggle
  const toggleAutoApplyDefaults = async (enabled: boolean) => {
    await updateSettings("toggleAutoApplyDefaults", { enabled });
  };

  const value: TrainAIContextValue = {
    settings,
    isLoading,
    error,
    defaults: settings.defaults || {},
    updateDefaults,
    clearDefaults,
    saveCurrentAsDefaults,
    brandGuidelines: settings.brandGuidelines || [],
    addBrandGuideline,
    updateBrandGuideline,
    deleteBrandGuideline,
    setDefaultBrandGuideline,
    getDefaultBrandGuideline,
    lastUsedSettings: settings.lastUsedSettings || {},
    saveLastUsedSettings,
    autoApplyDefaults: settings.autoApplyDefaults ?? true,
    toggleAutoApplyDefaults,
    refresh: fetchSettings,
  };

  return (
    <TrainAIContext.Provider value={value}>
      {children}
    </TrainAIContext.Provider>
  );
}

export function useTrainAI() {
  const context = useContext(TrainAIContext);
  if (context === undefined) {
    throw new Error("useTrainAI must be used within a TrainAIProvider");
  }
  return context;
}

// Hook for just brand guidelines
export function useBrandGuidelines() {
  const { brandGuidelines, addBrandGuideline, updateBrandGuideline, deleteBrandGuideline, setDefaultBrandGuideline, getDefaultBrandGuideline, isLoading } = useTrainAI();
  return {
    guidelines: brandGuidelines,
    addGuideline: addBrandGuideline,
    updateGuideline: updateBrandGuideline,
    deleteGuideline: deleteBrandGuideline,
    setDefault: setDefaultBrandGuideline,
    getDefault: getDefaultBrandGuideline,
    isLoading,
  };
}

// Hook for just defaults
export function useTrainAIDefaults() {
  const { defaults, updateDefaults, clearDefaults, saveCurrentAsDefaults, autoApplyDefaults, toggleAutoApplyDefaults, isLoading } = useTrainAI();
  return {
    defaults,
    updateDefaults,
    clearDefaults,
    saveCurrentAsDefaults,
    autoApply: autoApplyDefaults,
    toggleAutoApply: toggleAutoApplyDefaults,
    isLoading,
  };
}
