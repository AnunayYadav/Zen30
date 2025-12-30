import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { Screen, Workout, WorkoutSession, UserProfile, HabitLog, ChallengeState, Habit, WorkoutCategory } from './types';
import { generateMotivationalTip, generateWorkoutVisualization } from './services/geminiService';
import { Storage, getTodayStr } from './services/storage';
import { SoundService } from './services/soundService';
import { PedometerService } from './services/pedometer';
import { WORKOUT_DB } from './services/workoutData';
import { CHALLENGE_DB } from './services/challengeData';
import { supabase } from './services/supabaseClient';
import { 
  Play, Pause, StopCircle, Flame, Activity, Dumbbell, Zap, Clock, Footprints,
  User as UserIcon, LogOut, Settings, Share2, Camera, Lock, CheckCircle, AlertCircle, Loader2, Trophy, Edit2, X, Volume2,
  Monitor, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, YAxis } from 'recharts';

// --- Constants ---
const DEFAULT_HABITS: Habit[] = [
  { id: 'h1', name: 'Drink Water', icon: '💧', type: 'counter', target: 8, unit: 'cups' },
  { id: 'h2', name: 'Morning Run', icon: '🏃', type: 'toggle' },
  { id: 'h3', name: 'Fix Posture', icon: '🧘', type: 'toggle' },
  { id: 'h4', name: 'Skincare', icon: '✨', type: 'toggle' },
  { id: 'h5', name: '8h Sleep', icon: '😴', type: 'toggle' },
];

// --- Sub-Components ---

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neon-green/10 via-transparent to-transparent opacity-50 animate-pulse-slow"></div>
      <h1 className="text-5xl font-bold text-white tracking-tighter neon-text mb-4 animate-bounce">
        ZEN<span className="text-neon-green">30</span>
      </h1>
      <p className="text-neon-blue font-light tracking-widest text-sm uppercase animate-pulse">Level up your body</p>
    </div>
  );
};

const AuthScreen: React.FC<{ onLoginSuccess: (user: UserProfile) => void }> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await Storage.loginGoogle();
    } catch (e: any) {
      setError(e.message || "Google Auth Failed");
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setError("");
    try {
      if (isLogin) await Storage.loginEmail(email, password);
      else await Storage.signupEmail(email, password, name);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col justify-center bg-black p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[50%] bg-neon-green/5 blur-3xl rounded-full pointer-events-none" />
      <h1 className="text-4xl font-bold text-white mb-2 z-10">{isLogin ? "Welcome Back" : "Join the Grind"}</h1>
      <p className="text-gray-400 mb-8 z-10">{isLogin ? "Login to sync your stats." : "Create an account to start."}</p>
      
      <div className="space-y-4 z-10">
        {!isLogin && <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none" />}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none" />
        
        {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900/50 flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}

        <button onClick={handleEmailAuth} disabled={loading} className="w-full bg-neon-green text-black font-bold py-4 rounded-xl flex items-center justify-center hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all">
          {loading ? <Loader2 className="animate-spin" /> : (isLogin ? "Login" : "Sign Up")}
        </button>
        
        <div className="flex items-center my-4"><div className="flex-grow border-t border-white/10"></div><span className="mx-4 text-gray-600">or</span><div className="flex-grow border-t border-white/10"></div></div>

        <button onClick={handleGoogleLogin} className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200">
          G Continue with Google
        </button>

        <p className="text-center text-gray-500 mt-6 cursor-pointer hover:text-white" onClick={() => { setIsLogin(!isLogin); setError(""); }}>
            {isLogin ? "New here? Sign Up" : "Have an account? Login"}
        </p>
      </div>
    </div>
  );
};

const SettingsModal: React.FC<{ isOpen: boolean, onClose: () => void, user: UserProfile }> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
             <div className="flex items-center gap-3">
               <Volume2 className="text-neon-green" size={20} />
               <span>Sound Effects</span>
             </div>
             <div className="w-10 h-6 bg-neon-green rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full shadow"></div></div>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl opacity-50">
             <div className="flex items-center gap-3">
               <Clock className="text-neon-blue" size={20} />
               <span>Notifications</span>
             </div>
             <span className="text-xs text-gray-500">Coming Soon</span>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <h3 className="text-xs text-gray-400 uppercase mb-2">Account</h3>
            <p className="text-white font-medium">{user.email}</p>
            <p className="text-gray-500 text-xs">User ID: {user.id.slice(0,8)}...</p>
          </div>
          <div className="text-center text-gray-600 text-xs mt-4">v1.0.0 • Zen30</div>
        </div>
      </div>
    </div>
  );
};

