'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { normalizeFileName, cn } from '@/lib/utils';

export type VisibilityScope = 'internal' | 'public' | 'restricted';

export interface UploadItem {
  id: string;
  fileName: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export interface UploadOptions {
  visibilityScope?: VisibilityScope;
  allowedClientCodes?: string[];
}

interface UploadContextType {
  uploads: UploadItem[];
  pendingFiles: UploadItem[];
  currentPath: string;
  setCurrentPath: (path: string) => void;
  // Visibility scope state
  visibilityScope: VisibilityScope;
  setVisibilityScope: (scope: VisibilityScope) => void;
  allowedClientCodes: string[];
  setAllowedClientCodes: (codes: string[]) => void;
  resetVisibilitySettings: () => void;
  // Upload functions
  addUpload: (file: File) => string;
  updateUpload: (id: string, updates: Partial<UploadItem>) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
  clearPending: () => void;
  uploadFile: (file: File, path?: string, options?: UploadOptions) => Promise<{ success: boolean; path?: string; error?: string }>;
  uploadPendingFiles: () => Promise<void>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

/**
 * Upload a file to storage and trigger ingestion webhook
 */
async function uploadFileToStorage(
  file: File, 
  scope: 'public' | 'private' = 'private',
  path: string = '',
  options: UploadOptions = {}
): Promise<{
  success: boolean;
  path?: string;
  bucketId?: string;
  error?: string;
}> {
  const { visibilityScope = 'internal', allowedClientCodes = [] } = options;
  
  try {
    const normalizedFileName = normalizeFileName(file.name);
    
    // 1. Get signed upload URL
    const response = await fetch('/api/storage/upload/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: normalizedFileName,
        fileSize: file.size,
        contentType: file.type,
        scope,
        path,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get upload URL' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const { uploadUrl, token, path: objectPath, bucketId } = await response.json();

    // 2. Upload file to storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Authorization': `Bearer ${token}`,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    // 3. Call storage ingest webhook to process the file with visibility metadata
    if (objectPath && bucketId) {
      let content = '';
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || 
          lower.endsWith('.json') || lower.endsWith('.xml') || lower.endsWith('.html') ||
          lower.endsWith('.css') || lower.endsWith('.js') || lower.endsWith('.ts')) {
        try {
          content = await file.text();
        } catch {
          content = '';
        }
      }

      await fetch('/api/storage/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: scope,
          bucketId,
          objectPath,
          fileName: normalizedFileName,
          content,
          // Enhanced metadata for visibility control
          visibilityScope,
          allowedClientCodes: visibilityScope === 'restricted' ? allowedClientCodes : [],
        }),
      }).catch(console.error);
    }

