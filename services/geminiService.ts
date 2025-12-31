import { GoogleGenAI, Modality, Type } from "@google/genai";
import { WorkoutSegment, ChallengeTask } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMotivationalTip = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Give me a short, punchy, Gen-Z style motivation quote for a lifestyle app. Max 15 words. No emojis in text.",
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
    const prompt = `Create a strict 30-day challenge schedule for a user whose goal is: "${goal}" and level is: "${level}".
    
    CRITICAL RULES:
    1. The tasks MUST be 100% relevant to the specific goal.
    2. If the goal is "Study Math", tasks must be about studying math (e.g., "Solve 5 problems").
    3. If the goal is "Lose Weight", tasks must be fitness related.
    4. If the goal is "Learn to Cook", tasks must be cooking related.
    5. DO NOT include fitness/workouts unless the goal explicitly asks for it.
    6. Include "Rest" or "Reflection" days every 5-7 days.
    
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
              type: { type: Type.STRING, description: "Category of the day e.g. Task, Rest, Study, Code, Workout" },
              duration: { type: Type.STRING },
              instructions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of 3-5 key actionable items for the day"
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
      title: "Daily Mission",
      description: "Focus on your goal.",
      type: "Task",
      duration: "30 min",
      instructions: ["Complete main task", "Review progress"]
    }));
  }
};

export const modifyChallengePlan = async (currentPlan: ChallengeTask[], instruction: string): Promise<ChallengeTask[]> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
          User Request: "${instruction}"
          Current Plan Context (First 3 days sample): ${JSON.stringify(currentPlan.slice(0, 3))}
          
          TASK: Rewrite the entire 30-day plan JSON array based on the request.
          Keep the same structure.
        `,
        config: {
           responseMimeType: 'application/json',
           // We reuse the same loose schema to allow flexible types
           responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING },
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
    const plan = JSON.parse(text);
    return plan.map((p: any, idx: number) => ({ ...p, day: idx + 1 }));
  } catch (e) {
      console.error("Modify Plan Error", e);
      return currentPlan;
  }
};

// Helper for audio decoding
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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