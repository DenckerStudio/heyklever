"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DocumentationRenderer } from "@/components/ui/documentation-renderer";
import { KleverDocsToc } from "@/components/ui/klever-docs-toc";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ChevronLeft, 
  Trash2, 
  PenTool, 
  Save, 
  X, 
  Plus,
  Eye,
  EyeOff
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EditorToolbar } from "@/components/ui/editor-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Predefined templates
const DOC_TEMPLATES = {
  blank: "",
  gettingStarted: `# Getting Started

Welcome to our documentation! This guide will help you get started.

## Overview

Brief overview of what this documentation covers.

## Prerequisites

- Requirement 1
- Requirement 2
- Requirement 3

## Quick Start

1. Step one
2. Step two
3. Step three

## Next Steps

Continue with [Advanced Topics](#advanced-topics) or [API Reference](#api-reference).
`,
  apiReference: `# API Reference

Complete API documentation for all endpoints.

## Authentication

All API requests require authentication using an API key.

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Base URL

\`\`\`
https://api.example.com/v1
\`\`\`

## Endpoints

### GET /endpoint

Description of the endpoint.

**Parameters:**
- \`param1\` (string, required): Description
- \`param2\` (number, optional): Description

**Response:**
\`\`\`json
{
  "data": {},
  "status": "success"
}
\`\`\`
`,
  guide: `# User Guide

Complete guide to using our platform.

## Introduction

This guide covers everything you need to know.

## Features

### Feature 1

Description of feature 1.

### Feature 2

Description of feature 2.

## Best Practices

- Tip 1
- Tip 2
- Tip 3

## Troubleshooting

### Common Issues

**Issue 1:** Description
**Solution:** How to fix it

**Issue 2:** Description
**Solution:** How to fix it
`,
  faq: `# Frequently Asked Questions

Common questions and answers.

## General

### What is this?

Answer to the question.

### How does it work?

Answer to the question.

## Technical

### Question 1?

Answer 1.

### Question 2?

Answer 2.

## Support

For more help, contact [support@example.com](mailto:support@example.com).
`,
};

interface PublicDoc {
  id: string;
  title: string;
  slug: string;
  content: string;
  order_index: number;
  is_published: boolean;
  topic: string | null;
  created_at: string;
  updated_at: string;
}

interface KleverDocsPageProps {
  initialDoc?: PublicDoc | null;
  isAdmin?: boolean;
  onBack?: () => void;
  onDocChange?: () => void;
}

