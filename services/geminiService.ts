
import { GoogleGenAI } from "@google/genai";
import { TranscriptionResponse } from "../types";

export const delay = (ms: number) => {
  const jitter = Math.random() * 500;
  return new Promise(res => setTimeout(res, ms + jitter));
};

const EXHAUSTION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

/**
 * Gets the API key for a specific node, handling formatting and sanitization.
 */
const getSanitizedKey = (node: number): string | undefined => {
  const keyName = `GEMINI_API_KEY_${node}`;
  // @ts-ignore - access process.env dynamically
  let rawKey = process.env[keyName];
  
  // Node 1 fallback to the main API_KEY if specific key is missing
  if (!rawKey && node === 1) {
    rawKey = process.env.API_KEY;
  }
  
  if (typeof rawKey === 'string' && rawKey.length > 5) {
    // Cleanup any accidental quotes or spaces from .env.local
    return rawKey.replace(/['"]+/g, '').trim();
  }
  return undefined;
};

/**
 * Returns true if a node has a valid key assigned.
 */
export const isNodeConfigured = (node: number): boolean => {
  return !!getSanitizedKey(node);
};

export const getExhaustedNodes = (): number[] => {
  const data = localStorage.getItem('exhausted_nodes');
  if (!data) return [];
  try {
    const nodes: Record<string, number> = JSON.parse(data);
    const now = Date.now();
    return Object.entries(nodes)
      .filter(([_, expiry]) => expiry > now)
      .map(([node, _]) => parseInt(node));
  } catch {
    return [];
  }
};

const markNodeExhausted = (node: number) => {
  const data = localStorage.getItem('exhausted_nodes');
  const nodes: Record<string, number> = data ? JSON.parse(data) : {};
  nodes[node.toString()] = Date.now() + EXHAUSTION_TIMEOUT;
  localStorage.setItem('exhausted_nodes', JSON.stringify(nodes));
  window.dispatchEvent(new CustomEvent('node-status-changed'));
};

/**
 * SMART FAILOVER TRANSCRIPTION
 * Automatically rotates through nodes 1-10 if a quota limit is reached.
 */
export async function transcribeFullAudio(
  base64Data: string, 
  mimeType: string
): Promise<TranscriptionResponse> {
  const startNode = parseInt(localStorage.getItem('active_ai_node') || '1');
  let lastErrorMessage = "";

  for (let i = 0; i < 10; i++) {
    const currentNode = ((startNode + i - 1) % 10) + 1;
    
    // Check if this node is available
    if (!isNodeConfigured(currentNode)) continue;
    if (getExhaustedNodes().includes(currentNode) && i < 9) continue;

    const apiKey = getSanitizedKey(currentNode);
    if (!apiKey) continue;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      // Update UI for the node being attempted
      localStorage.setItem('active_ai_node', currentNode.toString());
      window.dispatchEvent(new CustomEvent('node-switched', { detail: { node: currentNode } }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `Act as Waghimra HighCourt Stenographer. Verbatim transcript with speaker labels.
                     STRICT RULES:
                     1. Plain text ONLY. No Markdown.
                     2. ZERO SPACING: Every line must follow the previous one immediately.
                     3. No empty lines. One turn per line.
                     4. Format: "SPEAKER:Text" (e.g., JUDGE:የቀረበው ማስረጃ..., ጠያቂ:አዎ...).` }
          ]
        },
        config: { temperature: 0.1 }
      });

      if (!response.text) throw new Error("Empty response from AI engine.");

      return {
        transcript: response.text.trim(),
        language: "Amharic/Auto"
      };
    } catch (error: any) {
      lastErrorMessage = error.message || "Unknown error";
      console.warn(`Node ${currentNode} encountered an error:`, lastErrorMessage);
      
      // Automatic failover on quota or generic service busy errors
      if (lastErrorMessage.includes('429') || lastErrorMessage.includes('RESOURCE_EXHAUSTED')) {
        markNodeExhausted(currentNode);
        continue; 
      }
      
      // If we still have nodes to try, keep going
      if (i < 9) continue;
      
      throw error;
    }
  }
  throw new Error(`All 10 Judicial AI Nodes are currently at capacity. Details: ${lastErrorMessage}`);
}

const getHealthyKey = () => {
  const node = parseInt(localStorage.getItem('active_ai_node') || '1');
  return getSanitizedKey(node) || getSanitizedKey(1) || "";
};

export async function analyzeJudicialHearing(transcript: string) {
  const ai = new GoogleGenAI({ apiKey: getHealthyKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize for judicial record:\n${transcript}`,
  });
  return response.text || "Summary failed.";
}

export async function queryIntelligence(query: string, mode: 'search' | 'maps' | 'deep' | 'fast', location?: { lat: number, lng: number }) {
  const ai = new GoogleGenAI({ apiKey: getHealthyKey() });
  let model = 'gemini-3-flash-preview';
  let config: any = { systemInstruction: "Waghimra Judicial Assistant." };
  if (mode === 'search') config.tools = [{ googleSearch: {} }];
  else if (mode === 'maps') {
    model = 'gemini-2.5-flash';
    config.tools = [{ googleMaps: {} }];
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
