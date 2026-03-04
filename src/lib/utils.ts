import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a filename by:
 * - Replacing spaces with underscores
 * - Normalizing Norwegian characters (æ→ae, ø→o, å→aa)
 * - Removing or replacing special characters that could cause issues in URLs
 * - Preserving the file extension
 */
export function normalizeFileName(fileName: string): string {
  // Split filename and extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < fileName.length - 1;
  
  let name = hasExtension ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = hasExtension ? fileName.substring(lastDotIndex) : '';
  
  // Normalize Norwegian characters
  name = name
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'aa')
    .replace(/Æ/g, 'Ae')
    .replace(/Ø/g, 'O')
    .replace(/Å/g, 'Aa');
  
  // Replace spaces with underscores
  name = name.replace(/\s+/g, '_');
  
  // Remove or replace other problematic characters
  // Keep alphanumeric, dots, dashes, underscores, and common safe characters
  name = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Remove multiple consecutive underscores
  name = name.replace(/_+/g, '_');
  
  // Remove leading/trailing underscores
  name = name.replace(/^_+|_+$/g, '');
  
  // Ensure name is not empty
  if (!name) {
    name = 'file';
  }
  
  return name + extension;
}
