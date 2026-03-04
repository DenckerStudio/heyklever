"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DocumentationRenderer } from "@/components/ui/documentation-renderer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, User, Users, ChevronLeft, FolderPlus, Sparkles, Trash2, PenTool, Save, X, Wand2 } from "lucide-react";
import { CreateDocDialog } from "@/components/dashboard/docs/create-doc-dialog";
import { AddTeamFilesDialog } from "@/components/dashboard/docs/AddTeamFilesDialog";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Modal, 
  ModalBody, 
  ModalContent, 
  ModalFooter 
} from "@/components/ui/animated-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

interface Doc {
  id: string;
  file_name: string;
  content: string;
  created_at: string;
  context: string;
  object_path: string;
}

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"team" | "personal">("team");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [addTeamFilesOpen, setAddTeamFilesOpen] = useState(false);
  
  // AI Modification State
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSelectionTooltip, setShowSelectionTooltip] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiModifying, setIsAiModifying] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDocs(activeTab);
    setSelectedDoc(null);
  }, [activeTab]);

  const fetchDocs = async (type: "team" | "personal") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/docs?type=${type}`);
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

  const updateSelection = useCallback(
    (editorInstance: ReturnType<typeof useEditor>, showTooltip = false) => {
      if (!editorInstance || !editorRef.current) return;
      
      // Clear any existing timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
      
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        // Check if editor view is available
        if (!editorInstance.view) {
          return;
        }
        
        // Check if coordsAtPos method exists
        if (typeof editorInstance.view.coordsAtPos !== 'function') {
          return;
        }

        const { from, to } = editorInstance.state.selection;
    if (from !== to) {
          const text = editorInstance.state.doc.textBetween(from, to, " ");
      setSelection({
        start: from,
        end: to,
            text: text,
          });

          // Get selection coordinates
          const { view } = editorInstance;
          
          try {
            const start = view.coordsAtPos(from);
            const end = view.coordsAtPos(to);
            
            // coordsAtPos returns viewport coordinates, so we can use them directly
            // Position tooltip above the selection, centered horizontally
            const x = (start.left + end.left) / 2;
            const y = start.top - 10; // 10px above selection start
            
            // Ensure tooltip stays within viewport bounds
            const tooltipHeight = 40; // Approximate tooltip height
            const viewportWidth = window.innerWidth;
            const tooltipWidth = 150; // Approximate tooltip width
            
            let finalY = y;
            let finalX = x;
            
            // If tooltip would go above viewport, show below selection instead
            if (y < tooltipHeight) {
              finalY = end.bottom + 10;
            }
            
            // Ensure tooltip doesn't go off screen horizontally
            if (x - tooltipWidth / 2 < 0) {
              finalX = tooltipWidth / 2 + 10;
            } else if (x + tooltipWidth / 2 > viewportWidth) {
              finalX = viewportWidth - tooltipWidth / 2 - 10;
            }

            setSelectionPosition({ x: finalX, y: finalY });
            
            // Only show tooltip after delay if showTooltip is true and not currently selecting
            if (showTooltip && !isSelecting) {
              selectionTimeoutRef.current = setTimeout(() => {
                setShowSelectionTooltip(true);
              }, 200); // 0.2s delay
            } else {
              setShowSelectionTooltip(false);
            }
          } catch (error) {
            // Fallback: hide position if coordinates can't be calculated
            console.error("Error calculating selection position:", error);
            setSelectionPosition(null);
            setShowSelectionTooltip(false);
          }
    } else {
      setSelection(null);
          setSelectionPosition(null);
          setShowSelectionTooltip(false);
    }
      });
    },
    [isSelecting]
  );

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
      // Don't show tooltip during content updates, only update selection
      updateSelection(editor, false);
    },
    onSelectionUpdate: ({ editor }) => {
      // Don't show tooltip during selection updates (user is still selecting)
      updateSelection(editor, false);
    },
  }, [isEditing, updateSelection]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  // Hide tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selection && editorRef.current && !editorRef.current.contains(e.target as Node)) {
        // Only clear if clicking outside the editor
        if (editor) {
          editor.commands.blur();
        }
      }
    };

    if (selection) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [selection, editor]);

  // Update tooltip position on scroll and window resize
  useEffect(() => {
    if (!selection || !editor) return;

    const handleScroll = () => {
      // Debounce scroll updates
      const timeoutId = setTimeout(() => {
        updateSelection(editor, false); // Don't show tooltip on scroll, just update position
      }, 50);
      return () => clearTimeout(timeoutId);
    };

    const handleResize = () => {
      updateSelection(editor, false); // Don't show tooltip on resize, just update position
    };

    const editorElement = editorRef.current;
    if (editorElement) {
      editorElement.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize);
      
      return () => {
        editorElement.removeEventListener('scroll', handleScroll);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [selection, editor, updateSelection]);

  // Handle selection start/end to track when user is actively selecting
  useEffect(() => {
    if (!editor || !isEditing) return;

    const handleMouseDown = () => {
      setIsSelecting(true);
      setShowSelectionTooltip(false);
      // Clear any pending timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
    };

    const handleMouseUp = () => {
      setIsSelecting(false);
      // Small delay to ensure selection is updated, then show tooltip
      setTimeout(() => {
        updateSelection(editor, true); // Pass true to show tooltip after delay
      }, 10);
    };

    const handleMouseMove = () => {
      // If mouse is moving while button is down, user is still selecting
      if (isSelecting) {
        setShowSelectionTooltip(false);
        // Clear any pending timeout
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
          selectionTimeoutRef.current = null;
        }
      }
    };

    const editorElement = editorRef.current;
    if (editorElement) {
      editorElement.addEventListener('mousedown', handleMouseDown);
      editorElement.addEventListener('mouseup', handleMouseUp);
      editorElement.addEventListener('mousemove', handleMouseMove);
      
      return () => {
        editorElement.removeEventListener('mousedown', handleMouseDown);
        editorElement.removeEventListener('mouseup', handleMouseUp);
        editorElement.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [editor, isEditing, updateSelection, isSelecting]);

  

  const handleAiModify = async () => {
    if (!selection || !aiInstruction || !editor) return;
    
    setIsAiModifying(true);
    try {
        const res = await fetch("/api/docs/modify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                selectedText: selection.text,
                instruction: aiInstruction,
                fullText: editContent
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.modifiedText && editor) {
                // Replace selected text in TipTap editor
                editor.chain()
                    .focus()
                  .deleteSelection()
                    .insertContent(data.modifiedText)
                    .run();
                
                setShowAiDialog(false);
                setAiInstruction("");
                setSelection(null); 
            }
        } else {
            const err = await res.json();
            alert(`AI Modification failed: ${err.details || err.error}`);
        }
    } catch (e) {
        console.error("AI Modify error:", e);
        alert("Failed to modify text with AI");
    } finally {
        setIsAiModifying(false);
    }
  };

  const handleInitializeFolders = async () => {
    setInitLoading(true);
    try {
      const res = await fetch("/api/docs/init", { method: "POST" });
      if (res.ok) {
        fetchDocs(activeTab);
      } else {
        console.error("Failed to initialize folders");
      }
    } catch (e) {
      console.error("Error initializing:", e);
    } finally {
      setInitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/docs?id=${selectedDoc.id}`, { method: "DELETE" });
      if (res.ok) {
        // alert("Document deleted");
        setSelectedDoc(null);
        fetchDocs(activeTab);
      } else {
        alert("Failed to delete document");
      }
    } catch {
      alert("Error deleting document");
    }
  };

  const handleModify = () => {
    if (selectedDoc) {
      setEditContent(selectedDoc.content);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    
    try {
      const res = await fetch("/api/docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDoc.id, content: editContent })
      });
      
      if (res.ok) {
        const updatedDoc = { ...selectedDoc, content: editContent };
        setSelectedDoc(updatedDoc);
        setDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
        setIsEditing(false);
      } else {
        alert("Failed to save document");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving document");
    }
  };

  const handleAddToTeamFiles = async (targetPath: string, newFileName?: string) => {
    if (!selectedDoc) return;
    try {
       const res = await fetch("/api/storage/ingest", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
               fileName: newFileName || selectedDoc.file_name,
               content: selectedDoc.content,
               objectPath: targetPath,
               context: "team", 
               bucketId: "team-files" // Assuming this is the bucket name, or handled by n8n
           })
       });
       
       if (res.ok) {
           alert(`Successfully added to ${targetPath}`);
           setAddTeamFilesOpen(false);
       } else {
           const err = await res.json();
           throw new Error(err.details || "Failed");
       }
    } catch (e) {
        console.error(e);
        alert("Failed to add to team files");
    }
  };

  if (selectedDoc) {
    return (
      <div className="min-h-screen bg-background relative flex flex-col animate-in fade-in zoom-in-95 duration-300">
         {/* Floating Header */}
         <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/50 border-b border-border/40 px-6 py-4 flex items-center justify-between transition-all duration-200">
            <div className="flex items-center gap-4">
                {!isEditing && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedDoc(null)}
                    className="hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                )}
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">{selectedDoc.file_name}</h1>
                    <p className="text-xs text-muted-foreground">
                        {isEditing ? "Editing mode" : `Generated on ${new Date(selectedDoc.created_at).toLocaleDateString()}`}
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                {isEditing ? (
                    <>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleCancelEdit}
                            className="gap-2 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handleSave}
                            className="gap-2 rounded-full transition-all"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </>
                ) : (
                    <>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDelete}
                    className="gap-2 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground"
                >
                    <Trash2 className="w-4 h-4" />
                    Delete
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleModify}
                    className="gap-2 rounded-full hover:bg-primary/5 transition-all text-muted-foreground"
                >
                    <PenTool className="w-4 h-4" />
                    Modify
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setAddTeamFilesOpen(true)}
                    className="gap-2 rounded-full border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all"
                >
                    <FolderPlus className="w-4 h-4" />
                    Add to team files
                </Button>
                    </>
                )}
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-140px)] min-h-0">
            {isEditing ? (
                <div className="h-full flex flex-col gap-4">
                    <div className="flex justify-between items-center px-1">
                        <div className="text-sm text-muted-foreground font-medium">Edit Document</div>
                        <div className="flex items-center gap-2">
                            {selection && (
                                <span className="text-xs text-muted-foreground">
                                    {selection.text.length} chars selected
                                </span>
                            )}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={!selection}
                            onClick={() => setShowAiDialog(true)}
                            className="gap-2 h-8 hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            Modify Selection with AI
                        </Button>
                        </div>
                    </div>
                    <div className="flex-1 border rounded-lg border-border/40 overflow-hidden bg-background/40">
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
                            className="h-full overflow-auto relative"
                        >
                            {editor && (
                                <EditorContent 
                                    editor={editor} 
                                    className="h-full"
                                />
                            )}
                            
                            {/* Floating Selection Tooltip */}
                            <AnimatePresence>
                                {selection && selectionPosition && showSelectionTooltip && !isSelecting && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="fixed z-50 pointer-events-auto"
                                        style={{
                                            left: `${selectionPosition.x}px`,
                                            top: `${selectionPosition.y}px`,
                                            transform: 'translateX(-50%) translateY(-100%)',
                                        }}
                                    >
                                        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg px-2 py-1.5 flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowAiDialog(true)}
                                                className="gap-2 h-8 text-xs hover:bg-primary/10 hover:text-primary transition-all"
                                            >
                                                <Wand2 className="w-3.5 h-3.5" />
                                                Modify with AI
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full overflow-auto">
            <DocumentationRenderer content={selectedDoc.content} />
                </div>
            )}
         </div>

         <AddTeamFilesDialog 
            open={addTeamFilesOpen} 
            onOpenChange={setAddTeamFilesOpen}
            fileName={selectedDoc.file_name}
            onConfirm={handleAddToTeamFiles}
         />

         {/* AI Modify Modal */}
         <Modal open={showAiDialog} setOpen={setShowAiDialog}>
            <ModalBody className="max-w-[500px] min-h-0 h-auto">
                <ModalContent className="p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Modify with AI
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Provide instructions on how to modify the selected text.
                        </p>
                        
                        <div className="bg-muted/50 p-3 rounded-md text-muted-foreground max-h-32 overflow-auto border border-border/50 font-mono text-xs">
                            {selection?.text || "No text selected"}
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Instruction</Label>
                            <Input 
                                value={aiInstruction} 
                                onChange={(e) => setAiInstruction(e.target.value)}
                                placeholder="e.g. Make it more concise, Fix grammar, Translate to Spanish..."
                                onKeyDown={(e) => e.key === "Enter" && handleAiModify()}
                            />
                        </div>
                    </div>
                    
                    <ModalFooter className="mt-6 gap-2">
                        <Button variant="ghost" onClick={() => setShowAiDialog(false)}>Cancel</Button>
                        <Button onClick={handleAiModify} disabled={!aiInstruction || isAiModifying}>
                            {isAiModifying ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                    Modifying...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Generate
                                </>
                            )}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </ModalBody>
         </Modal>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto h-full min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">AI Docs</h1>
            <p className="text-muted-foreground">Knowledge base generated by your AI assistants.</p>
        </div>
        <CreateDocDialog onSuccess={() => fetchDocs(activeTab)} />
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "team" | "personal")} className="w-auto">
            <TabsList className="bg-muted/50 p-1 rounded-full border border-border/50">
            <TabsTrigger value="team" className="rounded-full px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Users className="h-4 w-4 mr-2" />
                Team Docs
            </TabsTrigger>
            <TabsTrigger value="personal" className="rounded-full px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <User className="h-4 w-4 mr-2" />
                Personal Docs
            </TabsTrigger>
            </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground font-medium px-2">{docs.length} documents</span>
      </div>

        <div className="mt-6">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-24 gap-4">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
               <p className="text-sm text-muted-foreground animate-pulse">Loading documents...</p>
             </div>
           ) : docs.length === 0 ? (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center p-16 border border-dashed border-border/60 rounded-3xl bg-muted/20 text-center max-w-2xl mx-auto mt-12"
            >
              <div className="bg-primary/5 p-6 rounded-full mb-6 relative group">
                 <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50" />
                 <Sparkles className="h-10 w-10 text-primary relative z-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-8 max-w-sm">
                {activeTab === "team" 
                  ? "Your team hasn't generated any documents yet. Start by creating a new guide or documentation." 
                  : "You haven't generated any personal documents yet. Use the AI to create your first personal note."}
              </p>
              <Button 
                variant="outline" 
                onClick={handleInitializeFolders} 
                disabled={initLoading}
                className="gap-2 rounded-full px-6 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                {initLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : (
                  <FolderPlus className="h-4 w-4" />
                )}
                Initialize Folders
              </Button>
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
                            staggerChildren: 0.05
                        }
                    }
                }}
            >
              <AnimatePresence>
                {docs.map((doc) => (
                    <motion.div
                        key={doc.id}
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
                        }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        onClick={() => setSelectedDoc(doc)}
                        className="group cursor-pointer"
                    >
                        <div className="h-full bg-background/40 hover:bg-background/80 backdrop-blur-sm border border-border/40 hover:border-primary/30 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/5 flex flex-col relative overflow-hidden">
                            {/* Hover Gradient Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="p-3 rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                                    {doc.file_name.toLowerCase().includes('guide') ? <BookOpenIcon /> : 
                                     doc.file_name.toLowerCase().includes('blog') ? <PenIcon /> : 
                                     <FileText className="h-6 w-6" />}
                                </div>
                                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/60 bg-muted/50 px-2 py-1 rounded-md">
                                    {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            
                            <div className="relative z-10">
                                <h3 className="text-lg font-semibold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                    {doc.file_name.replace(/\.(md|txt)$/, '')}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                    {doc.content.slice(0, 150).replace(/[#*`]/g, '')}...
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between relative z-10 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                                <span className="text-xs font-medium text-primary">Read Document</span>
                                <ChevronLeft className="h-4 w-4 text-primary rotate-180" />
                            </div>
                        </div>
                    </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
    </div>
  );
}

// Simple Icons for Card Types
const BookOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
)

const PenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
)
