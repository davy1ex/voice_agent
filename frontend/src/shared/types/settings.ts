/**
 * Типы для настроек приложения
 */

export interface AppSettings {
  ollamaHost: string;
  ollamaModel: string;
  systemPrompt: string;
  whisperModel: string;
}

export const WHISPER_MODELS = [
  { value: 'tiny', label: 'tiny (39M)', description: '~1 GB VRAM, ~10x скорость' },
  { value: 'base', label: 'base (74M)', description: '~1 GB VRAM, ~7x скорость' },
  { value: 'small', label: 'small (244M)', description: '~2 GB VRAM, ~4x скорость' },
  { value: 'medium', label: 'medium (769M)', description: '~5 GB VRAM, ~2x скорость' },
  { value: 'large', label: 'large (1550M)', description: '~10 GB VRAM, 1x скорость' },
  { value: 'turbo', label: 'turbo (809M)', description: '~6 GB VRAM, ~8x скорость' },
] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  ollamaHost: 'http://localhost:11434',
  ollamaModel: 'llama2',
  systemPrompt: 'Ты полезный ассистент. Отвечай лаконично, по делу, как собеседник, а не как энциклопедия. Твой ответ должен быть примерно такой же длины или немного длиннее, чем вопрос пользователя. Избегай лишних деталей и воды.',
  whisperModel: 'base',
};

