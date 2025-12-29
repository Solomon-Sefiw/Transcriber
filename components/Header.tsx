
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Box, Typography, Tabs, Tab, useMediaQuery, useTheme, IconButton, Chip, Stack, Tooltip } from '@mui/material';
import { 
  Gavel as GavelIcon, 
  MenuBook as BookIcon, 
  VideoLibrary as VideoIcon, 
  SupportAgent as AgentIcon,
  Logout as LogoutIcon,
  Inventory as ArchiveIcon,
  FiberManualRecord as StatusIcon
} from '@mui/icons-material';
import { AppTab, User } from '../types';
import { getClusterStatus } from '../services/geminiService';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [nodes, setNodes] = useState(getClusterStatus());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNodes(getClusterStatus()), 5000);
    
    const handleActive = (e: any) => setActiveIndex(e.detail.index);
    const handleExhausted = () => {
      setNodes(getClusterStatus());
      setActiveIndex(null);
    };

    window.addEventListener('node-active', handleActive as EventListener);
    window.addEventListener('node-exhausted', handleExhausted);

    return () => {
      clearInterval(interval);
      window.removeEventListener('node-active', handleActive as EventListener);
      window.removeEventListener('node-exhausted', handleExhausted);
    };
  }, []);

  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: 'primary.main', borderBottom: '4px solid', borderColor: 'secondary.main' }}>
      <Toolbar sx={{ height: 100, justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box component="img" src="logo.png" sx={{ width: 60, height: 60 }} onError={(e: any) => e.target.src = 'https://placehold.co/60x60/0a3d52/c5a059?text=Court'} />
          {!isMobile && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'secondary.main', fontSize: '1rem', lineHeight: 1.2 }}>
                {t('app_title')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', opacity: 0.9 }}>
                {t('app_subtitle')}
              </Typography>
            </Box>
          )}
        </Box>

        <Tabs 
          value={activeTab} 
          onChange={(_e, v) => setActiveTab(v)} 
          textColor="inherit" 
          indicatorColor="secondary" 
          sx={{ 
            flexGrow: 1, 
            ml: 4,
            '& .MuiTab-root': { 
              color: '#ffffff !important',
              fontWeight: 800,
              fontSize: '0.85rem',
              opacity: 0.7,
              transition: 'all 0.2s',
              minHeight: 70,
              '&:hover': { opacity: 1 }
            },
            '& .Mui-selected': { 
              opacity: 1 + ' !important'
            }
          }}
        >
          <Tab value="transcription" icon={<GavelIcon />} label={!isMobile ? t('nav_transcribe') : ""} />
          <Tab value="archives" icon={<ArchiveIcon />} label={!isMobile ? t('nav_archives') : ""} />
          <Tab value="intelligence" icon={<BookIcon />} label={!isMobile ? t('nav_intelligence') : ""} />
          <Tab value="studio" icon={<VideoIcon />} label={!isMobile ? t('nav_studio') : ""} />
          <Tab value="live" icon={<AgentIcon />} label={!isMobile ? t('nav_live') : ""} />
        </Tabs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <LanguageSwitcher />
          
          {!isMobile && (
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.08)', px: 2, py: 1, borderRadius: 2, border: '1px solid rgba(255,255,255,0.2)' }}>
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 900, display: 'block', mb: 0.5, textAlign: 'center', opacity: 0.8 }}>AI NODES</Typography>
              <Stack direction="row" spacing={0.5}>
                {nodes.length > 0 ? nodes.map((node) => (
                  <Tooltip 
                    key={node.index} 
                    title={`Node ${node.index + 1}`}
                    children={
                      <StatusIcon sx={{ 
                        fontSize: 12, 
                        color: node.isExhausted ? 'error.main' : (activeIndex === node.index ? 'info.main' : 'success.main'),
                        animation: activeIndex === node.index ? 'pulse 1s infinite' : 'none'
                      }} />
                    }
                  />
                )) : (
                  <Typography variant="caption" color="error" sx={{ fontSize: '0.6rem' }}>NO KEYS</Typography>
                )}
              </Stack>
            </Box>
          )}
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" fontWeight="900" sx={{ color: 'white' }}>{user.name}</Typography>
            <Chip label={user.role} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'secondary.main', color: 'primary.main', fontWeight: 900 }} />
          </Box>
          <IconButton onClick={onLogout} sx={{ color: 'white', border: 1, borderColor: 'rgba(255,255,255,0.3)' }}><LogoutIcon /></IconButton>
        </Box>
      </Toolbar>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </AppBar>
  );
};

export default Header;
