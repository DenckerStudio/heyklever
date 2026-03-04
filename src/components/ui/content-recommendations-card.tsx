'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { ArrowRight, FileText, Sparkles, Upload, FilePlus, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from './dialog';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContentRecommendation {
  id: string;
  document_name: string;
  topics: string[];
  summary: string;
  status: 'pending' | 'created' | 'dismissed' | 'analyzing';
  metadata_recommendations: {
    language?: string;
    audience?: string;
    feature?: string;
    use_case?: string;
  };
  created_at: string;
}

interface ContentRecommendationsCardProps {
  recommendations: ContentRecommendation[];
  className?: string;
}

export function ContentRecommendationsCard({ recommendations, className }: ContentRecommendationsCardProps) {
  const [selectedRec, setSelectedRec] = useState<ContentRecommendation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  
  const pendingRecommendations = recommendations.filter(r => r.status === 'pending');
  const displayRecommendations = pendingRecommendations.slice(0, 5);
  const hasMore = pendingRecommendations.length > 5;

  const handleRecClick = (rec: ContentRecommendation) => {
    setSelectedRec(rec);
    setModalOpen(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    }
  };

  return (
    <>
      <Card className={cn("h-full flex flex-col overflow-hidden bg-transparent border-0 shadow-none", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Content Recommendations</CardTitle>
          <Badge variant="secondary" className="font-normal bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            {pendingRecommendations.length} pending
          </Badge>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto pr-2 custom-scrollbar">
          <motion.div 
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {displayRecommendations.length === 0 ? (
              <motion.div 
                className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm text-center"
                variants={itemVariants}
              >
                <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                <p>No recommendations yet.</p>
                <p className="text-xs mt-1">Poor responses will appear here.</p>
              </motion.div>
            ) : (
              displayRecommendations.map((rec) => (
                <motion.div 
                  key={rec.id}
                  variants={itemVariants}
                  className="flex flex-col space-y-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group backdrop-blur-sm"
                  onClick={() => handleRecClick(rec)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <div className="p-1.5 rounded-md bg-blue-500/10">
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <span className="truncate max-w-[180px]" title={rec.document_name}>{rec.document_name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-7">
                    {rec.summary}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mt-1 pl-7">
                    {rec.topics.slice(0, 3).map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-background/50 border-white/10">
                        {topic}
                      </Badge>
                    ))}
                    {rec.topics.length > 3 && (
                      <span className="text-[10px] text-muted-foreground flex items-center px-1">
                        +{rec.topics.length - 3}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}

            {hasMore && (
              <motion.div variants={itemVariants}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
                  onClick={() => setViewMoreOpen(true)}
                >
                  View {pendingRecommendations.length - 5} more recommendations
                </Button>
              </motion.div>
            )}
          </motion.div>
        </CardContent>
      </Card>

      {/* Action Modal */}
      <RecommendationActionModal 
        recommendation={selectedRec} 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />

      {/* View More Modal */}
      <Dialog open={viewMoreOpen} onOpenChange={setViewMoreOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle>All Content Recommendations</DialogTitle>
            <DialogDescription>
              Address these content gaps to improve AI responses.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1 space-y-3 mt-2 custom-scrollbar">
            {pendingRecommendations.map((rec) => (
              <div 
                key={rec.id}
                className="flex flex-col space-y-2 p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => {
                  setViewMoreOpen(false);
                  handleRecClick(rec);
                }}
              >
                 <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-medium">
                      <div className="p-1.5 rounded-md bg-blue-500/10">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                      <span>{rec.document_name}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-8">
                    {rec.summary}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 pl-8">
                    {rec.topics.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-secondary/50">
                        {topic}
                      </Badge>
                    ))}
                  </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecommendationActionModal({ 
  recommendation, 
  open, 
  onOpenChange 
}: { 
  recommendation: ContentRecommendation | null, 
  open: boolean, 
  onOpenChange: (open: boolean) => void 
}) {
  const [mode, setMode] = useState<'initial' | 'upload'>('initial');
  const [analyzeWithAi, setAnalyzeWithAi] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const supabase = createSupabaseBrowserClient();

  // Reset mode when modal closes or opens new rec
  React.useEffect(() => {
    if (open) setMode('initial');
  }, [open, recommendation]);

  if (!recommendation) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      onOpenChange(false);
    }, 2000);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>Resolve Content Gap</DialogTitle>
          <DialogDescription>
            Improve AI responses by addressing this recommendation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="bg-muted/30 p-4 rounded-lg space-y-3 border border-white/5">
            <div>
              <h4 className="font-semibold text-sm mb-1 text-muted-foreground">Recommended Document</h4>
              <p className="text-lg font-medium flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-primary" />
                {recommendation.document_name}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Topics to Cover</h4>
              <div className="flex flex-wrap gap-1.5">
                {recommendation.topics.map((t, i) => (
                  <Badge key={i} variant="outline" className="bg-background/50 border-white/10">{t}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Summary</h4>
              <p className="text-sm text-muted-foreground">{recommendation.summary}</p>
            </div>

             <div className="border-t border-white/10 pt-3 mt-3">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Metadata Recommendations</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {recommendation.metadata_recommendations.language && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span className="font-medium">{recommendation.metadata_recommendations.language}</span>
                  </div>
                )}
                {recommendation.metadata_recommendations.audience && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audience:</span>
                    <span className="font-medium">{recommendation.metadata_recommendations.audience}</span>
                  </div>
                )}
                {recommendation.metadata_recommendations.feature && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Feature/Folder:</span>
                    <span className="font-medium">{recommendation.metadata_recommendations.feature}</span>
                  </div>
                )}
                {recommendation.metadata_recommendations.use_case && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Use Case:</span>
                    <span className="font-medium">{recommendation.metadata_recommendations.use_case}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mode === 'initial' ? (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 border-white/10 bg-transparent"
                onClick={() => setMode('upload')}
              >
                <Upload className="h-6 w-6 mb-1 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-semibold">Upload Document</div>
                  <div className="text-xs text-muted-foreground font-normal mt-1">
                    Upload an existing file
                  </div>
                </div>
              </Button>

              <Button 
                className="h-auto py-4 flex flex-col items-center gap-2 relative overflow-hidden group"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center">
                  {isGenerating ? (
                    <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="h-6 w-6 mb-1 text-white" />
                  )}
                  <div className="text-center text-white">
                    <div className="font-semibold">Generate with AI</div>
                    <div className="text-xs text-white/80 font-normal mt-1">
                      Using web search & team files
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          ) : (
             <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-white/20 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer bg-white/5">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to select or drag file here</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT up to 10MB</p>
              </div>

              <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-md border border-white/5">
                 <Checkbox 
                  id="ai-analyze" 
                  checked={analyzeWithAi}
                  onCheckedChange={(checked) => setAnalyzeWithAi(checked === true)}
                />
                <label
                  htmlFor="ai-analyze"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Analyze with AI after upload
                </label>
              </div>

               <div className="flex justify-between items-center pt-2">
                <Button type="button" variant="ghost" onClick={() => setMode('initial')}>
                  Back
                </Button>
                <Button type="submit">
                  Upload Document
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
