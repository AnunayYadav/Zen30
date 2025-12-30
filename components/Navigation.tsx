import React from 'react';
import { Screen } from '../types';
import { Home, Dumbbell, Calendar, CheckSquare, BarChart2, User } from 'lucide-react';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { screen: Screen.DASHBOARD, icon: Home, label: 'Home' },
    { screen: Screen.WORKOUTS, icon: Dumbbell, label: 'Workouts' },
    { screen: Screen.CHALLENGE, icon: Calendar, label: 'Challenge' },
    { screen: Screen.HABITS, icon: CheckSquare, label: 'Habits' },
    { screen: Screen.PROGRESS, icon: BarChart2, label: 'Stats' },
    { screen: Screen.PROFILE, icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neon-card border-t border-white/10 px-4 py-3 pb-6 flex justify-between items-center z-50 backdrop-blur-md">
      {navItems.map((item) => {
        const isActive = currentScreen === item.screen;
        return (
          <button
            key={item.label}
            onClick={() => onNavigate(item.screen)}
            className={`flex flex-col items-center justify-center transition-all duration-300 ${
              isActive ? 'text-neon-green -translate-y-1' : 'text-gray-500 hover:text-white'
            }`}
          >
            <item.icon size={24} className={isActive ? 'drop-shadow-[0_0_5px_rgba(204,255,0,0.5)]' : ''} />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
