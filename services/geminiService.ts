import { GoogleGenAI, Modality, Type } from "@google/genai";
import { WorkoutSegment } from "../types";

// Use the environment variable directly as required by guidelines
// We assume process.env.API_KEY is available (polyfilled by vite.config.ts)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMotivationalTip = async (): Promise<string> => {
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

    // TTS audio is 24kHz PCM
    const sampleRate = 24000;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate});
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioContext,
      sampleRate,
      1
    );
    return audioBuffer;
  } catch (error) {
    console.error("Gemini TTS error:", error);
    return null;
  }
};

export const generateWorkoutPlan = async (title: string, durationStr: string, difficulty: string): Promise<WorkoutSegment[]> => {
  try {
    // Optimized for speed: Short prompt, no thinking budget
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a concise HIIT workout for "${title}" (${difficulty}, ${durationStr}). 
                 JSON Array only. Alternating 'exercise' (30-60s) and 'rest' (10-30s).
                 No markdown.`,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 }, // DISABLE THINKING FOR SPEED
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['exercise', 'rest'] },
              duration: { type: Type.INTEGER },
              reps: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ['name', 'type', 'duration']
          }
        }
      }
    });

    let text = response.text || "[]";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Plan Gen Error", e);
    // Instant Fallback
    return [
      { name: "Jumping Jacks", type: "exercise", duration: 45, reps: "Warmup" },
      { name: "Rest", type: "rest", duration: 15 },
      { name: "Pushups", type: "exercise", duration: 45, reps: "15-20" },
      { name: "Rest", type: "rest", duration: 15 },
      { name: "Squats", type: "exercise", duration: 45, reps: "20" },
      { name: "Rest", type: "rest", duration: 15 },
      { name: "Burpees", type: "exercise", duration: 30, reps: "Max effort" },
      { name: "Cooldown", type: "exercise", duration: 60, reps: "Stretch" }
    ];
  }
};

export const generateWorkoutVisualization = async (exerciseName: string): Promise<string | null> => {
  try {
    // gemini-2.5-flash-image supports aspect ratio config
    // Using 16:9 to fit the wide mobile container without cropping
    const prompt = `Futuristic neon green wireframe hologram of a fitness figure performing ${exerciseName}. Side view, minimalist schematic, black background.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
            aspectRatio: "16:9" 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
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

// Helper for decoding audio data (Raw PCM)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playAudioBuffer = (buffer: AudioBuffer) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
};