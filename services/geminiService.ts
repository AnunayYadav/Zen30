import { GoogleGenAI, Modality } from "@google/genai";

// Ensure API key is present
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateMotivationalTip = async (): Promise<string> => {
  if (!apiKey) return "Stay hard! (API Key missing)";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Give me a short, punchy, Gen-Z style fitness motivation quote. Max 15 words. No emojis in text.",
    });
    return response.text || "Level up your grind today.";
  } catch (error) {
    console.error("Gemini text error:", error);
    return "Consistency is key.";
  }
};

export const generateRunningCoachSpeech = async (text: string): Promise<AudioBuffer | null> => {
  if (!apiKey) {
    console.warn("API Key missing for TTS");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Deep, intense voice for fitness
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioContext,
    );
    return audioBuffer;
  } catch (error) {
    console.error("Gemini TTS error:", error);
    return null;
  }
};

// Helper for decoding base64
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper for decoding audio data
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext
): Promise<AudioBuffer> {
  // We need to copy the buffer because decodeAudioData detaches it
  const bufferCopy = data.buffer.slice(0); 
  return await ctx.decodeAudioData(bufferCopy);
}

export const playAudioBuffer = (buffer: AudioBuffer) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
};
