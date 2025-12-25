
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Grid, TextField, 
  CircularProgress, Chip, Stack, Alert, Divider, Fade, 
  LinearProgress, IconButton, Tooltip, Snackbar
} from '@mui/material';
import { 
  Mic as MicIcon, 
  Stop as StopIcon, 
  CloudUpload as UploadIcon, 
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  Language as LanguageIcon,
  Psychology as PsychologyIcon,
  AutoGraph as SummaryIcon,
  DeleteOutline as DeleteIcon,
  Gavel as GavelIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { AppStatus } from '../types';
import { transcribeAudio, analyzeJudicialHearing } from '../services/geminiService';
import { exportToPdf, exportToDoc } from '../utils/exportUtils';
import { GoogleGenAI, Modality } from '@google/genai';

const TranscriptionView: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null);
  
  const [recordingTime, setRecordingTime] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const liveSessionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    stopRecording();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = async () => {
    // SECURITY CHECK: Browsers block microphone on non-HTTPS production sites
    if (!window.isSecureContext) {
      setError("SECURITY ERROR: Microphone access is disabled for non-secure (HTTP) connections. Please enable HTTPS on your IIS server to use live recording.");
      return;
    }

    try {
      setError(null);
      setLanguage('');
      setRecordedBlob(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(finalBlob);
      };

      recorder.start(1000);
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
          },
          onerror: (err) => {
            setError("Court network interruption detected. Verify your internet stability.");
            console.error(err);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are the official court transcriber for the Waghimra HighCourt. Transcribe verbatim. Format speakers clearly.",
          inputAudioTranscription: {}
        }
      });

      liveSessionRef.current = await sessionPromise;
      setStatus(AppStatus.RECORDING);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setError("Permission Denied: The browser blocked microphone access. Check your browser address bar settings.");
      } else if (e.name === 'NotFoundError') {
        setError("Hardware Error: No microphone found. Ensure a recording device is connected.");
      } else {
        setError("Microphone Error: " + e.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus(AppStatus.IDLE);
  };

  const handleTranscribeBlob = async (blob: Blob) => {
    setStatus(AppStatus.PROCESSING);
    setProgress(10);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        setProgress(30);
        const base64 = (reader.result as string).split(',')[1];
        const res = await transcribeAudio(base64, blob.type);
        setProgress(80);
        setTranscript(res.transcript);
        setLanguage(res.language);
        setStatus(AppStatus.COMPLETED);
        setProgress(100);
      };
    } catch (e: any) {
      setError("Transcription engine failed: " + e.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const downloadRecordedAudio = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Waghimra_HighCourt_Record_${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJudicialAnalysis = async () => {
    if (!transcript) return;
    setAnalyzing(true);
    try {
      const result = await analyzeJudicialHearing(transcript);
      setAnalysis(result);
    } catch (e) {
      setError("Judicial analysis engine timed out.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setRecordedBlob(null);
    setUploadedBlob(null);
    setTranscript('');
    setAnalysis('');
    setLanguage('');
    setStatus(AppStatus.IDLE);
    setError(null);
    setProgress(0);
  };

  return (
    <Stack spacing={4} sx={{ position: 'relative' }}>
      {/* Dashboard Status Card */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          border: 1, 
          borderColor: status === AppStatus.RECORDING ? 'error.main' : 'primary.light', 
          borderRadius: 4, 
          bgcolor: 'background.paper',
          transition: 'border-color 0.3s ease'
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box 
                sx={{ 
                  width: 72, height: 72, borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: status === AppStatus.RECORDING ? 'error.main' : 'primary.main',
                  color: 'white',
                  boxShadow: status === AppStatus.RECORDING ? '0 0 20px rgba(239, 51, 64, 0.4)' : 'none',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              >
                {status === AppStatus.PROCESSING ? <CircularProgress size={32} color="inherit" /> : <GavelIcon sx={{ fontSize: 36 }} />}
              </Box>
              {status === AppStatus.RECORDING && (
                <Box className="waveform-pulse" sx={{ position: 'absolute', inset: -8, border: '2px solid', borderColor: 'error.main', borderRadius: '50%', animation: 'ripple 1.2s infinite ease-out' }} />
              )}
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 900, letterSpacing: 2 }}>
              CONSTITUTIONAL PROTOCOL ACTIVE
            </Typography>
            <Typography variant="h5" fontWeight="900" sx={{ color: 'primary.main', textTransform: 'uppercase' }}>
              {status === AppStatus.RECORDING ? `LIVE HEARING: ${Math.floor(recordingTime/60)}:${(recordingTime%60).toString().padStart(2,'0')}` : 
               status === AppStatus.PROCESSING ? 'TRANSCRIBING JUDICIAL AUDIO...' : 'HighCourt Evidence Management'}
            </Typography>
            {status === AppStatus.PROCESSING && <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 6, borderRadius: 3 }} />}
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={2}>
              {language && <Chip label={language} color="secondary" icon={<LanguageIcon />} sx={{ fontWeight: 800 }} />}
              <Button size="small" variant="text" color="primary" onClick={handleReset} startIcon={<RefreshIcon />}>Reset Console</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Connection Security Alert for IIS */}
      {!window.isSecureContext && (
        <Alert severity="warning" icon={<SecurityIcon />} sx={{ borderRadius: 3, fontWeight: 'bold' }}>
          PRODUCTION NOTICE: This application is being served over an insecure connection (HTTP). Microphone access is restricted by browsers. Please deploy with <b>HTTPS</b> to enable Live Recording.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 4, 
              height: '100%', 
              borderRadius: 4, 
              border: 2, 
              borderStyle: (status === AppStatus.RECORDING || recordedBlob) ? 'solid' : 'dashed',
              borderColor: status === AppStatus.RECORDING ? 'error.main' : recordedBlob ? 'secondary.main' : 'divider',
              bgcolor: status === AppStatus.RECORDING ? 'rgba(239, 51, 64, 0.02)' : 'transparent',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <Box sx={{ p: 2, bgcolor: status === AppStatus.RECORDING ? 'error.light' : 'primary.50', borderRadius: '50%', color: status === AppStatus.RECORDING ? 'white' : 'primary.main' }}>
                <MicIcon fontSize="large" />
              </Box>
              <Typography variant="h6" fontWeight="900">Courtroom Capture</Typography>
              
              <Button 
                variant="contained" 
                size="large"
                fullWidth
                color={status === AppStatus.RECORDING ? 'error' : 'primary'}
                onClick={status === AppStatus.RECORDING ? stopRecording : startRecording}
                startIcon={status === AppStatus.RECORDING ? <StopIcon /> : <MicIcon />}
                sx={{ py: 2, fontSize: '1rem' }}
              >
                {status === AppStatus.RECORDING ? 'STOP RECORDING' : 'START RECORDING'}
              </Button>

              {recordedBlob && status !== AppStatus.RECORDING && (
                <Stack direction="row" spacing={1} sx={{ width: '100%', mt: 1 }}>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    fullWidth 
                    startIcon={<RefreshIcon />}
                    onClick={() => handleTranscribeBlob(recordedBlob)}
                    disabled={status === AppStatus.PROCESSING}
                  >
                    FINAL TRANSCRIBE
                  </Button>
                  <Tooltip title="Download Audio Record">
                    <IconButton color="primary" sx={{ border: 1, borderColor: 'primary.main' }} onClick={downloadRecordedAudio}>
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 4, 
              height: '100%', 
              borderRadius: 4, 
              border: 2, 
              borderStyle: uploadedBlob ? 'solid' : 'dashed',
              borderColor: uploadedBlob ? 'secondary.main' : 'divider',
              position: 'relative',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
            }}
          >
            {!uploadedBlob && <input type="file" accept="audio/*" onChange={(e) => setUploadedBlob(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />}
            <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <Box sx={{ p: 2, bgcolor: uploadedBlob ? 'secondary.light' : 'grey.100', borderRadius: '50%', color: uploadedBlob ? 'primary.main' : 'grey.400' }}>
                <UploadIcon fontSize="large" />
              </Box>
              <Typography variant="h6" fontWeight="900">{uploadedBlob ? 'File Ready' : 'Upload Evidence'}</Typography>
              
              {uploadedBlob ? (
                <Stack spacing={1} sx={{ width: '100%' }}>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    fullWidth 
                    size="large" 
                    onClick={() => handleTranscribeBlob(uploadedBlob)} 
                    disabled={status === AppStatus.PROCESSING}
                  >
                    {status === AppStatus.PROCESSING ? 'TRANSCRIBING...' : 'TRANSCRIBE FILE'}
                  </Button>
                  <Button variant="text" color="error" size="small" onClick={() => setUploadedBlob(null)}>Remove File</Button>
                </Stack>
              ) : (
                <Button variant="outlined" fullWidth size="large" sx={{ py: 2 }}>SELECT AUDIO FILE</Button>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Results View */}
      <Fade in={transcript.length > 0}>
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={analysis ? 7 : 12} sx={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', borderRadius: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="900" color="primary.main">OFFICIAL TRANSCRIPT</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" color="secondary" size="small" startIcon={<SummaryIcon />} onClick={handleJudicialAnalysis} disabled={analyzing}>
                      {analyzing ? 'Thinking...' : 'AI SUMMARY'}
                    </Button>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    <Button variant="outlined" size="small" startIcon={<DocIcon />} onClick={() => exportToDoc(transcript, 'HighCourt_Transcript')}>DOCX</Button>
                    <Button variant="outlined" color="error" size="small" startIcon={<PdfIcon />} onClick={() => exportToPdf(transcript, 'HighCourt_Transcript')}>PDF</Button>
                  </Stack>
                </Stack>
                
                <TextField
                  fullWidth multiline minRows={15} variant="outlined" value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  InputProps={{
                    sx: { bgcolor: '#fafafa', fontFamily: '"Courier New", Courier, monospace', fontSize: '1rem', lineHeight: 1.6 }
                  }}
                />
              </Paper>
            </Grid>

            {analysis && (
              <Grid item xs={12} lg={5}>
                <Fade in={true}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 4, border: 2, borderColor: 'secondary.main', borderRadius: 4, bgcolor: '#fffef2'
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                      <PsychologyIcon color="secondary" fontSize="large" />
                      <Typography variant="h6" fontWeight="900" color="primary.main">JUDICIAL INSIGHTS</Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#2c3e50', fontSize: '1rem' }}>
                      {analysis}
                    </Typography>
                  </Paper>
                </Fade>
              </Grid>
            )}
          </Grid>
        </Box>
      </Fade>

      <Snackbar open={!!error} autoHideDuration={8000} onClose={() => setError(null)}>
        <Alert severity="error" variant="filled" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .waveform-pulse { pointer-events: none; }
      `}</style>
    </Stack>
  );
};

export default TranscriptionView;
