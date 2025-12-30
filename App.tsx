import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { Screen, Workout, WorkoutSession, UserProfile, HabitLog, ChallengeState, Habit, ChallengeTask, WorkoutCategory } from './types';
import { generateMotivationalTip, generateRunningCoachSpeech, playAudioBuffer } from './services/geminiService';
import { Storage, getTodayStr } from './services/storage';
import { PedometerService } from './services/pedometer';
import { WORKOUT_DB } from './services/workoutData';
import { CHALLENGE_DB } from './services/challengeData';
import { supabase } from './services/supabaseClient';
import { 
  Play, Pause, StopCircle, Flame, Moon, Sun, Monitor, 
  ChevronRight, ArrowRight, User as UserIcon, LogOut, Settings, 
  Zap, Clock, MapPin, Activity, Dumbbell, Calendar, CheckSquare, BarChart2, Footprints,
  Plus, Minus, Camera, Lock, CheckCircle, AlertCircle, X, Loader2, Trophy, Edit2, Share2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, CartesianGrid } from 'recharts';

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
    } catch (e: any) {
      setError(e.message || "Authentication failed");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await Storage.loginGoogle();
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

const WorkoutSelectionScreen: React.FC<{ onStartWorkout: (w: Workout) => void }> = ({ onStartWorkout }) => {
  const [filter, setFilter] = useState<'All' | WorkoutCategory>('All');
  
  const filteredWorkouts = filter === 'All' ? WORKOUT_DB : WORKOUT_DB.filter(w => w.category === filter);

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <h2 className="text-3xl font-bold text-white mb-6">Workouts</h2>
      
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Chest', 'Legs', 'Cardio', 'Stretch'].map(cat => (
          <button 
            key={cat} 
            onClick={() => setFilter(cat as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
              filter === cat 
              ? 'bg-neon-green text-black border-neon-green' 
              : 'bg-black text-gray-400 border-gray-800 hover:border-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredWorkouts.map(workout => (
          <div 
            key={workout.id} 
            onClick={() => onStartWorkout(workout)}
            className="group relative h-48 rounded-3xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
          >
            <img src={workout.image} alt={workout.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            
            <div className="absolute bottom-0 left-0 p-5 w-full">
              <div className="flex justify-between items-end">
                <div>
                   <span className={`text-[10px] font-bold px-2 py-1 rounded bg-black/50 backdrop-blur-md mb-2 inline-block ${
                     workout.difficulty === 'Advanced' ? 'text-red-400 border border-red-400/30' : 
                     workout.difficulty === 'Intermediate' ? 'text-orange-400 border border-orange-400/30' : 
                     'text-green-400 border border-green-400/30'
                   }`}>
                     {workout.difficulty.toUpperCase()}
                   </span>
                   <h3 className="text-xl font-bold text-white mb-1">{workout.title}</h3>
                   <div className="flex items-center gap-3 text-gray-300 text-xs">
                     <span className="flex items-center gap-1"><Clock size={12}/> {workout.duration}</span>
                     <span className="flex items-center gap-1"><Flame size={12}/> {workout.estCalories} kcal</span>
                   </div>
                </div>
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-md group-hover:bg-neon-green group-hover:text-black transition-colors">
                  <Play size={20} fill="currentColor" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChallengeScreen: React.FC<{ state: ChallengeState | null, onInit: () => void, onCompleteDay: (day: number) => void }> = ({ state, onInit, onCompleteDay }) => {
  if (!state) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black p-8 text-center">
        <Trophy size={64} className="text-neon-green mb-6 animate-bounce" />
        <h2 className="text-3xl font-bold text-white mb-4">30-Day Grind</h2>
        <p className="text-gray-400 mb-8">Commit to consistency. One workout every day for 30 days. Can you handle it?</p>
        <button onClick={onInit} className="bg-neon-green text-black font-bold py-4 px-12 rounded-full text-lg shadow-[0_0_20px_rgba(204,255,0,0.4)] hover:scale-105 transition-transform">
          Start Challenge
        </button>
      </div>
    );
  }

  const completedCount = state.completedDays.length;
  const progress = Math.round((completedCount / 30) * 100);

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Challenge</h2>
        <div className="text-right">
          <div className="text-neon-green font-bold text-lg">{progress}%</div>
          <div className="text-gray-500 text-xs uppercase">Completed</div>
        </div>
      </div>

      <div className="w-full h-2 bg-gray-800 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-neon-green shadow-[0_0_10px_#ccff00]" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {CHALLENGE_DB.map((task) => {
          const isCompleted = state.completedDays.includes(task.day);
          const isLocked = !isCompleted && task.day > (Math.max(...state.completedDays, 0) + 1);
          const isCurrent = !isCompleted && !isLocked;

          return (
            <button 
              key={task.day} 
              disabled={isLocked || isCompleted}
              onClick={() => {
                  if(isCurrent) {
                      if(window.confirm(`Start Day ${task.day}: ${task.title}?`)) {
                          onCompleteDay(task.day);
                      }
                  }
              }}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center relative border transition-all
                ${isCompleted ? 'bg-neon-green/20 border-neon-green text-neon-green' : 
                  isCurrent ? 'bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] animate-pulse' : 
                  'bg-gray-900 border-transparent text-gray-700 opacity-50'}
              `}
            >
              <span className="text-lg font-bold">{task.day}</span>
              {isCompleted && <CheckCircle size={12} className="mt-1" />}
              {isLocked && <Lock size={12} className="mt-1" />}
            </button>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
        <h3 className="text-white font-bold mb-2">Current Focus</h3>
        <p className="text-gray-400 text-sm">
           {CHALLENGE_DB.find(d => d.day === (Math.max(...state.completedDays, 0) + 1))?.description || "Challenge Complete!"}
        </p>
      </div>
    </div>
  );
};

const HabitTrackerScreen: React.FC<{ habits: HabitLog, onUpdateHabit: (id: string, val: number | boolean) => void }> = ({ habits, onUpdateHabit }) => {
  const today = getTodayStr();
  const completedCount = DEFAULT_HABITS.filter(h => habits[today]?.[h.id]).length;
  
  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-3xl font-bold text-white">Habits</h2>
         <div className="bg-white/10 px-4 py-2 rounded-full text-sm font-bold text-neon-blue">
            {completedCount}/{DEFAULT_HABITS.length} Done
         </div>
      </div>

      <div className="space-y-4">
        {DEFAULT_HABITS.map(habit => {
          const isDone = !!habits[today]?.[habit.id];
          
          return (
            <div 
              key={habit.id} 
              className={`p-4 rounded-2xl flex items-center justify-between transition-all duration-300 border ${
                  isDone ? 'bg-neon-green/10 border-neon-green/50' : 'bg-white/5 border-white/5'
              }`}
            >
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-black ${isDone ? 'grayscale-0' : 'grayscale opacity-50'}`}>
                      {habit.icon}
                  </div>
                  <div>
                      <h4 className={`font-bold transition-colors ${isDone ? 'text-white' : 'text-gray-400'}`}>{habit.name}</h4>
                      {habit.type === 'counter' && <p className="text-xs text-gray-500">{habit.target} {habit.unit} daily</p>}
                  </div>
               </div>

               <button 
                  onClick={() => onUpdateHabit(habit.id, !isDone)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isDone ? 'bg-neon-green border-neon-green text-black scale-110' : 'border-gray-600 hover:border-white'
                  }`}
               >
                   {isDone && <CheckCircle size={18} />}
               </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProgressScreen: React.FC<{ history: WorkoutSession[], user: UserProfile }> = ({ history, user }) => {
  // Process data for charts
  const weeklyData = useMemo(() => {
     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
     const data = new Array(7).fill(0).map((_, i) => ({ name: days[i], cal: 0, min: 0 }));
     
     const now = new Date();
     // Get start of week (Sunday)
     const startOfWeek = new Date(now);
     startOfWeek.setDate(now.getDate() - now.getDay());
     startOfWeek.setHours(0,0,0,0);

     history.forEach(session => {
         const d = new Date(session.date);
         if (d >= startOfWeek) {
             const dayIdx = d.getDay();
             data[dayIdx].cal += session.caloriesBurned;
             data[dayIdx].min += Math.round(session.durationSeconds / 60);
         }
     });
     return data;
  }, [history]);

  const totalWorkouts = history.length;
  const totalCalories = history.reduce((a, b) => a + b.caloriesBurned, 0);
  const totalHours = (history.reduce((a, b) => a + b.durationSeconds, 0) / 3600).toFixed(1);

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
      <h2 className="text-3xl font-bold text-white mb-6">Your Stats</h2>
      
      <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <div className="text-2xl font-bold text-neon-green">{totalWorkouts}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Workouts</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <div className="text-2xl font-bold text-neon-blue">{(totalCalories/1000).toFixed(1)}k</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Kcal Burned</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <div className="text-2xl font-bold text-purple-400">{totalHours}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Hours</div>
          </div>
      </div>

      <div className="glass-card p-4 rounded-3xl mb-6">
          <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2"><Activity size={16} className="text-neon-green"/> Activity This Week</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                    <XAxis dataKey="name" tick={{fill: '#666', fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}}
                        itemStyle={{color: '#fff'}}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey="cal" fill="#ccff00" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
            </ResponsiveContainer>
          </div>
      </div>
      
      <div className="glass-card p-4 rounded-3xl">
          <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2"><Monitor size={16} className="text-neon-blue"/> Weight Progress</h3>
           <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={user.weightHistory}>
                    <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} />
                    <Area type="monotone" dataKey="weight" stroke="#00ffff" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
            </ResponsiveContainer>
          </div>
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
    
    return (
        <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto">
             <div className="flex justify-end mb-4">
                 <button onClick={onLogout} className="bg-red-500/10 text-red-500 p-2 rounded-full hover:bg-red-500/20"><LogOut size={20} /></button>
             </div>

             <div className="flex flex-col items-center mb-8">
                 <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-neon-green mb-4 relative overflow-hidden group">
                     {user.profileImage ? (
                         <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                     ) : (
                         <div className="w-full h-full flex items-center justify-center text-neon-green text-3xl font-bold">
                             {user.name.charAt(0)}
                         </div>
                     )}
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                         <Camera size={20} className="text-white" />
                     </div>
                 </div>
                 <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                 <p className="text-gray-500 text-sm">Joined {new Date(user.joinDate).toLocaleDateString()}</p>
                 <div className="mt-2 bg-neon-green/10 px-3 py-1 rounded text-neon-green text-xs font-bold uppercase tracking-widest border border-neon-green/20">
                     {user.isPro ? 'Pro Member' : 'Free Plan'}
                 </div>
             </div>

             <div className="space-y-4">
                 <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <Monitor className="text-gray-400" size={20} />
                         <span className="text-white">Current Weight</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <span className="text-2xl font-bold text-white">{user.weight}</span>
                         <span className="text-gray-500 text-sm">kg</span>
                         <button 
                            onClick={() => {
                                const w = prompt("New Weight (kg):");
                                if(w) onUpdateWeight(parseFloat(w));
                            }}
                            className="ml-2 bg-gray-800 p-1 rounded hover:bg-gray-700"
                         >
                             <Edit2 size={14} className="text-neon-blue" />
                         </button>
                     </div>
                 </div>

                 <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <Flame className="text-orange-500" size={20} />
                         <span className="text-white">Current Streak</span>
                     </div>
                     <span className="text-xl font-bold text-orange-500">{streak} Days</span>
                 </div>
                 
                 <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <Settings className="text-gray-400" size={20} />
                         <span className="text-white">App Settings</span>
                     </div>
                     <ChevronRight className="text-gray-600" size={20} />
                 </div>
                 
                 <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <Share2 className="text-gray-400" size={20} />
                         <span className="text-white">Share Stats</span>
                     </div>
                     <ChevronRight className="text-gray-600" size={20} />
                 </div>
             </div>
        </div>
    );
};

const ActiveSessionScreen: React.FC<any> = ({ mode, onClose }) => (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <div className="absolute inset-0 bg-neon-green/5 animate-pulse-slow"></div>
        <h1 className="text-white text-5xl font-bold mb-2 z-10">{mode}</h1>
        <p className="text-neon-blue text-xl mb-12 animate-pulse z-10">SESSION ACTIVE</p>
        
        <div className="w-64 h-64 rounded-full border-4 border-white/10 flex items-center justify-center relative mb-12">
            <div className="absolute inset-0 rounded-full border-4 border-neon-green border-t-transparent animate-spin"></div>
            <div className="text-center">
                <div className="text-4xl font-mono font-bold text-white">00:45</div>
                <div className="text-gray-400 text-sm uppercase mt-1">Duration</div>
            </div>
        </div>

        <button 
            onClick={() => onClose({ id: Date.now().toString(), date: new Date().toISOString(), type: mode, durationSeconds: 60 * 45, caloriesBurned: 320 })} 
            className="bg-red-600 hover:bg-red-700 text-white p-6 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all z-10"
        >
            <StopCircle size={40} fill="currentColor" />
        </button>
    </div>
);

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

  // 1. Listen for Supabase Auth changes AND Handle Deep Link Hashes
  useEffect(() => {
    // Check for hash immediately (fix for WebViews that open with hash but don't trigger listener instantly)
    const handleHash = async () => {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            // Supabase client auto-parses this usually, but checking getSession ensures it.
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                // Clear the ugly hash from URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    };
    handleHash();

    const { data: { subscription } } = Storage.onAuthStateChange(async (session) => {
      if (session) {
        setLoadingData(true);
        try {
          const userId = session.user.id;
          let profile = await Storage.getUserProfile(userId);
          
          if (!profile) {
            const newProfile: Partial<UserProfile> = {
                id: userId,
                name: session.user.user_metadata.full_name || 'Zen30 Athlete',
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

  // Actions
  const handleLoginSuccess = (u: UserProfile) => { };

  const handleLogout = () => {
    Storage.logout();
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
     setHabits(prev => {
         const today = getTodayStr();
         const newLog = { ...prev };
         if(!newLog[today]) newLog[today] = {};
         newLog[today][id] = val;
         return newLog;
     });
     await Storage.saveHabitValue(id, val);
  };

  const handleStartChallenge = async () => {
      const newState = await Storage.initChallenge();
      setChallenge(newState);
  };

  const handleCompleteChallengeDay = async (day: number) => {
      const newState = await Storage.completeChallengeDay(day);
      setChallenge({...newState});
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
                <p className="text-gray-400 animate-pulse">Syncing with Zen30 Cloud...</p>
            </div>
        );
    }

    if (activeSessionMode) {
        return <ActiveSessionScreen mode={activeSessionMode} activeWorkout={activeWorkout} onClose={async (data: WorkoutSession | null) => {
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
      case Screen.RUNNING:  setActiveSessionMode('Run'); return null; 
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