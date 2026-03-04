"use client";

import { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { motion as Motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    LoaderIcon,
    FileText,
    X,
    FolderOpen,
    Paperclip,
    Sparkles,
    Globe,
    Brain,
} from "lucide-react";
import * as React from "react";
import Image from "next/image";
import { MarkdownContent } from "@/components/ui/markdown-content";
import type { DriveItem } from "@/components/drive/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChatMessageMarkdown } from "@/components/ui/chat-message";
import { type Action, type StructuredMessage, type StructuredEnvelope } from "@/lib/n8n-chat";
import { formatChatAnswer } from "@/lib/chat-response-utils";
import {
    ChatInput,
    ChatInputEditor,
    ChatInputMention,
    ChatInputGroupAddon,
    ChatInputSubmitButton,
    ChatInputGroupButton,
    useChatInput,
    createMentionConfig,
    type BaseMentionItem,
} from "@/components/ui/chat-input";

// Command item types for the @ mention system
type MentionType = 'file' | 'folder' | 'action-create' | 'action-browser' | 'action-thinking';

interface NotebookMentionItem extends BaseMentionItem {
    type: MentionType;
    path?: string;
    icon?: React.ReactNode;
    description?: string;
}

// Static command options for special mentions
const SPECIAL_MENTIONS: NotebookMentionItem[] = [
    {
        id: 'action-create',
        name: 'Create document',
        type: 'action-create',
        icon: <FileText className="w-4 h-4" />,
        description: 'Create a new file',
    },
    {
        id: 'action-browser',
        name: 'Browser',
        type: 'action-browser',
        icon: <Globe className="w-4 h-4" />,
        description: 'Search the web',
    },
    {
        id: 'action-thinking',
        name: 'Thinking',
        type: 'action-thinking',
        icon: <Brain className="w-4 h-4" />,
        description: 'Deep reasoning',
    },
];

interface NotebookChatProps {
  teamId: string;
  teamName: string;
  teamLogo?: string | null;
  selectedFile: DriveItem | null;
  onDeselectFile: () => void;
  language: { code: string; name: string; flag: string };
  sessionId?: string;
}

export interface NotebookChatRef {
  sendMessage: (text: string) => void;
}

function StructuredMessageContent({
  message,
  onAction
}: {
  message: StructuredMessage | StructuredMessage[];
  onAction: (action: Action) => void;
}) {
  const messages = Array.isArray(message) ? message : [message];
  
  // Helper to render content and actions (used in multiple cases)
  const renderTextContent = (msg: StructuredMessage, idx: number) => (
    <div key={idx}>
      {msg.content && <ChatMessageMarkdown content={msg.content} />}
      {msg.actions && msg.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {msg.actions.map((action, actionIdx) => (
            <Button
              key={actionIdx}
              variant="secondary"
              size="sm"
              onClick={() => onAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, idx) => {
        // Handle case where msg might be a string (fallback)
        if (typeof msg === 'string') {
          return <ChatMessageMarkdown key={idx} content={msg} />;
        }
        
        // Handle case where msg might not have expected structure
        if (!msg || typeof msg !== 'object') {
          return null;
        }

        const msgType = msg.type || 'text'; // Default to 'text' if no type

        switch (msgType) {
          case 'text':
            return renderTextContent(msg, idx);
          case 'image':
            return (
              <div key={idx} className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
                {msg.content && <Image src={msg.content} alt="Content" fill className="object-cover" />}
              </div>
            );
          case 'card':
            return (
              <Card key={idx} className="p-4 bg-background/50 border-border/50">
                {msg.title && <h4 className="font-semibold mb-2">{msg.title}</h4>}
                {msg.content && <p className="text-sm text-muted-foreground">{msg.content}</p>}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {msg.actions.map((action, actionIdx) => (
                      <Button
                        key={actionIdx}
                        variant="outline"
                        size="sm"
                        onClick={() => onAction(action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            );
          case 'action':
            // Standalone actions only (no content)
            if (msg.actions && msg.actions.length > 0) {
              return (
                <div key={idx} className="flex flex-wrap gap-2">
                  {msg.actions.map((action, actionIdx) => (
                    <Button
                      key={actionIdx}
                      variant="secondary"
                      size="sm"
                      onClick={() => onAction(action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )
            }
            return null;
          default:
            // Fallback: if there's content or actions, render as text type
            if (msg.content || (msg.actions && msg.actions.length > 0)) {
              return renderTextContent(msg, idx);
            }
            return null;
        }
      })}
    </div>
  );
}

// Helper component for individual source item with hover tooltip
function SourceItem({ 
    fileName, 
    excerpts, 
    relevance 
}: { 
    fileName: string; 
    excerpts: string[]; 
    relevance: 'high' | 'medium' | 'low';
}) {
    const [isHovered, setIsHovered] = useState(false);
    const emoji = relevance === "high" ? "🟢" : relevance === "medium" ? "🟡" : "🔴";
    
    return (
        <div 
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all duration-200 cursor-help",
                isHovered 
                    ? "bg-primary/10 border-primary/30 shadow-sm" 
                    : "bg-background/40 border-border/20 hover:bg-background/60 hover:border-border/40"
            )}>
                <span className="text-[10px]">{emoji}</span>
                <span className="font-medium truncate max-w-[150px]">
                    {fileName}
                </span>
                {excerpts.length > 1 && (
                    <span className="text-[9px] bg-muted/60 px-1.5 py-0.5 rounded-full text-muted-foreground">
                        {excerpts.length}
                    </span>
                )}
            </div>
            
            {/* Animated Tooltip with wobble water effect */}
            {excerpts.length > 0 && (
                <Motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={isHovered ? { 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                    } : { 
                        opacity: 0, 
                        y: 8, 
                        scale: 0.95 
                    }}
                    transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                        mass: 0.8
                    }}
                    className={cn(
                        "absolute bottom-full left-0 mb-2 w-72 max-w-[80vw] z-50",
                        !isHovered && "pointer-events-none"
                    )}
                >
                    <Motion.div
                        animate={isHovered ? {
                            boxShadow: [
                                "0 4px 20px rgba(0,0,0,0.1), 0 0 0 0 rgba(var(--primary), 0.1)",
                                "0 8px 30px rgba(0,0,0,0.15), 0 0 0 4px rgba(var(--primary), 0.05)",
                                "0 4px 20px rgba(0,0,0,0.1), 0 0 0 0 rgba(var(--primary), 0.1)"
                            ]
                        } : {}}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="bg-popover/95 backdrop-blur-lg text-popover-foreground rounded-xl border border-border/40 overflow-hidden"
                    >
                        {/* Header with wobble effect */}
                        <Motion.div 
                            className="px-3 py-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/20"
                            animate={isHovered ? {
                                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                            } : {}}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            style={{ backgroundSize: "200% 100%" }}
                        >
                            <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                                Excerpts from source
                            </p>
                        </Motion.div>
                        
                        {/* Excerpts list with staggered animation */}
                        <div className="p-2 max-h-48 overflow-y-auto scrollbar-thin space-y-1.5">
                            {excerpts.map((excerpt, idx) => (
                                <Motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={isHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                                    transition={{ 
                                        delay: idx * 0.05,
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 20
                                    }}
                                    className="group/excerpt"
                                >
                                    <div className="relative pl-3 pr-2 py-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors duration-200">
                                        {/* Water ripple indicator */}
                                        <Motion.div
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary/40"
                                            animate={isHovered ? {
                                                height: ["16px", "20px", "16px"],
                                                opacity: [0.4, 0.7, 0.4]
                                            } : {}}
                                            transition={{
                                                duration: 1.5,
                                                delay: idx * 0.1,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        />
                                        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                            &ldquo;{excerpt}&rdquo;
                                        </p>
                                    </div>
                                </Motion.div>
                            ))}
                        </div>
                        
                        {/* Bottom water wave effect */}
                        <div className="relative h-1 overflow-hidden">
                            <Motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                                animate={isHovered ? {
                                    x: ["-100%", "100%"]
                                } : {}}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                        </div>
                    </Motion.div>
                </Motion.div>
            )}
        </div>
    );
}

// Helper to expand sources - groups by filename and removes duplicates
function SourcesList({ sources }: { sources: NonNullable<StructuredMessage['metadata']>['sources'] }) {
    if (!sources || sources.length === 0) return null;
    
    // Group sources by file_name and collect unique excerpts
    const groupedSources = sources.reduce((acc, source) => {
        const existing = acc.find(g => g.fileName === source.file_name);
        if (existing) {
            // Add excerpt if it's unique and not empty
            if (source.excerpt && !existing.excerpts.includes(source.excerpt)) {
                existing.excerpts.push(source.excerpt);
            }
            // Keep the highest relevance
            const relevanceOrder = { high: 3, medium: 2, low: 1 };
            if (relevanceOrder[source.relevance] > relevanceOrder[existing.relevance]) {
                existing.relevance = source.relevance;
            }
        } else {
            acc.push({
                fileName: source.file_name,
                excerpts: source.excerpt ? [source.excerpt] : [],
                relevance: source.relevance
            });
        }
        return acc;
    }, [] as Array<{ fileName: string; excerpts: string[]; relevance: 'high' | 'medium' | 'low' }>);

    return (
        <div className="mt-4 pt-4 border-t border-border/20">
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                Sources
            </p>
            <div className="flex flex-wrap gap-2">
                {groupedSources.map((source, idx) => (
                    <SourceItem
                        key={idx}
                        fileName={source.fileName}
                        excerpts={source.excerpts}
                        relevance={source.relevance}
                    />
                ))}
            </div>
        </div>
    );
}

export const NotebookChat = forwardRef<NotebookChatRef, NotebookChatProps>(({ teamId, teamName, teamLogo, selectedFile, onDeselectFile, language, sessionId }, ref) => {
    const [isTyping, setIsTyping] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string | StructuredMessage | StructuredMessage[] }>>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [availableFiles, setAvailableFiles] = useState<NotebookMentionItem[]>([]);
    const [_showLinkDialog, _setShowLinkDialog] = useState(false);
    const [_linkUrl, _setLinkUrl] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const supabase = createSupabaseBrowserClient();

    const mentionConfig = useMemo(() => createMentionConfig<NotebookMentionItem>({
        type: 'file',
        trigger: '@',
        items: availableFiles,
        filter: (query, items) => {
            const normalizedQuery = query.toLowerCase();
            
            if (!normalizedQuery) {
                // Default view: Special mentions + 5 recent/top files
                return [...SPECIAL_MENTIONS, ...items.slice(0, 5)];
            }

            // Helper to calculate relevance score
            const getScore = (item: NotebookMentionItem) => {
                const name = item.name.toLowerCase();
                const path = item.path?.toLowerCase() || '';
                
                if (name === normalizedQuery) return 100; // Exact match
                if (name.startsWith(normalizedQuery)) return 80; // Starts with
                if (name.includes(normalizedQuery)) return 60; // Contains
                if (path.includes(normalizedQuery)) return 40; // Path contains
                return 0;
            };

            // Filter and sort special mentions
            const filteredSpecial = SPECIAL_MENTIONS
                .map(item => ({ item, score: getScore(item) }))
                .filter(x => x.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(x => x.item);

            // Filter and sort files
            const filteredFiles = items
                .map(item => ({ item, score: getScore(item) }))
                .filter(x => x.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(x => x.item);

            // If we have very few file matches, but query matches special actions loosely, show actions.
            // If query is specific to a file, file matches will have high score.
            
            // Limit total results to keep UI clean
            return [...filteredSpecial, ...filteredFiles].slice(0, 10);
        },
        renderItem: (item, isSelected) => (
            <div className={cn(
                "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg transition-colors",
                isSelected ? "bg-primary/10 text-primary" : "text-foreground/80"
            )}>
                <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                    {item.icon || (item.type === 'folder' ? (
                        <FolderOpen className="w-4 h-4" />
                    ) : (
                        <FileText className="w-4 h-4" />
                    ))}
                </div>
                <div className="flex flex-col min-w-0 gap-0.5 overflow-hidden">
                    <span className="truncate text-sm font-medium leading-none">{item.name}</span>
                    {item.description ? (
                        <span className="text-[10px] text-muted-foreground truncate leading-none opacity-80">{item.description}</span>
                    ) : item.path ? (
                        <span className="text-[10px] text-muted-foreground/60 truncate leading-none font-mono">{item.path}</span>
                    ) : null}
                </div>
            </div>
        ),
        editorMentionClass: "bg-primary/10 text-primary hover:bg-primary/20 font-medium rounded-sm px-1 py-0.5 transition-colors cursor-pointer",
    }), [availableFiles]);

    // Setup useChatInput hook
    const { value, onChange, clear, handleSubmit: hookSubmit } = useChatInput({
        mentions: {
            mention: mentionConfig,
        },
        onSubmit: (parsedValue) => {
             // We need to filter out special actions from being treated as files in the message
             // or handle them. 
             // parsedValue.mention will contain the selected items.
             // If mentionConfig key is 'mention', parsedValue will have 'mention' property.
             
             // Cast to any because type inference might be tricky with the change
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const mentions = (parsedValue as any).mention as NotebookMentionItem[] | undefined;
             const realFiles = mentions?.filter(m => m.type === 'file' || m.type === 'folder');
             
             handleSendMessage(parsedValue.content, realFiles);
        },
    });

    // Fetch available files for @ mentions
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                // Fetch from both private and public scopes
                const [privateRes, publicRes] = await Promise.all([
                    fetch('/api/storage/list?scope=private&path='),
                    fetch('/api/storage/list?scope=public&path='),
                ]);
                
                const [privateData, publicData] = await Promise.all([
                    privateRes.json(),
                    publicRes.json(),
                ]);

                const mapFiles = (files: Array<{ id?: string; name: string; metadata?: { mimetype?: string } }>, scope: string): NotebookMentionItem[] => 
                    files
                        .filter(f => f.name !== '.keep' && f.name !== 'private' && f.name !== 'public')
                        .map(f => ({
                            id: f.id || `${scope}-${f.name}`,
                            name: f.name,
                            path: `${scope}/${f.name}`,
                            type: f.metadata ? 'file' as const : 'folder' as const,
                        }));

                const allFiles = [
                    ...mapFiles(privateData.files || [], 'private'),
                    ...mapFiles(publicData.files || [], 'public'),
                ];
                
                setAvailableFiles(allFiles);
            } catch (error) {
                console.error('Failed to fetch files for mentions:', error);
            }
        };

        fetchFiles();
    }, []);

    // Fetch message history when sessionId changes
    useEffect(() => {
        if (!sessionId || !teamId) {
            setMessages([]);
            return;
        }

        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            setMessages([]);
            clear();

            try {
                // Fetch search analytics entries for this session
                const { data, error } = await supabase
                    .from('search_analytics')
                    .select('query_text, was_successful, created_at, id')
                    .eq('team_id', teamId)
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                if (data) {
                    const history = data.map((item) => ({
                        role: 'user' as const,
                        content: item.query_text
                    }));
                    setMessages(history);
                }
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [sessionId, teamId, supabase, clear]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping, isLoadingHistory]);

    // Handle file upload
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachedFile(file);
        }
    }, []);

    // Handle command selection from mentions (for future link dialog implementation)
    const _handleCommandAction = useCallback((commandType: string) => {
        switch (commandType) {
            case 'upload':
                fileInputRef.current?.click();
                break;
            case 'link':
                _setShowLinkDialog(true);
                break;
            // 'files' is handled by the @ trigger directly
        }
    }, []);

    const handleSendMessage = async (text: string, mentionedFiles?: NotebookMentionItem[]) => {
        if (!text.trim() && !attachedFile) return;

        const userMessage = text.trim();
        
        // Build message content with file references
        let messageContent = userMessage;
        if (mentionedFiles && mentionedFiles.length > 0) {
            const fileRefs = mentionedFiles.map(f => f.name).join(', ');
            if (!messageContent.includes(fileRefs)) {
                messageContent = `${messageContent}\n\n📎 Referenced: ${fileRefs}`;
            }
        }
        if (attachedFile) {
            messageContent = `${messageContent}\n\n📎 Attached: ${attachedFile.name}`;
        }

        clear();
        setAttachedFile(null);

        setMessages(prev => [...prev, { role: 'user', content: messageContent }]);

        setIsTyping(true);
        setIsStreaming(false);
        
        // Track if we've added the assistant message yet
        let hasAddedAssistantMessage = false;
        
        try {
            const context = selectedFile 
                ? `Focus your answer on the file: ${selectedFile.name}.` 
                : 'general'; 

            // Use the API route for streaming proxy support
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
              },
              body: JSON.stringify({
                message: userMessage,
                teamId,
                context: context === 'general' ? 'private' : context,
                streaming: true,
                sessionId: sessionId,
                // Pass file context as part of the message if selected
                ...(selectedFile && {
                  fileContext: {
                    name: selectedFile.name,
                    path: selectedFile.path,
                    id: selectedFile.id,
                  },
                }),
              }),
            });

            const contentType = response.headers.get('content-type') || '';
            
            // Check if the response is streaming (text/event-stream or chunked)
            if (contentType.includes('text/event-stream') || contentType.includes('text/plain') || !contentType.includes('application/json')) {
              // Handle streaming response
              const reader = response.body?.getReader();
              if (!reader) {
                throw new Error('Response body is not readable');
              }

              const decoder = new TextDecoder();
              let fullText = '';

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                
                // Handle Server-Sent Events format
                if (chunk.includes('data:')) {
                  const lines = chunk.split('\n');
                  for (const line of lines) {
                    if (line.startsWith('data:')) {
                      const data = line.slice(5).trim();
                      if (data && data !== '[DONE]') {
                        try {
                          // Try to parse as JSON
                          const parsed = JSON.parse(data);
                          const content = parsed.choices?.[0]?.delta?.content || 
                                          parsed.content || 
                                          parsed.text ||
                                          parsed.chunk ||
                                          '';
                          if (content) {
                            fullText += content;
                          }
                        } catch {
                          // Not JSON, use as plain text
                          fullText += data;
                        }
                      }
                    }
                  }
                } else {
                  // Plain text streaming
                  fullText += chunk;
                }

                // On first content, add the assistant message and switch to streaming mode
                if (!hasAddedAssistantMessage && fullText) {
                  hasAddedAssistantMessage = true;
                  setIsStreaming(true);
                  setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
                } else if (hasAddedAssistantMessage) {
                  // Update the last assistant message with accumulated text
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                      newMessages[lastIndex] = { ...newMessages[lastIndex], content: fullText };
                    }
                    return newMessages;
                  });
                }
              }
            } else {
              // Handle JSON response (fallback for non-streaming)
              const data = await response.json();
              
              // Handle different response structures
              let aiContent: string | StructuredMessage | StructuredMessage[] = "I'm sorry, I couldn't process your request.";
              let sources: Array<{ file_name: string; relevance: 'high' | 'medium' | 'low'; excerpt?: string }> = [];

              // Case 1: Array response with output object (n8n specific format)
              if (Array.isArray(data) && data[0]?.output) {
                  const output = data[0].output;
                  const message = output.message;
                  
                  if (message && typeof message === 'object') {
                      const structuredMsg: StructuredMessage = {
                          type: message.type || 'text',
                          content: message.content,
                          title: message.title,
                          metadata: message.metadata,
                          actions: message.actions
                      };
                      aiContent = structuredMsg;
                      
                      if (message.metadata?.sources) {
                          sources = message.metadata.sources;
                      } else if (output.metadata?.sources) {
                          sources = output.metadata.sources;
                      }
                  } else if (typeof message === 'string') {
                      aiContent = message;
                  } else {
                      aiContent = output.content || output.answer || JSON.stringify(message);
                  }
              } 
              // Case 2: Structured Envelope
              else if (data && typeof data === 'object' && 'response' in data && (data as StructuredEnvelope).response) {
                  const envelope = data as StructuredEnvelope;
                  const structured = envelope.response;
                  
                  let extractedMessage = structured.message;
                  if (!extractedMessage && structured.answer && typeof structured.answer === 'object') {
                      const nestedAnswer = structured.answer as unknown as { message?: StructuredMessage | StructuredMessage[] };
                      if (nestedAnswer.message) {
                          extractedMessage = nestedAnswer.message;
                      }
                  }

                  if (extractedMessage) {
                      aiContent = extractedMessage;
                  } else {
                      const formatted = formatChatAnswer(structured?.answer || 'No answer provided');
                      aiContent = formatted.text;
                  }
                  
                  if (structured.sources) {
                      sources = structured.sources;
                  }
              }
              // Case 3: Plain text or simple response
              else if (typeof data === 'string') {
                  aiContent = data;
              }
              // Case 4: Simple response object with nested answer
              else if (data.response?.answer) {
                  aiContent = data.response.answer;
                  if (data.response.sources) {
                      sources = data.response.sources;
                  }
              }
              // Case 5: Other response formats
              else {
                  aiContent = data.output || data.text || data.content || "I'm sorry, I couldn't process your request.";
              }

              // Attach sources if available
              if (typeof aiContent === 'string' && sources && sources.length > 0) {
                  aiContent = {
                      type: 'text',
                      content: aiContent,
                      metadata: { sources }
                  };
              } else if (typeof aiContent === 'object' && !Array.isArray(aiContent) && sources && sources.length > 0) {
                  if (!aiContent.metadata) aiContent.metadata = {};
                  if (!aiContent.metadata.sources) aiContent.metadata.sources = sources;
              }

              // Add the assistant message (JSON responses don't stream)
              hasAddedAssistantMessage = true;
              setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
            }

        } catch (error) {
            console.error('Error getting AI response:', error);
            // Only add error message if we haven't added any response yet
            if (!hasAddedAssistantMessage) {
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "Error processing request. Please try again." 
              }]);
            }
        } finally {
            setIsTyping(false);
            setIsStreaming(false);
        }
    };

    // Expose sendMessage function via ref
    useImperativeHandle(ref, () => ({
        sendMessage: (text: string) => {
            handleSendMessage(text);
        }
    }), [attachedFile, clear, selectedFile, teamId, language, sessionId]);

    return (
      <div className="flex flex-col h-full w-full relative group">
        {/* Chat Header for Context */}
        {selectedFile && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-top-2 fade-in-0 duration-300">
            <div className="bg-background/80 backdrop-blur-md border border-border/40 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground/80 flex items-center gap-2">
                Chatting with{" "}
                <span className="text-primary">{selectedFile.name}</span>
                <button
                  onClick={onDeselectFile}
                  className="rounded-full p-1 bg-primary/10 text-primary hover:bg-primary/20 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin pt-16 pb-4"
        >
          {messages.length === 0 && !isLoadingHistory && (
            <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
              {/* Animated Background Glow */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10 flex flex-col items-center">
                {/* Logo with Animated Ring */}
                <Motion.div
                  className="relative mb-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="relative w-20 h-20">
                    {/* Animated ring */}
                    <Motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-primary/20"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0.2, 0.5],
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "easeInOut" 
                      }}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
                      <Image
                        src={teamLogo || "/logo-icon.png"}
                        alt={teamName}
                        width={48}
                        height={48}
                        className="object-contain"
                        priority
                      />
                    </div>
                  </div>
                </Motion.div>

                {/* Welcome Text */}
                <Motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    {selectedFile
                      ? `Chat about ${selectedFile.name}`
                      : `Welcome to ${teamName} AI`}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {selectedFile
                      ? "I can summarize, analyze, find key points, or answer any questions about this file."
                      : "Ask questions about your files, search for information, or get help with your work."}
                  </p>
                </Motion.div>

                {/* Helper Text */}
                <Motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-xs text-muted-foreground/50 mt-6"
                >
                  Type @ to mention files • Press Enter to send
                </Motion.p>
              </div>
            </div>
          )}

          {isLoadingHistory && (
             <div className="flex justify-center py-10">
                 <LoaderIcon className="w-6 h-6 animate-spin text-muted-foreground/50" />
             </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] px-4 py-3 rounded-2xl text-sm backdrop-blur-sm border transition-all duration-200 shadow-sm",
                  message.role === "user"
                    ? "bg-primary/90 text-primary-foreground rounded-br-md border-transparent hover:border-primary/60"
                    : "bg-muted/30 text-foreground rounded-bl-md border-border/20 hover:bg-muted/40 hover:border-border/30"
                )}
              >
                {message.role === "assistant" ? (
                  typeof message.content === 'string' ? (
                  <MarkdownContent content={message.content} className="prose-sm" />
                ) : (
                    <>
                        <StructuredMessageContent 
                            message={message.content} 
                            onAction={(action) => {
                                if (action.actionType === "postback") {
                                    // Set input value using the TipTap JSON format
                                    onChange({
                                        type: "doc",
                                        content: [
                                            {
                                                type: "paragraph",
                                                content: [
                                                    {
                                                        type: "text",
                                                        text: action.value
                                                    }
                                                ]
                                            }
                                        ]
                                    });
                                } else if (action.actionType === "link") {
                                    window.open(action.value, "_blank");
                                }
                            }}
                        />
                        {/* Display Sources if available */}
                        {(() => {
                            const msg = Array.isArray(message.content) ? message.content[0] : message.content;
                            // Check for metadata first as it's optional
                            if (msg && typeof msg === 'object' && 'metadata' in msg) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const meta = (msg as any).metadata;
                                if (meta?.sources) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    return <SourcesList sources={meta.sources as any} />;
                                }
                            }
                            return null;
                        })()}
                    </>
                  )
                ) : (
                  <div className="whitespace-pre-wrap">{message.content as string}</div>
                )}
              </div>
            </div>
          ))}

          {isTyping && !isStreaming && (
            <div className="flex justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="bg-muted/20 backdrop-blur-sm px-5 py-3.5 rounded-2xl rounded-bl-md flex items-center gap-2.5 border border-border/20">
                <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Floating Input Area */}
        <div className="p-4 pt-0">
          {/* Attached File Indicator */}
          {attachedFile && (
            <Motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 px-4 py-2.5 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Paperclip className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium truncate max-w-[200px] block">{attachedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(attachedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAttachedFile(null)}
                className="p-1 hover:bg-background rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </Motion.div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />

          <ChatInput 
            onSubmit={hookSubmit} 
            isStreaming={isTyping}
            className="bg-background/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            {/* Unified mention with @ trigger */}
            <ChatInputMention
              type={mentionConfig.type}
              trigger={mentionConfig.trigger}
              items={mentionConfig.items}
              editorMentionClass={mentionConfig.editorMentionClass}
              filter={mentionConfig.filter}
            >
              {mentionConfig.renderItem}
            </ChatInputMention>

            <ChatInputEditor
              value={value}
              onChange={onChange}
              animatedPlaceholders={
                selectedFile
                  ? [
                      `Ask about ${selectedFile.name}...`,
                      `Summarize ${selectedFile.name} for me...`,
                      `What are the key insights in ${selectedFile.name}?`,
                      `Find specific information in ${selectedFile.name}...`,
                    ]
                  : [
                      "Ask me anything...",
                      "What can I help you discover?",
                      "Summarize a document for me...",
                      "Help me understand something...",
                      "Find information in my files...",
                    ]
              }
              className="px-3"
            />
            
            <ChatInputGroupAddon align="block-end">
              {/* Upload Button */}
              <ChatInputGroupButton 
                onClick={() => fileInputRef.current?.click()}
                variant="ghost" 
                size="icon-sm"
                className={cn(
                  "rounded-full",
                  attachedFile && "text-primary bg-primary/10"
                )}
                disabled={isTyping}
              >
                <Paperclip className="size-4" />
                <span className="sr-only">Attach file</span>
              </ChatInputGroupButton>

              {/* Context Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-full text-[10px] text-muted-foreground">
                {selectedFile ? (
                  <>
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{selectedFile.name}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>General</span>
                  </>
                )}
              </div>

              <ChatInputSubmitButton
                className="ml-auto rounded-xl"
                isStreaming={isTyping}
              />
            </ChatInputGroupAddon>
          </ChatInput>

          <div className="text-[10px] text-center text-muted-foreground/40 mt-2.5 font-medium flex items-center justify-center gap-1.5">
            <span>AI responses will be in {language.name}</span>
            <span className="text-xs">{language.flag}</span>
          </div>
        </div>
      </div>
    );
});

NotebookChat.displayName = 'NotebookChat';
