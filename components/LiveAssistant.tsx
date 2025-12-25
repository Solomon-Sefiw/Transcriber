import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, Button, Stack, Fade, Container, Alert } from '@mui/material';
import { Mic as MicIcon, GraphicEq as WaveIcon, Security as SecurityIcon } from '@mui/icons-material';
import { GoogleGenAI, Modality } from '@google/genai';

const LiveAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  const startSession = async () => {
    if (!window.isSecureContext) {
      setError("IIS Error: HTTPS required for browser microphone access.");
      return;
    }

    try {
      // Use process.env.API_KEY directly as per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              const binary = Array.from(new Uint8Array(int16.buffer), b => String.fromCharCode(b)).join('');
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const ctx = audioContextRef.current!;
              const binary = atob(msg.serverContent.modelTurn.parts[0].inlineData.data);
              const bytes = new Uint8Array(binary.length);
              for(let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const int16 = new Int16Array(bytes.buffer);
              const buffer = ctx.createBuffer(1, int16.length, 24000);
              const data = buffer.getChannelData(0);
              for(let i=0; i<int16.length; i++) data[i] = int16[i] / 32768;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
            if (msg.serverContent?.outputTranscription) setTranscription(p => [...p.slice(-5), `AI: ${msg.serverContent?.outputTranscription?.text}`]);
          },
          onclose: () => setIsActive(false),
          onerror: (e) => setError("Connection Lost.")
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are the judicial court assistant. Professional and helpful.",
          outputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { setError(e.message); }
  };

  return (
    <Container maxWidth="sm">
      <Stack spacing={4} alignItems="center" sx={{ py: 6 }}>
        {!window.isSecureContext && <Alert severity="error" icon={<SecurityIcon />}>HTTPS required for IIS Deployment.</Alert>}
        <Box sx={{ width: 160, height: 160, borderRadius: '50%', border: 6, borderColor: isActive ? 'primary.main' : 'grey.300', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isActive ? 'primary.50' : 'grey.50' }}>
          {isActive ? <WaveIcon sx={{ fontSize: 60, color: 'primary.main' }} /> : <MicIcon sx={{ fontSize: 60, color: 'grey.300' }} />}
        </Box>
        <Typography variant="h5" fontWeight="900">Courtroom Live AI</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ width: '100%', height: 200, bgcolor: '#1a1a1a', p: 3, borderRadius: 4, overflowY: 'auto' }}>
          {transcription.map((t, i) => <Typography key={i} variant="caption" sx={{ color: 'primary.light', display: 'block', mb: 1 }}>{t}</Typography>)}
        </Paper>
        <Button variant="contained" size="large" fullWidth color={isActive ? 'error' : 'primary'} onClick={isActive ? () => sessionRef.current.close() : startSession}>
          {isActive ? 'DISCONNECT' : 'CONNECT COURTROOM ASSISTANT'}
        </Button>
      </Stack>
    </Container>
  );
};

export default LiveAssistant;