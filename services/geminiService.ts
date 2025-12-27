
import { GoogleGenAI } from "@google/genai";
import { TranscriptionResponse } from "../types";

export const delay = (ms: number) => {
  const jitter = Math.random() * 500;
  return new Promise(res => setTimeout(res, ms + jitter));
};

/**
 * Key Management & Status Tracking
 */
const EXHAUSTION_TIMEOUT = 10 * 60 * 1000; // 10 minutes cooldown

export const getExhaustedNodes = (): number[] => {
  const data = localStorage.getItem('exhausted_nodes');
  if (!data) return [];
  const nodes: Record<string, number> = JSON.parse(data);
  const now = Date.now();
  
  // Filter out expired cooldowns
  const active = Object.entries(nodes)
    .filter(([_, expiry]) => expiry > now)
    .map(([node, _]) => parseInt(node));
  
  return active;
};

const markNodeExhausted = (node: number) => {
  const data = localStorage.getItem('exhausted_nodes');
  const nodes: Record<string, number> = data ? JSON.parse(data) : {};
  nodes[node.toString()] = Date.now() + EXHAUSTION_TIMEOUT;
  localStorage.setItem('exhausted_nodes', JSON.stringify(nodes));
  
  // Notify UI to refresh dropdown and active node
  window.dispatchEvent(new CustomEvent('node-status-changed', { detail: { exhausted: node } }));
};

const getApiKeyForNode = (node: number) => {
  const keyName = `GEMINI_API_KEY_${node}`;
  // @ts-ignore
  const key = process.env[keyName];
  return key || process.env.API_KEY;
};

/**
 * SMART FAILOVER TRANSCRIPTION
 * Tries all 10 nodes starting from the current selection.
 */
export async function transcribeFullAudio(
  base64Data: string, 
  mimeType: string
): Promise<TranscriptionResponse> {
  const startNode = parseInt(localStorage.getItem('active_ai_node') || '1');
  let lastError: any = null;

  // Try all 10 nodes in sequence
  for (let i = 0; i < 10; i++) {
    const currentNode = ((startNode + i - 1) % 10) + 1;
    
    // Skip if recently exhausted (unless we've looped through everything)
    if (getExhaustedNodes().includes(currentNode) && i < 9) continue;

    const apiKey = getApiKeyForNode(currentNode);
    if (!apiKey) continue;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      // Sync the UI to show which node is currently being tried
      localStorage.setItem('active_ai_node', currentNode.toString());
      window.dispatchEvent(new CustomEvent('node-switched', { detail: { node: currentNode } }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `Act as Waghimra HighCourt Stenographer. 
                     Verbatim transcript with speaker labels.
                     
                     STRICT RULES:
                     1. Plain text ONLY. No Markdown.
                     2. ZERO SPACING: Every line must follow the previous one immediately.
                     3. No empty lines. One turn per line.
                     4. Format: "SPEAKER:Text" (e.g., JUDGE:የቀረበው..., ጠያቂ:አዎ...).` }
          ]
        },
        config: { temperature: 0.1 }
      });

      const text = response.text || "";
      if (!text) throw new Error("Empty response");

      return {
        transcript: text.trim(),
        language: "Amharic/Auto"
      };
    } catch (error: any) {
      lastError = error;
      const msg = error?.message || "";
      
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`Node ${currentNode} exhausted. Failing over...`);
        markNodeExhausted(currentNode);
        continue; // Try next node
      }
      
      throw error; // If it's not a quota error, stop and report it
    }
  }

  throw new Error(`CRITICAL: All 10 Judicial AI Nodes are currently at capacity. Please try again in 10 minutes.`);
}

/**
 * Other services using the currently active healthy key
 */
const getHealthyKey = () => {
  const node = parseInt(localStorage.getItem('active_ai_node') || '1');
  return getApiKeyForNode(node);
};

export async function analyzeJudicialHearing(transcript: string) {
  const ai = new GoogleGenAI({ apiKey: getHealthyKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize for HighCourt record:\n${transcript}`,
    config: { systemInstruction: "Waghimra HighCourt Analyst." }
  });
  return response.text || "Summary failed.";
}

export async function queryIntelligence(query: string, mode: 'search' | 'maps' | 'deep' | 'fast', location?: { lat: number, lng: number }) {
  const ai = new GoogleGenAI({ apiKey: getHealthyKey() });
  let model = 'gemini-3-flash-preview';
  let config: any = { systemInstruction: "Waghimra Judicial Support Assistant." };
  
  if (mode === 'search') config.tools = [{ googleSearch: {} }];
  else if (mode === 'maps') {
    model = 'gemini-2.5-flash';
    config.tools = [{ googleMaps: {} }];
    if (location) config.toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } };
  } else if (mode === 'deep') model = 'gemini-3-pro-preview';

  const response = await ai.models.generateContent({ model, contents: query, config });
  return { text: response.text, grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
}

export async function fastChat(message: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getHealthyKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: message
  });
  return response.text || "";
}

export async function generateVeoVideo(base64Data: string, mimeType: string, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getHealthyKey() });
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
  return `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${getHealthyKey()}`;
}
