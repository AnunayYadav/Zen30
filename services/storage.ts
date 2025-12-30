import { supabase, isConfigured } from './supabaseClient';
import { UserProfile, WorkoutSession, HabitLog, ChallengeState, WeightEntry } from '../types';
import { PRODUCTION_URL } from './config';

export const getTodayStr = () => new Date().toISOString().split('T')[0];

// HELPER: Mock User for Offline Mode
const DEMO_USER_KEY = 'zen30_demo_user';
const getDemoUser = () => {
  const u = localStorage.getItem(DEMO_USER_KEY);
  return u ? JSON.parse(u) : null;
};
const setDemoUser = (user: any) => localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));

// HELPER: Mock DB for Offline Mode
const getLocalDB = <T>(key: string, defaultVal: T): T => {
  const d = localStorage.getItem(key);
  return d ? JSON.parse(d) : defaultVal;
};
const setLocalDB = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

export const Storage = {
  // --- Auth & User Management ---

  // Listen for auth changes (used in App.tsx)
  onAuthStateChange: (callback: (session: any) => void) => {
    if (!isConfigured) {
      // OFFLINE MODE: Check for fake session
      const user = getDemoUser();
      setTimeout(() => callback(user ? { user } : null), 100); // Async simulation
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },

  // Login with Google OAuth
  loginGoogle: async () => {
    if (!isConfigured) {
      // Mock Google Login
      alert("Google Login requires valid API Keys. Logging in as Demo User.");
      const user = { id: 'demo-google', email: 'demo@gmail.com', user_metadata: { full_name: 'Demo G-User' } };
      setDemoUser(user);
      window.location.reload(); // Reload to trigger auth state change in App
      return;
    }
    
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

  // Login with Email/Password
  loginEmail: async (email: string, password?: string) => {
    if (!password) throw new Error("Password required");
    
    if (!isConfigured) {
      // Mock Email Login
      const user = { id: 'demo-email', email, user_metadata: { full_name: 'Demo User' } };
      setDemoUser(user);
      window.location.reload();
      return user;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  },

  // Signup with Email
  signupEmail: async (email: string, password?: string, name?: string) => {
    if (!password) throw new Error("Password required");

    if (!isConfigured) {
      // Mock Signup
      const user = { id: 'demo-email', email, user_metadata: { full_name: name || 'Demo User' } };
      setDemoUser(user);
      window.location.reload();
      return user;
    }

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
    if (!isConfigured) {
      localStorage.removeItem(DEMO_USER_KEY);
      window.location.reload();
      return;
    }
    await supabase.auth.signOut();
    localStorage.clear(); // Clear local cache
  },

  // --- Profile Data ---

  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    if (!isConfigured) {
      return getLocalDB<UserProfile | null>('zen30_profile', null);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
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

  // Create or Update Profile
  upsertProfile: async (user: Partial<UserProfile>) => {
    if (!isConfigured) {
      // Merge with existing profile
      const current = getLocalDB('zen30_profile', {}) as UserProfile;
      const updated = { ...current, ...user };
      setLocalDB('zen30_profile', updated);
      return;
    }

    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;
    if (!userId) return;

    // Map camelCase to snake_case for DB
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

    const { error } = await supabase
      .from('profiles')
      .upsert(dbPayload);
    
    if (error) console.error("Error saving profile:", error);
  },

  // --- History (Workouts) ---
  
  getHistory: async (): Promise<WorkoutSession[]> => {
    if (!isConfigured) {
      return getLocalDB<WorkoutSession[]>('zen30_history', []);
    }

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
    if (!isConfigured) {
      const history = getLocalDB<WorkoutSession[]>('zen30_history', []);
      history.push(session);
      setLocalDB('zen30_history', history);
      return history;
    }

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
    if (!isConfigured) return getLocalDB<HabitLog>('zen30_habits', {});

    const { data, error } = await supabase
      .from('habits')
      .select('*');

    if (error) {
      console.error("Error fetching habits:", error);
      return {};
    }

    const log: HabitLog = {};
    data?.forEach((row: any) => {
      if (!log[row.date]) log[row.date] = {};
      log[row.date][row.habit_id] = row.value;
    });
    return log;
  },

  saveHabitValue: async (habitId: string, value: number | boolean) => {
    const date = getTodayStr();

    if (!isConfigured) {
      const habits = getLocalDB<HabitLog>('zen30_habits', {});
      if (!habits[date]) habits[date] = {};
      habits[date][habitId] = value;
      setLocalDB('zen30_habits', habits);
      return habits;
    }

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
    if (!isConfigured) return getLocalDB<ChallengeState | null>('zen30_challenge', null);

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .maybeSingle();

    if (error) console.error("Error fetching challenge:", error);
    if (!data) return null;

    return {
      startDate: data.start_date,
      completedDays: data.completed_days || []
    };
  },

  initChallenge: async (startDate?: string) => {
    const start = startDate || new Date().toISOString();

    if (!isConfigured) {
      const newState = { startDate: start, completedDays: [] };
      setLocalDB('zen30_challenge', newState);
      return newState;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { startDate: '', completedDays: [] };
    
    const { error } = await supabase
      .from('challenges')
      .upsert({
        user_id: user.id,
        start_date: start,
        completed_days: []
      });

    if (error) console.error("Error init challenge:", error);
    return { startDate: start, completedDays: [] };
  },

  completeChallengeDay: async (day: number) => {
    const current = await Storage.getChallenge();
    
    if (!current) {
      // Init if not exists
      return await Storage.initChallenge();
    }

    if (!current.completedDays.includes(day)) {
      const newDays = [...current.completedDays, day];
      const newState = { ...current, completedDays: newDays };

      if (!isConfigured) {
        setLocalDB('zen30_challenge', newState);
        return newState;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('challenges')
          .update({ completed_days: newDays })
          .eq('user_id', user.id);
        if (error) console.error("Error updating challenge:", error);
      }
      return newState;
    }
    
    return current;
  },

  // --- Passive Steps ---
  getPassiveSteps: async (): Promise<number> => {
    const today = getTodayStr();
    if (!isConfigured) {
      const stepsLog = getLocalDB<Record<string, number>>('zen30_steps', {});
      return stepsLog[today] || 0;
    }

    const { data } = await supabase
      .from('daily_steps')
      .select('steps')
      .eq('date', today)
      .maybeSingle();
      
    return data?.steps || 0;
  },

  savePassiveSteps: async (steps: number) => {
    const today = getTodayStr();
    if (!isConfigured) {
       const stepsLog = getLocalDB<Record<string, number>>('zen30_steps', {});
       stepsLog[today] = steps;
       setLocalDB('zen30_steps', stepsLog);
       return;
    }

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