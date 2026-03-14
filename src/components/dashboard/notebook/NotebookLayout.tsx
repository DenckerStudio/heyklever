"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  X,
  FileText,
  Grid3X3,
  List,
  FileSpreadsheet,
  FileImage,
  FileCode,
  FileArchive,
  FileAudio2,
  FileVideo2,
  File as FileIcon,
  Presentation,
  LayoutGrid,
  Search,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  Trash2,
  Download,
  Eye,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { NotebookChat, type NotebookChatRef } from "./NotebookChat";
import { NotebookFolderView, type NotebookFolderViewRef } from "./NotebookFolderView";
import type { DriveItem } from "@/components/drive/types";
import { AnimatedFolder, type Document } from "@/components/ui/3d-folder";
import { UploadProvider, useUpload } from "@/lib/upload-context";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/animated-modal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from "next/image";

// Sync component to update upload context with current folder path
function UploadPathSync({ folderPath }: { folderPath: string | null }) {
  const { setCurrentPath } = useUpload();
  
  useEffect(() => {
    if (folderPath) {
      setCurrentPath(folderPath);
    } else {
      setCurrentPath('');
    }
  }, [folderPath, setCurrentPath]);
  
  return null;
}

// Standard folder colors
const standardColors = [
  { name: "Blue", gradient: "linear-gradient(135deg, #00c6ff, #0072ff)" },
  { name: "Purple", gradient: "linear-gradient(135deg, #8e2de2, #4a00e0)" },
  { name: "Pink", gradient: "linear-gradient(135deg, #f80759, #bc4e9c)" },
  { name: "Orange", gradient: "linear-gradient(135deg, #f7971e, #ffd200)" },
  { name: "Green", gradient: "linear-gradient(135deg, #11998e, #38ef7d)" },
  { name: "Red", gradient: "linear-gradient(135deg, #eb3349, #f45c43)" },
  { name: "Cyan", gradient: "linear-gradient(135deg, #00d2ff, #3a7bd5)" },
  { name: "Indigo", gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
];

interface NotebookLayoutProps {
  teamId: string;
  teamName: string;
  teamLogo?: string | null;
}

// File type configuration with colors and icons
const getFileTypeConfig = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  
  const configs: Record<string, { icon: typeof FileText; color: string; bgColor: string; label: string }> = {
    // Documents
    doc: { icon: FileText, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40", label: "DOC" },
    docx: { icon: FileText, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40", label: "DOCX" },
    txt: { icon: FileText, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800/40", label: "TXT" },
    md: { icon: FileText, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800/40", label: "MD" },
    rtf: { icon: FileText, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40", label: "RTF" },
    pdf: { icon: FileText, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/40", label: "PDF" },
    
    // Spreadsheets
    xls: { icon: FileSpreadsheet, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", label: "XLS" },
    xlsx: { icon: FileSpreadsheet, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", label: "XLSX" },
    csv: { icon: FileSpreadsheet, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", label: "CSV" },
    
    // Presentations
    ppt: { icon: Presentation, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/40", label: "PPT" },
    pptx: { icon: Presentation, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/40", label: "PPTX" },
    
    // Images
    png: { icon: FileImage, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40", label: "PNG" },
    jpg: { icon: FileImage, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40", label: "JPG" },
    jpeg: { icon: FileImage, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40", label: "JPEG" },
    gif: { icon: FileImage, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40", label: "GIF" },
    svg: { icon: FileImage, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40", label: "SVG" },
    webp: { icon: FileImage, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40", label: "WEBP" },
    
    // Code
    js: { icon: FileCode, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/40", label: "JS" },
    ts: { icon: FileCode, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40", label: "TS" },
    tsx: { icon: FileCode, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40", label: "TSX" },
    jsx: { icon: FileCode, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/40", label: "JSX" },
    json: { icon: FileCode, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800/40", label: "JSON" },
    html: { icon: FileCode, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/40", label: "HTML" },
    css: { icon: FileCode, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40", label: "CSS" },
    py: { icon: FileCode, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/40", label: "PY" },
    
    // Archives
    zip: { icon: FileArchive, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40", label: "ZIP" },
    rar: { icon: FileArchive, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40", label: "RAR" },
    "7z": { icon: FileArchive, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40", label: "7Z" },
    
    // Audio
    mp3: { icon: FileAudio2, color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/40", label: "MP3" },
    wav: { icon: FileAudio2, color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/40", label: "WAV" },
    m4a: { icon: FileAudio2, color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/40", label: "M4A" },
    
    // Video
    mp4: { icon: FileVideo2, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", label: "MP4" },
    mov: { icon: FileVideo2, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", label: "MOV" },
    mkv: { icon: FileVideo2, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", label: "MKV" },
    webm: { icon: FileVideo2, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", label: "WEBM" },
  };
  
  return configs[ext] || { icon: FileIcon, color: "text-muted-foreground", bgColor: "bg-muted", label: ext.toUpperCase() || "FILE" };
};

export function NotebookLayout({
  teamId,
  teamName,
  teamLogo,
}: NotebookLayoutProps) {
  // Load layout preferences from localStorage
  const loadLayoutPreferences = (): {
    leftPanelOpen: boolean;
    rightPanelOpen: boolean;
    filesExpanded: boolean;
    filesViewMode: "grid" | "list";
  } => {
    if (typeof window === 'undefined') {
      return {
        leftPanelOpen: true,
        rightPanelOpen: false,
        filesExpanded: false,
        filesViewMode: "list",
      };
    }
    try {
      const saved = localStorage.getItem('notebookLayoutPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        return {
          leftPanelOpen: preferences.leftPanelOpen ?? true,
          rightPanelOpen: preferences.rightPanelOpen ?? false,
          filesExpanded: preferences.filesExpanded ?? false,
          filesViewMode: (preferences.filesViewMode ?? "list") as "grid" | "list",
        };
      }
    } catch (error) {
      console.error('Error loading layout preferences:', error);
    }
    return {
      leftPanelOpen: true,
      rightPanelOpen: false,
      filesExpanded: false,
      filesViewMode: "list",
    };
  };

  // Load preferences once - all useState calls happen in the same render
  // const initialPrefs = loadLayoutPreferences();

  // Panel states - removed
  // const [leftPanelOpen, setLeftPanelOpen] = useState(initialPrefs.leftPanelOpen);
  // const [rightPanelOpen, setRightPanelOpen] = useState(initialPrefs.rightPanelOpen);
  
  // Expanded files view (full width) - always true effectively for the main view
  // const [filesExpanded, setFilesExpanded] = useState(initialPrefs.filesExpanded);
  
  // Keep view mode preference
  const [filesViewMode, setFilesViewMode] = useState<"grid" | "list">("grid");

  // Save layout preferences to localStorage whenever they change
  useEffect(() => {
    try {
      const preferences = {
        filesViewMode,
      };
      localStorage.setItem('notebookLayoutPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving layout preferences:', error);
    }
  }, [filesViewMode]);

  // File selection
  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null);

  // Session management
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState({
    code: "en",
    name: "English",
    flag: "🇺🇸",
  });

  // Folder expansion state for animated folder view
  const [expandedFolder, setExpandedFolder] = useState<{
    id: string;
    rect: DOMRect;
    name: string;
    gradient: string;
    files: Document[];
    folderPath?: string;
    filePaths?: Record<string, string>;
    subfolders?: DriveItem[];
  } | null>(null);
  
  // Folder modal view mode
  const [folderViewMode, setFolderViewMode] = useState<"grid" | "list">("grid");
  
  // Navigation history for folder browser
  const [folderHistory, setFolderHistory] = useState<Array<{
    id: string;
    name: string;
    folderPath?: string;
    files: Document[];
    filePaths?: Record<string, string>;
    subfolders?: DriveItem[];
    gradient: string;
  }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // New folder dialog state
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedGradient, setSelectedGradient] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Subfolder delete state
  const [deletingSubfolder, setDeletingSubfolder] = useState<{ id: string; name: string; path: string } | null>(null);
  const [isDeletingSubfolder, setIsDeletingSubfolder] = useState(false);
  
  // Ref for accessing NotebookFolderView refresh functions
  const folderViewRef = useRef<NotebookFolderViewRef>(null);
  
  // Preview gradient for folder creation
  const previewGradient = selectedGradient || "linear-gradient(135deg, #667eea, #764ba2)";

  // Refs
  const chatRef = useRef<NotebookChatRef>(null);
  const folderRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle file selection
  const handleFileSelect = useCallback((file: DriveItem | null) => {
    setSelectedFile(file);
    // Close expanded folder when file is selected
    if (file) {
      setExpandedFolder(null);
    }
  }, []);

  // Handle new session
  const handleNewSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setSelectedFile(null);
  }, []);

  // Handle session selection
  const handleSelectSession = useCallback((id: string) => {
    setSessionId(id);
    setSelectedFile(null);
  }, []);

  // Handle folder click for expanded view
  const handleFolderClick = useCallback(
    (
      folderId: string,
      rect: DOMRect,
      folderName: string,
      gradient: string,
      files: Document[],
      folderPath?: string,
      filePaths?: Record<string, string>,
      subfolders?: DriveItem[]
    ) => {
      const folderState = {
        id: folderId,
        name: folderName,
        gradient,
        files,
        folderPath,
        filePaths,
        subfolders,
      };
      
      setExpandedFolder({
        ...folderState,
        rect,
      });
      
      // Initialize history with this folder
      setFolderHistory([folderState]);
      setHistoryIndex(0);
    },
    []
  );
  
  // Handle subfolder click within expanded folder
  const handleSubfolderClick = useCallback(async (subfolder: DriveItem) => {
    if (!folderViewRef.current || !expandedFolder) return;
    
    // Refresh the subfolder's files
    const subfolderPath = subfolder.path || subfolder.name;
    await folderViewRef.current.refreshFolderFiles(subfolderPath);
    const files = folderViewRef.current.getFolderFiles(subfolderPath);
    const subSubfolders = folderViewRef.current.getSubfolders(subfolderPath);
    
    // Create file paths mapping
    const filePaths: Record<string, string> = {};
    files.forEach(file => {
      filePaths[file.id] = `${subfolderPath}/${file.title}`;
    });
    
    const newFolderState = {
      id: subfolder.id,
      name: subfolder.name,
      folderPath: subfolderPath,
      files,
      filePaths,
      subfolders: subSubfolders,
      gradient: expandedFolder.gradient,
    };
    
    // Update expanded folder to show the subfolder contents
    setExpandedFolder(prev => prev ? {
      ...prev,
      ...newFolderState,
    } : null);
    
    // Add to history (remove any forward history)
    setFolderHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newFolderState];
    });
    setHistoryIndex(prev => prev + 1);
  }, [expandedFolder, historyIndex]);
  
  // Handle subfolder delete
  const handleDeleteSubfolder = useCallback(async () => {
    if (!deletingSubfolder || !expandedFolder) return;
    
    setIsDeletingSubfolder(true);
    try {
      const params = new URLSearchParams({
        scope: 'private', // Subfolders are always in private context in NotebookLayout
        path: deletingSubfolder.path,
        isFolder: 'true',
      });
      const response = await fetch(`/api/storage/delete?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete folder');
      }

      // Refresh the folder view using the refresh callback
      if (folderViewRef.current && expandedFolder.folderPath) {
        await folderViewRef.current.refreshFolders();
        await folderViewRef.current.refreshFolderFiles(expandedFolder.folderPath);
        
        // Get updated subfolders and files
        const updatedSubfolders = folderViewRef.current.getSubfolders(expandedFolder.folderPath);
        const updatedFiles = folderViewRef.current.getFolderFiles(expandedFolder.folderPath);
        
        // Update file paths mapping
        const filePaths: Record<string, string> = {};
        updatedFiles.forEach(file => {
          filePaths[file.id] = `${expandedFolder.folderPath}/${file.title}`;
        });
        
        setExpandedFolder(prev => prev ? {
          ...prev,
          files: updatedFiles,
          filePaths,
          subfolders: updatedSubfolders,
        } : null);
      }
      
      setDeletingSubfolder(null);
    } catch (err) {
      console.error('Failed to delete subfolder:', err);
    } finally {
      setIsDeletingSubfolder(false);
    }
  }, [deletingSubfolder, expandedFolder]);
  
  // Navigate back in folder history
  const handleNavigateBack = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const prevFolder = folderHistory[historyIndex - 1];
    setExpandedFolder(prev => prev ? {
      ...prev,
      ...prevFolder,
    } : null);
    setHistoryIndex(prev => prev - 1);
  }, [folderHistory, historyIndex]);
  
  // Navigate forward in folder history
  const handleNavigateForward = useCallback(() => {
    if (historyIndex >= folderHistory.length - 1) return;
    
    const nextFolder = folderHistory[historyIndex + 1];
    setExpandedFolder(prev => prev ? {
      ...prev,
      ...nextFolder,
    } : null);
    setHistoryIndex(prev => prev + 1);
  }, [folderHistory, historyIndex]);
  
  // Navigate to specific path segment in breadcrumb
  const handleBreadcrumbClick = useCallback((targetIndex: number) => {
    if (targetIndex >= historyIndex || targetIndex < 0) return;
    
    const targetFolder = folderHistory[targetIndex];
    setExpandedFolder(prev => prev ? {
      ...prev,
      ...targetFolder,
    } : null);
    setHistoryIndex(targetIndex);
  }, [folderHistory, historyIndex]);
  
  // Get breadcrumb path segments
  const getBreadcrumbPath = useCallback(() => {
    if (!expandedFolder) return [];
    
    // Build path from history up to current index
    return folderHistory.slice(0, historyIndex + 1).map((folder, index) => ({
      name: folder.name,
      index,
      isCurrent: index === historyIndex,
    }));
  }, [expandedFolder, folderHistory, historyIndex]);
  
  // Check if can navigate
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < folderHistory.length - 1;
  
  // Close expanded folder and reset history (Navigate to Root)
  const handleCloseFolderView = useCallback(() => {
    setExpandedFolder(null);
    setFolderHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Handle document click from expanded folder
  const handleExpandedDocumentClick = useCallback(
    (document: Document) => {
      if (expandedFolder?.filePaths) {
        const path = expandedFolder.filePaths[document.id];
        if (path) {
          const file: DriveItem = {
            id: document.id,
            name: document.title,
            type: "file",
            path: path,
            provider: "supabase_storage",
          };
          handleFileSelect(file);
        }
      }
    },
    [expandedFolder, handleFileSelect]
  );

  // Handle new folder creation
  const handleCreateNewFolder = useCallback(async () => {
    if (!newFolderName.trim() || !expandedFolder) {
      return;
    }

    setIsCreatingFolder(true);
    try {
      // Get the current folder path - if folderPath exists, use it, otherwise use folder name
      // This creates the nested path: /ParentFolder/NewFolder
      const parentPath = expandedFolder.folderPath || expandedFolder.name;
      
      const response = await fetch('/api/storage/folder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'private',
          path: parentPath,
          folderName: newFolderName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      const { folderPath } = await response.json();

      // Save gradient metadata if a color was selected
      if (selectedGradient && folderPath) {
        try {
          const metadata = { gradient: selectedGradient };
          const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
          
          // The new folder path is parentPath/newFolderName
          const newFolderPath = `${parentPath}/${newFolderName.trim()}`;
          
          // Upload metadata file
          const metadataResponse = await fetch('/api/storage/upload/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: '.metadata.json',
              fileSize: metadataBlob.size,
              contentType: 'application/json',
              scope: 'private',
              path: newFolderPath,
            }),
          });

          if (metadataResponse.ok) {
            const { uploadUrl, token } = await metadataResponse.json();
            await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: metadataBlob,
            });
          }
        } catch (metadataError) {
          console.error('Failed to save folder metadata:', metadataError);
          // Don't fail folder creation if metadata save fails
        }
      }

      // Reset form and close dialog
      setNewFolderName("");
      setSelectedGradient("");
      setIsNewFolderDialogOpen(false);
      
      // Refresh the folder view to show the new folder
      if (folderViewRef.current) {
        await folderViewRef.current.refreshFolders();
        // Also refresh the current folder's files to get updated subfolders
        await folderViewRef.current.refreshFolderFiles(parentPath);
        
        // Update the expanded folder state to show the new subfolder
        const updatedSubfolders = folderViewRef.current.getSubfolders(parentPath);
        const updatedFiles = folderViewRef.current.getFolderFiles(parentPath);
        
        // Update file paths mapping
        const filePaths: Record<string, string> = {};
        updatedFiles.forEach(file => {
          filePaths[file.id] = `${parentPath}/${file.title}`;
        });
        
        setExpandedFolder(prev => prev ? {
          ...prev,
          files: updatedFiles,
          filePaths,
          subfolders: updatedSubfolders,
        } : null);
      }
      
    } catch (err) {
      console.error('Failed to create folder:', err);
      alert(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  }, [newFolderName, expandedFolder, selectedGradient]);

  // Initialize session on mount
  useEffect(() => {
    if (!sessionId) {
      setSessionId(crypto.randomUUID());
    }
  }, [sessionId]);

  // Resize State
  const [chatWidth, setChatWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        // Limit min/max width
        if (newWidth >= 300 && newWidth <= 800) {
          setChatWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      // Disable text selection while resizing
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <UploadProvider>
      {/* Sync current folder path to upload context */}
      <UploadPathSync folderPath={expandedFolder?.folderPath || null} />
      
      <div className="h-full w-full flex flex-col bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

        {/* Main Content: 2 Columns */}
        <div className="flex-1 flex overflow-hidden relative z-10">
          
          {/* Left Column: File Browser (Flexible Width) */}
          <div className="flex-1 flex flex-col min-w-0 bg-background/50 backdrop-blur-sm relative border-r border-border/40">
            {/* If inside a folder, show Breadcrumb Header & Folder Content */}
            {expandedFolder ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header (Breadcrumbs + Nav) */}
                <div className="h-14 px-4 flex items-center justify-between border-b border-border/30 bg-background/40 backdrop-blur-sm shrink-0 gap-3">
                    {/* Navigation Arrows */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={handleCloseFolderView} // Go to root
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        title="Go to Root"
                      >
                         <div className="p-1 rounded-md bg-primary/10 text-primary">
                            <FolderOpen className="w-4 h-4" />
                         </div>
                      </button>

                      <div className="w-px h-4 bg-border/40 mx-1" />

                      <button
                        onClick={handleNavigateBack}
                        disabled={!canGoBack}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          canGoBack 
                            ? "text-muted-foreground hover:text-foreground hover:bg-muted/60" 
                            : "text-muted-foreground/30 cursor-not-allowed"
                        )}
                        title="Back"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNavigateForward}
                        disabled={!canGoForward}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          canGoForward 
                            ? "text-muted-foreground hover:text-foreground hover:bg-muted/60" 
                            : "text-muted-foreground/30 cursor-not-allowed"
                        )}
                        title="Forward"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                     {/* Breadcrumb Navigation */}
                     <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-none px-2">
                          {getBreadcrumbPath().map((segment, idx) => (
                            <div key={segment.index} className="flex items-center gap-1 shrink-0">
                              {idx > 0 && (
                                <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                              )}
                              <button
                                onClick={() => !segment.isCurrent && handleBreadcrumbClick(segment.index)}
                                className={cn(
                                  "truncate max-w-[150px] transition-colors",
                                  segment.isCurrent 
                                    ? "text-foreground font-medium cursor-default" 
                                    : "text-muted-foreground hover:text-foreground cursor-pointer"
                                )}
                                disabled={segment.isCurrent}
                              >
                                {segment.name}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2">
                       <button 
                          onClick={() => setIsNewFolderDialogOpen(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          title="New Folder"
                        >
                          <FolderPlus className="w-4 h-4" />
                          <span className="hidden sm:inline">New Folder</span>
                        </button>
                        
                        <div className="w-px h-4 bg-border/40" />

                        <div className="flex items-center bg-muted/50 rounded-lg p-1">
                          <button 
                            onClick={() => setFolderViewMode("list")}
                            className={cn("p-1.5 rounded-md transition-all", folderViewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            title="List view"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setFolderViewMode("grid")}
                            className={cn("p-1.5 rounded-md transition-all", folderViewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            title="Grid view"
                          >
                            <Grid3X3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-background/30 p-2">
                  {expandedFolder.files.length === 0 && (!expandedFolder.subfolders || expandedFolder.subfolders.length === 0) ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-sm font-medium">This folder is empty</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Drop files here to upload
                        </p>
                      </div>
                    </div>
                  ) : folderViewMode === "grid" ? (
                    /* Grid View */
                    <div className="p-4 sm:p-5">
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
                        {/* Subfolders first */}
                        {expandedFolder.subfolders?.map((subfolder, index) => (
                          <ContextMenu key={subfolder.id}>
                            <ContextMenuTrigger asChild>
                              <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.015, duration: 0.15 }}
                                onClick={() => handleSubfolderClick(subfolder)}
                                className="group flex flex-col items-center text-center focus:outline-none rounded-lg p-2 hover:bg-muted/50 transition-colors"
                              >
                                {/* Folder Icon */}
                                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-2 group-hover:shadow-md transition-shadow">
                                  <Folder className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
                                </div>
                                
                                {/* Folder Name */}
                                <span className="text-[11px] leading-tight text-foreground/90 group-hover:text-foreground break-words w-full px-0.5 line-clamp-2">
                                  {subfolder.name}
                                </span>
                              </motion.button>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-48 p-1.5 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/50 shadow-xl">
                              <ContextMenuItem 
                                onClick={() => handleSubfolderClick(subfolder)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                              >
                                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">Open</span>
                              </ContextMenuItem>
                              <ContextMenuItem 
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                              >
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">Rename</span>
                              </ContextMenuItem>
                              <ContextMenuSeparator className="my-1.5 bg-border/50" />
                              <ContextMenuItem 
                                onClick={() => setDeletingSubfolder({ 
                                  id: subfolder.id, 
                                  name: subfolder.name, 
                                  path: subfolder.path || `${expandedFolder.folderPath}/${subfolder.name}` 
                                })}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-sm">Delete</span>
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                        
                        {/* Files after subfolders */}
                        {expandedFolder.files.map((file, index) => {
                          const fileConfig = getFileTypeConfig(file.title);
                          const IconComponent = fileConfig.icon;
                          const delayOffset = (expandedFolder.subfolders?.length || 0);
                          const isSelected = selectedFile?.id === file.id;
                          
                          return (
                            <ContextMenu key={file.id}>
                              <ContextMenuTrigger asChild>
                                <motion.button
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: (index + delayOffset) * 0.015, duration: 0.15 }}
                                  onClick={() => handleExpandedDocumentClick(file)}
                                  className={cn(
                                    "group flex flex-col items-center text-center focus:outline-none rounded-xl p-3 hover:bg-muted/50 transition-colors",
                                    isSelected && "bg-primary/10"
                                  )}
                                >
                                  {/* File Icon */}
                                  <div className="relative w-16 h-16 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-200">
                                      {file.image ? (
                                        <div className="w-12 h-12 relative">
                                          <Image 
                                            src={file.image} 
                                            alt={file.title}
                                            fill
                                            className="object-contain"
                                          />
                                        </div>
                                      ) : (
                                        <IconComponent className={cn(
                                          "w-10 h-10 transition-colors",
                                          isSelected ? "text-primary" : fileConfig.color
                                        )} />
                                      )}
                                  </div>
                                  
                                  {/* File Name */}
                                  <span className="text-xs font-medium text-center line-clamp-3 text-foreground/80 group-hover:text-foreground break-words w-full px-1 leading-tight">
                                    {file.title}
                                  </span>
                                </motion.button>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-48 p-1.5 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/50 shadow-xl">
                                <ContextMenuItem 
                                  onClick={() => handleExpandedDocumentClick(file)}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                                >
                                  <Eye className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">Open</span>
                                </ContextMenuItem>
                                <ContextMenuItem 
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                                >
                                  <Download className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">Download</span>
                                </ContextMenuItem>
                                <ContextMenuItem 
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                                >
                                  <Pencil className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">Rename</span>
                                </ContextMenuItem>
                                <ContextMenuSeparator className="my-1.5 bg-border/50" />
                                <ContextMenuItem 
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                                >
                                  <Bot className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">Ask AI about file</span>
                                </ContextMenuItem>
                                <ContextMenuSeparator className="my-1.5 bg-border/50" />
                                <ContextMenuItem 
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="text-sm">Delete</span>
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* List View */
                    <div className="p-2">
                      {/* List Header */}
                      <div className="grid grid-cols-[1fr_100px_120px] sm:grid-cols-[1fr_120px_140px] gap-2 px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide border-b border-border/30">
                        <span>Name</span>
                        <span className="text-right">Type</span>
                        <span className="text-right hidden sm:block">Modified</span>
                      </div>
                      
                      {/* List Items */}
                      <div className="divide-y divide-border/20">
                        {/* Subfolders first */}
                        {expandedFolder.subfolders?.map((subfolder, index) => (
                          <ContextMenu key={subfolder.id}>
                            <ContextMenuTrigger asChild>
                              <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02, duration: 0.15 }}
                                onClick={() => handleSubfolderClick(subfolder)}
                                className="w-full grid grid-cols-[1fr_100px_120px] sm:grid-cols-[1fr_120px_140px] gap-2 items-center px-3 py-2.5 hover:bg-muted/40 transition-colors text-left rounded-md group"
                              >
                                {/* Name with Icon */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900/40">
                                    <Folder className="w-4 h-4 text-blue-500" />
                                  </div>
                                  <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                    {subfolder.name}
                                  </span>
                                </div>
                                
                                {/* Type */}
                                <span className="text-xs text-muted-foreground text-right">
                                  Folder
                                </span>
                                
                                {/* Modified */}
                                <span className="text-xs text-muted-foreground text-right hidden sm:block">
                                  —
                                </span>
                              </motion.button>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-48 p-1.5 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/50 shadow-xl">
                              <ContextMenuItem 
                                onClick={() => handleSubfolderClick(subfolder)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                              >
                                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">Open</span>
                              </ContextMenuItem>
                              <ContextMenuItem 
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                              >
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">Rename</span>
                              </ContextMenuItem>
                              <ContextMenuSeparator className="my-1.5 bg-border/50" />
                              <ContextMenuItem 
                                onClick={() => setDeletingSubfolder({ 
                                  id: subfolder.id, 
                                  name: subfolder.name, 
                                  path: subfolder.path || `${expandedFolder.folderPath}/${subfolder.name}` 
                                })}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-sm">Delete</span>
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                        
                        {/* Files after subfolders */}
                        {expandedFolder.files.map((file, index) => {
                          const fileConfig = getFileTypeConfig(file.title);
                          const IconComponent = fileConfig.icon;
                          const delayOffset = (expandedFolder.subfolders?.length || 0);
                          
                          return (
                            <ContextMenu key={file.id}>
                              <ContextMenuTrigger asChild>
                                <motion.button
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: (index + delayOffset) * 0.02, duration: 0.15 }}
                                  onClick={() => handleExpandedDocumentClick(file)}
                                  className="w-full grid grid-cols-[1fr_100px_120px] sm:grid-cols-[1fr_120px_140px] gap-2 items-center px-3 py-2.5 hover:bg-muted/40 transition-colors text-left rounded-md group"
                                >
                                  {/* Name with Icon */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${fileConfig.bgColor}`}>
                                      <IconComponent className={`w-4 h-4 ${fileConfig.color}`} />
                                    </div>
                                    <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                      {file.title}
                                    </span>
                                  </div>
                                  
                                  {/* Type */}
                                  <span className="text-xs text-muted-foreground text-right">
                                    {fileConfig.label}
                                  </span>
                                  
                                  {/* Modified (placeholder) */}
                                  <span className="text-xs text-muted-foreground text-right hidden sm:block">
                                    —
                                  </span>
                                </motion.button>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-48 p-1.5 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/50 shadow-xl">
                                <ContextMenuItem 
                                  onClick={() => handleExpandedDocumentClick(file)}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                                >
                                  <Eye className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">Open</span>
                                </ContextMenuItem>
                                <ContextMenuItem 
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                                >
                                  <Download className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">Download</span>
                                </ContextMenuItem>
                                <ContextMenuItem 
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                                >
                                  <Pencil className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">Rename</span>
                                </ContextMenuItem>
                                <ContextMenuSeparator className="my-1.5 bg-border/50" />
                                <ContextMenuItem 
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent/80"
                                >
                                  <Bot className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">Ask AI about file</span>
                                </ContextMenuItem>
                                <ContextMenuSeparator className="my-1.5 bg-border/50" />
                                <ContextMenuItem 
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="text-sm">Delete</span>
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Bar */}
                <div className="h-6 bg-muted/40 dark:bg-muted/20 border-t border-border/30 flex items-center justify-center px-4 shrink-0">
                  <span className="text-[11px] text-muted-foreground">
                    {(expandedFolder.subfolders?.length || 0) + expandedFolder.files.length} {(expandedFolder.subfolders?.length || 0) + expandedFolder.files.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>
            ) : (
              /* Root View (NotebookFolderView) */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-14 px-4 flex items-center justify-between border-b border-border/30 bg-background/40 backdrop-blur-sm shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-foreground">
                        Files & Folders
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        Browse your workspace files
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/50 rounded-lg p-1">
                      <Button
                        variant={filesViewMode === "list" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setFilesViewMode("list")}
                        title="List view"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={filesViewMode === "grid" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setFilesViewMode("grid")}
                        title="Grid view"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* File Browser Content */}
                <div className="flex-1 overflow-hidden p-2">
                  <NotebookFolderView
                    ref={folderViewRef}
                    scope="private"
                    onFileSelect={(file) => {
                      handleFileSelect(file);
                    }}
                    selectedFileId={selectedFile?.id}
                    gridLayout={filesViewMode === "grid"}
                    onFolderClick={handleFolderClick}
                    folderRefs={folderRefs}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Resizer Handle */}
          <div
            className="w-1 hover:w-1.5 cursor-col-resize bg-transparent hover:bg-primary/20 active:bg-primary/40 transition-all z-50 flex items-center justify-center group"
            onMouseDown={startResizing}
          >
             <div className="w-0.5 h-8 bg-border/50 rounded-full group-hover:bg-primary/50 transition-colors" />
          </div>

          {/* Right Column: Chat (Resizable) */}
          <div 
            ref={sidebarRef}
            style={{ width: chatWidth }} 
            className="flex flex-col border-l border-border/40 bg-background/80 backdrop-blur-sm relative"
          >
            {/* Chat Header */}
            <header className="h-14 px-4 flex items-center justify-between border-b border-border/30 bg-background/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 relative">
                {teamLogo ? (
                  <Image
                    src={teamLogo}
                    alt={teamName}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center">
                    <Image src="/logo-icon.png" alt="Klever" width={28} height={28} className="w-7 h-7 rounded-lg object-cover p-0.5" />
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                    {teamName}
                  </h1>
                </div>
              </div>

              {/* Selected File Indicator */}
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 max-w-[140px]"
                >
                  <FileText className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[10px] font-medium text-primary truncate">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-0.5 rounded-full hover:bg-primary/20 transition-colors shrink-0"
                  >
                    <X className="w-2.5 h-2.5 text-primary" />
                  </button>
                </motion.div>
              )}
            </header>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <NotebookChat
                ref={chatRef}
                teamId={teamId}
                teamName={teamName}
                teamLogo={teamLogo}
                selectedFile={selectedFile}
                onDeselectFile={() => setSelectedFile(null)}
                language={language}
                sessionId={sessionId}
              />
            </div>
          </div>

        </div>

        {/* New Folder Modal */}
        {/* New Folder Modal */}
        <Modal open={isNewFolderDialogOpen} setOpen={setIsNewFolderDialogOpen}>
          <ModalBody className="sm:max-w-md">
            <ModalContent>
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold leading-none tracking-tight">Create New Folder</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Create a new folder{expandedFolder ? ` in "${expandedFolder.name}"` : ""}
                  </p>
                  {expandedFolder && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Path: /{expandedFolder.folderPath || expandedFolder.name}/{newFolderName || "..."}
                    </p>
                  )}
                </div>
                
                <div>
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isCreatingFolder && newFolderName.trim()) {
                        handleCreateNewFolder();
                      }
                    }}
                    autoFocus
                    disabled={isCreatingFolder}
                  />
                </div>

                {/* Color Picker */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Choose a color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {standardColors.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setSelectedGradient(color.gradient)}
                        className={cn(
                          "w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 active:scale-95",
                          selectedGradient === color.gradient
                            ? "border-foreground ring-2 ring-foreground/20 scale-110"
                            : "border-border hover:border-foreground/50"
                        )}
                        style={{ background: color.gradient }}
                        title={color.name}
                        disabled={isCreatingFolder}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {newFolderName.trim() && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Preview
                    </label>
                    <div className="flex justify-center p-4 bg-muted/30 rounded-lg border border-border">
                      <AnimatedFolder
                        title={newFolderName.trim() || "New Folder"}
                        documents={[]}
                        gradient={previewGradient}
                        size="compact"
                        className="pointer-events-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </ModalContent>
            <ModalFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNewFolderDialogOpen(false);
                  setNewFolderName("");
                  setSelectedGradient("");
                }}
                disabled={isCreatingFolder}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNewFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
              >
                {isCreatingFolder ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Folder'
                )}
              </Button>
            </ModalFooter>
          </ModalBody>
        </Modal>
        
        {/* Delete Subfolder Confirmation */}
        <AlertDialog open={!!deletingSubfolder} onOpenChange={(open) => !open && setDeletingSubfolder(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
                <div className="p-2 rounded-lg bg-red-500/15 dark:bg-red-500/20">
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                Delete Folder
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground pt-2">
                Are you sure you want to delete <span className="font-medium text-foreground">&ldquo;{deletingSubfolder?.name}&rdquo;</span>? 
                This will permanently delete the folder and all its contents.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel 
                className="mt-0"
                disabled={isDeletingSubfolder}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                disabled={isDeletingSubfolder}
                onClick={handleDeleteSubfolder}
              >
                {isDeletingSubfolder ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </UploadProvider>
  );
}
