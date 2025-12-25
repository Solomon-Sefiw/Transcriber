
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
        let loc;
        if (mode === 'maps') {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
          loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
        const data = await queryIntelligence(query, mode, loc);
        setResult(data);
      }
    } catch (e: any) {
      setResult({ text: "Official query failed. Check connection.", grounding: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 mb-8">Intelligence Portal</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {['search', 'maps', 'deep', 'fast'].map(m => (
            <button key={m} onClick={() => setMode(m as any)} className={`px-4 py-3 rounded-2xl text-xs font-black border uppercase tracking-widest transition-all ${mode === m ? 'bg-emerald-600 text-white shadow-xl' : 'bg-white text-gray-400 border-gray-100'}`}>
              {m === 'deep' ? 'Deep Thinking' : m === 'fast' ? 'Flash Consult' : m}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Inquire with AI..." className="flex-grow p-5 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none text-lg" onKeyDown={(e) => e.key === 'Enter' && handleQuery()} />
          <button onClick={handleQuery} disabled={loading} className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl disabled:bg-gray-300">
            {loading ? 'Thinking...' : 'Consult'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
          <p className="whitespace-pre-wrap text-slate-800 text-lg leading-relaxed">{result.text}</p>
          {result.grounding.length > 0 && (
            <div className="mt-12 pt-8 border-t flex flex-wrap gap-4">
              {result.grounding.map((chunk: any, idx) => {
                const item = chunk.web || chunk.maps;
                if (!item) return null;
                return (
                  <a key={idx} href={item.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-slate-50 border rounded-xl text-sm font-bold hover:bg-emerald-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.1 1.1"/></svg>
                    {item.title}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligenceView;
