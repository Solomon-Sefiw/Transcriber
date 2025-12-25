
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus } from '../types';
import { transcribeAudio } from '../services/geminiService';
import { exportToPdf, exportToDoc } from '../utils/exportUtils';
import { GoogleGenAI, Modality } from '@google/genai';

const TranscriptionView: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const liveSessionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case AppStatus.RECORDING: return { label: 'Recording', color: 'bg-red-500', icon: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z M19 10v1a7 7 0 01-14 0v-1' };
      case AppStatus.PROCESSING: return { label: 'Processing', color: 'bg-blue-500', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9' };
      case AppStatus.COMPLETED: return { label: 'Success', color: 'bg-emerald-500', icon: 'M5 13l4 4L19 7' };
      case AppStatus.ERROR: return { label: 'Error', color: 'bg-orange-500', icon: 'M12 8v4m0 4h.01' };
      default: return { label: 'System Idle', color: 'bg-slate-400', icon: 'M5 13l4 4L19 7' };
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setLanguage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
      recorder.start();
      mediaRecorderRef.current = recorder;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              let binary = '';
              const bytes = new Uint8Array(int16.buffer);
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: (msg) => {
            if (msg.serverContent?.inputTranscription?.text) {
              setTranscript(prev => prev + (prev ? ' ' : '') + msg.serverContent.inputTranscription.text);
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "Silent government transcriber. Transcribe input verbatim.",
          inputAudioTranscription: {}
        }
      });

      liveSessionRef.current = await sessionPromise;
      setStatus(AppStatus.RECORDING);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e) {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    liveSessionRef.current?.close();
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus(AppStatus.IDLE);
  };

  const handleBatchRefine = async () => {
    if (!audioBlob) return;
    setStatus(AppStatus.PROCESSING);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await transcribeAudio(base64, audioBlob.type);
        setTranscript(res.transcript);
        setLanguage(res.language);
        setStatus(AppStatus.COMPLETED);
      };
    } catch (e: any) {
      setError(e.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const config = getStatusConfig();

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className={`w-12 h-12 ${config.color} rounded-full flex items-center justify-center text-white shadow-lg`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={config.icon}></path></svg>
        </div>
        <div className="flex-grow">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Status</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-gray-900">{config.label}</h3>
            {status === AppStatus.RECORDING && <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>}
          </div>
        </div>
        {language && (
          <div className="text-right border-l pl-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Language</p>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">{language}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-slate-50 border-4 border-emerald-100 rounded-full flex items-center justify-center">
             <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
          <button 
            onClick={status === AppStatus.RECORDING ? stopRecording : startRecording}
            className={`w-full py-4 ${status === AppStatus.RECORDING ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl font-black shadow-lg transition-all`}
          >
            {status === AppStatus.RECORDING ? `Stop (${Math.floor(recordingTime/60)}:${(recordingTime%60).toString().padStart(2,'0')})` : 'Start Real-time Recording'}
          </button>
        </div>

        <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6 relative group">
          <input type="file" accept="audio/*" onChange={(e) => setAudioBlob(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
          <div className="w-20 h-20 bg-slate-50 border-4 border-blue-100 rounded-full flex items-center justify-center">
             <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </div>
          {audioBlob && status === AppStatus.IDLE ? (
            <button onClick={handleBatchRefine} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black shadow-lg z-20">Process {audioBlob.name}</button>
          ) : (
            <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl font-black">Upload Official Audio</div>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-gray-900">Document Transcript</h3>
          {transcript && (
            <div className="flex gap-3">
              <button onClick={() => exportToDoc(transcript, 'EthioGov_Transcript')} className="px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl">DOC</button>
              <button onClick={() => exportToPdf(transcript, 'EthioGov_Transcript')} className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl">PDF</button>
            </div>
          )}
        </div>
        <textarea readOnly className="w-full min-h-[400px] p-8 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium leading-relaxed resize-none shadow-inner text-slate-800 text-lg" value={transcript} placeholder="Awaiting transcription input..." />
      </div>
    </div>
  );
};

export default TranscriptionView;
