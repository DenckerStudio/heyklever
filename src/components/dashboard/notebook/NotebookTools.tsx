"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  MessageSquare, 
  MoreHorizontal, 
  Clock, 
  Globe2,
  Trash2,
  Edit3,
  Check,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

interface NotebookToolsProps {
  language: { code: string; name: string; flag: string };
  onLanguageChange: (lang: { code: string; name: string; flag: string }) => void;
  onNewSession?: () => void;
  teamId?: string;
  onSelectSession?: (sessionId: string) => void;
  activeSessionId?: string;
}

interface Session {
  id: string;
  title: string;
  date: string;
  preview: string;
  timestamp: Date;
  messageCount?: number;
}

export function NotebookTools({ 
  language, 
  onLanguageChange, 
  onNewSession, 
  teamId, 
  onSelectSession, 
  activeSessionId 
}: NotebookToolsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!teamId) return;

    const fetchSessions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('search_analytics')
          .select('session_id, query_text, created_at')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Group by session_id and count messages
        const sessionMap = new Map<string, Session & { count: number }>();
        
        data?.forEach((item) => {
          if (!item.session_id) return;
          
          if (!sessionMap.has(item.session_id)) {
            sessionMap.set(item.session_id, {
              id: item.session_id,
              title: item.query_text?.slice(0, 50) || 'Untitled Session',
              preview: item.query_text || '',
              date: item.created_at,
              timestamp: new Date(item.created_at),
              count: 1,
            });
          } else {
            const existing = sessionMap.get(item.session_id)!;
            existing.count++;
          }
        });

        const sortedSessions = Array.from(sessionMap.values())
          .map(s => ({ ...s, messageCount: s.count }))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setSessions(sortedSessions);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
    
    const channel = supabase
      .channel('search_analytics_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'search_analytics',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, supabase]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">History</h3>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <span className="text-base">{language.flag}</span>
                  <span className="text-xs hidden sm:inline">{language.code.toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Response Language
                </div>
                <DropdownMenuSeparator />
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem 
                    key={lang.code}
                    onClick={() => onLanguageChange(lang)}
                    className="gap-2.5 cursor-pointer"
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span className="flex-1">{lang.name}</span>
                    {language.code === lang.code && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* New Chat Button */}
        <Button 
          onClick={onNewSession}
          className="w-full h-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border-0 gap-2 font-medium"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>
      
      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {loading && sessions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground mt-3">Loading sessions...</p>
              </motion.div>
            ) : sessions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 px-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground/70 mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground/60">
                  Start chatting to create your first session
                </p>
              </motion.div>
            ) : (
              sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.02 }}
                  layout
                >
                  <SessionCard
                    session={session}
                    isActive={activeSessionId === session.id}
                    onClick={() => onSelectSession?.(session.id)}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/30">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50">
          <Globe2 className="w-3 h-3" />
          <span>Responses in {language.name}</span>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ 
  session, 
  isActive, 
  onClick 
}: { 
  session: Session; 
  isActive: boolean; 
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 p-3 rounded-xl cursor-pointer transition-all duration-200",
        isActive 
          ? "bg-primary/10 shadow-sm" 
          : "hover:bg-muted/40"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Active Indicator */}
      {isActive && (
        <motion.div
          layoutId="activeSession"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className={cn(
            "p-1.5 rounded-lg shrink-0 transition-colors",
            isActive ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
          )}>
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate transition-colors",
              isActive ? "text-foreground" : "text-foreground/80"
            )}>
              {session.title}
            </p>
            <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
              {session.preview}
            </p>
          </div>
        </div>

        {/* Actions */}
        <AnimatePresence>
          {(isHovered || isActive) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
                    <Edit3 className="w-3.5 h-3.5" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2 pl-8">
        <span className="text-[10px] text-muted-foreground/50">
          {formatDistanceToNow(session.timestamp, { addSuffix: true })}
        </span>
        {session.messageCount && session.messageCount > 1 && (
          <>
            <span className="text-muted-foreground/30">•</span>
            <span className="text-[10px] text-muted-foreground/50">
              {session.messageCount} messages
            </span>
          </>
        )}
      </div>
    </div>
  );
}
