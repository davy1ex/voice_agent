/**
 * Утилиты для Text-to-Speech через бэкенд (Piper TTS)
 */

import { ttsApi } from '@/features/tts/api/ttsApi';

class TTSManager {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private audioQueue: HTMLAudioElement[] = [];
  private isPlaying = false;
  private textBuffer = '';
  private processingQueue: Promise<void> = Promise.resolve();
  private onPlayingStateChange?: (isPlaying: boolean) => void;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Добавляет текст в буфер и озвучивает при завершении предложения
   */
  async addChunk(chunk: string, onLog?: (message: string) => void) {
    // Serialize processing to keep sentence order
    this.processingQueue = this.processingQueue.then(async () => {
      this.textBuffer += chunk;
      onLog?.(`📝 TTS: получен чанк "${chunk}" (буфер: "${this.textBuffer}")`);

      // Проверяем, есть ли завершение предложения
      const sentenceEnders = /[.!?]\s*/;
      const match = this.textBuffer.match(sentenceEnders);

      if (match) {
        // Нашли завершение предложения
        const sentenceEndIndex = match.index! + match[0].length;
        const sentence = this.textBuffer.substring(0, sentenceEndIndex).trim();
        this.textBuffer = this.textBuffer.substring(sentenceEndIndex);

        if (sentence) {
          onLog?.(`🔊 TTS: отправка на озвучку: "${sentence}"`);
          await this.speak(sentence, onLog);
        }
      }
    }).catch((err) => {
      console.error('TTS queue error:', err);
    });
  }

  /**
   * Озвучивает оставшийся текст
   */
  async flush(onLog?: (message: string) => void) {
    this.processingQueue = this.processingQueue.then(async () => {
      const remaining = this.textBuffer.trim();
      if (remaining) {
        onLog?.(`🔊 TTS: отправка остатка на озвучку: "${remaining}"`);
        await this.speak(remaining, onLog);
        this.textBuffer = '';
      }
    }).catch((err) => {
      console.error('TTS queue error:', err);
    });

    // allow caller to await completion
    return this.processingQueue;
  }

  /**
   * Очищает текст от markdown форматирования и специальных символов
   */
  private cleanText(text: string): string {
    let cleaned = text;
    
    // Удаляем блоки кода (многострочные) сначала
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    
    // Удаляем парные markdown символы (содержимое сохраняем)
    cleaned = cleaned.replace(/\*\*([^*]+?)\*\*/g, '$1');  // **текст** -> текст
    cleaned = cleaned.replace(/__([^_]+?)__/g, '$1');      // __текст__ -> текст
    cleaned = cleaned.replace(/\*([^*\n]+?)\*/g, '$1');    // *текст* -> текст (не на новой строке)
    cleaned = cleaned.replace(/_([^_\n]+?)_/g, '$1');      // _текст_ -> текст (не на новой строке)
    cleaned = cleaned.replace(/~~([^~]+?)~~/g, '$1');      // ~~текст~~ -> текст
    cleaned = cleaned.replace(/`([^`]+?)`/g, '$1');        // `код` -> код
    
    // Удаляем оставшиеся одиночные markdown символы (непарные)
    cleaned = cleaned.replace(/\*\*+/g, '');  // ** или *** -> удаляем
    cleaned = cleaned.replace(/\*+/g, '');    // * или *** -> удаляем
    cleaned = cleaned.replace(/__+/g, '');    // __ -> удаляем
    cleaned = cleaned.replace(/_+/g, ' ');    // _ -> пробел
    cleaned = cleaned.replace(/~~+/g, '');    // ~~ -> удаляем
    cleaned = cleaned.replace(/`+/g, '');     // ` -> удаляем
    
    // Удаляем заголовки markdown
    cleaned = cleaned.replace(/#{1,6}\s+/g, '');
    
    // Удаляем ссылки markdown [текст](url) -> текст
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    // Удаляем лишние пробелы
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Озвучивает текст через бэкенд TTS
   */
  private async speak(text: string, onLog?: (message: string) => void): Promise<void> {
    if (!text.trim()) return;

    // Очищаем текст от markdown
    const cleanedText = this.cleanText(text);
    
    if (!cleanedText.trim()) {
      onLog?.('🔊 TTS: текст пуст после очистки, пропускаем');
      return;
    }

    try {
      onLog?.(`🔊 TTS: синтез речи для текста (${cleanedText.length} символов): "${cleanedText}"`);
      
      // Получаем аудио от бэкенда
      const audioBlob = await ttsApi.synthesize({ text: cleanedText, language: 'ru' });
      onLog?.(`🔊 TTS: аудио получено (${audioBlob.size} байт)`);
      
      const audioUrl = URL.createObjectURL(audioBlob);

      // Создаем аудио элемент
      const audio = new Audio(audioUrl);
      
      // Добавляем в очередь
      this.audioQueue.push(audio);

      // Воспроизводим если ничего не играет
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  }

  /**
   * Воспроизводит следующий аудио из очереди
   */
  private playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.notifyPlayingStateChange();
      return;
    }

    this.isPlaying = true;
    this.notifyPlayingStateChange();
    const audio = this.audioQueue.shift()!;
    this.currentAudio = audio; // Сохраняем ссылку на текущий аудио

    audio.onended = () => {
      // Очищаем URL
      URL.revokeObjectURL(audio.src);
      // Сбрасываем ссылку на текущий аудио
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
      // Воспроизводим следующий
      this.playNext();
    };

    audio.onerror = (error) => {
      console.error('Audio playback error:', error);
      URL.revokeObjectURL(audio.src);
      this.playNext();
    };

    audio.play().catch((error) => {
      console.error('Audio play error:', error);
      this.playNext();
    });
  }

  /**
   * Останавливает озвучивание
   */
  stop() {
    // Останавливаем текущее воспроизведение
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // Очищаем очередь
    this.audioQueue.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      URL.revokeObjectURL(audio.src);
    });
    this.audioQueue = [];

    this.isPlaying = false;
    this.textBuffer = '';
    this.notifyPlayingStateChange();
  }

  /**
   * Проверяет доступность TTS
   */
  isAvailable(): boolean {
    return this.audioContext !== null;
  }

  /**
   * Проверяет, идет ли воспроизведение
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Устанавливает колбэк для уведомления об изменении состояния воспроизведения
   */
  setOnPlayingStateChange(callback: (isPlaying: boolean) => void) {
    this.onPlayingStateChange = callback;
  }

  /**
   * Уведомляет о изменении состояния воспроизведения
   */
  private notifyPlayingStateChange() {
    if (this.onPlayingStateChange) {
      this.onPlayingStateChange(this.isPlaying);
    }
  }
}

export const ttsManager = new TTSManager();
