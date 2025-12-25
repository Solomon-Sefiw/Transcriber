
import React from 'react';
import { AppBar, Toolbar, Box, Typography, Tabs, Tab, useMediaQuery, useTheme, IconButton, Tooltip, Avatar, Chip } from '@mui/material';
import { 
  Gavel as GavelIcon, 
  MenuBook as BookIcon, 
  VideoLibrary as VideoIcon, 
  SupportAgent as AgentIcon,
  Logout as LogoutIcon,
  Inventory as ArchiveIcon,
  Person as UserIcon
} from '@mui/icons-material';
import { AppTab, User } from '../types';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: AppTab) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { id: 'transcription', label: 'Transcribe', icon: <GavelIcon /> },
    { id: 'archives', label: 'Archives', icon: <ArchiveIcon /> },
    { id: 'intelligence', label: 'Legal Intel', icon: <BookIcon /> },
    { id: 'studio', label: 'Evidence', icon: <VideoIcon /> },
    { id: 'live', label: 'Court Live', icon: <AgentIcon /> },
  ];

  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: 'primary.main', borderBottom: '3px solid', borderColor: 'secondary.main' }}>
      <Toolbar sx={{ height: 100, justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box 
            component="img" 
            src="logo.png" 
            alt="Waghimra HighCourt Logo"
            onError={(e: any) => { e.target.src = 'https://placehold.co/60x60/0a3d52/c5a059?text=Court'; }}
            sx={{ width: 50, height: 50, objectFit: 'contain' }}
          />
          {!isMobile && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', lineHeight: 1.1, fontSize: '0.9rem' }}>
                የዋግ ኸምራ ብሔረሰብ አስተዳደር ከፍተኛ ፍርድ ቤት
              </Typography>
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 700, letterSpacing: 0.5, opacity: 0.9, fontSize: '0.7rem' }}>
                Waghimra Nationality Administration HighCourt
              </Typography>
            </Box>
          )}
        </Box>

        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="secondary"
          textColor="inherit"
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          sx={{
            height: 100,
            '& .MuiTab-root': {
              minHeight: 100,
              textTransform: 'uppercase',
              fontWeight: 800,
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.7)',
              '&.Mui-selected': { color: 'secondary.main' }
            },
            '& .MuiTabs-indicator': { height: 4 }
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={!isMobile ? tab.label : ''} icon={tab.icon} iconPosition="top" />
          ))}
        </Tabs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" fontWeight="900" color="white">{user.name}</Typography>
            <Chip label={user.role} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'secondary.main', fontWeight: 900, color: 'primary.main' }} />
          </Box>
          <Tooltip title="Secure Logout">
            <IconButton onClick={onLogout} sx={{ color: 'secondary.main' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
