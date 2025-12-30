import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { Screen, Workout, WorkoutSession, UserProfile, HabitLog, ChallengeState, Habit, ChallengeTask } from './types';
import { generateMotivationalTip, generateRunningCoachSpeech, playAudioBuffer } from './services/geminiService';
import { Storage, getTodayStr } from './services/storage';
import { PedometerService } from './services/pedometer';
import { WORKOUT_DB } from './services/workoutData';
import { CHALLENGE_DB } from './services/challengeData';
import { 
  Play, Pause, StopCircle, Flame, Moon, Sun, Monitor, 
  ChevronRight, ArrowRight, User as UserIcon, LogOut, Settings, 
  Zap, Clock, MapPin, Activity, Dumbbell, Calendar, CheckSquare, BarChart2, Footprints,
  Plus, Minus, Camera, Lock, CheckCircle, AlertCircle, X, Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

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
        NEON<span className="text-neon-green">FIT</span>
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);
  const isPasswordValid = password.length >= 8;
  const isFormValid = isEmailValid && isPasswordValid && (isLogin || name.length > 0);

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError("");

    try {
      let supabaseUser: any;
      if (isLogin) {
        supabaseUser = await Storage.loginEmail(email, password);
      } else {
        supabaseUser = await Storage.signupEmail(email, password, name);
      }
      
      // If signup/login successful, create/fetch profile
      if (supabaseUser) {
        // Fetch or create profile logic will be handled by the main App listener or here
        // For simplicity, we trigger a page reload or let the Auth Listener catch it
      }
      
    } catch (e: any) {
      setError(e.message || "Authentication failed");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await Storage.loginGoogle();
      // Code will effectively stop here as it redirects
    } catch (e: any) {
      setError(e.message || "Google Auth Failed");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col justify-center bg-black p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[50%] bg-neon-green/5 blur-3xl rounded-full pointer-events-none" />
      
      <h1 className="text-4xl font-bold text-white mb-2 z-10">{isLogin ? "Welcome Back" : "Join the Grind"}</h1>
      <p className="text-gray-400 mb-8 z-10">{isLogin ? "Enter your credentials to sync." : "Create an account to start leveling up."}</p>
      
      <div className="space-y-4 z-10">
        {!isLogin && (
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Full Name" 
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-neon-green outline-none transition-colors" 
          />
        )}
        
        <div>
           <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email Address" 
            className={`w-full bg-white/5 border rounded-xl p-4 text-white focus:border-neon-green outline-none transition-colors ${email && !isEmailValid ? 'border-red-500' : 'border-white/10'}`} 
          />
          {email && !isEmailValid && <p className="text-red-500 text-xs mt-1 ml-1">Invalid email format</p>}
        </div>

        <div>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password (Min 8 chars)" 
            className={`w-full bg-white/5 border rounded-xl p-4 text-white focus:border-neon-green outline-none transition-colors ${password && !isPasswordValid ? 'border-red-500' : 'border-white/10'}`} 
          />
           {password && !isPasswordValid && <p className="text-red-500 text-xs mt-1 ml-1">Must be at least 8 characters</p>}
        </div>
        
        {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
            </div>
        )}

        <button 
            onClick={handleSubmit} 
            disabled={!isFormValid || loading}
            className={`w-full font-bold py-4 rounded-xl mt-4 transition-all flex items-center justify-center
                ${!isFormValid || loading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-neon-green text-black hover:shadow-[0_0_20px_rgba(204,255,0,0.4)]'}
            `}
        >
          {loading ? <Loader2 className="animate-spin" /> : (isLogin ? "Login" : "Sign Up")}
        </button>
        
        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-800"></div>
          <span className="flex-shrink-0 mx-4 text-gray-600">or</span>
          <div className="flex-grow border-t border-gray-800"></div>
        </div>

        <button onClick={handleGoogleLogin} className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
          <span className="text-xl">G</span> Continue with Google
        </button>

        <p className="text-center text-gray-500 mt-6 cursor-pointer hover:text-white transition-colors" onClick={() => { setIsLogin(!isLogin); setError(""); }}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
};

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
        <div>
          <h1 className="text-3xl font-bold text-white">Hey {user.name.split(' ')[0]} 👋</h1>
          <p className="text-gray-400 text-sm">Let's crush today.</p>
        </div>
        <div className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full border border-orange-500/30">
          <Flame size={18} className="text-orange-500 fill-orange-500" />
          <span className="text-orange-500 font-bold">{streak}</span>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 mb-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-20 text-neon-green">
           <Activity size={100} />
         </div>
         <div className="flex justify-between items-end relative z-10">
           <div>
             <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
               Daily Steps
               {!pedometerActive && (
                 <button onClick={onEnablePedometer} className="bg-white/10 p-1 rounded hover:bg-white/20" title="Enable Step Counter">
                   <Footprints size={12} className="text-neon-blue" />
                 </button>
               )}
             </div>
             <div className="text-4xl font-bold text-white">{todaysStats.steps.toLocaleString()}</div>
             <div className="text-neon-green text-xs font-medium mt-1">{progressPercent}% of goal</div>
           </div>
           <div className="w-20 h-20 rounded-full border-4 border-white/10 relative flex items-center justify-center">
             <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="36" stroke="transparent" strokeWidth="4" fill="transparent" />
                <circle cx="40" cy="40" r="36" stroke="#ccff00" strokeWidth="4" fill="transparent" strokeDasharray={`${progressPercent * 2.26} 226`} />
             </svg>
             <span className="text-white font-bold text-sm">{progressPercent}%</span>
           </div>
         </div>
         <div className="grid grid-cols-2 gap-4 mt-6">
           <div className="bg-white/5 rounded-xl p-3">
             <div className="text-gray-400 text-xs">Calories</div>
             <div className="text-neon-blue font-bold text-lg">{todaysStats.calories} kcal</div>
           </div>
           <div className="bg-white/5 rounded-xl p-3">
             <div className="text-gray-400 text-xs">Active Time</div>
             <div className="text-purple-400 font-bold text-lg">{todaysStats.activeMinutes} min</div>
           </div>
         </div>
      </div>

      <h3 className="text-white font-semibold text-lg mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <button onClick={() => onNavigate(Screen.WORKOUTS)} className="bg-neon-green text-black p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform">
          <Dumbbell size={24} />
          <span className="text-xs font-bold">Workout</span>
        </button>
        <button onClick={() => onNavigate(Screen.RUNNING)} className="bg-neon-blue text-black p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform">
          <Zap size={24} />
          <span className="text-xs font-bold">Start Run</span>
        </button>
        <button onClick={() => onStartQuickWorkout('Stretch')} className="bg-purple-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform">
          <Activity size={24} />
          <span className="text-xs font-bold">Stretch</span>
        </button>
      </div>

      <div className="bg-gradient-to-r from-gray-900 to-black border border-white/10 p-4 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="bg-neon-green/20 p-2 rounded-full">
            <UserIcon size={16} className="text-neon-green" />
          </div>
          <div>
            <h4 className="text-neon-green text-xs font-bold uppercase tracking-wider mb-1">Gemini Daily Tip</h4>
            <p className="text-gray-300 text-sm italic">"{tip}"</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... ChallengeScreen, HabitTrackerScreen, ProgressScreen, ProfileScreen components remain structure wise the same
