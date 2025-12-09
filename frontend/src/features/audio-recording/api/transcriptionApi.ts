import { apiClient } from '@/shared/api/client';
import type { TranscriptionResponse } from '@/shared/types';

export const transcriptionApi = {
  async transcribe(audioBlob: Blob): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    return apiClient.postFormData<TranscriptionResponse>('/api/transcribe', formData);
  },
};

