
import { GoogleGenAI } from "@google/genai";
import { TranscriptionResponse } from "../types";

// State to track exhausted or invalid keys
const exhaustedKeys: Record<number, number> = {};
const COOLDOWN_PERIOD = 10 * 60 * 1000;

/**
 * PRODUCTION KEY RESOLVER:
 * Checks process.env (Build time) and window.COURT_CONFIG (IIS Runtime)
 */
const getKeyPool = (): string[] => {
  const env = (process.env as any) || {};
  const win = (window as any).COURT_CONFIG || {};
  
  // Combine all possible sources
  const raw = env.API_KEY || env.GEMINI_API_KEY || win.API_KEYS || "";
  
  if (!raw) return [];
  
  return raw.split(",")
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 10);
};

export const getClusterStatus = () => {
  const pool = getKeyPool();
  const now = Date.now();
  return pool.map((_, index) => ({
    index,
    isExhausted: !!exhaustedKeys[index] && (now - exhaustedKeys[index] < COOLDOWN_PERIOD),
    configured: true
  }));
};

/**
 * DYNAMIC SUBJECT DETECTION TRANSCRIPTION
 */
export async function transcribeFullAudio(
  base64Data: string, 
  mimeType: string
): Promise<TranscriptionResponse> {
  const pool = getKeyPool();
  
  if (pool.length === 0 && !process.env.API_KEY) {
    throw new Error("DEPLOYMENT ERROR: No API Keys found in Environment or window.COURT_CONFIG. Check your IIS configuration.");
  }

  // Use the provided pool or fallback to the mandatory process.env.API_KEY
  const effectivePool = pool.length > 0 ? pool : [process.env.API_KEY || ""];

  for (let i = 0; i < effectivePool.length; i++) {
    const now = Date.now();
    if (exhaustedKeys[i] && (now - exhaustedKeys[i] < COOLDOWN_PERIOD)) continue;

    try {
      window.dispatchEvent(new CustomEvent('node-active', { detail: { index: i } }));
      
      const ai = new GoogleGenAI({ apiKey: effectivePool[i] });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { 
              text: `Act as a professional Ethiopian Government Stenographer.
                     
                     TASK: Transcribe the audio verbatim.
                     
                     STRICT SUBJECT DETECTION RULES:
                     1. DO NOT use pre-defined roles (like Clerk or Judge) unless the speaker specifically identifies as one or acts exactly like one.
                     2. ANALYZE the speech content to find the SUBJECT identity.
                     3. Example: If the person is reporting news or saying "this is the news", label as "ጋዜጠኛ:".
                     4. Example: If the person says "I am the defendant", label as "ተከሳሽ:".
                     5. Example: If the person is giving an official statement as a leader, use their specific title (e.g., "ጠቅላይ ሚኒስትር:").
                     6. If the identity is completely unknown, use "ተናጋሪ:".
                     
                     FORMAT:
                     - Use Amharic Speaker Tags ONLY (e.g., ጋዜጠኛ:, ምስክር:, ተከሳሽ:).
                     - No markdown (* or #).
                     - Format: [SUBJECT]: [CONTENT]` 
            }
          ]
        },
        config: { 
          temperature: 0.1,
          topP: 0.95
        }
      });

      if (!response.text) throw new Error("Empty AI response.");

      return {
        transcript: response.text.trim(),
        language: "Amharic/English"
      };

    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes('429') || msg.includes('quota') || msg.includes('400')) {
        exhaustedKeys[i] = Date.now();
        window.dispatchEvent(new CustomEvent('node-exhausted', { detail: { index: i } }));
        if (i < effectivePool.length - 1) continue;
      }
      throw new Error(`AI Node ${i + 1} Error: ${msg}`);
    }
  }
  throw new Error(`All available AI nodes are currently busy or unconfigured.`);
}

export async function queryIntelligence(query: string, mode: 'search' | 'maps' | 'deep' | 'fast', location?: { lat: number; lng: number }) {
  // Fresh GoogleGenAI instance for the request
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || getKeyPool()[0] || "" });
  
  // Model selection based on task type as per guidelines
  let model = 'gemini-3-flash-preview'; 
  if (mode === 'deep') model = 'gemini-3-pro-preview';
  if (mode === 'maps') model = 'gemini-2.5-flash'; // Maps grounding requires 2.5 series

  const config: any = { 
    systemInstruction: "Waghimra HighCourt Intelligence Unit. You are a senior legal researcher providing analysis and insights." 
  };

  if (mode === 'search') {
    config.tools = [{ googleSearch: {} }];
  } else if (mode === 'maps') {
    config.tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng
          }
        }
      };
    }
  }

  const response = await ai.models.generateContent({ model, contents: query, config });
  
  return { 
    text: response.text || "", 
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
  };
}

export async function generateVeoVideo(base64Data: string, mimeType: string, prompt: string): Promise<string> {
  // Use a fresh GoogleGenAI instance for Veo generation with process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: { 
      imageBytes: base64Data, 
      mimeType 
    },
    config: { 
      numberOfVideos: 1, 
      resolution: '720p', 
      aspectRatio: '16:9' 
    }
  });

  while (!operation.done) {
    await new Promise(res => setTimeout(res, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  // Always append the API key when fetching MP4 bytes from the download link
  return `${downloadLink}&key=${process.env.API_KEY}`;
}
