
import React, { useState } from 'react';
import { 
  Box, Paper, Typography, Grid, TextField, Button, 
  IconButton, Stack, CircularProgress, Alert, Tooltip, Divider 
} from '@mui/material';
import { 
  CloudUpload as UploadIcon,
  AutoFixHigh as EditIcon,
  PlayCircle as PlayIcon,
  Visibility as AnalyzeIcon,
  Collections as LibraryIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { generateVeoVideo } from '../services/geminiService';

const ImageVideoStudio: React.FC = () => {
  const [media, setMedia] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{type: 'image' | 'video' | 'text', url?: string, text?: string} | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRawFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setMedia(ev.target?.result as string);
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const handleAction = async () => {
    if (!media || !rawFile || !prompt) return;
    
    // Mandatory API Key Selection check for Veo models as per guidelines
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Proceeding immediately after openSelectKey to mitigate race conditions as per guidelines
      }
    }

    const confirm = window.confirm("WARNING: Video generation uses a significant amount of your daily API quota. Continue?");
    if (!confirm) return;

    setLoading(true);
    try {
      const base64Data = media.split(',')[1];
      const mimeType = rawFile.type;
      
      const videoUrl = await generateVeoVideo(base64Data, mimeType, prompt);
      setResult({ type: 'video', url: videoUrl });
    } catch (e: any) {
      // Handle "Requested entity was not found" error by prompting for key selection again
      if (e.message && e.message.includes("Requested entity was not found")) {
        if (window.aistudio) await window.aistudio.openSelectKey();
      }
      alert("Quota or API Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} lg={5}>
        <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', borderRadius: 4 }}>
          <Stack spacing={3}>
            <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <WarningIcon color="warning" />
              <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main' }}>
                QUOTA ALERT: Video/AI generation is limited to 20 requests per day on free tier.
              </Typography>
            </Box>

            <Box sx={{ position: 'relative', aspectRatio: '16/9', bgcolor: 'grey.100', borderRadius: 2, border: '2px dashed #ccc', overflow: 'hidden' }}>
              <input type="file" onChange={handleUpload} style={{ position: 'absolute', inset: 0, opacity: 0, zIndex: 10, cursor: 'pointer' }} />
              {media ? (
                <img src={media} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Preview" />
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', color: 'text.disabled' }}>
                  <UploadIcon sx={{ fontSize: 40 }} />
                  <Typography variant="body2" fontWeight="900">Upload Base Image</Typography>
                </Stack>
              )}
            </Box>

            <TextField 
              fullWidth multiline rows={3} label="Veo Video Prompt" 
              placeholder="e.g. A forensic reconstruction of the scene..."
              value={prompt} onChange={(e) => setPrompt(e.target.value)}
            />

            <Button 
              fullWidth variant="contained" size="large" color="secondary" 
              onClick={handleAction} disabled={loading || !media || !prompt}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
            >
              {loading ? 'GENERATING VIDEO...' : 'GENERATE AI EVIDENCE'}
            </Button>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} lg={7}>
        <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', borderRadius: 4, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
          {result ? (
            <video src={result.url} controls style={{ maxWidth: '100%', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} />
          ) : (
            <Typography variant="body2" color="text.disabled" fontWeight="bold">PROCESSED EVIDENCE WILL APPEAR HERE</Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ImageVideoStudio;
