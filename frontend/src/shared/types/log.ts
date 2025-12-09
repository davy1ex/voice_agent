export type LogType = 'info' | 'success' | 'error' | 'warning';

export interface LogEntry {
  type: LogType;
  message: string;
  timestamp: Date;
}

