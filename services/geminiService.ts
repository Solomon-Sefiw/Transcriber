
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
        { text: "ROLE: Professional Court Stenographer for the Waghimra Nationality Administration HighCourt. TASK: Transcribe courtroom audio verbatim. INSTRUCTION: Use Speaker Diarization (e.g., 'JUDGE:', 'DEFENSE:', 'WITNESS:'). Identify if the language is Amharic, Afaan Oromo, Tigrinya, or English. Format output as strictly JSON." }
      ]
    },
    config: { 
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          language: { type: Type.STRING, description: "The detected primary language" },
          transcript: { type: Type.STRING, description: "The full verbatim transcript with speaker IDs" }
        },
        required: ["language", "transcript"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as TranscriptionResponse;
  } catch (e) {
    return { transcript: response.text || "Transcript could not be parsed into legal format.", language: "Multilingual/Unknown" };
  }
}

export async function analyzeJudicialHearing(transcript: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following Waghimra HighCourt transcript. Provide a concise legal report.
    STRUCTURE:
    - CASE SUMMARY: Brief context.
    - CORE TESTIMONY: Key evidence provided by witnesses.
    - LEGAL OBSERVATIONS: Points relevant to Ethiopian Proclamations.
    - ADMINISTRATIVE ACTIONS: Required next steps for the Clerk.
    
    TRANSCRIPT:
    ${transcript}`,
    config: {
      systemInstruction: "You are a Chief Judicial Clerk for the Federal Republic of Ethiopia. Your analysis must be formal, precise, and objective."
    }
  });
  return response.text || "Judicial analysis engine failed to generate report.";
}

export async function queryIntelligence(query: string, mode: 'search' | 'maps' | 'deep' | 'fast', location?: { lat: number, lng: number }) {
  const ai = getAI();
  let model = 'gemini-3-flash-preview';
  let config: any = {
    systemInstruction: "You are an AI Judicial Assistant for the Waghimra HighCourt. Access official Ethiopian law, regional maps, and legal precedents. Always cite sources from government proclamations where available."
  };
  
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
    config: { systemInstruction: "Be a concise, professional judicial assistant for the Ethiopian HighCourt." }
  });
  return response.text || "";
}

export async function analyzeVideo(base64Video: string, mimeType: string, prompt: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { data: base64Video, mimeType } }, { text: prompt }] }
  });
  return response.text || "Video evidence analysis failed.";
}

export async function editImage(base64Image: string, mimeType: string, prompt: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: prompt }] }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  throw new Error("AI failed to process evidence image.");
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