// --- Active Session with Timer & AI Visualization ---
const ActiveSessionScreen: React.FC<{ 
    mode: 'Run' | 'Workout', 
    workout: Workout | null, 
    onClose: (session: WorkoutSession | null) => void 
}> = ({ mode, workout, onClose }) => {
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false); // Start paused
    const [aiImage, setAiImage] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);

    // Initial Start Effect
    useEffect(() => {
        SoundService.playStart();
        setIsActive(true);
    }, []);

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => {
                   const next = s + 1;
                   // Sound effects logic
                   if (next % 60 === 0) SoundService.playTick(); // Minute tick
                   return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // Format Timer
    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleToggle = () => {
        // Sound for timer control is good UX
        SoundService.playClick();
        setIsActive(!isActive);
    };

    const handleFinish = () => {
        SoundService.playSuccess();
        const calories = Math.floor(seconds * (mode === 'Run' ? 0.15 : 0.12));
        onClose({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            type: mode,
            durationSeconds: seconds,
            caloriesBurned: calories,
            category: workout?.category || 'Freestyle'
        });
    };

    const handleGenerateHologram = async () => {
        if (!workout) return;
        setLoadingAi(true);
        // Removed click sound here as per request to reduce sound clutter
        const img = await generateWorkoutVisualization(workout.title);
        setAiImage(img);
        setLoadingAi(false);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col p-6 animate-in fade-in duration-300">
             {/* Background Pulse */}
            <div className={`absolute inset-0 bg-neon-green/5 ${isActive ? 'animate-pulse-slow' : ''} pointer-events-none`}></div>

            {/* Header */}
            <div className="flex justify-between items-center z-10 mb-8">
                <div>
                    <h2 className="text-sm text-neon-green font-bold uppercase tracking-widest">{mode} SESSION</h2>
                    <h1 className="text-3xl font-bold text-white">{workout?.title || "Freestyle Run"}</h1>
                </div>
                <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-mono text-neon-blue border border-neon-blue/30 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    LIVE
                </div>
            </div>

            {/* AI Visualization Area */}
            {mode === 'Workout' && (
                <div className="w-full aspect-video bg-black/50 rounded-2xl border border-white/10 mb-8 relative overflow-hidden group">
                    {loadingAi ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neon-green">
                             <Loader2 className="animate-spin mb-2" />
                             <span className="text-xs animate-pulse">GENERATING HOLOGRAM...</span>
                        </div>
                    ) : aiImage ? (
                        <>
                            <img src={aiImage} alt="AI Visual" className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-black/80 px-2 rounded">GEN AI RENDER</div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Activity className="text-gray-700 mb-4" size={48} />
                            <button 
                                onClick={handleGenerateHologram}
                                className="bg-white/10 hover:bg-neon-green hover:text-black text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/20 flex items-center gap-2"
                            >
                                <Zap size={14} /> Visualize with Gemini 3D
                            </button>
                        </div>
                    )}
                     {/* Scanning Effect Overlay */}
                    {aiImage && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-green/10 to-transparent h-[10%] w-full animate-[scan_3s_linear_infinite] pointer-events-none"></div>}
                </div>
            )}

            {/* Timer Display */}
            <div className="flex-grow flex flex-col items-center justify-center z-10">
                <div className="relative mb-8">
                     <svg className="w-64 h-64 transform -rotate-90">
                        <circle cx="128" cy="128" r="120" stroke="#222" strokeWidth="8" fill="transparent" />
                        <circle 
                            cx="128" cy="128" r="120" 
                            stroke={isActive ? "#ccff00" : "#555"} 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray="753"
                            strokeDashoffset={753 - ((seconds % 60) / 60) * 753}
                            className="transition-all duration-1000 ease-linear"
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-6xl font-mono font-bold text-white tracking-tighter">{formatTime(seconds)}</span>
                        <span className="text-gray-500 text-sm uppercase mt-2 tracking-widest">Duration</span>
                     </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8 w-full max-w-xs text-center">
                    <div>
                        <div className="text-neon-blue text-2xl font-bold">{Math.floor(seconds * (mode==='Run'?0.15:0.12))}</div>
                        <div className="text-gray-500 text-xs uppercase">Calories</div>
                    </div>
                    <div>
                         {/* Mock Heart Rate */}
                        <div className="text-purple-500 text-2xl font-bold">{isActive ? 120 + Math.floor(Math.random()*10) : '--'}</div>
                        <div className="text-gray-500 text-xs uppercase">BPM</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 z-10 pb-8">
                <button 
                    onClick={handleToggle}
                    className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                >
                    {isActive ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                </button>
                
                <button 
                    onClick={handleFinish}
                    className="w-24 h-24 rounded-full bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all"
                >
                    <StopCircle size={40} fill="currentColor" />
                </button>
            </div>
        </div>
    );
};

// --- Main App Logic ---

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.SPLASH);
  
  // Data
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [habits, setHabits] = useState<HabitLog>({});
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [passiveSteps, setPassiveSteps] = useState(0);
  const [pedometerActive, setPedometerActive] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // Active Session State
  const [activeSessionMode, setActiveSessionMode] = useState<'Run' | 'Workout' | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);

  // Auth Listener
  useEffect(() => {
    // Basic hash handling to clean URL, no bounce logic
    if (window.location.hash.includes('access_token')) {
        window.history.replaceState({}, document.title, '/');
    }

    const { data: { subscription } } = Storage.onAuthStateChange(async (session) => {
      if (session) {
        setLoadingData(true);
        try {
          const userId = session.user.id;
          let profile = await Storage.getUserProfile(userId);
          
          if (!profile) {
            const newProfile: Partial<UserProfile> = {
                id: userId,
                name: session.user.user_metadata.full_name || 'Zen30 User',
                email: session.user.email || '',
                joinDate: new Date().toISOString(),
                streak: 0,
                weight: 70,
                height: 175,
                weightHistory: [{ date: getTodayStr(), weight: 70 }],
                isPro: false,
                onboardingComplete: true
            };
            await Storage.upsertProfile(newProfile);
            profile = newProfile as UserProfile;
          }

          setUser(profile);
          
          const [h, habitsLog, ch, steps] = await Promise.all([
            Storage.getHistory(),
            Storage.getHabits(),
            Storage.getChallenge(),
            Storage.getPassiveSteps()
          ]);

          setHistory(h);
          setHabits(habitsLog);
          setChallenge(ch);
          setPassiveSteps(steps);
          
          setCurrentScreen(Screen.DASHBOARD);
        } catch (e) {
          console.error("Data load error", e);
        } finally {
          setLoadingData(false);
        }
      } else {
        setUser(null);
        setCurrentScreen(Screen.AUTH);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const calculatedStreak = useMemo(() => {
    if (history.length === 0) return 0;
    const dates = new Set(history.map(h => h.date.split('T')[0]));
    let streak = 0;
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    if (dates.has(todayStr)) streak++;
    while (true) {
      d.setDate(d.getDate() - 1);
      const dateStr = d.toISOString().split('T')[0];
      if (dates.has(dateStr)) streak++; else break;
    }
    return streak;
  }, [history]);

  const todaysStats = useMemo(() => {
    const todayStr = getTodayStr();
    const todaysSessions = history.filter(h => h.date.startsWith(todayStr));
    const workoutSteps = Math.floor(todaysSessions.reduce((acc, s) => acc + (s.distanceKm ? s.distanceKm * 1300 : 0), 0));
    const totalSteps = workoutSteps + passiveSteps;
    const passiveCalories = Math.floor(passiveSteps * 0.04);
    return {
      steps: totalSteps,
      calories: Math.floor(todaysSessions.reduce((acc, s) => acc + s.caloriesBurned, 0)) + passiveCalories,
      activeMinutes: Math.round(todaysSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60)
    };
  }, [history, passiveSteps]);

  // Handlers
  const handleLogout = () => {
    Storage.logout();
  };

  const handleShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Zen30 Stats',
                text: `I'm crushing it on Zen30! ${calculatedStreak} day streak. Level up with me!`,
                url: 'https://zen30.vercel.app'
            });
        } catch (e) { console.log('Share dismissed'); }
    } else {
        alert("Sharing not supported on this device, but keep crushing it! 🚀");
    }
  };

  const handleEnablePedometer = async () => {
    const status = await PedometerService.requestPermission();
    if (status === 'granted') {
      setPedometerActive(true);
      PedometerService.start(() => {
        setPassiveSteps(prev => {
          const newValue = prev + 1;
          Storage.savePassiveSteps(newValue); 
          return newValue;
        });
      });
    }
  };

  const handleUpdateHabit = async (id: string, val: number | boolean) => {
     setHabits(prev => {
         const today = getTodayStr();
         const newLog = { ...prev };
         if(!newLog[today]) newLog[today] = {};
         newLog[today][id] = val;
         return newLog;
     });
     // Removed success sound here to be less annoying, unless it's a big milestone? 
     // For now, silent update as per "just add to the workout section timer".
     await Storage.saveHabitValue(id, val);
  };

  const handleStartChallenge = async () => {
      // Starting a challenge is a big event, keeping playStart.
      SoundService.playStart();
      const newState = await Storage.initChallenge();
      setChallenge(newState);
  };

  const handleCompleteChallengeDay = async (day: number) => {
      // Completing a day is definitely a "success" moment like finishing a workout.
      SoundService.playSuccess();
      const newState = await Storage.completeChallengeDay(day);
      setChallenge({...newState});
      // Log as workout
      const session: WorkoutSession = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: 'Workout',
          durationSeconds: 45 * 60,
          caloriesBurned: 350,
          category: 'Challenge'
      };
      const newHistory = await Storage.saveSession(session);
      setHistory(newHistory);
  };

  const renderContent = () => {
      switch (currentScreen) {
          case Screen.DASHBOARD: 
             return <DashboardScreen 
                onNavigate={(s) => { setCurrentScreen(s); }} 
                user={user!} streak={calculatedStreak} todaysStats={todaysStats} 
                onStartQuickWorkout={(t) => {
                    if(t === 'Stretch') { setActiveWorkout(WORKOUT_DB.find(w => w.category==='Stretch') || null); setActiveSessionMode('Workout'); }
                }} 
                onEnablePedometer={handleEnablePedometer} pedometerActive={pedometerActive}
            />;
          case Screen.WORKOUTS: return <WorkoutSelectionScreen onStartWorkout={(w) => { setActiveWorkout(w); setActiveSessionMode('Workout'); }} />;
          case Screen.RUNNING:  setActiveSessionMode('Run'); return null; // Immediately switches to session overlay
          case Screen.CHALLENGE: return <ChallengeScreen state={challenge} onInit={handleStartChallenge} onCompleteDay={handleCompleteChallengeDay} />;
          case Screen.HABITS: return <HabitTrackerScreen habits={habits} onUpdateHabit={handleUpdateHabit} />;
          case Screen.PROGRESS: return <ProgressScreen history={history} user={user!} />;
          case Screen.PROFILE: return <ProfileScreen 
                user={user!} history={history} streak={calculatedStreak} 
                onLogout={handleLogout} 
                onUpdateWeight={async (w) => {
                    const newHistory = [...user!.weightHistory, { date: getTodayStr(), weight: w }];
                    const updated = { ...user!, weight: w, weightHistory: newHistory };
                    setUser(updated);
                    await Storage.upsertProfile(updated);
                }} 
                onUpdateImage={async (img) => {
                    // Placeholder for image update logic
                }}
                onOpenSettings={() => { setShowSettings(true); }}
                onShare={handleShare}
          />;
          default: return null;
      }
  };

  if (loadingData) return <div className="h-screen bg-black flex flex-col items-center justify-center"><Loader2 className="animate-spin text-neon-green" size={48}/><p className="text-gray-500 mt-4 animate-pulse">SYNCING ZEN30...</p></div>;

  return (
    <div className="bg-black min-h-screen text-white font-sans max-w-md mx-auto relative shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
      {currentScreen === Screen.SPLASH && <SplashScreen onComplete={() => setCurrentScreen(Screen.AUTH)} />}
      {currentScreen === Screen.AUTH && <AuthScreen onLoginSuccess={() => {}} />}
      
      {/* Main Content */}
      {user && !activeSessionMode && currentScreen !== Screen.SPLASH && currentScreen !== Screen.AUTH && (
          <>
            {renderContent()}
            <Navigation currentScreen={currentScreen} onNavigate={(s) => { setCurrentScreen(s); }} />
            <SettingsModal isOpen={showSettings} onClose={() => { setShowSettings(false); }} user={user} />
          </>
      )}

      {/* Active Session Overlay */}
      {activeSessionMode && (
          <ActiveSessionScreen 
             mode={activeSessionMode} 
             workout={activeWorkout} 
             onClose={async (data) => {
                 setActiveSessionMode(null);
                 if(data) {
                     const h = await Storage.saveSession(data);
                     setHistory(h);
                     setCurrentScreen(Screen.PROGRESS);
                 }
             }} 
          />
      )}
    </div>
  );
};

