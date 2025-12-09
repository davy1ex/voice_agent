import type { Message } from '@/entities/message/model/types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 shadow-sm
          ${isUser 
            ? 'bg-blue-500 text-white rounded-br-sm' 
            : isAssistant
            ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
            : 'bg-gray-200 text-gray-700'
          }
        `}
      >
        <div className="break-words whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>
        <div
          className={`
            text-xs mt-2 opacity-70
            ${isUser ? 'text-blue-100' : 'text-gray-500'}
          `}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

