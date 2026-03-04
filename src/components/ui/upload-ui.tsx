'use client';

import * as React from 'react';
import { X, ArrowDownCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadCardProps {
  status: 'uploading' | 'success' | 'error';
  progress?: number; // Only relevant for 'uploading' status
  title: string;
  description: string;
  primaryButtonText: string;
  onPrimaryButtonClick?: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  onClose?: () => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  status,
  progress,
  title,
  description,
  primaryButtonText,
  onPrimaryButtonClick,
  secondaryButtonText,
  onSecondaryButtonClick,
  onClose,
}) => {
  const renderIcon = () => {
    switch (status) {
      case 'uploading':
        return <ArrowDownCircle className="h-full w-full" />;
      case 'success':
        return <CheckCircle className="h-full w-full" />;
      case 'error':
        return <XCircle className="h-full w-full" />;
      default:
        return null;
    }
  };

  const statusColors = {
    uploading: 'border-blue-500/10 bg-blue-50/60 dark:bg-blue-950/60 dark:border-blue-400',
    success: 'border-green-500/10 bg-green-50/60 dark:bg-green-950/60 dark:border-green-400',
    error: 'border-red-500/10 bg-red-50/60 dark:bg-red-950/60 dark:border-red-400',
  };

  const iconColors = {
    uploading: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={cn(
      'relative w-full max-w-md rounded-xl border-2 shadow-lg backdrop-blur-sm',
      statusColors[status]
    )}>
      {/* Close button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onClose?.();
        }}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Card body */}
      <div className="p-5 pr-8">
        <div className="flex gap-4">
          {/* Icon */}
          <div className={cn('flex-shrink-0 mt-1', iconColors[status])}>
            {renderIcon() && (
              <div className="h-6 w-6">
                {renderIcon()}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1 text-base">{title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{description}</p>

            {/* Progress bar for uploading */}
            {status === 'uploading' && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className={cn(
                        'h-full transition-all duration-300 rounded-full',
                        status === 'uploading' && 'bg-blue-500'
                      )}
                      style={{ width: `${progress || 0}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onPrimaryButtonClick?.();
                  }}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {primaryButtonText}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons for success/error */}
      {(status === 'success' || status === 'error') && (
        <div className="px-5 pb-4 pt-2 flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              onPrimaryButtonClick?.();
            }}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              status === 'success'
                ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                : 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
            )}
          >
            {primaryButtonText}
          </button>
          {secondaryButtonText && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onSecondaryButtonClick?.();
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              {secondaryButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};