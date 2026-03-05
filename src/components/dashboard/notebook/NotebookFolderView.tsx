"use client";

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { AnimatedFolder, type Document } from "@/components/ui/3d-folder";
import type { DriveItem } from "@/components/drive/types";
import { 
  Loader2, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  Copy,
  FolderPlus,
  Search,
  X,
  FolderOpen,
  Pencil,
  Palette,
  AlertTriangle,
  BrainCircuit,
  Share2,
  Shield,
} from "lucide-react";
import { normalizeFileName, cn } from "@/lib/utils";
import { useUpload } from "@/lib/upload-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "@/components/ui/animated-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog";
import { FileVisibilityMenu } from "@/components/ui/file-visibility-menu";

interface NotebookFolderViewProps {
  onFileSelect: (file: DriveItem | null) => void;
  selectedFileId?: string;
  scope?: "public" | "private";
  gridLayout?: boolean; // When true, displays folders in a 4-column grid
  onFolderClick?: (folderId: string, folderRect: DOMRect, folderName: string, gradient: string, files: Document[], folderPath?: string, filePaths?: Record<string, string>, subfolders?: DriveItem[]) => void;
  folderRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

// Ref type for external access to folder operations
export interface NotebookFolderViewRef {
  refreshFolders: () => Promise<void>;
  refreshFolderFiles: (folderPath: string) => Promise<Document[]>;
  getFolderFiles: (folderPath: string) => Document[];
  getSubfolders: (folderPath: string) => DriveItem[];
}

interface SupabaseStorageFile {
  id?: string;
  name: string;
  metadata?: {
    mimetype?: string;
    size?: number;
    path?: string;
  };
  created_at?: string;
  updated_at?: string;
}

// Get content type from file extension if file.type is empty
function getContentType(file: File): string {
  if (file.type) {
    return file.type;
  }
  
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'zip': 'application/zip',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// File type configuration with icons and colors
interface FileTypeConfig {
  icon: typeof FileText;
  color: string;
  bgColor: string;
  label: string;
  gradient: string;
  ring: string;
}

const DEFAULT_FILE_CONFIG: FileTypeConfig = {
  icon: File,
  color: 'text-muted-foreground',
  bgColor: 'bg-muted/50',
  label: 'FILE',
  gradient: 'from-slate-500/20 to-slate-600/10',
  ring: 'ring-slate-400/20',
};

function getFileTypeConfig(fileName: string): FileTypeConfig {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const configs: Record<string, FileTypeConfig> = {
    // Documents
    pdf:  { icon: FileText, color: 'text-red-500',     bgColor: 'bg-red-500/10',     label: 'PDF',  gradient: 'from-red-500/20 to-rose-600/10',       ring: 'ring-red-400/30' },
    doc:  { icon: FileText, color: 'text-blue-500',    bgColor: 'bg-blue-500/10',    label: 'DOC',  gradient: 'from-blue-500/20 to-indigo-600/10',    ring: 'ring-blue-400/30' },
    docx: { icon: FileText, color: 'text-blue-500',    bgColor: 'bg-blue-500/10',    label: 'DOCX', gradient: 'from-blue-500/20 to-indigo-600/10',    ring: 'ring-blue-400/30' },
    txt:  { icon: FileText, color: 'text-slate-500',   bgColor: 'bg-slate-500/10',   label: 'TXT',  gradient: 'from-slate-500/20 to-slate-600/10',    ring: 'ring-slate-400/20' },
    md:   { icon: FileText, color: 'text-slate-600',   bgColor: 'bg-slate-500/10',   label: 'MD',   gradient: 'from-slate-500/20 to-slate-600/10',    ring: 'ring-slate-400/20' },
    rtf:  { icon: FileText, color: 'text-blue-400',    bgColor: 'bg-blue-400/10',    label: 'RTF',  gradient: 'from-blue-400/20 to-blue-500/10',      ring: 'ring-blue-300/20' },
    // Spreadsheets
    xls:  { icon: FileText, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'XLS',  gradient: 'from-emerald-500/20 to-green-600/10',  ring: 'ring-emerald-400/30' },
    xlsx: { icon: FileText, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'XLSX', gradient: 'from-emerald-500/20 to-green-600/10',  ring: 'ring-emerald-400/30' },
    csv:  { icon: FileText, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', label: 'CSV',  gradient: 'from-emerald-400/20 to-green-500/10',  ring: 'ring-emerald-300/20' },
    // Presentations
    ppt:  { icon: FileText, color: 'text-orange-500',  bgColor: 'bg-orange-500/10',  label: 'PPT',  gradient: 'from-orange-500/20 to-amber-600/10',   ring: 'ring-orange-400/30' },
    pptx: { icon: FileText, color: 'text-orange-500',  bgColor: 'bg-orange-500/10',  label: 'PPTX', gradient: 'from-orange-500/20 to-amber-600/10',   ring: 'ring-orange-400/30' },
    // Images
    jpg:  { icon: FileImage, color: 'text-purple-500', bgColor: 'bg-purple-500/10',  label: 'JPG',  gradient: 'from-purple-500/20 to-violet-600/10',  ring: 'ring-purple-400/30' },
    jpeg: { icon: FileImage, color: 'text-purple-500', bgColor: 'bg-purple-500/10',  label: 'JPEG', gradient: 'from-purple-500/20 to-violet-600/10',  ring: 'ring-purple-400/30' },
    png:  { icon: FileImage, color: 'text-purple-500', bgColor: 'bg-purple-500/10',  label: 'PNG',  gradient: 'from-purple-500/20 to-violet-600/10',  ring: 'ring-purple-400/30' },
    gif:  { icon: FileImage, color: 'text-pink-500',   bgColor: 'bg-pink-500/10',    label: 'GIF',  gradient: 'from-pink-500/20 to-rose-600/10',      ring: 'ring-pink-400/30' },
    webp: { icon: FileImage, color: 'text-purple-400', bgColor: 'bg-purple-400/10',  label: 'WEBP', gradient: 'from-purple-400/20 to-violet-500/10',  ring: 'ring-purple-300/20' },
    svg:  { icon: FileImage, color: 'text-amber-500',  bgColor: 'bg-amber-500/10',   label: 'SVG',  gradient: 'from-amber-500/20 to-yellow-600/10',   ring: 'ring-amber-400/30' },
    ico:  { icon: FileImage, color: 'text-purple-300', bgColor: 'bg-purple-300/10',  label: 'ICO',  gradient: 'from-purple-300/20 to-violet-400/10',  ring: 'ring-purple-200/20' },
    // Video
    mp4:  { icon: FileVideo, color: 'text-rose-500',   bgColor: 'bg-rose-500/10',    label: 'MP4',  gradient: 'from-rose-500/20 to-red-600/10',       ring: 'ring-rose-400/30' },
    webm: { icon: FileVideo, color: 'text-rose-500',   bgColor: 'bg-rose-500/10',    label: 'WEBM', gradient: 'from-rose-500/20 to-red-600/10',       ring: 'ring-rose-400/30' },
    mov:  { icon: FileVideo, color: 'text-rose-400',   bgColor: 'bg-rose-400/10',    label: 'MOV',  gradient: 'from-rose-400/20 to-red-500/10',       ring: 'ring-rose-300/20' },
    avi:  { icon: FileVideo, color: 'text-rose-400',   bgColor: 'bg-rose-400/10',    label: 'AVI',  gradient: 'from-rose-400/20 to-red-500/10',       ring: 'ring-rose-300/20' },
    mkv:  { icon: FileVideo, color: 'text-rose-500',   bgColor: 'bg-rose-500/10',    label: 'MKV',  gradient: 'from-rose-500/20 to-red-600/10',       ring: 'ring-rose-400/30' },
    // Audio
    mp3:  { icon: FileAudio, color: 'text-cyan-500',   bgColor: 'bg-cyan-500/10',    label: 'MP3',  gradient: 'from-cyan-500/20 to-teal-600/10',      ring: 'ring-cyan-400/30' },
    wav:  { icon: FileAudio, color: 'text-cyan-500',   bgColor: 'bg-cyan-500/10',    label: 'WAV',  gradient: 'from-cyan-500/20 to-teal-600/10',      ring: 'ring-cyan-400/30' },
    ogg:  { icon: FileAudio, color: 'text-cyan-400',   bgColor: 'bg-cyan-400/10',    label: 'OGG',  gradient: 'from-cyan-400/20 to-teal-500/10',      ring: 'ring-cyan-300/20' },
    m4a:  { icon: FileAudio, color: 'text-cyan-500',   bgColor: 'bg-cyan-500/10',    label: 'M4A',  gradient: 'from-cyan-500/20 to-teal-600/10',      ring: 'ring-cyan-400/30' },
    flac: { icon: FileAudio, color: 'text-cyan-600',   bgColor: 'bg-cyan-600/10',    label: 'FLAC', gradient: 'from-cyan-600/20 to-teal-700/10',      ring: 'ring-cyan-500/20' },
    // Code/Web
    html: { icon: FileText, color: 'text-orange-500',  bgColor: 'bg-orange-500/10',  label: 'HTML', gradient: 'from-orange-500/20 to-amber-600/10',   ring: 'ring-orange-400/30' },
    css:  { icon: FileText, color: 'text-blue-500',    bgColor: 'bg-blue-500/10',    label: 'CSS',  gradient: 'from-blue-500/20 to-indigo-600/10',    ring: 'ring-blue-400/30' },
    js:   { icon: FileText, color: 'text-yellow-500',  bgColor: 'bg-yellow-500/10',  label: 'JS',   gradient: 'from-yellow-500/20 to-amber-600/10',   ring: 'ring-yellow-400/30' },
    ts:   { icon: FileText, color: 'text-blue-600',    bgColor: 'bg-blue-600/10',    label: 'TS',   gradient: 'from-blue-600/20 to-indigo-700/10',    ring: 'ring-blue-500/20' },
    json: { icon: FileText, color: 'text-amber-500',   bgColor: 'bg-amber-500/10',   label: 'JSON', gradient: 'from-amber-500/20 to-yellow-600/10',   ring: 'ring-amber-400/30' },
    xml:  { icon: FileText, color: 'text-orange-400',  bgColor: 'bg-orange-400/10',  label: 'XML',  gradient: 'from-orange-400/20 to-amber-500/10',   ring: 'ring-orange-300/20' },
    // Archives
    zip:  { icon: File, color: 'text-amber-600',       bgColor: 'bg-amber-600/10',   label: 'ZIP',  gradient: 'from-amber-600/20 to-yellow-700/10',   ring: 'ring-amber-500/20' },
    rar:  { icon: File, color: 'text-amber-600',       bgColor: 'bg-amber-600/10',   label: 'RAR',  gradient: 'from-amber-600/20 to-yellow-700/10',   ring: 'ring-amber-500/20' },
    '7z': { icon: File, color: 'text-amber-600',       bgColor: 'bg-amber-600/10',   label: '7Z',   gradient: 'from-amber-600/20 to-yellow-700/10',   ring: 'ring-amber-500/20' },
  };

  const c = configs[extension];
  if (c) return c;
  return { ...DEFAULT_FILE_CONFIG, label: extension.toUpperCase() || 'FILE' };
}

// Legacy function for compatibility
function getFileIcon(fileName: string) {
  return getFileTypeConfig(fileName).icon;
}

// Format file size
function formatFileSize(bytes?: string | number): string {
  if (!bytes) return '';
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// Generate gradient colors based on folder name
function generateGradient(folderName: string): string {
  const colors = [
    "linear-gradient(135deg, #e73827, #f85032)",
    "linear-gradient(to right, #f7b733, #fc4a1a)",
    "linear-gradient(135deg, #00c6ff, #0072ff)",
    "linear-gradient(to right, #414345, #232526)",
    "linear-gradient(135deg, #8e2de2, #4a00e0)",
    "linear-gradient(135deg, #f80759, #bc4e9c)",
    "linear-gradient(135deg, #667eea, #764ba2)",
    "linear-gradient(135deg, #f093fb, #f5576c)",
    "linear-gradient(135deg, #4facfe, #00f2fe)",
    "linear-gradient(135deg, #43e97b, #38f9d7)",
  ];
  
  let hash = 0;
  for (let i = 0; i < folderName.length; i++) {
    hash = folderName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get file preview image URL
async function getFilePreviewUrl(file: DriveItem, scope: "public" | "private"): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  
  // If it's an image, try to get the image URL
  if (imageExtensions.includes(extension)) {
    try {
      const response = await fetch(`/api/storage/download?scope=${scope}&path=${encodeURIComponent(file.path || file.name)}`);
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.error('Failed to load image preview:', err);
    }
  }
  
  // For PDF files, use a PDF icon
  if (extension === 'pdf') {
    return '/file-types/PDF (1).svg';
  }
  
  // For document files
  if (['doc', 'docx'].includes(extension)) {
    return '/file-types/DOC (1).png';
  }
  
  // For text files
  if (['txt', 'md', 'markdown'].includes(extension)) {
    return '/file-types/TXT (1).png';
  }
  
  // For audio files
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
    return '/file-types/MP3 (1).png';
  }
  
  // For web files
  if (['html', 'htm', 'css', 'js', 'json', 'xml'].includes(extension)) {
    return '/file-types/WEB (1).svg';
  }
  
  // Default placeholder
  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200";
}

// Transform DriveItem to Document
async function driveItemToDocument(file: DriveItem, scope: "public" | "private"): Promise<Document> {
  const image = await getFilePreviewUrl(file, scope);
  return {
    id: file.id,
    title: file.name,
    image: image,
  };
}

// Get static file icon path
function getStaticFileIcon(name: string): string | null {
  const extension = name.split('.').pop()?.toLowerCase() || '';
  
  if (extension === 'pdf') return '/file-types/PDF (1).svg';
  if (['doc', 'docx'].includes(extension)) return '/file-types/DOC (1).png';
  if (['txt', 'md', 'markdown'].includes(extension)) return '/file-types/TXT (1).png';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return '/file-types/MP3 (1).png';
  if (['html', 'htm', 'css', 'js', 'json', 'xml'].includes(extension)) return '/file-types/WEB (1).svg';
  return null;
}

export const NotebookFolderView = forwardRef<NotebookFolderViewRef, NotebookFolderViewProps>(function NotebookFolderView({ onFileSelect, selectedFileId, scope = "private", gridLayout = false, onFolderClick, folderRefs }, ref) {
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [rootFiles, setRootFiles] = useState<DriveItem[]>([]); // Files at root level
  const [folderFiles, setFolderFiles] = useState<Record<string, Document[]>>({});
  const [folderFileItems, setFolderFileItems] = useState<Record<string, DriveItem[]>>({});
  const [folderGradients, setFolderGradients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const [folderSubfolders, setFolderSubfolders] = useState<Record<string, DriveItem[]>>({}); // Track subfolders within folders
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState<string>("");
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Folder operations state
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<{ id: string; name: string; path: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<{ id: string; name: string; path: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // File operations state
  const [deletingFile, setDeletingFile] = useState<DriveItem | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  
  // File preview state
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null);
  
  const { addUpload, updateUpload, uploads } = useUpload();
  
  // Standard color gradients (6 colors)
  const standardColors = [
    { name: "Blue", gradient: "linear-gradient(135deg, #00c6ff, #0072ff)" },
    { name: "Purple", gradient: "linear-gradient(135deg, #8e2de2, #4a00e0)" },
    { name: "Pink", gradient: "linear-gradient(135deg, #f80759, #bc4e9c)" },
    { name: "Orange", gradient: "linear-gradient(135deg, #e73827, #f85032)" },
    { name: "Green", gradient: "linear-gradient(135deg, #43e97b, #38f9d7)" },
    { name: "Teal", gradient: "linear-gradient(135deg, #11998e, #38ef7d)" },
  ];
  
  // Default gradient if none selected
  const defaultGradient = "linear-gradient(135deg, #6b7280, #4b5563)";
  const previewGradient = selectedGradient || defaultGradient;
  
  // Filter uploads that are active (uploading or just completed)
  const activeUploads = uploads.filter(upload => 
    upload.status === 'uploading' || 
    (upload.status === 'success' && upload.progress === 100)
  );

  // Fetch root folders and files
  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/storage/list?scope=${scope}&path=`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch folders`);
      }

      const data = await response.json();
      const storageItems: DriveItem[] = (data.files || []).map((file: SupabaseStorageFile) => ({
        id: file.id || file.name,
        name: file.name,
        type: file.metadata ? 'file' : 'folder',
        size: file.metadata?.size ? String(file.metadata.size) : undefined,
        modifiedAt: file.updated_at ? new Date(file.updated_at).toLocaleDateString() : undefined,
        provider: 'supabase_storage',
        path: file.name,
        created_at: file.created_at,
        updated_at: file.updated_at,
        mimeType: file.metadata?.mimetype
      }));
      
      // Filter out system folders/files
      const filteredFolders = storageItems.filter(i => {
        const name = i.name.toLowerCase();
        return i.type === 'folder' && name !== "private" && name !== "public" && name !== ".keep" && name !== scope;
      });
      
      // Get root-level files (not in any folder)
      const filteredFiles = storageItems.filter(i => {
        const name = i.name.toLowerCase();
        return i.type === 'file' && name !== ".keep" && !name.startsWith('.');
      });

      setFolders(filteredFolders);
      setRootFiles(filteredFiles);
      
      // Fetch gradients for each folder from metadata
      const gradientPromises = filteredFolders.map(async (folder) => {
        try {
          const metadataPath = folder.path ? `${folder.path}/.metadata.json` : `${folder.name}/.metadata.json`;
          const response = await fetch(`/api/storage/download?scope=${scope}&path=${encodeURIComponent(metadataPath)}`);
          if (response.ok) {
            const blob = await response.blob();
            const text = await blob.text();
            const metadata = JSON.parse(text);
            if (metadata.gradient) {
              return { folderId: folder.id, gradient: metadata.gradient };
            }
          }
        } catch {
          // Metadata file doesn't exist, use default
        }
        return null;
      });
      
      const gradientResults = await Promise.all(gradientPromises);
      const gradients: Record<string, string> = {};
      gradientResults.forEach(result => {
        if (result) {
          gradients[result.folderId] = result.gradient;
        }
      });
      setFolderGradients(gradients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  // Fetch files for a specific folder
  const fetchFolderFiles = useCallback(async (folder: DriveItem, forceRefresh = false) => {
    if (folderFiles[folder.id] && !forceRefresh) {
      return; // Already loaded and not forcing refresh
    }

    setLoadingFolders(prev => new Set(prev).add(folder.id));

    try {
      const response = await fetch(`/api/storage/list?scope=${scope}&path=${encodeURIComponent(folder.path || folder.name)}`);
      const data = await response.json();
      
      const storageItems: DriveItem[] = (data.files || []).map((file: SupabaseStorageFile) => ({
        id: file.id || file.name,
        name: file.name,
        type: file.metadata ? 'file' : 'folder',
        size: file.metadata?.size ? String(file.metadata.size) : undefined,
        provider: 'supabase_storage',
        path: folder.path ? `${folder.path}/${file.name}` : file.name,
        updated_at: file.updated_at,
        mimeType: file.metadata?.mimetype
      }));

      // Filter out system files and keep files
      const files = storageItems.filter(i => 
        i.type === 'file' && 
        i.name !== ".keep" && 
        i.name !== ".metadata.json"
      );
      
      // Also get subfolders
      const subfolders = storageItems.filter(i => 
        i.type === 'folder' && 
        i.name !== ".keep"
      );
      
      // Transform to documents
      const documents = await Promise.all(
        files.map(file => driveItemToDocument(file, scope))
      );

      setFolderFiles(prev => ({
        ...prev,
        [folder.id]: documents
      }));

      setFolderFileItems(prev => ({
        ...prev,
        [folder.id]: files
      }));
      
      setFolderSubfolders(prev => ({
        ...prev,
        [folder.id]: subfolders
      }));
    } catch (err) {
      console.error("Failed to load folder contents", err);
      setFolderFiles(prev => ({
        ...prev,
        [folder.id]: []
      }));
      setFolderFileItems(prev => ({
        ...prev,
        [folder.id]: []
      }));
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev);
        next.delete(folder.id);
        return next;
      });
    }
  }, [scope, folderFiles]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Expose refresh functions via ref
  useImperativeHandle(ref, () => ({
    refreshFolders: fetchFolders,
    refreshFolderFiles: async (folderPath: string) => {
      // Find folder by path
      const folder = folders.find(f => f.path === folderPath || f.name === folderPath);
      if (folder) {
        await fetchFolderFiles(folder, true);
        return folderFiles[folder.id] || [];
      }
      // If folder not found, refresh all folders first
      await fetchFolders();
      return [];
    },
    getFolderFiles: (folderPath: string) => {
      const folder = folders.find(f => f.path === folderPath || f.name === folderPath);
      return folder ? (folderFiles[folder.id] || []) : [];
    },
    getSubfolders: (folderPath: string) => {
      const folder = folders.find(f => f.path === folderPath || f.name === folderPath);
      return folder ? (folderSubfolders[folder.id] || []) : [];
    },
  }), [fetchFolders, fetchFolderFiles, folders, folderFiles, folderSubfolders]);

  // Preload files for folders on mount
  useEffect(() => {
    folders.forEach(folder => {
      fetchFolderFiles(folder);
    });
  }, [folders, fetchFolderFiles]);

  const handleDocumentClick = useCallback((document: Document, folderId: string) => {
    // Find the original file from the folder
    const fileItems = folderFileItems[folderId] || [];
    const fileItem = fileItems.find(f => f.id === document.id);
    
    if (fileItem) {
      onFileSelect(fileItem);
    }
  }, [folderFileItems, onFileSelect]);

  const handleFolderDrop = useCallback(async (files: File[], folderPath: string) => {
    const uploadPromises = files.map(async (file) => {
      const normalizedFileName = normalizeFileName(file.name);
      const uploadId = addUpload(file);
      const contentType = getContentType(file);

      try {
        const response = await fetch('/api/storage/upload/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: normalizedFileName,
            fileSize: file.size,
            contentType: contentType,
            scope,
            path: folderPath,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to start upload');
        }
        const { uploadUrl, token, path: objectPath, bucketId } = await response.json();

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              updateUpload(uploadId, { progress: Math.round((e.loaded / e.total) * 100) });
            }
          });
          xhr.addEventListener('load', () => xhr.status >= 200 ? resolve() : reject(new Error('Upload failed')));
          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', contentType);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(file);
        });

        updateUpload(uploadId, { status: 'success', progress: 100 });
        
        // Call webhook for file ingestion
        if (objectPath && bucketId) {
          try {
            await fetch('/api/storage/upload/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                objectPath,
                bucketId,
                fileName: normalizedFileName,
                contentType,
                scope,
              }),
            });
          } catch (error) {
            console.error('Failed to trigger webhook:', error);
          }
        }
        
        // Refresh folder files after successful upload
        if (folderPath === "") {
          // If uploading to root, refresh the root folders list
          await fetchFolders();
        } else {
          // Find the folder and refresh its files
          const folder = folders.find(f => f.path === folderPath || f.name === folderPath);
          if (folder) {
            // Force refresh to get the newly uploaded file
            await fetchFolderFiles(folder, true);
          } else {
            // If folder not found, refresh folders list (might be a new folder)
            await fetchFolders();
          }
        }
      } catch (error) {
        updateUpload(uploadId, { 
          status: 'error', 
          progress: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
    
    await Promise.all(uploadPromises);
  }, [scope, folders, addUpload, updateUpload, fetchFolderFiles, fetchFolders]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/storage/folder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          path: '',
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
          
          // Upload metadata file
          const metadataResponse = await fetch('/api/storage/upload/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: '.metadata.json',
              fileSize: metadataBlob.size,
              contentType: 'application/json',
              scope,
              path: newFolderName.trim(),
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
      setIsCreateDialogOpen(false);
      
      // Refresh folders
      await fetchFolders();
    } catch (err) {
      console.error('Failed to create folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  }, [newFolderName, scope, fetchFolders, selectedGradient]);

  // Handle folder rename
  const handleRenameFolder = useCallback(async () => {
    if (!renamingFolder || !renameValue.trim() || renameValue.trim() === renamingFolder.name) {
      setRenamingFolder(null);
      setRenameValue("");
      return;
    }

    setIsRenaming(true);
    try {
      const response = await fetch('/api/storage/folder/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          oldPath: renamingFolder.path,
          newName: renameValue.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename folder');
      }

      setRenamingFolder(null);
      setRenameValue("");
      await fetchFolders();
    } catch (err) {
      console.error('Failed to rename folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename folder');
    } finally {
      setIsRenaming(false);
    }
  }, [renamingFolder, renameValue, scope, fetchFolders]);

  // Handle folder delete
  const handleDeleteFolder = useCallback(async () => {
    if (!deletingFolder) return;

    setIsDeleting(true);
    try {
      const params = new URLSearchParams({
        scope,
        path: deletingFolder.path,
        isFolder: 'true',
      });
      const response = await fetch(`/api/storage/delete?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete folder');
      }

      setDeletingFolder(null);
      await fetchFolders();
    } catch (err) {
      console.error('Failed to delete folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingFolder, scope, fetchFolders]);

  // Handle folder color change
  const handleFolderColorChange = useCallback(async (folderId: string, folderPath: string, gradient: string) => {
    try {
      // Update local state immediately for instant feedback
      setFolderGradients(prev => ({ ...prev, [folderId]: gradient }));
      
      // Save to metadata file
      const metadata = { gradient };
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      
      const response = await fetch('/api/storage/upload/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: '.metadata.json',
          fileSize: metadataBlob.size,
          contentType: 'application/json',
          scope,
          path: folderPath,
        }),
      });

      if (response.ok) {
        const { uploadUrl, token } = await response.json();
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: metadataBlob,
        });
      }
    } catch (err) {
      console.error('Failed to update folder color:', err);
      // Revert on error
      await fetchFolders();
    }
  }, [scope, fetchFolders]);

  // File action handlers
  const handleFileDownload = useCallback(async (file: DriveItem) => {
    try {
      const response = await fetch(`/api/storage/download?scope=${scope}&path=${encodeURIComponent(file.path || file.name)}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [scope]);

  const handleFileCopyPath = useCallback(async (file: DriveItem) => {
    try {
      const fullPath = `/${scope}/${file.path || file.name}`;
      await navigator.clipboard.writeText(fullPath);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [scope]);

  const handleFileDelete = useCallback(async (file: DriveItem) => {
    setIsDeletingFile(true);
    try {
      // 1. Delete from storage
      const response = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, path: file.path || file.name }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Delete failed');
      }
      
      // 2. Delete from documents table (for RAG index cleanup)
      try {
        await fetch('/api/documents/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fileName: file.name,
            filePath: file.path || file.name,
          }),
        });
      } catch (docErr) {
        console.warn('Could not delete document record:', docErr);
        // Don't fail the whole operation if document deletion fails
      }
      
      // 3. Refresh the UI
      setRootFiles(prev => prev.filter(f => f.id !== file.id));
      // Also remove from folder files if in a folder
      setFolderFileItems(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(folderId => {
          updated[folderId] = updated[folderId].filter(f => f.id !== file.id);
        });
        return updated;
      });
      setDeletingFile(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeletingFile(false);
    }
  }, [scope]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8 h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400/70 p-4 text-center bg-red-500/5 rounded-lg border border-red-500/10">
        {error}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <>
        <div className="h-full overflow-y-auto p-4 scrollbar-thin flex items-center justify-center">
          <div className="w-full max-w-[320px]">
            <div
              onClick={() => setIsCreateDialogOpen(true)}
              className="cursor-pointer flex justify-center"
            >
              <AnimatedFolder
                title="Create New Folder"
                documents={[]}
                gradient="linear-gradient(135deg, #6b7280, #4b5563)"
                className="opacity-80 hover:opacity-100 transition-opacity"
                size="compact"
              />
            </div>
          </div>
        </div>

        <Modal open={isCreateDialogOpen} setOpen={setIsCreateDialogOpen}>
          <ModalBody>
            <ModalContent>
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold leading-none tracking-tight">Create New Folder</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Enter a name for your new folder.
                  </p>
                </div>
                
                <div>
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isCreating) {
                        handleCreateFolder();
                      }
                    }}
                    autoFocus
                    disabled={isCreating}
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
                        disabled={isCreating}
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
            <ModalFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewFolderName("");
                  setSelectedGradient("");
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </ModalFooter>
          </ModalBody>
        </Modal>
      </>
    );
  }

