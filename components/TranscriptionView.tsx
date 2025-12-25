
import React, { useState, useRef } from 'react';
import { AppStatus } from '../types';
import { transcribeAudio } from '../services/geminiService';
import { exportToPdf, exportToDoc } from '../utils/exportUtils';

const TranscriptionView: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => setAudioBlob(new Blob(chunks, { type: 'audio/webm' }));
      recorder.start();
      mediaRecorderRef.current = recorder;
      setStatus(AppStatus.RECORDING);
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e) { setError("Mic access denied"); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerIntervalRef.current!);
    setStatus(AppStatus.IDLE);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setStatus(AppStatus.PROCESSING);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await transcribeAudio(base64, audioBlob.type);
        setTranscript(res);
        setStatus(AppStatus.COMPLETED);
      };
    } catch (e: any) { setError(e.message); setStatus(AppStatus.ERROR); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl border-gray-100 bg-gray-50/50">
          {status === AppStatus.RECORDING ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-500 rounded-full animate-pulse mx-auto flex items-center justify-center text-white font-mono">{recordingTime}s</div>
              <button onClick={stopRecording} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold">Stop Recording</button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <button onClick={startRecording} className="w-16 h-16 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center mx-auto hover:bg-emerald-700 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              </button>
              <p className="font-bold text-gray-700">Record Live Transcription</p>
              <p className="text-xs text-gray-400">Captures with AI speaker diarization</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl border-gray-100 bg-gray-50/50 relative">
          <input type="file" accept="audio/*" onChange={(e) => setAudioBlob(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
          <svg className="w-16 h-16 text-blue-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          {/* Fix: audioBlob name property check because Blob does not have name, but File does. Use type check for safety. */}
          <p className="font-bold text-gray-700">{audioBlob ? (audioBlob instanceof File ? (audioBlob as File).name : 'Live Recording') : 'Upload Audio File'}</p>
          <p className="text-xs text-gray-400">MP3, WAV, M4A</p>
        </div>
      </div>

      {audioBlob && (
        <div className="flex justify-center">
          <button 
            onClick={handleTranscribe} 
            disabled={status === AppStatus.PROCESSING}
            className="px-12 py-4 bg-emerald-600 text-white rounded-lg font-bold shadow-xl hover:bg-emerald-700 disabled:bg-gray-300 flex items-center gap-3 transition-all transform hover:scale-105"
          >
            {status === AppStatus.PROCESSING ? 'AI Diarizing Content...' : 'Start Official Transcription'}
          </button>
        </div>
      )}

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-800">Transcript Record</h3>
          {transcript && (
            <div className="flex gap-2">
              <button onClick={() => exportToDoc(transcript, 'EthioGov_Transcript')} className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-200">DOCX</button>
              <button onClick={() => exportToPdf(transcript, 'EthioGov_Transcript')} className="px-3 py-1 bg-red-50 text-red-700 rounded text-xs font-bold border border-red-200">PDF</button>
            </div>
          )}
        </div>
        <textarea 
          readOnly 
          className="w-full min-h-[300px] p-6 bg-gray-50 border-gray-100 rounded-lg outline-none font-medium leading-relaxed" 
          value={transcript} 
          placeholder="Transcription with speaker labels will appear here..."
        />
      </div>
    </div>
  );
};

export default TranscriptionView;
