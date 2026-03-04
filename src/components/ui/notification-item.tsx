"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Maximize2, Info, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action_required' | 'long_content';

export interface NotificationItemProps {
  notification: {
    id: number;
    created_at: string;
    message: string;
    type: string;
    status: string;
    content?: string; // For long content
    actionUrl?: string; // For action buttons
  };
  onRead: (id: number) => void;
  onAction?: (id: number, action: 'accept' | 'reject') => void;
  onViewDetails?: (notification: any) => void;
}

export function NotificationItem({ notification, onRead, onAction, onViewDetails }: NotificationItemProps) {
  const isActionRequired = notification.type === 'action_required';
  const hasLongContent = notification.type === 'long_content' || (notification.content && notification.content.length > 100);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <Check className="w-3.5 h-3.5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      case 'error': return <X className="w-3.5 h-3.5 text-red-500" />;
      case 'long_content': return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      default: return <Info className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div 
        onClick={() => onRead(notification.id)}
        className={cn(
            "group relative p-3 rounded-xl mb-2 transition-all duration-300 cursor-pointer select-none",
            "hover:scale-[1.01] active:scale-[0.99]",
            notification.status === 'new' 
                ? "bg-gradient-to-br from-background via-background to-muted/20 border-border/40 shadow-sm hover:shadow-md hover:border-primary/20" 
                : "bg-muted/5 border-transparent opacity-60 hover:opacity-100 hover:bg-muted/10"
        )}
    >
        {/* Subtle hover gradient overlay */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-start gap-3 relative z-10">
        <div className={cn(
            "mt-0.5 p-1.5 rounded-full shrink-0 transition-colors duration-300",
            notification.status === 'new' ? "bg-muted/50 group-hover:bg-background shadow-inner" : "bg-muted/30"
        )}>
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn(
              "text-sm font-medium leading-tight transition-colors duration-200",
              notification.status === 'new' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {notification.message}
          </p>
          <p className="text-[10px] text-muted-foreground/70 font-medium">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>

          {/* Action Buttons */}
          {isActionRequired && (
            <div className="flex items-center gap-2 mt-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs px-3 bg-green-500/5 text-green-600 hover:bg-green-500/15 hover:text-green-700 border-green-500/10 hover:border-green-500/30 transition-all shadow-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(notification.id, 'accept');
                }}
              >
                <Check className="w-3 h-3 mr-1.5" />
                Accept
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs px-3 bg-red-500/5 text-red-600 hover:bg-red-500/15 hover:text-red-700 border-red-500/10 hover:border-red-500/30 transition-all shadow-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(notification.id, 'reject');
                }}
              >
                <X className="w-3 h-3 mr-1.5" />
                Reject
              </Button>
            </div>
          )}

          {/* View Details Button */}
          {hasLongContent && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 h-6 text-xs px-0 w-full justify-start text-primary/70 hover:text-primary hover:bg-transparent group-hover:translate-x-1 transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(notification);
              }}
            >
              <Maximize2 className="w-3 h-3 mr-1.5" />
              View Details
            </Button>
          )}
        </div>
        
        {notification.status === 'new' && (
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
        )}
      </div>
    </div>
  );
}
