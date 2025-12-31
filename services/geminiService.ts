import { GoogleGenAI, Modality, Type } from "@google/genai";
import { WorkoutSegment, ChallengeTask } from "../types";
import { GEMINI_API_KEY } from "./config";

// Use the API key exported from our robust config
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

export const generate30DayChallenge = async (goal: string, level: string): Promise<ChallengeTask[]> => {
  try {
    const prompt = `Create a progressive 30-day fitness challenge schedule for a user whose goal is: "${goal}" and fitness level is: "${level}".
    Include Rest days (every 5-7 days) and Active Recovery days.
    Return a strict JSON array of 30 objects.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Workout', 'Rest', 'Active Recovery'] },
              duration: { type: Type.STRING },
              instructions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of 3-5 key exercises or tips for the day"
              }
            },
            required: ['day', 'title', 'type', 'duration', 'description']
          }
        }
      }
    });

    let text = response.text || "[]";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(text);
    // Ensure days are numbered 1-30 just in case
    return plan.map((p: any, idx: number) => ({ ...p, day: idx + 1 }));

  } catch (e) {
    console.error("Challenge Gen Error", e);
    // Fallback to static data if AI fails
    return Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      title: "Full Body Burn",
      description: "Fallback workout due to AI connection issue.",
      type: "Workout",
      duration: "30 min",
      instructions: ["Pushups", "Squats", "Plank"]
    }));
  }
};

export const modifyChallengePlan = async (currentPlan: ChallengeTask[], instruction: string): Promise<ChallengeTask[]> => {
  try {
    const prompt = `
      I have a 30-day workout plan. I need to modify it based on this request: "${instruction}".
      
      Here is the CURRENT PLAN (JSON):
      ${JSON.stringify(currentPlan.slice(0, 5))} ... (and so on).

      RULES:
      1. Return a FULL 30-day JSON array.
      2. Keep the same structure.
      3. Only modify days that need changing based on the request.
      4. If the user asks to add tasks, insert them into relevant days' instructions or change the workout title/description.
      
      Do not output markdown code blocks. Just the JSON.
    `;

    // We send a simplified version of the plan to save tokens if needed, 
    // but for best results, let's trust Gemini context window.
    // Re-constructing the full prompt with full context:
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
          User Request: "${instruction}"
          Current Plan Context (First 3 days sample): ${JSON.stringify(currentPlan.slice(0, 3))}
          
          TASK: Rewrite the entire 30-day plan JSON array to accommodate the request. 
          Keep day numbers 1-30.
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['Workout', 'Rest', 'Active Recovery'] },
                duration: { type: Type.STRING },
                instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['day', 'title', 'type', 'duration', 'description']
            }
          }
        }
    });

    let text = response.text || "[]";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);

  } catch (e) {
    console.error("Modify Plan Error", e);
    throw new Error("Failed to modify plan. Try again.");
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