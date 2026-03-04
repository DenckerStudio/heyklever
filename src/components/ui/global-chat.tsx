"use client";

/**
 * GlobalChat Component
 * 
 * A unified chat component that can be used across the entire application.
 * Supports both team (internal) and client (public) chat variants with streaming.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Copy, Paperclip, Upload, X, Lock, Globe, RefreshCcw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { 
  UnifiedChatService, 
  type ChatMessage as ServiceChatMessage, 
  type StructuredMessage, 
  type Action,
  type ChatVariant,
  type ChatContext,
} from '@/lib/chat-service';
import { PDFViewerDialog } from './pdf-viewer-dialog';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Chat UI components
import {
  ChatMessage,
  ChatMessageActions,
  ChatMessageAction,
  ChatMessageAvatar,
  ChatMessageAvatarFallback,
  ChatMessageAvatarImage,
  ChatMessageAuthor,
  ChatMessageContainer,
  ChatMessageContent,
  ChatMessageHeader,
  ChatMessageMarkdown,
  ChatMessageTimestamp,
} from '@/components/ui/chat-message';
import {
  ChatMessageArea,
  ChatMessageAreaContent,
  ChatMessageAreaScrollButton,
} from '@/components/ui/chat-message-area';
import {
  ChatInput,
  ChatInputEditor,
  ChatInputGroupAddon,
  ChatInputSubmitButton,
  ChatInputGroupButton,
  useChatInput,
} from '@/components/ui/chat-input';
import { useTeams } from '@/lib/hooks/useTeams';

// ============================================================================
// Types
// ============================================================================

export interface GlobalChatProps {
  /** Chat variant: 'team' for internal use, 'client' for public-facing */
  variant?: ChatVariant;
  /** Team ID */
  teamId?: string | null;
  /** Team name for display */
  teamName?: string;
  /** Team logo URL */
  teamLogo?: string | null;
  /** Client/assistant name for display */
  clientName?: string;
  /** Client code for restricted document access (client variant only) */
  clientCode?: string;
  /** Enable PDF viewer for source documents */
  pdfViewerEnabled?: boolean;
  /** Initial context: 'public' or 'private' */
  context?: ChatContext;
  /** Allow context switching between public/private */
  allowContextSwitch?: boolean;
  /** Enable file uploads */
  allowFileUpload?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show header with avatar and name */
  showHeader?: boolean;
  /** Initial greeting message */
  initialGreeting?: string;
  /** Input placeholder text */
  placeholderText?: string;
  /** Language preference (for client variant) */
  language?: string;
  /** File access mode (for client variant) */
  fileAccessMode?: 'all_public' | 'selected_files';
  /** Allowed file IDs (for client variant with selected_files mode) */
  allowedFileIds?: string[];
  /** Session ID for conversation continuity */
  sessionId?: string;
}

// Internal message type with UI metadata
type Message = ServiceChatMessage & {
  ui?: {
    name?: string;
    image?: string;
  };
};

// ============================================================================
// Helper Components
// ============================================================================

