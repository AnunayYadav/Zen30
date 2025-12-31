import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { Screen, Workout, WorkoutSession, UserProfile, HabitLog, ChallengeState, Habit, WorkoutCategory, WorkoutSegment, ChallengeTask } from './types';
import { generateMotivationalTip, generateWorkoutVisualization, generateWorkoutPlan, generate30DayChallenge, modifyChallengePlan } from './services/geminiService';
import { Storage, getTodayStr } from './services/storage';
import { SoundService } from './services/soundService';
import { PedometerService } from './services/pedometer';
import { WORKOUT_DB } from './services/workoutData';
import { supabase } from './services/supabaseClient';
import { 
  Play, Pause, StopCircle, Flame, Activity, Dumbbell, Zap, Clock, Footprints,
  User as UserIcon, LogOut, Settings, Share2, Camera, Lock, CheckCircle, AlertCircle, Loader2, Trophy, Edit2, X, Volume2,
  Monitor, ChevronRight, SkipForward, BrainCircuit, WifiOff, Send, Sparkles, Trash2, Calendar, Target, AlertTriangle, RefreshCw
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
      // Success is handled by the global onAuthStateChange listener
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
          <span className="text-lg font-bold">G</span> Continue with Google
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

// --- Intelligent Active Session ---
const ActiveSessionScreen: React.FC<{ 
    mode: 'Run' | 'Workout', 
    workout: Workout | null, 
    onClose: (session: WorkoutSession | null) => void 
}> = ({ mode, workout, onClose }) => {
    // Session State
    // Start ACTIVE immediately with a placeholder segment for responsiveness
    // Increased initial duration to 12s to allow API more time without looping
    const [status, setStatus] = useState<'active' | 'paused' | 'finished'>('active');
    const [segments, setSegments] = useState<WorkoutSegment[]>([
        { name: "Get Ready", type: "rest", duration: 12, reps: "Prepare yourself", notes: "AI Coach is generating your plan..." }
    ]);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(12);
    const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);
    const [planLoaded, setPlanLoaded] = useState(false);

    // AI Visualization
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [generatingImage, setGeneratingImage] = useState(false);

    // Initial Plan Generation
    useEffect(() => {
        const initSession = async () => {
            if (mode === 'Workout' && workout) {
                // Optimistic Start: Don't wait for plan
                SoundService.playStart();
                
                try {
                    const plan = await generateWorkoutPlan(workout.title, workout.duration, workout.difficulty);
                    if (plan && plan.length > 0) {
                        // Append generated plan to the "Get Ready" segment
                        setSegments(prev => {
                            const [first, ...rest] = prev;
                            return [first, ...plan];
                        });
                        setPlanLoaded(true);
                        // Pre-fetch first image immediately
                        fetchImage(plan[0].name);
                    } else {
                        throw new Error("Empty plan");
                    }
                } catch (e) {
                    console.error("Session Init Error", e);
                    // Fallback
                    const fallback: WorkoutSegment[] = [{ name: workout.title, type: 'exercise', duration: 1800, reps: 'Freestyle' }];
                    setSegments(prev => [prev[0], ...fallback]);
                    setPlanLoaded(true);
                }
            } else {
                // Simple run mode (no segments)
                SoundService.playStart();
                setPlanLoaded(true);
            }
        };
        initSession();
    }, [mode, workout]);

    const fetchImage = async (exerciseName: string) => {
        setGeneratingImage(true);
        const img = await generateWorkoutVisualization(exerciseName);
        if (img) setCurrentImage(img);
        setGeneratingImage(false);
    };

    // Timer Logic
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (status === 'active') {
            interval = setInterval(() => {
                setTotalTimeElapsed(prev => prev + 1);

                if (mode === 'Workout') {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            handleSegmentFinish();
                            return 0;
                        }
                        // Sound Effects for countdown
                        if (prev <= 4) SoundService.playTick(); 
                        return prev - 1;
                    });
                }
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [status, mode, segments, currentSegmentIndex, planLoaded]);

    const handleSegmentFinish = () => {
        // If plan hasn't loaded yet and we finished "Get Ready", extend it longer to avoid rapid looping
        if (!planLoaded && currentSegmentIndex === 0) {
            setTimeLeft(5); // Extend by 5s
            return;
        }

        const nextIndex = currentSegmentIndex + 1;
        if (nextIndex < segments.length) {
            // Move to next segment
            const nextSegment = segments[nextIndex];
            setCurrentSegmentIndex(nextIndex);
            setTimeLeft(nextSegment.duration);
            
            // Sounds
            if (nextSegment.type === 'rest') {
                SoundService.playCountdown(); // Distinct sound for rest
            } else {
                SoundService.playStart(); // Go sound for exercise
                fetchImage(nextSegment.name);
            }
        } else {
            // Workout Complete
            setStatus('finished');
            SoundService.playSuccess();
        }
    };

    const handleFinish = () => {
        SoundService.playSuccess();
        const calories = Math.floor(totalTimeElapsed * (mode === 'Run' ? 0.15 : 0.12));
        onClose({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            type: mode,
            durationSeconds: totalTimeElapsed,
            caloriesBurned: calories,
            category: workout?.category || 'Freestyle'
        });
    };

    const skipSegment = () => {
        handleSegmentFinish();
    };

    // Safe access to current segment
    const currentSegment = segments[currentSegmentIndex] || { name: 'Loading...', type: 'rest', duration: 0 };
    const maxDuration = currentSegment.duration || 60; // Prevent div by zero
    const progress = Math.max(0, Math.min(1, 1 - (timeLeft / maxDuration)));

    if (status === 'finished') {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6">
                <Trophy size={80} className="text-neon-green mb-6 animate-bounce" />
                <h1 className="text-4xl font-bold text-white mb-2">WORKOUT COMPLETE</h1>
                <p className="text-gray-400 mb-8">You crushed it!</p>
                <button onClick={handleFinish} className="bg-neon-green text-black font-bold py-4 px-12 rounded-full">
                    Save Session
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col p-4 sm:p-6 animate-in fade-in duration-300 overflow-hidden h-[100dvh]">
             {/* Background Pulse based on intensity */}
            <div className={`absolute inset-0 ${currentSegment?.type === 'rest' ? 'bg-blue-900/10' : 'bg-neon-green/5'} pointer-events-none transition-colors duration-1000`}></div>

            {/* Header - Compact */}
            <div className="flex justify-between items-center z-10 mb-2 shrink-0 h-10">
                <div className="flex items-center gap-2">
                    <button onClick={handleFinish} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={18} /></button>
                    <div>
                        <h2 className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">{mode === 'Workout' ? `Part ${currentSegmentIndex + 1}/${segments.length}` : 'FREESTYLE'}</h2>
                        <h1 className="text-sm font-bold text-white truncate max-w-[150px] leading-tight">{workout?.title || "Run"}</h1>
                    </div>
                </div>
                <div className="bg-white/10 px-2 py-1 rounded-full text-[10px] font-mono text-neon-blue border border-neon-blue/30 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    LIVE
                </div>
            </div>

            {/* Mode: WORKOUT (AI Guided) */}
            {mode === 'Workout' && (
                <div className="flex-grow flex flex-col z-10 h-full overflow-hidden relative">
                    
                    {/* VISUALIZATION AREA - Responsive Height - Fixed image clipping with object-contain */}
                    <div className="relative w-full h-40 sm:h-64 bg-black rounded-2xl border border-white/10 mb-2 overflow-hidden group shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                         {currentSegment.type === 'rest' ? (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-900/20">
                                 <div className="text-neon-blue text-3xl font-bold animate-pulse">REST</div>
                                 <p className="text-gray-300 text-xs mt-2">Breathe & Recover</p>
                             </div>
                         ) : (
                             <>
                                {generatingImage ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <Loader2 className="animate-spin text-neon-green mb-2" />
                                        <span className="text-[10px] text-neon-green/70">GENERATING HOLOGRAM...</span>
                                    </div>
                                ) : currentImage ? (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-black via-gray-900/20 to-black">
                                        <img src={currentImage} className="w-full h-full object-contain opacity-90 animate-in fade-in duration-1000" alt="Exercise" />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-600"><Activity size={48} /></div>
                                )}
                                {/* Scanline effect */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-green/5 to-transparent h-[10%] w-full animate-[scan_3s_linear_infinite] pointer-events-none"></div>
                             </>
                         )}
                         <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[8px] text-gray-400">GEMINI AI 2.5</div>
                    </div>

                    {/* CURRENT EXERCISE INFO - Shrinkable */}
                    <div className="text-center mb-2 shrink-0 min-h-[50px] flex flex-col justify-center">
                        <h2 className="text-xl sm:text-3xl font-bold text-white transition-all duration-300 leading-tight">{currentSegment.name}</h2>
                        {currentSegment.reps && <p className="text-neon-green font-mono text-sm sm:text-base">{currentSegment.reps}</p>}
                        {currentSegment.notes && <p className="text-gray-500 text-[10px] italic mt-1 max-w-[80%] mx-auto">{currentSegment.notes}</p>}
                    </div>

                    {/* TIMER WITH SVG RING - Flex Grow but constrained */}
                    <div className="flex-1 flex items-center justify-center relative min-h-[140px]">
                         <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                             {/* SVG Progress Ring */}
                             <svg className="w-full h-full transform -rotate-90">
                                <circle cx="50%" cy="50%" r="45%" stroke="#1a1a1a" strokeWidth="8" fill="transparent" />
                                <circle 
                                    cx="50%" cy="50%" r="45%" 
                                    stroke={currentSegment.type === 'rest' ? '#60a5fa' : '#ccff00'} 
                                    strokeWidth="8" 
                                    fill="transparent" 
                                    strokeDasharray="283%" 
                                />
                             </svg>
                             {/* Re-implementing SVG with ViewBox for responsiveness */}
                             <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 256 256">
                                <circle cx="128" cy="128" r="110" stroke="#1a1a1a" strokeWidth="12" fill="transparent" />
                                <circle 
                                    cx="128" cy="128" r="110" 
                                    stroke={currentSegment.type === 'rest' ? '#60a5fa' : '#ccff00'} 
                                    strokeWidth="12" 
                                    fill="transparent" 
                                    strokeDasharray="691" 
                                    strokeDashoffset={691 * progress}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-linear"
                                />
                             </svg>

                             {/* Timer Text */}
                             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                 <span className={`text-6xl sm:text-7xl font-mono font-bold tracking-tighter ${currentSegment.type === 'rest' ? 'text-blue-400' : 'text-white'}`}>
                                     {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                 </span>
                                 <span className="text-gray-500 text-[10px] uppercase mt-2 tracking-widest animate-pulse">
                                     {!planLoaded ? "ANALYZING..." : "REMAINING"}
                                 </span>
                             </div>
                         </div>
                    </div>

                    {/* CONTROLS - Fixed Bottom */}
                    <div className="grid grid-cols-3 gap-4 items-center mt-2 shrink-0 pb-4 sm:pb-0">
                        <button onClick={() => setStatus(status === 'active' ? 'paused' : 'active')} className="bg-white/10 h-14 sm:h-16 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all active:scale-95">
                            {status === 'active' ? <Pause /> : <Play />}
                        </button>
                        <button onClick={handleFinish} className="bg-red-500/20 h-14 sm:h-16 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500/30 border border-red-500/50 transition-all active:scale-95">
                            <StopCircle />
                        </button>
                        <button onClick={skipSegment} className="bg-neon-green/20 h-14 sm:h-16 rounded-2xl flex items-center justify-center text-neon-green hover:bg-neon-green/30 border border-neon-green/50 transition-all active:scale-95">
                            <SkipForward />
                        </button>
                    </div>

                    {/* NEXT UP PREVIEW - Bottom */}
                    {currentSegmentIndex + 1 < segments.length && (
                        <div className="text-center py-2 text-[10px] text-gray-500 truncate h-6">
                            Next: <span className="text-white font-medium">{segments[currentSegmentIndex + 1].name}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Mode: RUN (Simple Timer) */}
            {mode === 'Run' && (
                <div className="flex-grow flex flex-col items-center justify-center">
                     <Zap size={64} className="text-neon-blue mb-8 animate-pulse" />
                     <div className="text-8xl font-mono font-bold text-white mb-4">
                         {Math.floor(totalTimeElapsed / 60)}:{String(totalTimeElapsed % 60).padStart(2, '0')}
                     </div>
                     <p className="text-gray-400 uppercase tracking-widest mb-12">Total Time</p>
                     
                     <div className="grid grid-cols-2 gap-8 w-full max-w-xs text-center mb-12">
                         <div className="bg-white/5 p-4 rounded-2xl">
                             <div className="text-neon-blue font-bold text-2xl">{Math.floor(totalTimeElapsed * 0.15)}</div>
                             <div className="text-[10px] text-gray-500 uppercase">Calories</div>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl">
                             <div className="text-purple-400 font-bold text-2xl">--</div>
                             <div className="text-[10px] text-gray-500 uppercase">Heart Rate</div>
                         </div>
                     </div>

                     <div className="flex gap-4">
                        <button onClick={() => setStatus(status === 'active' ? 'paused' : 'active')} className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                            {status === 'active' ? <Pause /> : <Play />}
                        </button>
                        <button onClick={handleFinish} className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center">
                            <StopCircle fill="white" />
                        </button>
                     </div>
                </div>
            )}
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
  
  // Track last loaded user to prevent redundant loading screens on focus/reconnect
  const lastLoadedUserId = useRef<string | null>(null);

  // Active Session State
  const [activeSessionMode, setActiveSessionMode] = useState<'Run' | 'Workout' | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);

  // Auth Listener
  useEffect(() => {
    // Note: Manual hash cleaning has been removed to avoid conflicts with Supabase Auth handling.

    const { data: { subscription } } = Storage.onAuthStateChange(async (session) => {
      if (session) {
        // If we have already loaded data for this specific user ID, skip the blocking loader.
        // This prevents the "Syncing" screen from flashing when the app regains focus or token refreshes.
        if (lastLoadedUserId.current === session.user.id) {
            return;
        }

        setLoadingData(true);
        try {
          const userId = session.user.id;
          lastLoadedUserId.current = userId; // Mark as loaded
          
          // Attempt to fetch profile
          let profile = await Storage.getUserProfile(userId);
          
          // If no profile found (e.g. new user or db error), try to create one or init default
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
            // Try to persist, but don't block if it fails (e.g. table missing)
            try {
               await Storage.upsertProfile(newProfile);
            } catch (err) {
               console.warn("Failed to persist new profile, using in-memory", err);
            }
            profile = newProfile as UserProfile;
          }

          setUser(profile);
          
          // Fetch other data in parallel, gracefully handling failures
          try {
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
          } catch (dataErr) {
              console.warn("Partial data load failure", dataErr);
              // Fallback default values
              setHistory([]);
              setHabits({});
              setChallenge(null);
              setPassiveSteps(0);
          }
          
          setCurrentScreen(Screen.DASHBOARD);
        } catch (e) {
          console.error("Critical Data load error", e);
          lastLoadedUserId.current = null; // Reset on critical error so we can retry
          // FALLBACK: Ensure user can still use app even if DB is down/missing
          if (session?.user) {
             const fallbackUser: UserProfile = {
                 id: session.user.id,
                 name: session.user.email?.split('@')[0] || 'User',
                 email: session.user.email || '',
                 joinDate: new Date().toISOString(),
                 lastLoginDate: new Date().toISOString(),
                 streak: 0,
                 weight: 70, height: 175, weightHistory: [], isPro: false, onboardingComplete: true
             };
             setUser(fallbackUser);
             setCurrentScreen(Screen.DASHBOARD);
          } else {
             // If session is somehow invalid, go to auth
             setUser(null);
             setCurrentScreen(Screen.AUTH);
          }
        } finally {
          setLoadingData(false);
        }
      } else {
        // No session
        lastLoadedUserId.current = null;
        setUser(null);
        // Only force screen to AUTH if we aren't already on splash or auth
        // This prevents overwriting the splash screen logic if it's still running
        // But for "redirect to login" issues, explicitly ensuring AUTH is fine if we really are logged out.
        if (currentScreen !== Screen.SPLASH) {
             setCurrentScreen(Screen.AUTH);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Remove dependency on currentScreen to avoid loops

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
    setCurrentScreen(Screen.AUTH); // Immediate feedback
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

  const handleCreateChallenge = async (goal: string, level: string) => {
      SoundService.playStart();
      const plan = await generate30DayChallenge(goal, level);
      const newState = await Storage.initChallenge(plan, goal);
      setChallenge(newState);
  };

  const handleModifyChallenge = async (instruction: string) => {
      if(!challenge?.plan) return;
      SoundService.playStart();
      const newPlan = await modifyChallengePlan(challenge.plan, instruction);
      const newState = await Storage.updateChallengePlan(newPlan);
      if(newState) setChallenge(newState);
      SoundService.playSuccess();
  };

  const handleCompleteChallengeDay = async (day: number) => {
      SoundService.playSuccess();
      const newState = await Storage.completeChallengeDay(day);
      if (newState) setChallenge({...newState});
      
      // Log as workout automatically
      const task = challenge?.plan?.find(p => p.day === day);
      if (task && task.type !== 'Rest') {
          const session: WorkoutSession = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              type: 'Workout',
              durationSeconds: parseInt(task.duration || "30") * 60,
              caloriesBurned: task.type === 'Active Recovery' ? 150 : 350,
              category: 'Challenge'
          };
          const newHistory = await Storage.saveSession(session);
          setHistory(newHistory);
      }
  };

  const handleDeleteChallenge = async () => {
      if(window.confirm("Are you sure? This will delete your current plan and you'll need to generate a new one.")) {
          await Storage.resetChallenge();
          setChallenge(null);
      }
  };

  const handleRestartChallenge = async () => {
      if(window.confirm("Restart this specific challenge from Day 1? Your plan will stay the same, but progress will be reset.")) {
          const newState = await Storage.restartChallenge();
          if(newState) setChallenge(newState);
          SoundService.playStart();
      }
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
          case Screen.CHALLENGE: return <ChallengeScreen state={challenge} onCreate={handleCreateChallenge} onModify={handleModifyChallenge} onCompleteDay={handleCompleteChallengeDay} onDelete={handleDeleteChallenge} onRestart={handleRestartChallenge} />;
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
      {currentScreen === Screen.SPLASH && <SplashScreen onComplete={() => { if (!user) setCurrentScreen(Screen.AUTH); }} />}
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

const ChallengeScreen: React.FC<{ 
  state: ChallengeState | null, 
  onCreate: (goal: string, level: string) => Promise<void>,
  onModify: (instruction: string) => Promise<void>,
  onCompleteDay: (day: number) => Promise<void>,
  onDelete: () => Promise<void>,
  onRestart: () => Promise<void>
}> = ({ state, onCreate, onModify, onCompleteDay, onDelete, onRestart }) => {
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<ChallengeTask | null>(null);
  const [quote, setQuote] = useState<string>("Initializing AI Coach...");
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modificationText, setModificationText] = useState("");
  const [modifying, setModifying] = useState(false);

  // AI Quote Fetching
  useEffect(() => {
    if (state) {
      // Reuse the cached tip from dashboard or fetch a new one if needed, keeping it consistent for the session
      const cached = Storage.getDailyTip();
      if (cached) setQuote(cached.text);
      else generateMotivationalTip().then(setQuote);
    }
  }, [state]);

  // If no state or no plan, show creation screen
  if (!state || !state.plan || state.plan.length === 0) {
      return (
          <div className="h-full w-full bg-black p-6 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-neon-green/5 to-black pointer-events-none" />
              <BrainCircuit className="text-neon-green w-16 h-16 mb-4 animate-pulse mx-auto" />
              <h2 className="text-3xl font-bold text-white mb-2 text-center">AI Coach</h2>
              <p className="text-gray-400 text-center mb-8 text-sm">Tell Gemini your goal. Get a custom 30-day plan.</p>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md z-10">
                  <label className="text-xs text-neon-blue font-bold uppercase tracking-wider mb-2 block">Your Goal</label>
                  <textarea 
                      value={goal} 
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g. Lose 5kg, Learn to do a split, Run a marathon..."
                      className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white placeholder-gray-600 focus:border-neon-green outline-none h-24 resize-none mb-6"
                  />
                  
                  <label className="text-xs text-neon-blue font-bold uppercase tracking-wider mb-2 block">Intensity Level</label>
                  <div className="grid grid-cols-3 gap-2 mb-8">
                      {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                          <button 
                              key={l}
                              onClick={() => setLevel(l)}
                              className={`py-3 rounded-xl text-xs font-bold border transition-all ${level === l ? 'bg-neon-green text-black border-neon-green' : 'bg-black/50 text-gray-400 border-white/10'}`}
                          >
                              {l}
                          </button>
                      ))}
                  </div>

                  <button 
                      onClick={async () => {
                          if(!goal.trim()) return;
                          setLoading(true);
                          await onCreate(goal, level);
                          setLoading(false);
                      }}
                      disabled={loading || !goal.trim()}
                      className="w-full bg-neon-green text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> GENERATE PLAN</>}
                  </button>
              </div>
          </div>
      );
  }

  // Active Challenge View Calculations
  const completedCount = state.completedDays.length;
  const progress = Math.round((completedCount / 30) * 100);
  
  // Calculate which day we are on based on start date
  const startDate = new Date(state.startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const currentDayIndex = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const currentDay = Math.min(Math.max(1, currentDayIndex), 30); // Clamp between 1 and 30

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto relative">
      
      {/* Hero Section: AI Mission Control */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-gray-900 to-black border border-white/10 mb-6 shadow-lg shadow-neon-green/5">
           <div className="absolute top-0 right-0 p-4 opacity-10 text-white"><Trophy size={120}/></div>
           <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-neon-green/10 blur-3xl rounded-full pointer-events-none"></div>
           
           <div className="relative z-10">
               <div className="flex justify-between items-start mb-4">
                   <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-neon-blue border border-neon-blue/30 uppercase tracking-widest flex items-center gap-2">
                       <Target size={12} /> Mission Active
                   </div>
                   <div className="flex items-center gap-2">
                       <button onClick={() => setShowModifyModal(true)} className="bg-white/10 hover:bg-neon-green/20 text-white hover:text-neon-green transition-colors px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] border border-white/10">
                           <Edit2 size={12} /> Modify
                       </button>
                       <button onClick={onRestart} className="bg-white/10 hover:bg-white/20 text-white transition-colors px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] border border-white/10">
                           <RefreshCw size={12} /> Restart
                       </button>
                       <button onClick={onDelete} className="bg-red-900/20 hover:bg-red-900/40 text-red-500 transition-colors p-1.5 rounded-lg border border-red-500/20">
                           <Trash2 size={12} />
                       </button>
                   </div>
               </div>
               
               <h1 className="text-4xl font-bold italic text-white mb-2">DAY {currentDay}</h1>
               <div className="flex items-start gap-3 mt-4">
                   <div className="mt-1"><BrainCircuit size={16} className="text-neon-green" /></div>
                   <p className="text-gray-300 text-sm font-medium italic leading-relaxed">"{quote}"</p>
               </div>
           </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-center items-center">
              <span className="text-2xl font-bold text-white">{completedCount}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Missions Done</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-center items-center">
              <span className="text-2xl font-bold text-white">{30 - completedCount}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Days Left</span>
          </div>
      </div>

      {/* Calendar Grid - Interactive Mission Select */}
      <div className="mb-4 flex items-center justify-between">
           <h3 className="text-white font-bold flex items-center gap-2"><Calendar size={18} className="text-neon-green"/> Protocol Grid</h3>
           <span className="text-xs text-gray-500">{progress}% Complete</span>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
          {state.plan.map((task) => {
              const isCompleted = state.completedDays.includes(task.day);
              const isToday = task.day === currentDay;
              const isPast = task.day < currentDay;
              const isFuture = task.day > currentDay;
              const isMissed = isPast && !isCompleted;
              const isRest = task.type === 'Rest';

              return (
                  <button 
                      key={task.day} 
                      onClick={() => setSelectedDay(task)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center relative border transition-all duration-300
                          ${isCompleted 
                              ? 'bg-neon-green/20 border-neon-green text-neon-green' 
                              : isToday
                                  ? 'bg-white/10 border-white text-white animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                  : isMissed
                                      ? 'bg-red-900/20 border-red-500/30 text-red-400'
                                      : isRest 
                                          ? 'bg-blue-900/10 border-blue-500/10 text-blue-400 opacity-70'
                                          : 'bg-white/5 border-transparent text-gray-500 hover:border-white/20'
                          }
                      `}
                  >
                      <span className={`text-sm font-bold ${isFuture ? 'opacity-50' : ''}`}>{task.day}</span>
                      {isCompleted && <CheckCircle size={10} className="mt-1" />}
                      {isMissed && <AlertTriangle size={10} className="mt-1" />}
                      {!isCompleted && isToday && <div className="w-1.5 h-1.5 bg-neon-green rounded-full mt-1 animate-ping"></div>}
                      {!isCompleted && isFuture && <Lock size={10} className="mt-1 opacity-30" />}
                  </button>
              );
          })}
      </div>

      {/* Mission Briefing Modal */}
      {selectedDay && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
              <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative max-h-[80vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                  <button onClick={() => setSelectedDay(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                  
                  {/* Modal Header */}
                  <div className="mb-6 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded inline-block ${selectedDay.type === 'Rest' ? 'bg-blue-500/20 text-blue-400' : 'bg-neon-green/20 text-neon-green'}`}>
                            DAY {selectedDay.day}
                        </span>
                        {selectedDay.day > currentDay && <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400 flex items-center gap-1"><Lock size={8}/> CLASSIFIED</span>}
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedDay.title}</h2>
                      <p className="text-gray-400 text-sm italic">{selectedDay.description}</p>
                  </div>

                  {selectedDay.type !== 'Rest' && (
                       <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                           <div className="flex items-center gap-2 mb-4 text-white font-bold text-sm"><Clock size={16} className="text-neon-blue"/> Duration: {selectedDay.duration}</div>
                           {selectedDay.instructions && selectedDay.instructions.length > 0 && (
                               <div className="space-y-3">
                                   <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2"><Activity size={12}/> Mission Objectives</div>
                                   {selectedDay.instructions.map((ins, i) => (
                                       <div key={i} className="flex gap-3 text-sm text-gray-300">
                                           <span className="text-neon-green font-mono">{i+1}.</span>
                                           <span>{ins}</span>
                                       </div>
                                   ))}
                               </div>
                           )}
                       </div>
                  )}

                  {/* Actions */}
                  {state.completedDays.includes(selectedDay.day) ? (
                      <div className="w-full bg-white/10 text-gray-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-default border border-white/5">
                          <CheckCircle size={20} className="text-neon-green" /> MISSION ACCOMPLISHED
                      </div>
                  ) : selectedDay.day > currentDay ? (
                       <button disabled className="w-full bg-gray-800 text-gray-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-50">
                          <Lock size={18} /> LOCKED UNTIL DAY {selectedDay.day}
                       </button>
                  ) : (
                      <button 
                          onClick={async () => {
                              await onCompleteDay(selectedDay.day);
                              setSelectedDay(null);
                          }}
                          className="w-full bg-neon-green text-black font-bold py-4 rounded-xl hover:scale-105 hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all flex items-center justify-center gap-2"
                      >
                          <CheckCircle size={20} /> COMPLETE MISSION
                      </button>
                  )}
              </div>
          </div>
      )}

      {/* Modify Plan Modal */}
      {showModifyModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative">
                <button onClick={() => setShowModifyModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                <div className="mb-4 text-center">
                    <Sparkles className="text-neon-green w-12 h-12 mx-auto mb-2 animate-pulse" />
                    <h2 className="text-2xl font-bold text-white">Remix Protocol</h2>
                    <p className="text-gray-400 text-xs mt-1">Tell the AI how to adjust your current plan.</p>
                </div>
                
                <textarea 
                    value={modificationText}
                    onChange={(e) => setModificationText(e.target.value)}
                    placeholder="e.g. I hurt my knee, switch to low impact."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon-green outline-none min-h-[100px] mb-4"
                />

                <button 
                    onClick={async () => {
                        if (!modificationText.trim()) return;
                        setModifying(true);
                        await onModify(modificationText);
                        setModifying(false);
                        setShowModifyModal(false);
                        setModificationText("");
                    }}
                    disabled={modifying || !modificationText.trim()}
                    className="w-full bg-neon-green text-black font-bold py-3 rounded-xl hover:shadow-[0_0_15px_rgba(204,255,0,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {modifying ? <Loader2 className="animate-spin" /> : "APPLY CHANGES"}
                </button>
            </div>
        </div>
      )}

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