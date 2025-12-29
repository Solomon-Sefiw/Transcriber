
import React, { useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, 
  Stack, Divider, InputAdornment, IconButton, Alert, Chip
} from '@mui/material';
import { 
  Lock as LockIcon, 
  Email as EmailIcon, 
  Visibility, 
  VisibilityOff,
  Gavel as GavelIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { User } from '../types';
import { apiService } from '../services/apiService';
import { useTranslation } from 'react-i18next';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await apiService.login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  const setTestUser = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('court123');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a3d52 0%, #052a3a 100%)',
      p: 2
    }}>
      <Paper elevation={24} sx={{ p: 6, maxWidth: 450, width: '100%', borderRadius: 6, textAlign: 'center' }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            width: 80, height: 80, borderRadius: '50%', bgcolor: 'secondary.main', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            mx: 'auto', mb: 2, boxShadow: '0 8px 16px rgba(197, 160, 89, 0.3)'
          }}>
            <GavelIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" fontWeight="900" color="primary.main">{t('login_portal')}</Typography>
          <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.5 }}>
            {t('login_subtitle')}
          </Typography>
        </Box>

        <form onSubmit={handleLogin}>
          <Stack spacing={3}>
            {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
            
            <TextField
              fullWidth
              label={t('official_email')}
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label={t('security_password')}
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Button 
              fullWidth 
              variant="contained" 
              size="large" 
              type="submit"
              disabled={loading}
              sx={{ py: 2, borderRadius: 3, bgcolor: 'primary.main', fontWeight: 900 }}
            >
              {loading ? 'AUTHENTICATING...' : t('secure_login')}
            </Button>
          </Stack>
        </form>

        <Box sx={{ mt: 4 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>TEST ROLES (Password: court123)</Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
            <Chip label="Clerk" size="small" onClick={() => setTestUser('clerk@court.et')} sx={{ cursor: 'pointer' }} />
            <Chip label="Judge" size="small" onClick={() => setTestUser('judge@court.et')} sx={{ cursor: 'pointer' }} />
            <Chip label="Admin" size="small" onClick={() => setTestUser('admin@court.et')} sx={{ cursor: 'pointer' }} />
          </Stack>
        </Box>

        <Divider sx={{ my: 4 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SecurityIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled" fontWeight="bold">SECURED BY 2S TEC IDENTITY</Typography>
          </Stack>
        </Divider>

        <Typography variant="caption" color="text.secondary" display="block">
          Access is strictly monitored for judicial integrity.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AuthView;
