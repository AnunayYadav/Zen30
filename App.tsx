import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { Screen, Workout, WorkoutSession, UserProfile, HabitLog, ChallengeState, Habit, WorkoutSegment, ChallengeTask, ChallengeLog } from './types';
import { generateMotivationalTip, generateWorkoutPlan, generate30DayChallenge, modifyChallengePlan } from './services/geminiService';
import { Storage, getTodayStr } from './services/storage';
import { SoundService } from './services/soundService';
import { WORKOUT_DB } from './services/workoutData';
import { PedometerService } from './services/pedometer';
import { 
  Play, Pause, Flame, Activity, Dumbbell, Zap, Clock, Footprints,
  LogOut, Settings, X, Volume2, VolumeX,
  ChevronRight, BrainCircuit, Sparkles, Trash2, Calendar, Target, AlertTriangle, RefreshCw, Plus, CheckCircle, AlertCircle, Loader2, Trophy, Edit2, CheckSquare, FileText, Shield, Lock, User
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
  
  // Use refs to hold latest values for unmount saving
  const notesRef = useRef(notes);
  const checksRef = useRef(checkedIndices);

  const [editTitle, setEditTitle] = useState(day.title);
  const [editDesc, setEditDesc] = useState(day.description);
  const [editInstructions, setEditInstructions] = useState(day.instructions?.join('\n') || "");

  // Update refs when state changes
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { checksRef.current = checkedIndices; }, [checkedIndices]);

  // Auto-Save: Notes (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
        onSaveLog({ notes, checkedIndices: checksRef.current });
    }, 1000); // 1 sec debounce for text
    return () => clearTimeout(timer);
  }, [notes]);

  // Auto-Save: Checks (Immediate)
  useEffect(() => {
    onSaveLog({ notes: notesRef.current, checkedIndices });
    
    // Auto-Complete Logic based on checks
    if(day.type !== 'Rest') {
         const total = day.instructions?.length || 0;
         if(total > 0 && checkedIndices.length === total) {
             if(!completed) onSetCompletion(true);
         } else {
             if(completed && checkedIndices.length < total) onSetCompletion(false);
         }
     }
  }, [checkedIndices, completed, day.instructions?.length, day.type]); 

  // Save on Unmount
  useEffect(() => {
    return () => {
        onSaveLog({ notes: notesRef.current, checkedIndices: checksRef.current });
    }
  }, []);

  const toggleCheck = (idx: number) => {
    // Prevent checking future tasks
    if (day.day > currentDayNum) return;

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
  const isLocked = day.day > currentDayNum;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
        <div className="bg-neon-card border border-white/10 w-full max-w-sm rounded-3xl p-6 relative max-h-[85vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
            <div className="mb-4 border-b border-white/10 pb-4 pr-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded inline-block ${day.type === 'Rest' ? 'bg-blue-500/20 text-blue-400' : 'bg-neon-green/20 text-neon-green'}`}>
                      DAY {day.day}
                  </span>
                  {isLocked && <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400 flex items-center gap-1"><Lock size={8}/> FUTURE</span>}
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
                                 <div key={i} onClick={() => toggleCheck(i)} className={`flex gap-3 text-sm transition-all group ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer text-gray-300'}`}>
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
                <div className={`bg-blue-900/10 rounded-xl p-4 mb-4 border border-blue-500/20 flex items-center justify-between ${isLocked ? 'opacity-50' : ''}`}>
                     <span className="text-blue-400 font-bold text-sm">Mark Rest Day Complete</span>
                     <button disabled={isLocked} onClick={() => onSetCompletion(!completed)} className={`w-10 h-6 rounded-full relative transition-colors ${completed ? 'bg-blue-500' : 'bg-gray-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${completed ? 'right-1' : 'left-1'}`}></div>
                     </button>
                </div>
            )}
            
            <div className="mb-2">
                <label className="text-xs text-neon-blue font-bold uppercase block mb-2">Mission Log</label>
                <textarea 
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                   placeholder={isLocked ? "Unlock this day to add notes..." : "Type your progress, reps, or how it felt..."}
                   disabled={isLocked}
                   className={`w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-neon-green outline-none h-24 resize-none placeholder-gray-600 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
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
  onUpdateState: (newState: ChallengeState) => void,
  onDelete: () => Promise<void>,
  onRestart: () => Promise<void>
}> = ({ state, onCreate, onModify, onCompleteDay, onUpdateState, onDelete, onRestart }) => {
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
      const newState = await Storage.updateChallengePlan(newPlan);
      if(newState) onUpdateState(newState);
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
                      {task.day > currentDay && <Lock size={8} className="absolute top-1.5 right-1.5 opacity-30"/>}
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
                      const s = await Storage.uncompleteChallengeDay(selectedDay.day);
                      if (s) onUpdateState(s);
                  }
              }}
              onSaveLog={async (log) => {
                 const newState = await Storage.saveChallengeLog(selectedDay.day, log);
                 if (newState) onUpdateState(newState);
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

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>(Screen.SPLASH);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [habits, setHabits] = useState<HabitLog>({});
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [steps, setSteps] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarSelect, setShowAvatarSelect] = useState(false);

  // Initialize Sound
  useEffect(() => {
    SoundService.setMuted(isMuted);
  }, [isMuted]);

  // Data Loader
  const refreshData = async () => {
    if (!user) return;
    const [c, h, hist, s] = await Promise.all([
      Storage.getChallenge(),
      Storage.getHabits(),
      Storage.getHistory(),
      Storage.getPassiveSteps()
    ]);
    setChallengeState(c);
    setHabits(h);
    setHistory(hist);
    setSteps(s);
  };

  // Auth Listener
  useEffect(() => {
    const { data: { subscription } } = Storage.onAuthStateChange(async (session) => {
      if (session?.user) {
        const profile = await Storage.getUserProfile(session.user.id);
        if (profile) {
            setUser(profile);
            // We'll load the rest in the effect below dependent on user
        } else {
             // Handle case where auth exists but profile doesn't? 
             // AuthScreen handles creation.
        }
      } else {
        setUser(null);
        if(screen !== Screen.SPLASH) setScreen(Screen.AUTH);
      }
    });
    return () => subscription.unsubscribe();
  }, [screen]);

  // Load Data on User Change
  useEffect(() => {
      if(user) {
          refreshData();
          // Pedometer
          PedometerService.start(() => {
              setSteps(s => {
                  const n = s + 1;
                  if(n % 50 === 0) Storage.savePassiveSteps(n);
                  return n;
              });
          });
      }
  }, [user?.id]);

  // Habit Toggle
  const handleToggleHabit = async (habitId: string, val: number | boolean) => {
      const newHabits = await Storage.saveHabitValue(habitId, val);
      setHabits(newHabits);
      SoundService.playClick();
  };

  // Render Logic
  const renderScreen = () => {
      switch(screen) {
          case Screen.DASHBOARD:
              return (
                  <div className="p-6 pb-24 space-y-6">
                      {/* Greeting */}
                      <div className="flex justify-between items-center">
                          <div>
                              <h1 className="text-2xl font-bold text-white">Hi, {user?.name.split(' ')[0]}</h1>
                              <p className="text-gray-400 text-xs">{getTodayStr()}</p>
                          </div>
                          <div 
                            onClick={() => setShowAvatarSelect(true)}
                            className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/20 relative"
                          >
                              {user?.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover"/> : <User className="p-2 text-gray-400"/>}
                          </div>
                      </div>
                      
                      {/* Steps Card */}
                      <div className="bg-gradient-to-r from-gray-900 to-black border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                          <div className="absolute right-0 bottom-0 opacity-10 text-white"><Footprints size={100}/></div>
                          <div className="relative z-10">
                              <div className="flex items-baseline gap-1">
                                  <span className="text-4xl font-bold text-neon-green neon-text">{steps.toLocaleString()}</span>
                                  <span className="text-gray-500 text-xs font-bold uppercase">Steps</span>
                              </div>
                              <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden w-full max-w-[200px]">
                                  <div className="h-full bg-neon-green" style={{width: `${Math.min((steps/10000)*100, 100)}%`}}></div>
                              </div>
                          </div>
                      </div>

                      {/* Quick Habits */}
                      <div>
                          <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Zap size={16} className="text-neon-blue"/> Daily Grinds</h3>
                          <div className="grid grid-cols-5 gap-2">
                              {DEFAULT_HABITS.map(h => {
                                  const today = getTodayStr();
                                  const val = habits[today]?.[h.id];
                                  const isDone = h.type === 'toggle' ? !!val : (val as number) >= (h.target || 1);
                                  
                                  return (
                                      <button 
                                        key={h.id}
                                        onClick={() => {
                                            if(h.type === 'toggle') handleToggleHabit(h.id, !val);
                                            else handleToggleHabit(h.id, ((val as number)||0) + 1);
                                        }}
                                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${isDone ? 'bg-neon-green text-black' : 'bg-white/5 text-gray-400'}`}
                                      >
                                          <span className="text-xl">{h.icon}</span>
                                      </button>
                                  )
                              })}
                          </div>
                      </div>
                      
                      {/* Active Challenge Preview */}
                      {challengeState && (
                         <div 
                            onClick={() => setScreen(Screen.CHALLENGE)}
                            className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden hover:border-white/20 transition-all cursor-pointer"
                         >
                             <div className="flex justify-between items-start mb-2">
                                <h3 className="text-white font-bold flex items-center gap-2"><Trophy size={16} className="text-yellow-500"/> Current Mission</h3>
                                <ChevronRight className="text-gray-500" size={16} />
                             </div>
                             <p className="text-gray-400 text-sm mb-4 line-clamp-1">"{challengeState.goal}"</p>
                             <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                 <div className="bg-yellow-500 h-full" style={{width: `${(challengeState.completedDays.length / 30)*100}%`}}></div>
                             </div>
                             <div className="mt-2 flex justify-between text-[10px] text-gray-500 font-bold uppercase">
                                 <span>Day {challengeState.completedDays.length}</span>
                                 <span>30 Days</span>
                             </div>
                         </div>
                      )}
                  </div>
              );

          case Screen.WORKOUTS:
              return (
                  <div className="p-6 pb-24 space-y-4">
                      <h2 className="text-2xl font-bold text-white mb-4">Workouts</h2>
                      {WORKOUT_DB.map(w => (
                          <div key={w.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 hover:bg-white/10 transition-colors cursor-pointer group">
                              <div className="w-20 h-20 rounded-xl bg-gray-800 overflow-hidden shrink-0">
                                  <img src={w.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="flex flex-col justify-center">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] bg-neon-green/20 text-neon-green px-2 py-0.5 rounded font-bold uppercase">{w.category}</span>
                                      <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded font-bold uppercase">{w.difficulty}</span>
                                  </div>
                                  <h3 className="text-white font-bold leading-tight mb-1">{w.title}</h3>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <span className="flex items-center gap-1"><Clock size={12}/> {w.duration}</span>
                                      <span className="flex items-center gap-1"><Flame size={12}/> {w.estCalories} kcal</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              );
          
          case Screen.CHALLENGE:
              return (
                  <ChallengeScreen 
                      state={challengeState}
                      onCreate={async (g, l) => {
                          const plan = await generate30DayChallenge(g, l);
                          const s = await Storage.initChallenge(plan, g);
                          setChallengeState(s);
                      }}
                      onModify={async (inst) => {
                          if(challengeState?.plan) {
                              const newPlan = await modifyChallengePlan(challengeState.plan, inst);
                              const s = await Storage.updateChallengePlan(newPlan);
                              setChallengeState(s);
                          }
                      }}
                      onUpdateState={setChallengeState}
                      onCompleteDay={async (d) => {
                           const s = await Storage.completeChallengeDay(d);
                           if(s) {
                               setChallengeState(s);
                               SoundService.playSuccess();
                           }
                      }}
                      onDelete={async () => {
                          if(confirm("End current challenge?")) {
                              await Storage.resetChallenge();
                              setChallengeState(null);
                          }
                      }}
                      onRestart={async () => {
                           if(confirm("Restart from Day 1?")) {
                               const s = await Storage.restartChallenge();
                               setChallengeState(s);
                           }
                      }}
                  />
              );

          case Screen.HABITS:
               return (
                   <div className="p-6 pb-24">
                       <h2 className="text-2xl font-bold text-white mb-6">Habit Tracker</h2>
                       <div className="space-y-3">
                           {DEFAULT_HABITS.map(h => {
                               const today = getTodayStr();
                               const val = habits[today]?.[h.id];
                               const isDone = h.type === 'toggle' ? !!val : (val as number) >= (h.target || 1);
                               
                               return (
                                   <div key={h.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                       <div className="flex items-center gap-4">
                                           <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                                               {h.icon}
                                           </div>
                                           <div>
                                               <h3 className="text-white font-bold">{h.name}</h3>
                                               {h.type === 'counter' && <p className="text-xs text-gray-500">{val||0} / {h.target} {h.unit}</p>}
                                           </div>
                                       </div>
                                       
                                       {h.type === 'toggle' ? (
                                           <button onClick={() => handleToggleHabit(h.id, !val)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isDone ? 'bg-neon-green text-black' : 'bg-white/10 text-gray-500'}`}>
                                               <CheckSquare size={20} />
                                           </button>
                                       ) : (
                                           <button onClick={() => handleToggleHabit(h.id, ((val as number)||0)+1)} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-neon-green hover:text-black transition-colors">
                                               <Plus size={20} />
                                           </button>
                                       )}
                                   </div>
                               );
                           })}
                       </div>
                   </div>
               );
          
          case Screen.PROGRESS:
               return (
                   <div className="p-6 pb-24 h-full flex flex-col">
                       <h2 className="text-2xl font-bold text-white mb-6">Stats</h2>
                       <div className="flex-grow flex flex-col justify-center">
                           <div className="h-64 w-full bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
                               <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Activity History</h3>
                               <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={history.slice(-7)}>
                                       <XAxis dataKey="date" tick={{fontSize: 10}} stroke="#666" />
                                       <Tooltip 
                                          contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}} 
                                          itemStyle={{color: '#fff'}}
                                       />
                                       <Bar dataKey="durationSeconds" fill="#ccff00" radius={[4,4,0,0]} />
                                   </BarChart>
                               </ResponsiveContainer>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                               <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                   <div className="text-gray-500 text-xs uppercase font-bold mb-1">Total Workouts</div>
                                   <div className="text-3xl font-bold text-white">{history.length}</div>
                               </div>
                               <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                   <div className="text-gray-500 text-xs uppercase font-bold mb-1">Cals Burned</div>
                                   <div className="text-3xl font-bold text-neon-blue">{history.reduce((a,b) => a + (b.caloriesBurned||0), 0)}</div>
                               </div>
                           </div>
                       </div>
                   </div>
               );

          case Screen.PROFILE:
               return (
                   <div className="p-6 pb-24">
                       <div className="flex justify-between items-center mb-6">
                           <h2 className="text-2xl font-bold text-white">Profile</h2>
                           <button onClick={() => setShowSettings(true)} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white"><Settings size={20}/></button>
                       </div>
                       
                       <div className="flex flex-col items-center mb-8">
                           <div onClick={() => setShowAvatarSelect(true)} className="w-24 h-24 rounded-full bg-gray-800 border-2 border-neon-green overflow-hidden mb-4 relative cursor-pointer group">
                               {user?.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-400 m-auto mt-6" />}
                               <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Edit2 className="text-white" size={20} />
                               </div>
                           </div>
                           <h3 className="text-xl font-bold text-white">{user?.name}</h3>
                           <p className="text-neon-green text-sm font-medium">{user?.isPro ? 'PRO MEMBER' : 'Free Plan'}</p>
                       </div>

                       <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                           <div className="flex justify-between items-center p-2 border-b border-white/5">
                               <span className="text-gray-400">Streak</span>
                               <span className="text-white font-bold flex items-center gap-2"><Flame className="text-orange-500" size={16}/> {user?.streak} days</span>
                           </div>
                           <div className="flex justify-between items-center p-2 border-b border-white/5">
                               <span className="text-gray-400">Current Weight</span>
                               <span className="text-white font-bold">{user?.weight} kg</span>
                           </div>
                           <div className="flex justify-between items-center p-2">
                               <span className="text-gray-400">Height</span>
                               <span className="text-white font-bold">{user?.height} cm</span>
                           </div>
                       </div>
                   </div>
               );

          default: return null;
      }
  };

  if (screen === Screen.SPLASH) return <SplashScreen onComplete={() => user ? setScreen(Screen.DASHBOARD) : setScreen(Screen.AUTH)} />;
  
  if (!user && screen !== Screen.SPLASH) return <AuthScreen onLoginSuccess={(u) => { setUser(u); setScreen(Screen.DASHBOARD); }} />;

  return (
      <div className="h-screen w-full bg-black flex flex-col relative overflow-hidden font-sans">
          {/* Main Content Scrollable Area */}
          <div className="flex-grow overflow-y-auto no-scrollbar">
              {renderScreen()}
          </div>
          
          {/* Navigation Bar */}
          <Navigation currentScreen={screen} onNavigate={(s) => { SoundService.playClick(); setScreen(s); }} />
          
          {/* Modals */}
          <SettingsModal 
              isOpen={showSettings} 
              onClose={() => setShowSettings(false)} 
              user={user!} 
              isMuted={isMuted} 
              onToggleSound={() => setIsMuted(!isMuted)} 
              onResetStats={async () => {
                  const u = await Storage.resetStats();
                  if(u) setUser(u);
                  setShowSettings(false);
              }}
          />
          
          <AvatarSelectionModal 
              isOpen={showAvatarSelect} 
              onClose={() => setShowAvatarSelect(false)}
              onSelect={async (url) => {
                  if(user) {
                      await Storage.upsertProfile({ ...user, profileImage: url });
                      setUser({ ...user, profileImage: url });
                  }
                  setShowAvatarSelect(false);
              }}
              onUploadClick={() => alert("File upload would go here!")}
          />
      </div>
  );
};

export default App;