export function KleverDocsPage({ 
  initialDoc, 
  isAdmin = false, 
  onBack,
  onDocChange 
}: KleverDocsPageProps) {
  const [doc, setDoc] = useState<PublicDoc | null>(initialDoc || null);
  const [isEditing, setIsEditing] = useState(!initialDoc && isAdmin);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editOrderIndex, setEditOrderIndex] = useState(0);
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editTopic, setEditTopic] = useState<string>("__none__");
  const [loading, setLoading] = useState(false);
  
  // Predefined topics
  const TOPICS = [
    "API",
    "Billing",
    "AI",
    "Getting Started",
    "Integrations",
    "Team Management",
    "Security",
    "Troubleshooting",
    "General",
  ];
  const [isCreating, setIsCreating] = useState(!initialDoc && isAdmin);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
  const editorRef = useRef<HTMLDivElement>(null);

  // TipTap Editor with Markdown support
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: editContent,
    editable: isEditing,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-6',
      },
    },
    onUpdate: ({ editor }) => {
      // @ts-expect-error - TipTap markdown storage typing
      const markdown = editor.storage.markdown.getMarkdown();
      setEditContent(markdown);
    },
  }, [isEditing]);

  // Update editor content when editContent changes externally
  useEffect(() => {
    if (editor && isEditing) {
      // @ts-expect-error - TipTap markdown storage typing
      const currentMarkdown = editor.storage.markdown?.getMarkdown();
      if (editContent !== currentMarkdown) {
        editor.commands.setContent(editContent);
      }
    }
  }, [editContent, editor, isEditing]);

  useEffect(() => {
    if (doc) {
      setEditContent(doc.content);
      setEditTitle(doc.title);
      setEditSlug(doc.slug);
      setEditOrderIndex(doc.order_index);
      setEditIsPublished(doc.is_published);
      setEditTopic(doc.topic || "__none__");
    }
  }, [doc]);

  // Apply template when creating and template changes
  useEffect(() => {
    if (isCreating && selectedTemplate && editor) {
      const templateContent = DOC_TEMPLATES[selectedTemplate as keyof typeof DOC_TEMPLATES];
      if (templateContent !== undefined) {
        setEditContent(templateContent);
        editor.commands.setContent(templateContent);
      }
    }
  }, [selectedTemplate, isCreating, editor]);

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm("Are you sure you want to delete this document?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/public-docs/${doc.slug}`, { 
        method: "DELETE" 
      });
      
      if (res.ok) {
        onDocChange?.();
        onBack?.();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting doc:", error);
      alert("Error deleting document");
    } finally {
      setLoading(false);
    }
  };

  const handleModify = () => {
    if (doc) {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (doc) {
      setEditContent(doc.content);
      setEditTitle(doc.title);
      setEditSlug(doc.slug);
      setEditOrderIndex(doc.order_index);
      setEditIsPublished(doc.is_published);
      setEditTopic(doc.topic || "__none__");
    } else {
      setEditContent("");
      setEditTitle("");
      setEditSlug("");
      setEditOrderIndex(0);
      setEditIsPublished(false);
      setEditTopic("__none__");
    }
  };

  const handleSave = async () => {
    if (!doc && !isCreating) return;
    
    setLoading(true);
    try {
      const url = isCreating 
        ? "/api/public-docs" 
        : `/api/public-docs/${doc?.slug}`;
      
      const method = isCreating ? "POST" : "PUT";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          slug: editSlug,
          content: editContent,
          order_index: editOrderIndex,
          is_published: editIsPublished,
          topic: editTopic === "__none__" ? null : editTopic,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setDoc(data.document);
        setIsEditing(false);
        setIsCreating(false);
        onDocChange?.();
        // If creating, navigate to the new doc
        if (isCreating) {
          // The parent will handle navigation
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save document");
      }
    } catch (error) {
      console.error("Error saving doc:", error);
      alert("Error saving document");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setDoc({
      id: "",
      title: "",
      slug: "",
      content: "",
      order_index: 0,
      is_published: false,
      topic: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setEditContent("");
    setEditTitle("");
    setEditSlug("");
    setEditOrderIndex(0);
    setEditIsPublished(false);
    setEditTopic("__none__");
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  useEffect(() => {
    if (editTitle && isCreating) {
      setEditSlug(generateSlug(editTitle));
    }
  }, [editTitle, isCreating]);

  if (isEditing || isCreating) {
    return (
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background border-b border-border/40 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {onBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  handleCancelEdit();
                  onBack();
                }}
                className="hover:bg-primary/10 hover:text-primary shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
                {isCreating ? "Create New Document" : "Editing Document"}
              </h1>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                handleCancelEdit();
                if (isCreating && onBack) {
                  onBack();
                }
              }}
              className="gap-2 flex-1 sm:flex-initial hover:bg-red-500/10 hover:text-red-500"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSave}
              disabled={loading || !editTitle || !editSlug || !editContent}
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          <div className="space-y-4 sm:space-y-6">
            {/* Template Selection (only when creating) */}
            {isCreating && (
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Blank Document</SelectItem>
                    <SelectItem value="gettingStarted">Getting Started</SelectItem>
                    <SelectItem value="apiReference">API Reference</SelectItem>
                    <SelectItem value="guide">User Guide</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                  </SelectContent>
                </Select>
                {selectedTemplate !== "blank" && (
                  <p className="text-xs text-muted-foreground">
                    Template will be applied to the editor
                  </p>
                )}
              </div>
            )}

            {/* Metadata Form - Borderless */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Document title"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Slug</Label>
                <Input
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  placeholder="url-slug"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Topic</Label>
                <Select value={editTopic} onValueChange={setEditTopic}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Topic</SelectItem>
                    {TOPICS.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Order Index</Label>
                <Input
                  type="number"
                  value={editOrderIndex}
                  onChange={(e) => setEditOrderIndex(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2 w-full">
                  <Switch
                    id="published"
                    checked={editIsPublished}
                    onCheckedChange={setEditIsPublished}
                  />
                  <Label htmlFor="published" className="cursor-pointer text-xs font-medium text-muted-foreground">
                    Published
                  </Label>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="overflow-hidden bg-background rounded-lg">
              {/* Toolbar */}
              <EditorToolbar editor={editor} />
              
              <style dangerouslySetInnerHTML={{__html: `
                .tiptap {
                  outline: none;
                }
                .tiptap p.is-editor-empty:first-child::before {
                  color: hsl(var(--muted-foreground));
                  content: attr(data-placeholder);
                  float: left;
                  height: 0;
                  pointer-events: none;
                }
                .tiptap h1 {
                  font-size: 2.25rem;
                  font-weight: 800;
                  line-height: 1.25;
                  margin-top: 0;
                  margin-bottom: 3rem;
                }
                .tiptap h2 {
                  font-size: 1.875rem;
                  font-weight: 600;
                  line-height: 1.25;
                  margin-top: 4rem;
                  margin-bottom: 1.5rem;
                  padding-bottom: 0.5rem;
                  border-bottom: 1px solid hsl(var(--border));
                }
                .tiptap h2:first-child {
                  margin-top: 0;
                }
                .tiptap h3 {
                  font-size: 1.5rem;
                  font-weight: 600;
                  line-height: 1.25;
                  margin-top: 2.5rem;
                  margin-bottom: 1rem;
                }
                .tiptap p {
                  line-height: 2rem;
                  margin-top: 0;
                  margin-bottom: 0;
                  color: hsl(var(--foreground) / 0.8);
                }
                .tiptap p:not(:first-child) {
                  margin-top: 2rem;
                }
                .tiptap ul,
                .tiptap ol {
                  margin-top: 1.5rem;
                  margin-bottom: 1.5rem;
                  padding-left: 1.5rem;
                  color: hsl(var(--foreground) / 0.8);
                }
                .tiptap ul {
                  list-style-type: disc;
                }
                .tiptap ol {
                  list-style-type: decimal;
                }
                .tiptap li {
                  margin-top: 0.5rem;
                  padding-left: 0.5rem;
                }
                .tiptap code {
                  background-color: hsl(var(--muted));
                  border-radius: 0.25rem;
                  padding: 0.125rem 0.375rem;
                  font-size: 0.875em;
                  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
                }
                .tiptap pre {
                  background-color: hsl(var(--muted));
                  border-radius: 0.5rem;
                  padding: 1rem;
                  margin-top: 1.5rem;
                  margin-bottom: 1.5rem;
                  overflow-x: auto;
                }
                .tiptap pre code {
                  background-color: transparent;
                  padding: 0;
                }
                .tiptap blockquote {
                  border-left: 4px solid hsl(var(--primary) / 0.2);
                  padding-left: 1.5rem;
                  font-style: italic;
                  margin-top: 2rem;
                  margin-bottom: 2rem;
                  color: hsl(var(--muted-foreground));
                }
                .tiptap a {
                  color: hsl(var(--primary));
                  text-decoration: underline;
                  text-underline-offset: 2px;
                }
                .tiptap a:hover {
                  color: hsl(var(--primary) / 0.8);
                }
                .tiptap strong {
                  font-weight: 600;
                  color: hsl(var(--foreground) / 0.9);
                }
              `}} />
              <div 
                ref={editorRef}
                className="min-h-[500px] max-h-[calc(100vh-300px)] overflow-auto relative bg-background"
              >
                {editor && (
                  <EditorContent 
                    editor={editor} 
                    className="h-full"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doc && !isCreating) {
    return null;
  }

  // If creating new doc, show editor
  if (isCreating && isEditing) {
    // This will be handled by the editing section above
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border/40 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="hover:bg-primary/10 hover:text-primary shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">{doc?.title || ""}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doc?.is_published ? (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Published
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  Draft
                </span>
              )}
              {" • "}
              Updated {doc?.updated_at ? new Date(doc.updated_at).toLocaleDateString() : ""}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDelete}
              className="gap-2 flex-1 sm:flex-initial hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleModify}
              className="gap-2 flex-1 sm:flex-initial hover:bg-primary/5"
            >
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </div>
        )}
      </div>

      {/* Content Area with TOC */}
      <div className="flex-1 w-full px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 max-w-7xl mx-auto">
          {/* Left Sidebar TOC - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block">
            <KleverDocsToc content={doc?.content || ""} />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <DocumentationRenderer content={doc?.content || ""} hideToc={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

