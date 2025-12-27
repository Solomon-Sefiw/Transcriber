
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
  Download as DownloadIcon,
  AudioFile as AudioIcon
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

  useEffect(() => {
    let interval: number;
    if (status === AppStatus.PROCESSING) {
      interval = window.setInterval(() => setProgress(p => p < 98 ? p + 1 : p), 400);
    }
    return () => clearInterval(interval);
  }, [status]);

  const downloadRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `court_recording_${caseTitle || Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTranscribe = async (blob: Blob) => {
    setStatus(AppStatus.PROCESSING);
    setProgress(0);
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
          setSuccess("Transcription finalized successfully.");
        } catch (e: any) {
          setError(e.message || "Transcription failed.");
          setStatus(AppStatus.ERROR);
        }
      };
    } catch (e: any) {
      setError("File processing error.");
      setStatus(AppStatus.ERROR);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus(AppStatus.RECORDING);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e) { setError("Microphone access denied."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus(AppStatus.IDLE);
  };

  return (
    <Stack spacing={4}>
      <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: status === AppStatus.RECORDING ? 'error.main' : 'divider', borderRadius: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item><GavelIcon sx={{ fontSize: 40, color: status === AppStatus.RECORDING ? 'error.main' : 'primary.main' }} /></Grid>
          <Grid item xs>
            <Typography variant="overline" color="secondary" fontWeight="900">STENOGRAPHY CONSOLE</Typography>
            <Typography variant="h5" fontWeight="900" color="primary.main">
              {status === AppStatus.RECORDING ? `RECORDING: ${recordingTime}s` : 'System Ready'}
            </Typography>
          </Grid>
          <Grid item><Button variant="outlined" startIcon={<ResetIcon />} onClick={() => { setTranscript(''); setStatus(AppStatus.IDLE); setRecordedBlob(null); setUploadedBlob(null); }} sx={{ fontWeight: 900 }}>Reset</Button></Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, textAlign: 'center', border: '2px dashed', borderColor: status === AppStatus.RECORDING ? 'error.main' : 'divider' }}>
            <MicIcon sx={{ fontSize: 48, mb: 2 }} color={status === AppStatus.RECORDING ? 'error' : 'primary'} />
            <Button variant="contained" fullWidth color={status === AppStatus.RECORDING ? 'error' : 'primary'} onClick={status === AppStatus.RECORDING ? stopRecording : startRecording} sx={{ fontWeight: 900, py: 1.5 }}>
              {status === AppStatus.RECORDING ? 'STOP RECORDING' : 'START MIC'}
            </Button>
            {recordedBlob && status !== AppStatus.RECORDING && (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button fullWidth variant="contained" color="secondary" sx={{ fontWeight: 900 }} onClick={() => handleTranscribe(recordedBlob)}>TRANSCRIBE</Button>
                <Tooltip title="Download Audio File">
                  <IconButton color="primary" onClick={downloadRecording} sx={{ border: 1, borderColor: 'divider' }}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, textAlign: 'center', border: '2px dashed #ccc', position: 'relative' }}>
            <UploadIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
            <input type="file" accept="audio/*,video/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => setUploadedBlob(e.target.files?.[0] || null)} />
            <Typography fontWeight="900" noWrap>{uploadedBlob ? uploadedBlob.name : 'UPLOAD EVIDENCE'}</Typography>
            {uploadedBlob && <Button fullWidth variant="contained" color="secondary" sx={{ mt: 2, fontWeight: 900, py: 1.5 }} onClick={() => handleTranscribe(uploadedBlob)}>TRANSCRIBE FILE</Button>}
          </Paper>
        </Grid>
      </Grid>

      {(transcript || status === AppStatus.PROCESSING) && (
        <Paper sx={{ p: 4, borderRadius: 4, border: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
            <Typography variant="h6" fontWeight="900" sx={{ flexGrow: 1 }}>JUDICIAL RECORD</Typography>
            <TextField size="small" placeholder="Case Ref..." value={caseTitle} onChange={e => setCaseTitle(e.target.value)} />
            
            <Tooltip title="Save to Archives">
              <span>
                <Button 
                  variant="contained" color="success" 
                  disabled={!transcript || saving} 
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} 
                  onClick={() => apiService.saveRecord(caseTitle, transcript, user)}
                  sx={{ fontWeight: 900 }}
                >
                  ARCHIVE
                </Button>
              </span>
            </Tooltip>

            <Tooltip title="Export Official Word DOC">
              <span>
                <Button 
                  variant="contained" 
                  disabled={!transcript} 
                  startIcon={<DocIcon />} 
                  onClick={() => exportToDoc(transcript, caseTitle || 'Transcript')}
                  sx={{ fontWeight: 900 }}
                >
                  DOC
                </Button>
              </span>
            </Tooltip>
          </Stack>
          
          {status === AppStatus.PROCESSING ? (
            <Box sx={{ p: 10, textAlign: 'center' }}>
              <CircularProgress color="secondary" size={60} />
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 4, height: 8, borderRadius: 4 }} />
              <Typography sx={{ mt: 3, fontWeight: 900, color: 'secondary.main' }}>
                JUDICIAL AI IS ANALYZING... 
                <br/>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>Checking Node Availability (Failover Enabled)</Typography>
              </Typography>
            </Box>
          ) : (
            <TextField 
              fullWidth multiline minRows={20} value={transcript} onChange={e => setTranscript(e.target.value)}
              InputProps={{ sx: { fontFamily: '"Courier New", monospace', fontSize: '1rem', lineHeight: 1.0, padding: '15px', bgcolor: '#fcfcfc' } }} 
            />
          )}
        </Paper>
      )}

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}><Alert severity="error" variant="filled" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>{error}</Alert></Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess(null)}><Alert severity="success" variant="filled" onClose={() => setSuccess(null)} sx={{ borderRadius: 2 }}>{success}</Alert></Snackbar>
    </Stack>
  );
};

export default TranscriptionView;
