import { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { settingsApi } from '@/shared/api/settingsApi';
import type { AppSettings } from '@/shared/types/settings';
import { WHISPER_MODELS } from '@/shared/types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: AppSettings) => void;
  onExportHistory?: () => void;
  onClearHistory?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSave, onExportHistory, onClearHistory }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>({
    ollamaHost: 'http://localhost:11434',
    ollamaModel: 'llama2',
    systemPrompt: 'Ты полезный ассистент. Отвечай лаконично, по делу, как собеседник, а не как энциклопедия. Твой ответ должен быть примерно такой же длины или немного длиннее, чем вопрос пользователя. Избегай лишних деталей и воды.',
    whisperModel: 'base',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AppSettings, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from backend when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await settingsApi.get();
      setSettings(loadedSettings);
      setErrors({});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки настроек';
      setErrors({ ollamaHost: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AppSettings, string>> = {};

    // Validate Ollama Host
    if (!settings.ollamaHost.trim()) {
      newErrors.ollamaHost = 'Host обязателен';
    } else {
      try {
        const url = new URL(settings.ollamaHost);
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.ollamaHost = 'URL must start with http:// or https://';
        }
      } catch {
        newErrors.ollamaHost = 'Некорректный URL';
      }
    }

    // Validate Ollama Model
    if (!settings.ollamaModel.trim()) {
      newErrors.ollamaModel = 'Модель обязательна';
    }

    // Validate System Prompt (optional, but if set must be non-empty)
    if (settings.systemPrompt && !settings.systemPrompt.trim()) {
      newErrors.systemPrompt = 'Системный промпт не может быть пустым';
    }

    // Validate Whisper Model
    const validWhisperModels = WHISPER_MODELS.map(m => m.value);
    if (!settings.whisperModel || !validWhisperModels.includes(settings.whisperModel as any)) {
      newErrors.whisperModel = 'Выберите корректную модель Whisper';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = await settingsApi.update(settings);
      onSave?.(saved);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сохранения настроек';
      setErrors({ ollamaHost: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      ollamaHost: 'http://localhost:11434',
      ollamaModel: 'llama2',
      systemPrompt: 'Ты полезный ассистент. Отвечай лаконично, по делу, как собеседник, а не как энциклопедия. Твой ответ должен быть примерно такой же длины или немного длиннее, чем вопрос пользователя. Избегай лишних деталей и воды.',
      whisperModel: 'base',
    });
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Настройки"
      size="md"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Загрузка настроек...</div>
        ) : (
          <>
            {/* Ollama Host */}
            <div>
          <label
            htmlFor="ollamaHost"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ollama Host (URL + Port)
          </label>
          <input
            id="ollamaHost"
            type="text"
            value={settings.ollamaHost}
            onChange={(e) =>
              setSettings({ ...settings, ollamaHost: e.target.value })
            }
            placeholder="http://localhost:11434"
            className={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.ollamaHost ? 'border-red-500' : 'border-gray-300'}
            `}
          />
          {errors.ollamaHost && (
            <p className="mt-1 text-sm text-red-600">{errors.ollamaHost}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            URL и порт Ollama сервера (например: http://localhost:11434)
          </p>
        </div>

        {/* Ollama Model */}
        <div>
          <label
            htmlFor="ollamaModel"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ollama Model
          </label>
          <input
            id="ollamaModel"
            type="text"
            value={settings.ollamaModel}
            onChange={(e) =>
              setSettings({ ...settings, ollamaModel: e.target.value })
            }
            placeholder="llama2"
            className={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.ollamaModel ? 'border-red-500' : 'border-gray-300'}
            `}
          />
          {errors.ollamaModel && (
            <p className="mt-1 text-sm text-red-600">{errors.ollamaModel}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Название модели Ollama (например: llama2, mistral, codellama)
          </p>
        </div>

        {/* System Prompt */}
        <div>
          <label
            htmlFor="systemPrompt"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Системный промпт
          </label>
          <textarea
            id="systemPrompt"
            value={settings.systemPrompt}
            onChange={(e) =>
              setSettings({ ...settings, systemPrompt: e.target.value })
            }
            placeholder="Ты полезный ассистент..."
            rows={4}
            className={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.systemPrompt ? 'border-red-500' : 'border-gray-300'}
            `}
          />
          {errors.systemPrompt && (
            <p className="mt-1 text-sm text-red-600">{errors.systemPrompt}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Системный промпт для настройки поведения модели. Используется для всех запросов к Ollama.
          </p>
        </div>

        {/* Whisper Model */}
        <div>
          <label
            htmlFor="whisperModel"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Whisper Model
          </label>
          <select
            id="whisperModel"
            value={settings.whisperModel}
            onChange={(e) =>
              setSettings({ ...settings, whisperModel: e.target.value })
            }
            className={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.whisperModel ? 'border-red-500' : 'border-gray-300'}
            `}
          >
            {WHISPER_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label} - {model.description}
              </option>
            ))}
          </select>
          {errors.whisperModel && (
            <p className="mt-1 text-sm text-red-600">{errors.whisperModel}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Модель Whisper для транскрибации аудио. Меньшие модели быстрее, но менее точные.
          </p>
        </div>

        {/* Dialog memory controls */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Память диалога</h3>
          <div className="flex gap-2">
            {onExportHistory && (
              <button
                onClick={onExportHistory}
                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>Экспортировать диалог</span>
              </button>
            )}
            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <span>🗑️</span>
                <span>Очистить память</span>
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Экспортируйте весь диалог в файл или очистите историю сообщений.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Сбросить
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </Modal>
  );
}

