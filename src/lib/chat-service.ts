/**
 * Unified Chat Service
 * 
 * A single configurable chat service that supports both team (internal) and client (public) chat,
 * with streaming and non-streaming response support.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ChatVariant = 'team' | 'client';
export type ChatContext = 'public' | 'private';
export type MessageType = 'text' | 'image' | 'card' | 'action';

export interface Action {
  label: string;
  actionType: 'postback' | 'link';
  value: string;
}

export interface StructuredMessage {
  type: MessageType;
  content?: string;
  title?: string;
  metadata?: MessageMetadata;
  actions?: Action[];
}

export interface MessageMetadata {
  confidence?: number | 'high' | 'medium' | 'low';
  tags?: string[];
  sources?: Array<{
    file_name: string;
    relevance: 'high' | 'medium' | 'low';
    excerpt?: string;
  }>;
  language?: string;
  topics?: string[];
  followUpSuggestions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | StructuredMessage | StructuredMessage[];
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

export interface StructuredChatResponse {
  answer?: string;
  message?: StructuredMessage | StructuredMessage[];
  sources?: Array<{
    file_name: string;
    relevance: 'high' | 'medium' | 'low';
    excerpt?: string;
  }>;
  confidence?: 'high' | 'medium' | 'low';
  language?: string;
  topics?: string[];
  follow_up_suggestions?: string[];
}

export interface StructuredEnvelope {
  response: StructuredChatResponse;
  context?: ChatContext;
  namespace?: string;
  teamId?: string;
  teamName?: string;
}

export interface ChatServiceConfig {
  variant: ChatVariant;
  teamId?: string;
  context?: ChatContext;
  clientCode?: string;
  language?: string;
  fileAccessMode?: 'all_public' | 'selected_files';
  allowedFileIds?: string[];
}

export interface SendMessageOptions {
  sessionId?: string;
  file?: File;
  signal?: AbortSignal;
}

export interface StreamingOptions extends SendMessageOptions {
  onChunk: (chunk: string, fullText: string) => void;
}

// ============================================================================
// Chat Service Class
// ============================================================================

export class UnifiedChatService {
  private config: ChatServiceConfig;

  constructor(config: ChatServiceConfig) {
    this.config = config;
  }

  private get apiUrl(): string {
    return this.config.variant === 'team' ? '/api/chat' : '/api/clientChat';
  }

  private get defaultContext(): ChatContext {
    return this.config.variant === 'team' ? 'private' : 'public';
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Send a message and get a complete response (non-streaming)
   */
  async sendMessage(
    message: string,
    options: SendMessageOptions = {}
  ): Promise<ChatResponse | StructuredChatResponse[] | StructuredEnvelope> {
    const { sessionId, file, signal } = options;

    try {
      let body: string | FormData;
      const requestHeaders: Record<string, string> = {
        'x-session-id': sessionId || crypto.randomUUID(),
      };

      if (file && this.config.variant === 'team') {
        // Only team chat supports file uploads via FormData
        const formData = new FormData();
        formData.append('message', message);
        formData.append('teamId', this.config.teamId || 'default');
        if (sessionId) formData.append('sessionId', sessionId);
        formData.append('context', this.config.context || this.defaultContext);
        formData.append('file', file);
        body = formData;
      } else {
        body = JSON.stringify({
          message,
          teamId: this.config.teamId || 'default',
          sessionId,
          context: this.config.context || this.defaultContext,
          // Client-specific fields
          ...(this.config.variant === 'client' && {
            clientCode: this.config.clientCode,
            language: this.config.language,
            fileAccessMode: this.config.fileAccessMode,
            allowedFileIds: this.config.allowedFileIds,
          }),
        });
        requestHeaders['Content-Type'] = 'application/json';
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body,
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Case 1: Structured envelope { response: { answer, ... }, ... }
      if (data && typeof data === 'object' && 'response' in data && data.response) {
        return data as StructuredEnvelope;
      }

      // Case 2: Structured array format
      if (Array.isArray(data) && (data[0]?.message || data[0]?.answer)) {
        return data as StructuredChatResponse[];
      }

      // Case 3: Fallback to legacy simple message
      return {
        message: (typeof data?.message === 'string' ? data.message : undefined) || 'No response received',
        success: true,
      } as ChatResponse;
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        message: 'Sorry, I could not send the message. Please try again.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a message with streaming response support
   */
  async sendMessageStreaming(
    message: string,
    options: StreamingOptions
  ): Promise<{ fullText: string; error?: string }> {
    const { sessionId, file, signal, onChunk } = options;

    try {
      let body: string | FormData;
      const requestHeaders: Record<string, string> = {
        'x-session-id': sessionId || crypto.randomUUID(),
        'Accept': 'text/event-stream',
      };

      if (file && this.config.variant === 'team') {
        // Only team chat supports file uploads via FormData
        const formData = new FormData();
        formData.append('message', message);
        formData.append('teamId', this.config.teamId || 'default');
        if (sessionId) formData.append('sessionId', sessionId);
        formData.append('context', this.config.context || this.defaultContext);
        formData.append('file', file);
        formData.append('streaming', 'true');
        body = formData;
      } else {
        body = JSON.stringify({
          message,
          teamId: this.config.teamId || 'default',
          sessionId,
          context: this.config.context || this.defaultContext,
          streaming: true,
          // Client-specific fields
          ...(this.config.variant === 'client' && {
            clientCode: this.config.clientCode,
            language: this.config.language,
            fileAccessMode: this.config.fileAccessMode,
            allowedFileIds: this.config.allowedFileIds,
          }),
        });
        requestHeaders['Content-Type'] = 'application/json';
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body,
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if the response is actually streaming
      const contentType = response.headers.get('content-type') || '';

      // If not streaming (JSON response), handle as regular response
      if (contentType.includes('application/json')) {
        const data = await response.json();
        const text = this.extractTextFromResponse(data);
        onChunk(text, text);
        return { fullText: text };
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Handle Server-Sent Events format
        if (chunk.includes('data:')) {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (data && data !== '[DONE]') {
                try {
                  // Try to parse as JSON (OpenAI-style SSE)
                  const parsed = JSON.parse(data);
                  const content =
                    parsed.choices?.[0]?.delta?.content ||
                    parsed.content ||
                    parsed.text ||
                    parsed.chunk ||
                    '';
                  if (content) {
                    fullText += content;
                    onChunk(content, fullText);
                  }
                } catch {
                  // Not JSON, use as plain text
                  fullText += data;
                  onChunk(data, fullText);
                }
              }
            }
          }
        } else {
          // Plain text streaming
          fullText += chunk;
          onChunk(chunk, fullText);
        }
      }

      return { fullText };
    } catch (error) {
      console.error('Error in streaming message:', error);
      return {
        fullText: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract text content from various response formats
   */
  private extractTextFromResponse(data: unknown): string {
    if (!data || typeof data !== 'object') {
      return typeof data === 'string' ? data : JSON.stringify(data);
    }

    const obj = data as Record<string, unknown>;

    // Try various response formats
    if (obj.output && typeof obj.output === 'object' && (obj.output as Record<string, unknown>).message) {
      const msg = (obj.output as Record<string, unknown>).message as Record<string, unknown>;
      if (msg.content) return String(msg.content);
    }
    if (obj.response && typeof obj.response === 'object') {
      const resp = obj.response as Record<string, unknown>;
      if (resp.message && typeof resp.message === 'object' && (resp.message as Record<string, unknown>).content) {
        return String((resp.message as Record<string, unknown>).content);
      }
      if (resp.answer) {
        return typeof resp.answer === 'string' ? resp.answer : JSON.stringify(resp.answer);
      }
    }
    if (obj.message) {
      return typeof obj.message === 'string'
        ? obj.message
        : (obj.message as Record<string, unknown>).content
        ? String((obj.message as Record<string, unknown>).content)
        : '';
    }
    if (obj.output) {
      return typeof obj.output === 'string' ? obj.output : JSON.stringify(obj.output);
    }
    if (obj.answer) {
      return typeof obj.answer === 'string' ? obj.answer : JSON.stringify(obj.answer);
    }

    return JSON.stringify(data);
  }

  /**
   * Initialize chat session
   */
  async initializeChat(): Promise<{ conversationId: string }> {
    return {
      conversationId: crypto.randomUUID(),
    };
  }
}

// ============================================================================
// Factory Functions and Singleton Instances
// ============================================================================

/**
 * Create a chat service for team (internal) use
 */
export function createTeamChatService(teamId?: string, context: ChatContext = 'private'): UnifiedChatService {
  return new UnifiedChatService({
    variant: 'team',
    teamId,
    context,
  });
}

/**
 * Create a chat service for client (public) use
 */
export function createClientChatService(
  teamId?: string,
  clientCode?: string,
  options?: {
    language?: string;
    fileAccessMode?: 'all_public' | 'selected_files';
    allowedFileIds?: string[];
  }
): UnifiedChatService {
  return new UnifiedChatService({
    variant: 'client',
    teamId,
    context: 'public',
    clientCode,
    ...options,
  });
}

// Default singleton instances for backwards compatibility
export const chatService = new UnifiedChatService({ variant: 'team', context: 'private' });
export const clientChatService = new UnifiedChatService({ variant: 'client', context: 'public' });

// Re-export types for backwards compatibility with n8n-chat.ts
export type { ChatMessage as N8nChatMessage };
