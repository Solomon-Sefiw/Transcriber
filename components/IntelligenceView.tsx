
import React, { useState } from 'react';
import { queryIntelligence, fastChat } from '../services/geminiService';

const IntelligenceView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, grounding: any[] } | null>(null);
  const [mode, setMode] = useState<'search' | 'maps' | 'deep' | 'fast'>('search');

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      if (mode === 'fast') {
        const text = await fastChat(query);
        setResult({ text, grounding: [] });
      } else {
        let location;
        if (mode === 'maps') {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
        const data = await queryIntelligence(query, mode as any, location);
        setResult(data);
      }
    } catch (e: any) {
      console.error(e);
      setResult({ text: "An error occurred. Check connection and permissions.", grounding: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 mb-8">Intelligence Consultation</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { id: 'search', label: 'Web Search', color: 'emerald' },
            { id: 'maps', label: 'Geo Grounding', color: 'emerald' },
            { id: 'deep', label: 'Deep Thinking', color: 'indigo' },
            { id: 'fast', label: 'Flash Assist', color: 'blue' }
          ].map(m => (
            <button 
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={`px-4 py-3 rounded-2xl text-xs font-black border transition-all uppercase tracking-widest ${
                mode === m.id ? `bg-${m.color}-600 text-white border-${m.color}-600 shadow-xl` : 'bg-white text-gray-500 border-gray-100 hover:border-emerald-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Input official query here..."
            className="flex-grow p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-lg font-medium"
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          />
          <button 
            onClick={handleQuery}
            disabled={loading}
            className={`px-10 py-5 text-white rounded-2xl font-black shadow-xl disabled:bg-gray-300 transition-transform active:scale-95 flex items-center gap-3 ${
              mode === 'deep' ? 'bg-indigo-600' : mode === 'fast' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Consult'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
          <div className="prose prose-emerald max-w-none">
            <p className="whitespace-pre-wrap text-slate-800 leading-relaxed text-lg font-medium">{result.text}</p>
          </div>
          
          {result.grounding.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-50">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 text-center">Reference Grounding</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.grounding.map((chunk, idx) => {
                  const item = chunk.web || chunk.maps;
                  if (!item) return null;
                  return (
                    <a 
                      key={idx} 
                      href={item.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 transition-all group shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.1 1.1"/></svg>
                      </div>
                      <span className="text-sm font-bold text-slate-700 truncate">{item.title}</span>
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
