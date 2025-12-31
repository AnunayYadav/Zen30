import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { Screen, Workout, WorkoutSession, UserProfile, HabitLog, ChallengeState, Habit, WorkoutSegment, ChallengeTask, ChallengeLog } from './types';
import { generateMotivationalTip, generateWorkoutPlan, generate30DayChallenge, modifyChallengePlan } from './services/geminiService';
import { Storage, getTodayStr } from './services/storage';
import { SoundService } from './services/soundService';
import { WORKOUT_DB } from './services/workoutData';
import { 
  Play, Pause, Flame, Activity, Dumbbell, Zap, Clock, Footprints,
  LogOut, Settings, X, Volume2, VolumeX,
  ChevronRight, BrainCircuit, Sparkles, Trash2, Calendar, Target, AlertTriangle, RefreshCw, Plus, CheckCircle, AlertCircle, Loader2, Trophy, Edit2, CheckSquare, FileText, Shield
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- Constants ---
const DEFAULT_HABITS: Habit[] = [
  { id: 'h1', name: 'Drink Water', icon: '💧', type: 'counter', target: 8, unit: 'cups' },
  { id: 'h2', name: 'Morning Run', icon: '🏃', type: 'toggle' },
  { id: 'h3', name: 'Fix Posture', icon: '🧘', type: 'toggle' },
  { id: 'h4', name: 'Skincare', icon: '✨', type: 'toggle' },
  { id: 'h5', name: '8h Sleep', icon: '😴', type: 'toggle' },
];

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&q=80",
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
          <span className="text-lg font-bold">G</span> Continue with Google
        </button>

        <p className="text-center text-gray-500 mt-6 cursor-pointer hover:text-white" onClick={() => { setIsLogin(!isLogin); setError(""); }}>
            {isLogin ? "New here? Sign Up" : "Have an account? Login"}
        </p>
      </div>
    </div>
  );
};

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile;
    isMuted: boolean;
    onToggleSound: () => void;
    onResetStats: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, isMuted, onToggleSound, onResetStats }) => {
  const [infoModal, setInfoModal] = useState<'Privacy' | 'Terms' | null>(null);

  if (!isOpen) return null;

  if (infoModal) {
      return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative max-h-[80vh] overflow-y-auto">
                <button onClick={() => setInfoModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                <h2 className="text-2xl font-bold text-white mb-4">{infoModal}</h2>
                <div className="text-gray-300 text-sm space-y-4">
                    <p>This is a demo application. {infoModal === 'Privacy' ? 'We respect your privacy. All data is stored securely.' : 'By using this app, you agree to level up your fitness.'}</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
             <div className="flex items-center gap-3">
               {isMuted ? <VolumeX className="text-gray-400" size={20} /> : <Volume2 className="text-neon-green" size={20} />}
               <span>Sound Effects</span>
             </div>
             <button onClick={onToggleSound} className={`w-10 h-6 rounded-full relative transition-colors ${isMuted ? 'bg-gray-700' : 'bg-neon-green'}`}>
                 <div className={`absolute top-1 w-4 h-4 bg-black rounded-full shadow transition-all ${isMuted ? 'left-1' : 'right-1'}`}></div>
             </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setInfoModal('Privacy')} className="p-4 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                  <Shield size={20} className="text-neon-blue"/>
                  <span className="text-xs text-gray-300">Privacy Policy</span>
              </button>
              <button onClick={() => setInfoModal('Terms')} className="p-4 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                  <FileText size={20} className="text-purple-400"/>
                  <span className="text-xs text-gray-300">Terms & Conditions</span>
              </button>
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <h3 className="text-xs text-gray-400 uppercase mb-2">Account</h3>
            <p className="text-white font-medium">{user.email}</p>
            <p className="text-gray-500 text-xs">User ID: {user.id.slice(0,8)}...</p>
          </div>

          <button onClick={() => { if(confirm("This will reset your workout history and daily stats. Habits and Challenge plan will remain. Continue?")) onResetStats(); }} className="w-full p-4 bg-red-900/20 border border-red-500/20 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-900/30 transition-colors">
              <Trash2 size={18} /> Reset Workout Stats
          </button>

          <div className="text-center text-gray-600 text-xs mt-4">v1.2.0 • Zen30</div>
        </div>
      </div>
    </div>
  );
};

