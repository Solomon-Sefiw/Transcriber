
import React, { useState } from 'react';
import { editImage, generateVeoVideo } from '../services/geminiService';

const ImageVideoStudio: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{type: 'image' | 'video', url: string} | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRawFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAction = async (action: 'edit' | 'animate') => {
    if (!image || !rawFile) return;
    setLoading(true);
    setResult(null);
    setStatusMsg(action === 'edit' ? 'Applying AI edits...' : 'Generating cinematic video with Veo...');
    
    try {
      const base64Data = image.split(',')[1];
      const mimeType = rawFile.type;

      if (action === 'edit') {
        const editedUrl = await editImage(base64Data, mimeType, prompt || "Enhance this image for official government use.");
        setResult({ type: 'image', url: editedUrl });
      } else {
        // Check for API Key selection for Veo
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio?.openSelectKey();
        }
        const videoUrl = await generateVeoVideo(base64Data, mimeType, prompt || "A cinematic motion of this scene");
        setResult({ type: 'video', url: videoUrl });
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Media Source</h2>
          <div className="relative group">
            <input type="file" onChange={handleUpload} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <div className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${image ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
              {image ? (
                <img src={image} className="w-full h-full object-contain rounded-lg p-2" alt="Source" />
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <p className="text-sm font-medium text-gray-500">Click to upload photo</p>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-gray-700">Modification Prompt</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 'Add a retro filter', 'Remove background', 'Animate the clouds'"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 h-24 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button 
              onClick={() => handleAction('edit')}
              disabled={loading || !image}
              className="px-4 py-3 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              AI Edit
            </button>
            <button 
              onClick={() => handleAction('animate')}
              disabled={loading || !image}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Veo Animate
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Generated Output</h2>
          <div className="flex-grow rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <div className="text-center p-8">
                <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-emerald-800">{statusMsg}</p>
                <p className="text-xs text-gray-500 mt-2">This may take a few minutes for video generation.</p>
              </div>
            ) : result ? (
              result.type === 'image' ? (
                <img src={result.url} className="max-w-full max-h-full object-contain shadow-2xl rounded" alt="Result" />
              ) : (
                <video src={result.url} controls autoPlay loop className="max-w-full max-h-full shadow-2xl rounded" />
              )
            ) : (
              <div className="text-gray-300 text-center">
                <svg className="w-20 h-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <p className="font-medium">Output preview will appear here</p>
              </div>
            )}
          </div>
          {result && (
            <div className="mt-4 flex justify-end">
              <a href={result.url} download={`ethio_media_${Date.now()}`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                Download Result
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageVideoStudio;
