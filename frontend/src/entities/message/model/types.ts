// Types for message entity

import type { Message, MessageRole } from '@/shared/types';

export type { Message, MessageRole };

export interface MessageCreateParams {
  role: MessageRole;
  content: string;
}

