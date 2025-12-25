
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
      if (liveSessionRef.current) liveSessionRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getStatusDisplay = () => {
    switch (status) {
      case AppStatus.RECORDING:
        return { label: 'Live Recording', color: 'bg-red-500', icon: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z M19 10v1a7 7 0 01-14 0v-1 M12 18.5V21 M8 21h8' };
      case AppStatus.PROCESSING:
        return { label: 'AI Processing', color: 'bg-blue-500', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' };
      case AppStatus.COMPLETED:
        return { label: 'Success', color: 'bg-emerald-500', icon: 'M5 13l4 4L19 7' };
      case AppStatus.ERROR:
        return { label: 'Error', color: 'bg-orange-500', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
      default:
        return { label: 'System Ready', color: 'bg-gray-400', icon: 'M5 13l4 4L19 7' };
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

      // Setup Live API for Real-time Transcription
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
              const text = msg.serverContent.inputTranscription.text;
              setTranscript(prev => prev + (prev ? ' ' : '') + text);
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a silent Ethiopian Government transcriber. Output text for every word heard.",
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

  const s = getStatusDisplay();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Status Banner */}
      <div className="flex items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300">
        <div className={`w-12 h-12 ${s.color} rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={s.icon}></path>
          </svg>
        </div>
        <div className="flex-grow">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Operational Status</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-gray-900">{s.label}</h3>
            {status === AppStatus.RECORDING && <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>}
          </div>
        </div>
        {language && (
          <div className="text-right border-l border-gray-100 pl-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detected Language</p>
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 uppercase tracking-tight">
              {language}
            </span>
          </div>
        )}
        {status === AppStatus.RECORDING && (
          <div className="text-right border-l border-gray-100 pl-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</p>
            <p className="text-xl font-mono font-black text-red-600">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Methods */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-slate-50 border-4 border-emerald-100 rounded-full flex items-center justify-center">
             <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
          <div>
            <h4 className="font-black text-gray-900">Live Voice Transcription</h4>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">Speak directly into your microphone for real-time document creation.</p>
          </div>
          {status === AppStatus.RECORDING ? (
            <button onClick={stopRecording} className="w-full py-4 bg-red-600 text-white rounded-xl font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
              Finalize Recording
            </button>
          ) : (
            <button onClick={startRecording} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">
              Initiate Real-time Capture
            </button>
          )}
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6 relative group transition-colors hover:bg-slate-50">
          <input 
            type="file" 
            accept="audio/*" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setAudioBlob(file); setLanguage(''); setTranscript(''); }
            }} 
            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
          />
          <div className="w-24 h-24 bg-slate-50 border-4 border-blue-100 rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
             <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </div>
          <div>
            <h4 className="font-black text-gray-900">Official Batch Upload</h4>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2 truncate">
              {audioBlob ? (audioBlob instanceof File ? audioBlob.name : 'Stream Captured') : 'Upload pre-recorded media for deep AI refinement.'}
            </p>
          </div>
          {audioBlob && status === AppStatus.IDLE && (
            <button onClick={handleBatchRefine} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all z-20">
              Run Diarization & Detection
            </button>
          ) : (
            <div className="w-full py-4 bg-slate-200 text-slate-500 rounded-xl font-black text-sm">Select File to Proceed</div>
          )}
        </div>
      </div>

      {/* Output Area */}
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-gray-900">Official Document Record</h3>
            {status === AppStatus.PROCESSING && <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          {transcript && (
            <div className="flex gap-3">
              <button onClick={() => exportToDoc(transcript, 'EthioGov_Transcript')} className="px-5 py-2.5 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Export DOC
              </button>
              <button onClick={() => exportToPdf(transcript, 'EthioGov_Transcript')} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                Export PDF
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-sm font-bold flex items-center gap-3 animate-shake">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
            {error}
          </div>
        )}

        <textarea 
          readOnly 
          className="w-full min-h-[500px] p-8 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium leading-relaxed resize-none shadow-inner text-slate-800 text-lg transition-colors focus:bg-white" 
          value={transcript} 
          placeholder="Official transcription will manifest here as audio is processed..."
        />
      </div>
    </div>
  );
};

export default TranscriptionView;
