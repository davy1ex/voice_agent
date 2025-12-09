import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { Message } from '@/entities/message/model/types';

interface ChatWidgetProps {
  messages: Message[];
  onSendText: (text: string) => void;
  onSendVoice: () => void;
  isRecording?: boolean;
  disabled?: boolean;
  className?: string;
  status?: string | null;
}

export function ChatWidget({
  messages,
  onSendText,
  onSendVoice,
  isRecording = false,
  disabled = false,
  className = '',
  status = null,
}: ChatWidgetProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autoscroll to the latest message
  const scrollToBottom = (force = false) => {
    if (!force && isUserScrolling) {
      return; // Do not scroll if user scrolls manually
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Autoscroll only when user is not scrolling manually
  useEffect(() => {
    if (!isUserScrolling) {
      // Small delay to measure height correctly
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Detect if user is manually scrolling
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    // If user is near bottom (within 50px), treat as at bottom
    const isAtBottom = scrollBottom <= 50;

    // If user scrolls up (far from bottom), set flag
    if (!isAtBottom) {
      setIsUserScrolling(true);
      
      // Clear previous timer
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Reset flag 2s after last scroll
      // Allows returning to autoscroll once user stops scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        // Check if user is still away from bottom
        const currentScrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (currentScrollBottom > 50) {
          // User still away from bottom, keep flag
          return;
        }
        setIsUserScrolling(false);
      }, 2000);
    } else {
      // User is at bottom, reset flag
      setIsUserScrolling(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold text-gray-900">Чат</h2>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p>Начните разговор</p>
              <p className="text-sm mt-1">Отправьте текстовое или голосовое сообщение</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {status && (
              <div className="flex items-center justify-center py-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>{status}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white rounded-b-lg">
        <ChatInput
          onSendText={onSendText}
          onSendVoice={onSendVoice}
          isRecording={isRecording}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

