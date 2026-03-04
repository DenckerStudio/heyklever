"use client";

import { File as FileIcon, FileArchive, FileAudio2, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo2 } from "lucide-react";

export function getFileIconByName(name: string, mimeType?: string) {
  if (mimeType) {
    if (mimeType === "application/vnd.google-apps.document") return <FileText className="h-5 w-5" />;
    if (mimeType === "application/vnd.google-apps.spreadsheet") return <FileSpreadsheet className="h-5 w-5" />;
    if (mimeType === "application/vnd.google-apps.presentation") return <FileText className="h-5 w-5" />;
    if (mimeType === "application/vnd.google-apps.drawing") return <FileImage className="h-5 w-5" />;
    if (mimeType === "application/vnd.google-apps.form") return <FileText className="h-5 w-5" />;
  }

  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return <FileIcon className="h-5 w-5" />;
  if (["txt", "md", "rtf", "doc", "docx"].includes(ext)) return <FileText className="h-5 w-5" />;
  if (["xls", "xlsx", "csv", "gsheet"].includes(ext)) return <FileSpreadsheet className="h-5 w-5" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return <FileImage className="h-5 w-5" />;
  if (["zip", "rar", "7z", "gz", "tar"].includes(ext)) return <FileArchive className="h-5 w-5" />;
  if (["mp3", "wav", "flac", "m4a"].includes(ext)) return <FileAudio2 className="h-5 w-5" />;
  if (["mp4", "mov", "mkv", "webm"].includes(ext)) return <FileVideo2 className="h-5 w-5" />;
  if (["js", "ts", "tsx", "json", "html", "css", "py", "rb", "go", "java"].includes(ext)) return <FileCode className="h-5 w-5" />;
  return <FileIcon className="h-5 w-5" />;
}


