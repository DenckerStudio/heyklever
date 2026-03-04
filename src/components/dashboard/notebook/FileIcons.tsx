"use client";

import Image from "next/image";
import { File } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTypeIconProps {
  fileName: string;
  mimeType?: string;
  className?: string;
}

export function FileTypeIcon({ fileName, mimeType, className }: FileTypeIconProps) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const getIconPath = (): string | null => {
    // PDF files
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      return '/file-types/PDF (1).svg';
    }
    
    // Document files
    if (['doc', 'docx'].includes(extension) || 
        mimeType?.includes('word') || 
        mimeType?.includes('document')) {
      return '/file-types/DOC (1).png';
    }
    
    // Text files
    if (['txt', 'md', 'markdown'].includes(extension) || 
        mimeType === 'text/plain') {
      return '/file-types/TXT (1).png';
    }
    
    // Audio files
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension) || 
        mimeType?.includes('audio')) {
      return '/file-types/MP3 (1).png';
    }
    
    // Web files
    if (['html', 'htm', 'css', 'js', 'json', 'xml'].includes(extension) ||
        mimeType?.includes('html') ||
        mimeType?.includes('javascript') ||
        mimeType?.includes('json')) {
      return '/file-types/WEB (1).svg';
    }
    
    return null;
  };

  const iconPath = getIconPath();

  if (!iconPath) {
    return <File className={cn("text-muted-foreground/60", className)} />;
  }

  return (
    <Image
      src={iconPath}
      alt={`${extension} file`}
      width={16}
      height={16}
      className={cn("object-contain", className)}
    />
  );
}

