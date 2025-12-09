// Shared types

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export type IntentType = 'chat' | 'task';

export interface TranscriptionResponse {
  text: string;
  intent?: IntentType;
}

export interface ChatResponse {
  message: string;
  intent: IntentType;
}

