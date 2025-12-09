// Types for audio-recording feature

export interface AudioRecorderState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
}

export interface AudioBlob {
  blob: Blob;
  duration: number;
  timestamp: Date;
}

