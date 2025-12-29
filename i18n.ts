
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// To add a new language (e.g., Oromifa or Tigrinya), simply add a new key to the resources object below.
const resources = {
  am: {
    translation: {
      "app_title": "የዋግ ኸምራ ብሔረሰብ አስተዳደር ከፍተኛ ፍርድ ቤት",
      "app_subtitle": "Waghimra Nationality Administration HighCourt",
      "nav_transcribe": "ቃለ-ጉባኤ",
      "nav_archives": "መዝገብ ቤት",
      "nav_intelligence": "ህጋዊ መረጃ",
      "nav_studio": "ቪዲዮ ስቱዲዮ",
      "nav_live": "ቀጥታ ስርጭት",
      "login_portal": "የፍትህ መግቢያ ፖርታል",
      "login_subtitle": "የዋግ ኸምራ ከፍተኛ ፍርድ ቤት AI Suite",
      "secure_login": "በጥበቃ ግባ",
      "official_email": "ይፋዊ ኢሜይል",
      "security_password": "የጥበቃ የይለፍ ቃል",
      "transcribe_title": "የቃለ-ጉባኤ ጽሑፍ ማውጫ",
      "live_mic": "ቀጥታ ድምፅ መቅጃ",
      "import_file": "ፋይል አስገባ",
      "start_rec": "መቅዳት ጀምር",
      "stop_rec": "መቅዳት አቁም",
      "transcribe_btn": "ጽሑፍ አውጣ",
      "reset_btn": "እንደገና ጀምር",
      "case_ref": "የመዝገብ ቁጥር",
      "archive_btn": "መዝግብ",
      "authenticated_session": "የተፈቀደ ክፍለ ጊዜ",
      "ai_engine_active": "የAI ሞተር፡ ንቁ",
      "developed_by": "የለማው በ",
      "all_rights": "መብቱ በህግ የተጠበቀ ነው",
      "analyzing_msg": "የዋግ ኸምራ የፍትህ AI መረጃውን እየተነተነ ነው...",
      "node_status": "መስመር",
      "failover_msg": "መስመር ተቀይሯል፡ ወደ ሌላ መስመር በመዛወር ላይ...",
      "processing_evidence": "መረጃ በመተንተን ላይ...",
      "success_msg": "ቃለ-ጉባኤው በተሳካ ሁኔታ ተጠናቋል።",
      "error_msg": "የቴክኒክ ችግር ተፈጥሯል - እባክዎ እንደገና ይሞክሩ።",
      "save_success": "መረጃው በቋሚነት ተመዝግቧል።",
      "discard_confirm": "ያልተቀመጡ ለውጦች ይጥፋ?",
      "no_records": "ምንም የተመዘገበ መረጃ አልተገኘም"
    }
  },
  en: {
    translation: {
      "app_title": "የዋግ ኸምራ ብሔረሰብ አስተዳደር ከፍተኛ ፍርድ ቤት",
      "app_subtitle": "Waghimra Nationality Administration HighCourt",
      "nav_transcribe": "Transcribe",
      "nav_archives": "Archives",
      "nav_intelligence": "Intelligence",
      "nav_studio": "Studio",
      "nav_live": "Live",
      "login_portal": "JUDICIAL PORTAL",
      "login_subtitle": "WAGHIMRA HIGHCOURT AI SUITE",
      "secure_login": "SECURE LOGIN",
      "official_email": "Official Email",
      "security_password": "Security Password",
      "transcribe_title": "Judicial Record Transcription",
      "live_mic": "LIVE MIC CAPTURE",
      "import_file": "IMPORT AUDIO FILE",
      "start_rec": "START RECORDING",
      "stop_rec": "STOP RECORDING",
      "transcribe_btn": "TRANSCRIBE",
      "reset_btn": "RESET",
      "case_ref": "Case Reference ID",
      "archive_btn": "ARCHIVE",
      "authenticated_session": "AUTHENTICATED SESSION",
      "ai_engine_active": "AI ENGINE: ACTIVE",
      "developed_by": "Developed by",
      "all_rights": "All judicial data protected.",
      "analyzing_msg": "Waghimra Judicial AI is analyzing evidence...",
      "node_status": "Node",
      "failover_msg": "Cluster Failover: Switching to healthy AI node...",
      "processing_evidence": "Processing Evidence...",
      "success_msg": "Transcription complete.",
      "error_msg": "Technical error - please retry.",
      "save_success": "Record archived successfully.",
      "discard_confirm": "Discard unsaved changes?",
      "no_records": "No records found in archive."
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: "am", // Production Default: Amharic
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