  // File Item Component with better interactions
  const FileItem = ({ file, isGrid, searchQuery: query }: { file: DriveItem; isGrid: boolean; searchQuery?: string }) => {
    const fileConfig = getFileTypeConfig(file.name);
    const IconComponent = fileConfig.icon;
    const isSelected = selectedFileId === file.id;
    const isHovered = hoveredFileId === file.id;
    const staticIcon = getStaticFileIcon(file.name);

    const handleOpen = () => setPreviewFile(file);

    // Shared menu content for both dropdown and context menu
    const menuContent = (
      <>
        <DropdownMenuItem onClick={handleOpen}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleFileDownload(file)}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleFileCopyPath(file)}>
          <Copy className="w-4 h-4 mr-2" />
          Copy path
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Shield className="w-4 h-4 mr-2" />
            Access
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="p-0 rounded-xl w-auto">
              <FileVisibilityMenu fileName={file.name} />
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => onFileSelect(file)}>
          <BrainCircuit className="w-4 h-4 mr-2" />
          Ask AI
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-destructive focus:text-destructive"
          onClick={() => setDeletingFile(file)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </>
    );

    const contextMenuContent = (
      <>
        <ContextMenuItem onSelect={handleOpen}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => handleFileDownload(file)}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => handleFileCopyPath(file)}>
          <Copy className="w-4 h-4 mr-2" />
          Copy path
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Shield className="w-4 h-4 mr-2" />
            Access
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="p-0 rounded-xl w-auto">
            <FileVisibilityMenu fileName={file.name} />
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onSelect={() => onFileSelect(file)}>
          <BrainCircuit className="w-4 h-4 mr-2" />
          Ask AI about this file
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          className="text-red-600 dark:text-red-400 focus:bg-red-500/10"
          onSelect={() => setDeletingFile(file)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </>
    );
    
    if (isGrid) {
      return (
        <ContextMenu>
          <ContextMenuTrigger
            onMouseEnter={() => setHoveredFileId(file.id)}
            onMouseLeave={() => setHoveredFileId(null)}
            onClick={handleOpen}
            className={cn(
              "group relative flex flex-col items-center gap-2.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-300",
              "border border-transparent",
              "hover:bg-gradient-to-b hover:from-muted/60 hover:to-muted/20 hover:border-border/40 hover:shadow-lg hover:shadow-black/5",
              isSelected && "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-md shadow-primary/5"
            )}
          >
            {/* Futuristic file icon container */}
            <div className={cn(
              "relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
              "bg-gradient-to-br",
              fileConfig.gradient,
              "ring-1",
              fileConfig.ring,
              "group-hover:scale-110 group-hover:shadow-md",
              isSelected && "ring-2 ring-primary/40 shadow-lg"
            )}>
              {staticIcon ? (
                <img src={staticIcon} alt={file.name} className="w-8 h-8 object-contain drop-shadow-sm" />
              ) : (
                <IconComponent className={cn("w-7 h-7 drop-shadow-sm transition-colors", isSelected ? "text-primary" : fileConfig.color)} />
              )}
              {/* File type badge */}
              <span className={cn(
                "absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border shadow-sm",
                "bg-background/90 backdrop-blur-sm border-border/50",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {fileConfig.label}
              </span>
            </div>

            {/* File Name */}
            <span className="text-[11px] font-medium text-center text-foreground/80 group-hover:text-foreground w-full break-words line-clamp-2 px-0.5 leading-snug mt-0.5">
              {query ? highlightMatch(file.name, query) : file.name}
            </span>

            {/* Actions on hover */}
            <div
              className={cn(
                "absolute top-1.5 right-1.5 transition-all duration-150",
                isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
              )}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            >
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full shadow-sm border border-border/40">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  {menuContent}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48 rounded-xl z-[100]">
            {contextMenuContent}
          </ContextMenuContent>
        </ContextMenu>
      );
    }
    
    // List view
    return (
      <ContextMenu>
        <ContextMenuTrigger
          onClick={handleOpen}
          onMouseEnter={() => setHoveredFileId(file.id)}
          onMouseLeave={() => setHoveredFileId(null)}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300",
            isSelected 
              ? "bg-primary/5 border border-primary/20 ring-1 ring-primary/10 shadow-sm" 
              : "hover:bg-muted/40 border border-transparent hover:border-border/30"
          )}
        >
          {/* File Icon */}
          <div 
            className={cn(
              "relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
              "bg-gradient-to-br ring-1",
              fileConfig.gradient,
              fileConfig.ring,
              "group-hover:scale-105 group-hover:shadow-sm",
              isSelected && "ring-2 ring-primary/30"
            )}
          >
            <IconComponent className={cn(
              "w-5 h-5 drop-shadow-sm transition-colors",
              isSelected ? "text-primary" : fileConfig.color
            )} />
          </div>
          
          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate transition-colors",
              isSelected ? "text-primary" : "text-foreground/90 group-hover:text-foreground"
            )}>
              {query ? highlightMatch(file.name, query) : file.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-md border",
                isSelected
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted/80 text-muted-foreground border-border/50"
              )}>
                {fileConfig.label}
              </span>
              {file.size && (
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
              )}
            </div>
          </div>
          
          {/* Actions - visibility controlled by CSS with pointer-events */}
          <div
            className={cn(
              "flex items-center gap-1 transition-all duration-150",
              isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                handleFileDownload(file);
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {menuContent}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 rounded-xl z-[100]">
          {contextMenuContent}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  // Filter folders and files based on search query
  const normalizedQuery = searchQuery.toLowerCase().trim();
  
  const filteredFolders = normalizedQuery
    ? folders.filter(folder => folder.name.toLowerCase().includes(normalizedQuery))
    : folders;
  
  const filteredRootFiles = normalizedQuery
    ? rootFiles.filter(file => file.name.toLowerCase().includes(normalizedQuery))
    : rootFiles;
  
  // Also search files within folders
  const matchingFilesInFolders = normalizedQuery
    ? folders.flatMap(folder => {
        const files = folderFileItems[folder.id] || [];
        return files
          .filter(file => file.name.toLowerCase().includes(normalizedQuery))
          .map(file => ({ ...file, folderName: folder.name, folderId: folder.id }));
      })
    : [];
  
  const hasSearchResults = filteredFolders.length > 0 || filteredRootFiles.length > 0 || matchingFilesInFolders.length > 0;
  const isSearching = normalizedQuery.length > 0;
  const totalResults = filteredFolders.length + filteredRootFiles.length + matchingFilesInFolders.length;

  // Highlight matching text helper
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-primary/30 text-primary rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 scrollbar-thin relative">
      {/* Search Input */}
      <div className="mb-4 sticky top-0 z-20 bg-background/80 backdrop-blur-sm -mx-4 px-4 py-2 -mt-4">
        <div className={cn(
          "relative transition-all duration-200",
          isSearchFocused && "scale-[1.02]"
        )}>
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
            isSearchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              "pl-9 pr-9 h-10 bg-muted/30 border-border/50 rounded-xl transition-all",
              "focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/20",
              isSearchFocused && "shadow-lg"
            )}
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        
        {/* Search Results Count */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden"
            >
              <p className="text-xs text-muted-foreground">
                {hasSearchResults 
                  ? `Found ${totalResults} ${totalResults === 1 ? 'result' : 'results'} for "${searchQuery}"`
                  : `No results for "${searchQuery}"`
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Indicator */}
      <AnimatePresence>
        {activeUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-14 z-10 mb-4"
          >
            <div className="bg-card border border-border rounded-xl shadow-lg p-3 space-y-2 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4 text-primary animate-pulse" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Uploading {activeUploads.length} {activeUploads.length === 1 ? 'file' : 'files'}
                </p>
              </div>
              {activeUploads.map((upload) => (
                <motion.div
                  key={upload.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {upload.status === 'uploading' && (
                        <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />
                      )}
                      {upload.status === 'success' && (
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                      )}
                      {upload.status === 'error' && (
                        <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                      )}
                      <span className="text-xs text-foreground truncate flex-1">
                        {upload.fileName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
                      {upload.progress}%
                    </span>
                  </div>
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="h-1.5" />
                  )}
                  {upload.status === 'success' && (
                    <div className="h-1.5 w-full bg-green-500/20 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                  )}
                  {upload.status === 'error' && (
                    <p className="text-xs text-destructive">{upload.error || 'Upload failed'}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Create New Folder Button - Hide during search */}
      {!isSearching && (
        gridLayout ? (
          <div className="mb-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <FolderPlus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Create New Folder
              </span>
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-full mb-4 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="w-8 h-8 rounded-lg bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <FolderPlus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              New Folder
            </span>
          </motion.button>
        )
      )}
      
      {/* No Search Results */}
      {isSearching && !hasSearchResults && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">No results found</h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Try searching with different keywords or check the spelling
          </p>
        </motion.div>
      )}

      {/* Folders Section */}
      {filteredFolders.length > 0 && (
        <div className="mb-6">
          {!gridLayout && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Folders
              </span>
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground">{filteredFolders.length}</span>
            </div>
          )}
          <div className={gridLayout ? "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4" : "space-y-2"}>
            {filteredFolders.map((folder) => {
              const files = folderFiles[folder.id] || [];
              const isLoading = loadingFolders.has(folder.id);
              const isHovered = hoveredFolderId === folder.id;
              const folderGradient = folderGradients[folder.id] || generateGradient(folder.name);
              
              const handleFolderOpen = (e?: React.MouseEvent) => {
                if (onFolderClick) {
                  // Try to get rect from ref first, then fallback to event target
                  let rect: DOMRect;
                  if (folderRefs?.current[folder.id]) {
                    rect = folderRefs.current[folder.id]!.getBoundingClientRect();
                  } else if (e?.currentTarget) {
                    rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  } else {
                    // Last resort: create a default rect
                    rect = new DOMRect(0, 0, 0, 0);
                  }
                  
                  const filePathsMap: Record<string, string> = {};
                  const fileItems = folderFileItems[folder.id] || [];
                  fileItems.forEach(file => {
                    filePathsMap[file.id] = file.path || `${folder.path || folder.name}/${file.name}`;
                  });
                  const subfolders = folderSubfolders[folder.id] || [];
                  onFolderClick(folder.id, rect, folder.name, folderGradient, files, folder.path || folder.name, filePathsMap, subfolders);
                }
              };
              
              // Color picker content for menus
              const ColorPickerContent = ({ isContext = false }: { isContext?: boolean }) => {
                const SubComponent = isContext ? ContextMenuSubContent : DropdownMenuSubContent;
                return (
                  <SubComponent className="p-3 bg-popover/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
                      Select color
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {standardColors.map((color, index) => (
                        <motion.button
                          key={color.name}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03, duration: 0.15 }}
                          whileHover={{ scale: 1.15, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleFolderColorChange(folder.id, folder.path || folder.name, color.gradient)}
                          className={cn(
                            "w-9 h-9 rounded-xl border-2 transition-all duration-200 shadow-sm",
                            folderGradient === color.gradient
                              ? "border-foreground ring-2 ring-foreground/20 shadow-md"
                              : "border-white/20 dark:border-white/10 hover:border-white/40"
                          )}
                          style={{ background: color.gradient }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </SubComponent>
                );
              };
              
              return (
                <motion.div 
                  key={folder.id} 
                  ref={(el) => { 
                    if (folderRefs && el) {
                      folderRefs.current[folder.id] = el;
                    }
                  }}
                  initial={isSearching ? { opacity: 0, scale: 0.95 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  onHoverStart={() => setHoveredFolderId(folder.id)}
                  onHoverEnd={() => setHoveredFolderId(null)}
                >
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <motion.div 
                        ref={(el) => {
                          // Set ref on the clickable element as fallback if outer ref wasn't set
                          if (folderRefs && el) {
                            // Only set if not already set by outer div
                            const outerRef = folderRefs.current[folder.id];
                            if (!outerRef || !outerRef.isConnected) {
                              folderRefs.current[folder.id] = el;
                            }
                          }
                        }}
                        whileHover={{ scale: gridLayout ? 1.02 : 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="cursor-pointer relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFolderOpen(e);
                        }}
                      >
                        {gridLayout ? (
                          <AnimatedFolder
                            title={folder.name}
                            documents={files.length > 0 ? files : []}
                            gradient={folderGradient}
                            onDocumentClick={(document) => handleDocumentClick(document, folder.id)}
                            size="compact"
                            onDrop={(files) => handleFolderDrop(files, folder.path || folder.name)}
                          />
                        ) : (
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                            <div 
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: folderGradient }}
                            >
                              <FolderOpen className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground">
                                {isSearching ? highlightMatch(folder.name, normalizedQuery) : folder.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {files.length} {files.length === 1 ? 'file' : 'files'}
                              </p>
                            </div>
                            
                            {/* Loading indicator or menu button */}
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" />
                            ) : (
                              <AnimatePresence>
                                {(isHovered || folderMenuOpen === folder.id) && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <DropdownMenu 
                                      open={folderMenuOpen === folder.id} 
                                      onOpenChange={(open) => setFolderMenuOpen(open ? folder.id : null)}
                                      modal={false}
                                    >
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7 hover:bg-background/80"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent 
                                        align="end" 
                                        sideOffset={8}
                                        className={cn(
                                          "w-48 p-1.5 rounded-xl",
                                          "bg-popover/95 backdrop-blur-xl",
                                          "border border-border/50 shadow-xl shadow-black/10 dark:shadow-black/30",
                                          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
                                          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                                        )}
                                      >
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            setRenamingFolder({ id: folder.id, name: folder.name, path: folder.path || folder.name });
                                            setRenameValue(folder.name);
                                            setFolderMenuOpen(null);
                                          }}
                                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 hover:bg-accent/80 focus:bg-accent/80 group"
                                        >
                                          <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                                            <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                          </div>
                                          <span className="text-sm font-medium">Rename</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSub>
                                          <DropdownMenuSubTrigger className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 hover:bg-accent/80 focus:bg-accent/80 group">
                                            <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                                              <Palette className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <span className="text-sm font-medium">Change color</span>
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuPortal>
                                            <ColorPickerContent />
                                          </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                        <DropdownMenuSeparator className="my-1.5 bg-border/50" />
                                        <DropdownMenuItem 
                                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 bg-red-500/5 hover:bg-red-500/15 focus:bg-red-500/15 dark:bg-red-500/10 dark:hover:bg-red-500/20 group border border-transparent hover:border-red-500/20"
                                          onClick={() => {
                                            setDeletingFolder({ id: folder.id, name: folder.name, path: folder.path || folder.name });
                                            setFolderMenuOpen(null);
                                          }}
                                        >
                                          <div className="p-1.5 rounded-md bg-red-500/15 group-hover:bg-red-500/25 dark:bg-red-500/20 dark:group-hover:bg-red-500/30 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                          </div>
                                          <span className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">Delete</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </ContextMenuTrigger>
                    
                    {/* Right-click context menu */}
                    <ContextMenuContent 
                      className={cn(
                        "w-48 p-1.5 rounded-xl",
                        "bg-popover/95 backdrop-blur-xl",
                        "border border-border/50 shadow-xl shadow-black/10 dark:shadow-black/30",
                        "animate-in fade-in-0 zoom-in-95"
                      )}
                    >
                      <ContextMenuItem 
                        onClick={() => {
                          setRenamingFolder({ id: folder.id, name: folder.name, path: folder.path || folder.name });
                          setRenameValue(folder.name);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 hover:bg-accent/80 focus:bg-accent/80 group"
                      >
                        <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-sm font-medium">Rename</span>
                      </ContextMenuItem>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 hover:bg-accent/80 focus:bg-accent/80 group">
                          <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                            <Palette className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <span className="text-sm font-medium">Change color</span>
                        </ContextMenuSubTrigger>
                        <ColorPickerContent isContext={true} />
                      </ContextMenuSub>
                      <ContextMenuSeparator className="my-1.5 bg-border/50" />
                      <ContextMenuItem 
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 bg-red-500/5 hover:bg-red-500/15 focus:bg-red-500/15 dark:bg-red-500/10 dark:hover:bg-red-500/20 group border border-transparent hover:border-red-500/20"
                        onClick={() => setDeletingFolder({ id: folder.id, name: folder.name, path: folder.path || folder.name })}
                      >
                        <div className="p-1.5 rounded-md bg-red-500/15 group-hover:bg-red-500/25 dark:bg-red-500/20 dark:group-hover:bg-red-500/30 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">Delete</span>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Files Found in Folders (Search Results) */}
      {isSearching && matchingFilesInFolders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Files in Folders
            </span>
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs text-muted-foreground">{matchingFilesInFolders.length}</span>
          </div>
          <div className={gridLayout ? "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4" : "space-y-1"}>
            {matchingFilesInFolders.map((file) => {
              const IconComponent = getFileIcon(file.name);
              const isSelected = selectedFileId === file.id;
              
              return (
                <motion.div
                  key={`${file.folderId}-${file.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 4 }}
                  onClick={() => onFileSelect(file)}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
                    isSelected 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-primary/20" : "bg-muted/70 group-hover:bg-primary/10"
                  )}>
                    <IconComponent className={cn(
                      "w-4.5 h-4.5 transition-colors",
                      isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate transition-colors",
                      isSelected ? "text-primary" : "text-foreground/90 group-hover:text-foreground"
                    )}>
                      {highlightMatch(file.name, normalizedQuery)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" />
                      {file.folderName}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Root Files Section */}
      {filteredRootFiles.length > 0 && (
        <div>
          {!gridLayout && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Files
              </span>
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground">{filteredRootFiles.length}</span>
            </div>
          )}
          <div className={gridLayout ? "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4" : "space-y-1"}>
            {filteredRootFiles.map((file) => (
              <FileItem key={file.id} file={file} isGrid={gridLayout} searchQuery={normalizedQuery} />
            ))}
          </div>
        </div>
      )}

      <Modal open={isCreateDialogOpen} setOpen={setIsCreateDialogOpen}>
        <ModalBody>
          <ModalContent>
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold leading-none tracking-tight">Create New Folder</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Enter a name and choose a color for your folder.
                </p>
              </div>
              
              {/* Folder Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Folder name
                </label>
                <Input
                  placeholder="Enter folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreating && newFolderName.trim()) {
                      handleCreateFolder();
                    }
                  }}
                  autoFocus
                  disabled={isCreating}
                />
              </div>

              {/* Color Picker */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Choose a color
                </label>
                <div className="flex flex-wrap gap-2">
                  {standardColors.map((color) => (
                    <motion.button
                      key={color.name}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedGradient(color.gradient)}
                      className={cn(
                        "w-10 h-10 rounded-xl border-2 transition-all duration-200",
                        selectedGradient === color.gradient
                          ? "border-foreground ring-2 ring-foreground/20 scale-110"
                          : "border-border/50 hover:border-foreground/50"
                      )}
                      style={{ background: color.gradient }}
                      title={color.name}
                      disabled={isCreating}
                    />
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              <AnimatePresence>
                {newFolderName.trim() && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-sm font-medium text-foreground">
                      Preview
                    </label>
                    <div className="flex justify-center p-4 bg-muted/30 rounded-xl border border-border/50">
                      <AnimatedFolder
                        title={newFolderName.trim()}
                        documents={[]}
                        gradient={previewGradient}
                        size="compact"
                        className="pointer-events-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewFolderName("");
                setSelectedGradient("");
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </ModalFooter>
        </ModalBody>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal open={!!renamingFolder} setOpen={(open) => !open && setRenamingFolder(null)}>
        <ModalBody>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold leading-none tracking-tight">Rename Folder</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Enter a new name for &ldquo;{renamingFolder?.name}&rdquo;
                </p>
              </div>
              <div>
                <Input
                  placeholder="New folder name..."
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isRenaming && renameValue.trim()) {
                      handleRenameFolder();
                    }
                  }}
                  autoFocus
                  disabled={isRenaming}
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenamingFolder(null);
                setRenameValue("");
              }}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameFolder}
              disabled={!renameValue.trim() || renameValue === renamingFolder?.name || isRenaming}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </Button>
          </ModalFooter>
        </ModalBody>
      </Modal>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!deletingFolder} onOpenChange={(open) => !open && setDeletingFolder(null)}>
        <AlertDialogContent>
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 dark:bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
          </div>
          
          <AlertDialogHeader className="text-center sm:text-center">
            <AlertDialogTitle className="text-center">
              Delete Folder
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete <span className="font-medium text-foreground">&ldquo;{deletingFolder?.name}&rdquo;</span>? 
              This will permanently delete the folder and all its contents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Warning badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">This action cannot be undone</span>
            </div>
          </div>
          
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel 
              disabled={isDeleting}
              className="flex-1 sm:flex-none sm:min-w-[100px]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              disabled={isDeleting}
              className={cn(
                "flex-1 sm:flex-none sm:min-w-[100px]",
                "bg-red-500 text-white hover:bg-red-600",
                "dark:bg-red-600 dark:hover:bg-red-700",
                "border-0"
              )}
            >
              {isDeleting ? (
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

      {/* Delete File Confirmation */}
      <AlertDialog open={!!deletingFile} onOpenChange={(open) => !open && setDeletingFile(null)}>
        <AlertDialogContent>
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 dark:bg-red-500/15 flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
          </div>
          
          <AlertDialogHeader className="text-center sm:text-center">
            <AlertDialogTitle className="text-center">
              Delete File
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete <span className="font-medium text-foreground">&ldquo;{deletingFile?.name}&rdquo;</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel 
              disabled={isDeletingFile}
              className="flex-1 sm:flex-none sm:min-w-[100px]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFile && handleFileDelete(deletingFile)}
              disabled={isDeletingFile}
              className={cn(
                "flex-1 sm:flex-none sm:min-w-[100px]",
                "bg-red-500 text-white hover:bg-red-600",
                "dark:bg-red-600 dark:hover:bg-red-700",
                "border-0"
              )}
            >
              {isDeletingFile ? (
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

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => { if (!open) setPreviewFile(null); }}
        fileName={previewFile?.name || ""}
        filePath={previewFile?.path || previewFile?.name || ""}
        context={scope === "public" ? "public" : "private"}
        onAskAI={previewFile ? () => onFileSelect(previewFile) : undefined}
      />
    </div>
  );
});

