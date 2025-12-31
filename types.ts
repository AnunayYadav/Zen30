
export enum Screen {
  SPLASH = 'SPLASH',
  ONBOARDING = 'ONBOARDING',
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  WORKOUTS = 'WORKOUTS',
  RUNNING = 'RUNNING',
  CHALLENGE = 'CHALLENGE',
  HABITS = 'HABITS',
  PROGRESS = 'PROGRESS',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
}

export type WorkoutCategory = 'Chest' | 'Legs' | 'Cardio' | 'Stretch';
export type WorkoutDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Workout {
  id: string;
  title: string;
  duration: string; // Display string "45 min"
  estCalories: number;
  image: string;
  category: WorkoutCategory;
  difficulty: WorkoutDifficulty;
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO String
  type: 'Run' | 'Workout';
  durationSeconds: number;
  caloriesBurned: number;
  distanceKm?: number;
  category?: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string; // Stored locally for simulation
  joinDate: string;
  lastLoginDate: string;
  streak: number;
  weight: number; // current weight kg
  height: number; // cm
  weightHistory: WeightEntry[];
  profileImage?: string;
  isPro: boolean;
  challengeStartDate?: string;
  onboardingComplete: boolean;
}

export type HabitType = 'toggle' | 'counter';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  type: HabitType;
  target?: number; // e.g., 3 liters
  unit?: string;   // e.g., 'L'
}

// Map of date (YYYY-MM-DD) to map of habit ID to value (boolean for toggle, number for counter)
export interface HabitLog {
  [date: string]: {
    [habitId: string]: number | boolean;
  };
}

export interface ChallengeTask {
  day: number;
  title: string;
  description: string;
  type: 'Workout' | 'Rest' | 'Active Recovery';
  duration?: string;
  instructions?: string[]; // Specific exercises for AI plan
}

export interface ChallengeLog {
  notes: string;
  checkedIndices: number[];
}

export interface ChallengeState {
  startDate: string; // ISO String of when challenge started
  completedDays: number[]; // Array of day numbers (1-30) completed
  goal?: string; // The user's prompt
  plan?: ChallengeTask[]; // The AI generated 30 day plan
  logs?: Record<number, ChallengeLog>; // Daily progress logs
}

export interface WorkoutSegment {
  name: string;
  type: 'exercise' | 'rest';
  duration: number; // seconds
  reps?: string;
  notes?: string;
}
