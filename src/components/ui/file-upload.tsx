import { cn, normalizeFileName } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export const FileUpload = ({
  onChange,
  onUpload,
  scope = "public",
}: {
  onChange?: (files: File[]) => void;
  onUpload?: (files: File[]) => Promise<void>;
  scope?: "public" | "private";
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    if (onChange) {
      onChange(newFiles);
    }
    
    // Auto-upload to Supabase Storage by default
    setUploading(true);
    try {
      if (onUpload) {
        await onUpload(newFiles);
      } else {
        await uploadToSupabase(newFiles);
      }
      setFiles([]); // Clear files after successful upload
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const uploadToSupabase = async (files: File[]) => {
    for (const file of files) {
      try {
        // Normalize filename to handle special characters and spaces
        const normalizedFileName = normalizeFileName(file.name);
        
        // Get signed upload URL
        const response = await fetch('/api/storage/upload/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: normalizedFileName,
            fileSize: file.size,
            contentType: file.type,
            scope,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get upload URL: ${response.status}`);
        }

        const { uploadUrl, token, path: objectPath, bucketId } = await response.json();

        // Upload file to Supabase Storage
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

        console.log(`Successfully uploaded ${file.name}`);

        // Send all files to n8n ingest for processing
        try {
          if (objectPath && bucketId) {
            const lower = file.name.toLowerCase();
            let content = '';
            
            // Extract text for text-like files that can be read directly
            if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || 
                lower.endsWith('.json') || lower.endsWith('.xml') || lower.endsWith('.html') || 
                lower.endsWith('.css') || lower.endsWith('.js') || lower.endsWith('.ts')) {
              try {
                content = await file.text();
              } catch (e) {
                console.warn('Failed to extract text from file:', file.name, e);
                content = '';
              }
            }
            
            console.log('Sending file to ingest:', {
              fileName: normalizedFileName,
              originalFileName: file.name,
              contentType: file.type,
              objectPath,
              bucketId,
              visibilityScope: 'internal',
              hasContent: content.length > 0
            });
            
            const response = await fetch('/api/storage/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bucketId,
                objectPath,
                fileName: normalizedFileName,
                content: content, // Empty for non-text files, will be extracted by n8n
                // New metadata fields for enhanced chunk filtering
                visibilityScope: 'internal', // Default to internal (team only)
                allowedClientCodes: [], // Empty by default
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Ingest request failed:', response.status, errorText);
            } else {
              console.log('File successfully sent to ingest:', file.name);
            }
          } else {
            console.warn('Missing objectPath or bucketId for file:', file.name);
          }
        } catch (e) {
          console.error('Failed to forward to ingest webhook:', e);
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw error;
      }
    }
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: handleFileChange,
    onDropRejected: (error) => {
      console.log(error);
    },
    disabled: uploading,
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className="p-10 group/file block rounded-lg cursor-pointer w-full relative overflow-hidden"
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          multiple
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
          disabled={uploading}
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans font-bold text-neutral-700 dark:text-neutral-300 text-base">
            {uploading ? "Uploading..." : "Upload file"}
          </p>
          <p className="relative z-20 font-sans font-normal text-neutral-400 dark:text-neutral-400 text-base mt-2">
            {uploading ? "Please wait while files are being uploaded" : "Drag or drop your files here or click to upload"}
          </p>
          <div className="relative w-full mt-10 max-w-xl mx-auto">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative overflow-hidden z-40 bg-white dark:bg-neutral-900 flex flex-col items-start justify-start md:h-24 p-4 mt-4 w-full mx-auto rounded-md",
                    "shadow-sm"
                  )}
                >
                  <div className="flex justify-between w-full items-center gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="text-base text-neutral-700 dark:text-neutral-300 truncate max-w-xs"
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded-lg px-2 py-1 w-fit flex-shrink-0 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-white shadow-input"
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  <div className="flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-neutral-600 dark:text-neutral-400">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 "
                    >
                      {file.type}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                    >
                      modified{" "}
                      {new Date(file.lastModified).toLocaleDateString()}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative group-hover/file:shadow-2xl z-40 bg-white dark:bg-neutral-900 flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md",
                  "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]"
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-neutral-600 flex flex-col items-center"
                  >
                    Drop it
                    <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute opacity-0 border border-dashed border-sky-400 inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
              ></motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-gray-100 dark:bg-neutral-900 flex-shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px  scale-105">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex flex-shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}
