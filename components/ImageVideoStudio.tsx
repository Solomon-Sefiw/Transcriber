
import React, { useState } from 'react';
import { 
  Box, Paper, Typography, Grid, TextField, Button, 
  IconButton, Stack, CircularProgress, Alert, Tooltip 
} from '@mui/material';
import { 
  CloudUpload as UploadIcon,
  AutoFixHigh as EditIcon,
  PlayCircle as PlayIcon,
  Visibility as AnalyzeIcon,
  Collections as LibraryIcon
} from '@mui/icons-material';
import { editImage, generateVeoVideo, analyzeVideo } from '../services/geminiService';

const ImageVideoStudio: React.FC = () => {
  const [media, setMedia] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{type: 'image' | 'video' | 'text', url?: string, text?: string} | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

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

  const handleAction = async (action: 'edit' | 'animate' | 'analyze') => {
    if (!media || !rawFile) return;
    setLoading(true);
    setResult(null);
    
    try {
      const base64Data = media.split(',')[1];
      const mimeType = rawFile.type;

      if (action === 'edit') {
        setStatusMsg('Applying AI edits...');
        const editedUrl = await editImage(base64Data, mimeType, prompt || "Enhance this image for official government use.");
        setResult({ type: 'image', url: editedUrl });
      } else if (action === 'animate') {
        setStatusMsg('Generating cinematic video with Veo...');
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio?.openSelectKey();
        }
        const videoUrl = await generateVeoVideo(base64Data, mimeType, prompt || "A cinematic motion of this scene");
        setResult({ type: 'video', url: videoUrl });
      } else if (action === 'analyze') {
        setStatusMsg('Analyzing video content with Gemini Pro...');
        const text = await analyzeVideo(base64Data, mimeType, prompt || "Provide a detailed summary and key information from this video.");
        setResult({ type: 'text', text });
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const isVideo = rawFile?.type.startsWith('video/');

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} lg={5}>
        <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', borderRadius: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Media Source</Typography>
          
          <Box sx={{ position: 'relative', mb: 4 }}>
            <input 
              type="file" 
              onChange={handleUpload} 
              accept="image/*,video/*" 
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} 
            />
            <Box 
              sx={{ 
                aspectRatio: '16/9', borderRadius: 3, border: 2, borderStyle: 'dashed',
                borderColor: media ? 'primary.main' : 'divider',
                bgcolor: media ? 'primary.50' : 'grey.50',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', transition: 'all 0.2s'
              }}
            >
              {media ? (
                isVideo ? (
                  <video src={media} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted />
                ) : (
                  <img src={media} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Source" />
                )
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight="bold">
                    Click to Upload Photo or Video
                  </Typography>
                </>
              )}
            </Box>
          </Box>
          
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Prompt / Instruction
              </Typography>
              <TextField 
                fullWidth 
                multiline 
                rows={3} 
                variant="outlined"
                placeholder={isVideo ? "Ask Gemini to analyze content..." : "e.g. 'Add a sunset', 'Cinematic movement'"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                sx={{ bgcolor: 'grey.50' }}
              />
            </Box>

            <Grid container spacing={2}>
              {!isVideo ? (
                <>
                  <Grid item xs={6}>
                    <Button 
                      fullWidth variant="contained" 
                      startIcon={<EditIcon />}
                      onClick={() => handleAction('edit')}
                      disabled={loading || !media}
                    >
                      AI Edit
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button 
                      fullWidth variant="contained" color="info"
                      startIcon={<PlayIcon />}
                      onClick={() => handleAction('animate')}
                      disabled={loading || !media}
                    >
                      Animate
                    </Button>
                  </Grid>
                </>
              ) : (
                <Grid item xs={12}>
                  <Button 
                    fullWidth variant="contained" color="secondary"
                    startIcon={<AnalyzeIcon />}
                    onClick={() => handleAction('analyze')}
                    disabled={loading || !media}
                  >
                    Analyze with Gemini Pro
                  </Button>
                </Grid>
              )}
            </Grid>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} lg={7}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, border: 1, borderColor: 'divider', borderRadius: 4,
            height: '100%', display: 'flex', flexDirection: 'column'
          }}
        >
          <Typography variant="h6" fontWeight="bold" gutterBottom>Production Output</Typography>
          
          <Box 
            sx={{ 
              flexGrow: 1, borderRadius: 3, bgcolor: 'grey.100', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 400, position: 'relative', border: 1, borderColor: 'divider'
            }}
          >
            {loading ? (
              <Stack alignItems="center" spacing={2}>
                <CircularProgress color="primary" />
                <Typography variant="body2" fontWeight="bold" color="primary.dark">{statusMsg}</Typography>
              </Stack>
            ) : result ? (
              result.type === 'image' ? (
                <img src={result.url} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} alt="Result" />
              ) : result.type === 'video' ? (
                <video src={result.url} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
              ) : (
                <Box sx={{ p: 4, width: '100%', height: '100%', overflowY: 'auto' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{result.text}</Typography>
                </Box>
              )
            ) : (
              <Stack alignItems="center" spacing={2} sx={{ color: 'text.disabled' }}>
                <LibraryIcon sx={{ fontSize: 64 }} />
                <Typography variant="body1" fontWeight="medium">Output will appear here</Typography>
              </Stack>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ImageVideoStudio;
