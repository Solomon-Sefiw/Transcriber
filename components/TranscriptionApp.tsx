
import React, { useState, useRef, useCallback } from 'react';
/* Import AppTab for state typing */
import { AppStatus, AppTab } from '../types';
import { transcribeAudio } from '../services/geminiService';
import { exportToPdf, exportToDoc } from '../utils/exportUtils';
import Header from './Header';
import Footer from './Footer';

const TranscriptionApp: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  /* Added activeTab state to satisfy Header component requirements */
  const [activeTab, setActiveTab] = useState<AppTab>('transcription');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Timer logic for recording
  const startTimer = () => {
    setRecordingTime(0);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setStatus(AppStatus.IDLE);
      };

      recorder.start();
      setStatus(AppStatus.RECORDING);
      startTimer();
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === AppStatus.RECORDING) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      stopTimer();
    }
  };

  // Upload Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError("Invalid file type. Please upload an audio file.");
        return;
      }
      setAudioBlob(file);
      setError(null);
    }
  };

  // Transcription Process
  const handleTranscribe = async () => {
    if (!audioBlob) return;

    /* Changed AppStatus.TRANSCRIBING to AppStatus.PROCESSING to match enum in types.ts */
    setStatus(AppStatus.PROCESSING);
    setError(null);

    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = audioBlob.type || 'audio/webm';
        
        try {
          const resultText = await transcribeAudio(base64String, mimeType);
          setTranscript(resultText);
          setStatus(AppStatus.COMPLETED);
        } catch (err: any) {
          setError(err.message || "An unexpected error occurred during transcription.");
          setStatus(AppStatus.ERROR);
        }
      };
    } catch (err) {
      setError("Failed to process audio file.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = () => {
    setAudioBlob(null);
    setTranscript('');
    setStatus(AppStatus.IDLE);
    setError(null);
    setRecordingTime(0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Provided required props to Header component to fix missing props error */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          {/* Action Panel */}
          <div className="p-8 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              Input Control
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Record Section */}
              <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-white border-2 border-dashed border-gray-200 hover:border-emerald-300 transition-all">
                {status === AppStatus.RECORDING ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-red-100 rounded-full animate-ping absolute"></div>
                      <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center relative z-10 shadow-lg">
                        <span className="text-white font-mono font-bold text-sm">{formatTime(recordingTime)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={stopRecording}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-md transition-colors"
                    >
                      Stop Recording
                    </button>
                    <p className="text-xs text-gray-500 font-medium">Recording live audio...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <button 
                      onClick={startRecording}
                      /* Changed AppStatus.TRANSCRIBING to AppStatus.PROCESSING to fix missing property error */
                      disabled={status === AppStatus.PROCESSING}
                      className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105"
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    </button>
                    <div className="text-center">
                      <p className="font-bold text-gray-700">Record Live Audio</p>
                      <p className="text-sm text-gray-400">Capture meeting or interview</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-white border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all relative">
                <input 
                  type="file" 
                  accept="audio/*"
                  onChange={handleFileUpload}
                  /* Changed AppStatus.TRANSCRIBING to AppStatus.PROCESSING to fix missing property error */
                  disabled={status === AppStatus.PROCESSING || status === AppStatus.RECORDING}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-700">Upload Audio File</p>
                    <p className="text-sm text-gray-400">MP3, WAV, M4A up to 25MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Selection Info */}
            {audioBlob && status !== AppStatus.RECORDING && (
              <div className="mt-8 flex items-center justify-between bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-200 rounded text-emerald-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Audio Ready</p>
                    <p className="text-xs text-emerald-600">Size: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Remove
                  </button>
                  <button 
                    onClick={handleTranscribe}
                    /* Changed AppStatus.TRANSCRIBING to AppStatus.PROCESSING to fix missing property error */
                    disabled={status === AppStatus.PROCESSING}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2"
                  >
                    {/* Changed AppStatus.TRANSCRIBING to AppStatus.PROCESSING to fix missing property error */}
                    {status === AppStatus.PROCESSING ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Transcribing...
                      </>
                    ) : (
                      "Begin Transcription"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Display */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Transcription Output
              </h2>
              
              {transcript && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => exportToDoc(transcript, 'Transcription_Ethio')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold border border-blue-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Export DOC
                  </button>
                  <button 
                    onClick={() => exportToPdf(transcript, 'Transcription_Ethio')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-bold border border-red-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    Export PDF
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p className="text-sm font-bold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="relative">
              <textarea 
                readOnly
                placeholder="The transcription text will appear here once processing is complete..."
                className="w-full min-h-[400px] p-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-medium leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={transcript}
              />
              
              {/* Changed AppStatus.TRANSCRIBING to AppStatus.PROCESSING to fix missing property error */}
              {status === AppStatus.PROCESSING && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce delay-75"></div>
                      <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce delay-150"></div>
                      <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce delay-300"></div>
                    </div>
                    <p className="text-sm font-bold text-emerald-800">Processing Audio Content...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Secure Processing</h3>
            <p className="text-sm text-gray-500">Official government-grade encryption for all audio processing and data storage.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5a18.022 18.022 0 01-3.827-5.802m3.307 9.311a8.878 8.878 0 01-3.307-2.044m3.307 2.044Q10 15 12 13m-1.772 2.139a7.108 7.108 0 01-2.341-2.341"></path></svg>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Multi-Lingual</h3>
            <p className="text-sm text-gray-500">Native support for Amharic, Oromo, Tigrinya, and English audio content.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Smart Formatting</h3>
            <p className="text-sm text-gray-500">Intelligent punctuation and structure for highly readable professional transcripts.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TranscriptionApp;
