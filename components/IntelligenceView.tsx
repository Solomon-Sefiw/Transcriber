
import React, { useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, 
  Tabs, Tab, Stack, Link, CircularProgress, Alert, Tooltip 
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Map as MapIcon, 
  Psychology as PsychologyIcon, 
  Speed as SpeedIcon,
  Link as LinkIcon,
  Balance as BalanceIcon
} from '@mui/icons-material';
import { queryIntelligence } from '../services/geminiService';

const IntelligenceView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, grounding: any[] } | null>(null);
  const [mode, setMode] = useState<'search' | 'maps' | 'deep' | 'fast'>('search');

  // FIX: Unified query handler using queryIntelligence for all modes, including 'fast'
  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      let loc;
      if (mode === 'maps') {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => 
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
          loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch(e) { console.warn("Location blocked."); }
      }
      // Mode 'fast' is now handled natively by queryIntelligence
      const data = await queryIntelligence(query, mode, loc);
      setResult(data);
    } catch (e: any) {
      setResult({ text: "API Quota Limit reached for complex queries. Please try 'Rapid Consult' or wait 60s.", grounding: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={4}>
      <Paper sx={{ p: 5, borderRadius: 6, border: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <BalanceIcon sx={{ color: 'primary.main', fontSize: 40 }} />
          <Box>
            <Typography variant="h5" fontWeight="900" color="primary.main">Judicial Intelligence Node</Typography>
            <Typography variant="body2" color="text.secondary">Secure access to regional law and precedents.</Typography>
          </Box>
        </Box>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs value={mode} onChange={(_e, v) => setMode(v)} textColor="primary" indicatorColor="primary">
            <Tab icon={<SearchIcon />} label="Legal Search" value="search" />
            <Tab icon={<PsychologyIcon />} label="Legal Reasoning" value="deep" />
            <Tab icon={<SpeedIcon />} label="Rapid Consult" value="fast" />
          </Tabs>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs>
            <TextField 
              fullWidth variant="outlined" 
              placeholder="Legal inquiry..." 
              value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              sx={{ bgcolor: '#f9fafb' }}
            />
          </Grid>
          <Grid item>
            <Button 
              variant="contained" size="large" sx={{ height: '100%', px: 6, fontWeight: 900 }}
              onClick={handleQuery} disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? 'Consulting...' : 'Initiate Inquiry'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {result && (
        <Paper elevation={0} sx={{ p: 6, border: 1, borderColor: 'divider', borderRadius: 6, bgcolor: 'white' }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '1.1rem', color: 'primary.dark' }}>
            {result.text}
          </Typography>
          
          {/* FIX: Extract and display grounding URLs from groundingChunks as per guidelines */}
          {result.grounding && result.grounding.length > 0 && (
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 900 }}>Sources & Grounding:</Typography>
              <Stack spacing={1}>
                {result.grounding.map((chunk: any, i: number) => {
                  const source = chunk.web || chunk.maps;
                  if (!source) return null;
                  return (
                    <Link 
                      key={i} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener" 
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      <LinkIcon sx={{ fontSize: 16 }} />
                      {source.title || source.uri}
                    </Link>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Paper>
      )}
    </Stack>
  );
};

export default IntelligenceView;
