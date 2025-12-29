
import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, Button, Stack, Container, Alert } from '@mui/material';
import { Mic as MicIcon, GraphicEq as WaveIcon, Security as SecurityIcon } from '@mui/icons-material';
import { GoogleGenAI, Modality } from '@google/genai';

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const LiveAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  const startSession = async () => {
    try {
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
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }

            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev.slice(-10), `AI: ${message.serverContent.outputTranscription.text}`]);
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => {
            console.error("Live assistant error", e);
            setError("Connection to Court AI lost.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: "You are the Waghimra HighCourt Judicial Assistant. Be professional, neutral, and helpful with courtroom procedures.",
          outputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      setError(e.message);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={4} alignItems="center">
        {!window.isSecureContext && (
          <Alert severity="error" icon={<SecurityIcon />}>
            HTTPS is required for Courtroom Live Voice.
          </Alert>
        )}

        <Box sx={{ 
          width: 140, height: 140, borderRadius: '50%', border: 4, 
          borderColor: isActive ? 'primary.main' : 'grey.300',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: isActive ? 'primary.50' : 'grey.50',
          boxShadow: isActive ? '0 0 20px rgba(10, 61, 82, 0.2)' : 'none'
        }}>
          {isActive ? (
            <WaveIcon sx={{ fontSize: 60, color: 'primary.main' }} />
          ) : (
            <MicIcon sx={{ fontSize: 60, color: 'grey.300' }} />
          )}
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="900" color="primary.main">Courtroom Voice Assistant</Typography>
          <Typography variant="body2" color="text.secondary">Real-time guidance for judicial procedures.</Typography>
        </Box>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        <Paper sx={{ width: '100%', height: 250, p: 3, bgcolor: '#052a3a', borderRadius: 4, overflowY: 'auto' }}>
          {transcription.length === 0 ? (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
              Waiting for courtroom session to start...
            </Typography>
          ) : (
            transcription.map((line, i) => (
              <Typography key={i} variant="body2" sx={{ color: 'primary.light', mb: 1, fontFamily: 'monospace' }}>
                {line}
              </Typography>
            ))
          )}
        </Paper>

        <Button 
          fullWidth variant="contained" size="large" 
          color={isActive ? 'error' : 'primary'}
          onClick={isActive ? stopSession : startSession}
          sx={{ py: 2, fontWeight: 900, borderRadius: 3 }}
        >
          {isActive ? 'CEASE VOICE SESSION' : 'OPEN VOICE SESSION'}
        </Button>
      </Stack>
    </Container>
  );
};

export default LiveAssistant;
