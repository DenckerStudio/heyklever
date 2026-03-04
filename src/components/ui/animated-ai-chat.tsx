"use client";

/**
 * @deprecated This component is deprecated. Use GlobalChat from '@/components/ui/global-chat' instead.
 * GlobalChat provides a unified chat component with streaming support for both team and client contexts.
 * 
 * Example migration:
 *   Before: <AnimatedAIChat teamId={teamId} clientCode={code} />
 *   After:  <GlobalChat variant="client" teamId={teamId} clientCode={code} context="public" />
 * 
 * Original Description:
 * AnimatedAIChat Component
 * Used for: Client-facing public chat interface
 * Service: clientChatService (uses /api/clientChat -> n8n_WEBHOOK_URL)
 * Context: Hardcoded to 'public' (always uses public knowledge base)
 */

import { useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { clientChatService } from "@/lib/n8n-client-chat";
import type { StructuredEnvelope, StructuredChatResponse, ChatResponse } from "@/lib/n8n-client-chat";
import { formatChatAnswer, mergeFollowUpSuggestions } from "@/lib/chat-response-utils";
import {
    ImageIcon,
    PlusIcon,
    Figma,
    MonitorIcon,
    Paperclip,
    SendIcon,
    XIcon,
    Sparkles,
    Command,
    FileText,
    ExternalLink,
    Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PDFViewerDialog } from "./pdf-viewer-dialog";
import * as React from "react"
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
    icon: React.ReactNode;
    label: string;
    description: string;
    prefix: string;
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    return (
      <div className={cn(
        "relative",
        containerClassName
      )}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
            className
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {showRing && isFocused && (
          <motion.span 
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}

        {props.onChange && (
          <div 
            className="absolute bottom-2 right-2 opacity-0 w-2 h-2 bg-violet-500 rounded-full"
            style={{
              animation: 'none',
            }}
            id="textarea-ripple"
          />
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

interface AnimatedAIChatProps {
  name: string;
  teamId: string;
  teamName: string;
  clientName: string;
  clientCode?: string;
  clientUrlId?: string;
  teamPdfViewerEnabled?: boolean;
  clientPdfViewerEnabled?: boolean;
  // New settings
  language?: 'no' | 'en' | 'sv' | 'da';
  welcomeMessage?: string;
  placeholderText?: string;
  liveSearchEnabled?: boolean;
  showSources?: boolean;
  fileAccessMode?: 'all_public' | 'selected_files';
  allowedFileIds?: string[];
}

// Default messages by language
const DEFAULT_WELCOME_MESSAGES: Record<string, string> = {
  no: 'Hei! Hvordan kan jeg hjelpe deg i dag?',
  en: 'Hello! How can I help you today?',
  sv: 'Hej! Hur kan jag hjälpa dig idag?',
  da: 'Hej! Hvordan kan jeg hjælpe dig i dag?',
};

const DEFAULT_PLACEHOLDERS: Record<string, string> = {
  no: 'Skriv en melding...',
  en: 'Type a message...',
  sv: 'Skriv ett meddelande...',
  da: 'Skriv en besked...',
};

export function AnimatedAIChat({ 
  name, 
  teamId, 
  teamName: _teamName, 
  clientName,
  clientCode,
  clientUrlId: _clientUrlId,
  teamPdfViewerEnabled = true,
  clientPdfViewerEnabled = true,
  // New settings with defaults
  language = 'no',
  welcomeMessage,
  placeholderText,
  liveSearchEnabled = false,
  showSources = true,
  fileAccessMode = 'all_public',
  allowedFileIds,
}: AnimatedAIChatProps) {
    const [value, setValue] = useState("");
    const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
    const [_selectedPdfFileName, _setSelectedPdfFileName] = useState<string | null>(null);
    
    // Change selectedPdfFileName to selectedSource object
    const [selectedSource, setSelectedSource] = useState<{
        file_name: string;
        relevance?: string;
        excerpts?: string[];
    } | null>(null);
    
    // PDF viewer is enabled only if both team and client settings allow it
    const pdfViewerEnabled = teamPdfViewerEnabled && clientPdfViewerEnabled;
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string>(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `client-session-${Date.now()}`));
    const [messages, setMessages] = useState<Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        sources?: Array<{ file_name: string; relevance?: string; excerpt?: string }>;
        followUps?: string[];
    }>>([]);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [_recentCommand, setRecentCommand] = useState<string | null>(null);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });
    const commandPaletteRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Get dynamic suggestions from the latest assistant message
    const dynamicSuggestions = useMemo(() => {
        const latestAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
        return latestAssistantMessage?.followUps || [];
    }, [messages]);

    // Get sources from the latest assistant message, with deduplication
    const latestSources = useMemo(() => {
        const latestAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
        const sources = latestAssistantMessage?.sources || [];
        
        // Group sources by file name
        const groupedSources = sources.reduce((acc, source) => {
            if (!acc[source.file_name]) {
                acc[source.file_name] = {
                    file_name: source.file_name,
                    relevance: source.relevance,
                    excerpts: []
                };
            }
            // Update relevance if current source has higher relevance
            // Priority: high > medium > low
            if (source.relevance === 'high' && acc[source.file_name].relevance !== 'high') {
                acc[source.file_name].relevance = 'high';
            } else if (source.relevance === 'medium' && acc[source.file_name].relevance === 'low') {
                acc[source.file_name].relevance = 'medium';
            }
            
            if (source.excerpt) {
                acc[source.file_name].excerpts.push(source.excerpt);
            }
            return acc;
        }, {} as Record<string, { file_name: string; relevance?: string; excerpts: string[] }>);
        
        return Object.values(groupedSources);
    }, [messages]);

    // Keep hardcoded suggestions for command palette only
    const commandSuggestions: CommandSuggestion[] = useMemo(() => [
        { 
            icon: <ImageIcon className="w-4 h-4" />, 
            label: "Clone UI", 
            description: "Generate a UI from a screenshot", 
            prefix: "/clone" 
        },
        { 
            icon: <Figma className="w-4 h-4" />, 
            label: "Import Figma", 
            description: "Import a design from Figma", 
            prefix: "/figma" 
        },
        { 
            icon: <MonitorIcon className="w-4 h-4" />, 
            label: "Create Page", 
            description: "Generate a new web page", 
            prefix: "/page" 
        },
        { 
            icon: <Sparkles className="w-4 h-4" />, 
            label: "Improve", 
            description: "Improve existing UI design", 
            prefix: "/improve" 
        },
    ], []);

    useEffect(() => {
        if (value.startsWith('/') && !value.includes(' ')) {
            setShowCommandPalette(true);
            
            const matchingSuggestionIndex = commandSuggestions.findIndex(
                (cmd) => cmd.prefix.startsWith(value)
            );
            
            if (matchingSuggestionIndex >= 0) {
                setActiveSuggestion(matchingSuggestionIndex);
            } else {
                setActiveSuggestion(-1);
            }
        } else {
            setShowCommandPalette(false);
        }
    }, [value, commandSuggestions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const commandButton = document.querySelector('[data-command-button]');
            
            if (commandPaletteRef.current && 
                !commandPaletteRef.current.contains(target) && 
                !commandButton?.contains(target)) {
                setShowCommandPalette(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev => 
                    prev < commandSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev => 
                    prev > 0 ? prev - 1 : commandSuggestions.length - 1
                );
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    const selectedCommand = commandSuggestions[activeSuggestion];
                    setValue(selectedCommand.prefix + ' ');
                    setShowCommandPalette(false);
                    
                    setRecentCommand(selectedCommand.label);
                    setTimeout(() => setRecentCommand(null), 3500);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowCommandPalette(false);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSendMessage();
            }
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsTyping(false);
        }
    };

    const handleSendMessage = async () => {
        if (value.trim()) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            
            const controller = new AbortController();
            abortControllerRef.current = controller;
            
            setIsTyping(true);
            const userMessageContent = value.trim();
            setValue("");
            adjustHeight(true);

            try {
                // Send message to RAG agent with public context
                // Push user message optimistically
                const userMessage = {
                    id: `m-${Date.now()}`,
                    role: 'user' as const,
                    content: userMessageContent,
                };
                setMessages(prev => [...prev, userMessage]);
                
                const response = await clientChatService.sendMessage(
                    userMessageContent,
                    { sessionId, signal: controller.signal }
                );
                
                // Normalize response into a single assistant message
                let assistantContent = '';
                let sources: Array<{ file_name: string; relevance?: string; excerpt?: string }> | undefined;
                let followUps: string[] | undefined;

                if (response && typeof response === 'object' && 'response' in (response as StructuredEnvelope)) {
                    const r = (response as StructuredEnvelope).response;
                    
                    // Handle nested answer object structure
                    if (r && typeof r === 'object' && 'answer' in r && typeof (r as unknown as { answer: unknown }).answer === 'object') {
                        const nestedAnswer = (r as unknown as { answer: { answer: string; sources: Array<{ file_name: string; relevance?: string; excerpt?: string }>; follow_up_suggestions: string[] } }).answer;
                        assistantContent = nestedAnswer.answer || '';
                        sources = nestedAnswer.sources;
                        followUps = nestedAnswer.follow_up_suggestions;
                    } else {
                        // Standard structure
                        assistantContent = r?.answer || '';
                        sources = r?.sources;
                        followUps = (r as unknown as { follow_up_suggestions?: string[]; followUps?: string[] })?.follow_up_suggestions || (r as unknown as { follow_up_suggestions?: string[]; followUps?: string[] })?.followUps;
                    }
                } else if (Array.isArray(response)) {
                    const firstItem = response[0];
                    // Check for nested message object structure from webhook
                    // Format: [{ "message": { "answer": "...", "sources": [...] } }]
                    if (firstItem && typeof firstItem === 'object' && 'message' in firstItem && typeof (firstItem as { message: unknown }).message === 'object') {
                         const msgObj = (firstItem as unknown as { message: Record<string, unknown> }).message;
                         assistantContent = (msgObj.answer as string) || (msgObj.message as string) || '';
                         sources = msgObj.sources as Array<{ file_name: string; relevance?: string; excerpt?: string }>;
                         followUps = (msgObj.follow_up_suggestions as string[]) || (msgObj.followUps as string[]);
                    } else {
                        const r = (response as StructuredChatResponse[])[0];
                        assistantContent = r?.answer || (r as unknown as ChatResponse)?.message || '';
                        sources = r?.sources;
                        followUps = (r as unknown as { follow_up_suggestions?: string[]; followUps?: string[] })?.follow_up_suggestions || (r as unknown as { follow_up_suggestions?: string[]; followUps?: string[] })?.followUps;
                    }
                } else {
                    const r = response as ChatResponse;
                    assistantContent = r?.message || '';
                }

                const formattedAnswer = formatChatAnswer(assistantContent);
                const combinedFollowUps = mergeFollowUpSuggestions(followUps, formattedAnswer.followUps);

                const assistantMessage = {
                    id: `a-${Date.now()}`,
                    role: 'assistant' as const,
                    content: formattedAnswer.text,
                    sources,
                    followUps: combinedFollowUps,
                };
                setMessages(prev => [...prev, assistantMessage]);
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                     // Request cancelled, do nothing
                     console.log('Request cancelled');
                     return;
                }
                console.error('Error sending message to RAG:', error);
                // Add error message to chat
                const errorMessage = {
                    id: `error-${Date.now()}`,
                    role: 'assistant' as const,
                    content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
                };
                setMessages(prev => [...prev, errorMessage]);
            } finally {
                setIsTyping(false);
                abortControllerRef.current = null;
            }
        }
    };

    const handleAttachFile = () => {
        const mockFileName = `file-${Math.floor(Math.random() * 1000)}.pdf`;
        setAttachments(prev => [...prev, mockFileName]);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };
    
    const selectCommandSuggestion = (index: number) => {
        const selectedCommand = commandSuggestions[index];
        setValue(selectedCommand.prefix + ' ');
        setShowCommandPalette(false);
        
        setRecentCommand(selectedCommand.label);
        setTimeout(() => setRecentCommand(null), 2000);
    };

    return (
      <div className="flex flex-col w-full items-center justify-center bg-transparent text-foreground relative overflow-hidden h-full">
        <div className="w-full relative h-full flex flex-col">
          <motion.div
            className="relative z-10 space-y-8 flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="text-center space-y-3 p-6 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block"
              >
                <motion.h1 
                  className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-[linear-gradient(to_right,rgba(0,0,0,0.9),rgba(0,0,0,0.5),rgba(0,0,0,0.9))] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.9),rgba(255,255,255,0.5),rgba(255,255,255,0.9))] bg-[length:200%_auto] pb-1"
                  animate={{ backgroundPosition: ["0% center", "200% center"] }}
                  transition={{ 
                    duration: 4, 
                    ease: "linear", 
                    repeat: Infinity 
                  }}
                >
                  {name || "HeyKlever"}! <br />{" "}
                  <span className="text-base text-black/40 dark:text-white/40">
                    {welcomeMessage || DEFAULT_WELCOME_MESSAGES[language] || "how may I help you today?"}
                  </span>
                </motion.h1>
                <motion.div
                  className="h-[2px] my-2 bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </motion.div>
              <motion.p
                className="text-sm text-black/40 dark:text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Type a command or ask a question
              </motion.p>
            </div>
            
            <motion.div
              className="relative flex flex-col bg-transparent max-w-5xl mx-auto w-full h-[750px]"
              layout
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <AnimatePresence>
                {showCommandPalette && (
                  <motion.div
                    ref={commandPaletteRef}
                    className="absolute left-6 right-6 bottom-24 mb-2 backdrop-blur-xl bg-white/90 dark:bg-black/90 rounded-2xl z-50 shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="py-2 bg-transparent">
                      {commandSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={suggestion.prefix}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-sm transition-all cursor-pointer",
                            activeSuggestion === index
                              ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/20"
                          )}
                          onClick={() => selectCommandSuggestion(index)}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className={cn(
                             "w-8 h-8 flex items-center justify-center rounded-lg bg-background/50 shadow-sm",
                             activeSuggestion === index ? "text-primary" : "text-muted-foreground"
                           )}>
                            {suggestion.icon}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{suggestion.label}</span>
                            <span className="text-xs text-muted-foreground/80">{suggestion.description}</span>
                          </div>
                          <div className="ml-auto text-xs font-mono text-muted-foreground/50 bg-background/50 px-2 py-1 rounded-md">
                            {suggestion.prefix}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-black/5 dark:scrollbar-thumb-white/10 hover:scrollbar-thumb-black/10 dark:hover:scrollbar-thumb-white/20" layout>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setValue("");
                      setSessionId(
                        typeof crypto !== "undefined" && crypto.randomUUID
                          ? crypto.randomUUID()
                          : `client-session-${Date.now()}`
                      );
                      adjustHeight(true);
                      textareaRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> 
                    <span>New chat</span>
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={cn(
                        "rounded-2xl px-5 py-4 backdrop-blur-xl text-foreground mr-auto max-w-[90%] rounded-bl-sm",
                        m.role === "user"
                          ? "bg-primary/10 ml-auto rounded-br-sm border border-primary/5 shadow-primary/5"
                          : "bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 shadow-black/5"
                      )}
                    >
                      <div className="text-sm leading-relaxed">
                        {m.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        ) : (
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({node: _node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 font-medium" />,
                              ul: ({node: _node, ...props}) => <ul {...props} className="list-disc pl-4 mb-2 space-y-1" />,
                              ol: ({node: _node, ...props}) => <ol {...props} className="list-decimal pl-4 mb-2 space-y-1" />,
                              li: ({node: _node, ...props}) => <li {...props} className="mb-1 pl-1" />,
                              p: ({node: _node, ...props}) => <p {...props} className="mb-3 last:mb-0" />,
                              strong: ({node: _node, ...props}) => <strong {...props} className="font-semibold text-foreground/90" />,
                              h1: ({node: _node, ...props}) => <h1 {...props} className="text-lg font-bold mb-2 mt-4 first:mt-0" />,
                              h2: ({node: _node, ...props}) => <h2 {...props} className="text-base font-bold mb-2 mt-3" />,
                              h3: ({node: _node, ...props}) => <h3 {...props} className="text-sm font-bold mb-1 mt-2" />,
                              code: ({node: _node, className, children, ...props}) => {
                                const match = /language-(\w+)/.exec(className || '')
                                return !match ? (
                                  <code {...props} className={cn("bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-xs", className)}>
                                    {children}
                                  </code>
                                ) : (
                                  <div className="relative my-2 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 p-2">
                                    <code {...props} className={cn("font-mono text-xs block overflow-x-auto", className)}>
                                      {children}
                                    </code>
                                  </div>
                                )
                              }
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        )}
                      </div>
                      
                      {/* Removed inline sources and followUps rendering from here, moved to below input */}
                      
                    </motion.div>
                  ))}
                  
                  {isTyping && (
                    <motion.div
                      key="thinking-indicator"
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="rounded-2xl px-5 py-4 text-foreground mr-auto max-w-[90%] rounded-bl-sm"
                    >
                        <div className="flex items-center gap-2 text-sm text-foreground/70">
                            <span className="text-xs font-medium">Thinking</span>
                            <TypingDots />
                        </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </AnimatePresence>
              </motion.div>

              {/* Dynamic Suggestions (Follow-ups) - Moved above input */}
              <AnimatePresence mode="wait">
                {dynamicSuggestions.length > 0 && !isTyping && (
                  <motion.div 
                    className="flex flex-wrap items-center justify-start gap-2 px-4 pb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    {dynamicSuggestions.map((suggestion, index) => (
                      <motion.button
                        key={`${suggestion}-${index}`}
                        onClick={() => {
                          setValue(suggestion);
                          textareaRef.current?.focus();
                          adjustHeight();
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-xs text-foreground/80 hover:text-foreground transition-all border border-white/10"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ 
                          delay: index * 0.1,
                          duration: 0.3,
                        }}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{suggestion}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 pt-0">
                <Textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholderText || DEFAULT_PLACEHOLDERS[language] || `Ask ${clientName} a question...`}
                  containerClassName="w-full"
                  className={cn(
                    "w-full px-4 py-3",
                    "resize-none",
                    "bg-transparent",
                    "border-none",
                    "text-black/90 text-sm dark:text-white/90",
                    "focus:outline-none",
                    "placeholder:text-black/30 dark:placeholder:text-white/30",
                    "min-h-[60px]"
                  )}
                  style={{
                    overflow: "hidden",
                  }}
                  showRing={false}
                />
              </div>

              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div
                    className="px-4 pb-3 flex gap-2 flex-wrap"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {attachments.map((file, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-3 rounded-lg text-black/70 dark:bg-black/[0.03] dark:text-white/70"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <span>{file}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-black/40 hover:text-black transition-colors dark:text-white/40 dark:hover:text-white"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 border-t border-black/[0.05] flex items-center justify-between gap-4 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={handleAttachFile}
                    whileTap={{ scale: 0.94 }}
                    className="p-2 text-black/40 hover:text-black/90 rounded-lg transition-colors relative group dark:text-white/40 dark:hover:text-white"
                  >
                    <Paperclip className="w-4 h-4" />
                    <motion.span
                      className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity dark:bg-white/[0.05]"
                      layoutId="button-highlight"
                    />
                  </motion.button>
                  <motion.button
                    type="button"
                    data-command-button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCommandPalette((prev) => !prev);
                    }}
                    whileTap={{ scale: 0.94 }}
                    className={cn(
                      "p-2 text-black/40 hover:text-black/90 rounded-lg transition-colors relative group dark:text-white/40 dark:hover:text-white",
                      showCommandPalette &&
                        "bg-black/10 text-black/80 dark:bg-white/10 dark:text-white/80"
                    )}
                  >
                    <Command className="w-4 h-4" />
                    <motion.span
                      className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity dark:bg-white/[0.05]"
                      layoutId="button-highlight"
                    />
                  </motion.button>
                </div>

                <motion.button
                  type="button"
                  onClick={isTyping ? handleCancel : handleSendMessage}
                  whileHover={{ scale: 1.01, cursor: "pointer" }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!isTyping && !value.trim()}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                    "flex items-center gap-2",
                    isTyping
                      ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      : value.trim()
                        ? "bg-white text-[#0A0A0B] shadow-lg shadow-white/10 dark:bg-black dark:text-white dark:shadow-black/10"
                        : "bg-white/[0.05] text-black/40 dark:bg-black/[0.05] dark:text-white/40"
                  )}
                >
                  {isTyping ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <SendIcon className="w-4 h-4" />
                  )}
                  <span>{isTyping ? "Cancel" : "Send"}</span>
                </motion.button>
              </div>

              {/* Sources - Moved below input/action bar (conditionally shown based on showSources setting) */}
              <AnimatePresence>
                {showSources && latestSources.length > 0 && !isTyping && (
                  <motion.div
                    className="px-4 pb-4 pt-0"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="text-xs font-medium opacity-60 mb-2 px-1 flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText className="w-3 h-3" />
                      Sources
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {latestSources.map((s, i) => {
                        const _fileExt =
                          s.file_name.split(".").pop()?.toLowerCase() ||
                          "";
                        // Now we allow clicking on ALL sources, but dialog handles them differently
                        const _isViewable = true; // All sources are now actionable
                          
                        return (
                          <motion.button
                            key={`source-${i}`}
                            onClick={() => {
                              // We always open the dialog now, it handles PDF vs Others logic
                              if (pdfViewerEnabled) {
                                setSelectedSource(s); // Set full source object
                                setPdfDialogOpen(true);
                              }
                            }}
                            disabled={!pdfViewerEnabled}
                            className={cn(
                              "flex flex-col items-start text-left p-3 rounded-xl text-xs",
                              "bg-white/5 hover:bg-white/10 text-foreground",
                              "transition-all border border-white/5",
                              (pdfViewerEnabled) ? "cursor-pointer hover:scale-[1.01] hover:border-white/10" : "cursor-default opacity-80"
                            )}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            title={
                              !pdfViewerEnabled
                                ? "Document viewing is disabled"
                                : s.file_name
                            }
                          >
                            <div className="flex items-center gap-2 w-full mb-1">
                               <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", s.relevance === "high" ? "bg-green-500" : s.relevance === "medium" ? "bg-yellow-500" : "bg-red-500")} />
                               <span className="font-medium truncate flex-1" title={s.file_name}>
                                 {s.file_name}
                               </span>
                               {/* Show external link for PDF, maybe different icon for others? keeping simple for now */}
                               <ExternalLink className="w-3 h-3 opacity-50" />
                            </div>
                            {s.excerpts && s.excerpts.length > 0 && s.excerpts.map((excerpt, j) => (
                               <p key={j} className="text-[10px] opacity-60 line-clamp-2 leading-relaxed w-full text-foreground/80 mt-1 pl-3.5 border-l-2 border-white/5">
                                 &quot;{excerpt}&quot;
                               </p>
                             ))}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          </motion.div>
        </div>

        {/* Removed fixed floating loading indicator as we now have an inline one */}

        {/* PDF Viewer Dialog */}
        {selectedSource && (
          <PDFViewerDialog
            open={pdfDialogOpen}
            onOpenChange={(open) => {
              setPdfDialogOpen(open);
              if (!open) {
                setSelectedSource(null);
              }
            }}
            fileName={selectedSource.file_name}
            excerpts={selectedSource.excerpts}
            relevance={selectedSource.relevance}
            context="public"
          />
        )}
      </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1.5 h-1.5 bg-foreground/90 rounded-full mx-0.5"
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                        opacity: [0.3, 0.9, 0.3],
                        scale: [0.85, 1.1, 0.85]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                    style={{
                        boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)"
                    }}
                />
            ))}
        </div>
    );
}

const rippleKeyframes = `
@keyframes ripple {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = rippleKeyframes;
    document.head.appendChild(style);
}
