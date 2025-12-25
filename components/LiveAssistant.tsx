
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, IconButton, 
  Stack, Fade, Container, Avatar, Alert
} from '@mui/material';
import { 
  Mic as MicIcon, 
  SettingsVoice as VoiceIcon,
  GraphicEq as WaveIcon,
  Close as CloseIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { GoogleGenAI, Modality } from '@google/genai';

const LiveAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
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
    if (!window.isSecureContext) {
      setError("Production deployment requires HTTPS for microphone access. Contact IT to secure the IIS connection.");
      return;
    }

    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
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
               setTranscription(prev => [...prev.slice(-10), `AI: ${msg.serverContent?.outputTranscription?.text}`]);
            }
            if (msg.serverContent?.inputTranscription) {
               setTranscription(prev => [...prev.slice(-10), `User: ${msg.serverContent?.inputTranscription?.text}`]);
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => {
            console.error(e);
            setError("Live connection error. Ensure your API key and project are valid.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: "You are a helpful assistant for the Ethiopian Government. You speak naturally and professionally.",
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      setError("Activation Failed: " + e.message);
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
    <Container maxWidth="sm">
      <Stack spacing={4} alignItems="center" sx={{ py: 6 }}>
        {!window.isSecureContext && (
          <Alert severity="error" icon={<SecurityIcon />} sx={{ width: '100%', borderRadius: 3 }}>
            <b>Security Restriction:</b> Live Assistant requires <b>HTTPS</b> to access the microphone on production servers.
          </Alert>
        )}

        <Box 
          sx={{ 
            width: 200, height: 200, borderRadius: '50%', 
            border: 8, borderColor: isActive ? 'primary.main' : 'grey.200',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: isActive ? 'primary.50' : 'grey.50',
            transition: 'all 0.5s',
            position: 'relative'
          }}
        >
          {isActive ? <WaveIcon sx={{ fontSize: 80, color: 'primary.main', animation: 'voicePulse 1.5s infinite' }} /> : <MicIcon sx={{ fontSize: 80, color: 'grey.300' }} />}
          
          {isActive && (
            <Fade in={true}>
              <Box sx={{ position: 'absolute', bottom: -20, bgcolor: 'primary.main', color: 'white', px: 2, py: 0.5, borderRadius: 10, fontSize: '0.75rem', fontWeight: 'bold' }}>
                LISTENING
              </Box>
            </Fade>
          )}
        </Box>
        
        <Box textAlign="center">
          <Typography variant="h5" fontWeight="black" gutterBottom>GovVoice Assistant</Typography>
          <Typography variant="body2" color="text.secondary">Speak naturally with the official government AI interface.</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ width: '100%', borderRadius: 3 }}>{error}</Alert>
        )}

        <Paper 
          elevation={0} 
          sx={{ 
            width: '100%', height: 240, bgcolor: 'grey.900', p: 3, 
            borderRadius: 4, overflowY: 'auto', border: 1, borderColor: 'grey.800'
          }}
        >
          {transcription.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'grey.600', fontStyle: 'italic' }}>
              Waiting for voice input...
            </Typography>
          ) : (
            <Stack spacing={1}>
              {transcription.map((t, i) => (
                <Typography key={i} variant="caption" sx={{ color: t.startsWith('AI') ? 'primary.light' : 'grey.300', fontFamily: 'monospace', display: 'block' }}>
                  {t}
                </Typography>
              ))}
            </Stack>
          )}
        </Paper>

        <Button 
          variant="contained" 
          size="large" 
          color={isActive ? 'error' : 'primary'}
          sx={{ py: 2, px: 8, borderRadius: 50, fontWeight: 'bold', fontSize: '1.1rem', boxShadow: 8 }}
          onClick={isActive ? stopSession : startSession}
        >
          {isActive ? 'Disconnect' : 'Connect Assistant'}
        </Button>
      </Stack>
      <style>{`
        @keyframes voicePulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </Container>
  );
};

export default LiveAssistant;
