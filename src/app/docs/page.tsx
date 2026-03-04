"use client";

import { useState, useEffect } from "react";
import { NavbarSection } from "@/components/sections/navbar/navbar";
import FooterSection from "@/components/sections/footer/default";
import { KleverDocsPage } from "@/components/ui/klever-docs-page";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Loader2 } from "lucide-react";
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

export default function DocsPage() {
  const [docs, setDocs] = useState<PublicDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PublicDoc | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
    fetchDocs();
  }, []);

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

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public-docs");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      } else {
        console.error("Failed to fetch docs");
      }
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

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
      <main className="relative flex min-h-screen flex-col items-center bg-background">
        <NavbarSection />
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
        <FooterSection />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center bg-background">
      <NavbarSection />
      
      <div className="w-full pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Documentation</h1>
            <p className="text-muted-foreground">
              Learn how to use HeyKleverAI and explore its features
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={handleCreateNew}
              className="gap-2 rounded-full"
            >
              <Plus className="w-4 h-4" />
              Create New
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading documentation...</p>
          </div>
        ) : docs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center p-16 border border-dashed border-border/60 rounded-3xl bg-muted/20 text-center"
          >
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No documentation yet</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Documentation will appear here once it's been created.
            </p>
            {isAdmin && (
              <Button
                onClick={handleCreateNew}
                variant="outline"
                className="gap-2 rounded-full"
              >
                <Plus className="w-4 h-4" />
                Create First Document
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {docs.map((doc) => (
              <motion.div
                key={doc.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
                  },
                }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                onClick={() => handleDocClick(doc.slug)}
                className="group cursor-pointer"
              >
                <div className="h-full bg-background/40 hover:bg-background/80 backdrop-blur-sm border border-border/40 hover:border-primary/30 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/5 flex flex-col relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="p-3 rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                      <FileText className="h-6 w-6" />
                    </div>
                    {!doc.is_published && isAdmin && (
                      <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/60 bg-muted/50 px-2 py-1 rounded-md">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {doc.content.slice(0, 150).replace(/[#*`]/g, '')}...
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between relative z-10 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                    <span className="text-xs font-medium text-primary">Read Document</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <FooterSection />
    </main>
  );
}
