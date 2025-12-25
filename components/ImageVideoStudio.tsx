
import React, { useState } from 'react';
import { editImage, generateVeoVideo, analyzeVideo } from '../services/geminiService';

const ImageVideoStudio: React.FC = () => {
  const [media, setMedia] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{type: 'image' | 'video' | 'text', url?: string, text?: string} | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRawFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setMedia(ev.target?.result as string);
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const handleAction = async (action: 'edit' | 'animate' | 'analyze') => {
    if (!media || !rawFile) return;
    setLoading(true);
    setResult(null);
    
    try {
      const base64Data = media.split(',')[1];
      const mimeType = rawFile.type;

      if (action === 'edit') {
        setStatusMsg('Applying AI edits...');
        const editedUrl = await editImage(base64Data, mimeType, prompt || "Enhance this image for official government use.");
        setResult({ type: 'image', url: editedUrl });
      } else if (action === 'animate') {
        setStatusMsg('Generating cinematic video with Veo...');
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio?.openSelectKey();
        }
        const videoUrl = await generateVeoVideo(base64Data, mimeType, prompt || "A cinematic motion of this scene");
        setResult({ type: 'video', url: videoUrl });
      } else if (action === 'analyze') {
        setStatusMsg('Analyzing video content with Gemini Pro...');
        const text = await analyzeVideo(base64Data, mimeType, prompt || "Provide a detailed summary and key information from this video.");
        setResult({ type: 'text', text });
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const isVideo = rawFile?.type.startsWith('video/');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Media Source</h2>
          <div className="relative group">
            <input type="file" onChange={handleUpload} accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <div className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${media ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
              {media ? (
                isVideo ? (
                  <video src={media} className="w-full h-full object-contain p-2" muted />
                ) : (
                  <img src={media} className="w-full h-full object-contain rounded-lg p-2" alt="Source" />
                )
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <p className="text-sm font-medium text-gray-500">Upload Photo or Video</p>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-gray-700">Prompt / Task</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isVideo ? "Ask Gemini to summarize or find info..." : "e.g. 'Add a retro filter', 'Animate the clouds'"}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 h-24 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {!isVideo ? (
              <>
                <button 
                  onClick={() => handleAction('edit')}
                  disabled={loading || !media}
                  className="px-4 py-3 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
                >
                  AI Edit
                </button>
                <button 
                  onClick={() => handleAction('animate')}
                  disabled={loading || !media}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
                >
                  Animate
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleAction('analyze')}
                disabled={loading || !media}
                className="col-span-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-bold shadow-md hover:bg-purple-700 disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
              >
                Analyze with Pro
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Output</h2>
          <div className="flex-grow rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <div className="text-center p-8">
                <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-emerald-800">{statusMsg}</p>
              </div>
            ) : result ? (
              result.type === 'image' ? (
                <img src={result.url} className="max-w-full max-h-full object-contain shadow-lg rounded" alt="Result" />
              ) : result.type === 'video' ? (
                <video src={result.url} controls autoPlay loop className="max-w-full max-h-full shadow-lg rounded" />
              ) : (
                <div className="p-8 prose prose-emerald max-w-none w-full h-full overflow-y-auto">
                  <p className="text-gray-800 whitespace-pre-wrap">{result.text}</p>
                </div>
              )
            ) : (
              <div className="text-gray-300 text-center">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                <p className="font-medium">Output will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageVideoStudio;
