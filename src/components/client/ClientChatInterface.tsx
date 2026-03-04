"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
    LoaderIcon,
    SendIcon,
    Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import { MarkdownContent } from "@/components/ui/markdown-content";

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

    React.useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    React.useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
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
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

interface ClientChatInterfaceProps {
  teamId: string;
  teamName: string;
  clientName: string;
  publicFolderId?: string;
}

export function ClientChatInterface({ 
  teamId, 
  teamName, 
  clientName, 
  publicFolderId: _publicFolderId 
}: ClientChatInterfaceProps) {
    const [value, setValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [, startTransition] = useTransition();
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });
    const [inputFocused, setInputFocused] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSendMessage();
            }
        }
    };

    const handleSendMessage = async () => {
        if (!value.trim()) return;

        const userMessage = value.trim();
        setValue("");
        adjustHeight(true);

        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        startTransition(() => {
            setIsTyping(true);
            
            // Simulate AI response (replace with actual API call)
            setTimeout(async () => {
                try {
                    // Call the RAG webhook with public folder context
                    const response = await fetch('/api/rag/webhook', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: userMessage,
                            teamId,
                            context: 'public' // Only search public folder
                        }),
                    });

                    const data = await response.json();
                    const aiResponse = data.response || "I'm sorry, I couldn't process your request at the moment.";

                    setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
                } catch (error) {
                    console.error('Error getting AI response:', error);
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: "I'm sorry, I encountered an error processing your request. Please try again." 
                    }]);
                } finally {
                    setIsTyping(false);
                }
            }, 1000);
        });
    };

    return (
      <div className="flex flex-col w-full items-center justify-center bg-transparent text-black dark:text-white relative overflow-hidden">
        <div className="w-full max-w-4xl mx-auto relative">
          <motion.div
            className="relative z-10 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Chat Messages */}
            {messages.length > 0 && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-sm",
                        message.role === 'user'
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <MarkdownContent content={message.content} className="prose-sm" />
                      ) : (
                        message.content
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Input Area */}
            <motion.div
              className="relative backdrop-blur-2xl bg-white/[0.8] rounded-2xl border border-slate-200 shadow-2xl dark:bg-slate-800/[0.8] dark:border-slate-700"
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
              </div>

              <div className="p-4">
                <Textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder={`Ask ${clientName} a question...`}
                  containerClassName="w-full"
                  className={cn(
                    "w-full px-4 py-3",
                    "resize-none",
                    "bg-transparent",
                    "border-none",
                    "text-slate-900 text-sm dark:text-slate-100",
                    "focus:outline-none",
                    "placeholder:text-slate-500 dark:placeholder:text-slate-400",
                    "min-h-[60px]"
                  )}
                  style={{
                    overflow: "hidden",
                  }}
                  showRing={false}
                />
              </div>

              <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-4 dark:border-slate-700">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Sparkles className="h-3 w-3" />
                  Powered by {teamName}
                </div>

                <motion.button
                  type="button"
                  onClick={handleSendMessage}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isTyping || !value.trim()}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                    "flex items-center gap-2",
                    value.trim()
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25 cursor-pointer"
                      : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                  )}
                >
                  {isTyping ? (
                    <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                  ) : (
                    <SendIcon className="w-4 h-4" />
                  )}
                  <span>Send</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <AnimatePresence>
          {isTyping && (
            <motion.div
              className="fixed bottom-8 mx-auto transform -translate-x-1/2 backdrop-blur-2xl bg-white/[0.8] rounded-full px-4 py-2 shadow-lg border border-slate-200 dark:bg-slate-800/[0.8] dark:border-slate-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-7 rounded-full bg-blue-500 flex items-center justify-center text-center">
                  <span className="text-xs font-medium text-white mb-0.5">
                    AI
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>Thinking</span>
                  <TypingDots />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {inputFocused && (
          <motion.div
            className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
            animate={{
              x: mousePosition.x - 400,
              y: mousePosition.y - 400,
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 150,
              mass: 0.5,
            }}
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
                    className="w-1.5 h-1.5 bg-slate-600 rounded-full mx-0.5 dark:bg-slate-400"
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
                />
            ))}
        </div>
    );
}