// --- Sub-Components (Restored and updated) ---

// (Reusing existing sub-components but updating specific button handlers in App main logic)
// To keep file size manageable and avoid repetition, I am declaring them here briefly if they needed internal state changes, 
// but primarily the logic is handled in the App component's renderContent function and props.

// ... [DashboardScreen, WorkoutSelectionScreen, ChallengeScreen, HabitTrackerScreen, ProgressScreen] ...
// I will include them fully below to ensure the file is complete and valid.

const DashboardScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  user: UserProfile, 
  streak: number,
  todaysStats: { steps: number, calories: number, activeMinutes: number },
  onStartQuickWorkout: (type: string) => void,
  onEnablePedometer: () => void,
  pedometerActive: boolean
}> = ({ onNavigate, user, streak, todaysStats, onStartQuickWorkout, onEnablePedometer, pedometerActive }) => {
  const [tip, setTip] = useState("Loading daily motivation...");
  useEffect(() => {
    const today = getTodayStr();
    const cachedTip = Storage.getDailyTip();
    if (cachedTip && cachedTip.date === today) {
      setTip(cachedTip.text);
    } else {
      generateMotivationalTip().then(newTip => {
        setTip(newTip);
        Storage.saveDailyTip(newTip);
      });
    }
  }, []);
  
  const stepGoal = 10000;
  const progressPercent = Math.min(Math.round((todaysStats.steps / stepGoal) * 100), 100);

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div><h1 className="text-3xl font-bold text-white">Hey {user.name.split(' ')[0]} 👋</h1><p className="text-gray-400 text-sm">Let's crush today.</p></div>
        <div className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full border border-orange-500/30"><Flame size={18} className="text-orange-500 fill-orange-500" /><span className="text-orange-500 font-bold">{streak}</span></div>
      </div>
      <div className="glass-card rounded-3xl p-6 mb-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-20 text-neon-green"><Activity size={100} /></div>
         <div className="flex justify-between items-end relative z-10">
           <div>
             <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">Daily Steps {!pedometerActive && <button onClick={onEnablePedometer} className="bg-white/10 p-1 rounded hover:bg-white/20"><Footprints size={12} className="text-neon-blue" /></button>}</div>
             <div className="text-4xl font-bold text-white">{todaysStats.steps.toLocaleString()}</div>
             <div className="text-neon-green text-xs font-medium mt-1">{progressPercent}% of goal</div>
           </div>
           <div className="w-20 h-20 rounded-full border-4 border-white/10 relative flex items-center justify-center">
             <svg className="absolute inset-0 w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="36" stroke="transparent" strokeWidth="4" fill="transparent" /><circle cx="40" cy="40" r="36" stroke="#ccff00" strokeWidth="4" fill="transparent" strokeDasharray={`${progressPercent * 2.26} 226`} /></svg>
             <span className="text-white font-bold text-sm">{progressPercent}%</span>
           </div>
         </div>
         <div className="grid grid-cols-2 gap-4 mt-6">
           <div className="bg-white/5 rounded-xl p-3"><div className="text-gray-400 text-xs">Calories</div><div className="text-neon-blue font-bold text-lg">{todaysStats.calories} kcal</div></div>
           <div className="bg-white/5 rounded-xl p-3"><div className="text-gray-400 text-xs">Active Time</div><div className="text-purple-400 font-bold text-lg">{todaysStats.activeMinutes} min</div></div>
         </div>
      </div>
      <h3 className="text-white font-semibold text-lg mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <button onClick={() => onNavigate(Screen.WORKOUTS)} className="bg-neon-green text-black p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform"><Dumbbell size={24} /><span className="text-xs font-bold">Workout</span></button>
        <button onClick={() => onNavigate(Screen.RUNNING)} className="bg-neon-blue text-black p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform"><Zap size={24} /><span className="text-xs font-bold">Start Run</span></button>
        <button onClick={() => onStartQuickWorkout('Stretch')} className="bg-purple-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform"><Activity size={24} /><span className="text-xs font-bold">Stretch</span></button>
      </div>
      <div className="bg-gradient-to-r from-gray-900 to-black border border-white/10 p-4 rounded-xl flex items-start gap-3"><div className="bg-neon-green/20 p-2 rounded-full"><UserIcon size={16} className="text-neon-green" /></div><div><h4 className="text-neon-green text-xs font-bold uppercase tracking-wider mb-1">Gemini Daily Tip</h4><p className="text-gray-300 text-sm italic">"{tip}"</p></div></div>
    </div>
  );
};

