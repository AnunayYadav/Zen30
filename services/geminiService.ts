import { GoogleGenAI, Modality, Type } from "@google/genai";
import { WorkoutSegment, ChallengeTask } from "../types";
import { GEMINI_API_KEY } from "./config";

// Use the API key exported from our robust config
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
    4. DO NOT default to fitness/workouts unless the goal implies it.
    5. Include "Rest" or "Reflection" days every 5-7 days.
    6. For 'type', use 'Task' for main activities, 'Rest' for breaks.
    
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
              type: { type: Type.STRING, enum: ['Task', 'Rest', 'Mindset', 'Workout', 'Active Recovery'] },
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
          
          TASK: Rewrite the entire 30-day plan JSON