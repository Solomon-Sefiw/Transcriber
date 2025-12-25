
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Grid, TextField, 
  CircularProgress, IconButton, Chip, Stack, Alert 
} from '@mui/material';
import { 
  Mic as MicIcon, 
  Stop as StopIcon, 
  CloudUpload as UploadIcon, 
  Download as DownloadIcon,
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
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
      case AppStatus.RECORDING: return { label: 'Recording', color: 'error', icon: <MicIcon /> };
      case AppStatus.PROCESSING: return { label: 'AI Processing', color: 'info', icon: <CircularProgress size={20} color="inherit" /> };
      case AppStatus.COMPLETED: return { label: 'Success', color: 'success', icon: <StopIcon /> };
      case AppStatus.ERROR: return { label: 'Error', color: 'error', icon: <MicIcon /> };
      default: return { label: 'System Idle', color: 'default', icon: <MicIcon /> };
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
    <Stack spacing={4}>
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 4 }}>
        <Grid container alignItems="center" spacing={3}>
          <Grid item>
            <Box 
              sx={{ 
                width: 56, height: 56, borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: status === AppStatus.RECORDING ? 'error.main' : 'grey.200',
                color: status === AppStatus.RECORDING ? 'white' : 'text.primary',
                boxShadow: status === AppStatus.RECORDING ? 4 : 0
              }}
            >
              {config.icon}
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="overline" color="text.secondary" fontWeight="bold">
              System Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" fontWeight="black">
                {config.label}
              </Typography>
              {status === AppStatus.RECORDING && (
                <Box component="span" sx={{ width: 8, height: 8, bgcolor: 'error.main', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
              )}
            </Box>
          </Grid>
          {language && (
            <Grid item sx={{ borderLeft: 1, borderColor: 'divider', pl: 3 }}>
              <Typography variant="overline" color="text.secondary" fontWeight="bold">
                Language
              </Typography>
              <Box>
                <Chip icon={<LanguageIcon fontSize="small" />} label={language} color="primary" variant="outlined" size="small" />
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 6, textAlign: 'center', border: 1, borderColor: 'divider', 
              borderRadius: 4, bgcolor: 'background.paper', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: '50%', color: 'primary.dark' }}>
              <MicIcon sx={{ fontSize: 40 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold">Live Voice Transcription</Typography>
              <Typography variant="body2" color="text.secondary">Speak directly for real-time capture</Typography>
            </Box>
            <Button 
              variant="contained" 
              fullWidth
              size="large"
              color={status === AppStatus.RECORDING ? 'error' : 'primary'}
              onClick={status === AppStatus.RECORDING ? stopRecording : startRecording}
              sx={{ py: 2, fontWeight: 'bold' }}
            >
              {status === AppStatus.RECORDING 
                ? `Stop Recording (${Math.floor(recordingTime/60)}:${(recordingTime%60).toString().padStart(2,'0')})` 
                : 'Start Real-time Recording'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 6, textAlign: 'center', border: 1, borderColor: 'divider', 
              borderRadius: 4, bgcolor: 'background.paper', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              position: 'relative'
            }}
          >
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => setAudioBlob(e.target.files?.[0] || null)} 
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} 
            />
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: '50%', color: 'info.dark' }}>
              <UploadIcon sx={{ fontSize: 40 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold">Batch File Upload</Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                {audioBlob ? audioBlob.name : 'Upload official audio records'}
              </Typography>
            </Box>
            {audioBlob && status === AppStatus.IDLE ? (
              <Button 
                variant="contained" 
                color="info" 
                fullWidth
                size="large"
                onClick={handleBatchRefine}
                sx={{ py: 2, fontWeight: 'bold', zIndex: 20 }}
              >
                Refine & Transcribe
              </Button>
            ) : (
              <Button variant="outlined" color="inherit" fullWidth size="large" sx={{ py: 2, borderStyle: 'dashed' }}>
                Select Audio File
              </Button>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', borderRadius: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">Document Transcript</Typography>
          {transcript && (
            <Stack direction="row" spacing={1}>
              <Button 
                size="small" 
                variant="outlined" 
                startIcon={<DocIcon />} 
                onClick={() => exportToDoc(transcript, 'EthioGov_Transcript')}
              >
                Word
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                color="error" 
                startIcon={<PdfIcon />} 
                onClick={() => exportToPdf(transcript, 'EthioGov_Transcript')}
              >
                PDF
              </Button>
            </Stack>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <TextField
          fullWidth
          multiline
          minRows={15}
          variant="outlined"
          value={transcript}
          placeholder="Official transcription output will manifest here..."
          InputProps={{
            readOnly: true,
            sx: { 
              bgcolor: 'grey.50',
              fontFamily: 'monospace',
              fontSize: '1rem',
              '& fieldset': { border: 'none' }
            }
          }}
        />
      </Paper>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </Stack>
  );
};

export default TranscriptionView;
