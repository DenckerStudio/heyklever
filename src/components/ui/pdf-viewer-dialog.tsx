"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";
import { QRCodeSVG } from "qrcode.react";
import { FileText, Download, ShieldCheck, ShieldAlert, Shield, Loader2 } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalContent
} from "@/components/ui/animated-modal";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  context?: 'public' | 'private';
  excerpts?: string[];
  relevance?: string;
}

type FileType = 'pdf' | 'image' | 'text' | 'html' | 'other';

function getFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['txt', 'md', 'json', 'csv', 'log', 'xml', 'yaml', 'yml'].includes(ext)) return 'text';

  return 'other';
}

export function PDFViewerDialog({ open, onOpenChange, fileName, context = 'private', excerpts = [], relevance }: DocumentViewerDialogProps) {
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [_textContent, setTextContent] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [generatingShare, setGeneratingShare] = useState(false);
  const fileType = getFileType(fileName);

  useEffect(() => {
    if (open && fileName) {
      setLoading(true);
      setError(null);
      setFileUrl(null);
      setTextContent(null);
      setShareUrl(null);
      setGeneratingShare(true);

      // Generate share link for QR code
      const generateShareLink = async () => {
        try {
          const response = await fetch('/api/storage/share', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              scope: context,
              path: fileName,
              type: 'file',
              expiresInHours: 24, // QR code valid for 24 hours
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Use the shareUrl directly if it's already a full URL, otherwise prepend origin
            const fullShareUrl = data.shareUrl.startsWith('http') 
              ? data.shareUrl 
              : `${window.location.origin}${data.shareUrl}`;
            setShareUrl(fullShareUrl);
          } else {
            console.error('Failed to generate share link');
          }
        } catch (err) {
          console.error('Error generating share link:', err);
        } finally {
          setGeneratingShare(false);
        }
      };

      // Fetch file from storage for preview only if PDF
      const fetchFile = async () => {
        try {
          // Check if it's an image for optimized loading
          if (fileType === 'image') {
            const response = await fetch(`/api/storage/download?scope=${context}&path=${encodeURIComponent(fileName)}`);
            if (response.ok) {
                const blob = await response.blob();
                setFileUrl(URL.createObjectURL(blob));
            } else {
                throw new Error("Failed to load image");
            }
          } 
          // Check if it's a PDF
          else if (fileType === 'pdf') {
             // For PDF Viewer we need a public URL or a blob URL
             // Let's use the download endpoint to get a blob
             const response = await fetch(`/api/storage/download?scope=${context}&path=${encodeURIComponent(fileName)}`);
             if (response.ok) {
                const blob = await response.blob();
                setFileUrl(URL.createObjectURL(blob));
             } else {
                 // Try to get a signed URL as fallback?
                 throw new Error("Failed to load PDF");
             }
          }
           // Check if it's text
          else if (fileType === 'text') {
            const response = await fetch(`/api/storage/download?scope=${context}&path=${encodeURIComponent(fileName)}`);
            if (response.ok) {
               const text = await response.text();
               setTextContent(text);
               setFileUrl("text-content-loaded"); // just a flag
            }
          }
          
        } catch (err) {
          console.error('Error loading file:', err);
          setError('Failed to load document preview');
        } finally {
          setLoading(false);
          // Always try to generate share link in parallel or after
          generateShareLink(); 
        }
      };

      fetchFile();
    }
    
    // Cleanup URLs on unmount or close
    return () => {
        if (fileUrl && fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileUrl);
        }
    };
  }, [open, fileName, context, fileType]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
          <div className="p-4 rounded-full bg-red-500/10 text-red-500">
             <ShieldAlert className="w-8 h-8" />
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      );
    }

    // PDF Viewer
    if (fileType === 'pdf' && fileUrl) {
      return (
        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden relative">
            <iframe 
                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full border-0"
                title="PDF Preview" 
            />
            {/* Overlay to prevent some interactions if needed, or custom controls */}
        </div>
      );
    }

    // Image Viewer
    if (fileType === 'image' && fileUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black/5 p-8 overflow-auto">
                <img src={fileUrl} alt={fileName} className="max-w-full max-h-full object-contain shadow-lg rounded-md" />
            </div>
        )
    }

    // Fallback / Other types
    return (
      <div className="flex flex-col md:flex-row h-full">
        {/* Left Side: Document Details & AI Context */}
        <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-start gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <FileText className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-1">{fileName}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="capitalize">{context} Storage</span>
                        <span>•</span>
                        <span className="uppercase">{fileType}</span>
                    </div>
                </div>
            </div>

            {/* Relevance Score if available */}
            {relevance && (
                <div className="mb-8 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">AI Relevance Score</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{relevance}</p>
                </div>
            )}

            {/* Excerpts / Context */}
            {excerpts.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Relevant Excerpts</h4>
                    {excerpts.map((excerpt, i) => (
                        <div key={i} className="p-4 bg-muted/50 rounded-lg text-sm leading-relaxed border border-border/50">
                            "{excerpt}"
                        </div>
                    ))}
                </div>
            )}
            
            {/* If it's text, show preview */}
            {_textContent && (
                <div className="mt-8 space-y-4">
                     <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">File Content</h4>
                     <pre className="p-4 bg-muted/30 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono border border-border/50">
                         {_textContent.slice(0, 2000)}
                         {_textContent.length > 2000 && "\n... (truncated)"}
                     </pre>
                </div>
            )}
        </div>

        {/* Right Side: QR Code for Mobile */}
        <div className="w-full md:w-80 bg-muted/10 border-l border-border/50 p-8 flex flex-col items-center justify-center text-center">
             <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
                {shareUrl && !generatingShare ? (
                    <QRCodeSVG value={shareUrl} size={160} />
                ) : (
                    <div className="w-[160px] h-[160px] bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                    </div>
                )}
             </div>
             <h4 className="font-medium mb-2">View on Mobile</h4>
             <p className="text-sm text-muted-foreground mb-6">
                Scan this QR code to view this document on your mobile device securely.
             </p>
             
             {/* Download Button */}
             <Button className="w-full gap-2" variant="outline" asChild>
                <a href={`/api/storage/download?scope=${context}&path=${encodeURIComponent(fileName)}`} download>
                    <Download className="w-4 h-4" />
                    Download File
                </a>
             </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal open={open} setOpen={onOpenChange}>
      <ModalBody className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] md:max-w-5xl md:rounded-2xl overflow-hidden p-0 flex flex-col bg-background border border-muted-foreground/10 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/10 shrink-0">
            <div className="text-base font-medium truncate flex-1 flex items-center gap-2">
              <FileText className="w-4 h-4 opacity-50" />
              {fileName}
            </div>
             {/* Close button handled by ModalBody usually, but we can add explicit one or rely on the one in ModalBody */}
          </div>

          <div className="flex-1 overflow-hidden relative bg-background/50">
            {renderContent()}
          </div>
      </ModalBody>
    </Modal>
  );
}
