import { supabase } from './supabaseClient';
import { UserProfile, WorkoutSession, HabitLog, ChallengeState, ChallengeTask } from '../types';
import { PRODUCTION_URL } from './config';

export const getTodayStr = () => new Date().toISOString().split('T')[0];

export const Storage = {
  // --- Auth & User Management ---

  onAuthStateChange: (callback: (session: any) => void) => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },

  loginGoogle: async () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const redirectUrl = isLocal ? window.location.origin : PRODUCTION_URL;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false, 
      },
    });
    if (error) throw error;
  },

  loginEmail: async (email: string, password?: string) => {
    if (!password) throw new Error("Password required");
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  },

  signupEmail: async (email: string, password?: string, name?: string) => {
    if (!password) throw new Error("Password required");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });
    if (error) throw error;
    return data.user;
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.clear(); 
  },

  // --- Profile Data ---

  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching profile:", error);
      return null;
    }

    if (data) {
      return {
        id: data.id,
        name: data.name || 'User',
        email: data.email || '',
        joinDate: data.join_date || new Date().toISOString(),
        lastLoginDate: data.last_login_date || getTodayStr(),
        streak: data.streak || 0,
        weight: data.weight || 70,
        height: data.height || 175,
        weightHistory: data.weight_history || [],
        isPro: data.is_pro || false,
        onboardingComplete: data.onboarding_complete || false,
        profileImage: data.profile_image,
        challengeStartDate: data.challenge_start_date
      };
    }
    return null;
  },

  upsertProfile: async (user: Partial<UserProfile>) => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;
    if (!userId) return;

    const dbPayload = {
      id: userId,
      name: user.name,
      email: user.email,
      join_date: user.joinDate,
      last_login_date: user.lastLoginDate,
      streak: user.streak,
      weight: user.weight,
      height: user.height,
      weight_history: user.weightHistory,
      is_pro: user.isPro,
      onboarding_complete: user.onboardingComplete,
      profile_image: user.profileImage,
      challenge_start_date: user.challengeStartDate,
      updated_at: new Date().toISOString()
    };

    // Remove undefined keys
    Object.keys(dbPayload).forEach(key => (dbPayload as any)[key] === undefined && delete (dbPayload as any)[key]);

    const { error } = await supabase.from('profiles').upsert(dbPayload);
    if (error) console.error("Error saving profile:", error);
  },

  // --- History (Workouts) ---
  
  getHistory: async (): Promise<WorkoutSession[]> => {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error("Error fetching history:", error);
      return [];
    }
    
    return (data || []).map((d: any) => ({
      id: d.id,
      date: d.date,
      type: d.type,
      durationSeconds: d.duration_seconds,
      caloriesBurned: d.calories_burned,
      distanceKm: d.distance_km,
      category: d.category
    }));
  },

  saveSession: async (session: WorkoutSession) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const dbPayload = {
      user_id: user.id,
      date: session.date,
      type: session.type,
      duration_seconds: session.durationSeconds,
      calories_burned: session.caloriesBurned,
      distance_km: session.distanceKm,
      category: session.category
    };

    const { error } = await supabase.from('workout_sessions').insert(dbPayload);
    if (error) console.error("Error saving session:", error);

    return await Storage.getHistory();
  },

  resetStats: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Delete all workout sessions
    await supabase.from('workout_sessions').delete().eq('user_id', user.id);
    // Delete habits logs
    await supabase.from('habits').delete().eq('user_id', user.id);
    // Delete daily steps
    await supabase.from('daily_steps').delete().eq('user_id', user.id);
    
    // Reset profile stats
    const update = {
        streak: 0,
        weight_history: [],
        challenge_start_date: null
    };
    await supabase.from('profiles').update(update).eq('id', user.id);

    // Refresh profile
    return await Storage.getUserProfile(user.id);
  },

  // --- Habits ---

  getHabits: async (): Promise<HabitLog> => {
    const { data, error } = await supabase.from('habits').select('*');
    if (error) return {};

    const log: HabitLog = {};
    data?.forEach((row: any) => {
      if (!log[row.date]) log[row.date] = {};
      log[row.date][row.habit_id] = row.value;
    });
    return log;
  },

  saveHabitValue: async (habitId: string, value: number | boolean) => {
    const date = getTodayStr();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { error } = await supabase
      .from('habits')
      .upsert({
        user_id: user.id,
        date: date,
        habit_id: habitId,
        value: value
      }, { onConflict: 'user_id, date, habit_id' });

    if (error) console.error("Error saving habit:", error);
    return await Storage.getHabits();
  },

  // --- Challenge (AI Enhanced) ---

  getChallenge: async (): Promise<ChallengeState | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Fetch Cloud Progress
    const { data: cloudData } = await supabase.from('challenges').select('*').maybeSingle();
    
    // 2. Fetch Local Plan (Since DB might not support JSON plan column)
    const localPlanStr = localStorage.getItem(`zen30_plan_${user.id}`);
    const localGoal = localStorage.getItem(`zen30_goal_${user.id}`);

    if (!cloudData && !localPlanStr) return null;

    return {
      startDate: cloudData?.start_date || new Date().toISOString(),
      completedDays: cloudData?.completed_days || [],
      goal: localGoal || undefined,
      plan: localPlanStr ? JSON.parse(localPlanStr) : undefined
    };
  },

  initChallenge: async (plan: ChallengeTask[], goal: string) => {
    const start = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Save plan locally
    localStorage.setItem(`zen30_plan_${user.id}`, JSON.stringify(plan));
    localStorage.setItem(`zen30_goal_${user.id}`, goal);

    // Save progress start to cloud
    await supabase.from('challenges').upsert({
        user_id: user.id,
        start_date: start,
        completed_days: []
      });
      
    return { startDate: start, completedDays: [], goal, plan };
  },

  updateChallengePlan: async (newPlan: ChallengeTask[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    localStorage.setItem(`zen30_plan_${user.id}`, JSON.stringify(newPlan));
    
    // Return the refreshed state
    return await Storage.getChallenge();
  },

  completeChallengeDay: async (day: number) => {
    const current = await Storage.getChallenge();
    if (!current) return null; // Should not happen

    if (!current.completedDays.includes(day)) {
      const newDays = [...current.completedDays, day];
      const newState = { ...current, completedDays: newDays };

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('challenges').update({ completed_days: newDays }).eq('user_id', user.id);
      }
      return newState;
    }
    return current;
  },

  // Reset Progress ONLY (Keep plan)
  restartChallenge: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const start = new Date().toISOString();
    await supabase.from('challenges').update({
        start_date: start,
        completed_days: []
    }).eq('user_id', user.id);
    
    return await Storage.getChallenge();
  },

  // Delete everything (Progress + Plan)
  resetChallenge: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
      await supabase.from('challenges').delete().eq('user_id', user.id);
      localStorage.removeItem(`zen30_plan_${user.id}`);
      localStorage.removeItem(`zen30_goal_${user.id}`);
    }
    return null;
  },

  // --- Passive Steps ---
  getPassiveSteps: async (): Promise<number> => {
    const today = getTodayStr();
    const { data } = await supabase
      .from('daily_steps')
      .select('steps')
      .eq('date', today)
      .maybeSingle();
    return data?.steps || 0;
  },

  savePassiveSteps: async (steps: number) => {
    const today = getTodayStr();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('daily_steps').upsert({
      user_id: user.id,
      date: today,
      steps: steps
    }, { onConflict: 'user_id, date' });
  },
  
  getDailyTip: () => {
     const d = localStorage.getItem('zen30_dailytip');
     return d ? JSON.parse(d) : null;
  },
  saveDailyTip: (text: string) => {
     localStorage.setItem('zen30_dailytip', JSON.stringify({ date: getTodayStr(), text }));
  }
};