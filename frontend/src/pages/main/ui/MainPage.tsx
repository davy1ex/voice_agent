import { useState, useRef, useEffect } from 'react';
import { ChatWidget } from '@/widgets/chat-widget';
import { Terminal } from '@/widgets/terminal';
import { SettingsButton } from '@/widgets/settings-widget';
import { useAudioRecorder } from '@/features/audio-recording';
import { transcriptionApi } from '@/features/audio-recording/api/transcriptionApi';
import { ollamaApi } from '@/features/ollama';
import { ttsManager } from '@/shared/lib/tts';
import type { LogEntry } from '@/shared/types/log';
import type { AppSettings } from '@/shared/types/settings';
import type { Message } from '@/entities/message/model/types';

export function MainPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [chatStatus, setChatStatus] = useState<string | null>(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track TTS playing state
  useEffect(() => {
    ttsManager.setOnPlayingStateChange((isPlaying) => {
      setIsTTSPlaying(isPlaying);
    });
  }, []);

  const handleLog = (log: LogEntry) => {
    setLogs((prev) => [...prev, log]);
  };

  const handleSettingsChange = (settings: AppSettings) => {
    handleLog({
      type: 'info',
      message: `Настройки обновлены: Ollama ${settings.ollamaHost}, модель ${settings.ollamaModel}, Whisper ${settings.whisperModel}`,
      timestamp: new Date(),
    });
  };

  const handleExportHistory = () => {
    if (messages.length === 0) {
      handleLog({
        type: 'warning',
        message: 'No messages to export',
        timestamp: new Date(),
      });
      return;
    }

    // Build dialog text
    const dialogText = messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'Пользователь' : 'Ассистент';
        const time = new Date(msg.timestamp).toLocaleString('ru-RU');
        return `[${time}] ${role}:\n${msg.content}\n`;
      })
      .join('\n---\n\n');

    // Create and download the file
    const blob = new Blob([dialogText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-agent-dialog-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    handleLog({
      type: 'success',
      message: `✅ Диалог экспортирован (${messages.length} сообщений)`,
      timestamp: new Date(),
    });
  };

  const handleClearHistory = () => {
    if (messages.length === 0) {
      handleLog({
        type: 'info',
        message: 'История уже пуста',
        timestamp: new Date(),
      });
      return;
    }

    if (window.confirm(`Вы уверены, что хотите очистить историю диалога? (${messages.length} сообщений)`)) {
      setMessages([]);
      handleLog({
        type: 'success',
        message: '✅ История диалога очищена',
        timestamp: new Date(),
      });
    }
  };

  const addMessage = (role: Message['role'], content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const sendPromptToAI = async (prompt: string, useStream = true, enableTTS = true) => {
    handleLog({
      type: 'info',
      message: `Отправка промпта в Ollama...`,
      timestamp: new Date(),
    });

    if (useStream) {
      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsGenerating(true);
      setChatStatus('Генерация ответа...');
      
      // Stop previous TTS if still playing
      if (enableTTS && ttsManager.isAvailable()) {
        ttsManager.stop();
      }
      
      // Build message history BEFORE adding new assistant message
      // Skip empty messages (just created)
      const history = messages
        .filter(msg => (msg.role === 'user' || msg.role === 'assistant') && msg.content.trim() !== '')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
      
      // Log history for debugging
      console.log(`[MainPage] Sending history: ${history.length} messages`);
      if (history.length > 0) {
        console.log(`[MainPage] Last 3 messages:`, history.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 50)}...`));
      }
      
      // Create assistant message for streaming AFTER history is built
      const assistantMessage = addMessage('assistant', '');
      
      try {
        await ollamaApi.stream(
          { prompt, history },
          (chunk) => {
            // Skip if the request was aborted
            if (abortController.signal.aborted) {
              return;
            }
            // Update message while chunks arrive
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
            
            // Send chunk to TTS for realtime playback
            if (enableTTS && ttsManager.isAvailable()) {
              ttsManager.addChunk(chunk, (logMessage) => {
                handleLog({
                  type: 'info',
                  message: logMessage,
                  timestamp: new Date(),
                });
              });
            }
          },
          (error) => {
            setIsGenerating(false);
            abortControllerRef.current = null;
            setChatStatus(null);

            handleLog({
              type: 'error',
              message: `❌ Ошибка AI: ${error}`,
              timestamp: new Date(),
            });
            // Stop TTS on error
            if (enableTTS) {
              ttsManager.stop();
            }
            // Update message with error text
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: 'Извините, произошла ошибка при обработке запроса.' }
                  : msg
              )
            );
          },
          () => {
            // Skip if the request was aborted
            if (abortController.signal.aborted) {
              return;
            }

            setIsGenerating(false);
            abortControllerRef.current = null;
            setChatStatus(null);

            handleLog({
              type: 'success',
              message: `✅ Ответ от AI получен (стриминг завершен)`,
              timestamp: new Date(),
            });
            
            // Speak out remaining buffered text
            if (enableTTS && ttsManager.isAvailable()) {
              ttsManager.flush((logMessage) => {
                handleLog({
                  type: 'info',
                  message: logMessage,
                  timestamp: new Date(),
                });
              }).then(() => {
                handleLog({
                  type: 'info',
                  message: `🔊 Озвучивание завершено`,
                  timestamp: new Date(),
                });
              });
            }
          },
          abortController
        );
      } catch (error) {
        setIsGenerating(false);
        abortControllerRef.current = null;
        setChatStatus(null);

        // If error caused by abort, don't treat as failure
        if (error instanceof Error && error.name === 'AbortError') {
          handleLog({
            type: 'info',
            message: `⏹️ Генерация остановлена пользователем`,
            timestamp: new Date(),
          });
          // Update message content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: msg.content || 'Генерация остановлена.' }
                : msg
            )
          );
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при отправке';
          handleLog({
            type: 'error',
            message: `❌ Ошибка AI: ${errorMessage}`,
            timestamp: new Date(),
          });
          // Update message with error text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: 'Извините, произошла ошибка при обработке запроса.' }
                : msg
            )
          );
        }
        // Stop TTS on error
        if (enableTTS) {
          ttsManager.stop();
        }
      }
    } else {
      // Non-streaming fallback (backward compatibility)
      try {
        const response = await ollamaApi.generate({ prompt });
        
        handleLog({
          type: 'success',
          message: `✅ Ответ от AI получен`,
          timestamp: new Date(),
        });

        return response.response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при отправке';
        handleLog({
          type: 'error',
          message: `❌ Ошибка AI: ${errorMessage}`,
          timestamp: new Date(),
        });
        throw error;
      }
    }
  };

  const handleSendText = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    addMessage('user', text);
    handleLog({
      type: 'info',
      message: `Отправлено текстовое сообщение: "${text}"`,
      timestamp: new Date(),
    });

    // Send to AI (streaming)
    await sendPromptToAI(text, true);
  };

  const handleStop = () => {
    // Abort Ollama streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop TTS
    ttsManager.stop();
    
    setIsGenerating(false);
    setChatStatus(null);
    
    handleLog({
      type: 'info',
      message: '⏹️ Остановка генерации...',
      timestamp: new Date(),
    });
  };

  const handleSendVoice = async () => {
    if (isRecording) {
      // Stop recording
      handleLog({ type: 'info', message: 'Остановка записи...', timestamp: new Date() });
      const audioBlob = await stopRecording();

      if (audioBlob) {
        handleLog({
          type: 'success',
          message: `Запись завершена. Размер: ${(audioBlob.blob.size / 1024).toFixed(2)} KB`,
          timestamp: new Date(),
        });

        handleLog({ type: 'info', message: 'Отправка на бэкенд...', timestamp: new Date() });
        setChatStatus('Транскрибация...');

        try {
          const response = await transcriptionApi.transcribe(audioBlob.blob);
          handleLog({
            type: 'success',
            message: `✅ Транскрибация получена`,
            timestamp: new Date(),
          });

          // Add transcribed text as a user message
          addMessage('user', response.text);
          handleLog({
            type: 'info',
            message: `📝 Текст: "${response.text}"`,
            timestamp: new Date(),
          });

          // Send transcribed text to AI (streaming)
          await sendPromptToAI(response.text, true);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при отправке';
          setChatStatus(null);
          handleLog({
            type: 'error',
            message: `❌ Ошибка отправки: ${errorMessage}`,
            timestamp: new Date(),
          });
        }
      }
    } else {
      // Start recording
      handleLog({ type: 'info', message: 'Начало записи...', timestamp: new Date() });
      await startRecording();
      handleLog({ type: 'success', message: 'Запись начата', timestamp: new Date() });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">AI Agent</h1>
          <div className="flex items-center gap-3">
            {(isGenerating || isTTSPlaying) && (
              <button
                onClick={handleStop}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <span>⏹️</span>
                <span>Остановить</span>
              </button>
            )}
            <SettingsButton
              onSettingsChange={handleSettingsChange}
              onExportHistory={handleExportHistory}
              onClearHistory={handleClearHistory}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Chat */}
          <div className="h-[600px]">
            <ChatWidget
              messages={messages}
              onSendText={handleSendText}
              onSendVoice={handleSendVoice}
              isRecording={isRecording}
              status={chatStatus}
            />
          </div>

          {/* Terminal */}
          <div>
            <Terminal logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}

