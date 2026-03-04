"use client";

import React from 'react';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter
} from "@/components/ui/animated-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Notification {
  message: string;
  created_at: string;
  content?: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  notification: Notification | null;
}

export function NotificationModal({ isOpen, onClose, notification }: NotificationModalProps) {
  if (!notification) return null;

  return (
    <Modal open={isOpen} setOpen={onClose}>
      <ModalBody className="max-w-[600px] max-h-[80vh] flex flex-col min-h-[300px]">
        <ModalContent className="flex flex-col h-full p-6">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {notification.message}
            </h2>
            <p className="text-sm text-muted-foreground">
               Received on {format(new Date(notification.created_at), "PPP 'at' p")}
            </p>
          </div>
          
          <ScrollArea className="flex-1 mt-2 p-4 rounded-md border bg-muted/20">
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {notification.content || "No additional content."}
            </div>
          </ScrollArea>

          <ModalFooter className="mt-4 p-0">
            <Button variant="outline" onClick={() => onClose(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </ModalBody>
    </Modal>
  );
}
