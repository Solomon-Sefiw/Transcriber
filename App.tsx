
import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import TranscriptionView from './components/TranscriptionView';
import IntelligenceView from './components/IntelligenceView';
import ImageVideoStudio from './components/ImageVideoStudio';
import LiveAssistant from './components/LiveAssistant';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('transcription');

  const getTitle = () => {
    switch (activeTab) {
      case 'transcription': return 'Audio Transcription & Diarization';
      case 'intelligence': return 'Government Intelligence Portal';
      case 'studio': return 'Media & Video Production Studio';
      case 'live': return 'Real-time Voice Interface';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
             <div className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200">Official Portal</div>
             <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End-to-End Encrypted</div>
          </div>
          <h2 className="text-5xl font-black text-gray-900 tracking-tight leading-none mb-6">
            {getTitle()}
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl leading-relaxed">
            Advanced artificial intelligence specialized for the sovereign needs of the Federal Democratic Republic of Ethiopia.
          </p>
        </div>

        <div className="transition-all duration-500 transform">
          {activeTab === 'transcription' && <TranscriptionView />}
          {activeTab === 'intelligence' && <IntelligenceView />}
          {activeTab === 'studio' && <ImageVideoStudio />}
          {activeTab === 'live' && <LiveAssistant />}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;