const WorkoutSelectionScreen: React.FC<{ onStartWorkout: (w: Workout) => void }> = ({ onStartWorkout }) => {
  const [filter, setFilter] = useState<'All' | 'Chest' | 'Legs' | 'Cardio' | 'Stretch'>('All');
  const filteredWorkouts = filter === 'All' ? WORKOUT_DB : WORKOUT_DB.filter(w => w.category === filter);
  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <h2 className="text-3xl font-bold text-white mb-6">Workouts</h2>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">{['All', 'Chest', 'Legs', 'Cardio', 'Stretch'].map(cat => (
          <button key={cat} onClick={() => setFilter(cat as any)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filter === cat ? 'bg-neon-green text-black border-neon-green' : 'bg-black text-gray-400 border-gray-800'}`}>{cat}</button>
      ))}</div>
      <div className="space-y-4">{filteredWorkouts.map(workout => (
          <div key={workout.id} onClick={() => onStartWorkout(workout)} className="group relative h-48 rounded-3xl overflow-hidden cursor-pointer active:scale-95 transition-transform">
            <img src={workout.image} alt={workout.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 w-full flex justify-between items-end">
                <div>
                   <span className={`text-[10px] font-bold px-2 py-1 rounded bg-black/50 backdrop-blur-md mb-2 inline-block ${workout.difficulty === 'Advanced' ? 'text-red-400 border border-red-400/30' : workout.difficulty === 'Intermediate' ? 'text-orange-400 border border-orange-400/30' : 'text-green-400 border border-green-400/30'}`}>{workout.difficulty.toUpperCase()}</span>
                   <h3 className="text-xl font-bold text-white mb-1">{workout.title}</h3>
                   <div className="flex items-center gap-3 text-gray-300 text-xs"><span className="flex items-center gap-1"><Clock size={12}/> {workout.duration}</span><span className="flex items-center gap-1"><Flame size={12}/> {workout.estCalories} kcal</span></div>
                </div>
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-md group-hover:bg-neon-green group-hover:text-black transition-colors"><Play size={20} fill="currentColor" /></div>
            </div>
          </div>
        ))}</div>
    </div>
  );
};

const ChallengeScreen: React.FC<{ state: ChallengeState | null, onInit: () => void, onCompleteDay: (day: number) => void }> = ({ state, onInit, onCompleteDay }) => {
  if (!state) return <div className="h-full flex flex-col items-center justify-center bg-black p-8 text-center"><Trophy size={64} className="text-neon-green mb-6 animate-bounce" /><h2 className="text-3xl font-bold text-white mb-4">30-Day Grind</h2><button onClick={onInit} className="bg-neon-green text-black font-bold py-4 px-12 rounded-full hover:scale-105 transition-transform">Start Challenge</button></div>;
  const completedCount = state.completedDays.length;
  const progress = Math.round((completedCount / 30) * 100);
  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Challenge</h2><div className="text-right"><div className="text-neon-green font-bold text-lg">{progress}%</div><div className="text-gray-500 text-xs uppercase">Completed</div></div></div>
      <div className="w-full h-2 bg-gray-800 rounded-full mb-8 overflow-hidden"><div className="h-full bg-neon-green shadow-[0_0_10px_#ccff00]" style={{ width: `${progress}%` }}></div></div>
      <div className="grid grid-cols-5 gap-3">{CHALLENGE_DB.map((task) => {
          const isCompleted = state.completedDays.includes(task.day);
          const isLocked = !isCompleted && task.day > (Math.max(...state.completedDays, 0) + 1);
          const isCurrent = !isCompleted && !isLocked;
          return <button key={task.day} disabled={isLocked || isCompleted} onClick={() => { if(isCurrent && window.confirm(`Start Day ${task.day}?`)) onCompleteDay(task.day); }} className={`aspect-square rounded-xl flex flex-col items-center justify-center relative border transition-all ${isCompleted ? 'bg-neon-green/20 border-neon-green text-neon-green' : isCurrent ? 'bg-white/10 border-white text-white animate-pulse' : 'bg-gray-900 border-transparent text-gray-700 opacity-50'}`}><span className="text-lg font-bold">{task.day}</span>{isCompleted && <CheckCircle size={12} className="mt-1" />}{isLocked && <Lock size={12} className="mt-1" />}</button>;
        })}</div>
      <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10"><h3 className="text-white font-bold mb-2">Current Focus</h3><p className="text-gray-400 text-sm">{CHALLENGE_DB.find(d => d.day === (Math.max(...state.completedDays, 0) + 1))?.description || "Challenge Complete!"}</p></div>
    </div>
  );
};

const HabitTrackerScreen: React.FC<{ habits: HabitLog, onUpdateHabit: (id: string, val: number | boolean) => void }> = ({ habits, onUpdateHabit }) => {
  const today = getTodayStr();
  const completedCount = DEFAULT_HABITS.filter(h => habits[today]?.[h.id]).length;
  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-8"><h2 className="text-3xl font-bold text-white">Habits</h2><div className="bg-white/10 px-4 py-2 rounded-full text-sm font-bold text-neon-blue">{completedCount}/{DEFAULT_HABITS.length} Done</div></div>
      <div className="space-y-4">{DEFAULT_HABITS.map(habit => {
          const isDone = !!habits[today]?.[habit.id];
          return <div key={habit.id} className={`p-4 rounded-2xl flex items-center justify-between border ${isDone ? 'bg-neon-green/10 border-neon-green/50' : 'bg-white/5 border-white/5'}`}><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-black ${isDone ? 'grayscale-0' : 'grayscale opacity-50'}`}>{habit.icon}</div><div><h4 className={`font-bold ${isDone ? 'text-white' : 'text-gray-400'}`}>{habit.name}</h4>{habit.type === 'counter' && <p className="text-xs text-gray-500">{habit.target} {habit.unit} daily</p>}</div></div><button onClick={() => onUpdateHabit(habit.id, !isDone)} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isDone ? 'bg-neon-green border-neon-green text-black scale-110' : 'border-gray-600 hover:border-white'}`}>{isDone && <CheckCircle size={18} />}</button></div>;
      })}</div>
    </div>
  );
};

const ProgressScreen: React.FC<{ history: WorkoutSession[], user: UserProfile }> = ({ history, user }) => {
  const weeklyData = useMemo(() => {
     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
     const data = new Array(7).fill(0).map((_, i) => ({ name: days[i], cal: 0 }));
     const now = new Date();
     const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
     history.forEach(session => { const d = new Date(session.date); if (d >= startOfWeek) { data[d.getDay()].cal += session.caloriesBurned; }});
     return data;
  }, [history]);
  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <h2 className="text-3xl font-bold text-white mb-6">Your Stats</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center"><div className="text-2xl font-bold text-neon-green">{history.length}</div><div className="text-[10px] text-gray-400 uppercase">Workouts</div></div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center"><div className="text-2xl font-bold text-neon-blue">{(history.reduce((a, b) => a + b.caloriesBurned, 0)/1000).toFixed(1)}k</div><div className="text-[10px] text-gray-400 uppercase">Kcal</div></div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center"><div className="text-2xl font-bold text-purple-400">{(history.reduce((a, b) => a + b.durationSeconds, 0) / 3600).toFixed(1)}</div><div className="text-[10px] text-gray-400 uppercase">Hours</div></div>
      </div>
      <div className="glass-card p-4 rounded-3xl mb-6"><h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2"><Activity size={16} className="text-neon-green"/> Activity</h3><div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyData}><XAxis dataKey="name" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} /><Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} /><Bar dataKey="cal" fill="#ccff00" radius={[4, 4, 0, 0]} barSize={12} /></BarChart></ResponsiveContainer></div></div>
      <div className="glass-card p-4 rounded-3xl"><h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2"><Monitor size={16} className="text-neon-blue"/> Weight</h3><div className="h-40 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={user.weightHistory}><defs><linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00ffff" stopOpacity={0.3}/><stop offset="95%" stopColor="#00ffff" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="date" hide /><YAxis domain={['dataMin - 2', 'dataMax + 2']} hide /><Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} /><Area type="monotone" dataKey="weight" stroke="#00ffff" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" /></AreaChart></ResponsiveContainer></div></div>
    </div>
  );
};

const ProfileScreen: React.FC<{ 
    user: UserProfile, history: WorkoutSession[], streak: number, 
    onLogout: () => void, onUpdateWeight: (w: number) => void, onUpdateImage: (img: string) => void,
    onOpenSettings: () => void, onShare: () => void
}> = ({ user, history, streak, onLogout, onUpdateWeight, onOpenSettings, onShare }) => {
    return (
        <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
             <div className="flex justify-end mb-4"><button onClick={onLogout} className="bg-red-500/10 text-red-500 p-2 rounded-full hover:bg-red-500/20"><LogOut size={20} /></button></div>
             <div className="flex flex-col items-center mb-8">
                 <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-neon-green mb-4 relative overflow-hidden group">
                     {user.profileImage ? <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-neon-green text-3xl font-bold">{user.name.charAt(0)}</div>}
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera size={20} className="text-white" /></div>
                 </div>
                 <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                 <p className="text-gray-500 text-sm">Joined {new Date(user.joinDate).toLocaleDateString()}</p>
                 <div className="mt-2 bg-neon-green/10 px-3 py-1 rounded text-neon-green text-xs font-bold uppercase tracking-widest border border-neon-green/20">{user.isPro ? 'Pro Member' : 'Free Plan'}</div>
             </div>
             <div className="space-y-4">
                 <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Monitor className="text-gray-400" size={20} /><span className="text-white">Weight</span></div><div className="flex items-center gap-2"><span className="text-2xl font-bold text-white">{user.weight}</span><span className="text-gray-500 text-sm">kg</span><button onClick={() => { const w = prompt("New Weight (kg):"); if(w) onUpdateWeight(parseFloat(w)); }} className="ml-2 bg-gray-800 p-1 rounded hover:bg-gray-700"><Edit2 size={14} className="text-neon-blue" /></button></div></div>
                 <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Flame className="text-orange-500" size={20} /><span className="text-white">Streak</span></div><span className="text-xl font-bold text-orange-500">{streak} Days</span></div>
                 <button onClick={onOpenSettings} className="w-full bg-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors"><div className="flex items-center gap-3"><Settings className="text-gray-400" size={20} /><span className="text-white">Settings</span></div><ChevronRight className="text-gray-600" size={20} /></button>
                 <button onClick={onShare} className="w-full bg-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors"><div className="flex items-center gap-3"><Share2 className="text-gray-400" size={20} /><span className="text-white">Share Stats</span></div><ChevronRight className="text-gray-600" size={20} /></button>
             </div>
        </div>
    );
};

export default App;