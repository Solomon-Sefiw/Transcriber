
import React, { useState } from 'react';
import { queryIntelligence } from '../services/geminiService';

const IntelligenceView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{text: string, grounding: any[]} | null>(null);
  const [mode, setMode] = useState<'search' | 'maps'>('search');

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      let location;
      if (mode === 'maps') {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      const data = await queryIntelligence(query, mode, location);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Grounded Government Intelligence</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <button 
            onClick={() => setMode('search')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${mode === 'search' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            Google Search Mode
          </button>
          <button 
            onClick={() => setMode('maps')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${mode === 'maps' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            Google Maps Mode
          </button>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'search' ? "Ask about latest news or official stats..." : "Find nearby government offices or landmarks..."}
            className="flex-grow p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          />
          <button 
            onClick={handleQuery}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 disabled:bg-gray-400"
          >
            {loading ? 'Consulting AI...' : 'Query'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
          <div className="prose prose-emerald max-w-none">
            <p className="whitespace-pre-wrap text-gray-800">{result.text}</p>
          </div>
          
          {result.grounding.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Official Sources & References</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.grounding.map((chunk, idx) => {
                  const item = chunk.web || chunk.maps;
                  if (!item) return null;
                  return (
                    <a 
                      key={idx} 
                      href={item.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-emerald-50 rounded-lg border border-gray-100 transition-colors group"
                    >
                      <div className="p-2 bg-white rounded shadow-sm group-hover:text-emerald-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">{item.title}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligenceView;
