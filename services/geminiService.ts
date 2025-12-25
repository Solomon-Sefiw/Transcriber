
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TranscriptionResponse } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function transcribeAudio(base64Data: string, mimeType: string): Promise<TranscriptionResponse> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Transcribe this audio exactly. Detect the primary language (Amharic, Oromo, Tigrinya, or English) and perform speaker diarization. Output ONLY JSON." }
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

  try {
    return JSON.parse(response.text || "{}") as TranscriptionResponse;
  } catch (e) {
    return { transcript: response.text || "Error parsing transcript.", language: "Detected" };
  }
}

export async function queryIntelligence(query: string, mode: 'search' | 'maps' | 'deep', location?: { lat: number, lng: number }) {
  const ai = getAI();
  let model = 'gemini-3-flash-preview';
  let config: any = {};
  
  if (mode === 'search') {
    config.tools = [{ googleSearch: {} }];
  } else if (mode === 'maps') {
    model = 'gemini-2.5-flash';
    config.tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } };
    }
  } else if (mode === 'deep') {
    model = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const response = await ai.models.generateContent({ model, contents: query, config });
  return {
    text: response.text,
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

export async function fastChat(message: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: message,
    config: { systemInstruction: "Be a professional, fast Ethiopian government assistant." }
  });
  return response.text || "";
}

export async function analyzeVideo(base64Video: string, mimeType: string, prompt: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { data: base64Video, mimeType } }, { text: prompt }] }
  });
  return response.text || "Video analysis failed.";
}

export async function editImage(base64Image: string, mimeType: string, prompt: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: prompt }] }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  throw new Error("No image generated.");
}

export async function generateVeoVideo(imageBytes: string, mimeType: string, prompt: string) {
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: { imageBytes, mimeType },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });
  while (!operation.done) {
    await new Promise(r => setTimeout(r, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  const link = operation.response?.generatedVideos?.[0]?.video?.uri;
  const res = await fetch(`${link}&key=${process.env.API_KEY}`);
  return URL.createObjectURL(await res.blob());
}
