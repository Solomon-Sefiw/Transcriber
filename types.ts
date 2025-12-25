
export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type AppTab = 'transcription' | 'intelligence' | 'studio' | 'live';

export interface TranscriptionResponse {
  transcript: string;
  language: string;
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}
