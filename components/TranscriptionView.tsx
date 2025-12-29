
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Grid, TextField, 
  CircularProgress, Stack, Alert, 
  IconButton, Tooltip, Snackbar,
  Divider, Collapse, AlertTitle,
  Backdrop
} from '@mui/material';
import { 
  Mic as MicIcon, Stop as StopIcon, CloudUpload as UploadIcon, 
  Gavel as GavelIcon,
  DeleteSweep as ResetIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  SwapHoriz as SwitchIcon,
  Bolt as BoltIcon
} from '@mui/icons-material';
import { AppStatus, User } from '../types';
import { transcribeFullAudio } from '../services/geminiService';
import { apiService } from '../services/apiService';
import { exportToDoc } from '../utils/exportUtils';
import { useTranslation } from 'react-i18next';

interface TranscriptionProps {
  user: User;
}

const TranscriptionView: React.FC<TranscriptionProps> = ({ user }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [caseTitle, setCaseTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [failoverMsg, setFailoverMsg] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: number;
    if (status === AppStatus.PROCESSING) {
      interval = window.setInterval(() => {
        setProgress(p => {
          if (p >= 99) return 99;
          const increment = p < 80 ? 2 : 0.5;
          return Math.min(p + increment, 99);
        });
      }, 300);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const handleNode = (e: any) => {
      setActiveNode(e.detail.index + 1);
      if (status === AppStatus.PROCESSING && activeNode !== null && (e.detail.index + 1) !== activeNode) {
        setFailoverMsg(t("failover_msg"));
        setTimeout(() => setFailoverMsg(null), 5000);
      }
    };

    window.addEventListener('node-active', handleNode as EventListener);
    return () => window.removeEventListener('node-active', handleNode as EventListener);
  }, [status, activeNode, t]);

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
          setSuccess(t("success_msg"));
          setProgress(100);
        } catch (e: any) {
          setError(e.message || t("error_msg"));
          setStatus(AppStatus.ERROR);
        }
      };
    } catch (e) {
      setError(t("error_msg"));
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
        setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/wav' }));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus(AppStatus.RECORDING);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e) { setError(t("error_msg")); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus(AppStatus.IDLE);
  };

  const downloadAudio = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Waghimra_Evidence_${new Date().toISOString()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleArchive = async () => {
    if (!caseTitle) {
      setError(t("case_ref") + " required.");
      return;
    }
    setIsSaving(true);
    try {
      await apiService.saveRecord(caseTitle, transcript, user);
      setSuccess(t("save_success"));
    } catch (e) {
      setError(t("error_msg"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (transcript && !window.confirm(t("discard_confirm"))) return;
    setTranscript('');
    setStatus(AppStatus.IDLE);
    setCaseTitle('');
    setRecordedBlob(null);
    setUploadedBlob(null);
  };

  const renderFormattedTranscript = () => {
    return transcript.split('\n').map((line, idx) => {
      const match = line.match(/^([^:]+:)(.*)$/);
      if (match) {
        return (
          <Typography key={idx} sx={{ mb: 1.5, fontFamily: '"Noto Sans Ethiopic", "Nyala", serif', fontSize: '1.05rem', lineHeight: 1.6 }}>
            <Box component="span" sx={{ fontWeight: 900, color: '#0a3d52' }}>{match[1]}</Box>
            {match[2]}
          </Typography>
        );
      }
      return (
        <Typography key={idx} sx={{ mb: 1, fontFamily: '"Noto Sans Ethiopic", "Nyala", serif', fontSize: '1rem', lineHeight: 1.6 }}>
          {line}
        </Typography>
      );
    });
  };

  return (
    <Stack spacing={4}>
      {/* PRODUCTION-READY PROGRESS BACKDROP */}
      <Backdrop 
        open={status === AppStatus.PROCESSING} 
        sx={{ zIndex: 1301, color: '#fff', flexDirection: 'column', gap: 3, backdropFilter: 'blur(15px)', bgcolor: 'rgba(10, 61, 82, 0.9)' }}
      >
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress size={160} thickness={2} variant="determinate" value={progress} sx={{ color: '#c5a059' }} />
          <CircularProgress size={160} thickness={2} variant="determinate" value={100} sx={{ position: 'absolute', left: 0, color: 'rgba(255,255,255,0.1)' }} />
          <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h3" fontWeight="900" sx={{ color: 'white' }}>{Math.round(progress)}%</Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center', maxWidth: 400, px: 4 }}>
          <Typography variant="h5" fontWeight="900" sx={{ mb: 1, letterSpacing: 1 }}>{t("analyzing_msg").toUpperCase()}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 700 }}>{t("node_status")} {activeNode || 1} • {t("ai_engine_active")}</Typography>
        </Box>
      </Backdrop>

      <Collapse in={!!failoverMsg}>
        <Alert severity="warning" icon={<SwitchIcon />} sx={{ borderRadius: 3, border: '2px solid', borderColor: 'warning.main' }}>
          <AlertTitle sx={{ fontWeight: 900 }}>FAILOVER ACTIVATED</AlertTitle>
          {failoverMsg}
        </Alert>
      </Collapse>

      <Paper 
        variant="outlined" 
        sx={{ 
          p: 3, borderRadius: '24px', borderColor: '#0a3d52',
          bgcolor: 'rgba(10, 61, 82, 0.03)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: '#0a3d52', color: 'white', p: 1.5, borderRadius: 2, display: 'flex' }}><GavelIcon /></Box>
          <Box>
            <Typography variant="overline" color="#c5a059" fontWeight="900">{t("federal_ethiopia")}</Typography>
            <Typography variant="h5" fontWeight="900" color="#0a3d52">{t('nav_transcribe')}</Typography>
          </Box>
        </Box>
        <Button variant="outlined" startIcon={<ResetIcon />} onClick={handleReset} sx={{ borderRadius: 2, fontWeight: 900, color: '#0a3d52', borderColor: '#0a3d52' }}>{t('reset_btn')}</Button>
      </Paper>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 6, textAlign: 'center', borderRadius: '32px', borderStyle: 'dashed',
              bgcolor: 'white', minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              transition: 'all 0.3s ease', '&:hover': { borderColor: '#c5a059', bgcolor: '#fffdf9' }
            }}
          >
            <MicIcon sx={{ fontSize: 50, mb: 1, color: '#0a3d52' }} />
            <Typography variant="subtitle1" fontWeight="900" sx={{ mb: 4, color: '#0a3d52' }}>{t('live_mic')}</Typography>
            <Stack spacing={2} sx={{ width: '100%', maxWidth: 300 }}>
              <Button 
                variant="contained" fullWidth startIcon={status === AppStatus.RECORDING ? <StopIcon /> : <MicIcon />}
                onClick={status === AppStatus.RECORDING ? stopRecording : startRecording}
                sx={{ bgcolor: status === AppStatus.RECORDING ? '#ef3340' : '#0a3d52', fontWeight: 900, py: 1.5, borderRadius: 3 }}
              >
                {status === AppStatus.RECORDING ? `${t('stop_rec')} (${recordingTime}s)` : t('start_rec')}
              </Button>
              <Stack direction="row" spacing={1}>
                <Button 
                  fullWidth variant="contained" startIcon={<BoltIcon />}
                  disabled={!recordedBlob || status === AppStatus.RECORDING}
                  onClick={() => recordedBlob && handleTranscribe(recordedBlob)}
                  sx={{ bgcolor: '#c5a059', fontWeight: 900, borderRadius: 3 }}
                >
                  {t('transcribe_btn')}
                </Button>
                {recordedBlob && (
                  <Tooltip title="Save Raw Evidence" children={
                    <IconButton onClick={downloadAudio} sx={{ border: 1, borderColor: '#eee', borderRadius: 3 }}><DownloadIcon /></IconButton>
                  } />
                )}
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 6, textAlign: 'center', borderRadius: '32px', borderStyle: 'dashed',
              bgcolor: 'white', minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              transition: 'all 0.3s ease', '&:hover': { borderColor: '#c5a059', bgcolor: '#fffdf9' }
            }}
          >
            <UploadIcon sx={{ fontSize: 50, mb: 1, color: '#0a3d52' }} />
            <Typography variant="subtitle1" fontWeight="900" sx={{ mb: 2, color: '#0a3d52' }}>
              {uploadedBlob ? uploadedBlob.name.toUpperCase() : t('import_file')}
            </Typography>
            {uploadedBlob && <Button onClick={() => setUploadedBlob(null)} sx={{ mb: 2, color: '#ef3340', fontWeight: 900 }}>REMOVE FILE</Button>}
            {!uploadedBlob ? (
              <Box>
                <input type="file" style={{ display: 'none' }} id="file-up" onChange={e => setUploadedBlob(e.target.files?.[0] || null)} />
                <Button component="label" htmlFor="file-up" variant="outlined" sx={{ fontWeight: 900, py: 1.5, px: 6, borderRadius: 3, borderColor: '#0a3d52', color: '#0a3d52' }}>{t('import_file')}</Button>
              </Box>
            ) : (
              <Button fullWidth variant="contained" onClick={() => handleTranscribe(uploadedBlob)} sx={{ maxWidth: 300, bgcolor: '#c5a059', fontWeight: 900, py: 1.5, borderRadius: 3 }}>ANALYZE CONTENT</Button>
            )}
          </Paper>
        </Grid>
      </Grid>

      {transcript && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: '32px', border: 1, borderColor: '#eee', bgcolor: 'white' }}>
          <Stack direction="row" spacing={2} sx={{ mb: 4 }} alignItems="center">
            <TextField label={t('case_ref')} placeholder="e.g. WAG-CR-2024-91" value={caseTitle} onChange={e => setCaseTitle(e.target.value)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
            <Button variant="contained" startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={handleArchive} disabled={isSaving} sx={{ bgcolor: '#2e7d32', fontWeight: 900, px: 4, height: 56, borderRadius: 3 }}>{t('archive_btn')}</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportToDoc(transcript, caseTitle || 'Court_Record')} sx={{ fontWeight: 900, height: 56, borderRadius: 3, color: '#0a3d52', borderColor: '#0a3d52' }}>DOC</Button>
          </Stack>
          <Divider sx={{ mb: 4 }} />
          <Box sx={{ bgcolor: '#fcfcfc', p: 4, borderRadius: 4, border: '1px inset rgba(0,0,0,0.05)', minHeight: 400 }}>{renderFormattedTranscript()}</Box>
        </Paper>
      )}

      <Snackbar open={!!error} autoHideDuration={8000} onClose={() => setError(null)}><Alert severity="error" variant="filled">{error}</Alert></Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}><Alert severity="success" variant="filled">{success}</Alert></Snackbar>
    </Stack>
  );
};

export default TranscriptionView;
