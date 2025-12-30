import { supabase } from './supabaseClient';
import { UserProfile, WorkoutSession, HabitLog, ChallengeState } from '../types';
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

  // --- Challenge ---

  getChallenge: async (): Promise<ChallengeState | null> => {
    const { data, error } = await supabase.from('challenges').select('*').maybeSingle();
    if (error || !data) return null;

    return {
      startDate: data.start_date,
      completedDays: data.completed_days || []
    };
  },

  initChallenge: async (startDate?: string) => {
    const start = startDate || new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { startDate: '', completedDays: [] };
    
    await supabase.from('challenges').upsert({
        user_id: user.id,
        start_date: start,
        completed_days: []
      });
    return { startDate: start, completedDays: [] };
  },

  completeChallengeDay: async (day: number) => {
    const current = await Storage.getChallenge();
    if (!current) return await Storage.initChallenge();

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