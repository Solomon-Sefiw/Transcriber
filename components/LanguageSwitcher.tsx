
import React from 'react';
import { Button, ButtonGroup, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Language as LangIcon } from '@mui/icons-material';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <ButtonGroup size="small" variant="outlined" sx={{ 
      borderColor: 'rgba(255,255,255,0.3)', 
      bgcolor: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <Tooltip title="አማርኛ (የፍርድ ቤት ይፋዊ ቋንቋ)">
        <Button 
          onClick={() => changeLanguage('am')}
          sx={{ 
            color: i18n.language === 'am' ? 'secondary.main' : 'white', 
            fontWeight: 900,
            borderColor: 'rgba(255,255,255,0.3) !important',
            minWidth: 60,
            fontSize: '0.9rem'
          }}
        >
          አማ
        </Button>
      </Tooltip>
      <Tooltip title="English (International Standards)">
        <Button 
          onClick={() => changeLanguage('en')}
          sx={{ 
            color: i18n.language === 'en' ? 'secondary.main' : 'white', 
            fontWeight: 900,
            borderColor: 'rgba(255,255,255,0.3) !important',
            minWidth: 60,
            fontSize: '0.8rem'
          }}
        >
          EN
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
};

export default LanguageSwitcher;
