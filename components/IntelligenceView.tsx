
import React, { useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, 
  Tabs, Tab, Stack, Link, CircularProgress, Divider, Alert 
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Map as MapIcon, 
  Psychology as PsychologyIcon, 
  Speed as SpeedIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { queryIntelligence, fastChat } from '../services/geminiService';

const IntelligenceView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, grounding: any[] } | null>(null);
  const [mode, setMode] = useState<'search' | 'maps' | 'deep' | 'fast'>('search');

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      if (mode === 'fast') {
        const text = await fastChat(query);
        setResult({ text, grounding: [] });
      } else {
        let loc;
        if (mode === 'maps') {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
          loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
        const data = await queryIntelligence(query, mode, loc);
        setResult(data);
      }
    } catch (e: any) {
      setResult({ text: "Official query failed. Check connection.", grounding: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={4}>
      <Paper elevation={0} sx={{ p: 6, border: 1, borderColor: 'divider', borderRadius: 6 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>Intelligence Portal</Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs 
            value={mode} 
            onChange={(_e, v) => setMode(v)} 
            textColor="primary" 
            indicatorColor="primary"
          >
            <Tab icon={<SearchIcon />} iconPosition="start" label="Search" value="search" />
            <Tab icon={<MapIcon />} iconPosition="start" label="Geo Grounding" value="maps" />
            <Tab icon={<PsychologyIcon />} iconPosition="start" label="Deep Thinking" value="deep" />
            <Tab icon={<SpeedIcon />} iconPosition="start" label="Flash Assist" value="fast" />
          </Tabs>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs>
            <TextField 
              fullWidth 
              variant="outlined" 
              placeholder="Inquire with official AI..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              sx={{ bgcolor: 'grey.50' }}
            />
          </Grid>
          <Grid item>
            <Button 
              variant="contained" 
              size="large" 
              sx={{ height: '100%', px: 6, fontWeight: 'bold' }}
              onClick={handleQuery}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? 'Consulting...' : 'Consult'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {result && (
        <Paper elevation={0} sx={{ p: 6, border: 1, borderColor: 'divider', borderRadius: 6 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '1.1rem' }}>
            {result.text}
          </Typography>

          {result.grounding.length > 0 && (
            <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="overline" color="text.secondary" fontWeight="black" gutterBottom display="block">
                Reference Grounding
              </Typography>
              <Grid container spacing={2}>
                {result.grounding.map((chunk: any, idx) => {
                  const item = chunk.web || chunk.maps;
                  if (!item) return null;
                  return (
                    <Grid item key={idx} xs={12} sm={6} md={4}>
                      <Paper 
                        component={Link} 
                        href={item.uri} 
                        target="_blank" 
                        underline="none"
                        sx={{ 
                          p: 2, display: 'flex', alignItems: 'center', gap: 2, 
                          bgcolor: 'grey.50', border: 1, borderColor: 'divider',
                          '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' }
                        }}
                      >
                        <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 2, color: 'primary.main', display: 'flex' }}>
                          <LinkIcon fontSize="small" />
                        </Box>
                        <Typography variant="caption" fontWeight="bold" noWrap color="text.primary">
                          {item.title}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Paper>
      )}
    </Stack>
  );
};

export default IntelligenceView;
