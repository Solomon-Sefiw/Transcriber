
import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, Box, Container, Typography, CssBaseline, Fade } from '@mui/material';
import Header from './components/Header';
import Footer from './components/Footer';
import TranscriptionView from './components/TranscriptionView';
import IntelligenceView from './components/IntelligenceView';
import ImageVideoStudio from './components/ImageVideoStudio';
import LiveAssistant from './components/LiveAssistant';
import AuthView from './components/AuthView';
import JudicialArchives from './components/JudicialArchives';
import { AppTab, User } from './types';
import { useTranslation } from 'react-i18next';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0a3d52',
      light: '#145c7a',
      dark: '#052a3a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c5a059',
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
    fontFamily: '"Noto Sans Ethiopic", "Roboto", "Inter", "Helvetica", "Arial", sans-serif',
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
});

const App: React.FC = () => {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('transcription');

  useEffect(() => {
    const saved = localStorage.getItem('court_session');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('court_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('court_session');
  };

  if (!currentUser) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthView onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  const getTitle = () => {
    switch (activeTab) {
      case 'transcription': return t('transcribe_title');
      case 'archives': return t('nav_archives');
      case 'intelligence': return t('nav_intelligence');
      case 'studio': return t('nav_studio');
      case 'live': return t('nav_live');
      default: return '';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={currentUser} 
          onLogout={handleLogout} 
        />
        
        <Container maxWidth="lg" sx={{ py: 8, flexGrow: 1 }}>
          <Box sx={{ mb: 8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Typography variant="overline" sx={{ bgcolor: 'secondary.main', color: 'primary.main', px: 2, py: 0.6, borderRadius: 1 }}>
                {t('authenticated_session')}: {currentUser.role.toUpperCase()}
              </Typography>
              <Box sx={{ width: 6, height: 6, bgcolor: 'secondary.main', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 900, letterSpacing: 1 }}>
                ID: {currentUser.id}
              </Typography>
              <Box sx={{ width: 6, height: 6, bgcolor: 'secondary.main', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 900 }}>
                {t('ai_engine_active')}
              </Typography>
            </Box>
            
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontSize: { xs: '2.5rem', md: '3.75rem' } }}>
              {getTitle()}
            </Typography>
          </Box>

          <Fade in={true} timeout={800} children={
            <Box>
              {activeTab === 'transcription' && <TranscriptionView user={currentUser} />}
              {activeTab === 'archives' && <JudicialArchives user={currentUser} />}
              {activeTab === 'intelligence' && <IntelligenceView />}
              {activeTab === 'studio' && <ImageVideoStudio />}
              {activeTab === 'live' && <LiveAssistant />}
            </Box>
          } />
        </Container>

        <Footer />
      </Box>
    </ThemeProvider>
  );
};

export default App;
