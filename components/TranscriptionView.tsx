
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Grid, TextField, 
  CircularProgress, Stack, Alert, Fade, 
  IconButton, Tooltip, Snackbar,
  Chip, AlertTitle, LinearProgress
} from '@mui/material';
import { 
  Mic as MicIcon, Stop as StopIcon, CloudUpload as UploadIcon, 
  Description as DocIcon, PictureAsPdf as PdfIcon, 
  Gavel as GavelIcon, Refresh as RefreshIcon, Bolt as BoltIcon,
  SaveAlt as SaveIcon, DeleteSweep as ResetIcon,
  Timer as TimerIcon, Download as DownloadIcon
} from '@mui/icons-material';
import { AppStatus } from '../types';
import { transcribeFullAudio } from '../services/geminiService';
import { exportToPdf, exportToDoc } from '../utils/exportUtils';

const TranscriptionView: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [quotaCountdown, setQuotaCountdown] = useState<number>(0);
  const [progress, setProgress] = useState(0);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (quotaCountdown > 0) {
      const interval = setInterval(() => setQuotaCountdown(p => p - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [quotaCountdown]);

  // Optimized snappier progress bar
  useEffect(() => {
    if (status === AppStatus.PROCESSING) {
      setProgress(0);
      progressIntervalRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 98) return 98; 
          // Faster initial progress to make it feel more responsive
          const increment = prev < 30 ? 5 : prev < 70 ? 2 : prev < 90 ? 0.5 : 0.1;
          return prev + increment;
        });
      }, 300); // Faster interval (300ms vs 500ms)
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (status === AppStatus.COMPLETED) setProgress(100);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [status]);

  const handleResetConsole = () => {
    if (status === AppStatus.RECORDING) stopRecording();
    setTranscript('');
    setRecordedBlob(null);
    setUploadedBlob(null);
    setStatus(AppStatus.IDLE);
    setError(null);
    setProgress(0);
    chunksRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const downloadRecordedAudio = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Court_Recording_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTranscribe = async (blob: Blob) => {
    if (quotaCountdown > 0) {
      setError(`QUOTA LIMIT: Please wait ${quotaCountdown}s before next request.`);
      return;
    }
    
    setStatus(AppStatus.PROCESSING);
    setError(null);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const res = await transcribeFullAudio(base64, blob.type);
          setTranscript(res.transcript);
          setStatus(AppStatus.COMPLETED);
        } catch (e: any) {
          const errMsg = e.message || "";
          if (errMsg.includes('QUOTA_EXCEEDED')) {
            const seconds = parseInt(errMsg.split('|')[1]) || 60;
            setQuotaCountdown(seconds);
            setError(`DAILY LIMIT: Cooldown active. Try again in ${seconds}s.`);
          } else {
            setError("Transcription failed. Try a smaller file or wait.");
          }
          setStatus(AppStatus.ERROR);
        }
      };
    } catch (e: any) {
      setError("System Error: " + e.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus(AppStatus.RECORDING);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e: any) {
      setError("Microphone Access Denied: " + e.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus(AppStatus.IDLE);
  };

  return (
    <Stack spacing={4}>
      {/* Quota Alert */}
      {quotaCountdown > 0 && (
        <Alert severity="warning" variant="filled" icon={<TimerIcon />} sx={{ borderRadius: 4 }}>
          <AlertTitle sx={{ fontWeight: 900 }}>API QUOTA PROTECTION</AlertTitle>
          Limit reached. Please wait {quotaCountdown} seconds for the next judicial session.
        </Alert>
      )}

      {/* Header Panel */}
      <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: status === AppStatus.RECORDING ? 'error.main' : 'primary.light', borderRadius: 4, bgcolor: 'white' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Box sx={{ 
              width: 70, height: 70, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              bgcolor: status === AppStatus.RECORDING ? 'error.main' : 'primary.main', color: 'white', 
              animation: status === AppStatus.RECORDING ? 'pulse 1.5s infinite' : 'none' 
            }}>
              <GavelIcon sx={{ fontSize: 32 }} />
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="overline" sx={{ fontWeight: 900, color: 'secondary.main', letterSpacing: 2 }}>WAGHIMRA HIGHCOURT AI SYSTEM</Typography>
            <Typography variant="h5" fontWeight="900" color="primary.main">
              {status === AppStatus.RECORDING ? `RECORDING: ${Math.floor(recordingTime/60)}:${(recordingTime%60).toString().padStart(2,'0')}` : 'Transcription Terminal'}
            </Typography>
          </Grid>
          <Grid item>
            <Button variant="outlined" color="primary" onClick={handleResetConsole} startIcon={<ResetIcon />} sx={{ borderRadius: 2 }}>Reset</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Control Area */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%', borderRadius: 4, border: 2, borderStyle: 'dashed', borderColor: status === AppStatus.RECORDING ? 'error.main' : 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <MicIcon sx={{ fontSize: 48, color: status === AppStatus.RECORDING ? 'error.main' : 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight="900" gutterBottom>Live Hearing Capture</Typography>
            <Button 
              variant="contained" fullWidth size="large" 
              color={status === AppStatus.RECORDING ? 'error' : 'primary'} 
              onClick={status === AppStatus.RECORDING ? stopRecording : startRecording}
              sx={{ py: 2, borderRadius: 3 }}
              startIcon={status === AppStatus.RECORDING ? <StopIcon /> : <MicIcon />}
            >
              {status === AppStatus.RECORDING ? 'STOP CAPTURE' : 'START RECORDING'}
            </Button>
            
            {recordedBlob && status !== AppStatus.RECORDING && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, width: '100%' }}>
                <Button variant="outlined" color="primary" fullWidth startIcon={<DownloadIcon />} onClick={downloadRecordedAudio}>DOWNLOAD</Button>
                <Button variant="contained" color="secondary" fullWidth startIcon={<BoltIcon />} onClick={() => handleTranscribe(recordedBlob)} disabled={status === AppStatus.PROCESSING || quotaCountdown > 0}>TRANSCRIBE</Button>
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%', borderRadius: 4, border: 2, borderStyle: 'dashed', borderColor: 'divider', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            {!uploadedBlob && (
              <input type="file" accept="audio/*,video/*" onChange={(e) => setUploadedBlob(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
            )}
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight="900" gutterBottom>{uploadedBlob ? uploadedBlob.name : 'Electronic Evidence'}</Typography>
            {uploadedBlob ? (
              <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                <Button variant="text" color="error" fullWidth onClick={() => setUploadedBlob(null)}>REMOVE</Button>
                <Button variant="contained" color="secondary" fullWidth onClick={() => handleTranscribe(uploadedBlob)} disabled={status === AppStatus.PROCESSING || quotaCountdown > 0}>TRANSCRIBE</Button>
              </Stack>
            ) : (
              <Typography variant="button" color="text.secondary">UPLOAD AUDIO/VIDEO</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Result Panel */}
      <Fade in={transcript.length > 0 || status === AppStatus.PROCESSING}>
        <Box>
          <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', borderRadius: 4, bgcolor: 'white' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight="900" color="primary.main">OFFICIAL RECORD</Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Doc"><IconButton color="primary" onClick={() => exportToDoc(transcript, 'Transcript')} disabled={!transcript}><DocIcon /></IconButton></Tooltip>
                <Tooltip title="PDF"><IconButton color="error" onClick={() => exportToPdf(transcript, 'Transcript')} disabled={!transcript}><PdfIcon /></IconButton></Tooltip>
              </Stack>
            </Stack>

            {status === AppStatus.PROCESSING ? (
              <Stack spacing={4} sx={{ py: 8, px: { xs: 2, md: 10 } }} alignItems="center">
                <CircularProgress color="secondary" size={60} />
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" fontWeight="900" color="secondary.main">TRANSCRIBING...</Typography>
                    <Typography variant="h6" fontWeight="900" color="secondary.main">{Math.round(progress)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} color="secondary" />
                </Box>
              </Stack>
            ) : (
              <TextField 
                fullWidth multiline minRows={18} variant="outlined" value={transcript} onChange={(e) => setTranscript(e.target.value)}
                InputProps={{ sx: { bgcolor: '#fafafa', fontFamily: '"Courier New", monospace', lineHeight: 1.8 } }} 
              />
            )}
          </Paper>
        </Box>
      </Fade>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 51, 64, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(239, 51, 64, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 51, 64, 0); }
        }
      `}</style>

      <Snackbar open={!!error} autoHideDuration={8000} onClose={() => setError(null)}>
        <Alert severity="error" variant="filled" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </Stack>
  );
};

export default TranscriptionView;
