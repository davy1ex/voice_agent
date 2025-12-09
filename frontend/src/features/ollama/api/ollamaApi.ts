import { apiClient } from '@/shared/api/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
}

export interface OllamaRequest {
  prompt: string;
  history?: MessageHistory[];
}

export interface OllamaResponse {
  response: string;
}

export interface StreamChunk {
  chunk?: string;
  done?: boolean;
  error?: string;
}

export type StreamCallback = (chunk: string) => void;
export type StreamErrorCallback = (error: string) => void;
export type StreamCompleteCallback = () => void;

export const ollamaApi = {
  async generate(request: OllamaRequest): Promise<OllamaResponse> {
    return apiClient.post<OllamaResponse>('/api/ollama', request);
  },

  async stream(
    request: OllamaRequest,
    onChunk: StreamCallback,
    onError?: StreamErrorCallback,
    onComplete?: StreamCompleteCallback,
    abortController?: AbortController
  ): Promise<void> {
    const payload: OllamaRequest = {
      prompt: request.prompt,
    };
    
    // Add history if provided
    if (request.history && request.history.length > 0) {
      payload.history = request.history;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/ollama/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream error: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        // Check if request was aborted
        if (abortController?.signal.aborted) {
          reader.cancel();
          return;
        }

        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));
              
              if (data.error) {
                onError?.(data.error);
                return;
              }
              
              if (data.done) {
                onComplete?.();
                return;
              }
              
              if (data.chunk) {
                onChunk(data.chunk);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      onComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);
      throw error;
    }
  },
};

