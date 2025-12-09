import { useAudioRecorder } from '../model/useAudioRecorder';
import { transcriptionApi } from '../api/transcriptionApi';
import type { LogEntry } from '@/shared/types/log';

interface RecordButtonProps {
  onLog: (log: LogEntry) => void;
}

export function RecordButton({ onLog }: RecordButtonProps) {
  const { isRecording, isProcessing, error, startRecording, stopRecording } = useAudioRecorder();

  const handleClick = async () => {
    if (isRecording) {
      onLog({ type: 'info', message: 'Остановка записи...', timestamp: new Date() });
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        onLog({ 
          type: 'success', 
          message: `Запись завершена. Размер: ${(audioBlob.blob.size / 1024).toFixed(2)} KB`, 
          timestamp: new Date() 
        });
        
        onLog({ type: 'info', message: 'Отправка на бэкенд...', timestamp: new Date() });
        
        try {
          const response = await transcriptionApi.transcribe(audioBlob.blob);
          onLog({ 
            type: 'success', 
            message: `✅ Ответ от бэкенда получен`, 
            timestamp: new Date() 
          });
          onLog({ 
            type: 'info', 
            message: `📝 Транскрибация: "${response.text}"`, 
            timestamp: new Date() 
          });
          if (response.intent) {
            onLog({ 
              type: 'info', 
              message: `🎯 Intent: ${response.intent}`, 
              timestamp: new Date() 
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при отправке';
          onLog({ 
            type: 'error', 
            message: `❌ Ошибка отправки: ${errorMessage}`, 
            timestamp: new Date() 
          });
          onLog({ 
            type: 'warning', 
            message: '💡 Убедитесь, что бэкенд запущен на http://localhost:8000', 
            timestamp: new Date() 
          });
        }
      }
    } else {
      onLog({ type: 'info', message: 'Начало записи...', timestamp: new Date() });
      await startRecording();
      if (!error) {
        onLog({ type: 'success', message: 'Запись начата', timestamp: new Date() });
      } else {
        onLog({ type: 'error', message: `Ошибка: ${error}`, timestamp: new Date() });
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className={`
        px-6 py-3 rounded-lg font-semibold text-white transition-all
        ${isRecording 
          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
          : 'bg-blue-500 hover:bg-blue-600'
        }
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {isProcessing ? 'Обработка...' : isRecording ? '⏹ Остановить запись' : '🎤 Начать запись'}
    </button>
  );
}

