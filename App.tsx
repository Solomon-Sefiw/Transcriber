
import React, { useState } from 'react';
import { ThemeProvider, createTheme, Box, Container, Typography, CssBaseline, Fade } from '@mui/material';
import Header from './components/Header';
import Footer from './components/Footer';
import TranscriptionView from './components/TranscriptionView';
import IntelligenceView from './components/IntelligenceView';
import ImageVideoStudio from './components/ImageVideoStudio';
import LiveAssistant from './components/LiveAssistant';
import { AppTab } from './types';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0a3d52', // Official Branding Color
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c5a059', // Judicial Gold (matching the logo art)
    },
    error: {
      main: '#ef3340',
    },
    background: {
      default: '#f4f7f9',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h2: {
      fontWeight: 900,
      letterSpacing: '-0.02em',
      color: '#0a3d52',
    },
    h5: {
      fontWeight: 800,
      color: '#0a3d52',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 20px rgba(10, 61, 82, 0.05)',
        },
      },
    },
  },
});

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('transcription');

  const getTitle = () => {
    switch (activeTab) {
      case 'transcription': return 'Hearing Transcription & Diarization';
      case 'intelligence': return 'Judicial Intelligence Portal';
      case 'studio': return 'Evidence & Media Processing Studio';
      case 'live': return 'Real-time Court Assistant';
      default: return '';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <Container maxWidth="lg" sx={{ py: 6, flexGrow: 1 }}>
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography 
                variant="overline" 
                sx={{ 
                  bgcolor: 'secondary.main', 
                  color: 'primary.main', 
                  px: 1.5, 
                  py: 0.3, 
                  borderRadius: 1, 
                  fontWeight: 900,
                  fontSize: '0.65rem'
                }}
              >
                OFFICIAL HIGH COURT SYSTEM
              </Typography>
              <Box sx={{ width: 4, height: 4, bgcolor: 'divider', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                Secure Judicial Node
              </Typography>
            </Box>
            
            <Typography variant="h2" component="h1" gutterBottom>
              {getTitle()}
            </Typography>
            
            <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 800, fontWeight: 400, opacity: 0.8 }}>
              Advanced AI resources for the Waghimra Nationality Administration HighCourt, providing sovereignty and efficiency to the legal process.
            </Typography>
          </Box>

          <Fade in={true} timeout={500}>
            <Box>
              {activeTab === 'transcription' && <TranscriptionView />}
              {activeTab === 'intelligence' && <IntelligenceView />}
              {activeTab === 'studio' && <ImageVideoStudio />}
              {activeTab === 'live' && <LiveAssistant />}
            </Box>
          </Fade>
        </Container>

        <Footer />
      </Box>
    </ThemeProvider>
  );
};

export default App;
