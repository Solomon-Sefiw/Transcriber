
export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type AppTab = 'transcription' | 'archives' | 'intelligence' | 'studio' | 'live';

export type UserRole = 'Admin' | 'Judge' | 'Clerk';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface JudicialRecord {
  id: string;
  title: string;
  transcript: string;
  createdAt: string;
  ownerId: string;
  fileSize: string;
}

export interface TranscriptionResponse {
  transcript: string;
  language: string;
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}
