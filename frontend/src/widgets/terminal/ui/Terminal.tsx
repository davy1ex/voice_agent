import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/shared/types/log';

interface TerminalProps {
  logs: LogEntry[];
}

export function Terminal({ logs }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Autoscroll to the latest log
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
      <div className="mb-2 text-gray-400 text-xs border-b border-gray-700 pb-1">
        Терминал (логи) {logs.length > 0 && `(${logs.length})`}
      </div>
      <div 
        ref={terminalRef}
        className="space-y-1 h-64 overflow-y-auto"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">Нет логов. Нажмите кнопку записи для начала...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 hover:bg-gray-800 px-1 py-0.5 rounded">
              <span className="text-gray-500 text-xs flex-shrink-0">{formatTime(log.timestamp)}</span>
              <span className={`${getLogColor(log.type)} flex-shrink-0 w-4 text-center`}>
                {getLogIcon(log.type)}
              </span>
              <span className={`${getLogColor(log.type)} flex-1 break-words`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

