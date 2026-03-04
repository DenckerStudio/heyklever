"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface MessageFormatterProps {
  content: string;
  className?: string;
}

export function MessageFormatter({ content, className }: MessageFormatterProps) {
  // Function to parse and format the message content
  const formatMessage = (text: string) => {
    // Safely handle non-string inputs
    if (typeof text !== 'string') {
        console.warn('MessageFormatter received non-string content:', text);
        return <span className="text-sm text-red-500">Error: Invalid content format</span>;
    }

    // First, let's handle the case where numbered items are on the same line
    // Split by numbered patterns to separate list items
    const numberedItems = text.split(/(\d+\.\s)/);
    
    // If we have numbered items, process them
    if (numberedItems.length > 1) {
      const items = [];
      for (let i = 1; i < numberedItems.length; i += 2) {
        if (numberedItems[i] && numberedItems[i + 1]) {
          const number = numberedItems[i].replace('.', '');
          const content = numberedItems[i + 1].trim();
          items.push({ number, content });
        }
      }
      
      if (items.length > 0) {
        return (
          <div className="space-y-3">
            {items.map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                  {item.number}
                </span>
                <span className="text-sm leading-relaxed">{item.content}</span>
              </div>
            ))}
          </div>
        );
      }
    }
    
    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    return paragraphs.map((paragraph, paragraphIndex) => {
      const trimmedParagraph = paragraph.trim();
      
      // Check if it's a numbered list (traditional format)
      if (trimmedParagraph.match(/^\d+\.\s/)) {
        const lines = trimmedParagraph.split(/\n/);
        const listItems = lines.filter(line => line.trim().match(/^\d+\.\s/));
        
        return (
          <div key={paragraphIndex} className="space-y-2">
            {listItems.map((item, itemIndex) => {
              const match = item.match(/^(\d+)\.\s(.+)/);
              if (match) {
                const [, number, text] = match;
                return (
                  <div key={itemIndex} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                      {number}
                    </span>
                    <span className="text-sm leading-relaxed">{text}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }
      
      // Check if it's a bullet point list
      if (trimmedParagraph.match(/^\*\s/)) {
        const lines = trimmedParagraph.split(/\n/);
        const listItems = lines.filter(line => line.trim().match(/^\*\s/));
        
        return (
          <div key={paragraphIndex} className="space-y-2">
            {listItems.map((item, itemIndex) => {
              const text = item.replace(/^\*\s/, '');
              return (
                <div key={itemIndex} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mt-2"></span>
                  <span className="text-sm leading-relaxed">{text}</span>
                </div>
              );
            })}
          </div>
        );
      }
      
      // Check if it's a source reference
      if (trimmedParagraph.startsWith('Source:')) {
        return (
          <div key={paragraphIndex} className="mt-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-blue-200 dark:border-blue-800">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Source:</span>
            <span className="text-xs text-gray-700 dark:text-gray-300 ml-1">{trimmedParagraph.replace('Source:', '').trim()}</span>
          </div>
        );
      }
      
      // Check if it's a bold section (like **Fremgangsmåte:**)
      if (trimmedParagraph.match(/\*\*.*?\*\*:/)) {
        return (
          <div key={paragraphIndex} className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {trimmedParagraph.replace(/\*\*(.*?)\*\*:/, '$1:')}
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400 ml-1">
              {trimmedParagraph.replace(/\*\*.*?\*\*:\s*/, '')}
            </span>
          </div>
        );
      }
      
      // Regular paragraph
      return (
        <p key={paragraphIndex} className="text-sm leading-relaxed">
          {trimmedParagraph}
        </p>
      );
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {formatMessage(content)}
    </div>
  );
}
