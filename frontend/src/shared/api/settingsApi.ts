import { apiClient } from './client';
import type { AppSettings } from '@/shared/types/settings';

export const settingsApi = {
  async get(): Promise<AppSettings> {
    return apiClient.get<AppSettings>('/api/settings/ollama');
  },

  async update(settings: Partial<AppSettings>): Promise<AppSettings> {
    return apiClient.post<AppSettings>('/api/settings/ollama', settings);
  },
};

