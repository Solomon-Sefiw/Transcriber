import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResponse } from "../types";

export const delay = (ms: number) => {
  const jitter = Math.random() * 500;
  return new Promise(res => setTimeout(res, ms + jitter));
};

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * PRODUCTION QUOTA SAVER: Process the entire audio/video file in ONE call.
 * This is critical for users on the 20-request/day free tier.
 */
export async function transcribeFullAudio(
  base64Data: string, 
  mimeType: string,
  retryCount = 0
): Promise<TranscriptionResponse> {
  const ai = getAI();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: `ROLE: Official HighCourt Stenographer - Waghimra Nationality Administration. 
                   TASK: Verbatim transcription of this judicial recording.
                   FOCUS: Identifying individual speakers (e.g., "JUDGE:", "DEFENDANT:", "WITNESS:").
                   STYLE: Clear, professional, speaker-labeled text.
                   NOTE: Verbatim accuracy is paramount. No timestamps.
                   FORMAT: Respond ONLY with a JSON object containing "language" and "transcript" strings.` }
        ]
      },
      config: { 
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING },
            transcript: { type: Type.STRING }
          },
          required: ["language", "transcript"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as TranscriptionResponse;
  } catch (error: any) {
    const errorMsg = error?.message || "";
    
    // Handle 429 (Quota Exceeded) with parsing for the retry time
    if (errorMsg.includes('429') && retryCount < 1) {
      const waitMatch = errorMsg.match(/retry in ([\d.]+)s/);
      const waitTime = waitMatch ? (parseFloat(waitMatch[1]) + 1) * 1000 : 10000;
      await delay(waitTime);
      return transcribeFullAudio(base64Data, mimeType, retryCount + 1);
    }
    
    throw error;
  }
}

export async function analyzeJudicialHearing(transcript: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this Waghimra HighCourt transcript. Produce a detailed Legal Summary.
    TRANSCRIPT: ${transcript}`,
    config: { systemInstruction: "Waghimra HighCourt Judicial Analyst." }
  });
  return response.text || "Summary generation failed.";
}

export async function queryIntelligence(query: string, mode: 'search' | 'maps' | 'deep' | 'fast', location?: { lat: number, lng: number }) {
  const ai = getAI();
  let model = 'gemini-3-flash-preview';
  let config: any = { systemInstruction: "Waghimra Judicial Support Assistant." };
  
  if (mode === 'search') config.tools = [{ googleSearch: {} }];
  else if (mode === 'maps') {
    model = 'gemini-2.5-flash';
    config.tools = [{ googleMaps: {} }];
    if (location) config.toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } };
  } else if (mode === 'deep') {
    model = 'gemini-3-pro-preview';
  }

  const response = await ai.models.generateContent({ model, contents: query, config });
  return { text: response.text, grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
}

export async function fastChat(message: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: message
  });
  return response.text || "";
}

export async function generateVeoVideo(base64Data: string, mimeType: string, prompt: string): Promise<string> {
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: { imageBytes: base64Data, mimeType },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });
  while (!operation.done) {
    await delay(10000);
    operation = await ai.operations.getVideosOperation({ operation });
  }
  return `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${process.env.API_KEY}`;
}
