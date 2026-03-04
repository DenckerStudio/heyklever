import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for AI generation

interface ContentItem {
  type: "url" | "file" | "audio";
  name: string;
  url?: string;
  content?: string;
  file?: File;
}

interface QuestionnaireAnswers {
  outputType: "user-manual" | "documentation" | "step-by-step" | "blog-post" | "custom";
  customOutputType?: string;
  targetAudience: "beginner" | "intermediate" | "technical" | "mixed";
  tone: "formal" | "conversational" | "professional" | "friendly";
  length: "brief" | "detailed" | "comprehensive";
  keyTopics: string;
  brandGuidelines: string;
  language?: string;
}

// Determine primary sourceType from content array
function determineSourceType(content: ContentItem[]): "url" | "document" | "audio" {
  // Priority: audio > document > url
  if (content.some(item => item.type === "audio")) {
    return "audio";
  }
  if (content.some(item => item.type === "file")) {
    return "document";
  }
  return "url";
}

// Build targetPath for saving generated documents
function buildTargetPath(teamId: string, userId: string): string {
  return `teams/${teamId}/Private/AI-Docs`;
}

export async function POST(req: NextRequest) {
  try {
    // Check if request has FormData (files) or JSON
    const contentType = req.headers.get("content-type") || "";
    const hasFormData = contentType.includes("multipart/form-data");

    let content: ContentItem[];
    let answers: QuestionnaireAnswers;
    let teamId: string;
    let userId: string;

    if (hasFormData) {
      // Handle FormData (for document/audio files)
      const formData = await req.formData();
      
      const contentJson = formData.get("content") as string;
      const answersJson = formData.get("answers") as string;
      const teamIdParam = formData.get("teamId") as string;
      const userIdParam = formData.get("userId") as string;

      if (!contentJson || !answersJson) {
        return NextResponse.json({ error: "Content and answers are required" }, { status: 400 });
      }

      content = JSON.parse(contentJson);
      answers = JSON.parse(answersJson);
      teamId = teamIdParam || "";
      userId = userIdParam || "";

      // Get files from FormData
      const files = formData.getAll("file") as File[];
      if (files.length > 0) {
        // Match files to content items
        content = content.map((item, index) => {
          if ((item.type === "file" || item.type === "audio") && files[index]) {
            return { ...item, file: files[index] };
          }
          return item;
        });
      }
    } else {
      // Handle JSON (for URLs)
      const body = await req.json();
      content = body.content;
      answers = body.answers;
      teamId = body.teamId || "";
      userId = body.userId || "";
    }

    // Validate required fields
    if (!content || !Array.isArray(content) || content.length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    if (!answers || !answers.outputType) {
      return NextResponse.json({ error: "Questionnaire answers are required" }, { status: 400 });
    }

    // Get team ID from cookie or body
    const cookieStore = await cookies();
    teamId = teamId || cookieStore.get("team_id")?.value || "";

    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = userId || user.id;

    // Determine sourceType
    const sourceType = determineSourceType(content);
    
    // Build targetPath
    const targetPath = buildTargetPath(teamId, userId);

    // Prepare sources array for n8n
    const sources = content.map(item => ({
      type: item.type,
      name: item.name,
      url: item.url,
    }));

    // Check for n8n webhook for AI generation
    const webhookUrl = process.env.N8N_TRAIN_AI_GENERATE_WEBHOOK_URL || "https://n8n.dencker.no/webhook/guide_expert";

    if (webhookUrl) {
      try {
        let n8nRes: Response;

        if (sourceType === "url") {
          // Send JSON for URL sources
          n8nRes = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teamId,
              userId,
              sourceType,
              sources,
              answers,
              outputType: answers.outputType,
              targetPath,
            }),
          });
        } else {
          // Send FormData for document/audio sources
          const n8nFormData = new FormData();
          n8nFormData.append("teamId", teamId);
          n8nFormData.append("userId", userId);
          n8nFormData.append("sourceType", sourceType);
          n8nFormData.append("sources", JSON.stringify(sources));
          n8nFormData.append("answers", JSON.stringify(answers));
          n8nFormData.append("outputType", answers.outputType);
          n8nFormData.append("targetPath", targetPath);

          // Add files to FormData
          content.forEach((item) => {
            if (item.file) {
              n8nFormData.append("file", item.file);
            }
          });

          n8nRes = await fetch(webhookUrl, {
            method: "POST",
            body: n8nFormData,
          });
        }

        if (!n8nRes.ok) {
          const errorText = await n8nRes.text();
          console.error("n8n error:", n8nRes.status, errorText);
          throw new Error(`n8n responded with status ${n8nRes.status}`);
        }

        const result = await n8nRes.json();
        const generatedDoc = extractGeneratedDocument(result);
        
        // Save to generated_outputs as draft
        if (generatedDoc) {
          await saveToHistory(supabase, {
            teamId,
            userId,
            content: generatedDoc,
            outputType: answers.outputType,
            customOutputType: answers.customOutputType,
            answers,
            sources: content.map(c => c.name),
          });
        }
        
        return NextResponse.json({
          success: true,
          document: generatedDoc,
        });
      } catch (error) {
        console.error("n8n generation error:", error);
        // Fall through to fallback
      }
    }

    // Fallback: Generate a placeholder document
    const placeholderDocument = generatePlaceholderDocument(answers, content);

    return NextResponse.json({
      success: true,
      document: placeholderDocument,
    });

  } catch (error) {
    console.error("Train AI Generate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Safely extract the generated document text from various possible n8n response shapes
function extractGeneratedDocument(result: any): string {
  if (!result) return "";

  // Common direct shapes
  if (typeof result.document === "string") return result.document;
  if (typeof result.documentation_content === "string") return result.documentation_content;
  if (typeof result.output === "string") return result.output;
  if (typeof result.content === "string") return result.content;

  // n8n often wraps data in an array with json property
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0];
    if (first && typeof first === "object") {
      if (typeof (first as any).document === "string") return (first as any).document;
      if (typeof (first as any).documentation_content === "string") return (first as any).documentation_content;
      if (typeof (first as any).output === "string") return (first as any).output;
      if (typeof (first as any).content === "string") return (first as any).content;
      if (first.json && typeof first.json === "object") {
        const json = first.json as any;
        if (typeof json.document === "string") return json.document;
        if (typeof json.documentation_content === "string") return json.documentation_content;
        if (typeof json.output === "string") return json.output;
        if (typeof json.content === "string") return json.content;
      }
    }
  }

  // Fallback: try nested data/json properties
  if (result.data && typeof result.data === "object") {
    return extractGeneratedDocument(result.data);
  }
  if (result.json && typeof result.json === "object") {
    return extractGeneratedDocument(result.json);
  }

  return "";
}