    return { success: true, path: objectPath, bucketId };
  } catch (error) {
    console.error('File upload failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

// File type icons mapping
const getFileIcon = (_fileName: string) => {
  // All file types use FileText for simplicity, can be extended
  return <FileText className="w-4 h-4" />;
};

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const currentPathRef = useRef(currentPath);
  
  // Visibility scope state
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>('internal');
  const [allowedClientCodes, setAllowedClientCodes] = useState<string[]>([]);
  const visibilityScopeRef = useRef(visibilityScope);
  const allowedClientCodesRef = useRef(allowedClientCodes);
  
  // Keep refs in sync
  useEffect(() => {
    visibilityScopeRef.current = visibilityScope;
  }, [visibilityScope]);
  
  useEffect(() => {
    allowedClientCodesRef.current = allowedClientCodes;
  }, [allowedClientCodes]);
  
  const resetVisibilitySettings = useCallback(() => {
    setVisibilityScope('internal');
    setAllowedClientCodes([]);
  }, []);
  
  const updateCurrentPath = useCallback((path: string) => {
    let subfolderPath = path;
    if (path.startsWith('Private/')) {
      subfolderPath = path.substring('Private/'.length);
    } else if (path.startsWith('Public/')) {
      subfolderPath = path.substring('Public/'.length);
    }
    currentPathRef.current = subfolderPath;
    setCurrentPath(subfolderPath);
  }, []);

  const addUpload = useCallback((file: File): string => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newUpload: UploadItem = {
      id,
      fileName: file.name,
      file,
      status: 'pending',
      progress: 0,
    };
    setUploads((prev) => [...prev, newUpload]);
    return id;
  }, []);

  const updateUpload = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((upload) => (upload.id === id ? { ...upload, ...updates } : upload))
    );
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((upload) => upload.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((upload) => upload.status !== 'success' && upload.status !== 'error'));
  }, []);

  const clearPending = useCallback(() => {
    setUploads((prev) => prev.filter((upload) => upload.status !== 'pending'));
  }, []);

  const pendingFiles = uploads.filter(u => u.status === 'pending');

  const uploadFile = useCallback(async (
    file: File, 
    overridePath?: string,
    options?: UploadOptions
  ): Promise<{ success: boolean; path?: string; error?: string }> => {
    const id = addUpload(file);
    updateUpload(id, { status: 'uploading', progress: 10 });

    const uploadPath = overridePath ?? currentPathRef.current;
    const uploadOptions: UploadOptions = options ?? {
      visibilityScope: visibilityScopeRef.current,
      allowedClientCodes: allowedClientCodesRef.current,
    };
    
    const result = await uploadFileToStorage(file, 'private', uploadPath, uploadOptions);

    if (result.success) {
      updateUpload(id, { status: 'success', progress: 100 });
      setTimeout(() => removeUpload(id), 4000);
    } else {
      updateUpload(id, { status: 'error', error: result.error });
    }

    return result;
  }, [addUpload, updateUpload, removeUpload]);

  const uploadPendingFiles = useCallback(async () => {
    const pending = uploads.filter(u => u.status === 'pending');
    const uploadOptions: UploadOptions = {
      visibilityScope: visibilityScopeRef.current,
      allowedClientCodes: allowedClientCodesRef.current,
    };
    
    for (const upload of pending) {
      updateUpload(upload.id, { status: 'uploading', progress: 10 });
      
      const result = await uploadFileToStorage(upload.file, 'private', currentPathRef.current, uploadOptions);
      
      if (result.success) {
        updateUpload(upload.id, { status: 'success', progress: 100 });
        setTimeout(() => removeUpload(upload.id), 4000);
      } else {
        updateUpload(upload.id, { status: 'error', error: result.error });
      }
    }
  }, [uploads, updateUpload, removeUpload]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      uploadFile(file);
    });
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const activeUploads = uploads.filter(u => u.status !== 'pending');

  return (
    <UploadContext.Provider
      value={{
        uploads,
        pendingFiles,
        currentPath,
        setCurrentPath: updateCurrentPath,
        // Visibility scope state
        visibilityScope,
        setVisibilityScope,
        allowedClientCodes,
        setAllowedClientCodes,
        resetVisibilitySettings,
        // Upload functions
        addUpload,
        updateUpload,
        removeUpload,
        clearCompleted,
        clearPending,
        uploadFile,
        uploadPendingFiles,
      }}
    >
      <div {...getRootProps()} className="h-full w-full relative">
        <input {...getInputProps()} className="hidden" />
        
        {/* Modern Centered Drag Overlay */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] pointer-events-none"
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />
              
              {/* Animated border effect */}
              <div className="absolute inset-4 md:inset-8 lg:inset-16 rounded-3xl overflow-hidden">
                <motion.div
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.5) 50%, hsl(var(--primary)) 100%)',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '200% 50%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
                <div className="absolute inset-[2px] bg-background rounded-3xl" />
              </div>

              {/* Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="flex flex-col items-center gap-6 text-center px-4"
                >
                  {/* Upload Icon */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative"
                  >
                    <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
                      <Upload className="w-10 h-10 text-primary" />
                    </div>
                    {/* Pulse rings */}
                    <motion.div
                      className="absolute inset-0 rounded-3xl border-2 border-primary/30"
                      animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-3xl border-2 border-primary/20"
                      animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                    />
                  </motion.div>

                  {/* Text */}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold text-foreground">
                      Drop files to upload
                    </h3>
                    {currentPath ? (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-sm">
                          Upload to <span className="text-primary font-medium">/{currentPath}</span>
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Files will be uploaded to your storage
                      </p>
                    )}
                  </div>

                  {/* Supported formats hint */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {['PDF', 'DOC', 'TXT', 'Images', 'More'].map((format) => (
                      <span
                        key={format}
                        className="px-2.5 py-1 text-xs font-medium bg-muted/50 text-muted-foreground rounded-full"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {children}

        {/* Modern Upload Status Toasts */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          <AnimatePresence mode="popLayout">
            {activeUploads.map((upload) => (
              <motion.div
                key={upload.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="pointer-events-auto"
              >
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-xl",
                    "bg-background/95 border-border/50",
                    upload.status === 'error' && "border-destructive/50",
                    upload.status === 'success' && "border-green-500/50"
                  )}
                >
                  {/* Progress bar background */}
                  {upload.status === 'uploading' && (
                    <motion.div
                      className="absolute inset-0 bg-primary/5"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: upload.progress / 100 }}
                      style={{ transformOrigin: 'left' }}
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  <div className="relative flex items-center gap-3 p-3">
                    {/* Status Icon */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        upload.status === 'uploading' && "bg-primary/10 text-primary",
                        upload.status === 'success' && "bg-green-500/10 text-green-500",
                        upload.status === 'error' && "bg-destructive/10 text-destructive"
                      )}
                    >
                      {upload.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      )}
                      {upload.status === 'success' && (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getFileIcon(upload.fileName)}
                        <span className="text-sm font-medium truncate">
                          {upload.fileName}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {upload.status === 'uploading' && 'Uploading...'}
                        {upload.status === 'success' && 'Upload complete'}
                        {upload.status === 'error' && (upload.error || 'Upload failed')}
                      </p>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => removeUpload(upload.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors shrink-0",
                        "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  {upload.status === 'uploading' && (
                    <div className="h-1 bg-muted/50">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: '0%' }}
                        animate={{ width: `${upload.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    return {
      uploads: [],
      pendingFiles: [],
      currentPath: '',
      setCurrentPath: () => {},
      // Visibility scope defaults
      visibilityScope: 'internal' as VisibilityScope,
      setVisibilityScope: () => {},
      allowedClientCodes: [] as string[],
      setAllowedClientCodes: () => {},
      resetVisibilitySettings: () => {},
      // Upload function defaults
      addUpload: () => '',
      updateUpload: () => {},
      removeUpload: () => {},
      clearCompleted: () => {},
      clearPending: () => {},
      uploadFile: async () => ({ success: false, error: 'No upload provider' }),
      uploadPendingFiles: async () => {},
    };
  }
  return context;
}