function StructuredMessageContent({ 
  message, 
  onAction 
}: { 
  message: StructuredMessage | StructuredMessage[], 
  onAction: (action: Action) => void 
}) {
  const messages = Array.isArray(message) ? message : [message];
  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, idx) => {
        switch (msg.type) {
          case 'text':
            return (
              <div key={idx}>
                <ChatMessageMarkdown content={msg.content || ''} />
                {msg.actions && (
                  <div className="flex flex-wrap gap-2 mt-2">
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
          case 'image':
            return (
              <div key={idx} className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
                {msg.content && <Image src={msg.content} alt="Content" fill className="object-cover" />}
              </div>
            );
          case 'card':
            return (
              <Card key={idx} className="p-4">
                {msg.title && <h4 className="font-semibold mb-2">{msg.title}</h4>}
                {msg.content && <p className="text-sm text-muted-foreground">{msg.content}</p>}
                {msg.actions && (
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
            if (msg.actions) {
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
              );
            }
            return null;
          default:
            return null;
        }
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GlobalChat({
  variant = 'team',
  teamId,
  teamName,
  teamLogo: initialTeamLogo,
  clientName,
  clientCode,
  pdfViewerEnabled: initialPdfViewerEnabled = true,
  context: initialContext,
  allowContextSwitch = true,
  allowFileUpload = true,
  className,
  showHeader = true,
  initialGreeting,
  placeholderText,
  language,
  fileAccessMode,
  allowedFileIds,
  sessionId: externalSessionId,
}: GlobalChatProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(externalSessionId || null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(teamId || null);
  const [context, setContext] = useState<ChatContext>(
    initialContext || (variant === 'client' ? 'public' : 'private')
  );
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedPdfFileName, setSelectedPdfFileName] = useState<string | null>(null);
  const [pdfViewerEnabled, setPdfViewerEnabled] = useState<boolean>(initialPdfViewerEnabled);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get team logo from useTeams hook if not provided as prop
  const { currentTeam, teams } = useTeams();
  const teamLogo = initialTeamLogo ?? (() => {
    if (!currentTeamId) return null;
    if (currentTeam?.id === currentTeamId) return currentTeam.logo_url;
    return teams.find(t => t.id === currentTeamId)?.logo_url ?? null;
  })();

  // Create chat service instance
  const chatService = useMemo(() => {
    return new UnifiedChatService({
      variant,
      teamId: currentTeamId || undefined,
      context,
      clientCode,
      language,
      fileAccessMode,
      allowedFileIds,
    });
  }, [variant, currentTeamId, context, clientCode, language, fileAccessMode, allowedFileIds]);

  // Update chat service when context changes
  useEffect(() => {
    chatService.updateConfig({ context });
  }, [context, chatService]);

  // Display name for the assistant
  const displayName = clientName || teamName || 'Klever AI';

  // Send message handler
  const sendMessage = useCallback(async (content: string, file?: File) => {
    if ((!content && !file) || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: file ? (content ? `${content}\n\n[Attached: ${file.name}]` : `[Attached: ${file.name}]`) : content,
      timestamp: new Date(),
      ui: { name: 'You' },
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(false);
    setSelectedFile(null);

    const streamingMessageId = crypto.randomUUID();
    let hasReceivedFirstChunk = false;

    try {
      const result = await chatService.sendMessageStreaming(
        content || (file ? `I have uploaded ${file.name}` : ''),
        {
          sessionId: conversationId || undefined,
          file,
          onChunk: (chunk, fullText) => {
            if (!hasReceivedFirstChunk) {
              hasReceivedFirstChunk = true;
              setIsStreaming(true);
              
              const streamingMessage: Message = {
                id: streamingMessageId,
                role: 'assistant',
                content: fullText,
                timestamp: new Date(),
                ui: { name: displayName, image: teamLogo || '/logo-icon.png' },
              };
              setMessages((prev) => [...prev, streamingMessage]);
            } else {
              setMessages((prev) => 
                prev.map((msg) => 
                  msg.id === streamingMessageId 
                    ? { ...msg, content: fullText }
                    : msg
                )
              );
            }
          },
        }
      );

      if (result.error) {
        if (!hasReceivedFirstChunk) {
          const errorMessage: Message = {
            id: streamingMessageId,
            role: 'assistant',
            content: 'Sorry, I could not process your request. Please try again.',
            timestamp: new Date(),
            ui: { name: displayName, image: '/logo-icon.png' },
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === streamingMessageId 
                ? { ...msg, content: msg.content + '\n\n[Error: Connection interrupted]' }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (!hasReceivedFirstChunk) {
        const errorMessage: Message = {
          id: streamingMessageId,
          role: 'assistant',
          content: 'Sorry, I could not send the message. Please try again.',
          timestamp: new Date(),
          ui: { name: displayName, image: '/logo-icon.png' },
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [chatService, conversationId, displayName, teamLogo, isLoading]);

  // Chat input hook
  const { value, onChange, handleSubmit } = useChatInput({
    onSubmit: async (parsedValue) => {
      if (selectedFile) {
        await sendMessage(parsedValue.content.trim(), selectedFile);
      } else {
        await sendMessage(parsedValue.content.trim());
      }
    },
  });

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps: getDropzoneInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: !allowFileUpload,
  });

  // Initialize chat session
  useEffect(() => {
    const initialize = async () => {
      if (messages.length > 0) return;
      try {
        // Get teamId from cookie if not provided
        if (!currentTeamId) {
          const teamIdFromCookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith('team_id='))
            ?.split('=')[1];
          if (teamIdFromCookie) {
            setCurrentTeamId(teamIdFromCookie);
          }
        }

        // Fetch PDF viewer setting
        if (currentTeamId) {
          try {
            const response = await fetch(`/api/teams/settings?teamId=${currentTeamId}`);
            if (response.ok) {
              const data = await response.json();
              setPdfViewerEnabled(data.settings?.pdfViewerEnabled ?? initialPdfViewerEnabled);
            }
          } catch (err) {
            console.error('Failed to fetch PDF setting:', err);
          }
        }

        const { conversationId: newConversationId } = await chatService.initializeChat();
        if (!externalSessionId) {
          setConversationId(newConversationId);
        }
      } catch (e) {
        console.error('Chat init failed', e);
      } finally {
        // Show greeting message
        const greeting = initialGreeting || `Hello! I'm ${displayName}. How can I help you today?`;
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: greeting,
            timestamp: new Date(),
            ui: { name: displayName, image: teamLogo || '/logo-icon.png' },
          },
        ]);
      }
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update PDF setting when teamId changes
  useEffect(() => {
    if (!currentTeamId) return;
    const fetchPdfSetting = async () => {
      try {
        const response = await fetch(`/api/teams/settings?teamId=${currentTeamId}`);
        if (response.ok) {
          const data = await response.json();
          setPdfViewerEnabled(data.settings?.pdfViewerEnabled ?? initialPdfViewerEnabled);
        }
      } catch (err) {
        console.error('Failed to fetch PDF setting:', err);
      }
    };
    fetchPdfSetting();
  }, [currentTeamId, initialPdfViewerEnabled]);

  return (
    <>
      <div 
        {...getRootProps()} 
        className={cn(
          "flex flex-col h-full dark:bg-muted/15 bg-muted-foreground/5 overflow-hidden relative",
          className
        )}
      >
        <input {...getDropzoneInputProps()} className="hidden" />
        
        {/* Drag Overlay */}
        <AnimatePresence>
          {isDragActive && allowFileUpload && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="p-4 rounded-full bg-primary/10 animate-bounce">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <p className="text-lg font-semibold text-primary">
                  Drop your file here
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        {showHeader && (
          <div className="dark:bg-background/95 bg-background/95 border-b dark:border-border/10 border-border/90 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Image
                    src={teamLogo || "/logo-icon.png"}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-background" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{displayName}</h3>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <ChatMessageArea className="flex-1 px-2">
          <ChatMessageAreaContent className="pt-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const name = isUser ? "You" : m.ui?.name || displayName;
              return (
                <ChatMessage key={m.id} className="my-2">
                  <ChatMessageActions>
                    <ChatMessageAction 
                      label="Copy"
                      onClick={() => {
                        const content = typeof m.content === 'string' 
                          ? m.content 
                          : (Array.isArray(m.content) 
                              ? m.content.map(c => c.content || '').join('\n')
                              : (m.content as StructuredMessage).content || '');
                        navigator.clipboard.writeText(content);
                      }}
                    >
                      <Copy className="size-4" />
                    </ChatMessageAction>
                    {!isUser && (
                      <ChatMessageAction label="Regenerate">
                        <RefreshCcw className="size-4" />
                      </ChatMessageAction>
                    )}
                  </ChatMessageActions>
                  <ChatMessageContainer>
                    <ChatMessageHeader>
                      <ChatMessageAvatar>
                        {m.ui?.image ? (
                          <ChatMessageAvatarImage src={m.ui.image} />
                        ) : (
                          <ChatMessageAvatarFallback>
                            {name.charAt(0).toUpperCase()}
                          </ChatMessageAvatarFallback>
                        )}
                      </ChatMessageAvatar>
                      <ChatMessageAuthor>{name}</ChatMessageAuthor>
                      <ChatMessageTimestamp createdAt={m.timestamp} />
                    </ChatMessageHeader>
                    <ChatMessageContent className="min-w-0 overflow-hidden break-words">
                      {typeof m.content === "string" ? (
                        <ChatMessageMarkdown content={m.content} />
                      ) : (
                        <StructuredMessageContent
                          message={m.content as StructuredMessage | StructuredMessage[]}
                          onAction={(action) => {
                            if (action.actionType === "postback") {
                              onChange({
                                type: "doc",
                                content: [
                                  {
                                    type: "paragraph",
                                    content: [{ type: "text", text: action.value }]
                                  }
                                ]
                              });
                            } else if (action.actionType === "link") {
                              window.open(action.value, "_blank");
                            }
                          }}
                        />
                      )}
                      {/* Sources */}
                      {!isUser && m.metadata?.sources && m.metadata.sources.length > 0 && (() => {
                        const seenFileNames = new Set<string>();
                        const uniqueSources = m.metadata.sources.filter((source) => {
                          const fileName = source.file_name.toLowerCase();
                          if (seenFileNames.has(fileName)) return false;
                          seenFileNames.add(fileName);
                          return true;
                        });

                        return (
                          <div className="mt-4 pt-4 border-t border-border/50">
                            <p className="text-sm font-semibold mb-2 text-muted-foreground">
                              Sources:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {uniqueSources.map((source, idx) => {
                                const emoji = source.relevance === "high" ? "🟢" 
                                  : source.relevance === "medium" ? "🟡" : "🔴";
                                const fileExt = source.file_name.split(".").pop()?.toLowerCase() || "";
                                const viewableTypes = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "txt", "md", "json", "html", "htm", "csv", "xml", "yaml", "yml"];
                                const isViewable = viewableTypes.includes(fileExt);
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      if (pdfViewerEnabled && isViewable) {
                                        setSelectedPdfFileName(source.file_name);
                                        setPdfDialogOpen(true);
                                      }
                                    }}
                                    disabled={!pdfViewerEnabled || !isViewable}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                                      "bg-muted hover:bg-muted/80 text-foreground",
                                      "transition-colors",
                                      pdfViewerEnabled && isViewable && "cursor-pointer",
                                      (!pdfViewerEnabled || !isViewable) && "cursor-default opacity-60",
                                      "border border-border/50 hover:border-border"
                                    )}
                                    title={
                                      !pdfViewerEnabled
                                        ? "Document viewing is disabled in team settings"
                                        : !isViewable
                                          ? "Preview not available for this file type"
                                          : ""
                                    }
                                  >
                                    <span>{emoji}</span>
                                    <span className="font-medium">{source.file_name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </ChatMessageContent>
                  </ChatMessageContainer>
                </ChatMessage>
              );
            })}
            
            {/* Loading indicator */}
            <AnimatePresence>
              {isLoading && !isStreaming && (
                <motion.div
                  key="loading-indicator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatMessage>
                    <ChatMessageAvatar>
                      <ChatMessageAvatarImage src={teamLogo || "/logo-icon.png"} />
                    </ChatMessageAvatar>
                    <ChatMessageContainer>
                      <ChatMessageHeader>
                        <ChatMessageAuthor>{displayName}</ChatMessageAuthor>
                      </ChatMessageHeader>
                      <ChatMessageContent>
                        <div className="flex items-center gap-2 px-2 py-1">
                          <span className="text-sm text-muted-foreground">Thinking</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3].map((dot) => (
                              <motion.div
                                key={dot}
                                className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
                                initial={{ opacity: 0.3 }}
                                animate={{
                                  opacity: [0.3, 0.9, 0.3],
                                  scale: [0.85, 1.1, 0.85],
                                }}
                                transition={{
                                  duration: 1.2,
                                  repeat: Infinity,
                                  delay: dot * 0.15,
                                  ease: "easeInOut",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </ChatMessageContent>
                    </ChatMessageContainer>
                  </ChatMessage>
                </motion.div>
              )}
            </AnimatePresence>
          </ChatMessageAreaContent>
          <ChatMessageAreaScrollButton alignment="center" />
        </ChatMessageArea>

        {/* Input */}
        <div className="px-2 py-4">
          {/* File Staging Indicator */}
          {selectedFile && allowFileUpload && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 mx-2 px-3 py-2 bg-muted rounded-md border border-border flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="p-1 hover:bg-background rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </motion.div>
          )}

          <ChatInput onSubmit={handleSubmit} isStreaming={isLoading}>
            <ChatInputEditor
              value={value}
              onChange={onChange}
              placeholder={placeholderText || (clientName ? `Ask ${clientName} a question...` : "Type a message...")}
            />
            <ChatInputGroupAddon align="block-end">
              {allowFileUpload && variant === 'team' && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <ChatInputGroupButton 
                    onClick={() => fileInputRef.current?.click()}
                    variant="ghost" 
                    size="icon-sm"
                    className={cn(
                      "rounded-full mr-1",
                      selectedFile && "text-primary bg-primary/10"
                    )}
                    disabled={isLoading}
                  >
                    <Paperclip className="size-4" />
                    <span className="sr-only">Attach file</span>
                  </ChatInputGroupButton>
                </>
              )}

              {/* Context Switch - Only for team variant with allowContextSwitch */}
              {variant === 'team' && allowContextSwitch && (
                <div className="flex justify-center">
                  <div className="flex items-center dark:bg-muted/70 bg-muted-foreground/10 rounded-full scale-90 origin-bottom">
                    <button
                      onClick={() => setContext("private")}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full transition-all duration-200 ease-in-out z-10",
                        context === "private"
                          ? "text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {context === "private" && (
                        <motion.div
                          layoutId="active-context-global"
                          className="absolute inset-0 bg-background/80 rounded-full"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        Private
                      </span>
                    </button>
                    <button
                      onClick={() => setContext("public")}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full transition-all duration-200 ease-in-out z-10",
                        context === "public"
                          ? "text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {context === "public" && (
                        <motion.div
                          layoutId="active-context-global"
                          className="absolute inset-0 bg-background/80 rounded-full"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Globe className="w-3 h-3" />
                        Public
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <ChatInputSubmitButton
                className="ml-auto"
                isStreaming={isLoading}
              />
            </ChatInputGroupAddon>
          </ChatInput>
        </div>
      </div>

      {/* PDF Viewer Dialog */}
      {selectedPdfFileName && (
        <PDFViewerDialog
          open={pdfDialogOpen}
          onOpenChange={(open) => {
            setPdfDialogOpen(open);
            if (!open) setSelectedPdfFileName(null);
          }}
          fileName={selectedPdfFileName}
          context={context}
        />
      )}
    </>
  );
}
