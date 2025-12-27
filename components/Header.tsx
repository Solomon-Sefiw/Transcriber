
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
import { getExhaustedNodes, isNodeConfigured } from '../services/geminiService';

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
    window.addEventListener('node-status-changed', refreshStatus);
    window.addEventListener('node-switched', ((e: CustomEvent) => onNodeChange(e.detail.node)) as EventListener);
    return () => window.removeEventListener('node-status-changed', refreshStatus);
  }, [onNodeChange]);

  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: 'primary.main', borderBottom: '3px solid', borderColor: 'secondary.main' }}>
      <Toolbar sx={{ height: 100, justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box component="img" src="logo.png" sx={{ width: 50, height: 50 }} onError={(e: any) => e.target.src = 'https://placehold.co/60x60/0a3d52/c5a059?text=Court'} />
          {!isMobile && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main', fontSize: '0.9rem' }}>የዋግ ኸምራ ብሔረሰብ አስተዳደር ከፍተኛ ፍርድ ቤት</Typography>
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>Waghimra Nationality Administration HighCourt</Typography>
            </Box>
          )}
        </Box>

        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} textColor="inherit" indicatorColor="secondary">
          <Tab value="transcription" icon={<GavelIcon />} label={!isMobile ? "Transcribe" : ""} />
          <Tab value="archives" icon={<ArchiveIcon />} label={!isMobile ? "Archives" : ""} />
          <Tab value="intelligence" icon={<BookIcon />} label={!isMobile ? "Legal Intel" : ""} />
          <Tab value="studio" icon={<VideoIcon />} label={!isMobile ? "Evidence" : ""} />
          <Tab value="live" icon={<AgentIcon />} label={!isMobile ? "Court Live" : ""} />
        </Tabs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!isMobile && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ color: 'secondary.main', fontSize: '0.65rem' }}>AI NODE</InputLabel>
              <Select
                value={selectedNode}
                label="AI NODE"
                onChange={(e) => onNodeChange(e.target.value as number)}
                sx={{ color: 'white', height: 38, bgcolor: 'rgba(255,255,255,0.05)', fontSize: '0.75rem', fontWeight: 900 }}
              >
                {[...Array(10)].map((_, i) => {
                  const n = i + 1;
                  if (!isNodeConfigured(n) || exhausted.includes(n)) return null;
                  return <MenuItem key={n} value={n} sx={{ fontWeight: 800 }}>Server {n} <OnlineIcon sx={{ fontSize: 12, ml: 1, color: 'success.main' }} /></MenuItem>;
                })}
              </Select>
            </FormControl>
          )}
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" fontWeight="900" color="white">{user.name}</Typography>
            <Chip label={user.role} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'secondary.main', color: 'primary.main' }} />
          </Box>
          <IconButton onClick={onLogout} sx={{ color: 'secondary.main' }}><LogoutIcon /></IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
