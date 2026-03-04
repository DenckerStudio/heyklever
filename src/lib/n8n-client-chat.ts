/**
 * @deprecated This file is deprecated. Use '@/lib/chat-service' instead.
 * This file re-exports from chat-service.ts for backwards compatibility.
 */

// Re-export everything from the unified chat service
export {
  // Types
  type ChatMessage,
  type ChatResponse,
  type StructuredChatResponse,
  type StructuredEnvelope,
  
  // Service class (aliased for compatibility)
  UnifiedChatService as ClientChatService,
  
  // Singleton instance
  clientChatService,
} from './chat-service';

// Legacy config for backwards compatibility
export const clientChatConfig = {
  apiUrl: '/api/clientChat',
  headers: {
    'Content-Type': 'application/json',
  },
};

// Legacy settings type for backwards compatibility
export interface ClientChatSettings {
  language?: 'no' | 'en' | 'sv' | 'da';
  fileAccessMode?: 'all_public' | 'selected_files';
  allowedFileIds?: string[];
}
