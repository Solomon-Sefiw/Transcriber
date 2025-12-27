
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Grid, TextField, 
  CircularProgress, Stack, Alert, Fade, 
  IconButton, Tooltip, Snackbar,
  LinearProgress, Divider
} from '@mui/material';
import { 
  Mic as MicIcon, Stop as StopIcon, CloudUpload as UploadIcon, 
  Description as DocIcon,
  Gavel as GavelIcon, Bolt as BoltIcon,
  DeleteSweep as ResetIcon,
  Save as SaveIcon,
  CheckCircle as CheckIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { AppStatus, User } from '../types';
import { transcribeFullAudio } from '../services/geminiService';
import { apiService } from '../services/apiService';
import { exportToDoc } from '../utils/exportUtils';

interface TranscriptionProps {
  user: User;
}

const TranscriptionView: React.FC<TranscriptionProps> = ({ user }) => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [caseTitle, setCaseTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === AppStatus.PROCESSING) {
      setProgress(0);
      progressIntervalRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 98) return 98; 
          const increment = prev < 30 ? 5 : prev < 70 ? 2 : prev < 90 ? 0.5 : 0.1;
          return prev + increment;
        });
      }, 300);
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
    setCaseTitle('');
    setRecordedBlob(null);
    setUploadedBlob(null);
    setStatus(AppStatus.IDLE);
    setError(null);
    setSuccess(null);
    setProgress(0);
  };

  const handleDownloadAudio = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AudioRecord_${caseTitle || 'Reference'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToArchive = async () => {
    if (!transcript || !caseTitle) {
      setError("Please enter a Case Reference before archiving.");
      return;
    }
    setSaving(true);
    try {
      await apiService.saveRecord(caseTitle, transcript, user);
      setSuccess(`Case "${caseTitle}" securely archived.`);
    } catch (err) {
      setError("Failed to reach judicial server.");
    } finally {
      setSaving(false);
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setStatus(AppStatus.PROCESSING);
    setError(null);
    setSuccess(null);
    
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
          if (e.message.includes('QUOTA')) {
            setError("Quota Full. Switch to another Server node at the top right.");
          } else {
            setError("Transcription failed.");
          }
          setStatus(AppStatus.ERROR);
        }
      };
    } catch (e: any) {
      setError("Critical system error: " + e.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
      setError("Microphone access is mandatory for courtroom capture.");
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
            <Typography variant="overline" sx={{ fontWeight: 900, color: 'secondary.main', letterSpacing: 2 }}>WAGHIMRA HIGHCOURT STENOGRAPHY</Typography>
            <Typography variant="h5" fontWeight="900" color="primary.main">
              {status === AppStatus.RECORDING ? `SESSION ACTIVE: ${Math.floor(recordingTime/60)}:${(recordingTime%60).toString().padStart(2,'0')}` : 'Stenography Terminal'}
            </Typography>
          </Grid>
          <Grid item>
            <Button variant="outlined" color="primary" onClick={handleResetConsole} startIcon={<ResetIcon />} sx={{ borderRadius: 2, fontWeight: 900 }}>Reset</Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%', borderRadius: 4, border: 2, borderStyle: 'dashed', borderColor: status === AppStatus.RECORDING ? 'error.main' : 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <MicIcon sx={{ fontSize: 48, color: status === AppStatus.RECORDING ? 'error.main' : 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight="900" gutterBottom>Live Mic Input</Typography>
            <Button 
              variant="contained" fullWidth size="large" 
              color={status === AppStatus.RECORDING ? 'error' : 'primary'} 
              onClick={status === AppStatus.RECORDING ? stopRecording : startRecording}
              sx={{ py: 2, borderRadius: 3, fontWeight: 900 }}
              startIcon={status === AppStatus.RECORDING ? <StopIcon /> : <MicIcon />}
            >
              {status === AppStatus.RECORDING ? 'STOP RECORDING' : 'START RECORDING'}
            </Button>
            
            {recordedBlob && status !== AppStatus.RECORDING && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, width: '100%' }}>
                <Button variant="contained" color="secondary" fullWidth startIcon={<BoltIcon />} onClick={() => handleTranscribe(recordedBlob)} disabled={status === AppStatus.PROCESSING} sx={{ fontWeight: 900 }}>TRANSCRIBE</Button>
                <Tooltip title="Download Audio">
                  <IconButton color="secondary" onClick={handleDownloadAudio} sx={{ border: 1, borderRadius: 2 }}><DownloadIcon /></IconButton>
                </Tooltip>
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%', borderRadius: 4, border: 2, borderStyle: 'dashed', borderColor: 'divider', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            {!uploadedBlob && (
              <input type="file" accept="audio/*,video/*" onChange={(e) => setUploadedBlob(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, zIndex: 10, cursor: 'pointer' }} />
            )}
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight="900" gutterBottom>{uploadedBlob ? uploadedBlob.name : 'Media Evidence'}</Typography>
            {uploadedBlob ? (
              <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                <Button variant="text" color="error" fullWidth onClick={() => setUploadedBlob(null)}>REMOVE</Button>
                <Button variant="contained" color="secondary" fullWidth onClick={() => handleTranscribe(uploadedBlob)} disabled={status === AppStatus.PROCESSING} sx={{ fontWeight: 900 }}>TRANSCRIBE</Button>
              </Stack>
            ) : (
              <Typography variant="button" color="text.secondary">UPLOAD AUDIO/VIDEO</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Fade in={transcript.length > 0 || status === AppStatus.PROCESSING}>
        <Box>
          <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', borderRadius: 4, bgcolor: 'white' }}>
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
              <Grid item xs>
                <Typography variant="h6" fontWeight="900" color="primary.main">TRANSCRIPTION OUTPUT</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField 
                  fullWidth size="small" label="Case Reference" 
                  value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)}
                  placeholder="Case #882-Waghimra"
                  variant="filled"
                />
              </Grid>
              <Grid item>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Save Archive">
                    <Button 
                      variant="contained" color="success" onClick={handleSaveToArchive} 
                      disabled={!transcript || saving}
                      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    >
                      {saving ? 'SAVING...' : 'ARCHIVE'}
                    </Button>
                  </Tooltip>
                  <Divider orientation="vertical" flexItem />
                  <Tooltip title="Word Export">
                    <Button 
                      variant="contained" color="primary" 
                      onClick={() => exportToDoc(transcript, caseTitle || 'Transcript')} 
                      disabled={!transcript}
                      startIcon={<DocIcon />}
                    >
                      EXPORT DOC
                    </Button>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>

            {status === AppStatus.PROCESSING ? (
              <Stack spacing={4} sx={{ py: 8, px: { xs: 2, md: 10 } }} alignItems="center">
                <CircularProgress color="secondary" size={60} />
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" fontWeight="900" color="secondary.main">CONVERTING...</Typography>
                    <Typography variant="h6" fontWeight="900" color="secondary.main">{Math.round(progress)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} color="secondary" />
                </Box>
              </Stack>
            ) : (
              <TextField 
                fullWidth multiline minRows={18} variant="outlined" value={transcript} onChange={(e) => setTranscript(e.target.value)}
                InputProps={{ sx: { bgcolor: '#fafafa', fontFamily: '"Courier New", monospace', fontSize: '1rem', lineHeight: 1.1, padding: '10px' } }} 
              />
            )}
          </Paper>
        </Box>
      </Fade>

      <Snackbar open={!!error} autoHideDuration={8000} onClose={() => setError(null)}>
        <Alert severity="error" variant="filled" onClose={() => setError(null)} sx={{ borderRadius: 3 }}>{error}</Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert severity="success" variant="filled" icon={<CheckIcon />} onClose={() => setSuccess(null)} sx={{ borderRadius: 3 }}>{success}</Alert>
      </Snackbar>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 51, 64, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(239, 51, 64, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 51, 64, 0); }
        }
      `}</style>
    </Stack>
  );
};

export default TranscriptionView;