const AvatarSelectionModal: React.FC<{ isOpen: boolean, onClose: () => void, onSelect: (url: string) => void, onUploadClick: () => void }> = ({ isOpen, onClose, onSelect, onUploadClick }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Choose Avatar</h2>
                <p className="text-gray-500 text-center text-xs mb-6">Pick a look or upload your own.</p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    {AVATAR_PRESETS.map((url, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => onSelect(url)}
                            className="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-neon-green transition-all hover:scale-110 active:scale-95 group relative"
                        >
                            <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-neon-green/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <div className="h-px bg-white/10 flex-grow"></div>
                    <span className="text-xs text-gray-500 uppercase">Or</span>
                    <div className="h-px bg-white/10 flex-grow"></div>
                </div>

                <button 
                    onClick={onUploadClick}
                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                    <Activity size={18} className="text-neon-blue" /> Upload Custom Photo
                </button>
            </div>
        </div>
    );
};

const DayDetailsModal: React.FC<{
  day: ChallengeTask;
  completed: boolean;
  currentLog: ChallengeLog;
  currentDayNum: number;
  onClose: () => void;
  onSaveLog: (log: ChallengeLog) => void;
  onUpdateTask: (newTask: ChallengeTask) => void;
  onSetCompletion: (isComplete: boolean) => void;
}> = ({ day, completed, currentLog, currentDayNum, onClose, onSaveLog, onUpdateTask, onSetCompletion }) => {
  
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(currentLog.notes);
  const [checkedIndices, setCheckedIndices] = useState<number[]>(currentLog.checkedIndices);
  
  const [editTitle, setEditTitle] = useState(day.title);
  const [editDesc, setEditDesc] = useState(day.description);
  const [editInstructions, setEditInstructions] = useState(day.instructions?.join('\n') || "");

  // Auto-Complete Logic:
  // Whenever checkedIndices changes, check if it matches total items.
  useEffect(() => {
     if(day.type !== 'Rest') {
         const total = day.instructions?.length || 0;
         if(total > 0 && checkedIndices.length === total) {
             if(!completed) onSetCompletion(true);
         } else {
             if(completed && checkedIndices.length < total) onSetCompletion(false);
         }
     }
  }, [checkedIndices, day, completed]);

  // Handle saving logs on unmount/close
  useEffect(() => {
    return () => {
      if(!isEditing) {
         onSaveLog({ notes, checkedIndices });
      }
    };
  }, [notes, checkedIndices, isEditing]);

  const toggleCheck = (idx: number) => {
    if (checkedIndices.includes(idx)) {
      setCheckedIndices(prev => prev.filter(i => i !== idx));
    } else {
      setCheckedIndices(prev => [...prev, idx]);
    }
  };

  const handleSaveEdit = () => {
    const updatedTask: ChallengeTask = {
      ...day,
      title: editTitle,
      description: editDesc,
      instructions: editInstructions.split('\n').filter(s => s.trim().length > 0)
    };
    onUpdateTask(updatedTask);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
        <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Edit Task</h2>
            <button onClick={() => setIsEditing(false)} className="text-gray-400"><X size={20}/></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-neon-blue font-bold uppercase block mb-1">Title</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none"/>
            </div>
            <div>
              <label className="text-xs text-neon-blue font-bold uppercase block mb-1">Description</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none h-20"/>
            </div>
            <div>
              <label className="text-xs text-neon-blue font-bold uppercase block mb-1">Instructions (One per line)</label>
              <textarea value={editInstructions} onChange={e => setEditInstructions(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none h-40 font-mono text-sm"/>
            </div>
            <button onClick={handleSaveEdit} className="w-full bg-neon-green text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2">
               <CheckCircle size={18}/> Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate percentage for progress bar inside modal
  const totalItems = day.instructions?.length || 0;
  const progressPct = totalItems > 0 ? (checkedIndices.length / totalItems) * 100 : (completed ? 100 : 0);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
        <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative max-h-[85vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
            <div className="mb-4 border-b border-white/10 pb-4 pr-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded inline-block ${day.type === 'Rest' ? 'bg-blue-500/20 text-blue-400' : 'bg-neon-green/20 text-neon-green'}`}>
                      DAY {day.day}
                  </span>
                  {day.day > currentDayNum && <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400 flex items-center gap-1"><Target size={8}/> FUTURE</span>}
                  <button onClick={() => setIsEditing(true)} className="ml-auto bg-white/5 hover:bg-white/10 p-1.5 rounded-md text-gray-400 hover:text-white transition-colors">
                     <Edit2 size={12}/>
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 leading-tight">{day.title}</h2>
                <p className="text-gray-400 text-sm italic">{day.description}</p>
            </div>
            
            {day.type !== 'Rest' ? (
                 <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/5">
                     <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2"><Activity size={12}/> Tasks</div>
                        <span className="text-xs text-neon-green font-bold">{Math.round(progressPct)}%</span>
                     </div>
                     <div className="w-full h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
                         <div className="h-full bg-neon-green transition-all duration-300" style={{ width: `${progressPct}%`}}></div>
                     </div>
                     <div className="space-y-3">
                         {day.instructions?.map((ins, i) => {
                             const isChecked = checkedIndices.includes(i);
                             return (
                                 <div key={i} onClick={() => toggleCheck(i)} className="flex gap-3 text-sm text-gray-300 cursor-pointer group">
                                     <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${isChecked ? 'bg-neon-green border-neon-green text-black' : 'border-gray-600 group-hover:border-white'}`}>
                                         {isChecked && <CheckCircle size={14} />}
                                     </div>
                                     <span className={isChecked ? 'text-gray-500 line-through' : ''}>{ins}</span>
                                 </div>
                             )
                         })}
                     </div>
                 </div>
            ) : (
                <div className="bg-blue-900/10 rounded-xl p-4 mb-4 border border-blue-500/20 flex items-center justify-between">
                     <span className="text-blue-400 font-bold text-sm">Mark Rest Day Complete</span>
                     <button onClick={() => onSetCompletion(!completed)} className={`w-10 h-6 rounded-full relative transition-colors ${completed ? 'bg-blue-500' : 'bg-gray-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${completed ? 'right-1' : 'left-1'}`}></div>
                     </button>
                </div>
            )}
            
            <div className="mb-2">
                <label className="text-xs text-neon-blue font-bold uppercase block mb-2">Mission Log</label>
                <textarea 
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                   placeholder="Type your progress, reps, or how it felt..."
                   className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-neon-green outline-none h-24 resize-none placeholder-gray-600"
                />
            </div>
            
            {completed && (
                <div className="mt-4 flex items-center justify-center gap-2 text-neon-green font-bold text-sm animate-pulse">
                    <CheckCircle size={16} /> Day {day.day} Completed
                </div>
            )}
        </div>
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

  useEffect(() => {
    if (state) {
      const cached = Storage.getDailyTip();
      if (cached) setQuote(cached.text);
      else generateMotivationalTip().then(setQuote);
    }
  }, [state]);

  const handleUpdateTask = async (newTask: ChallengeTask) => {
      if(!state || !state.plan) return;
      const newPlan = state.plan.map(t => t.day === newTask.day ? newTask : t);
      await Storage.updateChallengePlan(newPlan);
  };

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

  const startDate = new Date(state.startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const currentDayIndex = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const currentDay = Math.min(Math.max(1, currentDayIndex), 30);
  const getLog = (day: number): ChallengeLog => state.logs?.[day] || { notes: "", checkedIndices: [] };

  // Calculate strict progress based on checked items
  let totalTasksCount = 0;
  let completedTasksCount = 0;
  
  state.plan.forEach(task => {
      // Rest days count as 1 task
      if (task.type === 'Rest') {
          totalTasksCount++;
          if (state.completedDays.includes(task.day)) completedTasksCount++;
      } else {
          // Workouts count by instruction length
          const subTasks = task.instructions?.length || 0;
          if (subTasks === 0) {
              totalTasksCount++; // Fallback if no instructions
              if (state.completedDays.includes(task.day)) completedTasksCount++;
          } else {
              totalTasksCount += subTasks;
              completedTasksCount += (state.logs?.[task.day]?.checkedIndices?.length || 0);
          }
      }
  });

  const progress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const completedCount = state.completedDays.length;

  return (
    <div className="h-full w-full bg-black p-6 pb-24 overflow-y-auto relative">
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

      <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-center items-center">
              <span className="text-2xl font-bold text-white">{completedCount}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Days Done</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-center items-center">
              <span className="text-2xl font-bold text-white">{30 - completedCount}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Days Left</span>
          </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
           <h3 className="text-white font-bold flex items-center gap-2"><Calendar size={18} className="text-neon-green"/> Protocol Grid</h3>
           <span className="text-xs text-gray-500">{progress}% Complete</span>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
          {state.plan.map((task) => {
              const isCompleted = state.completedDays.includes(task.day);
              const isToday = task.day === currentDay;
              const isMissed = task.day < currentDay && !isCompleted;
              const isRest = task.type === 'Rest';
              const log = getLog(task.day);
              
              // Calculate individual day percentage for water effect
              let dayPercent = 0;
              if (task.type === 'Rest') {
                  dayPercent = isCompleted ? 100 : 0;
              } else {
                  const total = task.instructions?.length || 1;
                  dayPercent = ((log.checkedIndices.length) / total) * 100;
                  // If completed via override or rest, ensure 100%
                  if (isCompleted && dayPercent < 100) dayPercent = 100;
              }

              return (
                  <button 
                      key={task.day} 
                      onClick={() => setSelectedDay(task)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center relative overflow-hidden border transition-all duration-300 z-0
                          ${isToday
                                  ? 'border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                  : isMissed
                                      ? 'border-red-500/30 text-red-400'
                                      : 'border-white/5 text-gray-500 hover:border-white/20'
                          }
                          ${!isToday && !isMissed ? 'bg-white/5' : ''}
                      `}
                  >
                      {/* Water Fill Effect */}
                      <div 
                        className="absolute bottom-0 left-0 w-full bg-neon-green/30 transition-all duration-500 ease-in-out z-[-1]"
                        style={{ height: `${dayPercent}%` }}
                      />
                      
                      <span className={`text-sm font-bold ${task.day > currentDay ? 'opacity-50' : ''} relative z-10`}>{task.day}</span>
                      {isCompleted && <CheckCircle size={10} className="mt-1 relative z-10 text-neon-green" />}
                      {!isCompleted && isToday && <div className="w-1.5 h-1.5 bg-white rounded-full mt-1 animate-ping relative z-10"></div>}
                      {isMissed && <AlertTriangle size={10} className="mt-1 relative z-10" />}
                  </button>
              );
          })}
      </div>

      {selectedDay && (
          <DayDetailsModal 
              day={selectedDay}
              completed={state.completedDays.includes(selectedDay.day)}
              currentLog={getLog(selectedDay.day)}
              currentDayNum={currentDay}
              onClose={() => setSelectedDay(null)}
              onSetCompletion={async (val) => {
                  if (val) {
                      await onCompleteDay(selectedDay.day);
                  } else {
                      await Storage.uncompleteChallengeDay(selectedDay.day);
                      // Force refresh local state hack
                      await onCompleteDay(selectedDay.day); // Trigger reload
                      await Storage.uncompleteChallengeDay(selectedDay.day); // Actually unset
                  }
                  // Simple hack to trigger re-render in parent is relying on parent refetch or prop update
                  // In real app, we'd hoist the uncomplete logic to parent
              }}
              onSaveLog={async (log) => {
                 await Storage.saveChallengeLog(selectedDay.day, log);
              }}
              onUpdateTask={handleUpdateTask}
          />
      )}

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

// ... (Rest of component definitions remain unchanged)

// --- Missing Component Definitions ---

const DashboardScreen: React.FC<{
  onNavigate: (screen: Screen) => void;
  user: UserProfile;
  streak: number;
  todaysStats: { steps: number; calories: number; activeMinutes: number };
  onStartQuickWorkout: (type: string) => void;
  onEnablePedometer: () => void;
  pedometerActive: boolean;
}> = ({ onNavigate, user, streak, todaysStats, onStartQuickWorkout, onEnablePedometer, pedometerActive }) => {
  return (
    <div className="p-6 pb-24 h-full overflow-y-auto bg-black">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-3xl font-bold text-white">Hello, <span className="text-neon-green">{user.name.split(' ')[0]}</span></h1>
           <p className="text-gray-400 text-sm">Let's crush today.</p>
        </div>
        <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
           <Flame size={16} className="text-orange-500 fill-orange-500 animate-pulse" />
           <span className="font-bold text-white">{streak}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gradient-to-br from-neon-green/20 to-transparent border border-neon-green/30 p-4 rounded-2xl relative overflow-hidden">
            <Activity size={20} className="text-neon-green mb-2" />
            <div className="text-2xl font-bold text-white">{todaysStats.activeMinutes}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Active Mins</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden group" onClick={onEnablePedometer}>
            <Footprints size={20} className={`mb-2 ${pedometerActive ? 'text-blue-400' : 'text-gray-600'}`} />
            <div className="text-2xl font-bold text-white">{todaysStats.steps}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
               Steps {pedometerActive && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>}
            </div>
        </div>
        <div className="col-span-2 bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
            <div>
               <div className="text-2xl font-bold text-white">{todaysStats.calories}</div>
               <div className="text-[10px] text-gray-400 uppercase font-bold">Kcal Burned</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
               <Zap size={20} className="text-orange-500" />
            </div>
        </div>
      </div>

      <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Zap size={16} className="text-neon-blue"/> Quick Action</h3>
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
         <button onClick={() => onStartQuickWorkout('HIIT')} className="min-w-[140px] h-32 bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-neon-green/50 flex flex-col justify-end relative group transition-all">
             <div className="absolute top-3 right-3 bg-neon-green text-black text-[10px] font-bold px-2 py-0.5 rounded">15m</div>
             <Dumbbell size={24} className="text-white mb-2 group-hover:scale-110 transition-transform"/>
             <span className="font-bold text-white">Quick HIIT</span>
         </button>
         <button onClick={() => onStartQuickWorkout('Stretch')} className="min-w-[140px] h-32 bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-neon-blue/50 flex flex-col justify-end relative group transition-all">
             <div className="absolute top-3 right-3 bg-neon-blue text-black text-[10px] font-bold px-2 py-0.5 rounded">10m</div>
             <Activity size={24} className="text-white mb-2 group-hover:scale-110 transition-transform"/>
             <span className="font-bold text-white">Stretch</span>
         </button>
         <button onClick={() => onNavigate(Screen.RUNNING)} className="min-w-[140px] h-32 bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-orange-500/50 flex flex-col justify-end relative group transition-all">
             <div className="absolute top-3 right-3 bg-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded">GO</div>
             <Footprints size={24} className="text-white mb-2 group-hover:scale-110 transition-transform"/>
             <span className="font-bold text-white">Run Mode</span>
         </button>
      </div>

      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl p-5 border border-white/10 relative overflow-hidden cursor-pointer hover:border-white/20 transition-all" onClick={() => onNavigate(Screen.CHALLENGE)}>
         <div className="relative z-10">
            <h3 className="text-lg font-bold text-white mb-1">Daily Challenge</h3>
            <p className="text-xs text-gray-300 mb-3">Keep your streak alive. Do today's task.</p>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-white">
               View Today's Task <ChevronRight size={14}/>
            </div>
         </div>
         <Trophy className="absolute -bottom-2 -right-2 text-white/5 w-24 h-24 rotate-12" />
      </div>
    </div>
  );
};

const WorkoutSelectionScreen: React.FC<{ onStartWorkout: (workout: Workout) => void }> = ({ onStartWorkout }) => {
  return (
    <div className="p-6 pb-24 h-full overflow-y-auto bg-black">
      <h2 className="text-2xl font-bold text-white mb-6">Workouts</h2>
      <div className="space-y-4">
        {WORKOUT_DB.map(w => (
          <div key={w.id} onClick={() => onStartWorkout(w)} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-neon-green/50 transition-all group cursor-pointer relative">
            <div className="h-32 w-full relative">
               <img src={w.image} alt={w.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"/>
               <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
               <div className="absolute bottom-3 left-4">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-bold uppercase tracking-wider bg-neon-green text-black px-1.5 py-0.5 rounded">{w.category}</span>
                     <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded">{w.difficulty}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight">{w.title}</h3>
               </div>
            </div>
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={12}/> {w.duration}</span>
                  <span className="flex items-center gap-1"><Flame size={12}/> {w.estCalories} kcal</span>
               </div>
               <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-neon-green group-hover:text-black transition-colors">
                  <Play size={14} fill="currentColor" />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HabitTrackerScreen: React.FC<{ habits: HabitLog; habitDefs: Habit[]; onUpdateHabit: (id: string, val: number | boolean) => void; onAddHabit: (name: string) => void; onDeleteHabit: (id: string) => void; }> = ({ habits, habitDefs, onUpdateHabit, onAddHabit, onDeleteHabit }) => {
   const [newHabit, setNewHabit] = useState("");
   const today = getTodayStr();

   return (
     <div className="p-6 pb-24 h-full overflow-y-auto bg-black">
        <h2 className="text-2xl font-bold text-white mb-2">Habits</h2>
        <p className="text-gray-400 text-sm mb-6">Consistency builds identity.</p>

        <div className="space-y-3 mb-8">
           {habitDefs.map(h => {
              const val = habits[today]?.[h.id];
              const isCompleted = h.type === 'toggle' ? !!val : (val as number || 0) >= (h.target || 1);
              
              return (
                 <div key={h.id} className={`p-4 rounded-xl border transition-all flex items-center justify-between ${isCompleted ? 'bg-neon-green/10 border-neon-green' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center gap-3">
                       <span className="text-2xl">{h.icon}</span>
                       <div>
                          <h4 className={`font-bold ${isCompleted ? 'text-neon-green' : 'text-white'}`}>{h.name}</h4>
                          {h.type === 'counter' && <p className="text-xs text-gray-500">{val || 0} / {h.target} {h.unit}</p>}
                       </div>
                    </div>
                    
                    {h.type === 'toggle' ? (
                       <button onClick={() => onUpdateHabit(h.id, !val)} className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isCompleted ? 'bg-neon-green border-neon-green text-black' : 'border-gray-500 text-transparent hover:border-white'}`}>
                          <CheckCircle size={16} />
                       </button>
                    ) : (
                       <div className="flex items-center gap-3">
                          <button onClick={() => onUpdateHabit(h.id, Math.max(0, (val as number || 0) - 1))} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">-</button>
                          <span className="font-mono font-bold w-4 text-center">{val || 0}</span>
                          <button onClick={() => onUpdateHabit(h.id, (val as number || 0) + 1)} className="w-8 h-8 rounded-lg bg-neon-green/20 hover:bg-neon-green/40 text-neon-green flex items-center justify-center">+</button>
                       </div>
                    )}
                 </div>
              );
           })}
        </div>

        <div className="flex gap-2">
           <input value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="New Habit..." className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-neon-green" />
           <button onClick={() => { if(newHabit.trim()) { onAddHabit(newHabit); setNewHabit(""); } }} className="bg-white/10 border border-white/10 rounded-xl px-4 hover:bg-neon-green/20 hover:text-neon-green transition-colors">
              <Plus size={20} />
           </button>
        </div>
     </div>
   );
};

const ProgressScreen: React.FC<{ history: WorkoutSession[], user: UserProfile }> = ({ history, user }) => {
   const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
   });

   const data = last7Days.map(date => {
      const sessions = history.filter(h => h.date.startsWith(date));
      return {
         name: date.slice(5),
         cal: sessions.reduce((acc, s) => acc + s.caloriesBurned, 0),
         min: Math.round(sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60)
      };
   });

   return (
     <div className="p-6 pb-24 h-full overflow-y-auto bg-black">
        <h2 className="text-2xl font-bold text-white mb-6">Stats</h2>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
           <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase">Activity (Last 7 Days)</h3>
           <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data}>
                    <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}} itemStyle={{color: '#fff'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Bar dataKey="cal" fill="#ccff00" radius={[4, 4, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
        <h3 className="text-lg font-bold text-white mb-4">Recent Sessions</h3>
        <div className="space-y-3">
           {history.slice().reverse().slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                       {s.type === 'Run' ? <Footprints size={18} className="text-blue-400"/> : <Dumbbell size={18} className="text-neon-green"/>}
                    </div>
                    <div>
                       <div className="font-bold text-white text-sm">{s.category || s.type}</div>
                       <div className="text-xs text-gray-500">{new Date(s.date).toLocaleDateString()}</div>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-white font-mono text-sm">{Math.round(s.durationSeconds / 60)} min</div>
                    <div className="text-xs text-gray-500">{s.caloriesBurned} kcal</div>
                 </div>
              </div>
           ))}
           {history.length === 0 && <p className="text-gray-500 text-center text-sm py-4">No workouts yet. Start grinding.</p>}
        </div>
     </div>
   );
};

const ProfileScreen: React.FC<{ 
   user: UserProfile; 
   history: WorkoutSession[]; 
   streak: number; 
   onLogout: () => void; 
   onUpdateWeight: (w: number) => Promise<void>;
   onUpdateImage: (url: string) => Promise<void>;
   onOpenSettings: () => void;
   onShare: () => void;
}> = ({ user, history, streak, onLogout, onUpdateWeight, onUpdateImage, onOpenSettings, onShare }) => {
   const [showAvatarModal, setShowAvatarModal] = useState(false);
   const [editingWeight, setEditingWeight] = useState(false);
   const [weightInput, setWeightInput] = useState(user.weight.toString());

   const totalWorkouts = history.length;
   const totalCals = history.reduce((acc, h) => acc + h.caloriesBurned, 0);

   const saveWeight = async () => {
      const w = parseFloat(weightInput);
      if(!isNaN(w) && w > 0) {
         await onUpdateWeight(w);
         setEditingWeight(false);
      }
   };

   return (
      <div className="p-6 pb-24 h-full overflow-y-auto bg-black">
         <div className="flex justify-end mb-4">
             <button onClick={onOpenSettings} className="p-2 text-gray-400 hover:text-white"><Settings size={24}/></button>
         </div>
         <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
               <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neon-green p-1 mb-4">
                  <img src={user.profileImage || AVATAR_PRESETS[0]} alt="Profile" className="w-full h-full object-cover rounded-full" />
               </div>
               <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">Edit</div>
            </div>
            <h2 className="text-2xl font-bold text-white">{user.name}</h2>
            <p className="text-gray-500 text-sm">Member since {new Date(user.joinDate).getFullYear()}</p>
         </div>
         <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
               <div className="text-xl font-bold text-white">{streak}</div>
               <div className="text-[10px] text-gray-500 uppercase">Day Streak</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
               <div className="text-xl font-bold text-white">{totalWorkouts}</div>
               <div className="text-[10px] text-gray-500 uppercase">Workouts</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
               <div className="text-xl font-bold text-white">{(totalCals / 1000).toFixed(1)}k</div>
               <div className="text-[10px] text-gray-500 uppercase">Kcal Burned</div>
            </div>
         </div>
         <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6 flex items-center justify-between">
             <div>
                <div className="text-xs text-gray-400 uppercase mb-1">Current Weight</div>
                {editingWeight ? (
                   <div className="flex items-center gap-2">
                      <input type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="w-20 bg-black border border-white/20 rounded p-1 text-white font-bold" autoFocus/>
                      <button onClick={saveWeight} className="text-neon-green"><CheckCircle size={20}/></button>
                   </div>
                ) : (
                   <div className="text-2xl font-bold text-white flex items-center gap-2">
                      {user.weight} kg <Edit2 size={14} className="text-gray-600 cursor-pointer hover:text-white" onClick={() => setEditingWeight(true)}/>
                   </div>
                )}
             </div>
             <div className="h-10 w-px bg-white/10"></div>
             <div>
                <div className="text-xs text-gray-400 uppercase mb-1">Height</div>
                <div className="text-2xl font-bold text-white">{user.height} cm</div>
             </div>
         </div>
         <button onClick={onLogout} className="w-full bg-red-900/20 border border-red-500/20 text-red-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-900/30 transition-all">
             <LogOut size={18} /> Logout
         </button>
         <AvatarSelectionModal 
            isOpen={showAvatarModal} 
            onClose={() => setShowAvatarModal(false)} 
            onSelect={async (url) => { await onUpdateImage(url); setShowAvatarModal(false); }}
            onUploadClick={() => { setShowAvatarModal(false); }}
         />
      </div>
   );
};

const ActiveSessionScreen: React.FC<{ mode: 'Run' | 'Workout', workout?: Workout | null, onClose: (session?: WorkoutSession) => void }> = ({ mode, workout, onClose }) => {
   const [elapsed, setElapsed] = useState(0);
   const [isActive, setIsActive] = useState(true);
   const [segments, setSegments] = useState<WorkoutSegment[]>([]);
   const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
   const [segmentTimeLeft, setSegmentTimeLeft] = useState(0);
   const [loadingPlan, setLoadingPlan] = useState(false);

   useEffect(() => {
      let interval: any;
      if (isActive) {
         interval = setInterval(() => {
            setElapsed(prev => prev + 1);
            if (mode === 'Workout' && segments.length > 0) {
               setSegmentTimeLeft(prev => {
                  if (prev <= 1) {
                     if (currentSegmentIdx < segments.length - 1) {
                        SoundService.playStart();
                        setCurrentSegmentIdx(c => c + 1);
                        return segments[currentSegmentIdx + 1].duration;
                     } else {
                        handleFinish();
                        return 0;
                     }
                  }
                  if (prev <= 4) SoundService.playCountdown();
                  return prev - 1;
               });
            } else if (mode === 'Workout' && segments.length === 0 && !loadingPlan) {
               setLoadingPlan(true);
               const title = workout?.title || "Quick Workout";
               const dur = workout?.duration || "15 min";
               const diff = workout?.difficulty || "Intermediate";
               
               if(workout) {
                   generateWorkoutPlan(title, dur, diff).then(s => {
                      setSegments(s);
                      setSegmentTimeLeft(s[0].duration);
                      setLoadingPlan(false);
                      SoundService.playStart();
                   });
               } else {
                   generateWorkoutPlan("Quick HIIT", "15 min", "Intermediate").then(s => {
                      setSegments(s);
                      setSegmentTimeLeft(s[0].duration);
                      setLoadingPlan(false);
                      SoundService.playStart();
                   });
               }
            }
         }, 1000);
      }
      return () => clearInterval(interval);
   }, [isActive, mode, segments, currentSegmentIdx, workout, loadingPlan]);

   const handleFinish = () => {
      SoundService.playSuccess();
      const session: WorkoutSession = {
         id: Date.now().toString(),
         date: new Date().toISOString(),
         type: mode,
         durationSeconds: elapsed,
         caloriesBurned: mode === 'Run' ? Math.floor(elapsed * 0.15) : (workout?.estCalories || Math.floor(elapsed * 0.12)),
         distanceKm: mode === 'Run' ? (elapsed * 0.003) : undefined,
         category: workout?.category || (mode === 'Run' ? 'Cardio' : 'HIIT')
      };
      onClose(session);
   };

   const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
   };

   const currentSeg = segments[currentSegmentIdx];

   return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6">
         {loadingPlan ? (
            <div className="flex flex-col items-center">
               <Loader2 className="animate-spin text-neon-green w-12 h-12 mb-4" />
               <p className="text-white animate-pulse">GENERATING PROTOCOL...</p>
            </div>
         ) : (
            <>
               <div className="absolute top-6 right-6 bg-red-900/20 px-3 py-1 rounded text-red-500 font-bold text-xs border border-red-500/20 cursor-pointer" onClick={() => onClose()}>
                  ABORT
               </div>
               
               <div className="mb-12 text-center">
                  <div className="text-8xl font-bold text-white font-mono tracking-tighter mb-2">
                     {mode === 'Workout' ? formatTime(segmentTimeLeft) : formatTime(elapsed)}
                  </div>
                  <div className="text-neon-green uppercase tracking-[0.2em] text-sm animate-pulse">
                     {mode === 'Workout' ? (currentSeg?.type === 'rest' ? 'REST' : 'WORK') : 'RUNNING'}
                  </div>
               </div>

               {mode === 'Workout' && currentSeg && (
                  <div className="w-full max-w-xs bg-white/10 rounded-2xl p-6 text-center border border-white/10 mb-8 relative overflow-hidden">
                     {currentSeg.type === 'exercise' && <div className="absolute top-0 left-0 w-1 h-full bg-neon-green"></div>}
                     {currentSeg.type === 'rest' && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>}
                     <h2 className="text-3xl font-bold text-white mb-2">{currentSeg.name}</h2>
                     <p className="text-gray-400 text-lg">{currentSeg.reps || "Duration"}</p>
                     
                     <div className="mt-4 flex justify-between text-xs text-gray-500 border-t border-white/10 pt-4">
                        <span>Next: {segments[currentSegmentIdx + 1]?.name || "Finish"}</span>
                        <span>{currentSegmentIdx + 1} / {segments.length}</span>
                     </div>
                  </div>
               )}

               <div className="flex gap-6 items-center">
                  <button onClick={() => setIsActive(!isActive)} className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                     {isActive ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" />}
                  </button>
                  <button onClick={handleFinish} className="w-20 h-20 rounded-full bg-neon-green text-black flex items-center justify-center hover:scale-105 transition-transform hover:shadow-[0_0_20px_rgba(204,255,0,0.5)]">
                     <CheckSquare size={32} />
                  </button>
               </div>
            </>
         )}
      </div>
   );
};

// --- Main App Logic ---

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.SPLASH);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [habits, setHabits] = useState<HabitLog>({});
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [passiveSteps, setPassiveSteps] = useState(0);
  const [pedometerActive, setPedometerActive] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [habitDefs, setHabitDefs] = useState<Habit[]>(DEFAULT_HABITS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastLoadedUserId = useRef<string | null>(null);
  const [activeSessionMode, setActiveSessionMode] = useState<'Run' | 'Workout' | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
    const { data: { subscription } } = Storage.onAuthStateChange(async (session) => {
      if (session) {
        if (lastLoadedUserId.current === session.user.id) return;
        setLoadingData(true);
        try {
          const userId = session.user.id;
          lastLoadedUserId.current = userId;
          
          const storedHabits = localStorage.getItem(`zen30_habit_defs_${userId}`);
          if (storedHabits) setHabitDefs(JSON.parse(storedHabits));
          else setHabitDefs(DEFAULT_HABITS);
          
          let profile = await Storage.getUserProfile(userId);
          if (!profile) {
             const newProfile: Partial<UserProfile> = {
                id: userId,
                name: session.user.user_metadata.full_name || 'Zen30 User',
                email: session.user.email || '',
                joinDate: new Date().toISOString(),
                streak: 0, weight: 70, height: 175, weightHistory: [{ date: getTodayStr(), weight: 70 }], isPro: false, onboardingComplete: true
            };
            await Storage.upsertProfile(newProfile);
            profile = newProfile as UserProfile;
          }
          setUser(profile);
          
          const [h, habitsLog, ch, steps] = await Promise.all([
            Storage.getHistory(), Storage.getHabits(), Storage.getChallenge(), Storage.getPassiveSteps()
          ]);
          setHistory(h); setHabits(habitsLog); setChallenge(ch); setPassiveSteps(steps);

          if (ch && ch.plan && ch.plan.length > 0) setCurrentScreen(Screen.CHALLENGE);
          else setCurrentScreen(Screen.DASHBOARD);

        } catch (e) {
          console.error("Data load error", e);
          setUser(null); setCurrentScreen(Screen.AUTH);
        } finally {
          setLoadingData(false);
        }
      } else {
        lastLoadedUserId.current = null;
        setUser(null);
        if (currentScreen !== Screen.SPLASH) setCurrentScreen(Screen.AUTH);
      }
    });
    return () => subscription.unsubscribe();
  }, [currentScreen]);

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

  const handleLogout = () => { Storage.logout(); setCurrentScreen(Screen.AUTH); };
  const handleShare = async () => { /* ... */ };
  const handleEnablePedometer = async () => { setPedometerActive(true); };
  const handleUpdateHabit = async (id: string, val: number | boolean) => { 
      setHabits(prev => ({...prev, [getTodayStr()]: {...prev[getTodayStr()], [id]: val}})); 
      await Storage.saveHabitValue(id, val); 
  };
  const handleAddHabit = (n: string) => { 
      if(!user) return; 
      const d = [...habitDefs, {id:`h${Date.now()}`, name:n, icon:'✨', type:'toggle' as const}]; 
      setHabitDefs(d); 
      localStorage.setItem(`zen30_habit_defs_${user.id}`, JSON.stringify(d)); 
  };
  const handleDeleteHabit = (id: string) => { 
      if(!user) return; 
      const d = habitDefs.filter(h=>h.id!==id); 
      setHabitDefs(d); 
      localStorage.setItem(`zen30_habit_defs_${user.id}`, JSON.stringify(d)); 
  };
  const handleResetStats = async () => { await Storage.resetStats(); window.location.reload(); };
  const handleToggleSound = () => { setSoundEnabled(!soundEnabled); SoundService.setMuted(soundEnabled); };
  
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

  const renderContent = () => {
      switch (currentScreen) {
          case Screen.DASHBOARD: 
             return <DashboardScreen onNavigate={setCurrentScreen} user={user!} streak={calculatedStreak} todaysStats={todaysStats} onStartQuickWorkout={(t) => { if(t === 'Stretch') { setActiveWorkout(WORKOUT_DB.find(w => w.category==='Stretch') || null); } else { setActiveWorkout(null); } setActiveSessionMode('Workout'); }} onEnablePedometer={handleEnablePedometer} pedometerActive={pedometerActive} />;
          case Screen.WORKOUTS: return <WorkoutSelectionScreen onStartWorkout={(w) => { setActiveWorkout(w); setActiveSessionMode('Workout'); }} />;
          case Screen.RUNNING:  
             setTimeout(() => setActiveSessionMode('Run'), 0); 
             return null; 
          case Screen.CHALLENGE: 
             return <ChallengeScreen 
                state={challenge} 
                onCreate={handleCreateChallenge} 
                onModify={handleModifyChallenge} 
                onCompleteDay={handleCompleteChallengeDay} 
                onDelete={async () => { await Storage.resetChallenge(); setChallenge(null); }} 
                onRestart={async () => { const s = await Storage.restartChallenge(); setChallenge(s); }}
             />;
          case Screen.HABITS: return <HabitTrackerScreen habits={habits} habitDefs={habitDefs} onUpdateHabit={handleUpdateHabit} onAddHabit={handleAddHabit} onDeleteHabit={handleDeleteHabit} />;
          case Screen.PROGRESS: return <ProgressScreen history={history} user={user!} />;
          case Screen.PROFILE: return <ProfileScreen user={user!} history={history} streak={calculatedStreak} onLogout={handleLogout} onUpdateWeight={async (w) => { const u = {...user!, weight: w, weightHistory: [...user!.weightHistory, {date: getTodayStr(), weight: w}]}; setUser(u); await Storage.upsertProfile(u); }} onUpdateImage={async (img) => { const u = {...user!, profileImage: img}; setUser(u); await Storage.upsertProfile(u); }} onOpenSettings={() => setShowSettings(true)} onShare={handleShare} />;
          default: return null;
      }
  };

  if (loadingData) return <div className="h-screen bg-black flex flex-col items-center justify-center"><Loader2 className="animate-spin text-neon-green" size={48}/><p className="text-gray-500 mt-4 animate-pulse">SYNCING ZEN30...</p></div>;

  return (
    <div className="bg-black min-h-screen text-white font-sans max-w-md mx-auto relative shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
      {currentScreen === Screen.SPLASH && <SplashScreen onComplete={() => { if (!user) setCurrentScreen(Screen.AUTH); }} />}
      {currentScreen === Screen.AUTH && <AuthScreen onLoginSuccess={() => {}} />}
      
      {user && !activeSessionMode && currentScreen !== Screen.SPLASH && currentScreen !== Screen.AUTH && (
          <>
            {renderContent()}
            <Navigation currentScreen={currentScreen} onNavigate={setCurrentScreen} />
            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} isMuted={!soundEnabled} onToggleSound={handleToggleSound} onResetStats={handleResetStats} />
          </>
      )}

      {activeSessionMode && <ActiveSessionScreen mode={activeSessionMode} workout={activeWorkout} onClose={async (data) => { setActiveSessionMode(null); if(data) { const h = await Storage.saveSession(data); setHistory(h); setCurrentScreen(Screen.PROGRESS); }}} />}
    </div>
  );
};

export default App;