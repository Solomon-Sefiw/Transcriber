
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

  const renderContent = () => {
    switch (activeTab) {
      case 'transcription': return <TranscriptionView />;
      case 'intelligence': return <IntelligenceView />;
      case 'studio': return <ImageVideoStudio />;
      case 'live': return <LiveAssistant />;
      default: return <TranscriptionView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {activeTab === 'transcription' && 'Audio Transcription & Diarization'}
            {activeTab === 'intelligence' && 'Government Intelligence Portal'}
            {activeTab === 'studio' && 'Image & Video Production Studio'}
            {activeTab === 'live' && 'Real-time Voice Assistant'}
          </h2>
          <p className="text-gray-500 mt-2">
            Secure, AI-powered official workflows for the Federal Democratic Republic of Ethiopia.
          </p>
        </div>
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default App;
