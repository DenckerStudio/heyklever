"use client";

import { useState, useEffect } from "react";
import { DocumentationRenderer } from "@/components/ui/documentation-renderer";
import { KleverDocsToc } from "@/components/ui/klever-docs-toc";
import { KleverDocsPage } from "@/components/ui/klever-docs-page";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Loader2, BookOpen } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAppAdminClient } from "@/lib/admin";
import { motion } from "framer-motion";

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

export default function PublicDocsPage() {
  const [docs, setDocs] = useState<PublicDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PublicDoc | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
    fetchAllDocs();
  }, []);

  useEffect(() => {
    fetchDocs(selectedTopic);
  }, [selectedTopic]);

  const checkAdminStatus = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const admin = await isAppAdminClient(user.email);
        setIsAdmin(admin);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const [allDocs, setAllDocs] = useState<PublicDoc[]>([]);

  const fetchAllDocs = async () => {
    try {
      const res = await fetch("/api/public-docs");
      if (res.ok) {
        const data = await res.json();
        setAllDocs(data.documents || []);
        // If no topic selected, show all docs
        if (!selectedTopic) {
          setDocs(data.documents || []);
        }
      }
    } catch (error) {
      console.error("Error fetching all docs:", error);
    }
  };

  const fetchDocs = async (topic?: string | null) => {
    setLoading(true);
    try {
      if (topic) {
        const url = `/api/public-docs?topic=${encodeURIComponent(topic)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDocs(data.documents || []);
        }
      } else {
        // Use allDocs if available, otherwise fetch
        if (allDocs.length > 0) {
          setDocs(allDocs);
        } else {
          const res = await fetch("/api/public-docs");
          if (res.ok) {
            const data = await res.json();
            setDocs(data.documents || []);
            setAllDocs(data.documents || []);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique topics from all docs
  const topics = Array.from(new Set(allDocs.map(doc => doc.topic).filter(Boolean) as string[])).sort();
  
  // Use docs directly (already filtered by API or all docs)
  const filteredDocs = docs;

  const handleDocClick = async (slug: string) => {
    try {
      const res = await fetch(`/api/public-docs/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDoc(data.document);
      } else {
        console.error("Failed to fetch doc");
      }
    } catch (error) {
      console.error("Error fetching doc:", error);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedDoc(null);
  };

  if (selectedDoc !== null || isCreating) {
    return (
      <div className="relative w-full h-full">
        <KleverDocsPage
          initialDoc={selectedDoc}
          isAdmin={isAdmin}
          onBack={() => {
            setSelectedDoc(null);
            setIsCreating(false);
          }}
          onDocChange={() => {
            fetchDocs();
            setSelectedDoc(null);
            setIsCreating(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Documentation</h1>
          <p className="text-sm text-muted-foreground">
            Learn how to use HeyKleverAI and explore its features
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={handleCreateNew}
            className="gap-2 shrink-0"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Create New
          </Button>
        )}
      </div>

      {/* Topic Filter */}
      {topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={selectedTopic === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTopic(null)}
            className="text-xs"
          >
            All Topics
          </Button>
          {topics.map((topic) => (
            <Button
              key={topic}
              variant={selectedTopic === topic ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTopic(topic)}
              className="text-xs"
            >
              {topic}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading documentation...</p>
        </div>
      ) : docs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border/60 rounded-xl bg-muted/20 text-center"
        >
          <div className="p-4 rounded-full bg-primary/5 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No documentation yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Documentation will appear here once it's been created.
          </p>
          {isAdmin && (
            <Button
              onClick={handleCreateNew}
              variant="outline"
              className="gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Create First Document
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              onClick={() => handleDocClick(doc.slug)}
              className="group cursor-pointer"
            >
              <div className="h-full bg-background border border-border/40 hover:border-primary/30 rounded-lg p-5 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col relative overflow-hidden">
                {/* Hover gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="flex items-start justify-between mb-3 relative z-10">
                  <div className="p-2.5 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.topic && (
                      <span className="text-[10px] uppercase tracking-wider font-medium text-primary/70 bg-primary/10 px-2 py-1 rounded-md">
                        {doc.topic}
                      </span>
                    )}
                    {!doc.is_published && isAdmin && (
                      <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/60 bg-muted/50 px-2 py-1 rounded-md">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="relative z-10 flex-1">
                  <h3 className="text-base font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {doc.content.slice(0, 120).replace(/[#*`]/g, '')}...
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-primary">Read more</span>
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

