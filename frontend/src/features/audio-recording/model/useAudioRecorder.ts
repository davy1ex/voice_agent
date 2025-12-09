import { useState, useRef, useCallback } from 'react';
import type { AudioRecorderState, AudioBlob } from './types';

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isProcessing: false,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setState({ isRecording: false, isProcessing: true, error: null });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setState({ isRecording: true, isProcessing: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setState({ isRecording: false, isProcessing: false, error: errorMessage });
    }
  }, []);

  const stopRecording = useCallback((): Promise<AudioBlob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !state.isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioBlobData: AudioBlob = {
          blob: audioBlob,
          duration: 0, // Can be calculated via AudioContext
          timestamp: new Date(),
        };

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setState({ isRecording: false, isProcessing: false, error: null });
        resolve(audioBlobData);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    });
  }, [state.isRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}

