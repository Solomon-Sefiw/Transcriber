
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Box, Typography, Tabs, Tab, useMediaQuery, useTheme, IconButton, Tooltip, Chip, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import { 
  Gavel as GavelIcon, 
  MenuBook as BookIcon, 
  VideoLibrary as VideoIcon, 
  SupportAgent as AgentIcon,
  Logout as LogoutIcon,
  Inventory as ArchiveIcon,
  Sensors as OnlineIcon
} from '@mui/icons-material';
import { AppTab, User } from '../types';
import { getExhaustedNodes } from '../services/geminiService';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  user: User;
  onLogout: () => void;
  selectedNode: number;
  onNodeChange: (node: number) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, user, onLogout, selectedNode, onNodeChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [exhausted, setExhausted] = useState<number[]>([]);

  useEffect(() => {
    const refreshStatus = () => setExhausted(getExhaustedNodes());
    refreshStatus();
    
    // Listen for both manual and automatic node changes
    const handleStatusUpdate = () => refreshStatus();
    window.addEventListener('node-status-changed', handleStatusUpdate);
    window.addEventListener('node-switched', ((e: CustomEvent) => {
      onNodeChange(e.detail.node);
    }) as EventListener);

    const interval = setInterval(refreshStatus, 30000); // Check for cooldown resets every 30s
    return () => {
      window.removeEventListener('node-status-changed', handleStatusUpdate);
      clearInterval(interval);
    };
  }, [onNodeChange]);

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
          {!isMobile && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ color: 'secondary.main', fontWeight: 900, fontSize: '0.65rem' }}>AI NODE</InputLabel>
              <Select
                value={selectedNode}
                label="AI NODE"
                onChange={(e) => onNodeChange(e.target.value as number)}
                sx={{ 
                  color: 'white', 
                  height: 38,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'secondary.main' },
                  '.MuiSvgIcon-root': { color: 'secondary.main' },
                  fontSize: '0.75rem',
                  fontWeight: 900
                }}
              >
                {[...Array(10)].map((_, i) => {
                  const nodeNum = i + 1;
                  const isExhausted = exhausted.includes(nodeNum);
                  // Only show nodes that are NOT exhausted
                  if (isExhausted) return null;
                  
                  return (
                    <MenuItem key={nodeNum} value={nodeNum} sx={{ fontWeight: 800, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      Server {nodeNum} <OnlineIcon sx={{ fontSize: 12, ml: 1, color: 'success.main' }} />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}
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
