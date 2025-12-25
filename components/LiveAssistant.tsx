
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const LiveAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const startSession = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          setIsActive(true);
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            
            let binary = '';
            const bytes = new Uint8Array(int16.buffer);
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            
            sessionPromise.then(s => s.sendRealtimeInput({ 
              media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } 
            }));
          };
          source.connect(processor);
          processor.connect(inputCtx.destination);
        },
        onmessage: async (msg) => {
          if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
            const ctx = audioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const buffer = await decodeAudioData(decode(msg.serverContent.modelTurn.parts[0].inlineData.data), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
          }
          if (msg.serverContent?.outputTranscription) {
             setTranscription(prev => [...prev.slice(-5), `AI: ${msg.serverContent?.outputTranscription?.text}`]);
          }
          if (msg.serverContent?.inputTranscription) {
             setTranscription(prev => [...prev.slice(-5), `You: ${msg.serverContent?.inputTranscription?.text}`]);
          }
        },
        onclose: () => setIsActive(false),
        onerror: (e) => console.error(e)
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        systemInstruction: "You are a helpful assistant for the Ethiopian Government. You speak naturally and professionally. Assist the user with official tasks or information.",
        outputAudioTranscription: {},
        inputAudioTranscription: {}
      }
    });

    sessionRef.current = await sessionPromise;
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-12 text-center">
      <div className={`w-48 h-48 mx-auto rounded-full border-8 transition-all flex items-center justify-center ${isActive ? 'border-emerald-500 animate-pulse bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
        <svg className={`w-24 h-24 ${isActive ? 'text-emerald-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
        </svg>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-800">GovVoice Assistant</h2>
        <p className="text-gray-500 mt-2">Speak naturally with the official government AI interface.</p>
      </div>

      <div className="bg-gray-900 text-emerald-400 p-6 rounded-xl font-mono text-left h-48 overflow-y-auto shadow-inner border border-gray-800">
        {transcription.length === 0 ? (
          <p className="text-gray-600 italic">Waiting for connection...</p>
        ) : (
          transcription.map((t, i) => <div key={i} className="mb-1">{t}</div>)
        )}
      </div>

      <button 
        onClick={isActive ? stopSession : startSession}
        className={`px-12 py-4 rounded-full text-lg font-bold shadow-xl transition-all transform hover:scale-105 active:scale-95 ${isActive ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
      >
        {isActive ? 'Disconnect Assistant' : 'Connect Voice Assistant'}
      </button>
    </div>
  );
};

export default LiveAssistant;