// but are called by App which now provides data via Supabase. We will omit full re-writing of those presentational 
// components to focus on App logic, but we must ensure they receive data correctly.
// For brevity, assuming they are imported or defined above same as before.

// Re-defining for context and props usage updates if needed
const ChallengeScreen: React.FC<{ 
    state: ChallengeState | null, 
    onInit: () => void, 
    onCompleteDay: (day: number) => void 
}> = ({ state, onInit, onCompleteDay }) => {
  const [selectedDay, setSelectedDay] = useState<ChallengeTask | null>(null);

  if (!state) {
    return (
        <div className="h-full w-full bg-black p-6 flex flex-col items-center justify-center text-center">
             <h2 className="text-3xl font-bold text-white mb-4">30 Days of Grind</h2>
             <p className="text-gray-400 mb-8">Commit to the challenge. 30 days. No excuses.</p>
             <button onClick={onInit} className="bg-neon-green text-black px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all">
                Start Challenge Today
             </button>
        </div>
    );
  }

  const startDate = new Date(state.startDate);
  const today = new Date();
  const diffTime = today.getTime() - startDate.getTime();
  const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const currentDayNum = Math.max(1, daysSinceStart);

  const handleDayClick = (dayNum: number) => {
    if (dayNum > currentDayNum) return; // Locked
    const task = CHALLENGE_DB.find(t => t.day === dayNum);
    if (task) setSelectedDay(task);
  };

  const handleCompleteTask = () => {
    if (selectedDay) {
        onCompleteDay(selectedDay.day);
        setSelectedDay(null);
    }
  };

  const completedCount = state.completedDays.length;

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto relative">
      <div className="flex justify-between items-end mb-6">
        <div>
           <h2 className="text-2xl font-bold text-white">30 Days of Grind</h2>
           <p className="text-gray-400 text-sm">Day {currentDayNum} of 30</p>
        </div>
        <div className="text-right">
           <div className="text-3xl font-bold text-neon-green">{completedCount}<span className="text-sm text-gray-500">/30</span></div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((dayNum) => {
          const isCompleted = state.completedDays.includes(dayNum);
          const isLocked = dayNum > currentDayNum;
          const isCurrent = dayNum === currentDayNum;

          return (
            <button 
              key={dayNum} 
              disabled={isLocked}
              onClick={() => handleDayClick(dayNum)}
              className={`
                aspect-square rounded-xl flex items-center justify-center text-sm font-bold border transition-all relative overflow-hidden
                ${isCompleted ? 'bg-neon-green text-black border-neon-green' : ''}
                ${isCurrent && !isCompleted ? 'bg-transparent text-white border-neon-blue shadow-[0_0_10px_rgba(0,255,255,0.4)] animate-pulse' : ''}
                ${isLocked ? 'bg-white/5 text-gray-600 border-transparent cursor-not-allowed opacity-50' : ''}
                ${!isCompleted && !isLocked && !isCurrent ? 'bg-white/5 border-white/10 hover:border-white/30' : ''}
              `}
            >
              {isCompleted ? <CheckCircle size={16} /> : isLocked ? <Lock size={14} /> : dayNum}
            </button>
          );
        })}
      </div>
      
      {/* Detail Modal */}
      {selectedDay && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
                <button onClick={() => setSelectedDay(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                <div className="mb-4">
                    <span className="text-neon-blue text-xs font-bold uppercase tracking-wider">Day {selectedDay.day}</span>
                    <h3 className="text-2xl font-bold text-white mt-1">{selectedDay.title}</h3>
                </div>
                <div className="bg-white/5 rounded-xl p-4 mb-6">
                    <p className="text-gray-300 text-sm mb-4">{selectedDay.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="bg-white/10 px-2 py-1 rounded">{selectedDay.type}</span>
                        <span className="bg-white/10 px-2 py-1 rounded">{selectedDay.duration}</span>
                    </div>
                </div>
                
                {state.completedDays.includes(selectedDay.day) ? (
                    <button disabled className="w-full bg-gray-800 text-green-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle size={20} /> Completed
                    </button>
                ) : (
                    <button onClick={handleCompleteTask} className="w-full bg-neon-green text-black font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all">
                        Mark Complete
                    </button>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

const HabitTrackerScreen: React.FC<{ habits: HabitLog, onUpdateHabit: (id: string, val: number | boolean) => void }> = ({ habits, onUpdateHabit }) => {
  const today = getTodayStr();
  const todaysHabits = habits[today] || {};

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Atomic Habits</h2>
      <div className="flex flex-col gap-4">
        {DEFAULT_HABITS.map(habit => {
          const value = todaysHabits[habit.id];
          const isCompleted = habit.type === 'toggle' ? !!value : (value as number || 0) >= (habit.target || 1);
          const count = (value as number) || 0;

          return (
            <div 
              key={habit.id}
              className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${isCompleted ? 'bg-neon-green/5 border-neon-green/50' : 'bg-white/5 border-white/5'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-2xl">{habit.icon}</div>
                    <div>
                        <div className={`font-medium ${isCompleted ? 'text-white' : 'text-gray-400'}`}>{habit.name}</div>
                        {habit.type === 'counter' && (
                            <div className="text-xs text-gray-500">{count} / {habit.target} {habit.unit}</div>
                        )}
                    </div>
                </div>
                
                {habit.type === 'toggle' ? (
                     <div 
                        onClick={() => onUpdateHabit(habit.id, !value)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${isCompleted ? 'bg-neon-green border-neon-green text-black' : 'border-gray-500 text-transparent'}`}
                     >
                        <CheckCircle size={18} />
                     </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <button onClick={() => onUpdateHabit(habit.id, Math.max(0, count - 1))} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><Minus size={16} /></button>
                        <span className="font-bold w-4 text-center">{count}</span>
                        <button onClick={() => onUpdateHabit(habit.id, count + 1)} className="w-8 h-8 rounded-full bg-neon-blue/20 text-neon-blue flex items-center justify-center hover:bg-neon-blue/30"><Plus size={16} /></button>
                    </div>
                )}
              </div>
              
              {habit.type === 'counter' && (
                   <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                       <div className="bg-neon-blue h-full transition-all duration-500" style={{ width: `${Math.min(100, (count / (habit.target || 1)) * 100)}%` }}></div>
                   </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProgressScreen: React.FC<{ history: WorkoutSession[], user: UserProfile }> = ({ history, user }) => {
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const daySessions = history.filter(h => h.date.startsWith(dayStr));
      const cal = daySessions.reduce((acc, curr) => acc + curr.caloriesBurned, 0);
      days.push({ name: dayName, cal });
    }
    return days;
  }, [history]);

  const weightData = useMemo(() => {
      // Sort and take last 10 entries for cleaner chart
      return [...user.weightHistory]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10)
        .map(w => ({ date: w.date.substring(5), weight: w.weight }));
  }, [user.weightHistory]);

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Your Gains</h2>
      
      <div className="glass-card p-6 rounded-3xl mb-8">
        <h3 className="text-gray-400 text-sm mb-4">Weekly Calories Burned</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#ccff00' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="cal" fill="#ccff00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl">
        <h3 className="text-gray-400 text-sm mb-4">Weight Trend (kg)</h3>
        {weightData.length > 1 ? (
             <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightData}>
                    <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#00ffff' }} />
                    <Area type="monotone" dataKey="weight" stroke="#00ffff" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
        ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm italic border border-dashed border-white/10 rounded-xl">
                Log weight to see trends
            </div>
        )}
      </div>
    </div>
  );
};

const ProfileScreen: React.FC<{ 
    user: UserProfile, 
    history: WorkoutSession[], 
    streak: number, 
    onLogout: () => void,
    onUpdateWeight: (w: number) => void,
    onUpdateImage: (img: string) => void
}> = ({ user, history, streak, onLogout, onUpdateWeight, onUpdateImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWeightPrompt = () => {
    const w = prompt("Enter current weight (kg):", user.weight.toString());
    if (w && !isNaN(parseFloat(w))) {
        onUpdateWeight(parseFloat(w));
    }
  };

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-neon-green to-neon-blue p-1">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
                    {user.profileImage ? (
                        <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-4xl font-bold text-gray-700">{user.name.charAt(0)}</div>
                    )}
                </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-white text-black p-1.5 rounded-full border-2 border-black">
                <Camera size={14} />
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-white">{user.name}</h2>
          {user.isPro ? (
              <span className="bg-neon-purple/20 text-neon-purple text-xs font-bold px-2 py-1 rounded border border-neon-purple/50">PRO MEMBER</span>
          ) : (
              <span className="bg-gray-800 text-gray-400 text-xs font-bold px-2 py-1 rounded">FREE PLAN</span>
          )}
          <div className="text-gray-400 text-xs mt-1">Joined {new Date(user.joinDate).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white flex items-center justify-center gap-1"><Flame size={20} className="text-orange-500" /> {streak}</div>
          <div className="text-xs text-gray-400 uppercase">Day Streak</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{history.length}</div>
          <div className="text-xs text-gray-400 uppercase">Workouts Done</div>
        </div>
      </div>

      <div className="space-y-4">
        <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl text-white hover:bg-white/10">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-gray-400" />
            <span>App Settings</span>
          </div>
          <ChevronRight size={20} className="text-gray-500" />
        </button>
        
        <button onClick={handleWeightPrompt} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl text-white hover:bg-white/10">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-gray-400" />
            <span>Log Current Weight</span>
          </div>
          <span className="text-neon-blue font-bold">{user.weight} kg</span>
        </button>

         <button onClick={onLogout} className="w-full flex items-center justify-between p-4 bg-red-500/10 rounded-2xl text-red-500 hover:bg-red-500/20 mt-8 transition-colors">
          <div className="flex items-center gap-3">
            <LogOut size={20} />
            <span>Log Out</span>
          </div>
        </button>
      </div>
    </div>
  );
};

const ActiveSessionScreen: React.FC<{ 
  mode: 'Run' | 'Workout', 
  activeWorkout?: Workout | null, 
  onClose: (data: WorkoutSession | null) => void 
}> = ({ mode, activeWorkout, onClose }) => {
  const [duration, setDuration] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setDuration(t => {
          const newTime = t + 1;
          if (mode === 'Run') {
            setDistance(d => d + 0.0022); 
            setCalories(c => c + 0.15);
          } else {
            setCalories(c => c + 0.12);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, mode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    const sessionData: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: mode,
      durationSeconds: duration,
      caloriesBurned: Math.round(calories),
      distanceKm: mode === 'Run' ? parseFloat(distance.toFixed(2)) : undefined,
      category: activeWorkout?.category
    };
    onClose(sessionData);
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-between p-8 safe-area-inset-top safe-area-inset-bottom">
       <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="text-7xl font-bold text-white font-mono tracking-wider neon-text mb-4">{formatTime(duration)}</div>
            <div className="text-neon-green text-xl font-bold uppercase">{mode === 'Run' ? `${distance.toFixed(2)} km` : `${Math.round(calories)} kcal`}</div>
       </div>
       <button onClick={handleFinish} className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]"><StopCircle size={32} color="white" /></button>
    </div>
  );
};

const WorkoutSelectionScreen: React.FC<{ onStartWorkout: (w: Workout) => void }> = ({ onStartWorkout }) => {
  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Choose Your Pain</h2>
      <div className="grid gap-6">
        {WORKOUT_DB.map(workout => (
          <div key={workout.id} onClick={() => onStartWorkout(workout)} className="relative h-48 rounded-3xl overflow-hidden group cursor-pointer border border-white/5 hover:border-neon-green/50 transition-colors shadow-lg">
            <img src={workout.image} alt={workout.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 p-5 flex flex-col justify-between">
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-neon-green/90 text-black text-[10px] font-bold rounded uppercase">{workout.category}</span>
                <span className="px-2 py-1 bg-blue-500/80 text-white text-[10px] font-bold rounded uppercase">{workout.difficulty}</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{workout.title}</h3>
                  <div className="flex items-center gap-4 text-gray-200 text-xs font-medium">
                    <span className="flex items-center gap-1"><Clock size={12} className="text-neon-blue" /> {workout.duration}</span>
                    <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500" /> {workout.estCalories} kcal</span>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md"><Play size={24} fill="currentColor" className="ml-1" /></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// --- Main App ---

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

  // Active Session
  const [activeSessionMode, setActiveSessionMode] = useState<'Run' | 'Workout' | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  // 1. Listen for Supabase Auth changes
  useEffect(() => {
    const { data: { subscription } } = Storage.onAuthStateChange(async (session) => {
      if (session) {
        setLoadingData(true);
        try {
          // Fetch all data in parallel
          const userId = session.user.id;
          let profile = await Storage.getUserProfile(userId);
          
          if (!profile) {
            // New user via OAuth (profile missing), create one
            const newProfile: Partial<UserProfile> = {
                id: userId,
                name: session.user.user_metadata.full_name || 'Neon Athlete',
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
          
          // Fetch logs
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

  // Actions
  const handleLoginSuccess = (u: UserProfile) => {
    // This is now redundant mostly as the AuthStateChange will catch it, 
    // but useful for immediate UI feedback if needed.
  };

  const handleLogout = () => {
    Storage.logout();
    // State clearing handled by AuthStateChange listener
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
    } else {
      alert("Permission denied.");
    }
  };

  const handleUpdateHabit = async (id: string, val: number | boolean) => {
     // Optimistic update
     setHabits(prev => {
         const today = getTodayStr();
         const newLog = { ...prev };
         if(!newLog[today]) newLog[today] = {};
         newLog[today][id] = val;
         return newLog;
     });
     // Sync
     await Storage.saveHabitValue(id, val);
  };

  const handleStartChallenge = async () => {
      const newState = await Storage.initChallenge();
      setChallenge(newState);
  };

  const handleCompleteChallengeDay = async (day: number) => {
      const newState = await Storage.completeChallengeDay(day);
      setChallenge({...newState});
      // Optionally add a workout session to history for stats
      const task = CHALLENGE_DB.find(t => t.day === day);
      if (task && task.type === 'Workout') {
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
      }
  };

  const handleWeightUpdate = async (w: number) => {
     if(user) {
         const newHistory = [...user.weightHistory, { date: getTodayStr(), weight: w }];
         const updated = { ...user, weight: w, weightHistory: newHistory };
         setUser(updated);
         await Storage.upsertProfile(updated);
     }
  };

  const handleImageUpdate = async (img: string) => {
      if (user) {
          const updated = { ...user, profileImage: img };
          setUser(updated);
          await Storage.upsertProfile(updated);
      }
  };

  const renderScreen = () => {
    if (loadingData) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black">
                <Loader2 className="animate-spin text-neon-green mb-4" size={48} />
                <p className="text-gray-400 animate-pulse">Syncing with Neon Cloud...</p>
            </div>
        );
    }

    if (activeSessionMode) {
        return <ActiveSessionScreen mode={activeSessionMode} activeWorkout={activeWorkout} onClose={async (data) => {
            setActiveSessionMode(null);
            if(data) {
                const h = await Storage.saveSession(data);
                setHistory(h);
                setCurrentScreen(Screen.PROGRESS);
            }
        }} />;
    }

    switch (currentScreen) {
      case Screen.SPLASH: return <SplashScreen onComplete={() => setCurrentScreen(Screen.AUTH)} />; 
      case Screen.AUTH: return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
      case Screen.DASHBOARD: return <DashboardScreen 
          onNavigate={setCurrentScreen} user={user!} streak={calculatedStreak} todaysStats={todaysStats} 
          onStartQuickWorkout={(t) => {
             if(t === 'Stretch') { setActiveWorkout(WORKOUT_DB.find(w => w.category==='Stretch') || null); setActiveSessionMode('Workout'); }
          }} 
          onEnablePedometer={handleEnablePedometer} pedometerActive={pedometerActive}
      />;
      case Screen.WORKOUTS: return <WorkoutSelectionScreen onStartWorkout={(w) => { setActiveWorkout(w); setActiveSessionMode('Workout'); }} />;
      case Screen.RUNNING:  setActiveSessionMode('Run'); return null; // Triggered immediately
      case Screen.CHALLENGE: return <ChallengeScreen state={challenge} onInit={handleStartChallenge} onCompleteDay={handleCompleteChallengeDay} />;
      case Screen.HABITS: return <HabitTrackerScreen habits={habits} onUpdateHabit={handleUpdateHabit} />;
      case Screen.PROGRESS: return <ProgressScreen history={history} user={user!} />;
      case Screen.PROFILE: return <ProfileScreen user={user!} history={history} streak={calculatedStreak} onLogout={handleLogout} onUpdateWeight={handleWeightUpdate} onUpdateImage={handleImageUpdate} />;
      default: return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className="bg-black min-h-screen text-white font-sans max-w-md mx-auto relative shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
      {renderScreen()}
      {user && !activeSessionMode && !loadingData && currentScreen !== Screen.SPLASH && currentScreen !== Screen.AUTH && 
        <Navigation currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      }
    </div>
  );
};

export default App;
