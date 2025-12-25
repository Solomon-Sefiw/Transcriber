
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
      main: '#0a3d52', // Deep Branding Navy
      light: '#145c7a',
      dark: '#052a3a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c5a059', // Judicial Gold
      light: '#d4b984',
      dark: '#a6823e',
    },
    error: {
      main: '#ef3340',
    },
    background: {
      default: '#f8fafb',
      paper: '#ffffff',
    },
    text: {
      primary: '#0a3d52',
      secondary: '#4d6d7a',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Inter", "Helvetica", "Arial", sans-serif',
    h2: {
      fontWeight: 900,
      letterSpacing: '-0.03em',
      color: '#0a3d52',
    },
    h5: {
      fontWeight: 800,
      color: '#0a3d52',
    },
    overline: {
      fontWeight: 900,
      letterSpacing: '0.15em',
      fontSize: '0.7rem',
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          fontWeight: 900,
          letterSpacing: 1,
          padding: '12px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(10, 61, 82, 0.1)',
          }
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 15px rgba(10, 61, 82, 0.04)',
        },
      },
    },
  },
});

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('transcription');

  const getTitle = () => {
    switch (activeTab) {
      case 'transcription': return 'Judicial Record Transcription';
      case 'intelligence': return 'Legal Intelligence Node';
      case 'studio': return 'Evidence Analysis Studio';
      case 'live': return 'Real-time Courtroom Voice';
      default: return '';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <Container maxWidth="lg" sx={{ py: 8, flexGrow: 1 }}>
          <Box sx={{ mb: 8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Typography 
                variant="overline" 
                sx={{ 
                  bgcolor: 'secondary.main', 
                  color: 'primary.main', 
                  px: 2, 
                  py: 0.6, 
                  borderRadius: 1, 
                  fontWeight: 900,
                }}
              >
                SOVEREIGN JUDICIAL NETWORK
              </Typography>
              <Box sx={{ width: 6, height: 6, bgcolor: 'secondary.main', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 900, letterSpacing: 1 }}>
                2S TEC PRODUCTION ENGINE
              </Typography>
            </Box>
            
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontSize: { xs: '2.5rem', md: '3.75rem' } }}>
              {getTitle()}
            </Typography>
            
            <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 850, fontWeight: 400, lineHeight: 1.6 }}>
              The official AI-enhanced judicial support infrastructure for the Waghimra Nationality Administration. Secure, accurate, and sovereign legal automation.
            </Typography>
          </Box>

          <Fade in={true} timeout={800}>
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
