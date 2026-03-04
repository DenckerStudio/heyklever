import { Separator } from '@radix-ui/react-separator'
import React from 'react'
import { Badge } from '../ui/badge';

const sectionTitle = ({ title, badgeText, badgeLabel = '' }: { title: string, badgeText: string, badgeLabel?: string }) => {
  return (
    <div className="relative">
      <div className="space-y-2">
        <div className="space-y-2 w-full">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-medium text-foreground flex items-center gap-3">
              {title}
            </h1>
            {badgeText && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{badgeLabel}</p>
                {badgeText && (
                <Badge variant="outline" className="capitalize">
                    {badgeText}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Separator className="w-full h-px bg-muted-foreground/10" />
        </div>
      </div>
    </div>
  );
}

export default sectionTitle