"use client";

import React from 'react';
import { MessageFormatter } from './message-formatter';

export function MessageFormatterDemo() {
  const exampleMessage = `For å glemme et nettverk på Mac: 1. Trykk på Wi-Fi-logoen øverst i høyre hjørne. 2. Trykk deretter på "Wi-Fi Settings" eller "Wi-Fi innstillinger". 3. Trykk på de tre prikkene ved siden av nettverket du vil fjerne. 4. Klikk på "Forget this network" og bekreft at du vil fjerne nettverket. Source: Glemme nett - Mac.pdf. * **Fremgangsmåte:** Instruksjoner for å glemme et nettverk på Mac.`;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">Message Formatter Demo</h2>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-red-600">Before (Raw Text - Clumpy):</h3>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm border-l-4 border-red-400">
          <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">This is how the message currently appears in your chat widget:</p>
          {exampleMessage}
        </div>
        
        <h3 className="text-lg font-semibold text-green-600">After (Formatted - Clean):</h3>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-green-400">
          <p className="text-gray-600 dark:text-gray-400 text-xs mb-3">This is how it will appear with the MessageFormatter:</p>
          <MessageFormatter content={exampleMessage} />
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>✅ Numbered lists are properly formatted with visual indicators</p>
        <p>✅ Source references are highlighted in a separate box</p>
        <p>✅ Bold sections are properly styled</p>
        <p>✅ Better spacing and readability</p>
      </div>
    </div>
  );
}
