
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TranscriptionResponse } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Transcribes audio with diarization and language detection.
 * Uses Gemini 3 Flash for speed and JSON output reliability.
 */
export async function transcribeAudio(base64Data: string, mimeType: string): Promise<TranscriptionResponse> {
  const ai = getAI();
  const audioPart = { inlineData: { data: base64Data, mimeType } };
  const promptPart = {
    text: `You are an official government transcriptionist. 
    1. Transcribe the provided audio exactly as spoken. 
    2. Identify and label speakers (e.g., Speaker 1: [Text], Speaker 2: [Text]).
    3. Detect the primary language (Amharic, Oromo, Tigrinya, or English).
    Return the result strictly in this JSON format:
    { "language": "string", "transcript": "string" }`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [audioPart, promptPart] },
    config: { 
      temperature: 0.1,
      responseMimeType: "application/json",
      // Use responseSchema for structured JSON output as recommended in guidelines
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          language: {
            type: Type.STRING,
            description: "The detected primary language of the audio."
          },
          transcript: {
            type: Type.STRING,
            description: "The full transcript of the audio with speaker labels."
          }
        },
        required: ["language", "transcript"]
      }
    }
  });

  try {
    const text = response.text || "{}";
    return JSON.parse(text) as TranscriptionResponse;
  } catch (e) {
    return { transcript: response.text || "Failed to parse transcript.", language: "Auto-detected" };
  }
}

/**
 * Perform high-level reasoning or grounded search.
 */
export async function queryIntelligence(
  query: string, 
  mode: 'search' | 'maps' | 'deep', 
  location?: { lat: number, lng: number }
) {
  const ai = getAI();
  let model = 'gemini-3-flash-preview';
  let config: any = {};
  let tools: any[] = [];

  if (mode === 'search') {
    tools = [{ googleSearch: {} }];
  } else if (mode === 'maps') {
    model = 'gemini-2.5-flash';
    tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = {
        retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } }
      };
    }
  } else if (mode === 'deep') {
    model = 'gemini-3-pro-preview';
    // Use thinkingConfig as recommended for Gemini 3 Pro
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const response = await ai.models.generateContent({
    model,
    contents: query,
    config: { ...config, tools }
  });

  return {
    text: response.text,
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

/**
 * Fast, low-latency AI response using Flash Lite.
 */
export async function fastChat(message: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: message,
    config: { systemInstruction: "Be concise, professional, and fast." }
  });
  return response.text || "";
}

/**
 * Analyzes video content for key information.
 */
export async function analyzeVideo(base64Video: string, mimeType: string, prompt: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Video, mimeType } },
        { text: prompt }
      ]
    }
  });
  return response.text || "Analysis failed.";
}

/**
 * Edits images based on descriptive text.
 */
export async function editImage(base64Image: string, mimeType: string, prompt: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: prompt }
      ]
    }
  });
  
  const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (imgPart?.inlineData) return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
  throw new Error("No image generated.");
}

/**
 * Generates videos from images using Veo.
 */
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

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