// Extract title from markdown content
function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  const firstLine = content.split('\n')[0]?.replace(/^#+\s*/, '').trim();
  return firstLine?.substring(0, 50) || 'Untitled Document';
}

// Save generated document to history as draft
async function saveToHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  data: {
    teamId: string;
    userId: string;
    content: string;
    outputType: string;
    customOutputType?: string;
    answers: QuestionnaireAnswers;
    sources: string[];
  }
) {
  try {
    const title = extractTitle(data.content);
    await supabase
      .from('generated_outputs')
      .insert({
        team_id: data.teamId,
        title,
        output_type: data.outputType,
        custom_output_type: data.customOutputType,
        content: data.content,
        status: 'draft',
        questionnaire_answers: data.answers,
        metadata: {
          source_files: data.sources,
        },
        created_by: data.userId,
      });
  } catch (error) {
    console.error('Failed to save to history:', error);
    // Don't throw - this is non-critical
  }
}

// Generate a placeholder document when AI is not available
function generatePlaceholderDocument(
  answers: QuestionnaireAnswers,
  content: ContentItem[]
): string {
  const outputTypeMap: Record<string, string> = {
    "user-manual": "User Manual",
    "documentation": "Documentation",
    "step-by-step": "Step-by-Step Guide",
    "blog-post": "Blog Post",
    "custom": answers.customOutputType || "Document",
  };

  const title = outputTypeMap[answers.outputType];
  const sources = content.map((c) => `- ${c.name}`).join("\n");

  return `# ${title}

## Overview

This document was generated from the following sources:
${sources}

## Introduction

[This section would contain an introduction based on your source content]

## Main Content

[This section would contain the main body of your ${title.toLowerCase()}, structured according to your preferences:
- Target audience: ${answers.targetAudience}
- Tone: ${answers.tone}
- Length: ${answers.length}]

${answers.keyTopics ? `### Key Topics\n\n${answers.keyTopics.split(',').map(t => `- ${t.trim()}`).join('\n')}\n\n` : ""}

## Conclusion

[This section would summarize the key points]

---

*Note: This is a placeholder document. Connect your AI service to generate actual content.*`;
}
