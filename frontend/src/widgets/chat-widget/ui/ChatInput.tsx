import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendText: (text: string) => void;
  onSendVoice: () => void;
  isRecording?: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSendText,
  onSendVoice,
  isRecording = false,
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSendText = () => {
    const trimmedText = text.trim();
    if (trimmedText && !disabled) {
      onSendText(trimmedText);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-end gap-2">
        {/* Input field */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение... (Enter для отправки, Shift+Enter для новой строки)"
            disabled={disabled || isRecording}
            rows={1}
            className={`
              w-full px-4 py-2 border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              resize-none overflow-hidden
              disabled:bg-gray-100 disabled:cursor-not-allowed
              max-h-32
            `}
          />
        </div>

        {/* Voice message button */}
        <button
          onClick={onSendVoice}
          disabled={disabled || !!text.trim()}
          className={`
            p-3 rounded-lg transition-colors flex-shrink-0
            ${isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title={isRecording ? 'Идет запись...' : 'Отправить голосовое сообщение'}
        >
          {isRecording ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 9a1 1 0 10-2 0v2a1 1 0 102 0V9z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Send text button */}
        <button
          onClick={handleSendText}
          disabled={disabled || !text.trim() || isRecording}
          className={`
            px-4 py-3 bg-blue-500 text-white rounded-lg
            hover:bg-blue-600 transition-colors flex-shrink-0
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2
          `}
          title="Отправить сообщение (Enter)"
        >
          <span className="hidden sm:inline">Отправить</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

