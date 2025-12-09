const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface TTSRequest {
  text: string;
  language?: string;
}

export const ttsApi = {
  /**
   * get audio from TTS (Piper) on the backend
   */
  async synthesize(request: TTSRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/tts/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        language: request.language || 'ru',
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS error: ${response.statusText}`);
    }

    return response.blob();
  },
};

