/**
 * Утилиты для работы с настройками приложения
 */

import { storage } from './storage';
import type { AppSettings } from '@/shared/types/settings';
import { DEFAULT_SETTINGS as DEFAULT } from '@/shared/types/settings';

const SETTINGS_KEY = 'aiagent_settings';

export const settingsManager = {
  /**
   * Получить настройки из localStorage
   */
  get(): AppSettings {
    return storage.get<AppSettings>(SETTINGS_KEY, DEFAULT);
  },

  /**
   * Сохранить настройки в localStorage
   */
  save(settings: Partial<AppSettings>): AppSettings {
    const current = this.get();
    const updated = { ...current, ...settings };
    storage.set(SETTINGS_KEY, updated);
    return updated;
  },

  /**
   * Сбросить настройки к значениям по умолчанию
   */
  reset(): AppSettings {
    storage.set(SETTINGS_KEY, DEFAULT);
    return DEFAULT;
  },
};

