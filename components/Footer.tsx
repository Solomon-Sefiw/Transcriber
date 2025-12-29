
import React from 'react';
import { Box, Container, Typography, Link, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Box component="footer" sx={{ bgcolor: 'white', py: 6, mt: 'auto', borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={4}>
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" color="primary.main" fontWeight={900}>
              {t('app_subtitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Official Judicial Support System | Federal Democratic Republic of Ethiopia
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('developed_by')}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', bgcolor: 'secondary.light', px: 1, borderRadius: 0.5 }}>
                2S Tec
              </Typography>
            </Box>
          </Box>
          
          <Stack direction="row" spacing={3}>
            <Link href="#" color="text.secondary" variant="caption" fontWeight="bold" underline="hover">Judicial Ethics</Link>
            <Link href="#" color="text.secondary" variant="caption" fontWeight="bold" underline="hover">Case Privacy</Link>
            <Link href="#" color="text.secondary" variant="caption" fontWeight="bold" underline="hover">Accessibility</Link>
            <Link href="#" color="text.secondary" variant="caption" fontWeight="bold" underline="hover">Help Desk</Link>
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.disabled" align="center" sx={{ display: 'block', mt: 4, pt: 2, borderTop: 1, borderColor: 'grey.50' }}>
          © {new Date().getFullYear()} Waghimra HighCourt. {t('all_rights')}
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
