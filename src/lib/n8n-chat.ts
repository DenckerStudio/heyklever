/**
 * @deprecated This file is deprecated. Use '@/lib/chat-service' instead.
 * This file re-exports from chat-service.ts for backwards compatibility.
 */

// Re-export everything from the unified chat service
export {
  // Types
  type MessageType,
  type Action,
  type StructuredMessage,
  type ChatMessage,
  type ChatResponse,
  type StructuredChatResponse,
  type StructuredEnvelope,
  type MessageMetadata,
  
  // Service class (aliased for compatibility)
  UnifiedChatService as ChatService,
  
  // Singleton instance
  chatService,
} from './chat-service';

// Legacy config for backwards compatibility
export const chatConfig = {
  apiUrl: '/api/chat',
  headers: {},
};
