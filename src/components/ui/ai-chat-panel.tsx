"use client";

/**
 * @deprecated This component is deprecated. Use GlobalChat from '@/components/ui/global-chat' instead.
 * GlobalChat provides a unified chat component with streaming support for both team and client contexts.
 * 
 * Example migration:
 *   Before: <AIChatPanel context="private" teamId={teamId} />
 *   After:  <GlobalChat variant="team" context="private" teamId={teamId} />
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Copy, Paperclip, Upload, X, Lock, Globe, RefreshCcw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
// Uses chatService with KLEVERAI_WEBHOOK_URL and dynamic context (public/private)
import { chatService, type ChatMessage as N8nChatMessage, type StructuredMessage, type Action } from '@/lib/n8n-chat';
import { PDFViewerDialog } from './pdf-viewer-dialog';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// New chat UI components (chat-01)
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
import { useUpload } from '@/lib/upload-context';
import { useTeams } from '@/lib/hooks/useTeams';

interface AIChatPanelProps {
  teamId?: string | null;
  teamName?: string;
  teamLogo?: string | null;
  clientName?: string;
  pdfViewerEnabled?: boolean;
  context?: 'public' | 'private';
  className?: string;
  showHeader?: boolean;
  initialGreeting?: string;
}

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
                       // Standalone actions
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
                           )
                       }
                       return null;
                  default:
                      return null;
              }
          })}
      </div>
  );
}

type Message = N8nChatMessage & {
  // Embed lightweight UI metadata for avatars/names used by chat components
  ui?: {
    name?: string;
    image?: string;
  };
};
type MessageMetadata = NonNullable<N8nChatMessage['metadata']>;

export function AIChatPanel({
  teamId,
  teamName,
  teamLogo: initialTeamLogo,
  clientName,
  pdfViewerEnabled: initialPdfViewerEnabled = true,
  context: initialContext = 'public',
  className,
  showHeader = true,
  initialGreeting,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(teamId || null);
  const [context, setContext] = useState<'public' | 'private'>(initialContext);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedPdfFileName, setSelectedPdfFileName] = useState<string | null>(null);
  const [pdfViewerEnabled, setPdfViewerEnabled] = useState<boolean>(initialPdfViewerEnabled);
  
  // Get team logo from useTeams hook if not provided as prop
  const { currentTeam, teams } = useTeams();
  const teamLogo = initialTeamLogo ?? (() => {
    if (!currentTeamId) return null;
    // Check if currentTeam matches
    if (currentTeam?.id === currentTeamId) return currentTeam.logo_url;
    // Otherwise, find the team in the teams array
    return teams.find(t => t.id === currentTeamId)?.logo_url ?? null;
  })();

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use upload context to communicate active uploads to global provider
  // (though in this chat panel we handle the actual upload via chat message)
  const { } = useUpload();

  const sendMessage = async (content: string, file?: File) => {
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
    
    // Clear selected file after sending
    setSelectedFile(null);

    // Create a placeholder message for streaming
    const streamingMessageId = crypto.randomUUID();
    let hasReceivedFirstChunk = false;

    try {
      // Use streaming API
      const result = await chatService.sendMessageStreaming(
        content || (file ? `I have uploaded ${file.name}` : ''),
        {
          sessionId: conversationId || undefined,
          file,
          onChunk: (chunk: string, fullText: string) => {
            // On first chunk, add the message and switch to streaming mode
            if (!hasReceivedFirstChunk) {
              hasReceivedFirstChunk = true;
              setIsStreaming(true);
              
              const streamingMessage: Message = {
                id: streamingMessageId,
                role: 'assistant',
                content: fullText,
                timestamp: new Date(),
                ui: { name: clientName || teamName || 'Klever AI', image: '/logo-icon.png' },
              };
              setMessages((prev) => [...prev, streamingMessage]);
            } else {
              // Update the streaming message with accumulated text
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
        // If we never received any chunks, add an error message
        if (!hasReceivedFirstChunk) {
          const errorMessage: Message = {
            id: streamingMessageId,
            role: 'assistant',
            content: 'Sorry, I could not process your request. Please try again.',
            timestamp: new Date(),
            ui: { name: clientName || teamName || 'Klever AI', image: '/logo-icon.png' },
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          // Update existing message with error
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
      // If we never received any chunks, add an error message
      if (!hasReceivedFirstChunk) {
        const errorMessage: Message = {
          id: streamingMessageId,
          role: 'assistant',
          content: 'Sorry, I could not send the message. Please try again.',
          timestamp: new Date(),
          ui: { name: clientName || teamName || 'Klever AI', image: '/logo-icon.png' },
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Input handled by chat-01 components
  const { value, onChange, handleSubmit } = useChatInput({
    onSubmit: async (parsedValue) => {
      // If we have a selected file, send it with the message
      if (selectedFile) {
        await sendMessage(parsedValue.content.trim(), selectedFile);
      } else {
        await sendMessage(parsedValue.content.trim());
      }
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
    // Reset input value to allow selecting same file again
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
    noKeyboard: true
  });

  // Initialize chat session and team
  useEffect(() => {
    const initialize = async () => {
      if (messages.length > 0) return;
      try {
        // Use provided teamId or try to get from cookie
        if (!currentTeamId) {
          const teamIdFromCookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith('team_id='))
            ?.split('=')[1];
          if (teamIdFromCookie) {
            setCurrentTeamId(teamIdFromCookie);
            // Fetch PDF viewer setting
            try {
              const response = await fetch(`/api/teams/settings?teamId=${teamIdFromCookie}`);
              if (response.ok) {
                const data = await response.json();
                setPdfViewerEnabled(data.settings?.pdfViewerEnabled ?? true);
              }
            } catch (err) {
              console.error('Failed to fetch PDF setting:', err);
            }
          }
        } else if (currentTeamId) {
          // Fetch PDF viewer setting for provided teamId
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

        const { conversationId } = await chatService.initializeChat();
        setConversationId(conversationId);
      } catch (e) {
        console.error('Chat init failed', e);
      } finally {
        // Always show greeting
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: initialGreeting || `Hello! I'm ${clientName || teamName || 'Klever AI'}. How can I help you today?`,
            timestamp: new Date(),
            ui: { name: clientName || teamName || 'Klever AI', image: '/logo-icon.png' },
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
          {isDragActive && (
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
                    alt={clientName || teamName || "Klever AI"}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-background" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {clientName || teamName || "Klever AI"}
                  </h3>
                </div>
              </div>

              {/* Context Switch - Moved to bottom */}
            </div>
          </div>
        )}

        {/* Messages */}
        <ChatMessageArea className="flex-1 px-2">
          <ChatMessageAreaContent className="pt-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const name = isUser
                ? "You"
                : m.ui?.name || clientName || teamName || "Klever AI";
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
                          message={
                            m.content as StructuredMessage | StructuredMessage[]
                          }
                          onAction={(action) => {
                            if (action.actionType === "postback") {
                              // Instead of sending immediately, set the input value using the hook's onChange
                              // We need to construct a Tiptap JSON content structure
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
                      )}
                      {!isUser &&
                        m.metadata?.sources &&
                        m.metadata.sources.length > 0 &&
                        (() => {
                          // Remove duplicates by file_name, keeping the first occurrence
                          const seenFileNames = new Set<string>();
                          const uniqueSources = m.metadata.sources.filter(
                            (source) => {
                              const fileName = source.file_name.toLowerCase();
                              if (seenFileNames.has(fileName)) {
                                return false;
                              }
                              seenFileNames.add(fileName);
                              return true;
                            }
                          );

                          return (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <p className="text-sm font-semibold mb-2 text-muted-foreground">
                                Sources:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {uniqueSources.map((source, idx: number) => {
                                    const emoji =
                                      source.relevance === "high"
                                        ? "🟢"
                                        : source.relevance === "medium"
                                          ? "🟡"
                                          : "🔴";
                                  const fileExt =
                                    source.file_name
                                      .split(".")
                                      .pop()
                                      ?.toLowerCase() || "";
                                  const viewableTypes = [
                                    "pdf",
                                    "png",
                                    "jpg",
                                    "jpeg",
                                    "gif",
                                    "webp",
                                    "svg",
                                    "txt",
                                    "md",
                                    "json",
                                    "html",
                                    "htm",
                                    "csv",
                                    "xml",
                                    "yaml",
                                    "yml",
                                  ];
                                  const isViewable =
                                    viewableTypes.includes(fileExt);
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          if (pdfViewerEnabled && isViewable) {
                                            setSelectedPdfFileName(
                                              source.file_name
                                            );
                                            setPdfDialogOpen(true);
                                          }
                                        }}
                                        disabled={
                                          !pdfViewerEnabled || !isViewable
                                        }
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                                          "bg-muted hover:bg-muted/80 text-foreground",
                                          "transition-colors",
                                          pdfViewerEnabled &&
                                            isViewable &&
                                            "cursor-pointer",
                                          (!pdfViewerEnabled || !isViewable) &&
                                            "cursor-default opacity-60",
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
                                        <span className="font-medium">
                                          {source.file_name}
                                        </span>
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
            {/* Loading indicator - only show when loading but not yet streaming */}
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
                      <ChatMessageAvatarImage src="/logo-icon.png" />
                    </ChatMessageAvatar>
                    <ChatMessageContainer>
                      <ChatMessageHeader>
                        <ChatMessageAuthor>
                          {clientName || teamName || "Klever AI"}
                        </ChatMessageAuthor>
                      </ChatMessageHeader>
                      <ChatMessageContent>
                        <div className="flex items-center gap-2 px-2 py-1">
                          <span className="text-sm text-muted-foreground">
                            Thinking
                          </span>
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
          {selectedFile && (
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
              placeholder={
                clientName
                  ? `Ask ${clientName} a question...`
                  : "Type a message..."
              }
            />
            <ChatInputGroupAddon align="block-end">
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

              {/* Context Switch - Bottom */}
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
                        layoutId="active-context-bottom"
                        className="absolute inset-0 bg-background/80 rounded-full"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
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
                        layoutId="active-context-bottom"
                        className="absolute inset-0 bg-background/80 rounded-full"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Globe className="w-3 h-3" />
                      Public
                    </span>
                  </button>
                </div>
              </div>
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
            if (!open) {
              setSelectedPdfFileName(null);
            }
          }}
          fileName={selectedPdfFileName}
          context={context}
        />
      )}
    </>
  );
}
