"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter
} from "@/components/ui/animated-modal";

interface TeamLogoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => Promise<void> | void;
}

export function TeamLogoDialog({ open, onOpenChange, onConfirm }: TeamLogoDialogProps) {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [resizedDataUrl, setResizedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setOriginalFile(null);
      setResizedDataUrl(null);
      setIsProcessing(false);
      setError(null);
    }
  }, [open]);

  const handleFiles = async (files: File[]) => {
    setError(null);
    if (!files?.length) return;
    const file = files[0];
    setOriginalFile(file);
    setIsProcessing(true);
    try {
      const dataUrl = await resizeImageToSquare(file, 256);
      setResizedDataUrl(dataUrl);
    } catch (e) {
      setError((e as Error).message || "Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirm = async () => {
    if (!resizedDataUrl || !originalFile) return;
    // Convert dataURL back to File (PNG)
    const blob = await (await fetch(resizedDataUrl)).blob();
    const adjusted = new File([blob], ensurePngName(originalFile.name), { type: "image/png" });
    await onConfirm(adjusted);
    onOpenChange(false);
  };

  return (
    <Modal open={open} setOpen={onOpenChange}>
      <ModalBody className="max-w-[94vw] w-full md:max-w-xl p-0">
        <ModalContent className="p-6">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 className="text-lg font-medium">Update team logo</h2>
            <p className="text-sm text-muted-foreground">
              Upload an image, we will auto‑fit it to a square. Confirm to apply.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <FileUpload onChange={handleFiles} />
            {error ? (
              <div className="text-xs text-red-600">{error}</div>
            ) : null}
            <div className="flex items-center gap-4">
              <div className="size-20 rounded-xl overflow-hidden bg-muted ring-1 ring-white/10">
                {resizedDataUrl ? (
                  // preview of auto-resized
                  <img src={resizedDataUrl} alt="Preview" className="size-full object-cover" />
                ) : (
                  <div className="size-full grid place-items-center text-xs text-muted-foreground">Preview</div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                We resize to 256×256 PNG for optimal display.
              </div>
            </div>
          </div>

          <ModalFooter className="mt-6 p-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
              Cancel
            </Button>
            <Button onClick={confirm} disabled={!resizedDataUrl || isProcessing}>
              {isProcessing ? "Processing..." : "Confirm"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </ModalBody>
    </Modal>
  );
}

function ensurePngName(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}.png`;
}

async function resizeImageToSquare(file: File, size: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  // cover behavior: scale and center crop
  const srcRatio = bitmap.width / bitmap.height;
  const dstRatio = 1; // square
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (srcRatio > dstRatio) {
    // wider than tall: crop left/right
    sh = bitmap.height;
    sw = sh * dstRatio;
    sx = (bitmap.width - sw) / 2;
  } else if (srcRatio < dstRatio) {
    // taller than wide: crop top/bottom
    sw = bitmap.width;
    sh = sw / dstRatio;
    sy = (bitmap.height - sh) / 2;
  }
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, size, size);
  return canvas.toDataURL("image/png");
}

export default TeamLogoDialog;
